
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
import databutton as db
from supabase import create_client, Client
from postgrest.exceptions import APIError # Added import
from typing import Literal
import traceback

# --- Supabase Client Dependency (uses Service Key) ---

def get_supabase_client() -> Client:
    url = db.secrets.get("SUPABASE_URL")
    key = db.secrets.get("SUPABASE_SERVICE_KEY")

    # --- START DIAGNOSTICS ---
    print(f"DEBUG: Supabase URL read from secrets: {url}")
    if key:
        # Print only first 5 and last 5 chars of the key for verification, NEVER the full key
        key_preview = f"{key[:5]}...{key[-5:]}" if len(key) > 10 else key
        print(f"DEBUG: Supabase Service Key read (preview): {key_preview}")
    else:
        print("DEBUG: Supabase Service Key is MISSING in secrets!")
    # --- END DIAGNOSTICS ---

    if not url or not key:
        print("ERROR: Supabase URL or Service Key not configured.")
        raise HTTPException(status_code=500, detail="Configuration Supabase incomplète.")
    try:
        print("DEBUG: Attempting to create Supabase service client...") # Added log
        client: Client = create_client(url, key)
        print("DEBUG: Supabase service client created successfully.") # Added log
        return client
    except Exception as e:
        print(f"ERROR initializing Supabase service client: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur initialisation Supabase: {e}")

# --- Pydantic Models ---
class CreateProfileRequest(BaseModel):
    user_id: str # The auth.uid() from the frontend
    nom: str
    prenom: str
    adresse_postale: str
    genre: Literal["Homme", "Femme", "Autre", "Préfère ne pas dire"]
    iban: str
    numero_national: str
    email: EmailStr # Email for redundancy or if needed

class BasicResponse(BaseModel):
    message: str


# -- API Router --
router = APIRouter(prefix="/profiles", tags=["Profile Management"])

@router.post("/create", response_model=BasicResponse, status_code=201)
def create_profile(
    profile_data: CreateProfileRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Creates a user profile entry in the 'users' table using the service key.
    This endpoint is intended to be called right after successful user signup.
    """
    try:
        print(f"Attempting to create profile for user_id: {profile_data.user_id}")

        # Prepare data for insertion
        insert_data = {
            "id": profile_data.user_id,
            "nom": profile_data.nom,
            "prenom": profile_data.prenom,
            "adresse_postale": profile_data.adresse_postale,
            "genre": profile_data.genre,
            "iban": profile_data.iban,
            "numero_national": profile_data.numero_national,
            "email": profile_data.email,
            "statut_validation": "en_attente", # Correct status
            "role": "collaborateur" # Default role
        }

        # Call the database function using RPC
        try:
            # Call the database function using RPC, ensuring keys match SQL parameters
            supabase.rpc('handle_new_user_profile', {
                'user_id': profile_data.user_id,
                'p_nom': profile_data.nom,                     # Match SQL param: p_nom
                'p_prenom': profile_data.prenom,               # Match SQL param: p_prenom
                'p_adresse_postale': profile_data.adresse_postale, # Match SQL param: p_adresse_postale
                'p_genre': profile_data.genre,                 # Already matches SQL param: p_genre
                'p_iban': profile_data.iban,                   # Match SQL param: p_iban
                'p_numero_national': profile_data.numero_national, # Match SQL param: p_numero_national
                'p_email': profile_data.email                  # Match SQL param: p_email
            }).execute()
            # Note: RPC calls often don't return data on success unless designed to.
            # We assume success if no exception is raised.
            # We might want to add explicit checks later if needed.
        except APIError as rpc_error: # Catch specific PostgREST API errors
            print(f"ERROR calling RPC handle_new_user_profile for {profile_data.user_id}: Code={rpc_error.code}, Message={rpc_error.message}")
            # Check if it's the duplicate key error
            if rpc_error.code == '23505': # Specific code for unique constraint violation
                 print(f"Profile for user_id {profile_data.user_id} already exists (detected via RPC error code 23505).")
                 # Raise HTTPException 409 Conflict for clarity.
                 raise HTTPException(status_code=409, detail="Un profil avec cet ID utilisateur ou email existe déjà.")
            else:
                # For other database errors caught by APIError
                raise HTTPException(status_code=500, detail=f"Échec de l\'appel RPC (APIError): {rpc_error.message}")
        except Exception as generic_error:
             # Catch any other unexpected errors during RPC call or Supabase interaction
            print(f"UNEXPECTED ERROR during RPC call for {profile_data.user_id}: {generic_error}")
            raise HTTPException(status_code=500, detail=f"Erreur interne inattendue lors de la création du profil: {generic_error}")

        print(f"Successfully created profile for user_id: {profile_data.user_id}")
        return BasicResponse(message="Profil utilisateur créé avec succès.")

    except HTTPException as http_exc:
        # Re-raise validation errors or specific HTTP exceptions
        raise http_exc
    except Exception as e:
        print(f"ERROR creating profile for {profile_data.user_id}: {e}")
        traceback.print_exc()
        # Check for potential unique constraint violation (e.g., if email is unique in users table)
        if "duplicate key value violates unique constraint" in str(e).lower():
             raise HTTPException(status_code=409, detail="Un profil avec ces informations existe déjà (possiblement email).")
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la création du profil: {e}")

# Note: We might need to add other endpoints here later (e.g., get profile, update profile)
# depending on whether RLS allows the frontend to do it directly for the logged-in user.
