import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "utils/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "utils/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types ---
interface Client {
  id: string;
  created_at: string;
  nom: string;
  adresse: string | null;
  email_facturation: string | null;
  telephone: string | null;
  tarif_horaire: number | null;
}

interface Project {
    id: string;
    created_at: string;
    nom: string;
    client_id: string;
}

interface ClientFormData {
  nom: string;
  adresse: string;
  email_facturation: string;
  telephone: string;
  tarif_horaire: number | "";
}

interface ProjectFormData {
    nom: string;
}


// --- Component ---
function GestionClientsProjets() {
  // --- Hooks & State ---
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Clients State
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [errorClients, setErrorClients] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [errorProjects, setErrorProjects] = useState<string | null>(null);

  // Add Client Dialog
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<ClientFormData>({ nom: "", adresse: "", email_facturation: "", telephone: "", tarif_horaire: "" });
  const [isSubmittingAddClient, setIsSubmittingAddClient] = useState(false);

  // Edit Client Dialog
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientData, setEditClientData] = useState<ClientFormData>({ nom: "", adresse: "", email_facturation: "", telephone: "", tarif_horaire: "" });
  const [isSubmittingEditClient, setIsSubmittingEditClient] = useState(false);

  // Delete Client Dialog
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isSubmittingDeleteClient, setIsSubmittingDeleteClient] = useState(false);

  // Add Project Dialog
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState<ProjectFormData>({ nom: "" });
  const [isSubmittingAddProject, setIsSubmittingAddProject] = useState(false);

  // Edit Project Dialog
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectData, setEditProjectData] = useState<ProjectFormData>({ nom: "" });
  const [isSubmittingEditProject, setIsSubmittingEditProject] = useState(false);

  // Delete Project Dialog
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isSubmittingDeleteProject, setIsSubmittingDeleteProject] = useState(false);


  // --- Data Fetching ---
  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    setErrorClients(null);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      setErrorClients(err.message);
      toast.error(`Erreur chargement clients: ${err.message}`);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const fetchProjects = useCallback(async (clientId: string | null) => {
      if (!clientId) {
          setProjects([]);
          return;
      }
      setLoadingProjects(true);
      setErrorProjects(null);
      setProjects([]);
      try {
          const { data, error } = await supabase
              .from('projects')
              .select('*')
              .eq('client_id', clientId)
              .order('nom', { ascending: true });
          if (error) throw error;
          setProjects(data || []);
      } catch (err: any) {
          setErrorProjects(err.message);
          toast.error(`Erreur chargement projets: ${err.message}`);
      } finally {
          setLoadingProjects(false);
      }
  }, []);

  // --- Effects ---
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchClients();
    }
  }, [user, fetchClients]);

  useEffect(() => {
      fetchProjects(selectedClientId);
  }, [selectedClientId, fetchProjects]);

  useEffect(() => {
    if (editingClient) {
      setEditClientData({
        nom: editingClient.nom || "",
        adresse: editingClient.adresse || "",
        email_facturation: editingClient.email_facturation || "",
        telephone: editingClient.telephone || "",
        tarif_horaire: editingClient.tarif_horaire ?? "",
      });
    }
  }, [editingClient]);

  useEffect(() => {
      if (editingProject) {
          setEditProjectData({ nom: editingProject.nom || "" });
      }
  }, [editingProject]);


  // --- Event Handlers ---

  // Client Form Input Change
  const handleClientInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    formType: 'add' | 'edit'
  ) => {
    const { name, value } = e.target;
    const setter = formType === 'add' ? setNewClientData : setEditClientData;
    setter((prev) => ({
      ...prev,
      [name]: name === "tarif_horaire" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  // Project Form Input Change (Add & Edit)
  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement>, formType: 'add' | 'edit') => {
      const { name, value } = e.target;
      const setter = formType === 'add' ? setNewProjectData : setEditProjectData;
      setter((prev) => ({ ...prev, [name]: value }));
  }

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAddClient(true);
    if (!newClientData.nom || newClientData.tarif_horaire === "") {
        toast.error("Nom et Tarif Horaire sont obligatoires.");
        setIsSubmittingAddClient(false);
        return;
      }
    try {
      const { error } = await supabase.from('clients').insert([{
        nom: newClientData.nom,
        adresse: newClientData.adresse || null,
        email_facturation: newClientData.email_facturation || null,
        telephone: newClientData.telephone || null,
        tarif_horaire: newClientData.tarif_horaire as number,
      }]);
      if (error) throw error;
      toast.success(`Client "${newClientData.nom}" ajouté.`);
      setIsAddClientDialogOpen(false);
      setNewClientData({ nom: "", adresse: "", email_facturation: "", telephone: "", tarif_horaire: "" });
      fetchClients();
    } catch (err: any) {
      toast.error(`Erreur ajout client: ${err.message}`);
    } finally {
      setIsSubmittingAddClient(false);
    }
  };

  const handleEditClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setIsSubmittingEditClient(true);
    if (!editClientData.nom || editClientData.tarif_horaire === "") {
        toast.error("Nom et Tarif Horaire sont obligatoires.");
        setIsSubmittingEditClient(false);
        return;
      }
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          nom: editClientData.nom,
          adresse: editClientData.adresse || null,
          email_facturation: editClientData.email_facturation || null,
          telephone: editClientData.telephone || null,
          tarif_horaire: editClientData.tarif_horaire as number,
        })
        .eq('id', editingClient.id);
      if (error) throw error;
      toast.success(`Client "${editClientData.nom}" mis à jour.`);
      setIsEditClientDialogOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (err: any) {
      toast.error(`Erreur mise à jour client: ${err.message}`);
    } finally {
      setIsSubmittingEditClient(false);
    }
  };

  const handleDeleteClient = async () => {
      if (!deletingClient) return;
      setIsSubmittingDeleteClient(true);
      try {
          // Check for associated projects
          const { count: projectCount, error: projectsError } = await supabase
              .from('projects')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', deletingClient.id);

          if (projectsError) throw projectsError;

          if (projectCount !== null && projectCount > 0) {
              toast.error(`Impossible de supprimer "${deletingClient.nom}". ${projectCount} projet(s) sont associés.`);
              setIsSubmittingDeleteClient(false);
              setIsDeleteClientDialogOpen(false);
              setDeletingClient(null);
              return;
          }

          // Proceed with deletion
          const { error: deleteError } = await supabase
              .from('clients')
              .delete()
              .eq('id', deletingClient.id);
          if (deleteError) throw deleteError;

          toast.success(`Client "${deletingClient.nom}" supprimé.`);
          setIsDeleteClientDialogOpen(false);
          setDeletingClient(null);
          fetchClients();
          if (selectedClientId === deletingClient.id) {
            setSelectedClientId(null);
          }
      } catch (err: any) {
          toast.error(`Erreur suppression client: ${err.message}`);
      } finally {
          setIsSubmittingDeleteClient(false);
      }
  };

  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !newProjectData.nom) {
        toast.error("Le nom du projet est obligatoire.");
        return;
    }
    setIsSubmittingAddProject(true);
    try {
        const { error } = await supabase.from('projects').insert([{
            nom: newProjectData.nom,
            client_id: selectedClientId,
        }]);
        if (error) throw error;
        toast.success(`Projet "${newProjectData.nom}" ajouté pour ${getSelectedClientName()}.`);
        setIsAddProjectDialogOpen(false);
        setNewProjectData({ nom: "" });
        fetchProjects(selectedClientId);
    } catch (err: any) {
        toast.error(`Erreur ajout projet: ${err.message}`);
    } finally {
        setIsSubmittingAddProject(false);
    }
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectData.nom) {
        toast.error("Le nom du projet est obligatoire.");
        return;
    }
    setIsSubmittingEditProject(true);
    try {
        const { error } = await supabase
            .from('projects')
            .update({ nom: editProjectData.nom })
            .eq('id', editingProject.id);
        if (error) throw error;
        toast.success(`Projet "${editProjectData.nom}" mis à jour.`);
        setIsEditProjectDialogOpen(false);
        setEditingProject(null);
        fetchProjects(selectedClientId);
    } catch (err: any) {
        toast.error(`Erreur mise à jour projet: ${err.message}`);
    } finally {
        setIsSubmittingEditProject(false);
    }
  };

  const handleDeleteProject = async () => {
      if (!deletingProject || !selectedClientId) return;
      setIsSubmittingDeleteProject(true);
      try {
          // Check for associated prestations
          const { count: prestationCount, error: prestationError } = await supabase
              .from('prestations')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', deletingProject.id);

          if (prestationError) throw prestationError;

          if (prestationCount !== null && prestationCount > 0) {
              toast.error(`Impossible de supprimer "${deletingProject.nom}". ${prestationCount} prestation(s) sont associées.`);
              setIsSubmittingDeleteProject(false);
              setIsDeleteProjectDialogOpen(false);
              setDeletingProject(null);
              return;
          }

          // Proceed with deletion
          const { error: deleteError } = await supabase
              .from('projects')
              .delete()
              .eq('id', deletingProject.id);
          if (deleteError) throw deleteError;

          toast.success(`Projet "${deletingProject.nom}" supprimé.`);
          setIsDeleteProjectDialogOpen(false);
          setDeletingProject(null);
          fetchProjects(selectedClientId);
      } catch (err: any) {
          toast.error(`Erreur suppression projet: ${err.message}`);
      } finally {
          setIsSubmittingDeleteProject(false);
      }
  };


  const openEditClientDialog = (client: Client) => {
    setEditingClient(client);
    setIsEditClientDialogOpen(true);
  };

  const openDeleteClientDialog = (client: Client) => {
    setDeletingClient(client);
    setIsDeleteClientDialogOpen(true);
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectDialogOpen(true);
  };

  const openDeleteProjectDialog = (project: Project) => {
    setDeletingProject(project);
    setIsDeleteProjectDialogOpen(true);
  };


  const handleSelectClient = (clientId: string) => {
      setSelectedClientId(prevId => prevId === clientId ? null : clientId);
  };

  // --- Render Logic ---
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }
  if (!user || user.role !== "admin") {
     return null;
  }

  const getSelectedClientName = (): string => {
    if (!selectedClientId) return "";
    const client = clients.find(c => c.id === selectedClientId);
    return client?.nom || "";
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestion Clients et Projets</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Client Management Card --- */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Clients</CardTitle>
                <CardDescription>Ajouter, modifier, supprimer et sélectionner.</CardDescription>
            </div>
            <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
              <DialogTrigger asChild>
                 <Button size="sm">+ Ajouter Client</Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Ajouter un nouveau client</DialogTitle>
                    <DialogDescription>Remplissez les informations.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddClientSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-nom" className="text-right">Nom*</Label>
                        <Input id="add-nom" name="nom" value={newClientData.nom} onChange={(e) => handleClientInputChange(e, 'add')} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-adresse" className="text-right">Adresse</Label>
                        <Input id="add-adresse" name="adresse" value={newClientData.adresse} onChange={(e) => handleClientInputChange(e, 'add')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-email_facturation" className="text-right">Email Fact.</Label>
                        <Input id="add-email_facturation" name="email_facturation" type="email" value={newClientData.email_facturation} onChange={(e) => handleClientInputChange(e, 'add')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-telephone" className="text-right">Téléphone</Label>
                        <Input id="add-telephone" name="telephone" type="tel" value={newClientData.telephone} onChange={(e) => handleClientInputChange(e, 'add')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-tarif_horaire" className="text-right">Tarif (€)*</Label>
                        <Input id="add-tarif_horaire" name="tarif_horaire" type="number" step="0.01" min="0" value={newClientData.tarif_horaire} onChange={(e) => handleClientInputChange(e, 'add')} className="col-span-3" required />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingAddClient}>Annuler</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingAddClient}>{isSubmittingAddClient ? "Ajout..." : "Ajouter"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingClients && <p>Chargement...</p>}
            {errorClients && <p className="text-red-500">Erreur: {errorClients}</p>}
            {!loadingClients && !errorClients && (
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Nom</TableHead>
                     <TableHead>Email</TableHead>
                     <TableHead className="text-right">Tarif</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center">Aucun client.</TableCell></TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow
                        key={client.id}
                        onClick={() => handleSelectClient(client.id)}
                        className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedClientId === client.id && "bg-muted"
                         )}
                      >
                        <TableCell className="font-medium">{client.nom}</TableCell>
                        <TableCell>{client.email_facturation || "-"}</TableCell>
                        <TableCell className="text-right">{client.tarif_horaire ? `${client.tarif_horaire.toFixed(2)} €` : "-"}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm" className="mr-2" onClick={(e) => { e.stopPropagation(); openEditClientDialog(client); }}>Modifier</Button>
                           <AlertDialog open={isDeleteClientDialogOpen && deletingClient?.id === client.id} onOpenChange={(open) => {if(!open) setDeletingClient(null); setIsDeleteClientDialogOpen(open);}}>
                             <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteClientDialog(client); }}>Supprimer</Button>
                             </AlertDialogTrigger>
                           </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* --- Project Management Card --- */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
             <div>
                <CardTitle>Projets {selectedClientId ? `pour ${getSelectedClientName()}` : ""}</CardTitle>
                <CardDescription>Gérer les projets du client sélectionné.</CardDescription>
             </div>
             <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
                 <DialogTrigger asChild>
                    <Button size="sm" disabled={!selectedClientId}>+ Ajouter Projet</Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Ajouter un projet pour {getSelectedClientName()}</DialogTitle>
                        <DialogDescription>Entrez le nom du nouveau projet.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddProjectSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-project-nom" className="text-right">Nom*</Label>
                            <Input
                                id="add-project-nom"
                                name="nom"
                                value={newProjectData.nom}
                                onChange={(e) => handleProjectInputChange(e, 'add')}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingAddProject}>Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isSubmittingAddProject}>{isSubmittingAddProject ? "Ajout..." : "Ajouter Projet"}</Button>
                        </DialogFooter>
                    </form>
                 </DialogContent>
             </Dialog>
          </CardHeader>
          <CardContent>
             {!selectedClientId && (
                <p className="text-muted-foreground text-center py-4">Sélectionnez un client.</p>
             )}
             {selectedClientId && loadingProjects && <p>Chargement...</p>}
             {selectedClientId && errorProjects && <p className="text-red-500">Erreur: {errorProjects}</p>}
             {selectedClientId && !loadingProjects && !errorProjects && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom du Projet</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.length === 0 ? (
                            <TableRow><TableCell colSpan={2} className="text-center">Aucun projet.</TableCell></TableRow>
                        ) : (
                            projects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell className="font-medium">{project.nom}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="mr-2" onClick={() => openEditProjectDialog(project)}>Modifier</Button>
                                         <AlertDialog open={isDeleteProjectDialogOpen && deletingProject?.id === project.id} onOpenChange={(open) => { if (!open) setDeletingProject(null); setIsDeleteProjectDialogOpen(open); }}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteProjectDialog(project); }}>Supprimer</Button>
                                            </AlertDialogTrigger>
                                         </AlertDialog>
                                     </TableCell>
                                 </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
             )}
          </CardContent>
        </Card>

        {/* Edit Client Dialog */}
        <Dialog open={isEditClientDialogOpen} onOpenChange={setIsEditClientDialogOpen}>
             <DialogContent className="sm:max-w-[425px]">
                 <DialogHeader>
                    <DialogTitle>Modifier le client</DialogTitle>
                    <DialogDescription>Mettez à jour "{editingClient?.nom}".</DialogDescription>
                 </DialogHeader>
                 <form onSubmit={handleEditClientSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-nom" className="text-right">Nom*</Label>
                        <Input id="edit-nom" name="nom" value={editClientData.nom} onChange={(e) => handleClientInputChange(e, 'edit')} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-adresse" className="text-right">Adresse</Label>
                        <Input id="edit-adresse" name="adresse" value={editClientData.adresse} onChange={(e) => handleClientInputChange(e, 'edit')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-email_facturation" className="text-right">Email Fact.</Label>
                        <Input id="edit-email_facturation" name="email_facturation" type="email" value={editClientData.email_facturation} onChange={(e) => handleClientInputChange(e, 'edit')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-telephone" className="text-right">Téléphone</Label>
                        <Input id="edit-telephone" name="telephone" type="tel" value={editClientData.telephone} onChange={(e) => handleClientInputChange(e, 'edit')} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-tarif_horaire" className="text-right">Tarif (€)*</Label>
                        <Input id="edit-tarif_horaire" name="tarif_horaire" type="number" step="0.01" min="0" value={editClientData.tarif_horaire} onChange={(e) => handleClientInputChange(e, 'edit')} className="col-span-3" required />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingEditClient}>Annuler</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingEditClient}>{isSubmittingEditClient ? "Mise à jour..." : "Enregistrer"}</Button>
                    </DialogFooter>
                 </form>
             </DialogContent>
        </Dialog>

        {/* Delete Client Confirmation Dialog */}
         <AlertDialog open={isDeleteClientDialogOpen} onOpenChange={(open) => {if (!open) setDeletingClient(null); setIsDeleteClientDialogOpen(open);}}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Supprimer "{deletingClient?.nom}" ? Action irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletingClient(null)} disabled={isSubmittingDeleteClient}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteClient} disabled={isSubmittingDeleteClient}>
                    {isSubmittingDeleteClient ? "Suppression..." : "Confirmer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

          {/* Edit Project Dialog */}
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modifier le projet</DialogTitle>
                    <DialogDescription>Mettez à jour "{editingProject?.nom}".</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditProjectSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-project-nom" className="text-right">Nom*</Label>
                        <Input
                            id="edit-project-nom"
                            name="nom"
                            value={editProjectData.nom}
                            onChange={(e) => handleProjectInputChange(e, 'edit')}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingEditProject}>Annuler</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingEditProject}>{isSubmittingEditProject ? "Mise à jour..." : "Enregistrer"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>

        {/* Delete Project Confirmation Dialog */}
         <AlertDialog open={isDeleteProjectDialogOpen} onOpenChange={(open) => { if (!open) setDeletingProject(null); setIsDeleteProjectDialogOpen(open); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Supprimer "{deletingProject?.nom}" ? Cette action est irréversible et échouera si des prestations sont liées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletingProject(null)} disabled={isSubmittingDeleteProject}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProject} disabled={isSubmittingDeleteProject}>
                    {isSubmittingDeleteProject ? "Suppression..." : "Confirmer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

       </div>
     </div>
  );
}

export default GestionClientsProjets;
