import React, { useState } from 'react';
import { supabase } from 'utils/supabase';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { APP_BASE_PATH } from 'app';

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // To show confirmation/error messages
  const navigate = useNavigate();

  const handlePasswordResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Call Supabase to send the password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // IMPORTANT: Define the URL where the user will be redirected after clicking the email link
        // This URL should point to a page in your app designed to handle password updates.
        redirectTo: `${window.location.origin}${APP_BASE_PATH}/reset-password`, 
      });

      if (error) {
        // Log the specific error for debugging, but show a generic message to the user
        console.error("Supabase Password Reset Error:", error);
        // Don't reveal if the email exists or not for security
        setMessage("Une erreur est survenue lors de la demande. Veuillez réessayer.");
        toast.error("Une erreur est survenue lors de la demande.");
      } else {
        // Show a generic success message regardless of whether the email exists
        setMessage("Si un compte existe pour cet email, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception (et vos spams).");
        toast.success("Demande de réinitialisation envoyée.");
        setEmail(''); // Clear the email field after successful request
      }

    } catch (catchError: any) {
      console.error("Unexpected error requesting password reset:", catchError);
      setMessage("Une erreur inattendue est survenue. Veuillez réessayer.");
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Mot de Passe Oublié</CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordResetRequest}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
           Retour à la{' '}
           <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${APP_BASE_PATH}/connexion`)}>
             connexion
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
