import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from 'utils/supabase';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from 'lucide-react';
import AdminNavigation from 'components/AdminNavigation';
import { Client } from 'utils/types'; // <-- Import shared type


export default function AdminGestionClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // TODO: Modal states for Add/Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({ nom: '', adresse: '', email_facturation: '', telephone: '', tarif_horaire: null }); // For both add and edit, initialize for Add
  const [isSaving, setIsSaving] = useState(false); // Loading state for save operations

    // --- Auth Effects (Corrected) ---
    useEffect(() => {
        let isMounted = true; // Prevent state updates on unmounted component

        const initializeAuth = async () => {
            setCheckingAuth(true); // Start checking
            try {
                // 1. Fetch initial session
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Error fetching initial session:", error);
                    // Handle error appropriately, maybe show a message
                }
                if (isMounted) {
                    setCurrentUser(session?.user ?? null);
                    // Initial session check complete, regardless of user presence
                    // Let the second effect handle setting checkingAuth to false after role check
                }
            } catch (error) {
                console.error("Exception during initial session fetch:", error);
                 if (isMounted) {
                    setCurrentUser(null);
                    setCheckingAuth(false); // Ensure checking stops even on exception if role check won't run
                 }
            }
        };

        initializeAuth();

        // 2. Set up the auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
             if (isMounted) {
                console.log("Auth state changed, new session:", session);
                setCurrentUser(session?.user ?? null);
                setIsAdmin(false); // Reset admin status on any auth change
                setCheckingAuth(true); // Trigger role check in the second effect
             }
        });

        // 3. Cleanup
        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, []); // Runs once on mount

    useEffect(() => {
        let isMounted = true;
        // This effect handles checking the admin role AFTER the user state is confirmed.

        // If we are still doing the initial check OR there's no user, do nothing here.
        if (checkingAuth && !currentUser) {
             // If there's truly no session after the initial check, finish.
             // This relies on the first effect potentially setting checkingAuth=false if initializeAuth fails early.
             // Or the auth listener triggering a state where currentUser is null.
             // A small delay might be needed if getSession is very fast and checkingAuth isn't true yet.
             setTimeout(() => {
                 if (isMounted && !currentUser) { // Check again inside timeout
                    setCheckingAuth(false);
                 }
             }, 0); // Defer to next tick
             return;
        }
        if (!currentUser) {
             setIsAdmin(false);
             setCheckingAuth(false); // Ensure it's false if user logs out.
             return;
        }

        // If we have a user, proceed to check their admin role.
        if (currentUser) {
            const checkAdminRole = async () => {
                // No need to setCheckingAuth(true) here, it was set by the listener/init
                try {
                    const { data: profile, error } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', currentUser.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                         console.error("Supabase error fetching role:", error);
                         throw error; // Re-throw if it's not a 'not found' error
                    }
                    
                    if (isMounted) {
                       setIsAdmin(profile?.role === 'admin');
                    }

                } catch (err: any) {
                    console.error("Error checking admin role:", err);
                     if (isMounted) {
                        toast.error("Erreur lors de la vérification des permissions administrateur.");
                        setIsAdmin(false); // Ensure isAdmin is false on error
                     }
                } finally {
                     if (isMounted) {
                        setCheckingAuth(false); // Finalize the check process
                     }
                }
            };
            checkAdminRole();
        }

         // Cleanup for this effect
        return () => {
            isMounted = false;
        };

    }, [currentUser, checkingAuth]); // Re-run when user changes OR checkingAuth is set to true

  // --- Data Fetching ---
  const fetchClients = useCallback(async () => {
    console.log("Fetching clients...");
    setLoading(true);
    setError(null);
    try {
        const { data, error: fetchError } = await supabase
            .from('clients')
            .select('*')
            .order('nom', { ascending: true });

        if (fetchError) {
            throw fetchError;
        }

        setClients(data || []);

    } catch (err: any) {
      console.error("Error fetching clients:", err);
      setError("Impossible de charger les clients. " + err.message);
      toast.error("Erreur lors du chargement des clients.");
      setClients([]); // Ensure clients is empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients only if admin
  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      fetchClients();
    }
    if (!isAdmin || checkingAuth) {
        setClients([]); // Clear data if not admin or still checking
    }
  }, [isAdmin, checkingAuth, fetchClients]);

  // --- Form Input Handler ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value,
    }));
  };


  // --- TODO: Handlers for Add/Edit/Delete ---
  const handleOpenAddModal = () => {
      setFormData({}); // Reset form data
      setIsAddModalOpen(true);
  }

  const handleAddClient = async () => {
      console.log("Attempting to add client:", formData);

      // Basic validation
      if (!formData.nom || formData.nom.trim() === '') {
          toast.error("Le nom du client est obligatoire.");
          return;
      }

      // Prepare data for insertion (ensure no undefined values, though state initialization helps)
      const clientData = {
          nom: formData.nom.trim(),
          adresse: formData.adresse?.trim() || null,
          email_facturation: formData.email_facturation?.trim() || null,
          telephone: formData.telephone?.trim() || null,
          tarif_horaire: formData.tarif_horaire, // Already a number or null from input handler
      };

      setIsSaving(true);
      try {
          const { error: insertError } = await supabase
              .from('clients')
              .insert([clientData]);

          if (insertError) {
              throw insertError;
          }

          toast.success(`Client '${clientData.nom}' ajouté avec succès.`);
          setIsAddModalOpen(false);
          fetchClients(); // Refresh the client list

      } catch (err: any) {
          console.error("Error adding client:", err);
          toast.error(`Erreur lors de l'ajout du client: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  }

  const handleOpenEditModal = (client: Client) => {
      setEditingClient(client);
      setFormData(client); // Pre-fill form
      setIsEditModalOpen(true);
  }

  const handleUpdateClient = async () => {
      if (!editingClient) {
          toast.error("Aucun client sélectionné pour la modification.");
          return;
      }

      console.log("Attempting to update client:", editingClient.id, formData);

      // Basic validation
      if (!formData.nom || formData.nom.trim() === '') {
          toast.error("Le nom du client est obligatoire.");
          return;
      }

      // Prepare data for update
      const updateData = {
          nom: formData.nom.trim(),
          adresse: formData.adresse?.trim() || null,
          email_facturation: formData.email_facturation?.trim() || null,
          telephone: formData.telephone?.trim() || null,
          tarif_horaire: formData.tarif_horaire, // Already handled
      };

      setIsSaving(true);
      try {
          const { error: updateError } = await supabase
              .from('clients')
              .update(updateData)
              .eq('id', editingClient.id);

          if (updateError) {
              throw updateError;
          }

          toast.success(`Client '${updateData.nom}' mis à jour avec succès.`);
          setIsEditModalOpen(false);
          setEditingClient(null); // Clear editing state
          fetchClients(); // Refresh the client list

      } catch (err: any) {
          console.error("Error updating client:", err);
          toast.error(`Erreur lors de la mise à jour du client: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  }


  // --- Render Logic ---
  if (checkingAuth) {
    return <div className="container mx-auto p-8 text-center">Vérification des permissions...</div>;
  }

  /* // TODO: Réactiver la vérification admin avant déploiement
  if (!isAdmin) {
    return <div className="container mx-auto p-8 text-center text-destructive">Accès Refusé. Permissions administrateur requises.</div>;
  }
  */

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AdminNavigation /> {/* Shared Navigation Bar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Clients</CardTitle>
              <CardDescription>
                Ajoutez, modifiez ou consultez les informations des clients et leurs tarifs horaires.
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Chargement des clients...</p>}
          {error && <p className="text-destructive">Erreur: {error}</p>}
          {!loading && !error && clients.length === 0 && (
            <p>Aucun client trouvé.</p>
          )}
          {!loading && !error && clients.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Email Facturation</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Tarif Horaire (€)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                    <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.nom}</TableCell>
                        <TableCell>{client.adresse ?? '-'}</TableCell>
                        <TableCell>{client.email_facturation ?? '-'}</TableCell>
                        <TableCell>{client.telephone ?? '-'}</TableCell>
                        <TableCell>{client.tarif_horaire !== null ? client.tarif_horaire.toFixed(2) : '-'}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(client)}>Modifier</Button>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* TODO: Add Client Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Ajouter un Nouveau Client</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nom" className="text-right">Nom *</Label>
                    <Input id="nom" name="nom" value={formData.nom ?? ''} onChange={handleInputChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="adresse" className="text-right">Adresse</Label>
                    <Input id="adresse" name="adresse" value={formData.adresse ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email_facturation" className="text-right">Email Facturation</Label>
                    <Input id="email_facturation" name="email_facturation" type="email" value={formData.email_facturation ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="telephone" className="text-right">Téléphone</Label>
                    <Input id="telephone" name="telephone" value={formData.telephone ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tarif_horaire" className="text-right">Tarif Horaire (€)</Label>
                    <Input id="tarif_horaire" name="tarif_horaire" type="number" step="0.01" value={formData.tarif_horaire ?? ''} onChange={handleInputChange} className="col-span-3" placeholder="Ex: 45.50"/>
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button onClick={handleAddClient} disabled={isSaving}>
                    {isSaving ? 'Ajout en cours...' : 'Ajouter'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* TODO: Edit Client Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Modifier le Client: {editingClient?.nom}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 {/* Reuse the same form structure as Add Client */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-nom" className="text-right">Nom *</Label>
                    <Input id="edit-nom" name="nom" value={formData.nom ?? ''} onChange={handleInputChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-adresse" className="text-right">Adresse</Label>
                    <Input id="edit-adresse" name="adresse" value={formData.adresse ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email_facturation" className="text-right">Email Facturation</Label>
                    <Input id="edit-email_facturation" name="email_facturation" type="email" value={formData.email_facturation ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-telephone" className="text-right">Téléphone</Label>
                    <Input id="edit-telephone" name="telephone" value={formData.telephone ?? ''} onChange={handleInputChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-tarif_horaire" className="text-right">Tarif Horaire (€)</Label>
                    <Input id="edit-tarif_horaire" name="tarif_horaire" type="number" step="0.01" value={formData.tarif_horaire ?? ''} onChange={handleInputChange} className="col-span-3" placeholder="Ex: 45.50"/>
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button onClick={handleUpdateClient} disabled={isSaving}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}
