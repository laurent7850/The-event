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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PlusCircle } from 'lucide-react';
import AdminNavigation from 'components/AdminNavigation';
import { Project, Client } from 'utils/types'; // <-- Import shared types

// Use Client directly, but maybe only id and nom are needed for select
type ClientSelectItem = Pick<Client, 'id' | 'nom'>;

// Adjust Project type based on Supabase join if necessary, or handle joining in component
// Supabase query joins 'clients ( nom )', so let's reflect that if needed
interface ProjectWithClient extends Project {
    clients: { nom: string } | null; // Define the shape of the joined data
}

// Interface for form data (Add/Edit)
interface ProjectFormData {
    nom: string;
    client_id: string | null;
}



export default function AdminGestionProjets() {
  const [projects, setProjects] = useState<ProjectWithClient[]>([]); // Use adjusted type
  const [clientsForSelect, setClientsForSelect] = useState<ClientSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- Modal & Form State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({ nom: '', client_id: null });
  const [isSaving, setIsSaving] = useState(false);

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
              }
              if (isMounted) {
                  setCurrentUser(session?.user ?? null);
                  // Let the second effect handle setting checkingAuth to false after role check
              }
          } catch (error) {
              console.error("Exception during initial session fetch:", error);
               if (isMounted) {
                  setCurrentUser(null);
                  setCheckingAuth(false); // Ensure checking stops if role check won't run
               }
          }
      };

      initializeAuth();

      // 2. Set up the auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
           if (isMounted) {
              console.log("Auth state changed, new session:", session);
              setCurrentUser(session?.user ?? null);
              setIsAdmin(false); // Reset admin status
              setCheckingAuth(true); // Trigger role check
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

      // If we are still doing the initial check OR there's no user, do nothing here.
      if (checkingAuth && !currentUser) {
           // Handle case where initial check completes with no user
            setTimeout(() => {
                if (isMounted && !currentUser) {
                   setCheckingAuth(false);
                }
            }, 0);
           return;
      }
      if (!currentUser) {
           setIsAdmin(false);
           setCheckingAuth(false);
           return;
      }

      // If we have a user, proceed to check their admin role.
      if (currentUser) {
          const checkAdminRole = async () => {
              try {
                  const { data: profile, error } = await supabase
                      .from('users')
                      .select('role')
                      .eq('id', currentUser.id)
                      .single();

                  if (error && error.code !== 'PGRST116') {
                       console.error("Supabase error fetching role:", error);
                       throw error;
                  }
                  
                  if (isMounted) {
                     setIsAdmin(profile?.role === 'admin');
                  }

              } catch (err: any) {
                  console.error("Error checking admin role:", err);
                   if (isMounted) {
                      toast.error("Erreur lors de la vérification des permissions administrateur.");
                      setIsAdmin(false);
                   }
              } finally {
                   if (isMounted) {
                      setCheckingAuth(false); // Finalize check
                   }
              }
          };
          checkAdminRole();
      }

      return () => {
          isMounted = false;
      };

  }, [currentUser, checkingAuth]);

  // --- Data Fetching ---
  const fetchProjects = useCallback(async () => {
    console.log("Fetching projects...");
    setLoading(true);
    setError(null);
    try {
        const { data, error: fetchError } = await supabase
            .from('projects')
            .select('id, nom, client_id, clients ( nom )') // Join with clients table
            .order('nom', { ascending: true });

        if (fetchError) {
            throw fetchError;
        }

        setProjects(data || []);

    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError("Impossible de charger les projets. " + err.message);
      toast.error("Erreur lors du chargement des projets.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClientsForSelect = useCallback(async () => {
    console.log("Fetching clients for select...");
    try {
        const { data, error: fetchError } = await supabase
            .from('clients')
            .select('id, nom')
            .order('nom', { ascending: true });

        if (fetchError) {
            throw fetchError;
        }
        setClientsForSelect(data || []);
    } catch (err: any) {
      console.error("Error fetching clients for select:", err);
      toast.error("Erreur lors du chargement de la liste des clients.");
      setClientsForSelect([]);
    }
  }, []);

  // Fetch data only if admin
  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      fetchProjects();
      fetchClientsForSelect();
    }
    if (!isAdmin || checkingAuth) {
        setProjects([]);
        setClientsForSelect([]);
    }
  }, [isAdmin, checkingAuth, fetchProjects, fetchClientsForSelect]);

  // --- Form Input Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string | null) => {
    // The value from shadcn Select onValueChange is the string value of the selected Item
    setFormData(prev => ({ ...prev, client_id: value }));
  };

  // --- Modal Open/Close Handlers ---
  const handleOpenAddModal = () => {
      setFormData({ nom: '', client_id: null }); // Reset form data
      setIsAddModalOpen(true);
  }

  const handleOpenEditModal = (project: ProjectWithClient) => { // Use adjusted type
      setEditingProject(project);
      setFormData({ nom: project.nom, client_id: project.client_id }); // Pre-fill form
      setIsEditModalOpen(true);
  }

  // --- TODO: Handlers for Add/Edit ---
  const handleAddProject = async () => {
      console.log("Attempting to add project:", formData);

      // Validation
      if (!formData.nom || formData.nom.trim() === '') {
          toast.error("Le nom du projet est obligatoire.");
          return;
      }
      if (!formData.client_id) {
          toast.error("Veuillez sélectionner un client.");
          return;
      }

      const projectData = {
          nom: formData.nom.trim(),
          client_id: formData.client_id,
      };

      setIsSaving(true);
      try {
          const { error: insertError } = await supabase
              .from('projects')
              .insert([projectData]);

          if (insertError) {
              throw insertError;
          }

          toast.success(`Projet '${projectData.nom}' ajouté avec succès.`);
          setIsAddModalOpen(false);
          fetchProjects(); // Refresh the project list

      } catch (err: any) {
          console.error("Error adding project:", err);
          // Check for specific errors like foreign key violation if needed
          toast.error(`Erreur lors de l'ajout du projet: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  }

  const handleUpdateProject = async () => {
      if (!editingProject) {
          toast.error("Aucun projet sélectionné pour la modification.");
          return;
      }

      console.log("Attempting to update project:", editingProject.id, formData);

      // Validation
      if (!formData.nom || formData.nom.trim() === '') {
          toast.error("Le nom du projet est obligatoire.");
          return;
      }
      if (!formData.client_id) {
          toast.error("Veuillez sélectionner un client.");
          return;
      }

      const updateData = {
          nom: formData.nom.trim(),
          client_id: formData.client_id,
      };

      setIsSaving(true);
      try {
          const { error: updateError } = await supabase
              .from('projects')
              .update(updateData)
              .eq('id', editingProject.id);

          if (updateError) {
              throw updateError;
          }

          toast.success(`Projet '${updateData.nom}' mis à jour avec succès.`);
          setIsEditModalOpen(false);
          setEditingProject(null); // Clear editing state
          fetchProjects(); // Refresh the project list

      } catch (err: any) {
          console.error("Error updating project:", err);
          toast.error(`Erreur lors de la mise à jour du projet: ${err.message}`);
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
              <CardTitle>Gestion des Projets</CardTitle>
              <CardDescription>
                Ajoutez, modifiez ou consultez les projets et liez-les à des clients.
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Projet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Chargement des projets...</p>}
          {error && <p className="text-destructive">Erreur: {error}</p>}
          {!loading && !error && projects.length === 0 && (
            <p>Aucun projet trouvé.</p>
          )}
          {!loading && !error && projects.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Projet</TableHead>
                  <TableHead>Client Associé</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                    <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.nom}</TableCell>
                        <TableCell>{project.clients?.nom ?? 'Client non trouvé'}</TableCell> {/* Display joined client name */}
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(project)}>Modifier</Button>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Ajouter un Nouveau Projet</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-nom" className="text-right">Nom Projet *</Label>
                      <Input id="add-nom" name="nom" value={formData.nom} onChange={handleInputChange} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-client" className="text-right">Client *</Label>
                      <Select name="client_id" value={formData.client_id ?? undefined} onValueChange={handleSelectChange}>
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Sélectionner un client..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clientsForSelect.length === 0 ? (
                                <SelectItem value="loading" disabled>Chargement...</SelectItem>
                            ) : (
                                clientsForSelect.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.nom}</SelectItem>
                                ))
                            )}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button onClick={handleAddProject} disabled={isSaving}>
                      {isSaving ? 'Ajout...' : 'Ajouter'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Modifier le Projet: {editingProject?.nom}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-nom" className="text-right">Nom Projet *</Label>
                      <Input id="edit-nom" name="nom" value={formData.nom} onChange={handleInputChange} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-client" className="text-right">Client *</Label>
                      <Select name="client_id" value={formData.client_id ?? undefined} onValueChange={handleSelectChange}>
                           <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Sélectionner un client..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clientsForSelect.length === 0 ? (
                                <SelectItem value="loading" disabled>Chargement...</SelectItem>
                            ) : (
                                clientsForSelect.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.nom}</SelectItem>
                                ))
                            )}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
               <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button onClick={handleUpdateProject} disabled={isSaving}>
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                   </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}
