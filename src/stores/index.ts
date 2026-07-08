// ============================================================
// Zustand Store — プロジェクト・タスク状態管理
// localStorage永続化 + イベントベース擬似リアルタイム同期
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, TaskTemplate, User, TaskStatus, ViewMode, ViewFilters, Language } from '@/types';
import { MOCK_USERS, MOCK_TEMPLATES, SAMPLE_DATA, generateId, generateTasksFromTemplate, backwardSchedule } from '@/lib/mock-data';

// ── Project Store ──

interface ProjectStore {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: SAMPLE_DATA.projects,

      addProject: (data) => {
        const project: Project = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
        // Also delete associated tasks
        useTaskStore.getState().deleteTasksByProject(id);
      },

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    { name: 'projecthub-projects' }
  )
);

// ── Task Store ──

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  deleteTasksByProject: (projectId: string) => void;
  getTask: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  startTask: (id: string) => void;
  completeTask: (id: string) => void;
  reorderTask: (id: string, newSortOrder: number) => void;
  addTasksFromTemplate: (template: TaskTemplate, projectId: string, deadline: string, createdBy: string) => Task[];
  recalculateSchedule: (projectId: string, deadline: string) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: SAMPLE_DATA.tasks,

      addTask: (data) => {
        const task: Task = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      deleteTasksByProject: (projectId) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.project_id !== projectId) }));
      },

      getTask: (id) => get().tasks.find((t) => t.id === id),

      getTasksByProject: (projectId) =>
        get().tasks.filter((t) => t.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order),

      startTask: (id) => {
        const task = get().getTask(id);
        if (!task || task.status !== 'todo') return;
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, status: 'in_progress' as TaskStatus, actual_start_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              : t
          ),
        }));
      },

      completeTask: (id) => {
        const task = get().getTask(id);
        if (!task) return;
        const now = new Date();
        let actualDays: number | null = null;
        if (task.actual_start_at) {
          const start = new Date(task.actual_start_at);
          actualDays = Math.ceil((now.getTime() - start.getTime()) / 86400000);
        }
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'done' as TaskStatus,
                  actual_end_at: now.toISOString(),
                  actual_lead_days: actualDays,
                  updated_at: now.toISOString(),
                }
              : t
          ),
        }));
      },

      reorderTask: (id, newSortOrder) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, sort_order: newSortOrder, updated_at: new Date().toISOString() } : t
          ),
        }));
      },

      addTasksFromTemplate: (template, projectId, deadline, createdBy) => {
        const newTasks = generateTasksFromTemplate(template, projectId, deadline, createdBy);
        set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
        return newTasks;
      },

      recalculateSchedule: (projectId, deadline) => {
        const projectTasks = get().getTasksByProject(projectId);
        const schedule = backwardSchedule(
          deadline,
          projectTasks.map((t) => ({
            estimated_days: t.estimated_lead_days,
            sort_order: t.sort_order,
          }))
        );

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.project_id !== projectId) return t;
            const sched = schedule.find((s) => s.sort_order === t.sort_order);
            if (!sched) return t;
            return {
              ...t,
              planned_start_date: sched.planned_start_date,
              planned_end_date: sched.planned_end_date,
              updated_at: new Date().toISOString(),
            };
          }),
        }));
      },
    }),
    { name: 'projecthub-tasks' }
  )
);

// ── Template Store ──

interface TemplateStore {
  templates: TaskTemplate[];
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>) => TaskTemplate;
  getTemplate: (id: string) => TaskTemplate | undefined;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: MOCK_TEMPLATES,
      addTemplate: (data) => {
        const template: TaskTemplate = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ templates: [...state.templates, template] }));
        return template;
      },
      getTemplate: (id) => get().templates.find((t) => t.id === id),
    }),
    { name: 'projecthub-templates' }
  )
);

// ── User Store ──

interface UserStore {
  users: User[];
  currentUser: User | null;
  setCurrentUser: (userId: string) => void;
  getUser: (id: string) => User | undefined;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: MOCK_USERS,
      currentUser: null,
      setCurrentUser: (userId) => {
        const user = get().users.find((u) => u.id === userId) || null;
        set({ currentUser: user });
      },
      getUser: (id) => get().users.find((u) => u.id === id),
    }),
    { name: 'projecthub-user' }
  )
);

// ── UI Store ──

interface UIStore {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  filters: ViewFilters;
  setFilter: <K extends keyof ViewFilters>(key: K, value: ViewFilters[K]) => void;
  resetFilters: () => void;
  taskModalOpen: boolean;
  taskModalId: string | null;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  projectModalOpen: boolean;
  openProjectModal: () => void;
  closeProjectModal: () => void;
}

const defaultFilters: ViewFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
  project: 'all',
  dateRange: { start: null, end: null },
};

export const useUIStore = create<UIStore>()((set) => ({
  viewMode: 'overview',
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  filters: { ...defaultFilters },
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  taskModalOpen: false,
  taskModalId: null,
  openTaskModal: (taskId) => set({ taskModalOpen: true, taskModalId: taskId || null }),
  closeTaskModal: () => set({ taskModalOpen: false, taskModalId: null }),
  projectModalOpen: false,
  openProjectModal: () => set({ projectModalOpen: true }),
  closeProjectModal: () => set({ projectModalOpen: false }),
}));
