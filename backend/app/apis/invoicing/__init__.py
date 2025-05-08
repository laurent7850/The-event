# src/app/apis/invoicing/__init__.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import databutton as db
from supabase import create_client, Client
from datetime import datetime
import calendar  # To get number of days in month
import traceback # For detailed error logging
# import uuid # No longer explicitly needed here
import io
from fpdf import FPDF # Correct import

# Import the security dependency
from app.apis.security import require_admin_role

router = APIRouter()

# --- Supabase Client Dependency ---
def get_supabase_client() -> Client:
    """Dependency to get Supabase client, handling secrets and initialization."""
    url = db.secrets.get("SUPABASE_URL")
    key = db.secrets.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("ERROR: Supabase URL or Service Key not configured in secrets.")
        raise HTTPException(
            status_code=500,
            detail="Supabase URL or Service Key not configured in secrets.",
        )
    try:
        client: Client = create_client(url, key)
        # Basic check (optional but good)
        client.table('clients').select('id', head=True).limit(1).execute()
        print("Supabase client initialized successfully.")
        return client
    except Exception as e:
        print(f"ERROR: Error initializing Supabase client: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to initialize Supabase client: {e}"
        )

# --- Pydantic Models ---
class GenerateInvoicesRequest(BaseModel):
    month: int  # e.g., 4 for April
    year: int  # e.g., 2024

# Corrected Pydantic model for response
class GeneratedInvoiceInfo(BaseModel):
    client_id: str
    client_name: str
    montant_total: float
    invoice_id: int
    lien_pdf: str | None = None # URL to the generated PDF, if successful

class GenerateInvoicesResponse(BaseModel):
    message: str
    generated_invoices: list[GeneratedInvoiceInfo]

