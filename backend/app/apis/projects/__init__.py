# src/app/apis/projects/__init__.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from supabase import Client
import traceback

# Dependencies
from app.apis.profile_management import get_supabase_client
from app.apis.security import require_admin_role # Ensure this provides the dependency correctly

# --- Pydantic Models ---

# Base model for project fields (using int for IDs)
class ProjectBase(BaseModel):
    nom: str = Field(..., description="Nom du projet")
    client_id: int = Field(..., description="ID du client associé (integer)")

# Model for creating a new project
class ProjectCreate(ProjectBase):
    pass

# Model for updating a project (all fields optional, int IDs)
class ProjectUpdate(BaseModel):
    nom: Optional[str] = Field(None, description="Nouveau nom du projet")
    client_id: Optional[int] = Field(None, description="Nouvel ID du client associé (integer)")

# Model representing client data linked to a project (for display)
class ClientForProjectDisplay(BaseModel):
    id: int
    nom: str

    class Config:
        orm_mode = True # Necessary for nested model population from ORM objects

# Model for displaying a project, including ID and nested client info
class ProjectDisplay(ProjectBase):
    id: int
    clients: Optional[ClientForProjectDisplay] = Field(None, description="Client associé (récupéré via relation)") # Supabase relation often uses table name

    class Config:
        orm_mode = True # Enable ORM mode for nested models

# Simplified model for dropdowns/select lists (int IDs)
class ProjectForSelect(BaseModel):
    id: int
    nom: str
    client_id: int # Keep client_id here for potential frontend filtering logic

    class Config:
        orm_mode = True

# Basic response for delete
class BasicResponse(BaseModel):
    message: str

# --- API Router Setup ---

# Initialize router with prefix, tags, and ADMIN dependency
router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    dependencies=[Depends(require_admin_role)] # Ensures all endpoints require admin
)

# --- Endpoints ---

