import React, { useState, useEffect } from 'react';
import { supabase } from "utils/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // For delete confirmation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

// Interface for Client
interface Client {
  id: string;
  nom: string | null;
}

// Interface for Project
interface Project {
  id: string;
  nom: string | null;
  client_id: string | null;
  clients: Client | null;
}

// Zod schema
const projectFormSchema = z.object({
  nom: z.string().min(1, { message: "Le nom du projet est obligatoire." }),
  client_id: z.string({ required_error: "Veuillez sélectionner un client."}).min(1, "Veuillez sélectionner un client."),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // React Hook Form setup
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      nom: "",
      client_id: "",
    },
  });

  // Function to fetch data
  const fetchData = async () => {
    if (!loading) setLoading(true);
    setError(null);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(`id, nom, client_id, clients (id, nom)`)
        .order("nom", { ascending: true });
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, nom")
        .order("nom", { ascending: true });
      if (clientsError) throw clientsError;
      setClients(clientsData || []);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Une erreur est survenue lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // onSubmit for adding/editing projects
  const onSubmit = async (values: ProjectFormValues) => {
    try {
      let operationPromise;
      const projectData = { nom: values.nom, client_id: values.client_id };
      if (editingProject) {
        console.log("Submitting update for project:", editingProject.id, values);
        operationPromise = supabase.from("projects").update(projectData).eq("id", editingProject.id);
      } else {
        console.log("Submitting new project:", values);
        operationPromise = supabase.from("projects").insert([projectData]);
      }
      const { error } = await operationPromise;
      if (error) throw error;
      toast.success(editingProject ? "Projet mis à jour avec succès !" : "Projet ajouté avec succès !");
      setIsModalOpen(false);
      setEditingProject(null);
      form.reset();
      await fetchData();
    } catch (err: any) {
      console.error(editingProject ? "Error updating project:" : "Error adding project:", err);
      toast.error(editingProject ? `Erreur lors de la mise à jour: ${err.message}` : `Erreur lors de l'ajout: ${err.message}`);
    }
  };

  // Handle Add click
  const handleAddClick = () => {
    setEditingProject(null);
    form.reset({ nom: "", client_id: "" });
    setIsModalOpen(true);
  };

  // Handle Edit click
   const handleEditClick = (project: Project) => {
     setEditingProject(project);
     form.reset({ nom: project.nom || "", client_id: project.client_id || "" });
     setIsModalOpen(true);
   };

  // Handle Delete click (open confirmation)
   const handleDeleteClick = (project: Project) => {
     setProjectToDelete(project);
     setIsDeleteDialogOpen(true);
   };

   // Handle Delete confirmation
   const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id);
      if (error) throw error;
      toast.success("Projet supprimé avec succès !");
      setProjects(projects.filter(p => p.id !== projectToDelete.id)); // Optimistic update
      // await fetchData(); // Option to refetch
    } catch (err: any) {
      console.error("Error deleting project:", err);
      toast.error(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Projets</h1>
        <Button onClick={handleAddClick}>Ajouter un Projet</Button>
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
            <TableCaption>Liste des projets enregistrés.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du Projet</TableHead>
                <TableHead>Client Associé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length > 0 ? (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.nom ?? "-"}</TableCell>
                    <TableCell>{project.clients?.nom ?? "Client non trouvé"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditClick(project)}>
                        Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(project)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    Aucun projet trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal for Add/Edit Project */}
      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingProject(null);
              form.reset();
          }
          setIsModalOpen(isOpen);
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Modifier le projet" : "Ajouter un nouveau projet"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Modifiez les détails du projet." : "Remplissez les détails du nouveau projet."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="project-form">
              {/* Form fields remain the same */}
               <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du Projet *</FormLabel>
                    <FormControl><Input placeholder="Nom du projet" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Associé *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez un client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom ?? `ID: ${client.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Annuler</Button>
            </DialogClose>
            <Button type="submit" form="project-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enregistrement..." : (editingProject ? "Mettre à jour" : "Enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment supprimer le projet "<strong>{projectToDelete?.nom ?? ""}</strong>" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Confirmer la suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AdminProjects;
