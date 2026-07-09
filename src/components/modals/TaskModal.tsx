'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useProjectStore, useUserStore, useUIStore } from '@/stores';
import { getAvatarColor } from '@/components/layout/DashboardShell';
import { STATUS_CONFIG, PRIORITY_CONFIG, type TaskStatus, type Priority, type Language } from '@/types';
import { X, Play, CheckCircle2, Clock, Calendar, Users, Flag, MessageSquare, CheckSquare, Plus, Trash2, AlertTriangle, FolderOpen } from 'lucide-react';
import { generateId } from '@/lib/mock-data';
import { translateText } from '@/lib/translate';

export function TaskModal({ onClose }: { onClose: () => void }) {
  const { lang, t, formatDate } = useI18n();
  const { taskModalId } = useUIStore();
  const task = useTaskStore((s) => taskModalId ? s.getTask(taskModalId) : undefined);
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

  const [form, setForm] = useState({
    name: task?.name ? getMultiLangText(task.name, lang) : '',
    description: task?.description ? getMultiLangText(task.description, lang) : '',
    status: task?.status || 'todo' as TaskStatus,
    priority: task?.priority || 'medium' as Priority,
    project_id: task?.project_id || projects[0]?.id || '',
    assignees: task?.assignees || (currentUser ? [currentUser.id] : []),
    estimated_lead_days: task?.estimated_lead_days || 1,
    planned_start_date: task?.planned_start_date || today,
    planned_end_date: task?.planned_end_date || today,
  });
  const [newCheckItem, setNewCheckItem] = useState('');
  const [editingCheckItemId, setEditingCheckItemId] = useState<string | null>(null);
  const [editCheckItemTitle, setEditCheckItemTitle] = useState('');

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Update form fields if language changes while viewing an existing task
  useEffect(() => {
    if (task && !isNew) {
      setForm(prev => ({
        ...prev,
        name: getMultiLangText(task.name, lang),
        description: getMultiLangText(task.description, lang),
      }));
    }
  }, [lang, task, isNew]);

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
        checklist: [],
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
      });
    }
    onClose();
  } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim() || !task) return;
    const titleText = newCheckItem;
    const newItemId = generateId();
    const newItem = {
      id: newItemId,
      task_id: task.id,
      title: titleText,
      is_completed: false,
      sort_order: task.checklist.length,
      completed_at: null,
      completed_by: null,
      due_date: null,
    };
    updateTask(task.id, { checklist: [...task.checklist, newItem] });
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
      
      const currentTask = useTaskStore.getState().tasks.find(t => t.id === task.id);
      if (currentTask) {
        useTaskStore.getState().updateTask(task.id, {
          checklist: currentTask.checklist.map(c => c.id === newItemId ? { ...c, title: titleField } : c)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveCheckItemEdit = async (itemId: string) => {
    if (!task) return;
    const titleText = editCheckItemTitle.trim();
    if (!titleText) {
      setEditingCheckItemId(null);
      return;
    }

    updateTask(task.id, {
      checklist: task.checklist.map(c => c.id === itemId ? { ...c, title: titleText } : c)
    });
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
      
      const currentTask = useTaskStore.getState().tasks.find(t => t.id === task.id);
      if (currentTask) {
        useTaskStore.getState().updateTask(task.id, {
          checklist: currentTask.checklist.map(c => c.id === itemId ? { ...c, title: titleField } : c)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheckItem = (itemId: string) => {
    if (!task) return;
    updateTask(task.id, {
      checklist: task.checklist.map(c =>
        c.id === itemId ? { ...c, is_completed: !c.is_completed, completed_at: !c.is_completed ? new Date().toISOString() : null } : c
      ),
    });
  };

  const isOverdue = task?.planned_end_date && task.planned_end_date < today && task.status !== 'done';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content w-full max-w-2xl mx-4">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-surface-200 ${isOverdue ? 'bg-red-50' : ''}`}>
          <div className="flex items-center gap-2">
            {isOverdue && <AlertTriangle className="w-4 h-4 text-danger" />}
            <h2 className="text-lg font-bold text-surface-900">{isNew ? t('task.new') : t('common.edit')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {task && task.status === 'todo' && (
              <button onClick={() => { startTask(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-medium transition-all">
                <Play className="w-3.5 h-3.5" /> {t('task.startWork')}
              </button>
            )}
            {task && (task.status === 'in_progress' || task.status === 'review') && (
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
              className="w-full text-xl font-bold text-surface-900 border-0 border-b-2 border-transparent focus:border-primary-500 bg-transparent outline-none pb-2 transition-colors placeholder:text-surface-300"
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
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.status === key
                        ? 'text-white shadow-sm'
                        : 'text-surface-600 bg-surface-50 hover:bg-surface-100'
                    }`}
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
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.priority === key
                        ? 'text-white shadow-sm'
                        : 'text-surface-600 bg-surface-50 hover:bg-surface-100'
                    }`}
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
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
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
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setForm({
                        ...form,
                        assignees: isAssigned
                          ? form.assignees.filter(id => id !== user.id)
                          : [...form.assignees, user.id],
                      });
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAssigned
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300'
                        : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
                    }`}
                  >
                    <div className="avatar avatar-sm" style={{ backgroundColor: getAvatarColor(user.id) }}>
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                  </button>
                );
              })}
              
              {isAddingMember ? (
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
                    className="px-2 py-1.5 rounded-lg border border-primary-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-32"
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); setIsAddingMember(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-500 border border-dashed border-surface-300 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 追加
                </button>
              )}
            </div>
          </div>

          {/* Dates & Lead Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('task.startDate')}</label>
              <input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('task.endDate')}</label>
              <input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> {t('task.estimatedDays')}</label>
              <input type="number" min={1} value={form.estimated_lead_days} onChange={(e) => setForm({ ...form, estimated_lead_days: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
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
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          {/* Checklist (edit mode only) */}
          {task && (
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> {t('task.checklist')} ({task.checklist.filter(c => c.is_completed).length}/{task.checklist.length})
              </label>
              <div className="space-y-1.5">
                {task.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleCheckItem(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.is_completed ? 'bg-primary-500 border-primary-500 text-white' : 'border-surface-300 hover:border-primary-400'
                      }`}
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
                        className="flex-1 text-sm px-1 py-0.5 border border-primary-300 rounded bg-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    ) : (
                      <span 
                        className={`text-sm flex-1 cursor-pointer hover:bg-surface-50 px-1 py-0.5 -mx-1 rounded transition-colors ${item.is_completed ? 'text-surface-400 line-through' : 'text-surface-700'}`}
                        onClick={() => {
                          setEditingCheckItemId(item.id);
                          setEditCheckItemTitle(typeof item.title === 'string' ? item.title : getMultiLangText(item.title, lang));
                        }}
                      >
                        {typeof item.title === 'string' ? item.title : getMultiLangText(item.title, lang)}
                      </span>
                    )}
                    <input
                      type="date"
                      value={item.due_date || ''}
                      onChange={(e) => updateTask(task.id, {
                        checklist: task.checklist.map(c => c.id === item.id ? { ...c, due_date: e.target.value || null } : c)
                      })}
                      className="px-2 py-1 text-xs rounded-md border border-surface-200 text-surface-500 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                    />
                    <button
                      onClick={() => updateTask(task.id, { checklist: task.checklist.filter(c => c.id !== item.id) })}
                      className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-danger transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCheckItem()}
                    placeholder={t('task.addChecklist')}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-surface-300 text-sm bg-transparent focus:outline-none focus:border-primary-400 placeholder:text-surface-300"
                  />
                  <button onClick={handleAddCheckItem} className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-2">
            {task && (
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
              {t('common.cancel')}
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
