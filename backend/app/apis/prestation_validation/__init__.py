"""
API endpoints for administrator actions related to prestation validation and modification.
"""
import databutton as db
from fastapi import APIRouter, Depends, HTTPException, status
# Add validator import
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime, time, date, timedelta
import math # For time calculation if needed

# Import the security dependency
from app.apis.security import require_admin_role

# Supabase client setup
try:
    supabase_url = db.secrets.get("SUPABASE_URL")
    supabase_key = db.secrets.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase URL or Service Key not configured in secrets.")
    from supabase import create_client, Client # Import here after check
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Supabase client initialized successfully for prestation_validation.")
except Exception as e:
    print(f"Error initializing Supabase client in prestation_validation: {e}")
    # Allow app to start but endpoints depending on supabase will fail
    supabase = None # type: ignore

# Router setup
router = APIRouter(prefix="/prestations", tags=["Prestation Validation"])

# --- Dependency for Supabase client ---
def get_supabase_client():
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase client not initialized. Check secrets.")
    return supabase

# --- Pydantic Models ---

# Model for representing detailed prestation info, including related data
class PrestationDetails(BaseModel):
    id: int
    user_id: str
    client_id: int
    project_id: int
    date_prestation: date
    heure_debut: time
    heure_fin: time
    heures_calculees: float | None = None
    adresse: str | None = None
    statut_validation: str # e.g., 'en_attente', 'valide'
    tarif_horaire_utilise: float | None = None
    admin_comment: str | None = None
    created_at: datetime

    # Related data (adjust field names based on Supabase join results)
    collaborateur_nom: str | None = Field(None, alias="users.nom") # Assuming join alias
    collaborateur_prenom: str | None = Field(None, alias="users.prenom")
    client_nom: str | None = Field(None, alias="clients.nom")
    project_nom: str | None = Field(None, alias="projects.nom")

    class Config:
        from_attributes = True # Allows mapping from ORM objects (like Supabase results)
        populate_by_name = True # Allow using alias names for population


class PrestationUpdate(BaseModel):
    date_prestation: date | None = None
    heure_debut: time | None = None
    heure_fin: time | None = None
    client_id: int | None = None
    project_id: int | None = None
    adresse: str | None = None
    admin_comment: str | None = None

    # Pydantic v2 style model validator
    @model_validator(mode='after')
    def check_times(self):
        debut, fin = self.heure_debut, self.heure_fin
        # Only validate if both times are provided in the update payload
        if debut is not None and fin is not None:
            # Use a dummy date to compare times properly
            dummy_date = date.today()
            start_dt = datetime.combine(dummy_date, debut)
            end_dt = datetime.combine(dummy_date, fin)

            # Basic check: if end is not strictly after start, raise error
            # Consider overnight shifts (e.g., 22:00 to 02:00). Calculate_hours handles duration.
            # This validation focuses on preventing obviously wrong inputs like 10:00 to 09:00 same day.
            if end_dt <= start_dt:
                 # If end time is midnight or later, and start time is earlier, it's likely overnight - OK
                 # If end time is *before* start time on the same day - NOT OK
                 is_overnight = end_dt.time() < start_dt.time()
                 if not is_overnight:
                      raise ValueError("heure_fin must be after heure_debut for same-day prestations")

            print(f"Time validation passed for payload: debut={debut}, fin={fin}") # Add log
        return self


class ValidationResponse(BaseModel):
    message: str
    prestation_id: int
    status: str


# --- Helper Functions (Placeholder) ---

def calculate_hours(start_time: time, end_time: time) -> float | None:
    """Calculates the duration between two times in hours."""
    if not start_time or not end_time:
        return None
    # Combine date with time for proper subtraction (using a dummy date)
    dummy_date = date.today()
    start_dt = datetime.combine(dummy_date, start_time)
    end_dt = datetime.combine(dummy_date, end_time)
    # Handle overnight case if necessary (assuming for now prestations are within the same day)
    if end_dt < start_dt:
         # Simple assumption: Add 24 hours if end time is earlier than start time.
         # Review this logic if complex overnight scenarios are common.
         end_dt += timedelta(days=1) 
    
    duration = end_dt - start_dt
    return duration.total_seconds() / 3600.0


# --- API Endpoints ---

