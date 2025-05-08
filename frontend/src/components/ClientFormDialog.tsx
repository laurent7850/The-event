import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose, // For explicit close button if needed
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import brain from 'brain';
import type { ClientModel } from 'types';

// Define the form schema using Zod
const formSchema = z.object({
    nom: z.string().min(1, { message: "Le nom est obligatoire." }),
    adresse: z.string().optional(),
    email_facturation: z.string().email({ message: "Adresse email invalide." }).optional().or(z.literal('')), // Allow empty string
    telephone: z.string().optional(),
    numero_tva: z.string()
        .regex(/^BE\d{10}$/, { message: "Doit être au format BE suivi de 10 chiffres." })
        .optional().or(z.literal('')), // Add TVA validation
    // Ensure tarif_horaire is treated as a number, but allow empty string input
    tarif_horaire: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number({ invalid_type_error: "Doit être un nombre." }).positive({ message: "Doit être positif." }).optional()
    ),
});

// Define the props for the component
interface Props {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onClientAdded: () => void; // Callback to refresh the list
    clientToEdit?: ClientModel | null; // For editing later
}

export function ClientFormDialog({ isOpen, onOpenChange, onClientAdded, clientToEdit }: Props) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nom: "",
            adresse: "",
            email_facturation: "",
            telephone: "",
            tarif_horaire: undefined,
            numero_tva: "", // Add TVA default value
        },
    });

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Determine if we are in edit mode
    const isEditMode = !!clientToEdit;

    // Reset form when dialog opens or clientToEdit changes (for edit mode)
    React.useEffect(() => {
        if (isOpen) {
            if (isEditMode && clientToEdit) {
                form.reset({
                    nom: clientToEdit.nom,
                    adresse: clientToEdit.adresse ?? "",
                    email_facturation: clientToEdit.email_facturation ?? "",
                    telephone: clientToEdit.telephone ?? "",
                    tarif_horaire: clientToEdit.tarif_horaire ?? undefined,
                    numero_tva: clientToEdit.numero_tva ?? "", // Add TVA reset
                });
            } else {
                form.reset(); // Reset to default for add mode
            }
            setIsSubmitting(false); // Ensure submit button is enabled
        }
    }, [isOpen, clientToEdit, isEditMode, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        console.log("Form submitted with values:", values);

        try {
            const payload: ClientModel = {
                nom: values.nom,
                adresse: values.adresse || null,
                email_facturation: values.email_facturation || null,
                telephone: values.telephone || null,
                // Zod ensures tarif_horaire is number | undefined
                tarif_horaire: values.tarif_horaire ?? null,
                numero_tva: values.numero_tva || null, // Add TVA to payload
            };

            let response;
            if (isEditMode && clientToEdit?.id) {
                console.log(`Updating client ${clientToEdit.id} with payload:`, payload);
                // Call update endpoint
                // The update_client method expects path params { client_id } and the body
                response = await brain.update_client({ client_id: clientToEdit.id }, payload);
                await response.json(); // Process response
                toast.success(`Client "${values.nom}" mis à jour avec succès !`);
                onClientAdded(); // Trigger refresh (callback name is generic for add/edit)
                onOpenChange(false); // Close dialog
            } else {
                console.log("Creating client with payload:", payload);
                response = await brain.create_client(payload);
                await response.json(); // Process response
                toast.success(`Client "${values.nom}" ajouté avec succès !`);
                onClientAdded(); // Trigger refresh
                onOpenChange(false); // Close dialog
            }

        } catch (error: any) {
            console.error("Error submitting client form:", error);
            const errorMsg = error.message || "Une erreur inconnue est survenue.";
            toast.error(`Erreur : ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Modifier Client" : "Ajouter un nouveau Client"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Modifiez les informations du client ci-dessous."
                            : "Remplissez les informations pour le nouveau client."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nom"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nom du client" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Add numero_tva field back */}
                        <FormField
                            control={form.control}
                            name="numero_tva"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>N° TVA</FormLabel>
                                    <FormControl>
                                        <Input placeholder="BE0123456789" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="adresse"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adresse</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Adresse complète" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email_facturation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Facturation</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="contact@client.com" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="telephone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Numéro de téléphone" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tarif_horaire"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tarif Horaire (€)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="ex: 50.50"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={(e) => {
                                                // Allow empty string or convert to number
                                                const value = e.target.value;
                                                field.onChange(value === "" ? "" : parseFloat(value));
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (isEditMode ? "Sauvegarde..." : "Ajout...") : (isEditMode ? "Sauvegarder" : "Ajouter Client")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
