import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from 'utils/supabase'; // Assuming supabase client setup exists
import brain from 'brain';
import { GenerateInvoicesResponse, GeneratedInvoiceInfo } from 'types'; // Ensure these types match backend
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Profile {
  id: string;
  role?: string;
}

export default function AdminInvoicing() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // Default to current month
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Default to current year
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoiceInfo[]>([]);

  // --- Admin Role Check ---
  useEffect(() => {
    const checkAdminRole = async () => {
      setAuthChecked(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Accès refusé. Veuillez vous connecter.");
          navigate('/connexion');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // PGRST116 means no row was found, which is not an error in this context if the user exists in auth
        if (profileError && profileError.code !== 'PGRST116') {
           console.error("Error fetching profile:", profileError);
           toast.error(`Erreur de profil: ${profileError.message}`);
           // Navigate home, as they might be logged in but profile is broken
           navigate('/');
           return;
        }

        if (profile && profile.role === 'admin') {
          setIsAdmin(true);
        } else {
          // No profile found or not admin role
          toast.error("Accès refusé. Vous n'avez pas les droits administrateur.");
          navigate('/');
        }
      } catch (err: any) {
        console.error("Error checking admin role:", err);
        toast.error(`Erreur d'authentification: ${err.message}`);
        // Navigate home on any unexpected error during auth check
        navigate('/');
      } finally {
         setAuthChecked(true);
      }
    };
    checkAdminRole();
  }, [navigate]);

  const handleGenerateInvoices = async () => {
    setIsLoadingGeneration(true);
    setError(null);
    setGeneratedInvoices([]); // Clear previous results
    toast.info(`Lancement de la génération des factures pour ${selectedMonth}/${selectedYear}...`);

    try {
      const response = await brain.generate_monthly_invoices({ month: selectedMonth, year: selectedYear });
      // Explicitly type the expected data structure
      const data: GenerateInvoicesResponse = await response.json();

      if (response.ok) {
        const invoices = data.generated_invoices || [];
        setGeneratedInvoices(invoices);
        if (invoices.length > 0) {
            toast.success(data.message || `${invoices.length} facture(s) générée(s) avec succès !`);
        } else {
            // If message exists, show it as info, otherwise default message
            toast.info(data.message || "Aucune nouvelle facture à générer pour cette période.");
        }
      } else {
        // Attempt to parse API error detail, fallback to status text
        const errorDetail = data.detail || `Erreur ${response.status}: ${response.statusText}`;
        throw new Error(errorDetail);
      }
    } catch (err: any) {
      console.error("Erreur lors de la génération des factures:", err);
      const message = err.message || "Une erreur inconnue est survenue.";
      setError(message); // Set error state to display inline
      toast.error(`Erreur de génération: ${message}`);
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  // --- Render Logic ---
  if (!authChecked) {
    return <div className="container mx-auto p-8 text-center">Vérification des droits...</div>;
  }

  if (!isAdmin) {
    // This state should ideally not be reached due to navigation in useEffect,
    // but serves as a fallback UI safeguard.
    return <div className="container mx-auto p-8 text-center text-red-500">Accès refusé. Redirection...</div>;
  }

  // --- Admin Content ---
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Générer les Factures Mensuelles</CardTitle>
          <CardDescription>
            Sélectionnez le mois et l'année pour générer les factures PDF pour tous les clients ayant des prestations validées durant cette période.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
             {/* Month Selector */}
            <div className="flex-1 space-y-2">
                <Label htmlFor="month-select">Mois</Label>
                <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value, 10))}
                >
                    <SelectTrigger id="month-select">
                        <SelectValue placeholder="Sélectionnez un mois" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <SelectItem key={month} value={month.toString()}>
                                {new Date(0, month - 1).toLocaleString('fr-FR', { month: 'long' })} ({month})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {/* Year Selector */}
            <div className="flex-1 space-y-2">
                <Label htmlFor="year-select">Année</Label>
                <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
                >
                    <SelectTrigger id="year-select">
                        <SelectValue placeholder="Sélectionnez une année" />
                    </SelectTrigger>
                    <SelectContent>
                        {[...Array(5)].map((_, index) => {
                            const year = new Date().getFullYear() - 2 + index; // Current year +/- 2 years
                            return (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>
          </div>

          {error && <p className="text-red-500 p-4 bg-red-100 border border-red-400 rounded">Erreur: {error}</p>}

          <div>
            <h3 className="text-lg font-medium mb-2">Factures Générées</h3>
            <div className="border rounded-md">
                {generatedInvoices.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        Aucune facture générée pour la période sélectionnée ou l'opération n'a pas encore été lancée.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead className="text-right">Montant Total</TableHead>
                                <TableHead className="text-center">Lien PDF</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {generatedInvoices.map((invoice) => (
                                <TableRow key={invoice.invoice_id}> {/* Use invoice_id from the type */}
                                    <TableCell>{invoice.client_name}</TableCell>
                                    <TableCell className="text-right">
                                        {invoice.montant_total.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {invoice.lien_pdf ? (
                                            <a
                                                href={invoice.lien_pdf}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                Voir PDF
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">Non généré</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleGenerateInvoices} disabled={isLoadingGeneration} size="lg">
            {isLoadingGeneration ? 'Génération en cours...' : `Générer Factures pour ${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}/${selectedYear}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
