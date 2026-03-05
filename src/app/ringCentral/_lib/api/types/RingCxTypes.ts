/**
 * RingCX Digital API Types
 * Based on RingCentral Digital API documentation
 */

// ========== Common Types ==========

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface TimeRangeParams {
  created_before?: string; // ISO 8601 datetime
  created_after?: string; // ISO 8601 datetime
}

// ========== Intervention Types ==========

export interface Intervention {
  id: string;
  status: "opened" | "assigned" | "replied" | "closed" | "ignored";
  thread_id: string;
  user_id: string | null; // Assigned agent
  identity_id: string; // Customer identity
  source_id: string;
  category_ids: string[];
  custom_field_values?: Record<string, any>;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  first_user_reply_in?: number; // Response time in seconds
  user_reply_in_average?: number;
}

export interface InterventionSearchParams extends PaginationParams, TimeRangeParams {
  thread_id?: string;
  user_id?: string;
  identity_id?: string;
  status?: string[];
  category_ids?: string[];
  sort?: string;
}

export interface UpdateInterventionBody {
  status?: "opened" | "closed" | "ignored";
  category_ids?: string[];
  custom_field_values?: Record<string, any>;
  user_id?: string | null;
}

export interface CloseInterventionBody {
  category_ids?: string[];
}

// ========== Content Types ==========

export interface Content {
  id: string;
  type: "message" | "note" | "question" | "answer";
  body: string;
  thread_id: string;
  intervention_id?: string;
  source_id: string;
  created_from: "synchronizer" | "api" | "user";
  author_id: string | null;
  in_reply_to_id: string | null;
  status: "new" | "assigned" | "replied" | "ignored";
  created_at: string;
  published?: boolean;
  approval_required?: boolean;
  attachments?: Attachment[];
  private?: boolean;
  language?: string;
}

export interface Attachment {
  id: string;
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export interface ContentSearchParams extends PaginationParams, TimeRangeParams {
  thread_id?: string;
  intervention_id?: string;
  source_id?: string;
  identity_id?: string;
  sort?: string;
}

export interface CreateContentBody {
  body: string;
  in_reply_to_id: string;
  private?: boolean;
  author_id?: string;
  attachment_ids?: string[];
}

// ========== Identity Types ==========

export interface Identity {
  id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  identity_group_id: string;
  user_id?: string;
  type: string;
  uuid?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  home_phone?: string;
  mobile_phone?: string;
  company?: string;
  notes?: string;
  custom_field_values?: Record<string, any>;
  tags?: string[];
}

export interface IdentitySearchParams extends PaginationParams {
  uuid?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  sort?: string;
}

export interface UpdateIdentityBody {
  firstname?: string;
  lastname?: string;
  display_name?: string;
  email?: string;
  home_phone?: string;
  mobile_phone?: string;
  company?: string;
  notes?: string;
  custom_field_values?: Record<string, any>;
  tags?: string[];
}

// ========== Task Types ==========

export interface Task {
  id: string;
  priority: number;
  intervention_id: string;
  thread_id: string;
  category_id: string | null;
  step_id: string | null;
  created_at: string;
  transferred_at?: string;
  workbin_id?: string;
}

export interface TaskSearchParams extends PaginationParams {
  intervention_id?: string;
  sort?: string;
}

export interface TransferTaskBody {
  step_id?: string;
  user_id?: string;
  priority?: number;
}

// ========== Category Types ==========

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  color?: number;
  mandatory?: boolean;
  multiple?: boolean;
  post_qualification?: boolean;
  unselectable?: boolean;
  created_at: string;
  updated_at: string;
}

// ========== User Types ==========

export interface User {
  id: string;
  category_ids: string[];
  email: string;
  enabled: boolean;
  external_id?: string;
  firstname: string;
  gender?: string;
  identity_ids?: string[];
  lastname: string;
  locale?: string;
  nickname?: string;
  rc_user_id?: string;
  role_id: string;
  team_ids: string[];
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSearchParams extends PaginationParams {
  category_id?: string;
  email?: string;
  role_id?: string;
  team_id?: string;
}

// ========== Team Types ==========

export interface Team {
  id: string;
  name: string;
  leader_ids: string[];
  user_ids: string[];
  created_at: string;
  updated_at: string;
}

// ========== Channel/Source Types ==========

export interface Source {
  id: string;
  name: string;
  channel_id: string;
  color?: number;
  community_id: string;
  content_archiving_period?: number;
  content_languages?: string[];
  created_at: string;
  updated_at: string;
  type: string;
  user_community_id?: string;
}

export interface Channel {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  source_ids: string[];
}

// ========== Webhook Event Types ==========

export interface WebhookEvent<T = any> {
  id: string;
  domain_id: string;
  events: WebhookEventDetail<T>[];
}

export interface WebhookEventDetail<T = any> {
  id: string;
  type: string;
  issued_at: string;
  resource: T;
}

export type InterventionEvent =
  | "intervention.assigned"
  | "intervention.canceled"
  | "intervention.closed"
  | "intervention.deferred"
  | "intervention.opened"
  | "intervention.reactivated";

export type ContentEvent =
  | "content.imported"
  | "content.replied"
  | "content.approved"
  | "content.exported"
  | "content.thread_auto_closed";

export type TaskEvent =
  | "task.assigned"
  | "task.completed"
  | "task.created"
  | "task.transferred"
  | "task.undelivered"
  | "task.expired_from_workbin";

export type IdentityEvent = "identity.merged" | "identity.unmerged";
