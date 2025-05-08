// ui/src/components/ModifyPrestationForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import brain from 'brain';
import { format } from 'date-fns'; // For formatting default date value

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PrestationDetails, ClientSelectItem, ProjectForSelect, PrestationUpdate } from 'types'; // Use correct generated type for payload // Assuming these types exist/are correct in types.ts

// Define Props
interface ModifyPrestationFormProps {
  prestation: PrestationDetails;
  onClose: () => void;
  onSaved: () => void; // To trigger refresh in parent
}

// Define Zod schema for validation
// Ensure this matches the structure and types expected by the PrestationUpdatePayload in the API
const prestationFormSchema = z.object({
  date_prestation: z.string().min(1, "La date est requise."), // YYYY-MM-DD string format
  heure_debut: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis"),
  heure_fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis"),
  client_id: z.string().min(1, "Le client est requis."), // Sending as string from Select
  project_id: z.string().min(1, "Le projet est requis."), // Sending as string from Select
  adresse: z.string().min(1, "L'adresse est requise."),
  admin_comment: z.string().optional(),
}).refine(data => {
  // Basic check: If both times are valid HH:MM format, ensure end > start for same day
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (timeRegex.test(data.heure_debut) && timeRegex.test(data.heure_fin)) {
    // Simple string comparison works for HH:MM format within the same day
    return data.heure_fin > data.heure_debut;
  }
  return true; // Let individual regex validation handle format errors
}, {
  message: "L'heure de fin doit être après l'heure de début.",
  path: ["heure_fin"], // Attach error to heure_fin field
});

// Infer the TS type from the schema
type PrestationFormData = z.infer<typeof prestationFormSchema>;

// --- Helper to format date YYYY-MM-DD ---
// Supabase/Postgres date columns usually expect 'YYYY-MM-DD'
// HTML input type="date" also works best with this format.
const formatDateForInput = (date: Date | string | number): string => {
    try {
        return format(new Date(date), 'yyyy-MM-dd');
    } catch {
        // Fallback if date is invalid
        return '';
    }
};

// --- Helper to format time HH:MM ---
// API might expect HH:MM:SS, but input is HH:MM. Adjust if needed.
const formatTimeForInput = (timeValue: any): string => {
    if (typeof timeValue === 'string') {
         // Check if it's already HH:MM
         if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeValue)) {
             return timeValue;
         }
         // Check if it's HH:MM:SS and truncate
         if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(timeValue)) {
             return timeValue.substring(0, 5);
         }
    }
    // Add more robust handling if time comes in different formats
    console.warn("Could not format time for input:", timeValue);
    return ''; // Fallback
};


