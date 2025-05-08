# src/app/apis/prestations/__init__.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from datetime import date, time, datetime, timedelta
from typing import Optional
from supabase import Client
import traceback

# Assuming these dependencies exist and provide the necessary objects/functions
from app.apis.profile_management import get_supabase_client
from app.apis.security import get_current_user, User  # Need User model for type hint

# --- Pydantic Models ---

class PrestationCreate(BaseModel):
    date_prestation: date = Field(..., description="Date de la prestation (YYYY-MM-DD)")
    heure_debut: time = Field(..., description="Heure de début (HH:MM:SS or HH:MM)")
    heure_fin: time = Field(..., description="Heure de fin (HH:MM:SS or HH:MM)")
    client_id: int = Field(..., description="ID du client")
    project_id: int = Field(..., description="ID du projet")
    adresse: Optional[str] = Field(None, description="Adresse spécifique de la prestation si différente du projet/client")

    # Basic check: a validator can ensure fields are present but complex cross-field logic
    # like end_time > start_time (esp. with overnight) is often better handled in the endpoint.
    # @validator('heure_fin')
    # def check_heure_fin_format(cls, heure_fin):
    #     # Basic format validation could go here if needed, but time type handles structure
    #     return heure_fin

class PrestationDisplay(BaseModel):
    id: int
    user_id: str # Assuming Supabase user ID is UUID string
    client_id: int
    project_id: int
    date_prestation: date
    heure_debut: time
    heure_fin: time
    heures_calculees: float = Field(..., description="Durée calculée en heures")
    adresse: Optional[str]
    statut_validation: str = Field(default="en_attente_validation")
    # Add other fields if needed, e.g., admin_comment, tarif_horaire_utilise (set later)

    class Config:
        from_attributes = True # Updated from orm_mode=True for Pydantic v2

# --- API Router Setup ---

# Endpoint accessible by authenticated users (collaborators)
router = APIRouter(
    prefix="/prestations",
    tags=["Prestations"],
    dependencies=[Depends(get_current_user)] # Require authentication
)

# --- Helper Function ---

def calculate_hours(start_dt: datetime, end_dt: datetime) -> float:
    """Calculates the duration between two datetimes in hours."""
    if end_dt <= start_dt:
        # This case should ideally be caught by validation or indicate an overnight shift
        # If we assume end_dt was already adjusted for overnight, this check might be redundant
        print(f"Warning/Error: calculate_hours called with end_dt ({end_dt}) not after start_dt ({start_dt})")
        return 0.0 # Or raise error
    duration: timedelta = end_dt - start_dt
    return round(duration.total_seconds() / 3600, 2) # Calculate hours, rounded to 2 decimal places

# --- Endpoint ---

@router.post("/", response_model=PrestationDisplay, status_code=status.HTTP_201_CREATED)
async def create_prestation(
    prestation_data: PrestationCreate,
    supabase: Client = Depends(get_supabase_client),
    current_user: User = Depends(get_current_user),
):
    """
    Permet à un collaborateur authentifié d'encoder une nouvelle prestation.
    Calcule automatiquement les heures travaillées et initialise le statut à 'en_attente_validation'.
    """
    try:
        user_id = current_user.id # Get user ID from the dependency
        if not user_id:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impossible d'identifier l'utilisateur actuel.")

        print(f"User {user_id} creating prestation for client {prestation_data.client_id}")

        # Combine date and time for calculation
        # Use prestation_data.date_prestation for both start and end
        start_datetime = datetime.combine(prestation_data.date_prestation, prestation_data.heure_debut)
        end_datetime = datetime.combine(prestation_data.date_prestation, prestation_data.heure_fin)

        # Handle potential overnight case: if end time is on/before start time, assume it's the next day
        if end_datetime <= start_datetime:
            print(f"Heure de fin ({prestation_data.heure_fin}) <= Heure de début ({prestation_data.heure_debut}). Ajout d'un jour à la date de fin pour le calcul.")
            end_datetime += timedelta(days=1)

        calculated_hours = calculate_hours(start_datetime, end_datetime)
        # We rely on calculate_hours returning > 0 if end_datetime was correctly adjusted
        if calculated_hours <= 0 and start_datetime != end_datetime: # Allow 0 hours only if start == end
             print(f"ERROR: Calculated hours is {calculated_hours} for {start_datetime} to {end_datetime}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La durée calculée est invalide (heure de fin non strictement postérieure à l'heure de début après ajustement).")

        prestation_dict = prestation_data.model_dump()
        prestation_dict["user_id"] = str(user_id) # Ensure UUID is string
        prestation_dict["heures_calculees"] = calculated_hours
        prestation_dict["statut_validation"] = "en_attente_validation"
        # Pydantic v2 automatically handles date/time serialization for common types

        print(f"Inserting prestation into DB: {prestation_dict}")

        # Insert into Supabase
        response = supabase.table("prestations").insert(prestation_dict).execute()
        print(f"Supabase insert response: {response}")

        if not response.data:
            print("ERROR: Supabase insert operation returned empty data for prestation.")
            # Log the actual error if available from response
            error_detail = response.error.message if response.error else "Aucune donnée retournée par la base de données."
            print(f"Supabase error detail: {error_detail}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Échec de la création de la prestation: {error_detail}")

        created_prestation = response.data[0]

        # Return the created object, validated against PrestationDisplay using Pydantic's from_attributes
        return PrestationDisplay.model_validate(created_prestation)

    except HTTPException as http_exc:
         print(f"HTTP Error creating prestation: {http_exc.detail}")
         raise http_exc
    except ValueError as val_err: # Catch Pydantic validation errors or others
         print(f"Validation Error creating prestation: {val_err}")
         # Extract specific field errors if possible from Pydantic ValidationError
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err)) from val_err
    except Exception as e:
        print(f"ERROR creating prestation: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        # Check for specific Supabase/Postgres errors like FK violations
        # Improve error message clarity for the user
        if "violates foreign key constraint" in error_str:
            detail = "Référence invalide: Vérifiez que le client et le projet existent."
            if "prestations_client_id_fkey" in error_str:
                 detail = f"Client ID ({prestation_data.client_id}) invalide ou inexistant."
            elif "prestations_project_id_fkey" in error_str:
                 detail = f"Projet ID ({prestation_data.project_id}) invalide ou inexistant (ou n'appartient pas au client sélectionné?)."
            elif "prestations_user_id_fkey" in error_str:
                 detail = "Utilisateur invalide (problème interne)." # Should not happen
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from e

        # Check for potential RLS issues (might manifest differently, e.g., empty data response handled above)

        # Generic internal error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur interne inattendue lors de la création de la prestation.") from e

