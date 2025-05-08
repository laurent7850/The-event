import React, { useState, useEffect } from 'react';
import { supabase } from 'utils/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_BASE_PATH } from 'app';

export default function MettreAJourMotDePasse() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false); // To ensure session is ready before allowing update
  const navigate = useNavigate();

  // Supabase listener to detect when the user is signed in via the magic link (password recovery token)
  useEffect(() => {
    // Check initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log("Session already exists on load.");
            setIsSessionReady(true);
        }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
             // PASSWORD_RECOVERY event signifies the user clicked the link
             // SIGNED_IN might also occur depending on flow
             toast.info("Authentification réussie. Vous pouvez définir un nouveau mot de passe.");
             setIsSessionReady(true); 
             setMessage("Veuillez entrer votre nouveau mot de passe.");
        } else if (event === "SIGNED_OUT") {
             setIsSessionReady(false);
             navigate(`${APP_BASE_PATH}/connexion`); // Go to login if signed out
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) { // Basic length check (Supabase default is 6)
        setError("Le mot de passe doit contenir au moins 6 caractères.");
        toast.error("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    if (!isSessionReady) {
        setError("La session n'est pas prête pour la mise à jour. Veuillez réessayer ou vérifier le lien.");
        toast.error("Session non prête.");
        return;
    }

    setLoading(true);

    try {
       const { data, error: updateError } = await supabase.auth.updateUser({
         password: password, 
       });

       if (updateError) {
         throw updateError; // Throw error to be caught by the catch block
       }

       // Password updated successfully
       toast.success('Mot de passe mis à jour avec succès !');
       setMessage('Votre mot de passe a été changé. Vous allez être redirigé vers la page de connexion.');
       
       // It's often good practice to sign the user out after a password change
       // and force them to log in again with the new password.
       await supabase.auth.signOut();

       // Redirect to login page after a short delay to allow the user to read the message
       setTimeout(() => {
         navigate(`${APP_BASE_PATH}/connexion`);
       }, 3000); // 3 second delay

    } catch (error: any) {
        console.error("Error updating password:", error);
        setError(`Erreur lors de la mise à jour du mot de passe: ${error.message || 'Veuillez réessayer.'}`);
        toast.error("Erreur lors de la mise à jour du mot de passe.");
        setLoading(false); // Re-enable button on error
    } 
    // No finally block needed here as navigation handles the end state on success,
    // and setLoading(false) is called explicitly on error.

  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Réinitialiser le Mot de Passe</CardTitle>
          <CardDescription>
            Entrez votre nouveau mot de passe ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
         {!isSessionReady ? (
            <p className="text-center text-muted-foreground">Vérification du lien en cours...</p>
         ) : (
          <form onSubmit={handlePasswordUpdate}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              {message && <p className="text-sm text-foreground">{message}</p>}
              <Button type="submit" className="w-full" disabled={loading || !isSessionReady}>
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </div>
          </form>
          )}
        </CardContent>
        {/* Optional: Add a footer link back to login? */}
      </Card>
    </div>
  );
}