export default function ModifyPrestationForm({ prestation, onClose, onSaved }: ModifyPrestationFormProps) {
  const [clients, setClients] = useState<ClientSelectItem[]>([]);
  const [projects, setProjects] = useState<ProjectForSelect[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize react-hook-form
  const form = useForm<PrestationFormData>({
    resolver: zodResolver(prestationFormSchema),
    defaultValues: {
      date_prestation: formatDateForInput(prestation.date_prestation),
      heure_debut: formatTimeForInput(prestation.heure_debut),
      heure_fin: formatTimeForInput(prestation.heure_fin),
      client_id: prestation.client_id.toString(), // Ensure it's a string for Select
      project_id: prestation.project_id.toString(), // Ensure it's a string for Select
      adresse: prestation.adresse ?? '',
      admin_comment: prestation.admin_comment ?? '',
    },
  });

  const selectedClientId = form.watch('client_id');

  // --- Data Fetching Callbacks ---
  const fetchClients = useCallback(async () => {
     console.log("Fetching clients for dropdown...");
     setIsLoadingClients(true);
     try {
        const response = await brain.list_clients_for_select();
        // Assuming response is okay, parse json.
        // The actual check for response.ok or status code happens after parsing attempt in brain client typically
        // Let's refine error handling based on how brain client throws/returns errors
        const data: ClientSelectItem[] = await response.json();
        // Assuming successful fetch means data is ClientSelectItem[]
        setClients(data || []);

     } catch (error: any) {
        console.error("Error fetching clients:", error);
        let message = "Erreur chargement clients.";
        // Try to extract detail from error if it's structured
        try { message = JSON.parse(error?.message || '{}')?.detail || message; } catch {} 
        toast.error(message);
        setClients([]);
     } finally {
        setIsLoadingClients(false);
     }
  }, []);

  const fetchProjects = useCallback(async (clientId: string | null) => {
     if (!clientId) {
        setProjects([]);
        return;
     }
     console.log(`Fetching projects for client ID: ${clientId}`);
     setIsLoadingProjects(true);
     try {
        // Convert string ID from form back to number for API query
        const clientIdNum = parseInt(clientId, 10);
        if (isNaN(clientIdNum)) {
            // Reset projects if client ID becomes invalid (e.g., during rapid changes)
            setProjects([]); 
            throw new Error("Client ID invalide.");
        }
        const response = await brain.list_projects_for_select({ client_id: clientIdNum });
        const data: ProjectForSelect[] = await response.json();
        // Assuming success if no exception
        setProjects(data || []);

     } catch (error: any) {
        console.error("Error fetching projects:", error);
        let message = "Erreur chargement projets.";
        try { message = JSON.parse(error?.message || '{}')?.detail || message; } catch {}
        toast.error(message);
        setProjects([]);
     } finally {
         setIsLoadingProjects(false);
     }
  }, []);

  // --- Effects for Data Fetching ---
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    // Fetch projects when selectedClientId changes (and is valid)
    // This will also fetch projects initially based on defaultValues.client_id
    fetchProjects(selectedClientId);
  }, [selectedClientId, fetchProjects]);

   // Reset project field if client changes
   useEffect(() => {
       const subscription = form.watch((value, { name, type }) => {
           if (name === 'client_id' && type === 'change') {
               console.log("Client changed, resetting project field");
               form.resetField('project_id', { defaultValue: '' }); // Reset project when client changes
               // Fetching is handled by the other useEffect watching selectedClientId
           }
       });
       return () => subscription.unsubscribe();
   }, [form]);


  // --- onSubmit Handler ---
  const onSubmit = async (data: PrestationFormData) => {
    console.log("Form validated. Submitting data:", data);
    setIsSaving(true);

    // Prepare payload for the API (matching PrestationUpdatePayload structure)
    const payload: PrestationUpdate = {
       date_prestation: data.date_prestation, // Should be 'YYYY-MM-DD' string
       heure_debut: data.heure_debut, // Should be 'HH:MM' string
       heure_fin: data.heure_fin, // Should be 'HH:MM' string
       client_id: parseInt(data.client_id, 10), // Convert back to number
       project_id: parseInt(data.project_id, 10), // Convert back to number
       adresse: data.adresse,
       admin_comment: data.admin_comment || null, // Ensure null if empty/undefined
    };
    console.log("Prepared API payload:", payload);

    try {
        const updatePromise = brain.update_prestation({ prestationId: prestation.id }, payload);

        toast.promise(updatePromise, {
            loading: "Enregistrement des modifications...",
            success: async (response) => {
                if (response.status === 200) {
                    console.log("Update successful");
                    onSaved(); // Refresh parent list
                    onClose(); // Close modal
                    return "Prestation modifiée avec succès !";
                } else {
                    // Try to parse error detail from non-200 response
                    const errorText = await response.text();
                    let detail = `Erreur ${response.status}`;
                    try { detail = JSON.parse(errorText).detail || detail; } catch {}
                    throw new Error(detail); // Throw to trigger the error callback
                }
            },
            error: (err: any) => {
                 console.error("Error updating prestation:", err);
                 const message = err?.message || "Une erreur inconnue s'est produite lors de la modification.";
                 return message;
            },
            finally: () => {
                 setIsSaving(false);
            }
        });

    } catch (error) { // Catch potential synchronous errors (e.g., during payload prep)
        console.error("Synchronous error during submission setup:", error);
        toast.error("Une erreur inattendue s'est produite avant l'envoi.");
        setIsSaving(false);
    }
  };

  // --- Render Logic ---
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Row 1: Date, Start Time, End Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="date_prestation"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date *</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="heure_debut"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Début (HH:MM) *</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="heure_fin"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fin (HH:MM) *</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {/* Row 2: Client, Project */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Client *</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingClients}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingClients ? "Chargement..." : "Sélectionnez un client"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id.toString()}> {/* Ensure value is string */}
                                        {client.nom}
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
                name="project_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Projet *</FormLabel>
                         <Select
                             onValueChange={field.onChange}
                             value={field.value} // Control the value
                             // defaultValue={field.value} // defaultValue might conflict with value
                             disabled={isLoadingProjects || !selectedClientId}
                         >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        !selectedClientId ? "Choisissez d'abord un client" :
                                        isLoadingProjects ? "Chargement..." :
                                        "Sélectionnez un projet"
                                    } />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {projects.map((project) => (
                                     <SelectItem key={project.id} value={project.id.toString()}> {/* Ensure value is string */}
                                        {project.nom}
                                    </SelectItem>
                                ))}
                                {!isLoadingProjects && projects.length === 0 && selectedClientId && (
                                    <div className="text-sm text-muted-foreground px-2 py-1.5">Aucun projet pour ce client.</div>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
         </div>

         {/* Row 3: Address */}
          <FormField
            control={form.control}
            name="adresse"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Adresse *</FormLabel>
                    <FormControl>
                        <Input placeholder="Adresse complète de la prestation" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

         {/* Row 4: Admin Comment */}
         <FormField
            control={form.control}
            name="admin_comment"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Commentaire Admin (Optionnel)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ajouter une note..." {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
           <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
             Annuler
           </Button>
           <Button type="submit" disabled={isSaving || isLoadingClients || isLoadingProjects}>
             {isSaving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
           </Button>
        </div>
      </form>
    </Form>
  );
}
