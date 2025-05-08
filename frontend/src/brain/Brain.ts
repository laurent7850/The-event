import {
  CheckHealthData,
  CheckInvoicingHealthData,
  ClientModel,
  CreateClientData,
  CreateClientError,
  CreatePrestationData,
  CreatePrestationError,
  CreateProfileData,
  CreateProfileError,
  CreateProfileRequest,
  CreateProjectData,
  CreateProjectError,
  DeleteClientData,
  DeleteClientError,
  DeleteClientParams,
  DeleteProjectData,
  DeleteProjectError,
  DeleteProjectParams,
  GenerateInvoicesRequest,
  GenerateMonthlyInvoicesData,
  GenerateMonthlyInvoicesError,
  ListClientsData,
  ListClientsForSelectData,
  ListPendingPrestationsData,
  ListProjectsData,
  ListProjectsForSelectData,
  ListProjectsForSelectError,
  ListProjectsForSelectParams,
  NewUserNotifyRequest,
  NotifyNewUserRegistrationData,
  NotifyNewUserRegistrationError,
  PrestationCreate,
  PrestationUpdate,
  ProjectCreate,
  ProjectUpdate,
  UpdateClientData,
  UpdateClientError,
  UpdateClientParams,
  UpdatePrestationData,
  UpdatePrestationError,
  UpdatePrestationParams,
  UpdateProjectData,
  UpdateProjectError,
  UpdateProjectParams,
  UserIdRequest,
  ValidatePrestationData,
  ValidatePrestationError,
  ValidatePrestationParams,
  ValidationApproveUserData,
  ValidationApproveUserError,
  ValidationListPendingUsersData,
  ValidationRejectUserData,
  ValidationRejectUserError,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Generates monthly invoices based on validated work sessions (prestations). Creates a PDF invoice, uploads it to Supabase Storage, and links it. Checks for existing invoices for the same client/month/year before creating.
   *
   * @tags Invoicing, dbtn/module:invoicing
   * @name generate_monthly_invoices
   * @summary Generate Monthly Invoices
   * @request POST:/routes/generate-monthly-invoices
   * @secure
   */
  generate_monthly_invoices = (data: GenerateInvoicesRequest, params: RequestParams = {}) =>
    this.request<GenerateMonthlyInvoicesData, GenerateMonthlyInvoicesError>({
      path: `/routes/generate-monthly-invoices`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags Health, dbtn/module:invoicing
   * @name check_invoicing_health
   * @summary Check Invoicing Health
   * @request GET:/routes/health
   */
  check_invoicing_health = (params: RequestParams = {}) =>
    this.request<CheckInvoicingHealthData, any>({
      path: `/routes/health`,
      method: "GET",
      ...params,
    });

  /**
   * @description Creates a user profile entry in the 'users' table using the service key. This endpoint is intended to be called right after successful user signup.
   *
   * @tags Profile Management, dbtn/module:profile_management
   * @name create_profile
   * @summary Create Profile
   * @request POST:/routes/profiles/create
   */
  create_profile = (data: CreateProfileRequest, params: RequestParams = {}) =>
    this.request<CreateProfileData, CreateProfileError>({
      path: `/routes/profiles/create`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Fetches users with 'en_attente' validation status. Requires admin role.
   *
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_list_pending_users
   * @summary Validation List Pending Users
   * @request GET:/routes/user-validation/pending
   * @secure
   */
  validation_list_pending_users = (params: RequestParams = {}) =>
    this.request<ValidationListPendingUsersData, any>({
      path: `/routes/user-validation/pending`,
      method: "GET",
      secure: true,
      ...params,
    });

  /**
   * @description Approves a user by setting their status to 'valide' and notifies them. Requires admin role.
   *
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_approve_user
   * @summary Validation Approve User
   * @request POST:/routes/user-validation/approve
   * @secure
   */
  validation_approve_user = (data: UserIdRequest, params: RequestParams = {}) =>
    this.request<ValidationApproveUserData, ValidationApproveUserError>({
      path: `/routes/user-validation/approve`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Rejects a user by setting their status to 'refuse' and notifies them. Requires admin role.
   *
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_reject_user
   * @summary Validation Reject User
   * @request POST:/routes/user-validation/reject
   * @secure
   */
  validation_reject_user = (data: UserIdRequest, params: RequestParams = {}) =>
    this.request<ValidationRejectUserData, ValidationRejectUserError>({
      path: `/routes/user-validation/reject`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Fetches all clients with their full details.
   *
   * @tags Clients, dbtn/module:clients
   * @name list_clients
   * @summary List Clients
   * @request GET:/routes/clients/all
   */
  list_clients = (params: RequestParams = {}) =>
    this.request<ListClientsData, any>({
      path: `/routes/clients/all`,
      method: "GET",
      ...params,
    });

  /**
   * @description Fetches all clients, returning only ID and name for selection lists.
   *
   * @tags Clients, dbtn/module:clients
   * @name list_clients_for_select
   * @summary List Clients For Select
   * @request GET:/routes/clients/
   */
  list_clients_for_select = (params: RequestParams = {}) =>
    this.request<ListClientsForSelectData, any>({
      path: `/routes/clients/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Creates a new client using direct service key connection with raw SQL.
   *
   * @tags Clients, dbtn/module:clients
   * @name create_client
   * @summary Create Client
   * @request POST:/routes/clients/
   */
  create_client = (data: ClientModel, params: RequestParams = {}) =>
    this.request<CreateClientData, CreateClientError>({
      path: `/routes/clients/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Updates an existing client by ID. Requires appropriate permissions.
   *
   * @tags Clients, dbtn/module:clients
   * @name update_client
   * @summary Update Client
   * @request PUT:/routes/clients/{client_id}
   */
  update_client = ({ clientId, ...query }: UpdateClientParams, data: ClientModel, params: RequestParams = {}) =>
    this.request<UpdateClientData, UpdateClientError>({
      path: `/routes/clients/${clientId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Deletes a client by ID. Requires appropriate permissions.
   *
   * @tags Clients, dbtn/module:clients
   * @name delete_client
   * @summary Delete Client
   * @request DELETE:/routes/clients/{client_id}
   */
  delete_client = ({ clientId, ...query }: DeleteClientParams, params: RequestParams = {}) =>
    this.request<DeleteClientData, DeleteClientError>({
      path: `/routes/clients/${clientId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Fetches all projects with their associated client details. Requires admin privileges.
   *
   * @tags Projects, dbtn/module:projects
   * @name list_projects
   * @summary List Projects
   * @request GET:/routes/projects/
   * @secure
   */
  list_projects = (params: RequestParams = {}) =>
    this.request<ListProjectsData, any>({
      path: `/routes/projects/`,
      method: "GET",
      secure: true,
      ...params,
    });

  /**
   * @description Creates a new project linked to a client. Requires admin privileges.
   *
   * @tags Projects, dbtn/module:projects
   * @name create_project
   * @summary Create Project
   * @request POST:/routes/projects/
   * @secure
   */
  create_project = (data: ProjectCreate, params: RequestParams = {}) =>
    this.request<CreateProjectData, CreateProjectError>({
      path: `/routes/projects/`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Fetches projects (id, nom, client_id) for selection lists, optionally filtered by client_id. Requires admin privileges.
   *
   * @tags Projects, dbtn/module:projects
   * @name list_projects_for_select
   * @summary List Projects For Select
   * @request GET:/routes/projects/select
   * @secure
   */
  list_projects_for_select = (query: ListProjectsForSelectParams, params: RequestParams = {}) =>
    this.request<ListProjectsForSelectData, ListProjectsForSelectError>({
      path: `/routes/projects/select`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });

  /**
   * @description Updates an existing project by ID. Requires admin privileges.
   *
   * @tags Projects, dbtn/module:projects
   * @name update_project
   * @summary Update Project
   * @request PUT:/routes/projects/{project_id}
   * @secure
   */
  update_project = ({ projectId, ...query }: UpdateProjectParams, data: ProjectUpdate, params: RequestParams = {}) =>
    this.request<UpdateProjectData, UpdateProjectError>({
      path: `/routes/projects/${projectId}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Deletes a project by ID. Requires admin privileges.
   *
   * @tags Projects, dbtn/module:projects
   * @name delete_project
   * @summary Delete Project
   * @request DELETE:/routes/projects/{project_id}
   * @secure
   */
  delete_project = ({ projectId, ...query }: DeleteProjectParams, params: RequestParams = {}) =>
    this.request<DeleteProjectData, DeleteProjectError>({
      path: `/routes/projects/${projectId}`,
      method: "DELETE",
      secure: true,
      ...params,
    });

  /**
   * @description Permet à un collaborateur authentifié d'encoder une nouvelle prestation. Calcule automatiquement les heures travaillées et initialise le statut à 'en_attente_validation'.
   *
   * @tags Prestations, dbtn/module:prestations
   * @name create_prestation
   * @summary Create Prestation
   * @request POST:/routes/prestations/
   * @secure
   */
  create_prestation = (data: PrestationCreate, params: RequestParams = {}) =>
    this.request<CreatePrestationData, CreatePrestationError>({
      path: `/routes/prestations/`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Endpoint to trigger email notifications based on user status. Calls the internal helper function to perform the actual email sending.
   *
   * @tags dbtn/module:notifications
   * @name notify_new_user_registration
   * @summary Notify New User Registration
   * @request POST:/routes/notify-new-user
   */
  notify_new_user_registration = (data: NewUserNotifyRequest, params: RequestParams = {}) =>
    this.request<NotifyNewUserRegistrationData, NotifyNewUserRegistrationError>({
      path: `/routes/notify-new-user`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Fetches all prestations with status 'en_attente'. Requires admin role.
   *
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name list_pending_prestations
   * @summary List Pending Prestations
   * @request GET:/routes/prestations/pending
   * @secure
   */
  list_pending_prestations = (params: RequestParams = {}) =>
    this.request<ListPendingPrestationsData, any>({
      path: `/routes/prestations/pending`,
      method: "GET",
      secure: true,
      ...params,
    });

  /**
   * @description Validates a specific prestation, setting status and applying client tariff. Requires admin role.
   *
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name validate_prestation
   * @summary Validate a Prestation
   * @request POST:/routes/prestations/{prestation_id}/validate
   * @secure
   */
  validate_prestation = ({ prestationId, ...query }: ValidatePrestationParams, params: RequestParams = {}) =>
    this.request<ValidatePrestationData, ValidatePrestationError>({
      path: `/routes/prestations/${prestationId}/validate`,
      method: "POST",
      secure: true,
      ...params,
    });

  /**
   * @description Updates details of a specific prestation. Recalculates hours if times change. Requires admin role.
   *
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name update_prestation
   * @summary Update a Prestation
   * @request PUT:/routes/prestations/{prestation_id}
   * @secure
   */
  update_prestation = (
    { prestationId, ...query }: UpdatePrestationParams,
    data: PrestationUpdate,
    params: RequestParams = {},
  ) =>
    this.request<UpdatePrestationData, UpdatePrestationError>({
      path: `/routes/prestations/${prestationId}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
}
