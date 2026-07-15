'use client';

import React from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useProjectStore, useUserStore, useUIStore } from '@/stores';
import { getAvatarColor } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG, type TaskStatus } from '@/types';
import { Clock, AlertTriangle, GripVertical, Trash2, Settings, Filter } from 'lucide-react';
import { FilterDropdown } from '@/components/ui/FilterDropdown';

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'revision', 'done'];

export function KanbanView() {
  const { lang, t, formatDate } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const projects = useProjectStore((s) => s.projects).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const users = useUserStore((s) => s.users);
  const { selectedProjectId, openTaskModal, openProjectModal } = useUIStore();
  const currentUser = useUserStore((s) => s.currentUser);
  const today = new Date().toISOString().split('T')[0];
  
  const isViewer = currentUser?.role === 'viewer';
  const isMember = currentUser?.role === 'member';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  // Filters
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['todo', 'in_progress', 'review', 'revision', 'done']);
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);
  const [hasInitializedProjects, setHasInitializedProjects] = React.useState(false);

  React.useEffect(() => {
    if (projects.length > 0) {
      if (selectedProjectId) {
        setSelectedProjects([selectedProjectId]);
      } else if (!hasInitializedProjects) {
        setSelectedProjects(projects.map(p => p.id));
        setHasInitializedProjects(true);
      }
    }
  }, [projects, selectedProjectId, hasInitializedProjects]);

  const statusOptions = KANBAN_COLUMNS.map(s => ({
    id: s,
    label: t(`status.${s}`),
    color: STATUS_CONFIG[s as TaskStatus]?.color
  }));

  const projectOptions = projects.map(p => ({
    id: p.id,
    label: getMultiLangText(p.name, lang),
    color: '#3b82f6'
  }));

  const filteredTasks = tasks.filter(t => selectedProjects.includes(t.project_id));
  const visibleColumns = KANBAN_COLUMNS.filter(col => selectedStatuses.includes(col));

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'in_progress' && !task.actual_start_at) {
      updates.actual_start_at = new Date().toISOString();
    }
    if (newStatus === 'done' && !task.actual_end_at) {
      updates.actual_end_at = new Date().toISOString();
      if (task.actual_start_at) {
        const start = new Date(task.actual_start_at);
        updates.actual_lead_days = Math.ceil((Date.now() - start.getTime()) / 86400000);
      }
    }
    updateTask(taskId, updates as Record<string, string | number | null>);
  };

  const updateProject = useProjectStore((s) => s.updateProject);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editNameValue, setEditNameValue] = React.useState('');

  const handleNameEdit = (proj: any) => {
    if (!isAdmin) return;
    setEditingProjectId(proj.id);
    setEditNameValue(getMultiLangText(proj.name, lang));
  };

  const handleNameSave = async (proj: any) => {
    if (editNameValue.trim() && editNameValue.trim() !== getMultiLangText(proj.name, lang)) {
      const newName = editNameValue.trim();
      
      // Attempt to translate
      const translatedName = await import('@/lib/translate').then(m => m.translateText(newName, lang as any));
      
      if (translatedName) {
        updateProject(proj.id, {
          name: {
            ja: translatedName.ja,
            en: translatedName.en,
            th: translatedName.th
          }
        });
      } else {
        // Fallback if translation fails
        updateProject(proj.id, {
          name: {
            ja: newName,
            en: newName,
            th: newName
          }
        });
      }
    }
    setEditingProjectId(null);
  };

  return (
    <div className="p-4 md:p-6 h-full">
      {/* Project filter info */}
      {selectedProjectId && (
        <div className="mb-4 flex items-center gap-2">
          {(() => {
            const proj = projects.find(p => p.id === selectedProjectId);
            if (!proj) return null;
            return (
              <>
                <span className="text-lg">{proj.icon}</span>
                {editingProjectId === proj.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={() => handleNameSave(proj)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave(proj)}
                    className="text-lg font-bold text-surface-900 bg-transparent border-b-2 border-primary-500 focus:outline-none px-1 py-0"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 
                      className={`text-lg font-bold text-surface-900 ${isAdmin ? 'hover:text-primary-600 cursor-pointer' : ''} transition-colors`}
                      onClick={() => handleNameEdit(proj)}
                      title={isAdmin ? t('common.edit') : undefined}
                    >
                      {getMultiLangText(proj.name, lang)}
                    </h2>
                    {isAdmin && (
                      <button
                        onClick={() => openProjectModal(proj.id)}
                        className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title={t('project.edit')}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => useUIStore.getState().setSelectedProjectId(null)}
                  className="text-xs text-surface-400 hover:text-surface-600 ml-2 bg-surface-100 hover:bg-surface-200 px-2 py-1 rounded-full transition-colors"
                >
                  × {t('common.all')}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm(t('common.confirmDelete') || 'Are you sure you want to delete this project?')) {
                        useProjectStore.getState().deleteProject(proj.id);
                        useUIStore.getState().setSelectedProjectId(null);
                      }
                    }}
                    className="text-xs text-danger hover:text-red-700 ml-2 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> {t('common.delete')}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Filter Section */}
      <div className="flex items-center gap-4 mb-4">
        <FilterDropdown
          label={t('common.status') || 'ステータス'}
          title="ステータス (Status)"
          options={statusOptions}
          selectedIds={selectedStatuses}
          onChange={setSelectedStatuses}
        />
        <FilterDropdown
          label={t('common.project') || 'プロジェクト'}
          title="プロジェクト (Projects)"
          options={projectOptions}
          selectedIds={selectedProjects}
          onChange={setSelectedProjects}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-180px)]">
        {visibleColumns.map((status) => {
          const statusConf = STATUS_CONFIG[status];
          const columnTasks = filteredTasks
            .filter(t => t.status === status)
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <div
              key={status}
              className="kanban-column flex-shrink-0 w-[300px]"
              onDragOver={(e) => { 
                if (isViewer) return;
                e.preventDefault(); 
                e.currentTarget.classList.add('ring-2', 'ring-primary-300'); 
              }}
              onDragLeave={(e) => { 
                if (isViewer) return;
                e.currentTarget.classList.remove('ring-2', 'ring-primary-300'); 
              }}
              onDrop={(e) => {
                if (isViewer) return;
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-primary-300');
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId) handleDrop(taskId, status);
              }}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusConf.color }} />
                <span className="text-sm font-semibold text-surface-700">
                  {getMultiLangText(statusConf.label, lang)}
                </span>
                <span className="text-[10px] text-surface-400 bg-surface-200 px-1.5 py-0.5 rounded-full font-medium">
                  {columnTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {columnTasks.map((task) => {
                  const project = projects.find(p => p.id === task.project_id);
                  const isOverdue = task.planned_end_date && task.planned_end_date < today && task.status !== 'done';
                  const priorityConf = PRIORITY_CONFIG[task.priority];
                  const isReadOnly = isViewer || (isMember && !task.assignees.includes(currentUser?.id || ''));

                  return (
                    <div
                      key={task.id}
                      className={`kanban-card ${isOverdue ? 'border-l-3 border-l-danger' : ''} ${isReadOnly ? 'cursor-pointer' : ''}`}
                      draggable={!isReadOnly}
                      onDragStart={(e) => {
                        if (isReadOnly) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('taskId', task.id);
                        e.currentTarget.classList.add('opacity-50');
                      }}
                      onDragEnd={(e) => { if (!isReadOnly) e.currentTarget.classList.remove('opacity-50'); }}
                      onClick={() => openTaskModal(task.id)}
                    >
                      {/* Priority & Project */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityConf.color }} />
                        {project && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${project.color}12`, color: project.color }}>
                            {getMultiLangText(project.name, lang)}
                          </span>
                        )}
                      </div>

                      {/* Task name */}
                      <h4 className="text-sm font-medium text-surface-800 mb-2 line-clamp-2">
                        {getMultiLangText(task.name, lang)}
                      </h4>

                      {/* Meta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-surface-400">
                          {task.planned_end_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger font-medium' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {formatDate(task.planned_end_date)}
                            </span>
                          )}
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-danger" />}
                        </div>

                        {/* Assignees */}
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((userId) => {
                            const user = users.find(u => u.id === userId);
                            return (
                              <div
                                key={userId}
                                className="avatar avatar-sm ring-2 ring-white"
                                style={{ backgroundColor: getAvatarColor(userId) }}
                                title={user?.name}
                              >
                                {user?.name.charAt(0) || '?'}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Checklist */}
                      {task.checklist.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-surface-100">
                          <div className="flex items-center gap-2">
                            <div className="progress-bar flex-1">
                              <div className="progress-bar-fill bg-primary-400" style={{
                                width: `${(task.checklist.filter(c => c.is_completed).length / task.checklist.length) * 100}%`
                              }} />
                            </div>
                            <span className="text-[10px] text-surface-400">
                              {task.checklist.filter(c => c.is_completed).length}/{task.checklist.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
