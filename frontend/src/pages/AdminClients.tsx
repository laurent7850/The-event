import React, { useState, useEffect } from "react";
import { supabase } from "utils/supabase"; // Import Supabase client
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import shadcn Table components
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { Terminal } from "lucide-react"; // Icon for error alert
import { Button } from "@/components/ui/button"; // For Add/Edit/Delete buttons
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // For modal form
import { Input } from "@/components/ui/input"; // Form input
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Shadcn form components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // For Delete Confirmation
// Removed react-hook-form, zod imports
import { toast } from "sonner"; // For displaying success/error messages
import { ClientFormDialog } from "components/ClientFormDialog"; // Import the dialog component

// Define the structure of a Client object based on Supabase table
interface Client {
  id: string;
  created_at?: string; // Optional, often included by Supabase
  nom: string | null;
  adresse: string | null;
  email_facturation: string | null;
  telephone: string | null;
  tarif_horaire: number | null;
  numero_tva: string | null; // Re-add TVA
}

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null); // Store the whole client for confirmation message
  // Removed inline form state (useForm)

  // Function to fetch clients
  const fetchClients = async () => {
    if (!loading) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        .order("nom", { ascending: true });
      if (fetchError) throw fetchError;
      setClients(data || []);
    } catch (err: any) {
      console.error("Error fetching clients:", err);
      setError(err.message || "Une erreur est survenue lors de la récupération des clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Removed inline onSubmit handler - logic moved to ClientFormDialog

  // Function to handle opening the modal for adding
  const handleAddClick = () => {
    setEditingClient(null); // Signal that we are adding a new client
    // form.reset() removed - handled by ClientFormDialog or unnecessary
    setIsModalOpen(true);
  };

  // Function to handle opening the modal for editing
  const handleEditClick = (client: Client) => {
     setEditingClient(client); // Pass the client data to the modal
     // form.reset() removed - handled by ClientFormDialog
     setIsModalOpen(true);
  };

  // Function to initiate deletion process
  const handleDeleteClick = (client: Client) => {
     setClientToDelete(client);
     setIsDeleteDialogOpen(true);
  };

  // Function to confirm and execute deletion
  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (deleteError) throw deleteError;

      toast.success("Client supprimé avec succès !");
      // Optimistic update: Remove the client from the local state
      setClients(clients.filter(client => client.id !== clientToDelete.id));
      // Or uncomment to refetch from DB instead:
      // await fetchClients();
    } catch (err: any) {
      console.error("Error deleting client:", err);
      toast.error(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
         <h1 className="text-2xl font-bold">Gestion des Clients</h1>
         <Button onClick={handleAddClick}>Ajouter un Client</Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="border rounded-md p-4">
           <div className="h-10 bg-muted rounded-md mb-4 animate-pulse"/>
           <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
         <Table>
            <TableCaption>Liste des clients enregistrés.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Adresse</TableHead>
                <TableHead className="hidden lg:table-cell">Email Facturation</TableHead>
                <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                <TableHead className="hidden lg:table-cell">N° TVA</TableHead> {/* Re-add TVA Header */}
                <TableHead className="text-right hidden sm:table-cell">Tarif Horaire (€)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nom ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.adresse ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.email_facturation ?? "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.telephone ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.numero_tva ?? "-"}</TableCell> {/* Re-add TVA Cell */}
                    <TableCell className="text-right hidden sm:table-cell">
                      {client.tarif_horaire?.toFixed(2) ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditClick(client)}>
                        Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(client)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    Aucun client trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal for Add/Edit Client */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
          if (!open) {
              setEditingClient(null);
              // form.reset(); // Removed redundant reset
          }
          setIsModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Modifier le client" : "Ajouter un nouveau client"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Modifiez les détails du client." : "Remplissez les détails du nouveau client."}
            </DialogDescription>
          </DialogHeader>
          {/* Form is now handled by the separate ClientFormDialog component */}
          <ClientFormDialog
            isOpen={isModalOpen}
            setIsOpen={setIsModalOpen}
            clientToEdit={editingClient}
            onSuccess={() => {
              fetchClients(); // Refresh the client list on successful add/edit
              setEditingClient(null); // Reset editing state
            }}
          />
          {/* DialogFooter is likely part of ClientFormDialog, remove if redundant */}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment supprimer le client "<strong>{clientToDelete?.nom ?? ""}</strong>" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmer la suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AdminClients;
