export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrgRole = "owner" | "admin" | "member";
export type DocumentStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SharePermission = "view" | "approve";
export type WorkflowStepType = "internal" | "external";
export type WorkflowAssigneeMode = "org_member" | "specific_user" | "org_role";
export type WorkflowJoinMode = "all" | "any";
export type WorkflowInstanceStatus = "in_progress" | "completed" | "rejected" | "cancelled";
export type WorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "on_hold"
  | "approved"
  | "rejected"
  | "skipped";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
        };
        Update: Partial<{
          full_name: string | null;
        }>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: Partial<{
          name: string;
          slug: string;
        }>;
        Relationships: [];
      };
      org_members: {
        Row: {
          org_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: {
          org_id: string;
          user_id: string;
          role?: OrgRole;
        };
        Update: Partial<{
          role: OrgRole;
        }>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          description: string | null;
          status: DocumentStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          title: string;
          description?: string | null;
          status?: DocumentStatus;
          created_by: string;
        };
        Update: Partial<{
          title: string;
          description: string | null;
          status: DocumentStatus;
        }>;
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      document_shares: {
        Row: {
          id: string;
          document_id: string;
          shared_with_org_id: string;
          shared_by: string;
          permission: SharePermission;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          shared_with_org_id: string;
          shared_by: string;
          permission?: SharePermission;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          target_org_id: string;
          status: ApprovalStatus;
          comment: string | null;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          target_org_id: string;
          status?: ApprovalStatus;
        };
        Update: Partial<{
          status: ApprovalStatus;
          comment: string | null;
          decided_by: string | null;
          decided_at: string | null;
        }>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          document_id: string;
          actor_id: string;
          org_id: string;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          actor_id: string;
          org_id: string;
          action: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      document_messages: {
        Row: {
          id: string;
          document_id: string;
          org_id: string;
          author_id: string;
          body: string;
          reply_to_id: string | null;
          version_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          org_id: string;
          author_id: string;
          body: string;
          reply_to_id?: string | null;
          version_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_templates: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          created_by: string;
        };
        Update: Partial<{ name: string; description: string | null }>;
        Relationships: [];
      };
      workflow_template_steps: {
        Row: {
          id: string;
          template_id: string;
          label: string;
          step_type: WorkflowStepType;
          assignee_mode: WorkflowAssigneeMode;
          assignee_org_id: string | null;
          assignee_user_id: string | null;
          assignee_role: OrgRole | null;
          join_mode: WorkflowJoinMode;
          allow_hold: boolean;
          position_x: number;
          position_y: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          label: string;
          step_type: WorkflowStepType;
          assignee_mode: WorkflowAssigneeMode;
          assignee_org_id?: string | null;
          assignee_user_id?: string | null;
          assignee_role?: OrgRole | null;
          join_mode?: WorkflowJoinMode;
          allow_hold?: boolean;
          position_x?: number;
          position_y?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_template_edges: {
        Row: {
          id: string;
          template_id: string;
          from_step_id: string;
          to_step_id: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          from_step_id: string;
          to_step_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_instances: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          template_id: string | null;
          status: WorkflowInstanceStatus;
          started_by: string;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          template_id?: string | null;
          status?: WorkflowInstanceStatus;
          started_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_step_instances: {
        Row: {
          id: string;
          workflow_instance_id: string;
          template_step_id: string | null;
          label: string;
          assigned_org_id: string;
          assigned_user_id: string | null;
          assigned_role: string | null;
          join_mode: WorkflowJoinMode;
          allow_hold: boolean;
          status: WorkflowStepStatus;
          decided_by: string | null;
          decided_at: string | null;
          comment: string | null;
          hold_reason: string | null;
          first_viewed_at: string | null;
          first_viewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_instance_id: string;
          template_step_id?: string | null;
          label: string;
          assigned_org_id: string;
          assigned_user_id?: string | null;
          assigned_role?: string | null;
          join_mode?: WorkflowJoinMode;
          allow_hold?: boolean;
          status?: WorkflowStepStatus;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_step_instance_edges: {
        Row: {
          id: string;
          workflow_instance_id: string;
          from_step_instance_id: string;
          to_step_instance_id: string;
        };
        Insert: {
          id?: string;
          workflow_instance_id: string;
          from_step_instance_id: string;
          to_step_instance_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      document_participants: {
        Args: { p_document_id: string };
        Returns: { id: string; full_name: string | null; email: string; org_id: string }[];
      };
      start_new_version: {
        Args: { p_document_id: string };
        Returns: undefined;
      };
      save_workflow_template: {
        Args: {
          p_org_id: string;
          p_template_id: string | null;
          p_name: string;
          p_description: string | null;
          p_steps: Json;
          p_edges: Json;
        };
        Returns: string;
      };
      start_workflow: {
        Args: {
          p_document_id: string;
          p_template_id: string;
          p_org_bindings: Json;
        };
        Returns: string;
      };
      decide_workflow_step: {
        Args: {
          p_step_instance_id: string;
          p_decision: string;
          p_comment: string | null;
        };
        Returns: undefined;
      };
      hold_workflow_step: {
        Args: { p_step_instance_id: string; p_reason: string };
        Returns: undefined;
      };
      resume_workflow_step: {
        Args: { p_step_instance_id: string };
        Returns: undefined;
      };
      mark_step_viewed: {
        Args: { p_step_instance_id: string };
        Returns: undefined;
      };
      add_org_member: {
        Args: { p_org_id: string; p_email: string; p_role: string };
        Returns: undefined;
      };
      share_document: {
        Args: {
          p_document_id: string;
          p_target_org_slug: string;
          p_permission: string;
        };
        Returns: undefined;
      };
      decide_approval: {
        Args: {
          p_request_id: string;
          p_decision: string;
          p_comment: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
