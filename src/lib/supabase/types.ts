export type OrgRole = "owner" | "admin" | "member";
export type DocumentStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SharePermission = "view" | "approve";

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
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
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
