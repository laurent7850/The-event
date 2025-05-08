
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from 'date-fns/locale'; // Import French locale for date formatting
import { toast } from "sonner";
import brain from "brain";
import { useAuth } from "utils/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "utils/cn"; // Assuming cn utility exists

// Define the schema for form validation using Zod
const prestationSchema = z.object({
  date_prestation: z.date({
    required_error: "La date de la prestation est requise.",
  }),
  heure_debut: z.string({ required_error: "L'heure de début est requise." }),
  heure_fin: z.string({ required_error: "L'heure de fin est requise." }),
  client_id: z.string({ required_error: "Le client est requis." }),
  project_id: z.string({ required_error: "Le projet est requis." }),
  adresse: z.string().min(1, "L'adresse est requise."),
});

// Define the type for the form data based on the schema
type PrestationFormData = z.infer<typeof prestationSchema>;

// Helper to generate time options
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};

export default function EncoderPrestation() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const timeOptions = generateTimeOptions();

  const form = useForm<PrestationFormData>({
    resolver: zodResolver(prestationSchema),
    defaultValues: {
      adresse: "",
      // Initialize other fields potentially?
    },
  });

  const selectedClientId = form.watch("client_id");

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const response = await brain.list_clients_for_select();
        if (response.ok) {
          const data = await response.json();
          // Assuming the API returns an array of objects like { id: string, nom: string }
          setClients(data.map((client: { id: string; nom: string }) => ({
            value: client.id,
            label: client.nom,
          })));
        } else {
          toast.error("Erreur lors du chargement des clients.");
        }
      } catch (error) {
        console.error("Failed to fetch clients:", error);
        toast.error("Erreur lors du chargement des clients.");
      } finally {
        setIsLoadingClients(false);
      }
    };

    if (user && user.statut_validation === 'valide') { // Only fetch if user is validated
        fetchClients();
    }
  }, [user]); // Depend on user object

  // Fetch projects when client changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedClientId) {
        setProjects([]); // Clear projects if no client is selected
        form.resetField("project_id"); // Reset project field value
        return;
      }
      setIsLoadingProjects(true);
      try {
        // Assuming list_projects_for_select takes client_id as query param
        const response = await brain.list_projects_for_select({ client_id: selectedClientId });
        if (response.ok) {
          const data = await response.json();
          // Assuming the API returns an array of objects like { id: string, nom: string }
          setProjects(data.map((project: { id: string; nom: string }) => ({
            value: project.id,
            label: project.nom,
          })));
        } else {
          toast.error("Erreur lors du chargement des projets pour ce client.");
          setProjects([]);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        toast.error("Erreur lors du chargement des projets.");
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedClientId, form]); // Depend on selected client ID

  // Redirect logic based on auth state
  useEffect(() => {
      if (!authLoading) {
          if (!user) {
              navigate('/Connexion');
          } else if (user.statut_validation !== 'valide') {
              navigate('/EnAttenteValidation');
          }
      }
  }, [user, authLoading, navigate]);


  const onSubmit = async (data: PrestationFormData) => {
    console.log("Form data submitted:", data);

    // Format data for the API
    const apiData = {
        ...data,
        date_prestation: format(data.date_prestation, 'yyyy-MM-dd'), // Format date as YYYY-MM-DD string

    };


    // Use toast.promise for async operation feedback
    const promise = brain.create_prestation(apiData);

    toast.promise(promise, {
        loading: 'Enregistrement de la prestation...',
        success: (response) => {
             // Assuming the API returns a success message or relevant data
            // const result = await response.json(); // Process if needed
            form.reset(); // Reset form on success
            // Optionally refetch prestations list if displaying elsewhere
            return `Prestation enregistrée avec succès!`;
        },
        error: (err) => {
            // Attempt to parse error detail from response if possible
            let errorMsg = "Erreur lors de l'enregistrement.";
             if (err && typeof err.json === 'function') {
                 try {
                    // If the error object has a json method (like a Response)
                    // This might not always be the case, depends on how brain client throws errors
                    err.json().then((body: any) => {
                       if (body && body.detail) {
                           errorMsg = `Erreur: ${body.detail}`;
                       }
                    }).catch(() => {}); // Ignore parsing error
                 } catch(e) { /* Ignore */ }
             } else if (err instanceof Error) {
                 errorMsg = err.message;
             }
            console.error("Prestation creation failed:", err);
            return errorMsg;
        },
    });
  };


  // Render loading state or redirect based on auth
  if (authLoading || !user || user.statut_validation !== 'valide') {
      return (
          <div className="flex h-screen items-center justify-center">
              <p>Chargement ou redirection...</p>
          </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Encoder une Nouvelle Prestation</CardTitle>
          <CardDescription>
            Remplissez les détails de votre prestation.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Date Prestation */}
              <FormField
                control={form.control}
                name="date_prestation"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de la prestation</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr }) // Use French locale
                            ) : (
                              <span>Choisissez une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Heure Debut & Fin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="heure_debut"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Heure de début</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="HH:MM" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeOptions.map(time => (
                                        <SelectItem key={`start-${time}`} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="heure_fin"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Heure de fin</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="HH:MM" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeOptions.map(time => (
                                        <SelectItem key={`end-${time}`} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
              </div>


              {/* Client */}
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingClients}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingClients ? "Chargement..." : "Sélectionnez un client"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.value} value={client.value}>
                            {client.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project */}
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value} // Ensure value is controlled
                        disabled={!selectedClientId || isLoadingProjects || projects.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                              !selectedClientId
                                ? "Sélectionnez d'abord un client"
                                : isLoadingProjects
                                ? "Chargement des projets..."
                                : projects.length === 0
                                ? "Aucun projet pour ce client"
                                : "Sélectionnez un projet"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.value} value={project.value}>
                            {project.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adresse */}
              <FormField
                control={form.control}
                name="adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de la prestation</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Entrez l'adresse complète..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer la Prestation"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
