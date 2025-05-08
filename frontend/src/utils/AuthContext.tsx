console.log("[DEBUG] Le fichier AuthContext est chargé");
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react'; // Added useCallback
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase'; // Import your configured Supabase client
import { useNavigate, useLocation } from 'react-router-dom'; // <-- Import hooks
import { toast } from 'sonner'; // <-- Import toast
import { APP_BASE_PATH } from 'app'; // <-- Import base path

// Define a more specific User type for your app, including the role and validation status
export interface AppUser extends SupabaseUser {
  role?: string;
  statut_validation?: string; // <-- Add validation status
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean; // <-- Add isAdmin helper
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Define signOut function wrapped in useCallback BEFORE the useEffect that depends on it
  const signOut = useCallback(async () => {
    console.log("Attempting to sign out...");
    // Clear state immediately for faster UI feedback
    setUser(null);
    setSession(null);
    const { error } = await supabase.auth.signOut();
    const basePath = APP_BASE_PATH.replace(/\/$/, ''); // Define basePath here
    const loginPath = `${basePath}/connexion`;

    if (error) {
        console.error('Error signing out:', error);
        // Even if signout fails, try to redirect to login
        if (location.pathname !== loginPath) {
            navigate(loginPath, { replace: true });
        }
        throw error; // Re-throw to allow calling code to handle
    } else {
        console.log("Sign out successful, navigating to login.");
        // Navigate to login after successful sign out
        if (location.pathname !== loginPath) { // Avoid navigating if already there
           navigate(loginPath, { replace: true });
        }
    }
  // Add dependencies for useCallback
  }, [navigate, setUser, setSession, supabase.auth, location.pathname]);

