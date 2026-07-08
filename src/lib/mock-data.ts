// ============================================================
// Mock Data — チームメンバー、テンプレート、サンプルプロジェクト
// ============================================================

import type { User, TaskTemplate, Project, Task } from '@/types';

// ── Helper ──
let _counter = 0;
export function generateId(): string {
  _counter++;
  return `${Date.now().toString(36)}-${_counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

// ── Team Members ──

export const MOCK_USERS: User[] = [
  {
    id: 'user-shimada',
    email: 'shimada@company.com',
    name: 'Shimada',
    avatar_url: '',
    role: 'admin',
    team: 'Management',
    max_concurrent_tasks: 8,
    preferred_language: 'ja',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-hoshino',
    email: 'hoshino@company.com',
    name: 'Hoshino',
    avatar_url: '',
    role: 'owner',
    team: 'Creative',
    max_concurrent_tasks: 6,
    preferred_language: 'ja',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-bew',
    email: 'bew@company.com',
    name: 'Bew',
    avatar_url: '',
    role: 'member',
    team: 'Design',
    max_concurrent_tasks: 5,
    preferred_language: 'th',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-aod',
    email: 'aod@company.com',
    name: 'Aod',
    avatar_url: '',
    role: 'member',
    team: 'Design',
    max_concurrent_tasks: 5,
    preferred_language: 'th',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-beer',
    email: 'beer@company.com',
    name: 'Beer',
    avatar_url: '',
    role: 'member',
    team: 'Marketing',
    max_concurrent_tasks: 5,
    preferred_language: 'th',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ── Artwork Production Template ──

export const ARTWORK_TEMPLATE: TaskTemplate = {
  id: 'tpl-artwork',
  name: {
    ja: 'アートワーク制作',
    en: 'Artwork Production',
    th: 'การผลิตงานศิลปะ',
  },
  description: {
    ja: '印刷物・デジタル素材のアートワーク制作ワークフロー。企画から最終入稿までの標準工程。',
    en: 'Standard workflow for print and digital artwork production. From concept to final submission.',
    th: 'เวิร์กโฟลว์มาตรฐานสำหรับการผลิตงานศิลปะสิ่งพิมพ์และดิจิทัล ตั้งแต่แนวคิดจนถึงการส่งมอบ',
  },
  category: 'artwork',
  is_public: true,
  steps: [
    {
      id: 'step-01', template_id: 'tpl-artwork', sort_order: 1, estimated_days: 2, is_milestone: false, depends_on_step_id: null, created_at: '2024-01-01T00:00:00Z',
      name: { ja: '企画・ブリーフ作成', en: 'Planning & Brief', th: 'วางแผนและบรีฟ' },
      description: { ja: 'プロジェクトの目的、ターゲット、デザイン方針を決定', en: 'Define project goals, target audience, and design direction', th: 'กำหนดเป้าหมาย กลุ่มเป้าหมาย และทิศทางการออกแบบ' },
    },
    {
      id: 'step-02', template_id: 'tpl-artwork', sort_order: 2, estimated_days: 3, is_milestone: false, depends_on_step_id: 'step-01', created_at: '2024-01-01T00:00:00Z',
      name: { ja: 'デザイン初稿', en: 'First Draft Design', th: 'ร่างแบบเบื้องต้น' },
      description: { ja: 'コンセプトに基づいたデザイン初稿を作成', en: 'Create initial design drafts based on the concept', th: 'สร้างร่างแบบเบื้องต้นตามแนวคิด' },
    },
    {
      id: 'step-03', template_id: 'tpl-artwork', sort_order: 3, estimated_days: 2, is_milestone: false, depends_on_step_id: 'step-02', created_at: '2024-01-01T00:00:00Z',
      name: { ja: '社内レビュー', en: 'Internal Review', th: 'ตรวจสอบภายใน' },
      description: { ja: 'チーム内でデザインをレビュー・フィードバック', en: 'Team review and feedback on the design', th: 'ทีมตรวจสอบและให้ข้อเสนอแนะเกี่ยวกับการออกแบบ' },
    },
    {
      id: 'step-04', template_id: 'tpl-artwork', sort_order: 4, estimated_days: 2, is_milestone: false, depends_on_step_id: 'step-03', created_at: '2024-01-01T00:00:00Z',
      name: { ja: '修正・ブラッシュアップ', en: 'Revisions & Polish', th: 'แก้ไขและปรับปรุง' },
      description: { ja: 'レビューフィードバックに基づく修正作業', en: 'Apply revisions based on review feedback', th: 'ปรับแก้ตามข้อเสนอแนะจากการตรวจสอบ' },
    },
    {
      id: 'step-05', template_id: 'tpl-artwork', sort_order: 5, estimated_days: 3, is_milestone: false, depends_on_step_id: 'step-04', created_at: '2024-01-01T00:00:00Z',
      name: { ja: 'クライアント確認', en: 'Client Approval', th: 'ลูกค้าตรวจสอบ' },
      description: { ja: 'クライアントへデザインを提出し承認を得る', en: 'Submit design to client for approval', th: 'ส่งแบบให้ลูกค้าตรวจสอบและอนุมัติ' },
    },
    {
      id: 'step-06', template_id: 'tpl-artwork', sort_order: 6, estimated_days: 1, is_milestone: false, depends_on_step_id: 'step-05', created_at: '2024-01-01T00:00:00Z',
      name: { ja: '最終調整', en: 'Final Adjustments', th: 'ปรับแต่งขั้นสุดท้าย' },
      description: { ja: 'クライアントフィードバックに基づく最終調整', en: 'Final adjustments based on client feedback', th: 'ปรับแต่งขั้นสุดท้ายตามข้อเสนอแนะของลูกค้า' },
    },
    {
      id: 'step-07', template_id: 'tpl-artwork', sort_order: 7, estimated_days: 1, is_milestone: true, depends_on_step_id: 'step-06', created_at: '2024-01-01T00:00:00Z',
      name: { ja: '最終入稿', en: 'Final Submission', th: 'ส่งมอบงานขั้นสุดท้าย' },
      description: { ja: '印刷所/配信先へ最終データを入稿', en: 'Submit final files to printer/distributor', th: 'ส่งไฟล์สุดท้ายให้โรงพิมพ์/ผู้จัดจำหน่าย' },
    },
  ],
  created_by: 'user-shimada',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const MOCK_TEMPLATES: TaskTemplate[] = [ARTWORK_TEMPLATE];

// ── Backward Scheduling Engine ──

export function backwardSchedule(
  deadlineDate: string,
  steps: { estimated_days: number; sort_order: number }[]
): { sort_order: number; planned_start_date: string; planned_end_date: string }[] {
  const sorted = [...steps].sort((a, b) => b.sort_order - a.sort_order); // reverse order
  const results: { sort_order: number; planned_start_date: string; planned_end_date: string }[] = [];

  let currentEnd = new Date(deadlineDate);

  for (const step of sorted) {
    const endDate = new Date(currentEnd);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - step.estimated_days + 1);

    results.push({
      sort_order: step.sort_order,
      planned_start_date: startDate.toISOString().split('T')[0],
      planned_end_date: endDate.toISOString().split('T')[0],
    });

    // Next step ends the day before this one starts
    currentEnd = new Date(startDate);
    currentEnd.setDate(currentEnd.getDate() - 1);
  }

  // Re-sort by sort_order ascending
  results.sort((a, b) => a.sort_order - b.sort_order);
  return results;
}

// ── Generate Tasks from Template ──

export function generateTasksFromTemplate(
  template: TaskTemplate,
  projectId: string,
  deadlineDate: string,
  createdBy: string
): Task[] {
  const schedule = backwardSchedule(deadlineDate, template.steps);
  
  return template.steps.map((step, i) => ({
    id: generateId(),
    project_id: projectId,
    template_step_id: step.id,
    name: {
      original: step.name.ja,
      original_lang: 'ja' as const,
      ja: step.name.ja,
      en: step.name.en,
      th: step.name.th,
      ja_confirmed: true,
      en_confirmed: true,
      th_confirmed: true,
    },
    description: {
      original: step.description.ja,
      original_lang: 'ja' as const,
      ja: step.description.ja,
      en: step.description.en,
      th: step.description.th,
      ja_confirmed: true,
      en_confirmed: true,
      th_confirmed: true,
    },
    status: 'todo' as const,
    priority: step.is_milestone ? 'high' as const : 'medium' as const,
    sort_order: step.sort_order,
    estimated_lead_days: step.estimated_days,
    actual_lead_days: null,
    planned_start_date: schedule[i].planned_start_date,
    planned_end_date: schedule[i].planned_end_date,
    actual_start_at: null,
    actual_end_at: null,
    assignees: [],
    dependencies: step.depends_on_step_id ? [{
      id: generateId(),
      task_id: '', // will be filled after creation
      depends_on_task_id: step.depends_on_step_id,
      type: 'finish_to_start' as const,
    }] : [],
    checklist: [],
    delay_tags: [],
    editing_user_id: null,
    editing_started_at: null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// ── Sample Projects with Tasks ──

function createSampleData(): { projects: Project[]; tasks: Task[] } {
  const projects: Project[] = [];
  const tasks: Task[] = [];

  // Project 1: Summer Campaign Artwork
  const proj1Id = 'proj-summer-campaign';
  const proj1: Project = {
    id: proj1Id,
    name: { ja: 'サマーキャンペーン メインビジュアル', en: 'Summer Campaign Key Visual', th: 'วิชวลหลักแคมเปญฤดูร้อน' },
    description: { ja: '2026年サマーキャンペーン用のメインビジュアル・バナー制作', en: 'Main visual and banner production for 2026 Summer Campaign', th: 'ผลิตวิชวลหลักและแบนเนอร์สำหรับแคมเปญฤดูร้อน 2026' },
    deadline_date: daysFromNow(14),
    status: 'active',
    color: '#6366f1',
    icon: '🎨',
    template_id: 'tpl-artwork',
    created_by: 'user-shimada',
    members: [
      { id: 'm1', project_id: proj1Id, user_id: 'user-shimada', role: 'owner', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm2', project_id: proj1Id, user_id: 'user-bew', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm3', project_id: proj1Id, user_id: 'user-hoshino', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
    ],
    metadata: {},
    created_at: daysAgo(10),
    updated_at: new Date().toISOString(),
  };
  projects.push(proj1);

  // Generate tasks from artwork template for proj1
  const proj1Tasks = generateTasksFromTemplate(ARTWORK_TEMPLATE, proj1Id, proj1.deadline_date, 'user-shimada');
  // Set some tasks as in-progress with assignees for realism
  proj1Tasks[0].status = 'done';
  proj1Tasks[0].assignees = ['user-shimada'];
  proj1Tasks[0].actual_start_at = daysAgo(8);
  proj1Tasks[0].actual_end_at = daysAgo(6);
  proj1Tasks[0].actual_lead_days = 2;
  proj1Tasks[1].status = 'done';
  proj1Tasks[1].assignees = ['user-bew'];
  proj1Tasks[1].actual_start_at = daysAgo(5);
  proj1Tasks[1].actual_end_at = daysAgo(3);
  proj1Tasks[1].actual_lead_days = 3;
  proj1Tasks[2].status = 'in_progress';
  proj1Tasks[2].assignees = ['user-hoshino', 'user-shimada'];
  proj1Tasks[2].actual_start_at = daysAgo(2);
  proj1Tasks[3].assignees = ['user-bew'];
  proj1Tasks[4].assignees = ['user-shimada'];
  proj1Tasks[5].assignees = ['user-bew'];
  proj1Tasks[6].assignees = ['user-hoshino'];
  tasks.push(...proj1Tasks);

  // Project 2: Store POP Design
  const proj2Id = 'proj-store-pop';
  const proj2: Project = {
    id: proj2Id,
    name: { ja: '店頭POP デザイン制作', en: 'In-Store POP Display Design', th: 'ออกแบบ POP หน้าร้าน' },
    description: { ja: '全店舗展開用の店頭POPデザイン一式', en: 'Full set of in-store POP display designs for all branches', th: 'ชุดออกแบบ POP สำหรับทุกสาขา' },
    deadline_date: daysFromNow(7),
    status: 'active',
    color: '#f59e0b',
    icon: '🏪',
    template_id: 'tpl-artwork',
    created_by: 'user-hoshino',
    members: [
      { id: 'm4', project_id: proj2Id, user_id: 'user-hoshino', role: 'owner', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm5', project_id: proj2Id, user_id: 'user-aod', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm6', project_id: proj2Id, user_id: 'user-beer', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
    ],
    metadata: {},
    created_at: daysAgo(15),
    updated_at: new Date().toISOString(),
  };
  projects.push(proj2);

  const proj2Tasks = generateTasksFromTemplate(ARTWORK_TEMPLATE, proj2Id, proj2.deadline_date, 'user-hoshino');
  proj2Tasks[0].status = 'done';
  proj2Tasks[0].assignees = ['user-hoshino'];
  proj2Tasks[0].actual_start_at = daysAgo(12);
  proj2Tasks[0].actual_end_at = daysAgo(11);
  proj2Tasks[0].actual_lead_days = 1;
  proj2Tasks[1].status = 'done';
  proj2Tasks[1].assignees = ['user-aod'];
  proj2Tasks[1].actual_start_at = daysAgo(10);
  proj2Tasks[1].actual_end_at = daysAgo(7);
  proj2Tasks[1].actual_lead_days = 4; // 1 day over estimate
  proj2Tasks[2].status = 'done';
  proj2Tasks[2].assignees = ['user-hoshino', 'user-shimada'];
  proj2Tasks[2].actual_start_at = daysAgo(6);
  proj2Tasks[2].actual_end_at = daysAgo(5);
  proj2Tasks[2].actual_lead_days = 2;
  proj2Tasks[3].status = 'in_progress';
  proj2Tasks[3].assignees = ['user-aod'];
  proj2Tasks[3].actual_start_at = daysAgo(4);
  proj2Tasks[4].assignees = ['user-hoshino'];
  proj2Tasks[5].assignees = ['user-aod'];
  proj2Tasks[6].assignees = ['user-beer'];
  tasks.push(...proj2Tasks);

  // Project 3: Product Catalog (completed)
  const proj3Id = 'proj-catalog';
  const proj3: Project = {
    id: proj3Id,
    name: { ja: '製品カタログ 2026年版', en: 'Product Catalog 2026', th: 'แคตตาล็อกผลิตภัณฑ์ 2026' },
    description: { ja: '2026年版の製品カタログのデザイン・印刷入稿', en: '2026 edition product catalog design and print submission', th: 'ออกแบบและส่งพิมพ์แคตตาล็อก 2026' },
    deadline_date: daysAgo(3),
    status: 'completed',
    color: '#10b981',
    icon: '📚',
    template_id: 'tpl-artwork',
    created_by: 'user-shimada',
    members: [
      { id: 'm7', project_id: proj3Id, user_id: 'user-shimada', role: 'owner', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm8', project_id: proj3Id, user_id: 'user-bew', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
      { id: 'm9', project_id: proj3Id, user_id: 'user-beer', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
    ],
    metadata: {},
    created_at: daysAgo(30),
    updated_at: daysAgo(3),
  };
  projects.push(proj3);

  const proj3Tasks = generateTasksFromTemplate(ARTWORK_TEMPLATE, proj3Id, proj3.deadline_date, 'user-shimada');
  proj3Tasks.forEach((t, i) => {
    t.status = 'done';
    t.actual_lead_days = t.estimated_lead_days + (i % 2 === 0 ? 0 : 1);
    t.actual_start_at = daysAgo(30 - i * 3);
    t.actual_end_at = daysAgo(30 - i * 3 - t.estimated_lead_days);
  });
  proj3Tasks[0].assignees = ['user-shimada'];
  proj3Tasks[1].assignees = ['user-bew'];
  proj3Tasks[2].assignees = ['user-shimada', 'user-hoshino'];
  proj3Tasks[3].assignees = ['user-bew'];
  proj3Tasks[4].assignees = ['user-shimada'];
  proj3Tasks[5].assignees = ['user-bew'];
  proj3Tasks[6].assignees = ['user-beer'];
  tasks.push(...proj3Tasks);

  return { projects, tasks };
}

export const SAMPLE_DATA = createSampleData();
