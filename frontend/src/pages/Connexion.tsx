import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from 'utils/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_BASE_PATH } from 'app';
import { Link } from 'react-router-dom'; // Import Link for Forgot Password

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for login/profile errors
  const navigate = useNavigate();

  // Check if user is already logged in on page load
  useEffect(() => {
    const checkSession = async () => {
      console.log('Checking if user is already logged in...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error checking session:', sessionError);
          return;
        }
        
        if (session?.user) {
          console.log('User already logged in, checking profile...');
          try {
            // User is already logged in, check profile status
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('statut_validation, role')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              if (profileError.code === 'PGRST116') {
                // Profile not found yet, might be waiting for supabase trigger
                console.warn('No profile found for logged in user, redirecting to waiting page');
                navigate(`${APP_BASE_PATH}/en-attente-validation`);
              } else {
                console.error('Error fetching profile:', profileError);
                // Don't log out or show error, let the user try manual login
              }
              return;
            }
            
            if (!profile) {
              console.warn('Profile empty but no error, redirecting to waiting page');
              navigate(`${APP_BASE_PATH}/en-attente-validation`);
              return;
            }
            
            // Redirect based on status
            console.log('User profile found, status:', profile.statut_validation);
            if (profile.statut_validation === 'en_attente_validation' || profile.statut_validation === 'en_attente') {
              navigate(`${APP_BASE_PATH}/en-attente-validation`);
            } else if (profile.statut_validation === 'valide') {
              if (profile.role === 'admin') {
                navigate(`${APP_BASE_PATH}/admin-validation`);
              } else {
                navigate(`${APP_BASE_PATH}/dashboard-collaborateur`);
              }
            }
            // If status is 'refuse', let user stay on login page
          } catch (e) {
            console.error('Unexpected error checking profile:', e);
            // Don't logout, let the user try manual login
          }
        } else {
          console.log('No active session found');
        }
      } catch (e) {
        console.error('Unexpected error checking session:', e);
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        // Handle specific errors or show a generic message
        if (signInError.message.includes("Invalid login credentials")) {
             setError("Email ou mot de passe incorrect.");
             toast.error("Email ou mot de passe incorrect.");
        } else {
             setError(`Erreur de connexion: ${signInError.message}`);
             toast.error(`Erreur de connexion: ${signInError.message}`);
        }
        console.error('Supabase Sign In Error:', signInError);
        setLoading(false);
        return; // Stop execution if login failed
      }

      // --- Login successful, now check profile status and role --- 
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          // This case should technically not happen right after successful login, but check for safety
          setError("Impossible de récupérer les informations utilisateur après connexion.");
          toast.error("Impossible de récupérer les informations utilisateur après connexion.");
          setLoading(false);
          return;
      }

      // Fetch the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('statut_validation, role')
        .eq('id', user.id)


      // NEW LOGIC START
      if (profileError) { // Check if profileError exists first
          if (profileError.code === 'PGRST116') {
              // Profile not found (0 rows returned by .single()) - Expected if trigger hasn't run yet or failed
              console.warn("Profile not found for user after login (PGRST116). Assuming default state or waiting for trigger.", user.id);
              // Navigate to dashboard anyway, let AuthContext/Dashboard handle the final state.
              toast.info("Profil en cours de création, redirection..."); // Inform user
              navigate(`${APP_BASE_PATH}/dashboard-collaborateur`);
              // setLoading(false) should happen in finally block
          } else {
              // Other unexpected error fetching profile
              console.error("Error fetching profile after login:", profileError);
              setError("Impossible de vérifier le statut de votre compte. Contactez l'administration.");
              toast.error("Impossible de vérifier le statut de votre compte. Contactez l'administration.");
              // Optional: Log out the user
              // await supabase.auth.signOut();
              setLoading(false); // Stop loading indicator here for non-PGRST116 errors that prevent proceeding
              return;
          }
      } else if (!profile) {
           // This case handles if profileError was null BUT profile is still falsy 
           // (Could happen if trigger is slow and PGRST116 was handled above, but profile is *still* null)
           console.warn("Profile data is unexpectedly null/undefined after login, even without specific error. Showing pending status as fallback.");
           // Go to pending page as a safe fallback if profile object is missing without an error
           toast.info("Vérification du profil en cours...");
           navigate(`${APP_BASE_PATH}/en-attente-validation`);
           setLoading(false); // Stop loading as we are navigating
           return;
      } else {
          // --- Profile found, login is valid. AuthContext will handle redirection based on status/role. ---
          toast.success("Connexion réussie. Redirection en cours...");
          // No explicit navigation here - AuthContext takes over.
      }
      // NEW LOGIC END

      // setLoading(false) will be called in finally, or if navigation takes time it's okay

    } catch (catchError: any) {
      // Catch unexpected errors during the process
      console.error("Unexpected error during login:", catchError);
      setError("Une erreur inattendue est survenue.");
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      // Ensure loading is set to false even if navigation happens quickly or errors occur
      // Use setTimeout to prevent premature state update if navigation is very fast
      setTimeout(() => setLoading(false), 100); 
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
          <CardDescription>
            Accédez à votre espace EventFlow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
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
              <div className="grid gap-2">
                <div className="flex justify-between items-baseline"> {/* Adjusted layout */}
                  <Label htmlFor="password">Mot de passe</Label>
                   <Link
                    to="/mot-de-passe-oublie" // Link to the password reset page
                    className="inline-block text-sm underline"
                   >
                    Mot de passe oublié?
                   </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>} {/* Use text-destructive for errors */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
           Pas encore de compte?{' '}
           {/* Use navigate for internal routing */}
           <Link to="/inscription" className="text-sm underline">Inscrivez-vous</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
