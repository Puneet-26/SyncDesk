export interface User {
  id: number;
  name: string;
  email: string;
  role: "RB Officer" | "PGRC Officer" | "Regional Officer" | "Senior Management" | "Admin";
  bureau: string;
  region: string;
  is_active: boolean;
  created_at?: string;
}

export interface InstitutionAlias {
  id: number;
  institution_id: number;
  alias: string;
  normalized_alias: string;
  source: string;
  verification_status: string;
  verified_by?: number;
}

export interface Institution {
  id: number;
  aicte_permanent_id?: string;
  official_name: string;
  normalized_name: string;
  address?: string;
  city: string;
  state: string;
  region: string;
  institution_type: string;
  identity_verification_status: string;
  created_at?: string;
  updated_at?: string;
  aliases?: InstitutionAlias[];
}

export interface ActionHistory {
  id: number;
  case_id: number;
  timestamp: string;
  actor_user_id?: number;
  actor_name: string;
  bureau: string;
  action_type: string;
  remarks: string;
  attachment_reference?: string;
  from_bureau?: string;
  to_bureau?: string;
  previous_status?: string;
  new_status?: string;
}

export interface ComplaintCase {
  id: number;
  case_id: string;
  institution_id?: number;
  institution_name: string;
  aicte_permanent_id?: string;
  raw_institution_name: string;
  external_reference?: string;
  category: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  date_received: string;
  status: "Pending" | "Under Process" | "Disposed" | "Transferred" | "Escalated";
  current_bureau: string;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  last_action: string;
  next_action: string;
  last_action_date: string;
  expected_disposal_date?: string;
  sla_due_date: string;
  sla_days: number;
  closure_remarks?: string;
  created_at?: string;
  updated_at?: string;
  action_history?: ActionHistory[];
}

export interface OverlapAssessment {
  id: number;
  case_a_id: number;
  case_b_id: number;
  case_a?: ComplaintCase;
  case_b?: ComplaintCase;
  institution_identity_score: number;
  category_similarity_score: number;
  text_similarity_score: number;
  overall_score: number;
  classification: "Institution Overlap" | "Potential Issue Overlap" | "Potential Duplicate";
  reasons: {
    headline: string;
    institution_identity: {
      score: number;
      institution_id?: number;
      institution_name: string;
      aicte_id?: string;
      evidence: string;
    };
    cross_bureau: {
      is_cross_bureau: boolean;
      bureau_a: string;
      bureau_b: string;
    };
    case_statuses: {
      case_a: { case_id: string; status: string; officer?: string };
      case_b: { case_id: string; status: string; officer?: string };
      both_active: boolean;
    };
    similarity_metrics: {
      category_score: number;
      text_score: number;
      text_method: string;
      overall_score: number;
    };
    narrative_explanation: string;
    recommended_action: string;
  };
  status: "Suggested" | "Confirmed" | "Dismissed";
  dismissed_reason?: string;
  dismissed_by?: number;
  dismissed_by_name?: string;
  confirmed_by?: number;
  confirmed_by_name?: string;
  assessment_version: string;
  last_assessed_at?: string;
}

export interface CoordinationCaseItem {
  id: number;
  coordination_id: number;
  case_id: number;
  case_number?: string;
  case_status?: string;
  category?: string;
  bureau: string;
  added_at?: string;
}

export interface CoordinationRecord {
  id: number;
  title: string;
  description: string;
  coordination_status: "Open" | "In Progress" | "Resolved" | "Closed";
  responsible_officer_id: number;
  responsible_officer_name?: string;
  target_review_date: string;
  resolution_summary?: string;
  linked_cases: CoordinationCaseItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Alert {
  id: number;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  case_id?: number;
  case_number?: string;
  institution_id?: number;
  institution_name?: string;
  related_overlap_id?: number;
  recipient_user_id?: number;
  title: string;
  message: string;
  deduplication_key: string;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
  is_read: boolean;
  is_resolved: boolean;
}

export interface KPISummary {
  total_cases: number;
  pending_cases: number;
  under_process_cases: number;
  disposed_cases: number;
  transferred_cases: number;
  escalated_cases: number;
  overdue_cases: number;
  active_overlap_institutions: number;
  sla_compliance_rate: number;
}

export interface PriorityQueueItem {
  id: string;
  case_id: string;
  internal_id: number;
  overlap_id?: number;
  title: string;
  type: string;
  severity: string;
  institution: string;
  bureau: string;
  status: string;
  priority: string;
  due_date: string;
  priority_reason: string;
}

export interface AuditEvent {
  id: number;
  actor_user_id?: number;
  actor_name: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  created_at: string;
}
