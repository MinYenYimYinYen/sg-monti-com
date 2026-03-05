import { ringCxDigital } from "./ringCxClient";
import type {
  Intervention,
  InterventionSearchParams,
  UpdateInterventionBody,
  CloseInterventionBody,
  Content,
  ContentSearchParams,
  CreateContentBody,
  Identity,
  IdentitySearchParams,
  UpdateIdentityBody,
  Task,
  TaskSearchParams,
  TransferTaskBody,
  Category,
  User,
  UserSearchParams,
  Team,
  Source,
  Channel,
} from "./types/RingCxTypes";

/**
 * RingCX Digital API Client
 * Complete set of API methods for interacting with RingCX Digital platform
 */

// ========== Interventions API ==========

async function getInterventions(params?: InterventionSearchParams) {
  return ringCxDigital.get<Intervention[], InterventionSearchParams>("/1.0/interventions", { params });
}

async function getIntervention(id: string) {
  return ringCxDigital.get<Intervention>(`/1.0/interventions/${id}`);
}

async function updateIntervention(id: string, body: UpdateInterventionBody) {
  return ringCxDigital.put<Intervention>(`/1.0/interventions/${id}`, { body });
}

async function closeIntervention(id: string, body?: CloseInterventionBody) {
  return ringCxDigital.post<Intervention>(`/1.0/interventions/${id}/close`, {
    body,
  });
}

async function reopenIntervention(id: string) {
  return ringCxDigital.post<Intervention>(`/1.0/interventions/${id}/reopen`);
}

// ========== Content API ==========

async function getContents(params?: ContentSearchParams) {
  return ringCxDigital.get<Content[], ContentSearchParams>("/1.0/contents", { params });
}

async function getContent(id: string) {
  return ringCxDigital.get<Content>(`/1.0/contents/${id}`);
}

async function createContent(body: CreateContentBody) {
  return ringCxDigital.post<Content>("/1.0/contents", { body });
}

async function deleteContent(id: string) {
  return ringCxDigital.delete(`/1.0/contents/${id}`);
}

// ========== Identities API ==========

async function getIdentities(params?: IdentitySearchParams) {
  return ringCxDigital.get<Identity[], IdentitySearchParams>("/1.0/identities", { params });
}

async function getIdentity(id: string) {
  return ringCxDigital.get<Identity>(`/1.0/identities/${id}`);
}

async function updateIdentity(id: string, body: UpdateIdentityBody) {
  return ringCxDigital.put<Identity>(`/1.0/identities/${id}`, { body });
}

async function mergeIdentities(sourceId: string, targetId: string) {
  return ringCxDigital.post<Identity>(`/1.0/identities/${sourceId}/merge`, {
    body: { target_identity_id: targetId },
  });
}

// ========== Tasks API ==========

async function getTasks(params?: TaskSearchParams) {
  return ringCxDigital.get<Task[], TaskSearchParams>("/1.0/tasks", { params });
}

async function getTask(id: string) {
  return ringCxDigital.get<Task>(`/1.0/tasks/${id}`);
}

async function transferTask(id: string, body: TransferTaskBody) {
  return ringCxDigital.post<Task>(`/1.0/tasks/${id}/transfer`, { body });
}

// ========== Categories API ==========

async function getCategories() {
  return ringCxDigital.get<Category[]>("/1.0/categories");
}

async function getCategory(id: string) {
  return ringCxDigital.get<Category>(`/1.0/categories/${id}`);
}

async function createCategory(body: {
  name: string;
  parent_id?: string;
  color?: number;
}) {
  return ringCxDigital.post<Category>("/1.0/categories", { body });
}

async function updateCategory(
  id: string,
  body: { name?: string; color?: number },
) {
  return ringCxDigital.put<Category>(`/1.0/categories/${id}`, { body });
}

async function deleteCategory(id: string) {
  return ringCxDigital.delete(`/1.0/categories/${id}`);
}

// ========== Users API ==========

async function getUsers(params?: UserSearchParams) {
  return ringCxDigital.get<User[], UserSearchParams>("/1.0/users", { params });
}

async function getUser(id: string) {
  return ringCxDigital.get<User>(`/1.0/users/${id}`);
}

async function updateUser(
  id: string,
  body: {
    email?: string;
    enabled?: boolean;
    firstname?: string;
    lastname?: string;
    category_ids?: string[];
    team_ids?: string[];
  },
) {
  return ringCxDigital.put<User>(`/1.0/users/${id}`, { body });
}

// ========== Teams API ==========

async function getTeams() {
  return ringCxDigital.get<Team[]>("/1.0/teams");
}

async function getTeam(id: string) {
  return ringCxDigital.get<Team>(`/1.0/teams/${id}`);
}

async function createTeam(body: {
  name: string;
  leader_ids?: string[];
  user_ids?: string[];
}) {
  return ringCxDigital.post<Team>("/1.0/teams", { body });
}

async function updateTeam(
  id: string,
  body: { name?: string; leader_ids?: string[]; user_ids?: string[] },
) {
  return ringCxDigital.put<Team>(`/1.0/teams/${id}`, { body });
}

async function deleteTeam(id: string) {
  return ringCxDigital.delete(`/1.0/teams/${id}`);
}

// ========== Sources/Channels API ==========

async function getSources() {
  return ringCxDigital.get<Source[]>("/1.0/content_sources");
}

async function getSource(id: string) {
  return ringCxDigital.get<Source>(`/1.0/content_sources/${id}`);
}

async function getChannels() {
  return ringCxDigital.get<Channel[]>("/1.0/channels");
}

async function getChannel(id: string) {
  return ringCxDigital.get<Channel>(`/1.0/channels/${id}`);
}

// ========== Custom Fields API ==========

async function getCustomFields() {
  return ringCxDigital.get("/1.0/custom_fields");
}

async function getCustomField(id: string) {
  return ringCxDigital.get(`/1.0/custom_fields/${id}`);
}

// ========== Export API Object ==========

/**
 * Complete RingCX Digital API
 * Organized by resource type
 */
export const ringCxApi = {
  // Interventions (Customer Conversations)
  interventions: {
    list: getInterventions,
    get: getIntervention,
    update: updateIntervention,
    close: closeIntervention,
    reopen: reopenIntervention,
  },

  // Content (Messages)
  content: {
    list: getContents,
    get: getContent,
    create: createContent,
    delete: deleteContent,
  },

  // Identities (Customer Profiles)
  identities: {
    list: getIdentities,
    get: getIdentity,
    update: updateIdentity,
    merge: mergeIdentities,
  },

  // Tasks (Routing/Queue)
  tasks: {
    list: getTasks,
    get: getTask,
    transfer: transferTask,
  },

  // Categories/Tags
  categories: {
    list: getCategories,
    get: getCategory,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  },

  // Users (Agents)
  users: {
    list: getUsers,
    get: getUser,
    update: updateUser,
  },

  // Teams
  teams: {
    list: getTeams,
    get: getTeam,
    create: createTeam,
    update: updateTeam,
    delete: deleteTeam,
  },

  // Sources and Channels
  sources: {
    list: getSources,
    get: getSource,
  },
  channels: {
    list: getChannels,
    get: getChannel,
  },

  // Custom Fields
  customFields: {
    list: getCustomFields,
    get: getCustomField,
  },
};
