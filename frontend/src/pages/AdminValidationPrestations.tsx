
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "utils/AuthContext"; // Assuming AuthContext is in @/contexts
import { Navigate } from 'react-router-dom';

const AdminValidationPrestations: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Chargement des informations utilisateur...</p>
      </div>
    );
  }

  if (!user) {
    // User not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // User is not an admin, show access denied or redirect to a different page
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Accès Refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              Vous n'avez pas les droits nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin user, display the page content
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Validation des Prestations</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Tableau de bord pour la validation des prestations.</p>
          {/* Further implementation will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminValidationPrestations;
