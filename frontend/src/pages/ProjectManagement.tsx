// ui/src/pages/ProjectManagement.tsx
import React, { useState, useEffect, useCallback } from "react";
import brain from "brain";
import { ProjectDisplay, ProjectCreatePayload } from "types"; // Removed ProjectUpdatePayload as it's covered by Partial<ProjectCreatePayload>
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, PlusCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProjectForm, ProjectFormProps } from "components/ProjectForm";

export default function ProjectManagement() {
  const [projects, setProjects] = useState<ProjectDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDisplay | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for delete confirmation
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to fetch projects (using useCallback for stability)
  const fetchProjects = useCallback(async () => {
    // Keep loading indicator active if it wasn't just a delete refresh
    if (!isDeleting) {
       setIsLoading(true);
    }
    setError(null);
    try {
      const response = await brain.list_projects();
      const data = await response.json();
      if (response.ok) {
        setProjects(data);
      } else {
        const errorMsg =
          data?.detail || `Erreur ${response.status}: ${response.statusText}`;
        console.error("Failed to fetch projects:", errorMsg);
        setError(
          `Impossible de charger les projets. ${
            response.status === 403
              ? "Accès refusé. Vérifiez les permissions."
              : ""
          }`,
        );
        toast.error("Erreur lors de la récupération des projets.");
      }
    } catch (err) {
      console.error("Network error fetching projects:", err);
      setError("Erreur réseau lors de la récupération des projets.");
      toast.error("Erreur réseau lors de la récupération des projets.");
    } finally {
      setIsLoading(false);
      setIsDeleting(false); // Reset deleting flag after fetch
    }
  }, [isDeleting]); // Add isDeleting dependency

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // --- Event Handlers ---

  const handleAddNew = () => {
    setEditingProject(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (project: ProjectDisplay) => {
    setEditingProject(project);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setEditingProject(null);
  };

  const handleSaveProject: ProjectFormProps["onSubmit"] = async (values) => {
    setIsSubmitting(true);
    const payload = values;

    try {
      let response;
      let successMessage = "";
      let errorMessageBase = "";

      if (editingProject) {
        successMessage = "Projet mis à jour avec succès.";
        errorMessageBase = "Erreur lors de la mise à jour du projet.";
        response = await brain.update_project(
          { project_id: editingProject.id },
          payload,
        );
      } else {
        successMessage = "Projet créé avec succès.";
        errorMessageBase = "Erreur lors de la création du projet.";
        response = await brain.create_project(payload as ProjectCreatePayload);
      }

      const responseData = await response.json();

      if (response.ok) {
        toast.success(successMessage);
        handleSheetClose();
        await fetchProjects();
      } else {
        const errorDetail = responseData?.detail || `Erreur ${response.status}`;
        console.error(errorMessageBase, response.status, responseData);
        // Display specific conflict error from API if available
        if (response.status === 409 && responseData?.detail) {
             toast.error(responseData.detail);
        } else {
             toast.error(`${errorMessageBase} ${errorDetail}`);
        }
      }
    } catch (err) {
      console.error("Network error saving project:", err);
      toast.error("Erreur réseau lors de l'enregistrement du projet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (projectId: number) => {
    setDeletingProjectId(projectId);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProjectId) return;

    setIsDeleting(true); // Indicate deletion is in progress
    setIsAlertOpen(false); // Close dialog immediately

    try {
      // Ensure delete_project only needs { project_id: number }
      const response = await brain.delete_project({ project_id: deletingProjectId });
      const responseData = await response.json(); // Get potential message

      if (response.ok) {
        toast.success(responseData?.message || "Projet supprimé avec succès.");
        // Set isDeleting to true before calling fetchProjects
        // fetchProjects will reset it after completion
        await fetchProjects(); // Refresh list
      } else {
        const errorDetail = responseData?.detail || `Erreur ${response.status}`;
        console.error("Failed to delete project:", response.status, responseData);
         // Display specific conflict error from API if available
        if (response.status === 409 && responseData?.detail) {
             toast.error(responseData.detail); // Show FK constraint error
        } else {
             toast.error(`Erreur lors de la suppression: ${errorDetail}`);
        }
         setIsDeleting(false); // Reset if error occurred before fetch
      }
    } catch (err) {
      console.error("Network error deleting project:", err);
      toast.error("Erreur réseau lors de la suppression du projet.");
      setIsDeleting(false); // Reset on network error
    } finally {
       setDeletingProjectId(null); // Clear ID regardless of outcome
      // isDeleting is reset within fetchProjects finally block
    }
  };

  // --- Render Logic ---

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Projets</CardTitle>
              <CardDescription>
                Visualiser, ajouter, modifier ou supprimer des projets.
              </CardDescription>
            </div>
            <Button onClick={handleAddNew} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Projet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 dark:text-red-400 mb-4">
              Erreur: {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Nom du Projet</TableHead>
                <TableHead>Client Associé</TableHead>
                <TableHead className="text-right w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && projects.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Skeleton className="h-8 w-8 inline-block" />
                      <Skeleton className="h-8 w-8 inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : projects.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    Aucun projet trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className={project.id === deletingProjectId && isDeleting ? "opacity-50" : ""}>
                    <TableCell>{project.id}</TableCell>
                    <TableCell className="font-medium">{project.nom}</TableCell>
                    <TableCell>{project.clients?.nom ?? "N/A"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(project)}
                        aria-label="Modifier"
                        disabled={isDeleting} // Disable buttons during delete
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                        aria-label="Supprimer"
                        onClick={() => handleDeleteClick(project.id)}
                        disabled={isDeleting} // Disable buttons during delete
                      >
                        {isDeleting && deletingProjectId === project.id ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                           <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Add/Edit Sheet --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingProject ? "Modifier le Projet" : "Ajouter un Nouveau Projet"}
            </SheetTitle>
            <SheetDescription>
              {editingProject
                ? "Modifiez les informations du projet ci-dessous."
                : "Remplissez les informations pour créer un nouveau projet."}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <ProjectForm
              initialData={editingProject}
              onSubmit={handleSaveProject}
              onCancel={handleSheetClose}
              isLoading={isSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* --- Delete Confirmation Dialog --- */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le projet sera définitivement supprimé.
              Cela pourrait échouer s'il est lié à des prestations existantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
