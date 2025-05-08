import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from 'utils/supabase';
import { useAuth } from 'utils/AuthContext'; // Import useAuth hook
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, LogOut } from "lucide-react";
import { format } from "date-fns";
import { fr } from 'date-fns/locale'; // Import French locale
import { cn } from "@/lib/utils";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Zod Schema for validation
const prestationSchema = z.object({
  date_prestation: z.date({ required_error: "La date est obligatoire." }),
  heure_debut: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM invalide."),
  heure_fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM invalide."),
  client_id: z.string().min(1, "Client obligatoire."), // Changed to string as Select uses string values
  project_id: z.string().min(1, "Projet obligatoire."), // Changed to string as Select uses string values
  adresse: z.string().min(1, "L'adresse est obligatoire."),
}).refine(data => {
  // Custom validation: Ensure end time is after start time (can cross midnight)
  const [startHour, startMinute] = data.heure_debut.split(':').map(Number);
  const [endHour, endMinute] = data.heure_fin.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  let endTime = endHour * 60 + endMinute;
  // If end time is earlier than start time, assume it crosses midnight
  if (endTime <= startTime) {
    endTime += 24 * 60; // Add 24 hours in minutes
  }
  return endTime > startTime;
}, {
  message: "L'heure de fin doit être postérieure à l'heure de début.",
  path: ["heure_fin"], // Apply error to the end time field
});

// Infer the type from the schema
type PrestationFormData = z.infer<typeof prestationSchema>;
import { APP_BASE_PATH } from 'app';

// Define the structure for clients and projects
interface Client {
  id: number;
  nom: string;
}

interface Project {
  id: number;
  nom: string;
  client_id: number;
}



