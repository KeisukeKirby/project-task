import { supabase } from '@/lib/supabase';
import { useProjectStore, useTaskStore, useUserStore } from './index';

export async function initSupabaseSync() {
  console.log('Initializing Supabase Sync...');

  // 1. Initial Fetch
  const [usersRes, projectsRes, tasksRes, activitiesRes] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('task_activities').select('*')
  ]);

  if (usersRes.data) {
    const mappedUsers = usersRes.data.map(u => {
      if (u.email === 'mktbarefootincth@gmail.com') {
        return { ...u, id: 'ae1b2de9-b7b1-424b-a42f-89766e2d016d', name: 'Beer' };
      }
      return u;
    });
    useUserStore.setState({ users: mappedUsers });
  }
  if (projectsRes.data) useProjectStore.setState({ projects: projectsRes.data });
  if (tasksRes.data) useTaskStore.setState({ tasks: tasksRes.data });
  if (activitiesRes.data) useTaskStore.setState({ taskActivities: activitiesRes.data });

  // 2. Setup Realtime Subscriptions
  supabase
    .channel('public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        useProjectStore.setState(s => {
          if (!s.projects.find(p => p.id === payload.new.id)) {
            return { projects: [...s.projects, payload.new as any] };
          }
          return s;
        });
      } else if (payload.eventType === 'UPDATE') {
        useProjectStore.setState(s => ({
          projects: s.projects.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
        }));
      } else if (payload.eventType === 'DELETE') {
        useProjectStore.setState(s => ({
          projects: s.projects.filter(p => p.id !== payload.old.id)
        }));
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        useTaskStore.setState(s => {
          if (!s.tasks.find(t => t.id === payload.new.id)) {
            return { tasks: [...s.tasks, payload.new as any] };
          }
          return s;
        });
      } else if (payload.eventType === 'UPDATE') {
        useTaskStore.setState(s => ({
          tasks: s.tasks.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
        }));
      } else if (payload.eventType === 'DELETE') {
        useTaskStore.setState(s => ({
          tasks: s.tasks.filter(t => t.id !== payload.old.id)
        }));
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_activities' }, (payload) => {
      useTaskStore.setState(s => {
        if (!s.taskActivities.find(a => a.id === payload.new.id)) {
          return { taskActivities: [...s.taskActivities, payload.new as any] };
        }
        return s;
      });
    })
    .subscribe();
}
