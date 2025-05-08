import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "utils/supabase";
import brain from "brain";
import { toast } from "sonner"; // Import toast
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BasicResponse } from "types"; // Assuming this is the type for the create_profile response
import { APP_BASE_PATH } from "app"; // Assuming APP_BASE_PATH is available

// Define Zod schema for validation
const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  adresse: z.string().min(1, "L\'adresse est requise"),
  genre: z.enum(["Homme", "Femme", "Autre", "Préfère ne pas dire"], {
    required_error: "Le genre est requis",
  }),
  // Stronger IBAN validation
  iban: z.string()
    .regex(/^[A-Z]{2}[0-9]{2}(?:[ ]?[0-9]{4}){3}(?:[ ]?[0-9]{1,2})?$/, "Format IBAN invalide (ex: BE68539007547034)")
    .min(1, "Le numéro IBAN est requis"),
  // Belgian National Number validation (accepts XX.XX.XX-XXX.XX or XXXXXXXXXX)
  numeroNational: z.string()
    .regex(/^(\d{2}\.\d{2}\.\d{2}-\d{3}\.\d{2}|\d{11})$/, "Format Numéro National Belge invalide (XX.XX.XX-XXX.XX ou XXXXXXXXXX)")
    .min(1, "Le numéro national est requis"),
  email: z.string().email("Adresse email invalide").min(1, "L\'email est requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});


export default function Inscription() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      adresse: "",
      genre: undefined,
      iban: "",
      numeroNational: "",
      email: "",
      password: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("[Inscription Page] Form submitted with data:", values);
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        // Options can be added here if needed, like email confirmation redirection
      });

      if (authError) {
        console.error("[Inscription Page] Supabase auth signup error:", authError);
        // More specific error mapping
        if (authError.message.includes("User already registered")) {
          setError("Un utilisateur avec cet email existe déjà.");
          toast.error("Un utilisateur avec cet email existe déjà.");
        } else {
          setError(`Erreur d'authentification: ${authError.message}`);
          toast.error(`Erreur d'authentification: ${authError.message}`);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        console.error("[Inscription Page] Supabase auth signup did not return a user.");
        setError("Erreur lors de la création de l'utilisateur. Pas d'utilisateur retourné.");
        toast.error("Erreur lors de la création de l'utilisateur.");
        setIsLoading(false);
        return;
      }

      console.log("[Inscription Page] Supabase user created:", authData.user.id);

      // 2. Create User Profile via Backend Endpoint
      const profilePayload = {
        user_id: authData.user.id, // Ensure this matches the backend Pydantic model field name
        nom: values.nom,
        prenom: values.prenom,
        adresse_postale: values.adresse, // Ensure name matches backend
        genre: values.genre,
        iban: values.iban,
        numero_national: values.numeroNational, // Ensure name matches backend
        email: values.email,
      };

      console.log(`Calling brain.create_profile for user ${authData.user.id}...`);

      const response = await brain.create_profile(profilePayload);

      // Check response status (brain client returns HttpResponse)
      if (!response.ok) {
        const errorData = await response.json(); // Attempt to get error details
        console.error("[Inscription Page] Backend profile creation failed:", response.status, errorData);

        // --- START NEW 409 HANDLING ---
        if (response.status === 409) {
            const detail = errorData?.detail || "Un profil avec ces informations existe déjà.";
            setError(detail); // Set component error state
            toast.error(detail); // Show toast notification
        } else {
             const detail = errorData?.detail || `Erreur ${response.status} lors de la création du profil.`;
             setError(detail);
             toast.error(detail);
        }
        // --- END NEW 409 HANDLING ---

        setIsLoading(false);
        // Optional: Consider deleting the auth user if profile creation fails?
        // This adds complexity (handling delete errors, etc.)
        return;
      }

      // If successful
      const result: BasicResponse = await response.json();
      console.log("[Inscription Page] Backend profile creation successful:", result.message);
      toast.success("Inscription réussie ! Votre compte est en attente de validation.");

      // Redirect to a waiting page or login page
      // Might need a specific page like /en-attente-validation
      navigate("/en-attente-validation"); // Redirect to waiting page

    } catch (error: any) {
      // Catch unexpected errors (network issues, client-side logic errors)
      console.error("[Inscription Page] Unexpected error during submission:", error);
      const errorMessage = error.message || "Une erreur inattendue est survenue.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    console.log("[Inscription Page] Component rendering started.");
  }, []);

   console.log("[Inscription Page] Rendering JSX...");

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Inscription Collaborateur</CardTitle>
          <CardDescription className="text-center">Créez votre compte pour accéder à EventFlow.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom */}
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre nom de famille" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Prénom */}
                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre prénom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Adresse */}
              <FormField
                control={form.control}
                name="adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse Postale Complète</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro, Rue, Code Postal, Ville, Pays" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Genre */}
                 <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez votre genre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Homme">Homme</SelectItem>
                          <SelectItem value="Femme">Femme</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                          <SelectItem value="Préfère ne pas dire">Préfère ne pas dire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* IBAN */}
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de Compte Bancaire (IBAN)</FormLabel>
                      <FormControl>
                        <Input placeholder="BE00 0000 0000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Numéro National */}
              <FormField
                control={form.control}
                name="numeroNational"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro National Belge</FormLabel>
                    <FormControl>
                      <Input placeholder="XX.XX.XX-XXX.XX ou XXXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse Email (Identifiant)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="exemple@domaine.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de Passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Choisissez un mot de passe sécurisé" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display general error messages */}
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Inscription en cours..." : "S'inscrire"}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="flex justify-center">
           <p className="text-sm text-muted-foreground">
             Déjà un compte ?{" "}
             <a href={`${APP_BASE_PATH}/connexion`} className="underline hover:text-primary">
               Se connecter
             </a>
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}