  // Add a new useEffect specifically for mount logging
  useEffect(() => {
    console.log("[DEBUG] AuthContext monté dans React");
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    const fetchInitialSession = async () => {
        console.log('[AuthContext] fetchInitialSession: Start'); // Log Start
        try {
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            console.log('[AuthContext] fetchInitialSession: getSession call completed.', { currentSession, sessionError }); // Log after getSession
            if (sessionError) {
                console.error('Error getting session:', sessionError);
                throw sessionError;
            }
            console.log('[AuthContext] fetchSessionAndProfile: Session data:', currentSession);
            setSession(currentSession);
            // Profile fetching is now handled by onAuthStateChange
            // We only set the session here initially.
            if (!currentSession?.user) {
                setUser(null); // Ensure user is null if no session user initially
            }
            console.log('[AuthContext] fetchInitialSession: Session set.');
        } catch (error) {
            console.error("Error in fetchInitialSession:", error);
            setUser(null);
            setSession(null);
        } finally {
            console.log('[AuthContext] fetchInitialSession: Finally block, setting loading to false. CURRENT loading STATE BEFORE SET:', loading); // Log setLoading
            setLoading(false);
        }
    };

    fetchInitialSession(); // Fetch initial session

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        console.log(`[AuthContext] onAuthStateChange: Triggered. Event: ${_event}`, { session: newSession }); // Log event and session
        
        // Set session state immediately
        setSession(newSession);

        // --- Start User Profile Fetch Logic ---
        if (newSession?.user) {
             console.log(`[AuthContext] onAuthStateChange: User found in session (${newSession.user.id}). Attempting to fetch profile.`); // Log Start Fetch
             
             try {
                 // Fetch the user's profile from the profiles table
                 const { data: profileData, error: profileError } = await supabase
                     .from('profiles')
                     .select('role, statut_validation')
                     .eq('id', newSession.user.id)
                     .single();
                 
                 if (profileError) {
                     console.error('[AuthContext] onAuthStateChange: Profile fetch error:', profileError);
                     // Fall back to default values if profile fetch fails
                     const fallbackUser: AppUser = { 
                         ...newSession.user, 
                         role: 'collaborateur', // Default role
                         statut_validation: 'inconnu' // Default status
                     };
                     console.log('[AuthContext] onAuthStateChange: Using fallback user due to profile fetch error.', fallbackUser);
                     setUser(fallbackUser);
                 } else if (profileData) {
                     // SUCCESS CASE: Merge session user with profile data, sanitizing status
                     const validStatuses = ['valide', 'en_attente', 'refuse'];
                     let finalStatus = 'inconnu'; // Default if DB value is weird or missing

                     if (profileData.statut_validation && validStatuses.includes(profileData.statut_validation)) {
                         finalStatus = profileData.statut_validation;
                     } else if (profileData.statut_validation) {
                         // Log if the value exists but isn't expected
                         console.warn(`[AuthContext] Unexpected statut_validation value '${profileData.statut_validation}' found for user ${newSession.user.id}. Defaulting to 'inconnu'.`);
                     } else {
                         // Log if the value is null or undefined
                         console.warn(`[AuthContext] Null or missing statut_validation found for user ${newSession.user.id}. Defaulting to 'inconnu'.`);
                     }

                     const userWithProfile: AppUser = {
                         ...newSession.user,
                         role: profileData.role || 'collaborateur', // Keep role default
                         statut_validation: finalStatus // Use the sanitized status
                     };
                     console.log(`[AuthContext] onAuthStateChange: User profile found, assigned status: ${finalStatus}`);
                     setUser(userWithProfile);
                 } else {
                     // Profile not found, use fallback
                     console.warn('[AuthContext] onAuthStateChange: No profile found for user', newSession.user.id);
                     const fallbackUser: AppUser = { 
                         ...newSession.user, 
                         role: 'collaborateur',
                         statut_validation: 'inconnu'
                     };
                     setUser(fallbackUser);
                 }
             } catch (error) {
                 console.error('[AuthContext] onAuthStateChange: Unexpected error during profile fetch:', error);
                 // Fall back to session user with defaults
                 const fallbackUser: AppUser = { 
                     ...newSession.user, 
                     role: 'collaborateur',
                     statut_validation: 'inconnu'
                 };
                 setUser(fallbackUser);
             }
        } else {
             // Log specific branch: No user in session
             console.log('[AuthContext] onAuthStateChange: BRANCH=NoUserInSession');
             console.log('[AuthContext] onAuthStateChange: Setting user state to null.');
             setUser(null);
        }
        console.log('[AuthContext] onAuthStateChange: Handler finished.');
        // setLoading is managed by fetchInitialSession
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Effect to handle redirection based on validation status
  // Effect to handle redirection based on validation status AND password recovery
  useEffect(() => {
    // Check for password recovery state from URL hash FIRST
    // Supabase redirects with #access_token=...&type=recovery
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1)); // Remove # and parse
    const isRecovery = params.get('type') === 'recovery';
    const accessToken = params.get('access_token');
    const recoveryPath = "/reset-password";
    const currentPathname = location.pathname; // Path relative to base

    console.log(`[AuthContext] Redirection Effect: Hash Check. Path: ${currentPathname}, Hash: ${hash}, isRecovery: ${isRecovery}`);

    if (isRecovery && accessToken && currentPathname !== recoveryPath) {
      // We are in the recovery flow AND not already on the reset page.
      // The onAuthStateChange listener should have already processed the session from the accessToken.
      // We just need to redirect the user to the dedicated page.
      console.log(`[AuthContext] Redirection Effect: Detected recovery state. Redirecting from ${currentPathname} to ${recoveryPath}`);
      // Clear the hash to prevent loops if the user refreshes the reset page
      // navigate might not clear hash, so manual clear is safer
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      navigate(recoveryPath, { replace: true });
      return; // Stop further redirection logic in this effect run
    }

    // ---- Existing Redirection Logic ----
    // Define relative paths for navigation and comparison
    const motDePasseOubliePath = "/mot-de-passe-oublie";
    const resetPasswordPath = "/reset-password"; // Also add reset page as public
    const inscriptionPath = "/inscription"; // Re-added definition
    const loginPath = "/connexion"; // Re-added definition
    const waitingPath = "/en-attente-validation";
    const adminDashboardPath = "/admin-validation-prestations"; // Default admin page after login
    const collaborateurDashboardPath = "/dashboard-collaborateur";
    const currentPath = location.pathname; // This is already relative to the base path

    // Log entry point for debugging
    // console.log(`[AuthContext] Redirection Effect: Start. Loading: ${loading}, Path: ${currentPath}, User:`, user);

    // Only proceed with redirection logic if we're not in a loading state
    console.log(`[AuthContext] Redirection Debug: Evaluating. Path=${currentPath}, Loading=${loading}, User Validated=${user?.statut_validation === 'valide'}, User Pending=${user?.statut_validation === 'en_attente'}, User Refused=${user?.statut_validation === 'refuse'}, Session Exists=${!!session}`);
    if (!loading) {
       // FIX: Only redirect to login if both session AND user are null
       // This prevents redirection during the window where session exists but user profile
       // hasn't been fetched/set yet
       if (user) {
          // User is logged in
          console.log(`[AuthContext] Redirection Effect: Evaluating for User. Status: ${user?.statut_validation ?? 'N/A'}, Role: ${user?.role ?? 'N/A'}, Path: ${currentPath}`);

          // Redirect pending or unknown users to waiting page ONLY IF:
          // 1. They are NOT an admin (admins are exempt from validation flow)
          // 2. They have a pending or unknown status
          // 3. They are not already on the waiting page
          // Redirect pending users to waiting page ONLY IF:
          // 1. They are NOT an admin
          // 2. Their status is confirmed as 'en_attente' (NOT 'inconnu' which might mean loading/error)
          // 3. They are not already on the waiting page
          if (user.role !== 'admin' && 
              user.statut_validation === 'en_attente' && 
              currentPath !== waitingPath) {
            console.log(`[AuthContext] Redirection Debug: Condition=PendingUser, Status=${user.statut_validation}, CurrentPath=${currentPath}, TargetPath=${waitingPath}`);
            console.log(`[AuthContext] Redirecting pending user from ${currentPath} to ${waitingPath}`);
            navigate(waitingPath, { replace: true });
            return;
          }

          // Handle rejected users: sign out and redirect to login
          if (user.statut_validation === 'refuse' && currentPath !== loginPath) {
            console.log(`[AuthContext] Redirection Debug: Condition=RejectedUser, CurrentPath=${currentPath}, TargetAction=SignOut`);
            console.log(`[AuthContext] User status is 'refuse'. Signing out from ${currentPath} and redirecting to ${loginPath}.`);
            signOut().then(() => {
                toast.error("Votre compte a été refusé. Veuillez contacter l'administrateur.", { duration: 10000 });
                // navigate(loginPath, { replace: true }); // signOut already navigates
            }).catch(err => {
                console.error("Error during signout for rejected user:", err);
                if (location.pathname !== loginPath) { // Check again before forcing
                   navigate(loginPath, { replace: true });
                }
            });
            return;
          }

          // Handle validated users: Redirect away from public/waiting pages to their dashboard
          if (user.statut_validation === 'valide') {
            const isAdmin = user.role === 'admin';
            const targetDashboardPath = isAdmin ? adminDashboardPath : collaborateurDashboardPath;
            const forbiddenPaths = [loginPath, waitingPath, inscriptionPath]; // Pages validated users shouldn't be on

            if (forbiddenPaths.includes(currentPath)) {
               console.log(`[AuthContext] Redirection Debug: Condition=ValidatedUserOnForbiddenPath, CurrentPath=${currentPath}, TargetPath=${targetDashboardPath}, IsAdmin=${isAdmin}`);
               if (isAdmin) {
                   console.log(`[AuthContext] Redirecting validated admin from ${currentPath} to ${adminDashboardPath}`);
                   navigate("/admin-validation-prestations", { replace: true }); // Use direct path
               } else {
                   console.log(`[AuthContext] Redirecting validated collaborateur from ${currentPath} to ${collaborateurDashboardPath}`);
                   navigate("/dashboard-collaborateur", { replace: true }); // Use direct path
               }
               return;
            }
          }

       } else if (!session) {
           // FIX: Only redirect to login if BOTH user AND session are null
           // This prevents redirect during the brief window where session exists but user profile is still loading
           console.log(`[AuthContext] Redirection Effect: No user AND no session. Path: ${currentPath}`);
           const publicPaths = [loginPath, inscriptionPath, motDePasseOubliePath, resetPasswordPath];

           // If not loading, no user, no session, and not on a public path OR the waiting path, redirect to login
           // Allow access to public paths and the waiting path even without a user
           if (!publicPaths.includes(currentPath) && currentPath !== waitingPath) {
               console.log(`[AuthContext] Redirection Debug: Condition=NoUserNoSessionNotPublic, CurrentPath=${currentPath}, TargetPath=${loginPath}`);
               console.log(`[AuthContext] No user, no session, and not on public/waiting path. Redirecting from ${currentPath} to ${loginPath}`);
               navigate(loginPath, { replace: true });
               return; // Prevent further checks
           }
       } else {
           // FIX: Session exists but user is null - this means profile fetch is in progress
           // Don't redirect in this case, just wait for profile to load
           console.log(`[AuthContext] Redirection Debug: Condition=SessionExistsUserNull, CurrentPath=${currentPath}. No redirect.`);
           console.log(`[AuthContext] Redirection Effect: Session exists but user is null. Waiting for profile fetch to complete.`);
       }
    }
    // Dependencies: Ensure effect runs if user, loading state, or path changes.
    // Added location.hash to re-run check if hash changes (though less likely needed after initial load)
  }, [user, session, loading, location.pathname, location.hash, navigate, signOut]);



  // Define isAdmin AFTER user state is potentially set
  const isAdmin = user?.role === 'admin';

  // Value for the context provider
  const value = {
    user,
    session,
    loading,
    signOut, // Provide the memoized signOut
    isAdmin,
  };

  // Log state before rendering
  console.log(`[AuthContext] Rendering: Loading: ${loading}, User:`, user, `Session:`, session);

  // Render children only after initial loading is complete
  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children if:
       * 1. Still loading OR
       * 2. The user is not an admin AND has a pending/unknown status AND is not already on the waiting page
       * This prevents flashing the wrong page briefly before redirect happens
       */}
      {!loading && 
       !(user && 
         user.role !== 'admin' && 
         (user.statut_validation === 'en_attente' || user.statut_validation === 'inconnu') && 
         location.pathname !== '/en-attente-validation'
       ) && 
       children}
      {loading && 
          <div className="flex h-screen items-center justify-center">
               <p>Chargement de l'authentification...</p>
          </div>
       }
       {/* Log the result of the rendering condition */}
      {/* Removed dangerouslySetInnerHTML for better HMR support */}

    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};