# POST /projects/ - Create a new project
@router.post("/", response_model=ProjectDisplay, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    supabase: Client = Depends(get_supabase_client),
):
    """Creates a new project linked to a client. Requires admin privileges."""
    try:
        project_dict = project_data.model_dump()
        print(f"Inserting project: {project_dict}")

        response = supabase.table("projects").insert(project_dict).execute()
        print(f"Supabase insert response: {response}")

        if not response.data:
            print("ERROR: Supabase insert operation returned empty data for project.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Échec de la création du projet (aucune donnée retournée).")

        created_project_id = response.data[0].get('id')
        if not created_project_id:
             print("ERROR: Supabase insert response missing project ID.")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Échec de la création du projet (ID manquant).")

        # Re-fetch the created project with client details for the response
        fetch_response = supabase.table("projects").select("*, clients(id, nom)").eq("id", created_project_id).maybe_single().execute()
        print(f"Supabase fetch response for created project: {fetch_response}")

        if not fetch_response.data:
            print(f"ERROR: Could not fetch newly created project {created_project_id} with client details.")
            # Consider if we should return partial data or error out. Erroring out is safer.
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Projet créé (ID: {created_project_id}) mais impossible de récupérer les détails complets.")

        return fetch_response.data # FastAPI validates against ProjectDisplay

    except Exception as e:
        print(f"ERROR creating project: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        # Check for specific Supabase/Postgres errors
        if "violates foreign key constraint" in error_str and "projects_client_id_fkey" in error_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Client ID invalide ou inexistant: {project_data.client_id}") from e
        if "duplicate key value violates unique constraint" in error_str: # Add specific constraint name if known
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Un projet avec ce nom existe déjà pour ce client (ou globalement, selon la contrainte).") from e
        # Check for potential auth errors passed up (though Depends should handle 401/403)
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la création du projet: {e}") from e


# GET /projects/ - List projects with full details (including client)
@router.get("/", response_model=List[ProjectDisplay])
async def list_projects(
    supabase: Client = Depends(get_supabase_client),
):
    """Fetches all projects with their associated client details. Requires admin privileges."""
    try:
        print("Fetching all projects with client details...")
        # Fetch projects and join with clients table automatically via foreign key relationship
        # Ensure the foreign key in 'projects' table to 'clients' table is set up correctly in Supabase
        response = supabase.table("projects").select("*, clients(id, nom)").order("nom", desc=False).execute()
        print(f"Supabase response for listing projects: {response}")

        if response.data is None:
             print("WARNING: Supabase project list query returned None data.")
             return [] # Return empty list if no data

        # FastAPI will validate each item against ProjectDisplay
        return response.data

    except Exception as e:
        print(f"ERROR fetching projects list: {e}")
        traceback.print_exc()
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la récupération des projets: {e}") from e


# GET /projects/select - List projects (ID, Name, ClientID) for dropdowns
@router.get("/select", response_model=List[ProjectForSelect])
async def list_projects_for_select(
    client_id: Optional[int] = Query(None, description="Filter projects by client ID (integer)"),
    supabase: Client = Depends(get_supabase_client),
):
    """Fetches projects (id, nom, client_id) for selection lists, optionally filtered by client_id. Requires admin privileges."""
    try:
        query = supabase.table("projects").select("id, nom, client_id").order("nom", desc=False)

        if client_id is not None:
            print(f"Fetching projects list for client_id: {client_id}")
            query = query.eq("client_id", client_id)
        else:
             print("Fetching all projects list for dropdowns...")

        response = query.execute()
        print(f"Supabase response for listing projects for select: {response}")

        if response.data is None:
             print("WARNING: Supabase project list (select) query returned None data.")
             return []

        # FastAPI validates against ProjectForSelect
        return response.data

    except Exception as e:
        print(f"ERROR fetching projects list for select: {e}")
        traceback.print_exc()
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la récupération de la liste de sélection des projets: {e}") from e


# PUT /projects/{project_id} - Update an existing project
@router.put("/{project_id}", response_model=ProjectDisplay)
async def update_project(
    project_id: int, # Use int for path parameter
    project_data: ProjectUpdate,
    supabase: Client = Depends(get_supabase_client),
):
    """Updates an existing project by ID. Requires admin privileges."""
    try:
        # Get non-None values from the input model
        update_dict = project_data.model_dump(exclude_unset=True)

        if not update_dict:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucune donnée fournie pour la mise à jour.")

        print(f"Updating project {project_id} with data: {update_dict}")

        # Perform the update
        response = supabase.table("projects").update(update_dict).eq("id", project_id).execute()
        print(f"Supabase update response: {response}")

        # Check if update was successful and affected rows
        # Note: Supabase update often returns the updated rows in `response.data`
        if not response.data:
            # Verify if the project actually exists, maybe RLS issue or wrong ID
            check_response = supabase.table("projects").select("id").eq("id", project_id).maybe_single().execute()
            if not check_response.data:
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Projet avec ID {project_id} non trouvé.")
            else:
                 # Project exists, but update returned no data. Could be RLS or no actual change needed.
                 print(f"WARNING: Update for project {project_id} returned empty data. Check RLS or if data was identical.")
                 # Re-fetch current state to return something meaningful
                 # Fall through to the re-fetch logic below

        # Re-fetch the updated project with client details to ensure consistency and return correct model
        fetch_response = supabase.table("projects").select("*, clients(id, nom)").eq("id", project_id).maybe_single().execute()
        print(f"Supabase fetch response for updated project: {fetch_response}")

        if not fetch_response.data:
             print(f"ERROR: Could not fetch updated project {project_id} details after update operation.")
             # This case is problematic: update might have succeeded but fetch failed.
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Mise à jour du projet {project_id} potentiellement réussie, mais impossible de récupérer les détails.")

        return fetch_response.data # FastAPI validates against ProjectDisplay

    except Exception as e:
        print(f"ERROR updating project {project_id}: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        if "violates foreign key constraint" in error_str and "projects_client_id_fkey" in error_str:
            # Ensure client_id is accessed correctly if it was part of the update
            invalid_client_id = update_dict.get('client_id', project_data.client_id) # Get it from update dict or original if not updated
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Client ID invalide ou inexistant: {invalid_client_id}") from e
        if "duplicate key value violates unique constraint" in error_str:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"La modification entraînerait un conflit avec un nom de projet existant.") from e
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la mise à jour du projet: {e}") from e


# DELETE /projects/{project_id} - Delete a project
@router.delete("/{project_id}", response_model=BasicResponse, status_code=status.HTTP_200_OK) # Changed to 200 OK with response body
async def delete_project(
    project_id: int, # Use int for path parameter
    supabase: Client = Depends(get_supabase_client),
):
    """Deletes a project by ID. Requires admin privileges."""
    try:
        print(f"Attempting to delete project {project_id}")

        # First, check if the project exists
        check_response = supabase.table("projects").select("id").eq("id", project_id).maybe_single().execute()
        if not check_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Projet avec ID {project_id} non trouvé.")

        # Attempt to delete
        response = supabase.table("projects").delete().eq("id", project_id).execute()
        print(f"Supabase delete response: {response}")

        # Deletion might return the deleted record(s) or just count.
        # We already confirmed existence, so assume success if no exception.
        # Could add a check on response.count if needed, but relying on exception handling is usually sufficient.

        return BasicResponse(message=f"Projet {project_id} supprimé avec succès.")

    except Exception as e:
        print(f"ERROR deleting project {project_id}: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        # Check for foreign key violation (e.g., prestations linked to this project)
        if "violates foreign key constraint" in error_str and "prestations_project_id_fkey" in error_str: # Check specific constraint name
             raise HTTPException(
                 status_code=status.HTTP_409_CONFLICT,
                 detail=f"Impossible de supprimer le projet {project_id} car il est lié à des prestations existantes."
             ) from e
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la suppression du projet: {e}") from e

