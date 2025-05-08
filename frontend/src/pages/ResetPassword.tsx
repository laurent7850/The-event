import React, { useState } from 'react';
import { supabase } from 'utils/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from 'utils/AuthContext'; // To potentially redirect after success

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user info for redirection logic

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
        toast.error("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    setLoading(true);
    toast.info("Mise à jour du mot de passe...");

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: password });

      if (updateError) {
        throw updateError;
      }

      toast.success("Mot de passe mis à jour avec succès ! Vous allez être redirigé.");
      console.log("Password updated successfully for user:", user?.id);

      // Determine redirection target based on user role (if available)
      // Small delay for toast visibility
      setTimeout(() => {
          if (user?.role === 'admin') {
            navigate('/admin-validation-prestations'); // Or other admin default
          } else {
            navigate('/dashboard-collaborateur'); // Default collab dashboard
          }
      }, 1500);

    } catch (err: any) {
      console.error("Error updating password:", err);
      const message = err.message || "Erreur lors de la mise à jour du mot de passe.";
      setError(message);
      toast.error(`Erreur: ${message}`);
      setLoading(false);
    }
    // No finally setLoading(false) here because we navigate away on success
  };

  // If somehow the user lands here without being logged in (shouldn't happen in recovery flow)
  // Or if auth is still loading
  // We might want to redirect or show a specific message, but for now, we assume
  // AuthContext redirected them here correctly, meaning a session exists.

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
          <CardDescription>
            Saisissez votre nouveau mot de passe ci-dessous.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordReset}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
