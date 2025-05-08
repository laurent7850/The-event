import React from 'react';
import { useAuth } from 'utils/AuthContext'; // Import useAuth hook
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription, // Keep CardDescription imported even if commented out below
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// APP_BASE_PATH is not needed here as navigation is handled by AuthContext

export default function EnAttenteValidation() {
  const { signOut, loading: authLoading } = useAuth(); // Get signOut and loading state from context

  const handleLogout = async () => {
    try {
      await signOut();
      // Navigation is handled within the signOut function in AuthContext
      toast.success("Déconnexion réussie."); 
    } catch (error: any) {
      console.error("Error logging out from EnAttenteValidation:", error);
      toast.error(`Erreur lors de la déconnexion: ${error.message}`);
      // Navigation to login page should still happen via signOut context function even on error
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Validation en Attente</CardTitle>
          {/* Optional: Keep a simple description or remove */}
          {/* <CardDescription>Presque prêt !</CardDescription> */}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Merci pour votre inscription et la confirmation de votre adresse email. 
            Votre compte est maintenant en attente de validation finale par un administrateur. 
            Vous recevrez un email dès que votre compte sera approuvé et que vous pourrez vous connecter.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleLogout} disabled={authLoading} variant="outline">
            {authLoading ? 'Déconnexion...' : 'Se déconnecter'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
