'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useUIStore, useUserStore, useProjectStore, useTaskStore, getRememberedUserId } from '@/stores';
import type { Language, ViewMode } from '@/types';
import { getAvatarColor, isAdminUser } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  LayoutDashboard, ListTodo, Columns3, BarChart3, Calendar,
  Settings, Settings as SettingsIcon, ChevronLeft, Menu, Plus,
  AlertCircle, Clock, Bell, Sun, Moon, UserRound, X, AlertTriangle
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
import { CsvExportButton } from '@/components/ui/CsvExportButton';
import { UserSelectModal } from '@/components/modals/UserSelectModal';
import { AccountsDashboard } from '@/components/views/AccountsDashboard';

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
    theme, setTheme,
  } = useUIStore();
  const { currentUser, setCurrentUser } = useUserStore();
  const notice = useUIStore((s) => s.notice);
  const setNotice = useUIStore((s) => s.setNotice);
  const projects = useProjectStore((s) => s.projects).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const tasks = useTaskStore((s) => s.tasks);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // ログイン画面は無し。データを読み込んだら、前回選んだ名前を復元する。
  // 名前がまだ選ばれていないときだけ「名前を選ぶ」画面を出す。
  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    import('@/stores/supabaseSync')
      .then((m) => m.initSupabaseSync())
      .catch((err) => console.error('Supabase sync failed:', err))
      .finally(() => {
        if (cancelled) return;
        const remembered = getRememberedUserId();
        if (remembered) setCurrentUser(remembered);
        if (!useUserStore.getState().currentUser) setShowUserSelect(true);
        setDataLoaded(true);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存エラーの通知は数秒で自動的に消す
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'system') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!mounted || !dataLoaded) {
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
    return <UserSelectModal onClose={() => setShowUserSelect(false)} />;
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
      case 'accounts': return <AccountsDashboard />;
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
          bg-surface-0 border-r border-surface-200`}
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
            {t('nav.views')}
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

          {/* Admin Tools */}
          {isAdminUser(currentUser) && (
            <>
              <div className={`mt-6 text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
                {t('nav.adminMenu')}
              </div>
              <button
                onClick={() => { setViewMode('accounts'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  viewMode === 'accounts' 
                    ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                data-tooltip={sidebarCollapsed ? t('nav.accounts') : undefined}
              >
                <Settings className={`w-[18px] h-[18px] flex-shrink-0 ${viewMode === 'accounts' ? 'text-primary-600' : ''}`} />
                {!sidebarCollapsed && (
                  <span className="text-sm">{t('nav.accounts')}</span>
                )}
              </button>
            </>
          )}

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
                  {(isAdminUser(currentUser) || currentUser?.role === 'member') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjectModal(proj.id);
                      }}
                      className="p-1 text-surface-400 hover:text-primary-600 rounded transition-colors"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (isAdminUser(currentUser) || currentUser?.role === 'member') && (
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
        <header className="h-16 flex items-center gap-4 px-4 md:px-6 border-b border-surface-200 bg-surface-0/80 backdrop-blur-sm flex-shrink-0 z-20">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden text-surface-500 hover:text-surface-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title (the Gantt view draws its own) */}
          {viewMode !== 'gantt' && (
            <h1 className="text-lg font-bold text-surface-900 truncate min-w-0">
              {t(`nav.${viewMode === 'my-tasks' ? 'myTasks' : viewMode}`)}
            </h1>
          )}

          <div className="flex-1" />

          {/* Language Tabs (on phones they live in the user menu) */}
          <div className="hidden sm:flex items-center gap-1 bg-surface-100 rounded-lg p-1">
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

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden sm:block p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNotificationsOpen(prev => !prev);
              }}
              className="relative text-surface-400 hover:text-surface-600 transition-colors p-1"
            >
              <Bell className="w-5 h-5 pointer-events-none" />
              {overdueTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
                  {overdueTasks.length}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[90]" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNotificationsOpen(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-80 bg-surface-0 rounded-lg shadow-xl border border-surface-200 py-2 z-[100]">
                  <div className="px-4 py-2 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-900">{t('notification.title')}</h3>
                    <span className="text-xs text-surface-500">{t('notification.count', { count: String(overdueTasks.length) })}</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {overdueTasks.length > 0 ? (
                      overdueTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="px-4 py-3 hover:bg-surface-50 border-b border-surface-50 last:border-0 cursor-pointer transition-colors" 
                          onClick={() => { 
                            openTaskModal(task.id); 
                            setNotificationsOpen(false); 
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-danger shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-surface-900 line-clamp-2">{getMultiLangText(task.name, lang)}</p>
                              <p className="text-xs text-danger mt-1">{t('notification.overduePrefix')}: {task.planned_end_date}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-surface-500 text-sm">
                        {t('notification.none')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Task Button */}
          {currentUser?.role !== 'viewer' && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2">
                <CsvExportButton />
                <CsvImportButton />
              </div>
              <button
                onClick={() => openTaskModal()}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                title={t('task.new')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('task.new')}</span>
              </button>
            </div>
          )}

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
                <div className="absolute right-0 mt-2 w-56 bg-surface-0 rounded-xl shadow-xl border border-surface-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-surface-100">
                    <div className="text-sm font-semibold text-surface-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-surface-400">{t(`role.${currentUser.role}`)}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowUserSelect(true);
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                  >
                    <UserRound className="w-4 h-4" />
                    {t('auth.switchUser')}
                  </button>
                  <div className="sm:hidden px-4 py-2 border-t border-surface-100">
                    <div className="flex items-center gap-1 bg-surface-100 rounded-lg p-1">
                      {(['ja', 'en', 'th'] as Language[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => setLang(l)}
                          className={`lang-tab flex-1 text-center whitespace-nowrap ${lang === l ? 'active' : ''}`}
                        >
                          {l === 'ja' ? 'JP' : l === 'en' ? 'EN' : 'TH'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                    className="sm:hidden w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
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

      {/* ═══ Save error / info notice ═══ */}
      {notice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-md animate-fade-in">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm ${
            notice.kind === 'error'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-100'
              : 'bg-surface-0 border-surface-200 text-surface-800'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{t(`notice.${notice.message}`)}</div>
              {notice.detail && <div className="text-xs opacity-70 mt-0.5 break-words">{notice.detail}</div>}
            </div>
            <button onClick={() => setNotice(null)} className="p-1 rounded hover:bg-black/5" title={t('notice.dismiss')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