@router.get(
    "/pending",
    response_model=list[PrestationDetails],
    summary="List Pending Prestations",
    dependencies=[Depends(require_admin_role)]
)
def list_pending_prestations(supabase_client: Client = Depends(get_supabase_client)):
    """Fetches all prestations with status 'en_attente'. Requires admin role."""
    print("Fetching pending prestations...")
    try:
        # Corrected Supabase query with appropriate joins and ordering
        response = supabase_client.table("prestations") \
            .select("""
                id, user_id, client_id, project_id, date_prestation, heure_debut, heure_fin, 
                heures_calculees, adresse, statut_validation, tarif_horaire_utilise, 
                admin_comment, created_at,
                users!inner(nom, prenom), 
                clients!inner(nom), 
                projects!left(nom) 
            """) \
            .eq("statut_validation", "en_attente") \
            .order("date_prestation", asc=True) \
            .execute()

        if response.data:
             # Map data to PrestationDetails model (handle potential missing keys gracefully)
            pending_prestations = []
            for item in response.data:
                user_info = item.get('users') or {} # Use empty dict if join result is null or key missing
                client_info = item.get('clients') or {}
                project_info = item.get('projects') or {} # Project can be null due to left join

                prestation_data = {
                    **item,
                    # Map to aliases defined in PrestationDetails model
                    'collaborateur_nom': user_info.get('nom'),
                    'collaborateur_prenom': user_info.get('prenom'),
                    'client_nom': client_info.get('nom'),
                    # Handle case where project is null
                    'project_nom': project_info.get('nom') if project_info else None,
                }
                # Remove the nested dicts if they exist to avoid Pydantic confusion
                prestation_data.pop('users', None)
                prestation_data.pop('clients', None)
                prestation_data.pop('projects', None)

                try:
                    # Validate data against the Pydantic model (v2 style)
                    pending_prestations.append(PrestationDetails.model_validate(prestation_data))
                except Exception as pydantic_error:
                     # Log detailed error including the data that failed parsing
                     print(f"Pydantic validation error for prestation item {item.get('id')}: {pydantic_error}. Data: {prestation_data}")
                     # Continue processing other items, or re-raise if one failure should stop all

            print(f"Successfully fetched and parsed {len(pending_prestations)} pending prestations.") # Log success
            return pending_prestations
        else:
            print("No pending prestations found.") # Log empty result
            return []

    except Exception as e:
        print(f"Error fetching pending prestations: {e}")
        # Log the full traceback for detailed debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error while fetching pending prestations: {str(e)}") from e

