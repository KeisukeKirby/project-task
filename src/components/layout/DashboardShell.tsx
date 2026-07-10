'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useUIStore, useUserStore, useProjectStore, useTaskStore } from '@/stores';
import type { Language, ViewMode, User } from '@/types';
import { getAvatarColor } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, ListTodo, Columns3, BarChart3, Calendar,
  FileText, Settings, Settings as SettingsIcon, ChevronLeft, Menu, Plus, Search,
  AlertCircle, Clock, FolderOpen, LogOut, Bell
} from 'lucide-react';
import { OverviewDashboard } from '@/components/views/OverviewDashboard';
import { MyTasksDashboard } from '@/components/views/MyTasksDashboard';
import { KanbanView } from '@/components/views/KanbanView';
import { GanttView } from '@/components/views/GanttView';
import { CalendarView } from '@/components/views/CalendarView';
import { TaskModal } from '@/components/modals/TaskModal';
import { ProjectModal } from '@/components/modals/ProjectModal';
import { EventModal } from '@/components/modals/EventModal';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { UserSelectModal } from '@/components/modals/UserSelectModal';

const NAV_ITEMS: { key: ViewMode; icon: React.ElementType; labelKey: string }[] = [
  { key: 'gantt', icon: BarChart3, labelKey: 'nav.gantt' },
  { key: 'overview', icon: LayoutDashboard, labelKey: 'nav.overview' },
  { key: 'my-tasks', icon: ListTodo, labelKey: 'nav.myTasks' },
  { key: 'kanban', icon: Columns3, labelKey: 'nav.kanban' },
  { key: 'calendar', icon: Calendar, labelKey: 'nav.calendar' },
];



