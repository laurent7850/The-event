// ui/src/components/ProjectForm.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import brain from "brain";
import { ClientForSelect, ProjectDisplay } from "types"; // Assuming ClientForSelect is in types
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react"; // For loading state

// Define Zod schema for validation
const formSchema = z.object({
  nom: z.string().min(1, { message: "Le nom du projet est requis." }),
  // client_id needs to be string for Select, but number for API
  client_id: z.string().refine((val) => val && !isNaN(parseInt(val, 10)), {
    message: "Client requis.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProjectFormProps { // Export props interface
  initialData?: ProjectDisplay | null; // Pass project data for editing
  onSubmit: (values: { nom: string; client_id: number }) => Promise<void>; // API call logic
  onCancel: () => void; // To close dialog/sheet
  isLoading?: boolean; // Pass loading state from parent
}

export function ProjectForm({ // Export component
  initialData,
  onSubmit,
  onCancel,
  isLoading: isSubmitting, // Rename prop for clarity
}: ProjectFormProps) {
  const [clients, setClients] = useState<ClientForSelect[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(true);

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      setIsClientsLoading(true);
      try {
        const response = await brain.list_clients_for_select(); // Fetch simplified client list
        const data = await response.json();
        if (response.ok) {
          setClients(data);
        } else {
          console.error("Failed to fetch clients:", data?.detail);
          toast.error("Erreur lors de la récupération des clients.");
        }
      } catch (err) {
        console.error("Network error fetching clients:", err);
        toast.error("Erreur réseau lors de la récupération des clients.");
      } finally {
        setIsClientsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: initialData?.nom || "",
      client_id: initialData?.client_id?.toString() || "", // Use string for Select
    },
  });

   // Reset form when initialData changes (e.g., opening edit dialog)
   useEffect(() => {
    if (initialData) {
      form.reset({
        nom: initialData.nom,
        client_id: initialData.client_id.toString(),
      });
    } else {
        form.reset({ // Reset for adding new
            nom: "",
            client_id: "",
        });
    }
  }, [initialData, form]);


  const handleFormSubmit = async (values: FormValues) => {
    // Convert client_id back to number before submitting
    await onSubmit({
      nom: values.nom,
      client_id: parseInt(values.client_id, 10),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du Projet</FormLabel>
              <FormControl>
                <Input placeholder="Nom du projet" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Associé</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value} // Ensure value is controlled
                disabled={isClientsLoading || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    {isClientsLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.nom}
                    </SelectItem>
                  ))}
                  {!isClientsLoading && clients.length === 0 && (
                     <div className="p-2 text-sm text-muted-foreground">Aucun client trouvé. Ajoutez d'abord des clients.</div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
           <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
             Annuler
           </Button>
           <Button type="submit" disabled={isClientsLoading || isSubmitting || !form.formState.isValid}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {initialData ? "Enregistrer les modifications" : "Ajouter le projet"}
           </Button>
        </div>
      </form>
    </Form>
  );
}
