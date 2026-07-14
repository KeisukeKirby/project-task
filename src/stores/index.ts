// ============================================================
// Zustand Store — プロジェクト・タスク状態管理
// localStorage永続化 + イベントベース擬似リアルタイム同期
// ============================================================

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { persist } from 'zustand/middleware';
import type { Project, Task, TaskTemplate, User, TaskStatus, ViewMode, ViewFilters, Language, TaskActivity } from '@/types';
import { MOCK_USERS, MOCK_TEMPLATES, SAMPLE_DATA, generateId, generateTasksFromTemplate, backwardSchedule } from '@/lib/mock-data';

// ── Project Store ──

interface ProjectStore {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  reorderProjects: (startIndex: number, endIndex: number) => void;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
      projects: [],

      addProject: (data) => {
        const project: Project = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
        supabase.from('projects').insert([project]).then(({error}) => { if(error) console.error(error); });
        return project;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          ),
        }));
        supabase.from('projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({error}) => { if(error) console.error(error); });
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
        useTaskStore.getState().deleteTasksByProject(id);
        supabase.from('projects').delete().eq('id', id).then(({error}) => { if(error) console.error(error); });
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      reorderProjects: (startIndex, endIndex) => {
        set((state) => {
          const newProjects = [...state.projects];
          const [removed] = newProjects.splice(startIndex, 1);
          newProjects.splice(endIndex, 0, removed);
          return { projects: newProjects };
        });
        // Note: Full array ordering sync with DB would require a `sort_order` field.
        // Assuming client-side ordering is sufficient or ordering will be updated later.
      },
    }));

// ── Task Store ──

interface TaskStore {
  tasks: Task[];
  taskActivities: TaskActivity[];
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
  getTaskActivities: (taskId: string) => TaskActivity[];
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
      tasks: [],
      taskActivities: [],

      addTask: (data) => {
        const task: Task = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        supabase.from('tasks').insert([task]).then(({error}) => { if(error) console.error(error); });
        return task;
      },

      updateTask: (id, updates) => {
        const oldTask = get().getTask(id);
        const currentUser = useUserStore.getState().currentUser;
        
        // Track activities for important fields
        const newActivities: TaskActivity[] = [];
        if (oldTask && currentUser) {
          const fieldsToTrack = ['name', 'description', 'status', 'priority', 'planned_start_date', 'planned_end_date', 'assignees'] as const;
          fieldsToTrack.forEach(field => {
            if (updates[field] !== undefined) {
              const oldVal = oldTask[field as keyof Task];
              const newVal = updates[field];
              if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                const activity: TaskActivity = {
                  id: generateId(),
                  task_id: id,
                  user_id: currentUser.id,
                  field_name: field,
                  old_value: oldVal,
                  new_value: newVal,
                  created_at: new Date().toISOString()
                };
                newActivities.push(activity);
              }
            }
          });
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          ),
          taskActivities: [...state.taskActivities, ...newActivities]
        }));
        
        supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({error}) => { if(error) console.error(error); });
        
        if (newActivities.length > 0) {
          supabase.from('task_activities').insert(newActivities).then(({error}) => { if(error) console.error(error); });
        }
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        supabase.from('tasks').delete().eq('id', id).then(({error}) => { if(error) console.error(error); });
      },

      deleteTasksByProject: (projectId) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.project_id !== projectId) }));
        supabase.from('tasks').delete().eq('project_id', projectId).then(({error}) => { if(error) console.error(error); });
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
        
        get().updateTask(id, {
          status: 'done' as TaskStatus,
          actual_end_at: now.toISOString(),
          actual_lead_days: actualDays
        });
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
      
      getTaskActivities: (taskId) => {
        return get().taskActivities.filter(a => a.task_id === taskId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    }));

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
  addManualUser: (name: string) => Promise<User | null>;
}

export const useUserStore = create<UserStore>()((set, get) => ({
      users: [],
      currentUser: null,
      setCurrentUser: (userId) => {
        const user = get().users.find((u) => u.id === userId) || null;
        set({ currentUser: user });
      },
      getUser: (id) => get().users.find((u) => u.id === id),
      addManualUser: async (name) => {
        const id = crypto.randomUUID();
        const newUser: User = {
          id,
          email: `virtual-${id}@local.dev`,
          name,
          avatar_url: '',
          role: 'member',
          team: '',
          preferred_language: 'ja',
          max_concurrent_tasks: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Optimistic update
        set((state) => ({ users: [...state.users, newUser] }));
        
        // Push to Supabase
        const { error } = await supabase.from('users').insert([{
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          preferred_language: newUser.preferred_language,
          max_concurrent_tasks: newUser.max_concurrent_tasks
        }]);
        
        if (error) {
          console.error('Failed to insert virtual user:', error);
          return null;
        }
        
        return newUser;
      }
    }));

// ── UI Store ──

interface UIStore {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
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
  projectModalId: string | null;
  openProjectModal: (id?: string) => void;
  closeProjectModal: () => void;
  eventModalOpen: boolean;
  eventModalDate: string | null;
  eventModalEventId: string | null;
  openEventModal: (date: string, eventId?: string) => void;
  closeEventModal: () => void;
}

const defaultFilters: ViewFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
  project: 'all',
  dateRange: { start: null, end: null },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      viewMode: 'gantt',
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
      projectModalId: null,
      openProjectModal: (id?: string) => set({ projectModalOpen: true, projectModalId: id || null }),
      closeProjectModal: () => set({ projectModalOpen: false, projectModalId: null }),
      eventModalOpen: false,
      eventModalDate: null,
      eventModalEventId: null,
      openEventModal: (date: string, eventId?: string) => set({ eventModalOpen: true, eventModalDate: date, eventModalEventId: eventId || null }),
      closeEventModal: () => set({ eventModalOpen: false, eventModalDate: null, eventModalEventId: null }),
    }),
    { 
      name: 'projecthub-ui',
      partialize: (state) => ({ 
        theme: state.theme, 
        sidebarCollapsed: state.sidebarCollapsed, 
        viewMode: state.viewMode 
      })
    }
  )
);

// ── Event Store ──

import { ProjectEvent } from '@/types';

interface EventStore {
  events: ProjectEvent[];
  addEvent: (event: Omit<ProjectEvent, 'id' | 'created_at'>) => ProjectEvent;
  updateEvent: (id: string, updates: Partial<ProjectEvent>) => void;
  deleteEvent: (id: string) => void;
}

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (data) => {
        const newEvent: ProjectEvent = {
          ...data,
          id: generateId(),
          created_at: new Date().toISOString(),
        };
        set((state) => ({ events: [...state.events, newEvent] }));
        return newEvent;
      },
      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),
    }),
    { name: 'projecthub-events' }
  )
);
