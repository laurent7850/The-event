/** BasicResponse */
export interface BasicResponse {
  /** Message */
  message: string;
}

/** ClientForProjectDisplay */
export interface ClientForProjectDisplay {
  /** Id */
  id: number;
  /** Nom */
  nom: string;
}

/** ClientModel */
export interface ClientModel {
  /** Id */
  id?: string | null;
  /** Nom */
  nom: string;
  /** Adresse */
  adresse?: string | null;
  /** Email Facturation */
  email_facturation?: string | null;
  /** Telephone */
  telephone?: string | null;
  /**
   * Tarif Horaire
   * Hourly rate for the client
   */
  tarif_horaire?: number | null;
  /** Numero Tva */
  numero_tva?: string | null;
}

/** ClientSelectItem */
export interface ClientSelectItem {
  /** Id */
  id: string;
  /** Nom */
  nom: string;
}

/** CreateProfileRequest */
export interface CreateProfileRequest {
  /** User Id */
  user_id: string;
  /** Nom */
  nom: string;
  /** Prenom */
  prenom: string;
  /** Adresse Postale */
  adresse_postale: string;
  /** Genre */
  genre: "Homme" | "Femme" | "Autre" | "Préfère ne pas dire";
  /** Iban */
  iban: string;
  /** Numero National */
  numero_national: string;
  /**
   * Email
   * @format email
   */
  email: string;
}

/** GenerateInvoicesRequest */
export interface GenerateInvoicesRequest {
  /** Month */
  month: number;
  /** Year */
  year: number;
}

/** GenerateInvoicesResponse */
export interface GenerateInvoicesResponse {
  /** Message */
  message: string;
  /** Generated Invoices */
  generated_invoices: GeneratedInvoiceInfo[];
}

