import {
  CheckHealthData,
  CheckInvoicingHealthData,
  ClientModel,
  CreateClientData,
  CreatePrestationData,
  CreateProfileData,
  CreateProfileRequest,
  CreateProjectData,
  DeleteClientData,
  DeleteProjectData,
  GenerateInvoicesRequest,
  GenerateMonthlyInvoicesData,
  ListClientsData,
  ListClientsForSelectData,
  ListPendingPrestationsData,
  ListProjectsData,
  ListProjectsForSelectData,
  NewUserNotifyRequest,
  NotifyNewUserRegistrationData,
  PrestationCreate,
  PrestationUpdate,
  ProjectCreate,
  ProjectUpdate,
  UpdateClientData,
  UpdatePrestationData,
  UpdateProjectData,
  UserIdRequest,
  ValidatePrestationData,
  ValidationApproveUserData,
  ValidationListPendingUsersData,
  ValidationRejectUserData,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Generates monthly invoices based on validated work sessions (prestations). Creates a PDF invoice, uploads it to Supabase Storage, and links it. Checks for existing invoices for the same client/month/year before creating.
   * @tags Invoicing, dbtn/module:invoicing
   * @name generate_monthly_invoices
   * @summary Generate Monthly Invoices
   * @request POST:/routes/generate-monthly-invoices
   * @secure
   */
  export namespace generate_monthly_invoices {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateInvoicesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateMonthlyInvoicesData;
  }

  /**
   * No description
   * @tags Health, dbtn/module:invoicing
   * @name check_invoicing_health
   * @summary Check Invoicing Health
   * @request GET:/routes/health
   */
  export namespace check_invoicing_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckInvoicingHealthData;
  }

  /**
   * @description Creates a user profile entry in the 'users' table using the service key. This endpoint is intended to be called right after successful user signup.
   * @tags Profile Management, dbtn/module:profile_management
   * @name create_profile
   * @summary Create Profile
   * @request POST:/routes/profiles/create
   */
  export namespace create_profile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateProfileRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProfileData;
  }

  /**
   * @description Fetches users with 'en_attente' validation status. Requires admin role.
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_list_pending_users
   * @summary Validation List Pending Users
   * @request GET:/routes/user-validation/pending
   * @secure
   */
  export namespace validation_list_pending_users {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ValidationListPendingUsersData;
  }

  /**
   * @description Approves a user by setting their status to 'valide' and notifies them. Requires admin role.
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_approve_user
   * @summary Validation Approve User
   * @request POST:/routes/user-validation/approve
   * @secure
   */
  export namespace validation_approve_user {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserIdRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ValidationApproveUserData;
  }

  /**
   * @description Rejects a user by setting their status to 'refuse' and notifies them. Requires admin role.
   * @tags User Validation, dbtn/module:user_validation
   * @name validation_reject_user
   * @summary Validation Reject User
   * @request POST:/routes/user-validation/reject
   * @secure
   */
  export namespace validation_reject_user {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserIdRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ValidationRejectUserData;
  }

  /**
   * @description Fetches all clients with their full details.
   * @tags Clients, dbtn/module:clients
   * @name list_clients
   * @summary List Clients
   * @request GET:/routes/clients/all
   */
  export namespace list_clients {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListClientsData;
  }

  /**
   * @description Fetches all clients, returning only ID and name for selection lists.
   * @tags Clients, dbtn/module:clients
   * @name list_clients_for_select
   * @summary List Clients For Select
   * @request GET:/routes/clients/
   */
  export namespace list_clients_for_select {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListClientsForSelectData;
  }

  /**
   * @description Creates a new client using direct service key connection with raw SQL.
   * @tags Clients, dbtn/module:clients
   * @name create_client
   * @summary Create Client
   * @request POST:/routes/clients/
   */
  export namespace create_client {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClientModel;
    export type RequestHeaders = {};
    export type ResponseBody = CreateClientData;
  }

  /**
   * @description Updates an existing client by ID. Requires appropriate permissions.
   * @tags Clients, dbtn/module:clients
   * @name update_client
   * @summary Update Client
   * @request PUT:/routes/clients/{client_id}
   */
  export namespace update_client {
    export type RequestParams = {
      /** Client Id */
      clientId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClientModel;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateClientData;
  }

  /**
   * @description Deletes a client by ID. Requires appropriate permissions.
   * @tags Clients, dbtn/module:clients
   * @name delete_client
   * @summary Delete Client
   * @request DELETE:/routes/clients/{client_id}
   */
  export namespace delete_client {
    export type RequestParams = {
      /** Client Id */
      clientId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClientData;
  }

  /**
   * @description Fetches all projects with their associated client details. Requires admin privileges.
   * @tags Projects, dbtn/module:projects
   * @name list_projects
   * @summary List Projects
   * @request GET:/routes/projects/
   * @secure
   */
  export namespace list_projects {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListProjectsData;
  }

  /**
   * @description Creates a new project linked to a client. Requires admin privileges.
   * @tags Projects, dbtn/module:projects
   * @name create_project
   * @summary Create Project
   * @request POST:/routes/projects/
   * @secure
   */
  export namespace create_project {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ProjectCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProjectData;
  }

  /**
   * @description Fetches projects (id, nom, client_id) for selection lists, optionally filtered by client_id. Requires admin privileges.
   * @tags Projects, dbtn/module:projects
   * @name list_projects_for_select
   * @summary List Projects For Select
   * @request GET:/routes/projects/select
   * @secure
   */
  export namespace list_projects_for_select {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Client Id
       * Filter projects by client ID (integer)
       */
      client_id?: number | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListProjectsForSelectData;
  }

  /**
   * @description Updates an existing project by ID. Requires admin privileges.
   * @tags Projects, dbtn/module:projects
   * @name update_project
   * @summary Update Project
   * @request PUT:/routes/projects/{project_id}
   * @secure
   */
  export namespace update_project {
    export type RequestParams = {
      /** Project Id */
      projectId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = ProjectUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateProjectData;
  }

  /**
   * @description Deletes a project by ID. Requires admin privileges.
   * @tags Projects, dbtn/module:projects
   * @name delete_project
   * @summary Delete Project
   * @request DELETE:/routes/projects/{project_id}
   * @secure
   */
  export namespace delete_project {
    export type RequestParams = {
      /** Project Id */
      projectId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteProjectData;
  }

  /**
   * @description Permet à un collaborateur authentifié d'encoder une nouvelle prestation. Calcule automatiquement les heures travaillées et initialise le statut à 'en_attente_validation'.
   * @tags Prestations, dbtn/module:prestations
   * @name create_prestation
   * @summary Create Prestation
   * @request POST:/routes/prestations/
   * @secure
   */
  export namespace create_prestation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PrestationCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreatePrestationData;
  }

  /**
   * @description Endpoint to trigger email notifications based on user status. Calls the internal helper function to perform the actual email sending.
   * @tags dbtn/module:notifications
   * @name notify_new_user_registration
   * @summary Notify New User Registration
   * @request POST:/routes/notify-new-user
   */
  export namespace notify_new_user_registration {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = NewUserNotifyRequest;
    export type RequestHeaders = {};
    export type ResponseBody = NotifyNewUserRegistrationData;
  }

  /**
   * @description Fetches all prestations with status 'en_attente'. Requires admin role.
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name list_pending_prestations
   * @summary List Pending Prestations
   * @request GET:/routes/prestations/pending
   * @secure
   */
  export namespace list_pending_prestations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListPendingPrestationsData;
  }

  /**
   * @description Validates a specific prestation, setting status and applying client tariff. Requires admin role.
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name validate_prestation
   * @summary Validate a Prestation
   * @request POST:/routes/prestations/{prestation_id}/validate
   * @secure
   */
  export namespace validate_prestation {
    export type RequestParams = {
      /** Prestation Id */
      prestationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ValidatePrestationData;
  }

  /**
   * @description Updates details of a specific prestation. Recalculates hours if times change. Requires admin role.
   * @tags Prestation Validation, dbtn/module:prestation_validation
   * @name update_prestation
   * @summary Update a Prestation
   * @request PUT:/routes/prestations/{prestation_id}
   * @secure
   */
  export namespace update_prestation {
    export type RequestParams = {
      /** Prestation Id */
      prestationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = PrestationUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdatePrestationData;
  }
}
