import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "utils/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

interface Props {
  children: ReactNode;
}

/**
 * A provider wrapping the whole app.
 *
 * We also render the main navigation bar here, conditionally based on auth state and route.
 */
export const AppProvider = ({ children }: Props) => {
  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
      <Toaster />
    </AuthProvider>
  );
};

// List of paths where the main navigation should NOT be displayed
const STANDALONE_PATHS = [
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/mettre-a-jour-mot-de-passe",
  "/en-attente-validation",
];

// Component to handle layout including conditional navigation
const AppLayout = ({ children }: Props) => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location

  const handleLogout = async () => {
    try {
      await signOut();
      // Navigation is handled by signOut in context
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Determine if the nav bar should be shown
  const showNavBar = user && !STANDALONE_PATHS.some(path => location.pathname.endsWith(path));

  // Don't render anything during initial auth load to prevent flashes
  if (loading) {
    return null; 
  }

  return (
    <>
      {showNavBar && (
        <nav className="bg-card text-card-foreground p-4 shadow-md mb-6 border-b border-border">
          <ul className="flex space-x-6 container mx-auto items-center">
            <li><Link to="/" className="font-semibold hover:text-primary">Accueil</Link></li>

            {/* Collaborateur Links */}
            {user?.role === "collaborateur" && (
              <li><Link to="/creer-prestation" className="hover:text-primary">Encoder Prestation</Link></li>
            )}

            {/* Admin Links */}
            {user?.profile?.role === "admin" && (
              <>
                <li><Link to="/DashboardAdmin" className="hover:text-primary">Validation Prestations</Link></li>
                <li><Link to="/admin-validation-utilisateurs" className="hover:text-primary">Validation Utilisateurs</Link></li>
                <li><Link to="/GestionClientsProjets" className="hover:text-primary">Gestion Clients/Projets</Link></li>
              </>
            )}

            {/* Logout Button */} 
            <li className="ml-auto">
              <span className="mr-4 text-sm text-muted-foreground">Bonjour, {user?.email}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">Déconnexion</Button>
            </li>
          </ul>
        </nav>
      )}
      {/* Render the actual page content */} 
      {/* Add top margin only when navbar is hidden to prevent content jumping */}
      <div className={`container mx-auto px-4 pb-8 ${!showNavBar ? 'mt-6' : ''}`}>
         {children}
      </div>
    </>
  );
};
