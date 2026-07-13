// ============================================================
// Project Hub — Type Definitions
// ============================================================

export type Language = 'ja' | 'en' | 'th';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'revision' | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type UserRole = 'admin' | 'owner' | 'member' | 'viewer';
export type TemplateCategory = 'artwork' | 'campaign' | 'event' | 'deliverable' | 'custom';
export type DependencyType = 'finish_to_start' | 'start_to_start';
export type DelayFactor = 'client' | 'resource' | 'spec_change' | 'review_delay' | 'other';
export type NotificationType = 'deadline' | 'revision' | 'comment' | 'assignment' | 'overdue';

// ── Multilingual Text ──

export interface MultiLangText {
  ja: string;
  en: string;
  th: string;
}

export interface TranslatableText {
  original: string;
  original_lang: Language;
  ja: string;
  en: string;
  th: string;
  ja_confirmed: boolean;
  en_confirmed: boolean;
  th_confirmed: boolean;
}

// ── User ──

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: UserRole;
  team: string;
  max_concurrent_tasks: number;
  preferred_language: Language;
  created_at: string;
  updated_at: string;
}

// ── Project ──

export interface Project {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  deadline_date: string; // ISO date string
  status: ProjectStatus;
  color: string;
  icon: string;
  template_id: string | null;
  created_by: string;
  members: ProjectMember[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
  joined_at: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string | null; // null means "All Projects"
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  color: string;
  created_at: string;
}

// ── Task Template ──

export interface TaskTemplate {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  category: TemplateCategory;
  is_public: boolean;
  steps: TemplateStep[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateStep {
  id: string;
  template_id: string;
  name: MultiLangText;
  description: MultiLangText;
  sort_order: number;
  estimated_days: number;
  is_milestone: boolean;
  depends_on_step_id: string | null;
  created_at: string;
}

// ── Task Activity (History) ──

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  field_name: string;
  old_value: any;
  new_value: any;
  created_at: string;
}

// ── Task ──

export interface Task {
  id: string;
  project_id: string;
  template_step_id: string | null;
  name: TranslatableText;
  description: TranslatableText;
  status: TaskStatus;
  priority: Priority;
  sort_order: number;
  estimated_lead_days: number;
  actual_lead_days: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  assignees: string[]; // user IDs
  dependencies: TaskDependency[];
  checklist: ChecklistItem[];
  delay_tags: DelayFactor[];
  editing_user_id: string | null;
  editing_started_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: DependencyType;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string | TranslatableText;
  is_completed: boolean;
  sort_order: number;
  completed_at: string | null;
  completed_by: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
}

// ── Comment ──

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: TranslatableText;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Milestone ──

export interface Milestone {
  id: string;
  project_id: string;
  name: MultiLangText;
  target_date: string;
  is_completed: boolean;
  completed_at: string | null;
}

// ── Lead Time Record ──

export interface LeadTimeRecord {
  id: string;
  task_id: string;
  template_step_id: string | null;
  estimated_days: number;
  actual_days: number;
  deviation_percent: number;
  delay_factors: DelayFactor[];
  recorded_at: string;
}

// ── Notification ──

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: MultiLangText;
  message: MultiLangText;
  related_task_id: string | null;
  related_project_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Activity Log ──

export interface ActivityLog {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'commented' | 'assigned';
  changes: Record<string, unknown>;
  created_at: string;
}

// ── UI State ──

export interface ViewFilters {
  search: string;
  status: TaskStatus | 'all';
  priority: Priority | 'all';
  assignee: string | 'all';
  project: string | 'all';
  dateRange: { start: string | null; end: string | null };
}

export type ViewMode = 'overview' | 'my-tasks' | 'kanban' | 'gantt' | 'calendar' | 'reports' | 'accounts';

// ── Status / Priority Config ──

export const STATUS_CONFIG: Record<TaskStatus, { label: MultiLangText; color: string; icon: string; order: number }> = {
  todo:        { label: { ja: '未着手',     en: 'To Do',       th: 'รอดำเนินการ' },   color: '#94a3b8', icon: '○', order: 0 },
  in_progress: { label: { ja: '進行中',     en: 'In Progress', th: 'กำลังดำเนินการ' }, color: '#6366f1', icon: '◉', order: 1 },
  review:      { label: { ja: 'レビュー待ち', en: 'In Review',   th: 'รอตรวจสอบ' },     color: '#f59e0b', icon: '◎', order: 2 },
  revision:    { label: { ja: '差し戻し',    en: 'Revision',    th: 'แก้ไข' },          color: '#f43f5e', icon: '↺', order: 3 },
  done:        { label: { ja: '完了',       en: 'Done',        th: 'เสร็จสิ้น' },       color: '#10b981', icon: '✓', order: 4 },
};

export const PRIORITY_CONFIG: Record<Priority, { label: MultiLangText; color: string; icon: string; order: number }> = {
  critical: { label: { ja: '最優先', en: 'Critical', th: 'วิกฤต' },   color: '#dc2626', icon: '🔴', order: 0 },
  high:     { label: { ja: '高',    en: 'High',     th: 'สูง' },      color: '#f43f5e', icon: '🟠', order: 1 },
  medium:   { label: { ja: '中',    en: 'Medium',   th: 'ปานกลาง' },  color: '#f59e0b', icon: '🟡', order: 2 },
  low:      { label: { ja: '低',    en: 'Low',      th: 'ต่ำ' },      color: '#6366f1', icon: '🔵', order: 3 },
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: MultiLangText; color: string }> = {
  planning:  { label: { ja: '企画中', en: 'Planning',   th: 'วางแผน' },      color: '#8b5cf6' },
  active:    { label: { ja: '進行中', en: 'Active',     th: 'ดำเนินการ' },    color: '#6366f1' },
  completed: { label: { ja: '完了',   en: 'Completed',  th: 'เสร็จสิ้น' },    color: '#10b981' },
  on_hold:   { label: { ja: '保留',   en: 'On Hold',    th: 'ระงับชั่วคราว' }, color: '#94a3b8' },
};