/** GeneratedInvoiceInfo */
export interface GeneratedInvoiceInfo {
  /** Client Id */
  client_id: string;
  /** Client Name */
  client_name: string;
  /** Montant Total */
  montant_total: number;
  /** Invoice Id */
  invoice_id: number;
  /** Lien Pdf */
  lien_pdf?: string | null;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/**
 * NewUserNotifyRequest
 * Request model for notifying about user status changes via endpoint.
 */
export interface NewUserNotifyRequest {
  /** User Id */
  user_id: string;
  /** Nom */
  nom?: string | null;
  /** Prenom */
  prenom?: string | null;
  /**
   * Email
   * @format email
   */
  email: string;
  /** Status */
  status?: string | null;
}

/**
 * NotifyResponse
 * Response model for the notification endpoint.
 */
export interface NotifyResponse {
  /** Message */
  message: string;
}

/** PrestationCreate */
export interface PrestationCreate {
  /**
   * Date Prestation
   * Date de la prestation (YYYY-MM-DD)
   * @format date
   */
  date_prestation: string;
  /**
   * Heure Debut
   * Heure de début (HH:MM:SS or HH:MM)
   * @format time
   */
  heure_debut: string;
  /**
   * Heure Fin
   * Heure de fin (HH:MM:SS or HH:MM)
   * @format time
   */
  heure_fin: string;
  /**
   * Client Id
   * ID du client
   */
  client_id: number;
  /**
   * Project Id
   * ID du projet
   */
  project_id: number;
  /**
   * Adresse
   * Adresse spécifique de la prestation si différente du projet/client
   */
  adresse?: string | null;
}

/** PrestationDetails */
export interface PrestationDetails {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Client Id */
  client_id: number;
  /** Project Id */
  project_id: number;
  /**
   * Date Prestation
   * @format date
   */
  date_prestation: string;
  /**
   * Heure Debut
   * @format time
   */
  heure_debut: string;
  /**
   * Heure Fin
   * @format time
   */
  heure_fin: string;
  /** Heures Calculees */
  heures_calculees?: number | null;
  /** Adresse */
  adresse?: string | null;
  /** Statut Validation */
  statut_validation: string;
  /** Tarif Horaire Utilise */
  tarif_horaire_utilise?: number | null;
  /** Admin Comment */
  admin_comment?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Users.Nom */
  "users.nom"?: string | null;
  /** Users.Prenom */
  "users.prenom"?: string | null;
  /** Clients.Nom */
  "clients.nom"?: string | null;
  /** Projects.Nom */
  "projects.nom"?: string | null;
}

/** PrestationDisplay */
export interface PrestationDisplay {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Client Id */
  client_id: number;
  /** Project Id */
  project_id: number;
  /**
   * Date Prestation
   * @format date
   */
  date_prestation: string;
  /**
   * Heure Debut
   * @format time
   */
  heure_debut: string;
  /**
   * Heure Fin
   * @format time
   */
  heure_fin: string;
  /**
   * Heures Calculees
   * Durée calculée en heures
   */
  heures_calculees: number;
  /** Adresse */
  adresse: string | null;
  /**
   * Statut Validation
   * @default "en_attente_validation"
   */
  statut_validation?: string;
}

/** PrestationUpdate */
export interface PrestationUpdate {
  /** Date Prestation */
  date_prestation?: string | null;
  /** Heure Debut */
  heure_debut?: string | null;
  /** Heure Fin */
  heure_fin?: string | null;
  /** Client Id */
  client_id?: number | null;
  /** Project Id */
  project_id?: number | null;
  /** Adresse */
  adresse?: string | null;
  /** Admin Comment */
  admin_comment?: string | null;
}

/** ProjectCreate */
export interface ProjectCreate {
  /**
   * Nom
   * Nom du projet
   */
  nom: string;
  /**
   * Client Id
   * ID du client associé (integer)
   */
  client_id: number;
}

/** ProjectDisplay */
export interface ProjectDisplay {
  /**
   * Nom
   * Nom du projet
   */
  nom: string;
  /**
   * Client Id
   * ID du client associé (integer)
   */
  client_id: number;
  /** Id */
  id: number;
  /** Client associé (récupéré via relation) */
  clients?: ClientForProjectDisplay | null;
}

/** ProjectForSelect */
export interface ProjectForSelect {
  /** Id */
  id: number;
  /** Nom */
  nom: string;
  /** Client Id */
  client_id: number;
}

/** ProjectUpdate */
export interface ProjectUpdate {
  /**
   * Nom
   * Nouveau nom du projet
   */
  nom?: string | null;
  /**
   * Client Id
   * Nouvel ID du client associé (integer)
   */
  client_id?: number | null;
}

/** StatusResponse */
export interface StatusResponse {
  /** Message */
  message: string;
}

/** UserIdRequest */
export interface UserIdRequest {
  /** User Id */
  user_id: string;
}

/** UserInfo */
export interface UserInfo {
  /** Id */
  id: string;
  /** Nom */
  nom?: string | null;
  /** Prenom */
  prenom?: string | null;
  /** Email */
  email?: string | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** ValidationResponse */
export interface ValidationResponse {
  /** Message */
  message: string;
  /** Prestation Id */
  prestation_id: number;
  /** Status */
  status: string;
}

export type CheckHealthData = HealthResponse;

export type GenerateMonthlyInvoicesData = GenerateInvoicesResponse;

export type GenerateMonthlyInvoicesError = HTTPValidationError;

export type CheckInvoicingHealthData = any;

export type CreateProfileData = BasicResponse;

export type CreateProfileError = HTTPValidationError;

/** Response Validation List Pending Users */
export type ValidationListPendingUsersData = UserInfo[];

export type ValidationApproveUserData = StatusResponse;

export type ValidationApproveUserError = HTTPValidationError;

export type ValidationRejectUserData = StatusResponse;

export type ValidationRejectUserError = HTTPValidationError;

/** Response List Clients */
export type ListClientsData = ClientModel[];

/** Response List Clients For Select */
export type ListClientsForSelectData = ClientSelectItem[];

export type CreateClientData = ClientModel;

export type CreateClientError = HTTPValidationError;

export interface UpdateClientParams {
  /** Client Id */
  clientId: string;
}

export type UpdateClientData = ClientModel;

export type UpdateClientError = HTTPValidationError;

export interface DeleteClientParams {
  /** Client Id */
  clientId: string;
}

export type DeleteClientData = BasicResponse;

export type DeleteClientError = HTTPValidationError;

/** Response List Projects */
export type ListProjectsData = ProjectDisplay[];

export type CreateProjectData = ProjectDisplay;

export type CreateProjectError = HTTPValidationError;

export interface ListProjectsForSelectParams {
  /**
   * Client Id
   * Filter projects by client ID (integer)
   */
  client_id?: number | null;
}

/** Response List Projects For Select */
export type ListProjectsForSelectData = ProjectForSelect[];

export type ListProjectsForSelectError = HTTPValidationError;

export interface UpdateProjectParams {
  /** Project Id */
  projectId: number;
}

export type UpdateProjectData = ProjectDisplay;

export type UpdateProjectError = HTTPValidationError;

export interface DeleteProjectParams {
  /** Project Id */
  projectId: number;
}

export type DeleteProjectData = BasicResponse;

export type DeleteProjectError = HTTPValidationError;

export type CreatePrestationData = PrestationDisplay;

export type CreatePrestationError = HTTPValidationError;

export type NotifyNewUserRegistrationData = NotifyResponse;

export type NotifyNewUserRegistrationError = HTTPValidationError;

/** Response List Pending Prestations */
export type ListPendingPrestationsData = PrestationDetails[];

export interface ValidatePrestationParams {
  /** Prestation Id */
  prestationId: number;
}

export type ValidatePrestationData = ValidationResponse;

export type ValidatePrestationError = HTTPValidationError;

export interface UpdatePrestationParams {
  /** Prestation Id */
  prestationId: number;
}

export type UpdatePrestationData = PrestationDetails;

export type UpdatePrestationError = HTTPValidationError;
