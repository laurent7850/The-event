
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from supabase import Client
import databutton as db
import traceback

# Import the Supabase client dependency function from profile_management
from app.apis.profile_management import get_supabase_client

router = APIRouter() # Required by framework, even if no endpoints defined here

# No need for router as this module provides dependencies, not endpoints

# --- Configuration ---
JWT_SECRET = db.secrets.get("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"

# OAuth2 scheme (tokenUrl is often irrelevant for bearer tokens but required)
# The client should send the token in the Authorization header as 'Bearer <token>'
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)

# --- Pydantic Models ---
class User(BaseModel):
    id: str
    role: str
    statut_validation: str | None = None

class TokenData(BaseModel):
    user_id: str | None = None

# --- Dependency Function ---
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    supabase: Client = Depends(get_supabase_client)
) -> User:
    """
    Dependency to get the current user from the JWT token.
    Verifies the token, extracts user_id, and fetches the role from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User not found or role missing",
    )

    if not JWT_SECRET:
        print("ERROR: SUPABASE_JWT_SECRET is not set.")
        raise HTTPException(status_code=500, detail="Configuration JWT Secret manquante.")

    try:
        # Decode the JWT token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub") # 'sub' claim usually holds the user ID in Supabase

        if user_id is None:
            print("ERROR: 'sub' claim missing from JWT token.")
            raise credentials_exception

        token_data = TokenData(user_id=user_id)

    except JWTError as e:
        print(f"ERROR decoding JWT: {e}")
        traceback.print_exc()
        raise credentials_exception

    if token_data.user_id is None:
         # This case should ideally be caught by the payload check, but double-check
        print("ERROR: user_id is None after token decoding.")
        raise credentials_exception

    try:
        print(f"Fetching role and status for user_id: {token_data.user_id}")
        # Fetch both role and statut_validation
        db_response = supabase.table("users").select("role, statut_validation").eq("id", token_data.user_id).maybe_single().execute()
        db_user = db_response.data
        print(f"Database response for user role/status: {db_user}") # Log the response

        if db_user is None:
            print(f"ERROR: User with id {token_data.user_id} not found in public.users table.")
            raise forbidden_exception # Or 401 if preferred

        user_role = db_user.get("role")
        user_status = db_user.get("statut_validation")

        if user_role is None:
            print(f"ERROR: 'role' column is null or missing for user {token_data.user_id}.")
            raise forbidden_exception # User exists but has no role defined
        # Status can be None initially, might not need a strict check here, depends on logic

        # Return the user object with id, role and status
        current_user = User(id=token_data.user_id, role=user_role, statut_validation=user_status)
        print(f"Authenticated user: {current_user}")
        return current_user

    except Exception as e:
        print(f"ERROR fetching user role for {token_data.user_id}: {e}")
        traceback.print_exc()
        # Raise a generic server error or a more specific one if possible
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la récupération du rôle: {e}")

# --- Helper Dependency for Admin Role Check ---
async def require_admin_role(current_user: User = Depends(get_current_user)):
    """
    Dependency that checks if the current user has the 'admin' role.
    Raises HTTP 403 Forbidden if not.
    """
    print(f"Checking admin role and validation status for user: {current_user.id}, role: {current_user.role}, status: {current_user.statut_validation}")

    # Check if user role is 'admin' AND status is 'valide'
    if not (current_user.role == "admin" and current_user.statut_validation == "valide"):
        print(f"User {current_user.id} does not have admin role OR is not validated. Access denied.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs validés.")

    print(f"User {current_user.id} has admin role and is validated. Access granted.")
    # No return value needed, just raises exception if check fails
