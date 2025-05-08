import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from 'utils/supabase';
import brain from 'brain';
import type { ClientModel } from 'types';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, PlusCircle, Edit, Trash2 } from 'lucide-react'; // Add Trash2 icon
import AdminNavigation from 'components/AdminNavigation';
import { ClientFormDialog } from 'components/ClientFormDialog';

export default function AdminClientsProjets() {
    // --- Auth State ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    // --- Client Data State ---
    const [clients, setClients] = useState<ClientModel[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    // --- Dialog States ---
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<ClientModel | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<ClientModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Function to Fetch Clients ---
    const fetchClients = async () => {
        // ... (fetch logic remains the same)
        console.log("Attempting to fetch all clients...");
        setIsLoadingClients(true);
        setClientError(null);
        try {
            const response = await brain.list_clients();
            const data: ClientModel[] = await response.json();
            console.log("Fetched clients:", data);
            setClients(data);
        } catch (err: any) {
            console.error("Error fetching clients:", err);
            const errorMsg = err.message || "Une erreur inconnue est survenue.";
            setClientError(`Erreur lors de la récupération des clients: ${errorMsg}`);
            toast.error(`Erreur lors de la récupération des clients: ${errorMsg}`);
        } finally {
            setIsLoadingClients(false);
        }
    };

    // --- Auth Effects (No changes needed here) ---
    useEffect(() => {
        // ... (auth initialization logic remains the same)
         let isMounted = true;
        const initializeAuth = async () => {
            setCheckingAuth(true);
            setAuthError(null);
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (isMounted) {
                    setCurrentUser(session?.user ?? null);
                }
            } catch (err: any) {
                console.error("Error fetching initial session:", err);
                if (isMounted) {
                    setAuthError("Erreur lors de la récupération de la session.");
                    setCurrentUser(null);
                }
            }
        };
        initializeAuth();
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
             if (isMounted) {
                console.log("Auth state changed, new session:", session);
                setCurrentUser(session?.user ?? null);
                setIsAdmin(false);
                setAuthError(null);
             }
        });
        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        // ... (role checking logic remains the same)
        if (!currentUser) {
             setCheckingAuth(false);
             setIsAdmin(false);
            return;
        }
        const checkAdminRole = async () => {
             setCheckingAuth(true);
             setAuthError(null);
            try {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', currentUser.id)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;
                const isAdminUser = profile?.role === 'admin';
                setIsAdmin(isAdminUser);
                if (isAdminUser) {
                    fetchClients();
                } else {
                    setClients([]);
                    setClientError("Accès non autorisé à la liste des clients.");
                }
            } catch (err: any) {
                console.error("Error checking admin role or fetching clients:", err);
                toast.error("Erreur lors de la vérification des permissions ou du chargement des données.");
                setAuthError("Impossible de vérifier les permissions ou charger les données.");
                setIsAdmin(false);
                setClients([]);
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAdminRole();
    }, [currentUser]);

    // --- Event Handlers ---
    const handleAddClientClick = () => {
        setClientToEdit(null);
        setIsClientFormOpen(true);
    };

    const handleEditClientClick = (client: ClientModel) => {
        console.log("Editing client:", client);
        setClientToEdit(client);
        setIsClientFormOpen(true);
    };

    const handleDeleteClick = (client: ClientModel) => {
        console.log("Initiating delete for client:", client);
        setClientToDelete(client);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!clientToDelete || !clientToDelete.id) return;
        console.log("Confirming delete for client:", clientToDelete.id);
        setIsDeleting(true);
        try {
            // Call the delete endpoint
            const response = await brain.delete_client({ client_id: clientToDelete.id });
            await response.json(); // Check for errors / process response if needed
            toast.success(`Client "${clientToDelete.nom}" supprimé avec succès.`);
            fetchClients(); // Refresh the list
        } catch (error: any) {
            console.error("Error deleting client:", error);
            // Attempt to get detail from the expected API error structure, fallback to generic message
            const errorDetail = error?.response?.data?.detail;
            const errorMsg = errorDetail || error.message || "Une erreur inconnue est survenue.";
            toast.error(`Erreur lors de la suppression : ${errorMsg}`);
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setClientToDelete(null);
        }
    };

    // Callback passed to the dialog to refresh data
    const handleClientChange = () => {
        fetchClients();
        setClientToEdit(null); 
    };

    const handleFormDialogClose = (isOpen: boolean) => {
        setIsClientFormOpen(isOpen);
        if (!isOpen) {
            setClientToEdit(null);
        }
    }

    // --- Render Logic ---
    if (checkingAuth && !currentUser) { /* ... Loading Skeleton ... */ }
    if (authError || !isAdmin) { /* ... Access Denied ... */ }

    return (
        <div className="container mx-auto p-4 md:p-8 flex">
            <AdminNavigation />
            <div className="flex-1 pl-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Gestion Clients & Projets</CardTitle>
                        <CardDescription>
                            Gérez les informations des clients et les projets associés.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {/* Client Management Section */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Clients</h3>
                                    <Button size="sm" onClick={handleAddClientClick}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter Client
                                    </Button>
                                </div>
                                {isLoadingClients && (
                                    /* ... Loading Skeletons ... */
                                    <div>
                                        <Skeleton className="h-8 w-full mb-2" />
                                        <Skeleton className="h-8 w-full mb-2" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                )}
                                {!isLoadingClients && clientError && (
                                    <p className="text-destructive">{clientError}</p>
                                )}
                                {!isLoadingClients && !clientError && (
                                    <Table>
                                        <TableCaption>
                                            {clients.length === 0 ? "Aucun client trouvé." : "Liste des clients enregistrés."}
                                        </TableCaption>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nom</TableHead>
                                                <TableHead>Adresse</TableHead>
                                                <TableHead>Email Facturation</TableHead>
                                                <TableHead>Téléphone</TableHead>
                                                <TableHead className="text-right">Tarif Horaire (€)</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clients.map((client) => (
                                                <TableRow key={client.id}>
                                                    <TableCell className="font-medium">{client.nom}</TableCell>
                                                    <TableCell>{client.adresse || "-"}</TableCell>
                                                    <TableCell>{client.email_facturation || "-"}</TableCell>
                                                    <TableCell>{client.telephone || "-"}</TableCell>
                                                    <TableCell className="text-right">{client.tarif_horaire?.toFixed(2) ?? "-"}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mr-2"
                                                            onClick={() => handleEditClientClick(client)}
                                                        >
                                                             <Edit className="mr-1 h-4 w-4" /> Modifier
                                                        </Button>
                                                        {/* Wire Delete button */}
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(client)}
                                                            disabled={isDeleting} // Disable while a delete is in progress
                                                        >
                                                            <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </section>

                            {/* Placeholder for Project Management Section */}
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Projets</h3>
                                <p className="text-muted-foreground">
                                    (Zone pour afficher la liste des projets, ajouter, modifier, supprimer)
                                </p>
                            </section>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Client Add/Edit Form Dialog */}
            <ClientFormDialog
                isOpen={isClientFormOpen}
                onOpenChange={handleFormDialogClose}
                onClientAdded={handleClientChange}
                clientToEdit={clientToEdit}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le client "{clientToDelete?.nom}" ?
                            Cette action est irréversible et supprimera également les liens associés (projets, prestations... Attention!).
                            {/* TODO: Improve warning if backend prevents deletion due to FKs */}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setClientToDelete(null)} disabled={isDeleting}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
