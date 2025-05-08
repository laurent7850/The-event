"""
API endpoints for administrator actions related to user validation.
"""
import databutton as db
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import os
from supabase import create_client, Client
# Import the security dependency
from app.apis.security import require_admin_role
# Import the notification helper function
from app.apis.notifications import _send_user_status_email

# Supabase client setup
try:
    supabase_url = db.secrets.get("SUPABASE_URL")
    supabase_key = db.secrets.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase URL or Service Key not configured in secrets.")
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Supabase client initialized successfully.")
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    # Allow app to start but endpoints depending on supabase will fail
    supabase = None

router = APIRouter(prefix="/user-validation", tags=["User Validation"])

# --- Pydantic Models ---

class UserIdRequest(BaseModel):
    user_id: str

class UserInfo(BaseModel):
    id: str
    nom: str | None = None
    prenom: str | None = None
    email: str | None = None

class StatusResponse(BaseModel):
    message: str

# --- Dependency for Supabase client ---
def get_supabase_client():
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client not initialized. Check secrets.")
    return supabase

# --- API Endpoints ---

# Endpoint to list pending users
@router.get("/pending", response_model=list[UserInfo], dependencies=[Depends(require_admin_role)])
def validation_list_pending_users(supabase_client: Client = Depends(get_supabase_client)):
    """Fetches users with 'en_attente' validation status. Requires admin role."""
    print("--- DEBUG: Entered validation_list_pending_users endpoint ---") # Added debug print
    print("Received request for /pending")
    try:
        # Query the 'users' table (or your actual user profile table name if different)
        # Filter by 'statut_validation' column
        # Select only the required columns
        response = supabase_client.table('users') \
                                .select('id, nom, prenom, email') \
                                .eq('statut_validation', 'en_attente') \
                                .execute()

        print(f"Supabase response data: {response.data}")
        print(f"Supabase response count: {response.count}")

        if response.data:
            # Validate data against Pydantic model (optional but good practice)
            validated_users = [UserInfo(**user) for user in response.data]
            print(f"Returning {len(validated_users)} pending users.")
            return validated_users
        else:
            # Handle case where query succeeds but returns no users
            print("No pending users found.")
            return []

    except Exception as e:
        # Catch potential Supabase client errors or other exceptions
        print(f"Error fetching pending users from Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Endpoint to approve a user
# Endpoint to approve a user
@router.post("/approve", response_model=StatusResponse, dependencies=[Depends(require_admin_role)])
def validation_approve_user(request: UserIdRequest, supabase_client: Client = Depends(get_supabase_client)):
    """Approves a user by setting their status to 'valide' and notifies them. Requires admin role."""
    user_id = request.user_id
    print(f"Received request to approve user: {user_id}")

    try:
        # 1. Fetch user email, nom, prenom first (needed for notification)
        print(f"Fetching email, nom, prenom for user {user_id}...")
        user_data_response = supabase_client.table("users")\
                                        .select("email, nom, prenom")\
                                        .eq("id", user_id)\
                                        .maybe_single()\
                                        .execute()

        if not user_data_response.data:
            print(f"User not found for approval: {user_id}")
            raise HTTPException(status_code=404, detail=f"User not found with ID {user_id}")

        user_email = user_data_response.data.get("email")
        user_nom = user_data_response.data.get("nom")
        user_prenom = user_data_response.data.get("prenom")

        if not user_email:
            print(f"User {user_id} found but has no email address.")
            raise HTTPException(status_code=400, detail=f"User {user_id} has no email address for notification.")

        # 2. Update user status
        print(f"Updating status to 'valide' for user {user_id}...")
        update_response = supabase_client.table("users")\
                                     .update({"statut_validation": "valide"})\
                                     .eq("id", user_id)\
                                     .execute()

        # Log update response details for debugging
        print(f"Update response details (for info): data={update_response.data}, count={update_response.count}")
        # Basic check: If update didn't raise an exception, assume it worked.
        print(f"User status updated for {user_id}.")

        # 3. Send notification email
        try:
            # Call the helper function directly (imported at top)
            print(f"Calling notification helper for approved user {user_id}...")
            _send_user_status_email(
                user_id=user_id,
                email=user_email,
                nom=user_nom,
                prenom=user_prenom,
                status="approved"
            )
            print(f"Approval notification helper function called for user {user_id}.")
        except Exception as notify_error: # Catch potential errors during notification
            print(f"ERROR sending approval notification for user {user_id}: {notify_error}")
            import traceback
            traceback.print_exc()
            # Log error, but allow main function to return success for DB update

        print(f"User {user_id} approved successfully in database.")
        return StatusResponse(message=f"Utilisateur {user_id} approuvé avec succès.")

    except HTTPException as http_exc:
        print(f"HTTP Exception during approval for user {user_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        print(f"Unexpected error approving user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while approving the user: {str(e)}")


# Endpoint to reject a user
@router.post("/reject", response_model=StatusResponse, dependencies=[Depends(require_admin_role)])
def validation_reject_user(request: UserIdRequest, supabase_client: Client = Depends(get_supabase_client)):
    """Rejects a user by setting their status to 'refuse' and notifies them. Requires admin role."""
    user_id = request.user_id
    print(f"Received request to reject user: {user_id}")

    try:
        # 1. Fetch user email, nom, prenom first (needed for notification)
        print(f"Fetching email, nom, prenom for user {user_id}...")
        user_data_response = supabase_client.table("users")\
                                        .select("email, nom, prenom")\
                                        .eq("id", user_id)\
                                        .maybe_single()\
                                        .execute()

        if not user_data_response.data:
            print(f"User not found for rejection: {user_id}")
            raise HTTPException(status_code=404, detail=f"User not found with ID {user_id}")

        user_email = user_data_response.data.get("email")
        user_nom = user_data_response.data.get("nom")
        user_prenom = user_data_response.data.get("prenom")

        if not user_email:
            print(f"User {user_id} found but has no email address.")
            raise HTTPException(status_code=400, detail=f"User {user_id} has no email address for notification.")

        # 2. Update user status
        print(f"Updating status to 'refuse' for user {user_id}...")
        update_response = supabase_client.table("users")\
                                     .update({"statut_validation": "refuse"})\
                                     .eq("id", user_id)\
                                     .execute()

        print(f"Update response details (for info): data={update_response.data}, count={update_response.count}")
        print(f"User status updated to 'refuse' for {user_id}.")

        # 3. Send notification email
        try:
            # Call the helper function directly (imported at top)
            print(f"Calling notification helper for rejected user {user_id}...")
            _send_user_status_email(
                user_id=user_id,
                email=user_email,
                nom=user_nom,
                prenom=user_prenom,
                status="rejected"
            )
            print(f"Rejection notification helper function called for user {user_id}.")
        except Exception as notify_error: # Catch potential errors during notification
            print(f"ERROR sending rejection notification for user {user_id}: {notify_error}")
            import traceback
            traceback.print_exc()
            # Log error, but allow main function to return success for DB update

        print(f"User {user_id} rejected successfully in database.")
        return StatusResponse(message=f"Utilisateur {user_id} rejeté avec succès.")

    except HTTPException as http_exc:
        print(f"HTTP Exception during rejection for user {user_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        print(f"Unexpected error rejecting user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while rejecting the user: {str(e)}")


print("User Validation API router created.")