export default function DashboardCollaborateur() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth(); // Get auth context
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

    // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PrestationFormData>({
    resolver: zodResolver(prestationSchema),
    defaultValues: {
      date_prestation: new Date(),
      heure_debut: "",
      heure_fin: "",
      client_id: "",
      project_id: "",
      adresse: "",
    },
  });

  // Watch the selected client ID to filter projects
  const selectedClientId = watch("client_id");

  // --- Fetch Clients (Only if user is validated) ---
  useEffect(() => {
    if (user?.statut_validation === 'valide') {
      console.log("[DashboardCollaborateur] User is validated, fetching clients...");
      const fetchClients = async () => {
        const { data, error } = await supabase.from('clients').select('id, nom').order('nom', { ascending: true });
        if (error) {
          console.error("[DashboardCollaborateur] Error fetching clients:", error);
          toast.error("Erreur lors du chargement des clients.");
        } else {
          console.log("[DashboardCollaborateur] Clients fetched successfully, count:", data?.length);
          setClients(data || []);
        }
      };
      fetchClients();
    }
  }, [user]); // Depend on user object from context

  // --- Fetch Projects (Only if user is validated) ---
  useEffect(() => {
    if (user?.statut_validation === 'valide') {
      console.log("[DashboardCollaborateur] User is validated, fetching projects...");
      const fetchProjects = async () => {
        const { data, error } = await supabase.from('projects').select('id, nom, client_id').order('nom', { ascending: true });
        if (error) {
          console.error("[DashboardCollaborateur] Error fetching projects:", error);
          toast.error("Erreur lors du chargement des projets.");
        } else {
          console.log("[DashboardCollaborateur] Projects fetched successfully, count:", data?.length);
          setProjects(data || []);
        }
      };
      fetchProjects();
    }
  }, [user]); // Depend on user object from context

  // --- Filter Projects Based on Selected Client ---
  useEffect(() => {
    if (selectedClientId) {
      console.log(`[DashboardCollaborateur] Filtering projects for client ID: ${selectedClientId}`);
      setFilteredProjects(projects.filter(p => p.client_id === Number(selectedClientId)));
      // setValue('project_id', ''); // Reset project selection
    } else {
      setFilteredProjects([]);
      // setValue('project_id', '' as any); // For react-hook-form
    }
    }, [selectedClientId, projects, setValue]); // Added setValue dependency

  // --- Handle Logout ---
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(); // Use signOut from AuthContext
      toast.success("Déconnexion réussie.");
      // Navigation handled in signOut
    } catch (error: any) {
      console.error("Error logging out via context:", error);
      toast.error(`Erreur lors de la déconnexion: ${error.message}`);
      navigate(`${APP_BASE_PATH}/connexion`, { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // --- Handle Form Submission ---
    const onSubmit: SubmitHandler<PrestationFormData> = async (data) => {
    setIsSubmitting(true);
    if (!user || user.statut_validation !== 'valide') {
        toast.error("Action non autorisée. Utilisateur non identifié ou non validé.");
        setIsSubmitting(false);
        return;
    }

    // Calculate hours
    const [startHour, startMinute] = data.heure_debut.split(':').map(Number);
    const [endHour, endMinute] = data.heure_fin.split(':').map(Number);
    const startDate = new Date(data.date_prestation);
    startDate.setHours(startHour, startMinute, 0, 0);
    const endDate = new Date(data.date_prestation);
    endDate.setHours(endHour, endMinute, 0, 0);

    if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const heures_calculees = durationMs / (1000 * 60 * 60);

    const prestationData = {
      user_id: user.id, // Use ID from context
      client_id: data.client_id,
      project_id: data.project_id,
      date_prestation: format(data.date_prestation, 'yyyy-MM-dd'),
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin,
      heures_calculees: Number(heures_calculees.toFixed(2)),
      adresse: data.adresse,
      statut_validation: 'en_attente_validation'
    };

    console.log("Submitting Prestation:", prestationData);

    try {
      const { error } = await supabase.from('prestations').insert([prestationData]);
      if (error) throw error;
      toast.success("Prestation enregistrée avec succès ! En attente de validation.");
      reset();
    } catch (error: any) {
      console.error("Error inserting prestation:", error);
      toast.error(`Erreur lors de l'enregistrement: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If authLoading is true, let AuthContext handle loading screen
  if (authLoading) return null;

  // Validated User Dashboard - if we get here, user is authenticated and validated
  console.log(`[DashboardCollaborateur] Rendering dashboard for user: ${user?.email}`);
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Dashboard Collaborateur</CardTitle>
          <Button variant="outline" size="icon" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Bonjour {user?.email || 'Collaborateur'}! Enregistrez vos nouvelles prestations ici.
          </p>

          {/* Formulaire d'encodage */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Prestation */}
            <div className="grid gap-2">
              <Label htmlFor="date_prestation">Date de la prestation</Label>
              <Controller
                name="date_prestation"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date_prestation && <p className="text-sm text-red-500">{errors.date_prestation.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Heure Debut */}
              <div className="grid gap-2">
                <Label htmlFor="heure_debut">Heure de début</Label>
                <Input
                  id="heure_debut"
                  type="time"
                  {...register("heure_debut")}
                  className={errors.heure_debut ? "border-red-500" : ""}
                />
                {errors.heure_debut && <p className="text-sm text-red-500">{errors.heure_debut.message}</p>}
              </div>

              {/* Heure Fin */}
              <div className="grid gap-2">
                <Label htmlFor="heure_fin">Heure de fin</Label>
                <Input
                  id="heure_fin"
                  type="time"
                  {...register("heure_fin")}
                  className={errors.heure_fin ? "border-red-500" : ""}
                />
                {errors.heure_fin && <p className="text-sm text-red-500">{errors.heure_fin.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Client Dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="client_id">Client</Label>
                <Controller
                  name="client_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.client_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Sélectionnez un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.client_id && <p className="text-sm text-red-500">{errors.client_id.message}</p>}
              </div>

              {/* Project Dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="project_id">Projet</Label>
                <Controller
                  name="project_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClientId || filteredProjects.length === 0}>
                      <SelectTrigger className={errors.project_id ? "border-red-500" : ""}>
                        <SelectValue placeholder={!selectedClientId ? "Sélectionnez d'abord un client" : "Sélectionnez un projet"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProjects.map((project) => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.project_id && <p className="text-sm text-red-500">{errors.project_id.message}</p>}
              </div>
            </div>

            {/* Adresse */}
            <div className="grid gap-2">
              <Label htmlFor="adresse">Adresse de la prestation</Label>
              <Textarea
                id="adresse"
                placeholder="Entrez l'adresse complète..."
                {...register("adresse")}
                className={errors.adresse ? "border-red-500" : ""}
              />
              {errors.adresse && <p className="text-sm text-red-500">{errors.adresse.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Enregistrement..." : "Enregistrer la prestation"}
            </Button>
          </form>

          {/* <p className="mt-4 text-center text-muted-foreground">Le formulaire d'encodage est temporairement désactivé.</p> */}
        </CardContent>
      </Card>
    </div>
  );
}