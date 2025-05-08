import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom"; // Import Link

export default function App() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/connexion');
  };

  const handleSignup = () => {
    navigate('/inscription');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto max-w-4xl text-center py-20 px-6 md:py-32">
        <h1 className="text-6xl md:text-7xl font-serif font-bold mb-6 tracking-tight">EventFlow</h1>
        {/* Assuming a serif font is configured via Tailwind theme or CSS import */}
        <p className="text-lg md:text-xl text-muted-foreground mb-16 max-w-2xl mx-auto leading-relaxed">
          Le CRM sophistiqué pour la gestion du personnel événementiel de The Event.
          Encodage des prestations, la validation et la facturation.
        </p>

        <Card className="mb-16 text-left bg-card border border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold">Fonctionnalités Clés</CardTitle>
            <CardDescription>Des outils efficaces pour les opérations de votre agence.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-3 text-card-foreground/80">
              <li>Encodage facile des prestations pour les collaborateurs.</li>
              <li>Flux de validation et de contrôle par la direction.</li>
              <li>Facturation client automatisée.</li>
              <li>Gestion sécurisée des collaborateurs.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-x-6">
          <Button onClick={handleLogin} size="lg" variant="outline">Connexion</Button>
          <Button onClick={handleSignup} size="lg">S'inscrire</Button>
        </div>

        {/* Admin Navigation Links */}
        <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-xl font-semibold mb-4">Navigation Administrateur</h2>
            <div className="flex justify-center space-x-4">
                <Link to="/AdminClients">
                    <Button variant="link">Gérer les Clients</Button>
                </Link>
                <Link to="/AdminProjects">
                    <Button variant="link">Gérer les Projets</Button>
                </Link>
                {/* TODO: Add other admin links here */}
            </div>
        </div>

      </main>
      <footer className="text-muted-foreground text-sm mt-auto py-4">
        © {new Date().getFullYear()} The Event. Tous droits réservés.
      </footer>
    </div>
  );
}
