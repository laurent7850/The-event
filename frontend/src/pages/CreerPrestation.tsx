import React, { useState, useEffect } from 'react';
import brain from "brain"; // Import the brain client
import { ClientForSelect, ProjectForSelect } from "types"; // Import necessary types
import { useAuth } from 'utils/AuthContext'; // Import useAuth to check user role if needed later
import { toast } from 'sonner'; // For potential future notifications

// Shadcn UI components will be added later
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button"; // Import Button
// import { DatePicker } from "@/components/ui/date-picker"; // Assuming you'll create/use a DatePicker

const CreerPrestation: React.FC = () => {
  const { user } = useAuth(); // Get user info if needed for authorization checks
  const [clients, setClients] = useState<ClientForSelect[]>([]);
  const [projects, setProjects] = useState<ProjectForSelect[]>([]); // Stores all projects
  const [filteredProjects, setFilteredProjects] = useState<ProjectForSelect[]>([]); // Stores projects for the selected client
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Add submission loading state

  // Form field states
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  // TODO: Add state for other fields (date, startTime, endTime, address)
  const [date, setDate] = useState<string>(""); // Store date as YYYY-MM-DD string
  const [startTime, setStartTime] = useState<string>(""); // Store time as HH:MM string
  const [endTime, setEndTime] = useState<string>(""); // Store time as HH:MM string
  const [address, setAddress] = useState<string>("");

  // Effect for initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log("CreerPrestation: Fetching clients and projects...");
      try {
        // Fetch clients
        const clientsResponse = await brain.list_clients_for_select({});
        if (!clientsResponse.ok) {
          const errorData = await clientsResponse.json();
          throw new Error(errorData.detail || 'Failed to fetch clients');
        }
        const clientsData: ClientForSelect[] = await clientsResponse.json();
        setClients(clientsData);
        console.log("Clients fetched:", clientsData);

        // Fetch all projects initially
        const projectsResponse = await brain.list_projects_for_select({});
         if (!projectsResponse.ok) {
          const errorData = await projectsResponse.json();
          throw new Error(errorData.detail || 'Failed to fetch projects');
        }
        const projectsData: ProjectForSelect[] = await projectsResponse.json();
        setProjects(projectsData);
        console.log("Projects fetched:", projectsData);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "An unexpected error occurred while fetching initial data.");
        toast.error(err.message || "An unexpected error occurred while fetching initial data.");
      } finally {
        setIsLoading(false);
        console.log("CreerPrestation: Fetching complete.");
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // Effect to filter projects when client changes and reset project selection
  useEffect(() => {
    if (selectedClientId) {
      const clientProjects = projects.filter(
        (project) => project.client_id === parseInt(selectedClientId, 10)
      );
      setFilteredProjects(clientProjects);
      setSelectedProjectId(undefined); // Reset project selection when client changes
      console.log(`Filtered projects for client ${selectedClientId}:`, clientProjects);
    } else {
      setFilteredProjects([]); // Clear filtered projects if no client is selected
      setSelectedProjectId(undefined); // Reset project selection
    }
  }, [selectedClientId, projects]); // Re-run when client selection or the main projects list changes

  // TODO: Add handler functions for form input changes
  // TODO: Add handler function for form submission

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    setIsSubmitting(true);
    console.log("Form submitted. Validating...");

    // Basic Validation
    if (!selectedClientId || !selectedProjectId || !date || !startTime || !endTime || !address) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      setIsSubmitting(false);
      return;
    }

    // TODO: Add more specific validation (e.g., time format, end time after start time)

    const payload = {
      client_id: parseInt(selectedClientId, 10),
      project_id: parseInt(selectedProjectId, 10),
      date_prestation: date, // Already YYYY-MM-DD
      heure_debut: startTime, // Already HH:MM
      heure_fin: endTime, // Already HH:MM
      adresse: address,
      // heures_calculees is calculated backend-side
      // user_id is likely inferred backend-side from the authenticated user
    };

    console.log("Submitting payload:", payload);

    try {
      const response = await brain.create_prestation(payload);
       if (!response.ok) {
          let errorDetail = "Erreur lors de la création de la prestation.";
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
          } catch (e) { 
            // Ignore if parsing error response fails
          } 
          throw new Error(errorDetail);
        }

      const result = await response.json();
      console.log("Prestation created:", result);
      toast.success("Prestation enregistrée avec succès !");

      // Reset form (optional)
      setSelectedClientId(undefined);
      setSelectedProjectId(undefined);
      setDate("");
      setStartTime("");
      setEndTime("");
      setAddress("");
      // Note: filteredProjects will reset automatically due to useEffect dependency

    } catch (err: any) {
      console.error("Error submitting prestation:", err);
      toast.error(err.message || "Une erreur inattendue s'est produite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col flex-grow">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Encoder une Prestation</h1>

      {isLoading && (
         <div className="flex items-center justify-center flex-grow">
           <p className="text-muted-foreground">Chargement des données...</p>
           {/* Consider adding a Skeleton loader here later */}
         </div>
      )}
      
      {error && (
        <div className="flex items-center justify-center flex-grow">
           <p className="text-destructive">Erreur: {error}</p>
        </div>
       )}

      {!isLoading && !error && (
        <div className="bg-card p-6 rounded-lg shadow-md border border-border">
           <form className="space-y-6" onSubmit={handleSubmit}>
             {/* Client Select */}
             <div className="space-y-2">
                <Label htmlFor="client-select">Client</Label>
                <Select 
                  value={selectedClientId} 
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger id="client-select" className="w-full">
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Clients</SelectLabel>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.nom}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
             </div>

             {/* Project Select */}
             <div className="space-y-2">
                <Label htmlFor="project-select">Projet</Label>
                 <Select 
                  value={selectedProjectId} 
                  onValueChange={setSelectedProjectId}
                  disabled={!selectedClientId || filteredProjects.length === 0} // Disable if no client or no projects for client
                >
                  <SelectTrigger id="project-select" className="w-full">
                    <SelectValue placeholder={!selectedClientId ? "Sélectionnez d'abord un client" : "Sélectionnez un projet"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Projets</SelectLabel>
                      {filteredProjects.length === 0 && selectedClientId && (
                         <SelectItem value="no-projects" disabled>
                           Aucun projet pour ce client
                         </SelectItem>
                      )}
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.nom}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
             </div>

             {/* Date Input */}
             <div className="space-y-2">
               <Label htmlFor="date">Date de la prestation</Label>
               <Input 
                 id="date" 
                 type="date" 
                 value={date} 
                 onChange={(e) => setDate(e.target.value)} 
                 className="w-full"
               />
             </div>

            {/* Time Inputs (Start and End) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Heure de début</Label>
                <Input 
                  id="start-time" 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  className="w-full"
                 />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Heure de fin</Label>
                <Input 
                  id="end-time" 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  className="w-full"
                />
              </div>
            </div>

            {/* Address Textarea */}
            <div className="space-y-2">
               <Label htmlFor="address">Adresse de la prestation</Label>
               <Textarea 
                 id="address" 
                 value={address} 
                 onChange={(e) => setAddress(e.target.value)} 
                 placeholder="Entrez l'adresse complète..."
                 className="w-full"
                 rows={3}
               />
            </div>

             {/* Submit Button Area */}

             <Button 
               type="submit" 
               className="w-full md:w-auto" // Adjust width as needed
               disabled={isSubmitting} // Disable while submitting
             >
              {isSubmitting ? "Enregistrement..." : "Soumettre la Prestation"}
             </Button>
           </form>
        </div>
      )}
    </main>
  );
};

export default CreerPrestation;