@router.post(
    "/{prestation_id}/validate",
    response_model=ValidationResponse,
    summary="Validate a Prestation",
    dependencies=[Depends(require_admin_role)]
)
def validate_prestation(prestation_id: int, supabase_client: Client = Depends(get_supabase_client)):
    """Validates a specific prestation, setting status and applying client tariff. Requires admin role."""
    print(f"Validating prestation {prestation_id}...")
    try:

        # Fetch prestation
        prestation_resp = supabase_client.table("prestations").select("client_id, statut_validation").eq("id", prestation_id).maybe_single().execute()
        if not prestation_resp.data:
             raise HTTPException(status_code=404, detail=f"Prestation with ID {prestation_id} not found.")
        if prestation_resp.data['statut_validation'] != 'en_attente':
             raise HTTPException(status_code=400, detail=f"Prestation {prestation_id} is not awaiting validation (status: {prestation_resp.data['statut_validation']}).")

        client_id = prestation_resp.data['client_id']

        # Fetch client tariff
        client_resp = supabase_client.table("clients").select("tarif_horaire").eq("id", client_id).maybe_single().execute()
        if not client_resp.data or client_resp.data.get('tarif_horaire') is None:
             raise HTTPException(status_code=400, detail=f"Tarif horaire not found for client ID {client_id} associated with prestation {prestation_id}.")
        
        tarif = client_resp.data['tarif_horaire']
        print(f"Found tarif {tarif} for client {client_id}.") # Added log

        # Update prestation
        update_data = {
            "statut_validation": "valide",
            "tarif_horaire_utilise": tarif
        }
        update_resp = supabase_client.table("prestations").update(update_data).eq("id", prestation_id).execute()

        # Basic check on update response (Supabase client usually raises exceptions on failure)
        print(f"Prestation {prestation_id} updated. Details: {update_resp.data}")


        return ValidationResponse(
            message=f"Prestation {prestation_id} validated successfully.",
            prestation_id=prestation_id,
            status="valide"
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error validating prestation {prestation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error validating prestation: {str(e)}") from e

@router.put(
    "/{prestation_id}",
    response_model=PrestationDetails, # Return updated prestation
    summary="Update a Prestation",
    dependencies=[Depends(require_admin_role)]
)
def update_prestation(prestation_id: int, update_data: PrestationUpdate, supabase_client: Client = Depends(get_supabase_client)):
    """Updates details of a specific prestation. Recalculates hours if times change. Requires admin role."""
    print(f"Updating prestation {prestation_id}...")
    # Log the validated Pydantic model (shows default values if not provided)
    print(f"Received update data model: {update_data}")

    try:
        # Fetch current prestation data to get existing times if only one is provided for recalc
        current_prestation_resp = supabase_client.table("prestations").select("heure_debut, heure_fin").eq("id", prestation_id).maybe_single().execute()
        if not current_prestation_resp.data:
             raise HTTPException(status_code=404, detail=f"Prestation with ID {prestation_id} not found for update.")

        current_data = current_prestation_resp.data
        # Ensure current times are time objects if fetched as strings (depends on DB/client)
        # Assuming supabase client handles type conversion based on Pydantic/model hints if possible, or they are stored correctly.
        # If they are strings, they need parsing: time.fromisoformat(current_data['heure_debut'])
        current_start_time = current_data.get('heure_debut') # Defaults to None if not present
        current_end_time = current_data.get('heure_fin')     # Defaults to None if not present
        # Attempt conversion if they are strings
        if isinstance(current_start_time, str): current_start_time = time.fromisoformat(current_start_time)
        if isinstance(current_end_time, str): current_end_time = time.fromisoformat(current_end_time)


        # Use exclude_unset=True to only include fields explicitly provided in the request body
        # Pydantic v2 uses model_dump
        update_payload = update_data.model_dump(exclude_unset=True)
        print(f"Payload for Supabase (exclude_unset=True): {update_payload}") # Log dict for update

        # Recalculate hours if times are changing
        recalculate = False
        # Determine the start and end times to use for calculation
        # Use the updated value if provided, otherwise use the current value
        start_time_for_calc = update_data.heure_debut if update_data.heure_debut is not None else current_start_time
        end_time_for_calc = update_data.heure_fin if update_data.heure_fin is not None else current_end_time

        # Check if either time was actually part of the update payload
        if 'heure_debut' in update_payload or 'heure_fin' in update_payload:
             # Only recalculate if BOTH start and end times are now available (either from update or current data)
             if start_time_for_calc is not None and end_time_for_calc is not None:
                 print(f"Time changed, recalculating hours for prestation {prestation_id} using start={start_time_for_calc}, end={end_time_for_calc}...") # Added log
                 # Ensure times are time objects before passing to helper
                 if isinstance(start_time_for_calc, str): start_time_for_calc = time.fromisoformat(start_time_for_calc)
                 if isinstance(end_time_for_calc, str): end_time_for_calc = time.fromisoformat(end_time_for_calc)

                 calculated_hours = calculate_hours(start_time_for_calc, end_time_for_calc)
                 update_payload['heures_calculees'] = calculated_hours
                 print(f"Recalculated hours for prestation {prestation_id}: {calculated_hours}")
             else:
                 # If only one time is provided and the other is missing, clear calculated hours? Or leave as is?
                 # Current approach: only calculate if both are available. If one becomes unavailable, heures_calculees won't be updated.
                 # Let's explicitly set it to None if we can't calculate.
                 update_payload['heures_calculees'] = None
                 print(f"Cannot calculate hours for prestation {prestation_id} as one time is missing.")


        if not update_payload:
             print(f"No actual fields to update for prestation {prestation_id}.") # Log if payload becomes empty
             # Returning current data might be better than raising an error if nothing changed.
             pass # Allow to proceed to fetch/return current state

        # Perform update only if there's something to update
        if update_payload:
            print(f"Executing Supabase update for prestation {prestation_id} with data: {update_payload}") # Log before Supabase call
            update_resp = supabase_client.table("prestations").update(update_payload).eq("id", prestation_id).execute()
            # Add check for errors in update_resp if needed
            print(f"Update response for prestation {prestation_id}. Response data (if any): {update_resp.data}")
        else:
            print(f"Skipping Supabase update for prestation {prestation_id} as payload is empty.")


        # Fetch and return updated prestation with joined data (always fetch to return consistent structure)
        updated_prestation_resp = supabase_client.table("prestations")\
            .select("*, users!inner(nom, prenom), clients!inner(nom), projects!inner(nom)")\
            .eq("id", prestation_id)\
            .single()\
            .execute() # Use single() as we expect exactly one result

        if not updated_prestation_resp.data:
             # This case should ideally not be reached if the ID was valid initially.
             raise HTTPException(status_code=404, detail=f"Prestation {prestation_id} not found after update attempt.")

        # Map data to PrestationDetails model (Ensure robustness against missing joined data)
        item = updated_prestation_resp.data
        user_info = item.get('users') or {} # Use empty dict if users key is missing or null
        client_info = item.get('clients') or {}
        project_info = item.get('projects') or {}

        # Prepare data for Pydantic model, explicitly handling potential None values from joins
        prestation_data = {
            **item, # Include all fields from the prestation table
            'collaborateur_nom': user_info.get('nom'),
            'collaborateur_prenom': user_info.get('prenom'),
            'client_nom': client_info.get('nom'),
            'project_nom': project_info.get('nom'),
        }
        # Remove nested dictionaries to avoid Pydantic confusion if they were included by select *
        prestation_data.pop('users', None)
        prestation_data.pop('clients', None)
        prestation_data.pop('projects', None)

        try:
             # Validate and return the data using the Pydantic model (v2)
             return PrestationDetails.model_validate(prestation_data)
        except Exception as pydantic_error:
            print(f"Pydantic validation error for updated prestation {prestation_id}: {pydantic_error}. Data: {prestation_data}")
            raise HTTPException(status_code=500, detail="Error processing updated prestation data.")


    except HTTPException as http_exc:
        # Re-raise HTTPException
        raise http_exc
    except Exception as e:
        # Log detailed error
        print(f"Error updating prestation {prestation_id}: {e}")
        import traceback
        traceback.print_exc()
        # Return generic 500
        raise HTTPException(status_code=500, detail=f"Internal server error during update: {str(e)}") from e

print("Prestation Validation API router created and endpoints defined.")

