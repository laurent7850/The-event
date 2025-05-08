# src/app/apis/notifications/__init__.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import databutton as db
from typing import Optional
import traceback
from app.env import mode, Mode # Added import

router = APIRouter()

class NewUserNotifyRequest(BaseModel):
    """Request model for notifying about user status changes via endpoint."""
    user_id: str
    nom: str | None = None
    prenom: str | None = None
    email: EmailStr
    status: Optional[str] = None # 'approved', 'rejected', or None for new registration

class NotifyResponse(BaseModel):
    """Response model for the notification endpoint."""
    message: str

def _send_user_status_email(user_id: str, email: EmailStr, nom: str | None, prenom: str | None, status: str | None):
    """Internal helper function to construct and send user status emails."""
    try:
        # --- Determine Base URL based on environment ---
        # URLs based on the context provided earlier
        DEV_UI_BASE_URL = "https://databutton.com/_projects/c8e36033-079a-43d8-b4a9-779988a4d1b3/dbtn/devx/ui/"
        PROD_UI_BASE_URL = "https://aimagination.databutton.app/event-flow"

        if mode == Mode.PROD:
            base_url = PROD_UI_BASE_URL
        else: # Assume DEV
            base_url = DEV_UI_BASE_URL

        # Construct specific URLs
        login_url = f"{base_url.rstrip('/')}/connexion"
        admin_validation_url = f"{base_url.rstrip('/')}/admin-user-validation"
        print(f"[INFO] Using base URL: {base_url} for email links.")

        # --- Existing logic continues below ---
        director_email = db.secrets.get("DIRECTOR_EMAIL")
        if not director_email and status is None:
            print("[WARN] Director email secret (DIRECTOR_EMAIL) not found for new registration notification. Skipping email.")
            return # Don't raise, just skip

        recipient_email = ""
        subject = ""
        content_text = ""
        content_html = ""

        user_full_name = f"{prenom or ''} {nom or ''}".strip()
        if not user_full_name:
            user_full_name = email # Fallback if name is missing

        # Determine recipient, subject, and content based on status
        if status == "approved":
            recipient_email = email
            subject = "Votre compte EventFlow a été approuvé !"
            
            content_text = f"""
Bonjour {user_full_name},

Bonne nouvelle ! Votre compte sur EventFlow a été approuvé par l'administrateur.

Vous pouvez maintenant vous connecter et commencer à encoder vos prestations.

Connectez-vous ici : {login_url}

Cordialement,
L'équipe EventFlow
            """
            content_html = f"""
            <p>Bonjour {user_full_name},</p>
            <p>Bonne nouvelle ! Votre compte sur EventFlow a été approuvé par l'administrateur.</p>
            <p>Vous pouvez maintenant vous connecter et commencer à encoder vos prestations.</p>
            <p>Connectez-vous ici : <a href="{login_url}">Accéder à EventFlow</a></p>
            <p>Cordialement,<br/>L'équipe EventFlow</p>
            """
            print(f"Preparing approval notification for user {recipient_email}")

        elif status == "rejected":
            recipient_email = email
            subject = "Information concernant votre compte EventFlow"
            content_text = f"""
Bonjour {user_full_name},

Nous vous informons que votre demande d'inscription sur EventFlow n'a pas pu être approuvée pour le moment.

Si vous pensez qu'il s'agit d'une erreur ou pour plus d'informations, veuillez contacter l'administration.

Cordialement,
L'équipe EventFlow
            """
            content_html = f"""
            <p>Bonjour {user_full_name},</p>
            <p>Nous vous informons que votre demande d'inscription sur EventFlow n'a pas pu être approuvée pour le moment.</p>
            <p>Si vous pensez qu'il s'agit d'une erreur ou pour plus d'informations, veuillez contacter l'administration.</p>
            <p>Cordialement,<br/>L'équipe EventFlow</p>
            """
            print(f"Preparing rejection notification for user {recipient_email}")

        else: # Original case: New user registration (status is None)
            if not director_email:
                 print("[ERROR] Director email missing, cannot send new registration notification.")
                 return # Skip

            recipient_email = director_email
            subject = f"Nouvelle inscription en attente : {user_full_name}"
            content_text = f"""
            Un nouveau collaborateur s'est inscrit et attend votre validation :

            Nom: {nom or 'N/A'}
            Prénom: {prenom or 'N/A'}
            Email: {email}

            Veuillez vous connecter à l'interface d'administration pour approuver ou refuser ce compte.
            (ID Utilisateur: {user_id})
            """
            
            content_html = f"""
            <p>Un nouveau collaborateur s'est inscrit et attend votre validation :</p>
            <ul>
                <li><strong>Nom:</strong> {nom or 'N/A'}</li>
                <li><strong>Prénom:</strong> {prenom or 'N/A'}</li>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>ID Utilisateur:</strong> {user_id}</li>
            </ul>
            <p>Veuillez vous connecter à l'interface d'administration pour approuver ou refuser ce compte : <a href="{admin_validation_url}">Valider l'utilisateur</a></p>
            """
            print(f"Preparing new registration notification for director {recipient_email}")

        # Send the email
        if not recipient_email:
             print("[ERROR] Recipient email could not be determined. Skipping email send.")
             return

        print(f"Sending '{status or 'new_registration'}' notification email to {recipient_email}")
        db.notify.email(
            to=[recipient_email], # Expects a list
            subject=subject,
            content_text=content_text,
            content_html=content_html,
        )
        print("Notification email sent successfully.")

    except Exception as e:
        print(f"[ERROR] Failed to send notification email ({status or 'new_registration'}) for user {user_id}: {e}")
        traceback.print_exc()
        # Do not re-raise here, allow the calling function to handle success/failure

@router.post("/notify-new-user", response_model=NotifyResponse)
def notify_new_user_registration(request: NewUserNotifyRequest):
    """
    Endpoint to trigger email notifications based on user status.
    Calls the internal helper function to perform the actual email sending.
    """
    try:
        _send_user_status_email(
            user_id=request.user_id,
            email=request.email,
            nom=request.nom,
            prenom=request.prenom,
            status=request.status
        )
        return NotifyResponse(message="Notification processed.")
    except Exception as e:
        print(f"[ERROR] Failed to process notification request via endpoint: {e}")
        traceback.print_exc()
        # Return an error response if the endpoint itself fails
        raise HTTPException(status_code=500, detail=f"Notification processing failed: {str(e)}")