export function DashboardShell() {
  const { lang, setLang, t } = useI18n();
  const {
    viewMode, setViewMode, sidebarCollapsed, toggleSidebar,
    selectedProjectId, setSelectedProjectId,
    taskModalOpen, closeTaskModal, openTaskModal,
    projectModalOpen, openProjectModal, closeProjectModal,
    eventModalOpen,
  } = useUIStore();
  const { currentUser, setCurrentUser } = useUserStore();
  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Use supabase for auth session fetching

  useEffect(() => {
    setMounted(true);
    
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setShowUserSelect(true);
      }
    });

    // Listen for auth state changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser('');
        setShowUserSelect(true);
        setUserMenuOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    // Map mktbarefootincth@gmail.com directly to the Beer mock user without requiring a public.users row
    if (email === 'mktbarefootincth@gmail.com') {
      const beerUser = {
        id: 'ae1b2de9-b7b1-424b-a42f-89766e2d016d', // Real UUID of Beer in database
        name: 'Beer',
        email: email,
        role: 'member',
        preferred_language: 'ja'
      };
      useUserStore.setState((state) => {
        const exists = state.users.find(u => u.id === 'ae1b2de9-b7b1-424b-a42f-89766e2d016d');
        if (!exists) {
          return { users: [...state.users, beerUser as any], currentUser: beerUser as any };
        }
        return { currentUser: beerUser as any };
      });
      setShowUserSelect(false);
      import('@/stores/supabaseSync').then((m) => m.initSupabaseSync());
      return;
    }

    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!error && data) {
      // Create a mock users list for UI fallback if not populated
      useUserStore.setState((state) => {
        const exists = state.users.find(u => u.id === data.id);
        if (!exists) {
          return { users: [...state.users, data as any], currentUser: data as any };
        }
        return { currentUser: data as any };
      });
      setShowUserSelect(false);
      
      import('@/stores/supabaseSync').then((m) => m.initSupabaseSync());
    } else {
      setShowUserSelect(true);
    }
  };

  // BYPASS AUTH LOCALLY
  // if (!session) {
  //  return <AuthScreen />;
  // }
  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="text-surface-400 text-sm">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (showUserSelect || !currentUser) {
    return <UserSelectModal />;
  }

  const overdueTasks = tasks.filter(t => {
    if (!t.planned_end_date || t.status === 'done') return false;
    return new Date(t.planned_end_date) < new Date(new Date().toISOString().split('T')[0]);
  });

  const dueSoonTasks = tasks.filter(t => {
    if (!t.planned_end_date || t.status === 'done') return false;
    const due = new Date(t.planned_end_date);
    const today = new Date(new Date().toISOString().split('T')[0]);
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    return due >= today && due <= threeDays;
  });

  const renderView = () => {
    switch (viewMode) {
      case 'overview': return <OverviewDashboard />;
      case 'my-tasks': return <MyTasksDashboard />;
      case 'kanban': return <KanbanView />;
      case 'gantt': return <GanttView />;
      case 'calendar': return <CalendarView />;
      default: return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* ═══ Sidebar ═══ */}
      <aside
        className={`fixed md:relative z-40 h-full transition-all duration-300 ease-out flex flex-col
          ${sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-white border-r border-surface-200`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in">
              <div className="font-bold text-surface-900 text-sm tracking-tight">ProjectHub</div>
              <div className="text-[10px] text-surface-400 -mt-0.5">{t('app.subtitle')}</div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto text-surface-400 hover:text-surface-600 transition-colors hidden md:block"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className={`text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            {t('nav.projects')}
          </div>
          
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setViewMode(item.key); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200
                  ${isActive
                    ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}`}
                data-tooltip={sidebarCollapsed ? t(item.labelKey) : undefined}
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
                {!sidebarCollapsed && (
                  <span className="text-sm truncate">{t(item.labelKey)}</span>
                )}
              </button>
            );
          })}

          {/* Quick Access */}
          <div className={`mt-6 text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            {t('nav.quickAccess')}
          </div>
          <button
            onClick={() => { setViewMode('my-tasks'); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-red-50 hover:text-red-700 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <AlertCircle className="w-[18px] h-[18px] text-red-400 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="text-sm">{t('nav.overdue')}</span>
                {overdueTasks.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{overdueTasks.length}</span>
                )}
              </>
            )}
          </button>
          <button
            onClick={() => { setViewMode('my-tasks'); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-amber-50 hover:text-amber-700 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <Clock className="w-[18px] h-[18px] text-amber-400 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="text-sm">{t('nav.dueSoon')}</span>
                {dueSoonTasks.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{dueSoonTasks.length}</span>
                )}
              </>
            )}
          </button>

          {/* Projects List */}
          <div className={`mt-6 text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            {t('nav.projects')}
          </div>
          {!sidebarCollapsed && projects.map((proj) => {
            const projTasks = tasks.filter(t => t.project_id === proj.id);
            const doneTasks = projTasks.filter(t => t.status === 'done');
            const progress = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
            return (
              <div
                key={proj.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-50 transition-all group cursor-pointer ${
                  selectedProjectId === proj.id ? 'bg-surface-50' : ''
                }`}
              >
                <div
                  className="flex-1 flex items-center gap-3"
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setViewMode('kanban');
                    setMobileSidebarOpen(false);
                  }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }} />
                  <span className="text-sm truncate flex-1 text-left">{getMultiLangText(proj.name, lang)}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-surface-400">{progress}%</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openProjectModal(proj.id);
                    }}
                    className="p-1 text-surface-400 hover:text-primary-600 rounded transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-surface-100 flex-shrink-0">
            <button
              onClick={() => openProjectModal()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('project.addProject')}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center gap-4 px-4 md:px-6 border-b border-surface-200 bg-white/80 backdrop-blur-sm flex-shrink-0 z-20">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden text-surface-500 hover:text-surface-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          {viewMode !== 'gantt' && (
            <h1 className="text-lg font-bold text-surface-900 hidden sm:block">
              {t(`nav.${viewMode === 'my-tasks' ? 'myTasks' : viewMode}`)}
            </h1>
          )}

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto sm:mx-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-1 bg-surface-100 rounded-lg p-1">
            {(['ja', 'en', 'th'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`lang-tab ${lang === l ? 'active' : ''}`}
              >
                {l === 'ja' ? 'JP' : l === 'en' ? 'EN' : 'TH'}
              </button>
            ))}
          </div>

          {/* Notifications */}
          <button className="relative text-surface-400 hover:text-surface-600 transition-colors">
            <Bell className="w-5 h-5" />
            {overdueTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                {overdueTasks.length}
              </span>
            )}
          </button>

          {/* New Task Button */}
          <div className="hidden sm:flex items-center gap-2">
            <CsvImportButton />
            <button
              onClick={() => openTaskModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('task.new')}</span>
            </button>
          </div>

          {/* User Avatar & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 group p-1 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <div
                className="avatar"
                style={{ backgroundColor: getAvatarColor(currentUser.id) }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm font-medium text-surface-700 hidden lg:block group-hover:text-primary-600 transition-colors">
                  {currentUser.name}
                </span>
              )}
            </button>
            
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-surface-100 py-1 z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowUserSelect(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                  >
                    Switch Account
                  </button>
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await supabase.auth.signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="animate-fade-in flex-1 flex flex-col min-h-0">
            {renderView()}
          </div>
        </main>
      </div>

      {/* ═══ Modals ═══ */}
      {taskModalOpen && (
        <ErrorBoundary>
          <TaskModal onClose={closeTaskModal} />
        </ErrorBoundary>
      )}
      {projectModalOpen && <ProjectModal onClose={closeProjectModal} />}
      {eventModalOpen && <EventModal />}
    </div>
  );
}
