'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useProjectStore, useUserStore, useUIStore } from '@/stores';
import { getAvatarColor, isAdminUser } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG, type TaskStatus, type Priority, type Language, type ChecklistItem, type Task, type PostProcess, type MultiLangText } from '@/types';
import { X, Play, CheckCircle2, Clock, Calendar, Users, Flag, MessageSquare, CheckSquare, Plus, Trash2, AlertTriangle, FolderOpen, History } from 'lucide-react';
import { generateId } from '@/lib/mock-data';
import { translateText } from '@/lib/translate';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

function SortablePostProcessItem({ pp, lang, isReadOnly, onDelete, t }: { pp: PostProcess, lang: Language, isReadOnly: boolean, onDelete: (id: string) => void, t: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: pp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200">
      {!isReadOnly && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-surface-400 hover:text-surface-600 mr-1 p-1">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <span className="text-sm flex-1 text-surface-700">{typeof pp.name === 'object' && pp.name !== null ? getMultiLangText(pp.name as MultiLangText, lang as Language) : pp.name}</span>
      <span className="text-xs font-medium text-surface-500 bg-surface-200 px-2 py-0.5 rounded-full">{pp.days} {t('common.days') || 'days'}</span>
      {!isReadOnly && (
        <button
          onClick={() => onDelete(pp.id)}
          className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-danger transition-all p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function TaskModal({ onClose }: { onClose: () => void }) {
  const { lang, t, formatDate } = useI18n();
  const { taskModalId } = useUIStore();
  const task = useTaskStore((s) => taskModalId ? s.getTask(taskModalId) : undefined);
  const allActivities = useTaskStore((s) => s.taskActivities);
  const activities = useMemo(() => {
    return taskModalId 
      ? allActivities.filter(a => a.task_id === taskModalId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : [];
  }, [allActivities, taskModalId]);
  const updateTask = useTaskStore((s) => s.updateTask);
  const addTask = useTaskStore((s) => s.addTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const startTask = useTaskStore((s) => s.startTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const projects = useProjectStore((s) => s.projects);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  const today = new Date().toISOString().split('T')[0];

  const isNew = !taskModalId;
  const isViewer = currentUser?.role === 'viewer';
  const isMember = currentUser?.role === 'member';
  
  // Members can only edit if it's new, or if they are assigned to it.
  const isReadOnly = isViewer || (isMember && !isNew && !(() => {
    try {
      const assigns = Array.isArray(task?.assignees) ? task?.assignees : (typeof task?.assignees === 'string' ? JSON.parse(task.assignees) : []);
      return assigns.includes(currentUser?.id);
    } catch { return false; }
  })());
  
  // Members cannot edit assignees (always themselves)
  const canEditAssignees = !isViewer && !isMember;

  const [form, setForm] = useState({
    name: task?.name ? (typeof task.name === 'string' ? task.name : getMultiLangText(task.name as any, lang)) : '',
    description: task?.description ? (typeof task.description === 'string' ? task.description : getMultiLangText(task.description as any, lang)) : '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    project_id: task?.project_id || projects[0]?.id || '',
    assignees: (() => {
      try {
        return (Array.isArray(task?.assignees) ? task.assignees : (typeof task?.assignees === 'string' ? JSON.parse(task.assignees) : (currentUser ? [currentUser.id] : []))) as string[];
      } catch (e) {
        console.error('Failed to parse assignees', e);
        return currentUser ? [currentUser.id] : [];
      }
    })(),
    planned_start_date: task?.planned_start_date || new Date().toISOString().split('T')[0],
    planned_end_date: task?.planned_end_date || new Date().toISOString().split('T')[0],
    estimated_lead_days: task?.estimated_lead_days || 1,
  });

  const [formChecklist, setFormChecklist] = useState<ChecklistItem[]>(() => {
    try {
      return Array.isArray(task?.checklist) ? task.checklist : (typeof task?.checklist === 'string' ? JSON.parse(task.checklist) : []);
    } catch (e) {
      console.error('Failed to parse checklist', e);
      return [];
    }
  });

  const [formPostProcesses, setFormPostProcesses] = useState<PostProcess[]>(task?.post_processes || []);
  const [newPostProcessName, setNewPostProcessName] = useState('');
  const [newPostProcessDays, setNewPostProcessDays] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  
  const [newCheckItem, setNewCheckItem] = useState('');
  const [editingCheckItemId, setEditingCheckItemId] = useState<string | null>(null);
  const [editCheckItemTitle, setEditCheckItemTitle] = useState('');

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Update form fields if language changes while viewing an existing task
  useEffect(() => {
    if (task && !isNew) {
      setForm(prev => {
        const newName = getMultiLangText(task.name as any, lang);
        const newDesc = getMultiLangText(task.description as any, lang);
        if (prev.name === newName && prev.description === newDesc) {
          return prev;
        }
        return { ...prev, name: newName, description: newDesc };
      });
      setFormChecklist(prev => {
        const newChecklist = Array.isArray(task.checklist) ? task.checklist : (typeof task.checklist === 'string' ? JSON.parse(task.checklist) : []);
        // Prevent infinite loops by checking if references/values changed
        if (JSON.stringify(prev) === JSON.stringify(newChecklist)) {
          return prev;
        }
        return newChecklist;
      });
      setFormPostProcesses(task.post_processes || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Auto-calculate estimated_lead_days when dates change
  useEffect(() => {
    if (form.planned_start_date && form.planned_end_date) {
      const start = new Date(form.planned_start_date);
      const end = new Date(form.planned_end_date);
      if (end >= start) {
        const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
        if (form.estimated_lead_days !== days) {
          setForm(prev => ({ ...prev, estimated_lead_days: days }));
        }
      }
    }
  }, [form.planned_start_date, form.planned_end_date]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);

    try {
      let finalChecklist = [...formChecklist];
      if (newCheckItem.trim()) {
        finalChecklist.push({
          id: generateId(),
          task_id: task?.id || '',
          title: newCheckItem.trim(),
          is_completed: false,
          sort_order: formChecklist.length,
          due_date: null,
          assignee_id: null,
          completed_at: null,
          completed_by: null,
        });
        setNewCheckItem('');
      }

      let finalPostProcesses = [...formPostProcesses];
      if (newPostProcessName.trim()) {
        finalPostProcesses.push({ id: generateId(), name: newPostProcessName.trim(), days: newPostProcessDays });
        setNewPostProcessName('');
      }

      // Translate post processes that are just strings
      for (let i = 0; i < finalPostProcesses.length; i++) {
        if (typeof finalPostProcesses[i].name === 'string') {
          const originalName = finalPostProcesses[i].name as string;
          const translatedPp = await translateText(originalName, lang as Language);
          finalPostProcesses[i].name = {
            ja: translatedPp?.ja || originalName,
            en: translatedPp?.en || originalName,
            th: translatedPp?.th || originalName,
          };
        }
      }

      const translatedName = await translateText(form.name, lang as Language);
      const translatedDesc = form.description.trim() ? await translateText(form.description, lang as Language) : null;

      const nameField = {
        original: form.name,
        original_lang: lang as Language,
        ja: translatedName?.ja || form.name,
        en: translatedName?.en || form.name,
        th: translatedName?.th || form.name,
        ja_confirmed: true,
        en_confirmed: true,
        th_confirmed: true,
      };

      const descField = {
        original: form.description,
        original_lang: lang as Language,
        ja: translatedDesc?.ja || form.description,
        en: translatedDesc?.en || form.description,
        th: translatedDesc?.th || form.description,
        ja_confirmed: true,
        en_confirmed: true,
        th_confirmed: true,
      };

    if (isNew) {
      addTask({
        project_id: form.project_id,
        template_step_id: null,
        name: nameField,
        description: descField,
        status: form.status,
        priority: form.priority,
        sort_order: 99,
        estimated_lead_days: form.estimated_lead_days,
        actual_lead_days: null,
        planned_start_date: form.planned_start_date,
        planned_end_date: form.planned_end_date,
        actual_start_at: null,
        actual_end_at: null,
        assignees: form.assignees,
        dependencies: [],
        checklist: finalChecklist,
        post_processes: finalPostProcesses,
        delay_tags: [],
        editing_user_id: null,
        editing_started_at: null,
        created_by: currentUser?.id || '',
      });
    } else if (task) {
      updateTask(task.id, {
        name: nameField,
        description: descField,
        status: form.status,
        priority: form.priority,
        project_id: form.project_id,
        assignees: form.assignees,
        estimated_lead_days: form.estimated_lead_days,
        planned_start_date: form.planned_start_date,
        planned_end_date: form.planned_end_date,
        checklist: finalChecklist,
        post_processes: finalPostProcesses,
      });
    }
    onClose();
  } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFormPostProcesses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    const titleText = newCheckItem;
    const newItemId = generateId();
    const newItem = {
      id: newItemId,
      task_id: task?.id || 'new-task',
      title: titleText,
      is_completed: false,
      sort_order: formChecklist.length,
      completed_at: null,
      completed_by: null,
      due_date: null,
      assignee_id: null,
    };
    
    setFormChecklist(prev => [...prev, newItem]);
    setNewCheckItem('');

    try {
      const translated = await translateText(titleText, lang as Language);
      const titleField = {
        original: titleText,
        original_lang: lang as Language,
        ja: translated?.ja || titleText,
        en: translated?.en || titleText,
        th: translated?.th || titleText,
        ja_confirmed: true,
        en_confirmed: true,
        th_confirmed: true,
      };
      
      setFormChecklist(prev => prev.map(c => c.id === newItemId ? { ...c, title: titleField } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const saveCheckItemEdit = async (itemId: string) => {
    const titleText = editCheckItemTitle.trim();
    if (!titleText) {
      setEditingCheckItemId(null);
      return;
    }

    setFormChecklist(prev => prev.map(c => c.id === itemId ? { ...c, title: titleText } : c));
    setEditingCheckItemId(null);

    try {
      const translated = await translateText(titleText, lang as Language);
      const titleField = {
        original: titleText,
        original_lang: lang as Language,
        ja: translated?.ja || titleText,
        en: translated?.en || titleText,
        th: translated?.th || titleText,
        ja_confirmed: true,
        en_confirmed: true,
        th_confirmed: true,
      };
      
      setFormChecklist(prev => prev.map(c => c.id === itemId ? { ...c, title: titleField } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheckItem = (itemId: string) => {
    setFormChecklist(prev => prev.map(c =>
      c.id === itemId ? { ...c, is_completed: !c.is_completed, completed_at: !c.is_completed ? new Date().toISOString() : null, completed_by: !c.is_completed ? currentUser?.id || null : null } : c
    ));
  };

  const isOverdue = task?.planned_end_date && task.planned_end_date < today && task.status !== 'done';

  const handleAddPostProcess = () => {
    if (!newPostProcessName.trim()) return;
    setFormPostProcesses(prev => [...prev, { id: generateId(), name: newPostProcessName.trim(), days: newPostProcessDays }]);
    setNewPostProcessName('');
    setNewPostProcessDays(1);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-2xl mx-4">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-surface-200 ${isOverdue ? 'bg-red-50' : ''}`}>
          <div className="flex items-center gap-2">
            {isOverdue && <AlertTriangle className="w-4 h-4 text-danger" />}
            <h2 className="text-lg font-bold text-surface-900">{isNew ? t('task.new') : t('common.edit')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && task && task.status === 'todo' && (
              <button onClick={() => { startTask(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-medium transition-all">
                <Play className="w-3.5 h-3.5" /> {t('task.startWork')}
              </button>
            )}
            {!isReadOnly && task && (task.status === 'in_progress' || task.status === 'review') && (
              <button onClick={() => { completeTask(task.id); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium transition-all">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('task.completeWork')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Task Name */}
          <div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('task.name')}
              disabled={isReadOnly}
              className="w-full text-xl font-bold text-surface-900 border-0 border-b-2 border-transparent focus:border-primary-500 bg-transparent outline-none pb-2 transition-colors placeholder:text-surface-300 disabled:bg-transparent disabled:opacity-80"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">{t('task.status')}</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([key, conf]) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, status: key })}
                    disabled={isReadOnly}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.status === key
                        ? 'text-white shadow-sm'
                        : 'text-surface-600 bg-surface-50 hover:bg-surface-100'
                    } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    style={form.status === key ? { backgroundColor: conf.color } : {}}
                  >
                    {conf.icon} {getMultiLangText(conf.label, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">{t('task.priority')}</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, conf]) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, priority: key })}
                    disabled={isReadOnly}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.priority === key
                        ? 'text-white shadow-sm'
                        : 'text-surface-600 bg-surface-50 hover:bg-surface-100'
                    } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    style={form.priority === key ? { backgroundColor: conf.color } : {}}
                  >
                    {conf.icon} {getMultiLangText(conf.label, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {t('project.title')}</label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              disabled={isReadOnly}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 disabled:bg-surface-50 disabled:text-surface-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{getMultiLangText(p.name, lang)}</option>
              ))}
            </select>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> {t('task.assignees')}</label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => {
                const isAssigned = form.assignees.includes(user.id);
                
                let isAllowedToAssign = true;
                if (currentUser?.role === 'member') {
                  if (user.role !== 'member' && user.id !== currentUser.id) {
                    isAllowedToAssign = false;
                  }
                }

                if (!canEditAssignees && !isAssigned) return null; // Hide unassigned if can't edit
                if (!isAllowedToAssign && !isAssigned) return null; // Hide if not allowed and not assigned

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (!canEditAssignees || !isAllowedToAssign) return;
                      setForm({
                        ...form,
                        assignees: isAssigned
                          ? form.assignees.filter(id => id !== user.id)
                          : [...form.assignees, user.id],
                      });
                    }}
                    disabled={!canEditAssignees}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAssigned
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300'
                        : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
                    } ${(!canEditAssignees || !isAllowedToAssign) ? 'cursor-default opacity-80' : ''}`}
                  >
                    <div className="avatar avatar-sm" style={{ backgroundColor: getAvatarColor(user.id) }}>
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs font-bold leading-tight">{user.name}</span>
                      <span className="text-[10px] leading-tight opacity-75">{user.email}</span>
                    </div>
                  </button>
                );
              })}
              
              {canEditAssignees && (isAddingMember ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="名前を入力..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newMemberName.trim()) {
                        e.preventDefault();
                        const store = useUserStore.getState();
                        if (store.addManualUser) {
                          const user = await store.addManualUser(newMemberName.trim());
                          if (user) {
                            setForm({ ...form, assignees: [...form.assignees, user.id] });
                          }
                        }
                        setNewMemberName('');
                        setIsAddingMember(false);
                      }
                      if (e.key === 'Escape') {
                        setIsAddingMember(false);
                        setNewMemberName('');
                      }
                    }}
                    onBlur={() => {
                      setIsAddingMember(false);
                      setNewMemberName('');
                    }}
                    className="px-2 py-1.5 rounded-lg border border-primary-300 text-xs bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500 w-32"
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); setIsAddingMember(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-500 border border-dashed border-surface-300 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 追加
                </button>
              ))}
            </div>
          </div>

          {/* Dates & Lead Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('task.startDate')}</label>
              <input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-surface-50 disabled:text-surface-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('task.endDate')}</label>
              <input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-surface-50 disabled:text-surface-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> {t('task.estimatedDays')}</label>
              <input type="number" min={1} value={form.estimated_lead_days} onChange={(e) => setForm({ ...form, estimated_lead_days: parseInt(e.target.value) || 1 })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-surface-50 disabled:text-surface-500" />
            </div>
          </div>

          {/* Lead Time Actual (read-only) */}
          {task?.actual_lead_days !== null && task?.actual_lead_days !== undefined && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-surface-50">
              <div className="text-xs">
                <span className="text-surface-500">{t('task.actualDays')}: </span>
                <span className={`font-bold ${task.actual_lead_days > task.estimated_lead_days ? 'text-danger' : 'text-success'}`}>
                  {task.actual_lead_days}{t('common.days')}
                </span>
              </div>
              {task.actual_start_at && (
                <div className="text-xs text-surface-400">
                  {t('task.actualStart')}: {formatDate(task.actual_start_at)}
                </div>
              )}
              {task.actual_end_at && (
                <div className="text-xs text-surface-400">
                  {t('task.actualEnd')}: {formatDate(task.actual_end_at)}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">{t('task.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('task.description')}
              disabled={isReadOnly}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none disabled:bg-surface-50 disabled:text-surface-500"
            />
          </div>

          {/* Checklist (edit mode only) */}
          {/* Subtasks (Checklist) */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> {t('task.checklist') || 'Subtasks'} ({formChecklist.filter(c => c.is_completed).length}/{formChecklist.length})
            </label>
            <div className="space-y-1.5">
              {formChecklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => { if (!isReadOnly) toggleCheckItem(item.id); }}
                    disabled={isReadOnly}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.is_completed ? 'bg-primary-500 border-primary-500 text-white' : 'border-surface-300'
                    } ${!isReadOnly && !item.is_completed ? 'hover:border-primary-400' : ''} ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {item.is_completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                  {editingCheckItemId === item.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editCheckItemTitle}
                      onChange={(e) => setEditCheckItemTitle(e.target.value)}
                      onBlur={() => saveCheckItemEdit(item.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCheckItemEdit(item.id)}
                      className="flex-1 text-sm px-1 py-0.5 border border-primary-300 rounded bg-surface-0 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  ) : (
                    <span 
                      className={`text-sm flex-1 px-1 py-0.5 -mx-1 rounded transition-colors ${item.is_completed ? 'text-surface-400 line-through' : 'text-surface-700'} ${!isReadOnly ? 'cursor-pointer hover:bg-surface-50' : ''}`}
                      onClick={() => {
                        if (isReadOnly) return;
                        setEditingCheckItemId(item.id);
                        setEditCheckItemTitle(typeof item.title === 'string' ? item.title : getMultiLangText(item.title, lang));
                      }}
                    >
                      {typeof item.title === 'string' ? item.title : getMultiLangText(item.title, lang)}
                    </span>
                  )}
                  
                  {/* Assignee */}
                  <select
                    value={item.assignee_id || ''}
                    disabled={isReadOnly}
                    onChange={(e) => setFormChecklist(prev => prev.map(c => c.id === item.id ? { ...c, assignee_id: e.target.value || null } : c))}
                    className="w-24 px-1 py-1 text-xs rounded-md border border-surface-200 text-surface-600 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:bg-surface-50"
                  >
                    <option value="">未割当</option>
                    {users.filter(u => projects.find(p => p.id === form.project_id)?.members?.some((m: any) => m.user_id === u.id)).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>

                  {/* Due Date */}
                  <input
                    type="date"
                    value={item.due_date || ''}
                    disabled={isReadOnly}
                    onChange={(e) => setFormChecklist(prev => prev.map(c => c.id === item.id ? { ...c, due_date: e.target.value || null } : c))}
                    className="px-1 py-1 text-xs rounded-md border border-surface-200 text-surface-500 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:bg-surface-50"
                  />
                  
                  {!isReadOnly && (
                    <button
                      onClick={() => setFormChecklist(prev => prev.filter(c => c.id !== item.id))}
                      className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-danger transition-all p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCheckItem()}
                    placeholder={t('task.addChecklist') || 'Add Subtask'}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-surface-300 text-sm bg-transparent focus:outline-none focus:border-primary-400 placeholder:text-surface-300"
                  />
                  <button onClick={handleAddCheckItem} className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Post Processes */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {t('task.postProcess') || 'Post Processes'}
            </label>
            <div className="space-y-1.5">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={formPostProcesses.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {formPostProcesses.map(pp => (
                    <SortablePostProcessItem
                      key={pp.id}
                      pp={pp}
                      lang={lang as Language}
                      isReadOnly={isReadOnly}
                      onDelete={(id) => setFormPostProcesses(prev => prev.filter(p => p.id !== id))}
                      t={t}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {!isReadOnly && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newPostProcessName}
                    onChange={(e) => setNewPostProcessName(e.target.value)}
                    placeholder={t('task.postProcessName') || 'Post Process Name'}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-surface-300 text-sm bg-transparent focus:outline-none focus:border-primary-400 placeholder:text-surface-300"
                  />
                  <div className="flex items-center gap-1 bg-surface-0 border border-surface-200 rounded-lg px-2">
                    <input
                      type="number"
                      min="1"
                      value={newPostProcessDays}
                      onChange={(e) => setNewPostProcessDays(parseInt(e.target.value) || 1)}
                      className="w-12 py-1.5 text-sm text-center bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-surface-400 pr-1">{t('common.days') || 'days'}</span>
                  </div>
                  <button onClick={handleAddPostProcess} className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Activity History */}
          {!isNew && activities.length > 0 && (
            <div className="pt-4 border-t border-surface-200 mt-6">
              <div className="flex items-center justify-between mb-4">
                <label 
                  className="text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-surface-700"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="w-3 h-3" /> {t('task.history') || 'Activity History'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-md transition-colors"
                  title={showHistory ? 'Hide history' : 'Show history'}
                >
                  <Plus className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-45' : ''}`} />
                </button>
              </div>
              
              {showHistory && (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-200 before:to-transparent">
                {activities.map((activity) => {
                  const user = users.find(u => u.id === activity.user_id);
                  let fieldLabel = activity.field_name;
                  switch(activity.field_name) {
                    case 'name': fieldLabel = t('task.name') || 'Name'; break;
                    case 'description': fieldLabel = t('task.description') || 'Description'; break;
                    case 'status': fieldLabel = t('task.status') || 'Status'; break;
                    case 'priority': fieldLabel = t('task.priority') || 'Priority'; break;
                    case 'planned_start_date': fieldLabel = t('task.startDate') || 'Start Date'; break;
                    case 'planned_end_date': fieldLabel = t('task.endDate') || 'End Date'; break;
                    case 'assignees': fieldLabel = t('task.assignees') || 'Assignees'; break;
                    case 'creation': fieldLabel = 'タスク作成'; break;
                  }
                  
                  let oldDisplay = JSON.stringify(activity.old_value);
                  let newDisplay = JSON.stringify(activity.new_value);
                  
                  if (activity.field_name === 'name' || activity.field_name === 'description' || activity.field_name === 'creation') {
                     oldDisplay = typeof activity.old_value === 'object' ? getMultiLangText(activity.old_value, lang) : activity.old_value;
                     newDisplay = typeof activity.new_value === 'object' ? getMultiLangText(activity.new_value, lang) : activity.new_value;
                  }
                  if (activity.field_name === 'assignees') {
                     oldDisplay = Array.isArray(activity.old_value) ? activity.old_value.map((id: string) => users.find(u=>u.id===id)?.name || id).join(', ') : '';
                     newDisplay = Array.isArray(activity.new_value) ? activity.new_value.map((id: string) => users.find(u=>u.id===id)?.name || id).join(', ') : '';
                  }

                  return (
                    <div key={activity.id} className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-white bg-surface-100 flex items-center justify-center shadow-sm z-10" style={user ? {backgroundColor: getAvatarColor(user.id)} : {}}>
                        {user ? (
                           <span className="text-white text-xs font-bold">{user.name.charAt(0)}</span>
                        ) : (
                           <History className="w-3.5 h-3.5 text-surface-500" />
                        )}
                      </div>
                      <div className="flex-1 bg-surface-50 rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-surface-900">{user?.name || 'Unknown User'}</span>
                          <span className="text-xs text-surface-400">{formatDate(activity.created_at)}</span>
                        </div>
                        <div className="text-surface-600">
                          {activity.field_name === 'creation' ? (
                            <span>タスク <span className="font-semibold">{newDisplay || ''}</span> を作成しました</span>
                          ) : (
                            <>
                              Updated <span className="font-semibold">{fieldLabel}</span>
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className="line-through text-surface-400 truncate max-w-[150px]" title={oldDisplay}>{oldDisplay || '(empty)'}</span>
                                <span className="text-surface-400">→</span>
                                <span className="font-medium text-primary-600 truncate max-w-[150px]" title={newDisplay}>{newDisplay || '(empty)'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-2">
            {!isReadOnly && task && (
              <button
                onClick={() => { deleteTask(task.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-danger bg-red-50 hover:bg-red-100 text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-surface-600 hover:bg-surface-100 transition-colors">
              {isReadOnly ? t('common.close') || 'Close' : t('common.cancel')}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  isNew ? t('common.create') : t('common.save')
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
