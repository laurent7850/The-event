import React, { useState, useEffect } from "react";
import { supabase, getUserProfile } from "utils/supabase";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  // TableCaption, // Not using caption for now
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogTrigger, // Trigger manually
} from "@/components/ui/dialog";
// Need form components for the modal
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

// Assume profile includes a 'role' field
interface Profile {
  id: string;
  role?: string; // Assuming role is stored in the profile
  statut_validation?: string; // Also check if admin account itself is validated if necessary
}

// Define types for joined data
interface PrestationPending {
  id: string;
  date_prestation: string;
  heure_debut: string;
  heure_fin: string;
  heures_calculees: number;
  adresse: string;
  statut_validation: string;
  profiles: { // Joined data from profiles table
    nom: string;
    prenom: string;
    email?: string; // Optional email
  } | null;
  clients: { // Joined data from clients table
    nom: string;
    tarif_horaire?: number; // Needed for validation later
  } | null;
  projects: { // Joined data from projects table
    nom: string;
  } | null;
  // Add raw client_id, project_id if needed for actions
  client_id: string;
  project_id: string | null;
  user_id: string;
}

// For client and project selection in the modification form
interface Client {
  id: string;
  nom: string;
}

interface Project {
  id: string;
  nom: string;
  client_id: string;
}