# --- API Endpoint ---
@router.post("/generate-monthly-invoices", response_model=GenerateInvoicesResponse, tags=["Invoicing"], dependencies=[Depends(require_admin_role)])
def generate_monthly_invoices(
    request: GenerateInvoicesRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Generates monthly invoices based on validated work sessions (prestations).
    Creates a PDF invoice, uploads it to Supabase Storage, and links it.
    Checks for existing invoices for the same client/month/year before creating.
    """
    month = request.month
    year = request.year

    # --- Input Validation ---
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Invalid month provided.")
    current_year = datetime.now().year
    if year < 2000 or year > current_year + 5:
        raise HTTPException(status_code=400, detail="Invalid year provided.")

    # --- Date Range Calculation ---
    try:
        start_date_str = f"{year}-{month:02d}-01"
        _, last_day = calendar.monthrange(year, month)
        end_date_str = f"{year}-{month:02d}-{last_day:02d}"
        print(f"Processing invoices for period: {start_date_str} to {end_date_str}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Error calculating date range.")

    try:
        # --- Fetch Validated Prestations ---
        print("Fetching validated prestations...")
        # Ensure we fetch necessary fields for PDF: date, project_id (if needed), user_id (if needed), adresse (if needed)
        # Join projects table if project name is desired in PDF
        # Fetch client address directly
        prestations_response = supabase.table('prestations')\
            .select('id, client_id, date_prestation, heures_calculees, tarif_horaire_utilise, clients!inner(id, nom, adresse)')\
            .eq('statut_validation', 'valide')\
            .gte('date_prestation', start_date_str)\
            .lte('date_prestation', end_date_str)\
            .not_.is_('heures_calculees', 'null')\
            .not_.is_('tarif_horaire_utilise', 'null')\
            .not_.is_('client_id', 'null')\
            .execute()

        if not prestations_response.data:
            print(f"No validated prestations found for {month:02d}/{year}.")
            return GenerateInvoicesResponse(message=f"No validated prestations found for {month:02d}/{year}. No invoices generated.", generated_invoices=[])

        print(f"Found {len(prestations_response.data)} validated prestations.")

        # --- Group Prestations by Client and Calculate Totals ---
        invoices_to_calculate = {}
        for prestation in prestations_response.data:
            client_id = prestation.get('client_id')
            heures = prestation.get('heures_calculees')
            tarif = prestation.get('tarif_horaire_utilise')
            client_data = prestation.get('clients') # This is the joined client data

            if client_id is None or heures is None or tarif is None or client_data is None or not isinstance(client_data, dict):
                print(f"WARNING: Skipping prestation {prestation.get('id', 'N/A')} due to missing data.")
                continue

            client_name = client_data.get('nom', "Unknown Client")
            client_address = client_data.get('adresse', "N/A") # Get address from joined data

            try:
                montant_prestation = float(heures) * float(tarif)
                if montant_prestation < 0:
                     print(f"WARNING: Skipping prestation {prestation.get('id', 'N/A')} due to negative amount.")
                     continue
            except (ValueError, TypeError) as calc_err:
                 print(f"WARNING: Error calculating amount for prestation {prestation.get('id', 'N/A')}: {calc_err}. Skipping.")
                 continue

            if client_id not in invoices_to_calculate:
                invoices_to_calculate[client_id] = {
                    'client_name': client_name,
                    'client_address': client_address, # Store address
                    'total_amount': 0.0,
                    'prestation_details': [] # Store details needed for PDF table
                }

            invoices_to_calculate[client_id]['total_amount'] += montant_prestation
            # Store details needed for PDF row
            invoices_to_calculate[client_id]['prestation_details'].append({
                 'date': prestation.get('date_prestation'),
                 'description': "Prestation", # Placeholder - TODO: enhance with project?
                 'heures': float(heures),
                 'tarif': float(tarif),
                 'montant': montant_prestation
            })

        print(f"Calculated totals for {len(invoices_to_calculate)} clients.")

        # --- Check Existing Invoices, Insert New Ones, Generate PDF ---
        generated_invoices_info: list[GeneratedInvoiceInfo] = []
        for client_id_str, data in invoices_to_calculate.items():
            total_amount = round(data['total_amount'], 2)
            client_name = data['client_name']
            client_address = data['client_address']
            prestation_details_for_pdf = data['prestation_details']

            if total_amount <= 0:
                 print(f"INFO: Skipping invoice for client {client_name} ({client_id_str}) due to zero/negative total.")
                 continue

            print(f"Processing invoice for client {client_name} (ID: {client_id_str})")

            try:
                # Check if invoice exists
                existing_invoice_check = supabase.table('invoices')\
                    .select('id', count='exact')\
                    .eq('client_id', client_id_str)\
                    .eq('mois', month)\
                    .eq('annee', year)\
                    .limit(1)\
                    .execute()

                if existing_invoice_check.count > 0:
                    print(f"INFO: Invoice already exists for client {client_id_str} for {month:02d}/{year}. Skipping.")
                    continue

                # Insert new invoice record (initially without PDF link)
                print(f"Inserting invoice record for client {client_id_str}...")
                invoice_data_to_insert = {
                    'client_id': client_id_str,
                    'mois': month,
                    'annee': year,
                    'montant_total': total_amount,
                    'statut': 'générée', # Initial status
                    'lien_pdf': None # Initialize as None
                }
                insert_response = supabase.table('invoices').insert(invoice_data_to_insert).execute()

                if not insert_response.data:
                    print(f"ERROR: Failed to insert invoice record for client {client_id_str}. Response: {insert_response}")
                    raise Exception(f"Invoice insertion failed for client {client_id_str}")

                created_invoice = insert_response.data[0]
                generated_invoice_id = created_invoice.get('id')

                if generated_invoice_id is None:
                    print(f"ERROR: Failed to get ID for newly created invoice for client {client_id_str}.")
                    raise Exception(f"Failed to retrieve ID for inserted invoice for client {client_id_str}")

                print(f"Successfully created invoice record {generated_invoice_id}.")

                # --- PDF Generation, Upload, and Linking ---
                pdf_url: str | None = None # Initialize pdf_url for this invoice
                try:
                    print(f"Starting PDF generation for invoice {generated_invoice_id}...")
                    pdf = FPDF()
                    pdf.add_page()
                    # Consider adding UTF-8 font if needed
                    pdf.set_font("Arial", size=12)

                    # PDF Header
                    pdf.set_font("Arial", 'B', 16)
                    pdf.cell(0, 10, txt=f"FACTURE #{generated_invoice_id}", ln=1, align="C")
                    pdf.ln(10)

                    # Client Info Section
                    pdf.set_font("Arial", 'B', 12)
                    pdf.cell(0, 7, txt="Client:", ln=1)
                    pdf.set_font("Arial", '', 12)
                    pdf.cell(0, 7, txt=f"  {client_name}", ln=1)
                    pdf.cell(0, 7, txt=f"  {client_address}", ln=1) # Add address
                    pdf.ln(5)
                    pdf.cell(0, 7, txt=f"Période: {month:02d}/{year}", ln=1)
                    pdf.ln(10)

                    # Table Header
                    pdf.set_font("Arial", 'B', 10)
                    col_widths = [25, 85, 20, 25, 35] # Date, Desc, Heures, Taux, Montant
                    headers = ['Date', 'Description', 'Heures', 'Taux', 'Montant']
                    for i, header in enumerate(headers):
                         pdf.cell(col_widths[i], 7, header, border=1, align='C')
                    pdf.ln()

                    # Table Rows
                    pdf.set_font("Arial", size=9)
                    for detail in prestation_details_for_pdf:
                         montant_ligne = detail['montant']
                         pdf.cell(col_widths[0], 6, str(detail['date']), border=1)
                         pdf.cell(col_widths[1], 6, detail['description'], border=1)
                         pdf.cell(col_widths[2], 6, f"{detail['heures']:.2f}", border=1, align='R')
                         pdf.cell(col_widths[3], 6, f"{detail['tarif']:.2f}", border=1, align='R')
                         pdf.cell(col_widths[4], 6, f"{montant_ligne:.2f} EUR", border=1, align='R')
                         pdf.ln()

                    # Total Row
                    pdf.set_font("Arial", 'B', 10)
                    pdf.cell(sum(col_widths[:-1]), 10, 'Montant Total HTVA:', border=1, align='R') # Assuming HTVA for now
                    pdf.cell(col_widths[-1], 10, f"{total_amount:.2f} EUR", border=1, align='R')
                    pdf.ln()
                    # TODO: Add VAT / TVA details if applicable

                    # Generate PDF Bytes
                    pdf_bytes = pdf.output(dest='S').encode('latin-1')
                    print(f"PDF generated in memory for invoice {generated_invoice_id}.")

                    # Upload to Supabase Storage
                    if pdf_bytes:
                        storage_path = f"{year}/{month:02d}/invoice_{year}_{month:02d}_{client_id_str}_{generated_invoice_id}.pdf"
                        print(f"Attempting PDF upload to Supabase Storage: {storage_path}")
                        try:
                            # Ensure 'invoices' bucket exists and allows public read + authenticated write (or use service key)
                            storage_response = supabase.storage.from_('invoices').upload(
                                path=storage_path,
                                file=pdf_bytes,
                                file_options={'content-type': 'application/pdf', 'upsert': 'true'}
                            )
                            # Basic check (supabase-py v2 might not raise exception on failure)
                            # Check Supabase dashboard logs for detailed status/errors
                            print(f"Supabase storage upload finished for {storage_path}. Status hint: {storage_response.status_code if hasattr(storage_response, 'status_code') else 'N/A'}")

                            # Get Public URL (Requires bucket policy for public read)
                            try:
                                pdf_url_response = supabase.storage.from_('invoices').get_public_url(storage_path)
                                if isinstance(pdf_url_response, str) and pdf_url_response.startswith('http'):
                                    pdf_url = pdf_url_response # Assign URL if valid
                                    print(f"Retrieved public PDF URL: {pdf_url}")

                                    # Update Invoice Record with PDF Link
                                    print(f"Updating invoice {generated_invoice_id} with PDF link...")
                                    update_response = supabase.table('invoices')\
                                        .update({'lien_pdf': pdf_url})\
                                        .eq('id', generated_invoice_id)\
                                        .execute()
                                    # Check if update was successful (v2 returns data on success)
                                    if not update_response.data:
                                         print(f"WARNING: Failed to update invoice {generated_invoice_id} with PDF link. Response: {update_response}")
                                    else:
                                         print(f"Successfully updated invoice {generated_invoice_id} with link.")
                                else:
                                    print(f"WARNING: Failed to get valid public URL for {storage_path}. Response: {pdf_url_response}. Check bucket RLS/Policies.")

                            except Exception as url_err:
                                print(f"ERROR: Exception getting public URL for {storage_path}: {url_err}")

                        except Exception as storage_err:
                            print(f"ERROR: Supabase Storage upload failed for {storage_path}: {storage_err}")
                            traceback.print_exc()

                except Exception as pdf_overall_err:
                    print(f"ERROR: Overall failure during PDF handling for invoice {generated_invoice_id}: {pdf_overall_err}")
                    traceback.print_exc()
                    # pdf_url remains None

                # --- Append results including the pdf_url (which might be None) ---
                generated_invoices_info.append(GeneratedInvoiceInfo(
                    client_id=client_id_str,
                    client_name=client_name,
                    montant_total=total_amount,
                    invoice_id=generated_invoice_id,
                    lien_pdf=pdf_url # Assign the final pdf_url value
                ))

            except Exception as client_processing_err:
                 print(f"ERROR: Failed processing client {client_id_str}: {client_processing_err}")
                 traceback.print_exc()
                 # Continue with the next client

        # --- Final Response ---
        final_message = f"Invoice generation process completed for {month:02d}/{year}. Generated {len(generated_invoices_info)} new invoice(s)."
        if not generated_invoices_info:
             final_message = f"Invoice generation process completed for {month:02d}/{year}. No new invoices were generated."

        print(final_message)
        return GenerateInvoicesResponse(
            message=final_message,
            generated_invoices=generated_invoices_info
        )

    except Exception as e:
        print(f"FATAL ERROR: Unexpected error during invoice generation process: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# Keep the health check endpoint
@router.get("/health", tags=["Health"])
def check_invoicing_health():
    return {"status": "ok", "message": "Invoicing API is healthy"}
