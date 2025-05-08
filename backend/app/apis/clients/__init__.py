import databutton as db
from supabase import create_client as supabase_create_client, Client
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from postgrest.exceptions import APIError
import traceback

# Assuming get_supabase_client is still needed for other endpoints
from app.apis.profile_management import get_supabase_client

# --- Pydantic Models ---

class ClientModel(BaseModel):
    id: Optional[str] = None
    nom: str
    adresse: Optional[str] = None
    email_facturation: Optional[str] = None
    telephone: Optional[str] = None
    tarif_horaire: Optional[float] = Field(None, description="Hourly rate for the client")
    numero_tva: Optional[str] = None

class ClientSelectItem(BaseModel):
    id: str
    nom: str

class BasicResponse(BaseModel):
    message: str

# --- API Router ---
router = APIRouter(prefix="/clients", tags=["Clients"])

# --- Endpoints ---

# GET /clients/all - List all clients with full details
@router.get("/all", response_model=List[ClientModel])
async def list_clients(
    supabase: Client = Depends(get_supabase_client),
):
    """Fetches all clients with their full details."""
    try:
        print("Fetching all client details...")
        response = supabase.table("clients").select("*").order("nom", desc=False).execute()
        print(f"Supabase response for listing all clients: {response}")
        if response.data is None:
             print("Supabase client list query returned None data.")
             return []
        if not response.data and response.data is not None:
             print("No clients found or RLS prevented access.")
        processed_data = []
        for client in response.data:
            if 'tarif_horaire' in client and client['tarif_horaire'] is not None:
                try:
                    client['tarif_horaire'] = float(client['tarif_horaire'])
                except (ValueError, TypeError):
                    print(f"Warning: Could not convert tarif_horaire '{client['tarif_horaire']}' to float for client {client.get('id')}")
                    client['tarif_horaire'] = None
            processed_data.append(client)
        return processed_data
    except APIError as api_e:
        print(f"ERROR fetching clients (APIError): Code={api_e.code}, Message={api_e.message}, Details={api_e.details}, Hint={api_e.hint}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur Supabase lors de la récupération des clients: {api_e.message}")
    except Exception as e:
        print(f"ERROR fetching all clients (Generic Exception): {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la récupération complète des clients: {e}")

# GET /clients/ - List all clients (for dropdowns)
@router.get("/", response_model=List[ClientSelectItem])
async def list_clients_for_select(
    supabase: Client = Depends(get_supabase_client),
):
    """Fetches all clients, returning only ID and name for selection lists."""
    try:
        print("Fetching clients list for dropdowns...")
        response = supabase.table("clients").select("id, nom").order("nom", desc=False).execute()
        print(f"Supabase response for listing clients: {response}")
        if response.data is None:
             print("Supabase client list query returned None data.")
             return []
        if not response.data and response.data is not None:
             print("No clients found or RLS prevented access.")
        return response.data
    except Exception as e:
        print(f"ERROR fetching clients list: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la récupération des clients: {e}")