export default function DashboardAdminPrestations() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrestations, setPendingPrestations] = useState<PrestationPending[]>([]);
  const [isLoadingPrestations, setIsLoadingPrestations] = useState(false);
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set()); // Track validating rows
  const [editingPrestation, setEditingPrestation] = useState<PrestationPending | null>(null); // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

  // Form state for modification modal
  const [modifiedDate, setModifiedDate] = useState<Date | undefined>(undefined);
  const [modifiedHeureDebut, setModifiedHeureDebut] = useState("");
  const [modifiedHeureFin, setModifiedHeureFin] = useState("");
  const [modifiedClientId, setModifiedClientId] = useState<string | undefined>(undefined);
  const [modifiedProjectId, setModifiedProjectId] = useState<string | undefined | null>(undefined); // Can be null
  const [modifiedAdresse, setModifiedAdresse] = useState("");
  const [heuresCalculeesDisplay, setHeuresCalculeesDisplay] = useState<string>("0.00");

  // Data for dropdowns
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]); // Filtered by selected client
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false); // Loading state for save button
  const [isSavingAndValidating, setIsSavingAndValidating] = useState(false); // Loading state for save & validate button

  // Effect for Authentication and Role Check
  useEffect(() => {
    const checkAuthAndRole = async () => {
      // ... (rest of the auth check logic remains the same)
      setIsLoading(true);
      setError(null);
      setIsAdmin(false);

      const session = await getUserSession();
      if (!session) {
        navigate("/connexion");
        return;
      }
      try {
        const profile = await getUserProfile(session.user.id);
        if (profile && profile.role === 'admin') {
          setIsAdmin(true);
        } else if (!profile) {
          setError("Profil utilisateur introuvable ou incomplet. Contactez le support.");
        } else {
          // Not an admin
        }
      } catch (err: any) {
        console.error("Error checking admin role:", err);
        setError("Une erreur est survenue lors de la vérification de vos permissions.");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndRole();
  }, [navigate]);

  // Effect for Fetching Pending Prestations (runs when isAdmin becomes true)
  useEffect(() => {
    if (!isAdmin) {
      setPendingPrestations([]);
      return; // Don't fetch if not admin
    }

    const fetchPendingPrestations = async () => {
      setIsLoadingPrestations(true);
      try {
        const { data, error } = await supabase
          .from('prestations')
          .select(`
            id, date_prestation, heure_debut, heure_fin, heures_calculees,
            adresse, statut_validation, user_id, client_id, project_id,
            profiles!inner(nom, prenom, email),
            clients!inner(nom, tarif_horaire),
            projects(nom)
          `)
          .eq('statut_validation', 'en_attente')
          .order('date_prestation', { ascending: true });

        if (error) throw error;
        setPendingPrestations((data as PrestationPending[]) || []);
      } catch (error: any) {
        console.error("Error fetching pending prestations:", error);
        toast.error(`Erreur lors de la récupération des prestations: ${error.message}`);
        setPendingPrestations([]);
      } finally {
        setIsLoadingPrestations(false);
      }
    };

    fetchPendingPrestations();
  }, [isAdmin]); // Dependency on isAdmin

  // Function to refetch prestations (used after save/validation)
  const fetchPendingPrestations = async () => {
    if (!isAdmin) return; // Safety check
    setIsLoadingPrestations(true);
    try {
      const { data, error } = await supabase
        .from('prestations')
        .select(`
          id, date_prestation, heure_debut, heure_fin, heures_calculees,
          adresse, statut_validation, user_id, client_id, project_id,
          profiles!inner(nom, prenom, email),
          clients!inner(nom, tarif_horaire),
          projects(nom)
        `)
        .eq('statut_validation', 'en_attente')
        .order('date_prestation', { ascending: true });

      if (error) throw error;
      setPendingPrestations((data as PrestationPending[]) || []);
    } catch (error: any) {
      console.error("Error refetching pending prestations:", error);
      toast.error(`Erreur rechargement prestations: ${error.message}`);
      setPendingPrestations([]);
    } finally {
      setIsLoadingPrestations(false);
    }
  };

  // Initial fetch effect (now calls the reusable function)
  useEffect(() => {
    if (isAdmin) {
      fetchPendingPrestations();
    }
  }, [isAdmin]);

  // Effect to fetch clients list once
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, nom')
          .order('nom');
        if (error) throw error;
        setClientsList(data || []);
      } catch (error: any) {
        toast.error(`Erreur chargement clients: ${error.message}`);
        setClientsList([]);
      } finally {
        setIsLoadingClients(false);
      }
    };
    fetchClients();
  }, []); // Run only once

  // Effect to fetch projects when selected client changes in modal
  useEffect(() => {
    if (!modifiedClientId) {
      setProjectsList([]);
      setModifiedProjectId(undefined); // Reset project if client changes
      return;
    }

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, nom, client_id')
          .eq('client_id', modifiedClientId)
          .order('nom');
        if (error) throw error;
        setProjectsList(data || []);
        // Check if the previously selected project is still valid for the new client
        if (modifiedProjectId && !data?.some(p => p.id === modifiedProjectId)) {
          setModifiedProjectId(undefined); // Reset if old project not in new list
        }
      } catch (error: any) {
        toast.error(`Erreur chargement projets: ${error.message}`);
        setProjectsList([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [modifiedClientId]); // Run when modifiedClientId changes

  // Effect to pre-fill form when modal opens
  useEffect(() => {
    if (editingPrestation) {
      setModifiedDate(new Date(editingPrestation.date_prestation));
      setModifiedHeureDebut(editingPrestation.heure_debut);
      setModifiedHeureFin(editingPrestation.heure_fin);
      setModifiedClientId(editingPrestation.client_id);
      setModifiedProjectId(editingPrestation.project_id);
      setModifiedAdresse(editingPrestation.adresse);
      setHeuresCalculeesDisplay(editingPrestation.heures_calculees.toFixed(2)); // Also prefill calculated hours display
    } else {
      // Reset form state if modal is closed without saving or no prestation is loaded
      setModifiedDate(undefined);
      setModifiedHeureDebut("");
      setModifiedHeureFin("");
      setModifiedClientId(undefined);
      setModifiedProjectId(undefined);
      setModifiedAdresse("");
      setHeuresCalculeesDisplay("0.00");
    }
  }, [editingPrestation]); // Run when editingPrestation changes

  // Effect to recalculate hours when times change
  useEffect(() => {
    // Simple time parsing (HH:MM format assumed)
    const parseTime = (timeStr: string): number | null => {
      if (!timeStr || !timeStr.includes(':')) return null;
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours + minutes / 60;
    };

    const start = parseTime(modifiedHeureDebut);
    const end = parseTime(modifiedHeureFin);

    if (start !== null && end !== null && end > start) {
      const duration = end - start;
      setHeuresCalculeesDisplay(duration.toFixed(2));
    } else {
      setHeuresCalculeesDisplay("0.00"); // Or indicate error/invalid input
    }
  }, [modifiedHeureDebut, modifiedHeureFin]);

  // Function to handle validation
  const handleValidate = async (prestationId: string, clientId: string) => {
    setValidatingIds(prev => new Set(prev).add(prestationId));
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('tarif_horaire')
        .eq('id', clientId)
        .single();

      if (clientError) throw new Error(`Erreur client: ${clientError.message}`);
      if (!clientData || clientData.tarif_horaire === null || clientData.tarif_horaire === undefined) {
        throw new Error(`Tarif horaire non défini pour le client ID: ${clientId}`);
      }
      const tarifHoraireUtilise = clientData.tarif_horaire;

      const { error: updateError } = await supabase
        .from('prestations')
        .update({
          statut_validation: 'valide',
          tarif_horaire_utilise: tarifHoraireUtilise,
        })
        .eq('id', prestationId);

      if (updateError) throw new Error(`Erreur validation: ${updateError.message}`);

      setPendingPrestations(prev => prev.filter(p => p.id !== prestationId));
      toast.success(`Prestation ${prestationId.substring(0, 6)}... validée.`);
    } catch (error: any) {
      console.error("Validation error:", error);
      toast.error(`Échec validation: ${error.message}`);
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(prestationId);
        return next;
      });
    }
  };

  // --- Modification Modal Logic ---
  const handleOpenModifyModal = (prestation: PrestationPending) => {
    setEditingPrestation(prestation); // Store the prestation to edit
    setIsModalOpen(true); // Open the modal
  };

  const handleCloseModifyModal = () => {
    setIsModalOpen(false);
    setEditingPrestation(null); // Clear the state when closing
  };

  // Placeholder for saving changes
  const handleSaveChanges = async () => {
    if (!editingPrestation) return;
    setIsSavingChanges(true);

    try {
      // Recalculate hours based on final form state
      const parseTime = (timeStr: string): number | null => {
        if (!timeStr || !timeStr.includes(':')) return null;
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + minutes / 60;
      };
      const start = parseTime(modifiedHeureDebut);
      const end = parseTime(modifiedHeureFin);
      let heuresCalculeesFinal = 0;
      if (start !== null && end !== null && end > start) {
        heuresCalculeesFinal = end - start;
      }
      if (heuresCalculeesFinal <= 0) {
          toast.warning("Les heures de début et de fin ne permettent pas de calculer une durée valide.");
          // Keep heuresCalculeesFinal as 0 or handle as needed
      }

      // Prepare update data
      const updateData: Partial<PrestationPending> = {
        date_prestation: modifiedDate ? format(modifiedDate, "yyyy-MM-dd") : undefined, // Format for Supabase
        heure_debut: modifiedHeureDebut,
        heure_fin: modifiedHeureFin,
        heures_calculees: heuresCalculeesFinal,
        client_id: modifiedClientId,
        project_id: modifiedProjectId, // Already handles null
        adresse: modifiedAdresse,
        // DO NOT update statut_validation or tarif_horaire_utilise here
      };

      // Filter out undefined fields if necessary, though Supabase might handle them
      const cleanedUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
          if (value !== undefined) {
              acc[key as keyof typeof updateData] = value;
          }
          return acc;
      }, {} as Partial<PrestationPending>);


       if (!cleanedUpdateData.date_prestation) {
         throw new Error("La date est requise.");
       }
       if (!cleanedUpdateData.client_id) {
         throw new Error("Le client est requis.");
       }
       // Add more validation as needed

      // Perform the update
      const { error } = await supabase
        .from('prestations')
        .update(cleanedUpdateData)
        .eq('id', editingPrestation.id);

      if (error) throw error;

      toast.success("Prestation modifiée avec succès.");
      handleCloseModifyModal(); // Close modal on success
      await fetchPendingPrestations(); // Refetch the list to show updated data

    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Function to handle saving AND validating
  const handleSaveAndValidate = async () => {
    if (!editingPrestation) return;
    setIsSavingAndValidating(true);

    try {
      // 1. Perform Save Logic (similar to handleSaveChanges)
      const parseTime = (timeStr: string): number | null => {
          if (!timeStr || !timeStr.includes(':')) return null;
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          if (isNaN(hours) || isNaN(minutes)) return null;
          return hours + minutes / 60;
      };
      const start = parseTime(modifiedHeureDebut);
      const end = parseTime(modifiedHeureFin);
      let heuresCalculeesFinal = 0;
      if (start !== null && end !== null && end > start) {
          heuresCalculeesFinal = end - start;
      }
      if (heuresCalculeesFinal <= 0) {
          toast.warning("Durée invalide, heures calculées mises à 0.");
      }

      const updateData: Partial<PrestationPending> = {
          date_prestation: modifiedDate ? format(modifiedDate, "yyyy-MM-dd") : undefined,
          heure_debut: modifiedHeureDebut,
          heure_fin: modifiedHeureFin,
          heures_calculees: heuresCalculeesFinal,
          client_id: modifiedClientId,
          project_id: modifiedProjectId,
          adresse: modifiedAdresse,
      };
      const cleanedUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
          if (value !== undefined) { acc[key as keyof typeof updateData] = value; }
          return acc;
      }, {} as Partial<PrestationPending>);

      if (!cleanedUpdateData.date_prestation || !cleanedUpdateData.client_id) {
          throw new Error("Date et Client sont requis pour sauvegarder.");
      }

      const { error: saveError } = await supabase
          .from('prestations')
          .update(cleanedUpdateData)
          .eq('id', editingPrestation.id);
      if (saveError) throw new Error(`Erreur sauvegarde: ${saveError.message}`);
      toast.info("Modifications enregistrées."); // Use info for the first step

      // --- Pre-validation Check: Use potentially updated client ID ---
      const clientIdForValidation = cleanedUpdateData.client_id || editingPrestation.client_id;
      const prestationIdForValidation = editingPrestation.id;

      // 2. Perform Validation Logic (similar to handleValidate)
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('tarif_horaire')
        .eq('id', clientIdForValidation)
        .single();
      if (clientError) throw new Error(`Erreur récupération tarif client: ${clientError.message}`);
      if (clientData?.tarif_horaire === null || clientData?.tarif_horaire === undefined) {
        throw new Error(`Tarif horaire non défini pour le client ID: ${clientIdForValidation}`);
      }
      const tarifHoraireUtilise = clientData.tarif_horaire;

      const { error: validateError } = await supabase
        .from('prestations')
        .update({
          statut_validation: 'valide',
          tarif_horaire_utilise: tarifHoraireUtilise,
        })
        .eq('id', prestationIdForValidation); // Use the original prestation ID
      if (validateError) throw new Error(`Erreur validation: ${validateError.message}`);

      toast.success("Prestation modifiée et validée avec succès!");
      handleCloseModifyModal();
      await fetchPendingPrestations(); // Refresh list

    } catch (error: any) {
      console.error("Error during Save & Validate:", error);
      toast.error(`Échec Sauvegarde & Validation: ${error.message}`);
      // Optionally refetch even on error if partial success might have occurred
      await fetchPendingPrestations(); // Refetch to ensure UI consistency after potential partial save
    } finally {
      setIsSavingAndValidating(false);
    }
  };

  // --- End Modification Modal Logic ---

  // Loading State
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not Admin State
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Accès Refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            Cette section est réservée aux administrateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Admin View - Page Content
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Tableau de Bord Admin - Validation Prestations</h1>

      <Card>
        <CardHeader>
          <CardTitle>Prestations en attente de validation</CardTitle>
          <CardDescription>
            Examinez et validez les prestations soumises par les collaborateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPrestations ? (
             <div className="space-y-2">
               <Skeleton className="h-8 w-full" />
               <Skeleton className="h-8 w-full" />
               <Skeleton className="h-8 w-full" />
             </div>
          ) : pendingPrestations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune prestation en attente de validation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Heures</TableHead>
                  {/* <TableHead>Adresse</TableHead> Removed for brevity, can be added back */}
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPrestations.map((p) => {
                  const isRowValidating = validatingIds.has(p.id);
                  return (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.date_prestation), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{p.profiles?.prenom} {p.profiles?.nom}</TableCell>
                    <TableCell>{p.clients?.nom}</TableCell>
                    <TableCell>{p.projects?.nom || "-"}</TableCell>
                    <TableCell>{p.heure_debut}</TableCell>
                    <TableCell>{p.heure_fin}</TableCell>
                    <TableCell className="text-right">{p.heures_calculees.toFixed(2)}</TableCell>
                    {/* <TableCell>{p.adresse}</TableCell> */}
                    <TableCell>
                       <Badge variant={'secondary'}> {/* Always secondary for 'en_attente' */}
                         En attente
                       </Badge>
                    </TableCell>
                     <TableCell className="text-right space-x-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleOpenModifyModal(p)} // Open modal on click
                         disabled={isRowValidating}
                       >
                         Modifier
                       </Button>
                       <Button
                         variant="default"
                         size="sm"
                         onClick={() => handleValidate(p.id, p.client_id)} // Pass necessary IDs
                         disabled={isRowValidating} // Disable if validating
                       >
                         {isRowValidating ? "Validation..." : "Valider"}
                       </Button>
                     </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- Modification Dialog --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier la Prestation</DialogTitle>
            {editingPrestation && (
              <DialogDescription>
                Pour: {editingPrestation.profiles?.prenom} {editingPrestation.profiles?.nom} <br/>
                Date: {format(new Date(editingPrestation.date_prestation), "dd/MM/yyyy")}
              </DialogDescription>
            )}
          </DialogHeader>

          {editingPrestation && (
            <div className="grid gap-4 py-4">
              {/* Placeholder for the form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date-modif">Date</Label>
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button
                         variant={"outline"}
                         className={cn(
                           "w-full justify-start text-left font-normal",
                           !modifiedDate && "text-muted-foreground"
                         )}
                       >
                         <CalendarIcon className="mr-2 h-4 w-4" />
                         {modifiedDate ? format(modifiedDate, "dd/MM/yyyy") : <span>Choisir une date</span>}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0">
                       <Calendar
                         mode="single"
                         selected={modifiedDate}
                         onSelect={setModifiedDate}
                         initialFocus
                       />
                     </PopoverContent>
                   </Popover>
                </div>

                 {/* Heures & Calcul */}
                 <div className="grid grid-cols-3 gap-2 items-end">
                   <div className="space-y-2">
                     <Label htmlFor="heure_debut-modif">Début</Label>
                     <Input
                       id="heure_debut-modif"
                       type="time"
                       value={modifiedHeureDebut}
                       onChange={(e) => setModifiedHeureDebut(e.target.value)}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="heure_fin-modif">Fin</Label>
                     <Input
                       id="heure_fin-modif"
                       type="time"
                       value={modifiedHeureFin}
                       onChange={(e) => setModifiedHeureFin(e.target.value)}
                     />
                   </div>
                    <div className="space-y-2">
                      <Label>Heures</Label>
                      <Input value={heuresCalculeesDisplay} readOnly disabled className="text-center font-medium"/>
                    </div>
                 </div>

                 {/* Client */}
                 <div className="space-y-2">
                   <Label htmlFor="client-modif">Client</Label>
                   <Select value={modifiedClientId} onValueChange={setModifiedClientId} disabled={isLoadingClients}>
                     <SelectTrigger id="client-modif">
                       <SelectValue placeholder={isLoadingClients ? "Chargement..." : "Choisir un client"} />
                     </SelectTrigger>
                     <SelectContent>
                       {clientsList.map((client) => (
                         <SelectItem key={client.id} value={client.id}>{client.nom}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Projet */}
                 <div className="space-y-2">
                   <Label htmlFor="project-modif">Projet</Label>
                   <Select
                      value={modifiedProjectId || ""} // Use empty string for placeholder if null/undefined
                      onValueChange={(value) => setModifiedProjectId(value === "" ? null : value)} // Set to null if placeholder selected
                      disabled={isLoadingProjects || !modifiedClientId} // Disable if no client or loading
                    >
                     <SelectTrigger id="project-modif">
                       <SelectValue placeholder={isLoadingProjects ? "Chargement..." : (modifiedClientId ? "Choisir un projet (optionnel)" : "Choisir client d'abord")} />
                     </SelectTrigger>
                     <SelectContent>
                       {/* Optional: Add an item for "No Project" */}
                       {/* <SelectItem value="">Aucun projet</SelectItem> */}
                       {projectsList.map((project) => (
                         <SelectItem key={project.id} value={project.id}>{project.nom}</SelectItem>
                       ))}
                       {projectsList.length === 0 && modifiedClientId && !isLoadingProjects && (
                         <div className="text-sm text-muted-foreground px-2 py-1.5">Aucun projet pour ce client.</div>
                       )}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Adresse */}
                 <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="adresse-modif">Adresse</Label>
                    <Textarea
                       id="adresse-modif"
                       value={modifiedAdresse}
                       onChange={(e) => setModifiedAdresse(e.target.value)}
                       placeholder="Adresse complète de la prestation"
                     />
                 </div>

              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModifyModal} disabled={isSavingChanges || isSavingAndValidating}>Annuler</Button>
            {/* Submit will eventually trigger handleSaveChanges, likely via a form handler */}
            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={isLoadingClients || isLoadingProjects || isSavingChanges || isSavingAndValidating}
            >
              {isSavingChanges ? "Sauvegarde..." : "Enregistrer Modifications"}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndValidate}
              disabled={isLoadingClients || isLoadingProjects || isSavingChanges || isSavingAndValidating}
              variant="default" // Make it the primary action
            >
              {isSavingAndValidating ? "Validation..." : "Sauvegarder et Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- End Modification Dialog --- */}

    </div>
  );
}