# POST /clients/ - Create a new client
@router.post("/", response_model=ClientModel, status_code=201)
async def create_client(
    client_data: ClientModel,
    # supabase: Client = Depends(get_supabase_client), # Still bypassing dependency
):
    """Creates a new client using direct service key connection with raw SQL."""
    try:
        # Initialize Supabase client directly for service role access
        supabase_url = db.secrets.get("SUPABASE_URL")
        supabase_key = db.secrets.get("SUPABASE_SERVICE_KEY")
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL or Service Key missing in secrets.")
        
        print("DEBUG: Creating Supabase service client for raw SQL insert...")
        supabase = supabase_create_client(supabase_url, supabase_key)
        print("DEBUG: Supabase service client created successfully.")
        
        # Assuming user_id is NOT NULL (admin user ID provided previously)
        admin_user_id = "613138b9-7f95-4356-a151-67e9d31e7e36"
        
        # Extract client data fields we need for insert
        nom = client_data.nom
        adresse = client_data.adresse or ''
        email_facturation = client_data.email_facturation or ''
        telephone = client_data.telephone or ''
        tarif_horaire = client_data.tarif_horaire or 0.0
        numero_tva = client_data.numero_tva or ''
        
        print(f"Raw SQL insert with client data: {client_data.model_dump(exclude={'id'}, exclude_none=True)}")
        print(f"Using admin_user_id: {admin_user_id}")
        
        # Use a database function to execute the INSERT
        # This runs with the privileges of the function's SECURITY DEFINER
        response = supabase.rpc(
            'create_new_client',
            {
                'p_nom': nom,
                'p_adresse': adresse,
                'p_email_facturation': email_facturation,
                'p_telephone': telephone,
                'p_tarif_horaire': tarif_horaire,
                'p_user_id': admin_user_id,
                'p_numero_tva': numero_tva
            }
        ).execute()
        
        print(f"Supabase RPC response for client creation: {response}")
        
        if hasattr(response, 'error') and response.error:
            print(f"ERROR: Supabase RPC returned error: {response.error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Erreur lors de la création du client via fonction SQL: {response.error}"
            )
        
        if not response.data:
            print("WARNING: Supabase RPC returned no data for client creation.")
            raise HTTPException(
                status_code=500, 
                detail="Échec de la création du client (aucune donnée retournée par la fonction SQL)."
            )
        
        # Retrieve the newly created client to return full details
        new_client_id = response.data[0]['id'] if isinstance(response.data, list) and len(response.data) > 0 else None
        if not new_client_id:
            print(f"WARNING: Could not extract new client ID from response: {response.data}")
            raise HTTPException(
                status_code=500, 
                detail="Impossible de récupérer l'ID du nouveau client créé."
            )
        
        # Fetch complete client details to ensure consistent response format
        fetch_response = supabase.table("clients").select("*").eq("id", new_client_id).single().execute()
        if not fetch_response.data:
            print(f"WARNING: Could not fetch the newly created client with ID {new_client_id}")
            # Return basic client data instead of failing
            return ClientModel(
                id=new_client_id,
                nom=nom,
                adresse=adresse,
                email_facturation=email_facturation,
                telephone=telephone,
                tarif_horaire=tarif_horaire,
                numero_tva=numero_tva
            )
        
        created_client = fetch_response.data
        print(f"Successfully created and fetched client: {created_client}")
        return created_client

    except ValueError as val_e:
        print(f"ERROR creating client (ValueError): {val_e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(val_e)) from val_e
    except HTTPException as http_exc:
        # Re-raise HTTPException
        raise http_exc
    except Exception as e:
        print(f"ERROR creating client (Generic Exception): {e}")
        traceback.print_exc()
        
        error_str = str(e).lower()
        if "violates row-level security policy" in error_str:
            # Still getting RLS error even with raw SQL approach
            detail = "Erreur de sécurité (RLS) lors de la création du client même avec SQL brut. Vérifiez les politiques RLS."
            status_code = 403
        elif "duplicate key value violates unique constraint" in error_str:
            detail = "Un client avec ces informations existe déjà."
            status_code = 409
        elif "violates not-null constraint" in error_str:
            detail = f"Champ obligatoire manquant pour la création du client: {e}"
            status_code = 400
        elif "violates foreign key constraint" in error_str:
            detail = f"Référence invalide (ex: user_id n'existe pas): {e}"
            status_code = 400
        elif "function" in error_str and "does not exist" in error_str:
            detail = "La fonction SQL 'create_new_client' n'existe pas. Vérifiez la configuration de la base de données."
            status_code = 500
        else:
            detail = f"Erreur interne lors de la création du client: {e}"
            status_code = 500
            
        raise HTTPException(status_code=status_code, detail=detail)

# PUT /clients/{client_id} - Update an existing client
@router.put("/{client_id}", response_model=ClientModel)
async def update_client(
    client_id: str,
    client_data: ClientModel,
    supabase: Client = Depends(get_supabase_client),
):
    """Updates an existing client by ID. Requires appropriate permissions."""
    try:
        client_dict = client_data.model_dump(exclude_unset=True, exclude={'id'})
        if not client_dict:
             raise HTTPException(status_code=400, detail="Aucune donnée fournie pour la mise à jour.")
        print(f"Updating client {client_id} with data: {client_dict}")
        response = supabase.table("clients").update(client_dict).eq("id", client_id).execute()
        print(f"Supabase update response: {response}")
        if not response.data:
            check_response = supabase.table("clients").select("id").eq("id", client_id).maybe_single().execute()
            if not check_response.data:
                 raise HTTPException(status_code=404, detail=f"Client avec ID {client_id} non trouvé.")
            else:
                 print(f"WARNING: Update for client {client_id} returned empty data, possibly RLS issue.")
                 raise HTTPException(status_code=500, detail="Échec de la mise à jour du client (aucune donnée retournée). Vérifiez les permissions.")
        updated_client = response.data[0]
        return updated_client
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"ERROR updating client {client_id}: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        if "duplicate key value violates unique constraint" in error_str:
             raise HTTPException(status_code=409, detail="La modification entraînerait un conflit avec un nom de client existant.")
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la mise à jour du client: {e}")

# DELETE /clients/{client_id} - Delete a client
@router.delete("/{client_id}", response_model=BasicResponse)
async def delete_client(
    client_id: str,
    supabase: Client = Depends(get_supabase_client),
):
    """Deletes a client by ID. Requires appropriate permissions."""
    try:
        print(f"Attempting to delete client {client_id}")
        check_response = supabase.table("clients").select("id").eq("id", client_id).maybe_single().execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail=f"Client avec ID {client_id} non trouvé.")
        response = supabase.table("clients").delete().eq("id", client_id).execute()
        print(f"Supabase delete response: {response}")
        return BasicResponse(message=f"Client {client_id} supprimé avec succès.")
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"ERROR deleting client {client_id}: {e}")
        traceback.print_exc()
        error_str = str(e).lower()
        if "violates foreign key constraint" in error_str:
            constraint_details = "des projets ou prestations"
            if "projects_client_id_fkey" in error_str:
                 constraint_details = "des projets"
            elif "prestations_client_id_fkey" in error_str:
                 constraint_details = "des prestations"
            raise HTTPException(
                status_code=409,
                detail=f"Impossible de supprimer le client {client_id} car il est lié à {constraint_details} existants."
            ) from e
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la suppression du client: {e}")
