'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useProjectStore, useUIStore, useUserStore, useEventStore } from '@/stores';
import { STATUS_CONFIG, Project, Task, ChecklistItem } from '@/types';
import { ZoomIn, ZoomOut, Maximize2, CheckSquare, Settings } from 'lucide-react';
import { isHoliday } from '@/lib/utils';

type GanttRow = 
  | { type: 'project'; project: Project; id: string }
  | { type: 'task'; task: Task; id: string }
  | { type: 'checklist'; task: Task; item: ChecklistItem; id: string };

export function GanttView() {
  const { lang, t, formatDate } = useI18n();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const { openTaskModal, openProjectModal } = useUIStore();
  const users = useUserStore((s) => s.users);
  const [localSelectedProjectId, setLocalSelectedProjectId] = useState<string | null>(null);
  const [dayWidth, setDayWidth] = useState(32);
  const today = new Date().toISOString().split('T')[0];
  const events = useEventStore((s) => s.events);
  const openEventModal = useUIStore((s) => s.openEventModal);

  const filteredTasks = localSelectedProjectId
    ? tasks.filter(t => t.project_id === localSelectedProjectId).sort((a, b) => a.sort_order - b.sort_order)
    : tasks.filter(t => t.planned_start_date && t.planned_end_date).sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id.localeCompare(b.project_id);
        return a.sort_order - b.sort_order;
      });

  const ganttRows = useMemo(() => {
    const rows: GanttRow[] = [];
    const projectsToShow = localSelectedProjectId 
      ? projects.filter(p => p.id === localSelectedProjectId)
      : projects.filter(p => filteredTasks.some(t => t.project_id === p.id));
      
    projectsToShow.forEach(project => {
      const projectTasks = filteredTasks.filter(t => t.project_id === project.id);
      if (projectTasks.length === 0) return;
      
      rows.push({ type: 'project', project, id: `proj-${project.id}` });
      
      projectTasks.forEach(task => {
        rows.push({ type: 'task', task, id: `task-${task.id}` });
        
        if (task.checklist && task.checklist.length > 0) {
          task.checklist
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .forEach(item => {
              rows.push({ type: 'checklist', task, item, id: `check-${item.id}` });
            });
        }
      });
    });
    
    return rows;
  }, [filteredTasks, projects, localSelectedProjectId]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const dates = filteredTasks.flatMap(t => [t.planned_start_date, t.planned_end_date].filter(Boolean) as string[]);
    filteredTasks.forEach(t => {
      if (t.checklist) {
        t.checklist.forEach(c => {
          if (c.due_date) dates.push(c.due_date);
        });
      }
    });

    const projectsToShow = localSelectedProjectId 
      ? projects.filter(p => p.id === localSelectedProjectId)
      : projects.filter(p => filteredTasks.some(t => t.project_id === p.id));
      
    projectsToShow.forEach(project => {
      if (project.deadline_date) dates.push(project.deadline_date);
    });
    
    if (dates.length === 0) {
      const now = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 7);
      const end = new Date(now); end.setDate(end.getDate() + 30);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }
    dates.sort();
    const start = new Date(dates[0]); start.setDate(start.getDate() - 3);
    const end = new Date(dates[dates.length - 1]); end.setDate(end.getDate() + 14);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }, [filteredTasks, projects, localSelectedProjectId]);

  const totalDays = useMemo(() => {
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    return Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  }, [dateRange]);

  const dayDates = useMemo(() => {
    const days: string[] = [];
    const current = new Date(dateRange.start);
    for (let i = 0; i < totalDays; i++) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [dateRange, totalDays]);

  const getBarStyle = (start: string, end: string) => {
    if (!start || !end) return { left: 0, width: 0 };
    const startDiff = Math.max(0, Math.ceil((new Date(start).getTime() - new Date(dateRange.start).getTime()) / 86400000));
    const duration = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
    return {
      left: startDiff * dayWidth,
      width: duration * dayWidth - 4,
    };
  };

  const getMilestoneStyle = (date: string) => {
    const diff = Math.max(0, Math.ceil((new Date(date).getTime() - new Date(dateRange.start).getTime()) / 86400000));
    return {
      left: diff * dayWidth + (dayWidth / 2) - 6, // center the 12px diamond
    };
  };

  const todayOffset = Math.ceil((new Date(today).getTime() - new Date(dateRange.start).getTime()) / 86400000) * dayWidth;

  // Group by week/month for header
  const months = useMemo(() => {
    const m: { label: string; days: number; startIdx: number }[] = [];
    let currentMonth = '';
    let count = 0;
    let startIdx = 0;
    dayDates.forEach((d, i) => {
      const date = new Date(d);
      const monthLabel = date.toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', year: 'numeric' });
      if (monthLabel !== currentMonth) {
        if (currentMonth) m.push({ label: currentMonth, days: count, startIdx });
        currentMonth = monthLabel;
        count = 1;
        startIdx = i;
      } else {
        count++;
      }
    });
    if (currentMonth) m.push({ label: currentMonth, days: count, startIdx });
    return m;
  }, [dayDates, lang]);

  const ROW_HEIGHT = 40;

  return (
    <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-surface-900">{t('gantt.title')}</h2>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setDayWidth(w => Math.max(16, w - 4))} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setDayWidth(32)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDayWidth(w => Math.min(64, w + 4))} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto card">
        <div className="flex min-h-full">
          {/* Task List (Left Panel) */}
          <div className="w-[240px] min-w-[240px] border-r border-surface-200 bg-white z-30 sticky left-0 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="h-[60px] border-b border-surface-200 flex flex-col justify-center px-4 gap-1 sticky top-0 bg-white z-40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{t('task.title')}</span>
                <select
                  value={localSelectedProjectId || ''}
                  onChange={(e) => setLocalSelectedProjectId(e.target.value || null)}
                  className="bg-surface-50 border border-surface-200 text-[10px] text-surface-700 rounded px-1.5 py-0.5 outline-none focus:border-primary-500 max-w-[140px] truncate"
                >
                  <option value="">{t('common.all') || 'All Projects'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{getMultiLangText(p.name, lang)}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Rows */}
            {ganttRows.map((row) => {
              if (row.type === 'project') {
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 px-4 bg-surface-50/80"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="text-sm font-bold text-surface-900 truncate flex-1 flex items-center gap-2">
                      {getMultiLangText(row.project.name, lang)}
                      <button
                        onClick={() => openProjectModal(row.project.id)}
                        className="p-1 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title={t('project.edit')}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                );
              }
              
              if (row.type === 'checklist') {
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 pl-8 pr-4 hover:bg-surface-50 cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => openTaskModal(row.task.id)}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span className={`text-[11px] truncate flex-1 ${row.item.is_completed ? 'text-surface-400 line-through' : 'text-surface-600'}`}>
                      {typeof row.item.title === 'string' ? row.item.title : getMultiLangText(row.item.title, lang)}
                    </span>
                  </div>
                );
              }

              // type === 'task'
              const statusConf = STATUS_CONFIG[row.task.status];
              const assignee = row.task.assignees[0] ? users.find(u => u.id === row.task.assignees[0]) : null;
              
              const isOverdueTask = row.task.planned_end_date && row.task.planned_end_date < new Date().toISOString().split('T')[0] && row.task.status !== 'done';
              const isCompletedTask = row.task.status === 'done';

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-2 pl-4 pr-4 hover:bg-surface-50 cursor-pointer transition-colors"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => openTaskModal(row.task.id)}
                >
                  {isCompletedTask ? (
                    <span className="flex-shrink-0 text-[10px]">✅</span>
                  ) : isOverdueTask ? (
                    <span className="flex-shrink-0 text-[10px]">⚠</span>
                  ) : (
                    <span className="status-dot flex-shrink-0" style={{ backgroundColor: statusConf.color, width: '8px', height: '8px' }} />
                  )}
                  {assignee && (
                    <span className="text-[10px] text-surface-500 font-medium px-1.5 py-0.5 bg-surface-100 rounded flex-shrink-0 max-w-[60px] truncate" title={assignee.name}>
                      {assignee.name}
                    </span>
                  )}
                  <span className="text-xs text-surface-700 truncate flex-1 font-medium">
                    {getMultiLangText(row.task.name, lang)}
                  </span>
                  <span className="text-[10px] text-surface-400">{row.task.estimated_lead_days}d</span>
                </div>
              );
            })}
          </div>

          {/* Timeline (Right Panel) */}
          <div className="flex-1 relative">
            {/* Month Headers */}
            <div className="h-[30px] flex border-b border-surface-200 sticky top-0 bg-white z-20">
              {months.map((m, i) => (
                <div key={i} className="flex items-center justify-center text-[10px] font-semibold text-surface-600 border-r border-surface-100"
                  style={{ width: m.days * dayWidth, minWidth: m.days * dayWidth }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day Headers */}
            <div className="h-[30px] flex border-b border-surface-200 sticky top-[30px] bg-white z-20">
              {dayDates.map((d, i) => {
                const date = new Date(d);
                const isSaturday = date.getDay() === 6;
                const isSundayOrHoliday = date.getDay() === 0 || isHoliday(d);
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    className={`flex items-center justify-center text-[10px] border-r border-surface-50 flex-shrink-0 cursor-pointer transition-colors ${
                      isToday ? 'bg-primary-50 text-primary-700 font-bold' :
                      isSundayOrHoliday ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                      isSaturday ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' :
                      'text-surface-500 hover:bg-surface-100'
                    }`}
                    style={{ width: dayWidth, minWidth: dayWidth }}
                    onClick={() => openEventModal(d)}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Task Bars */}
            <div className="relative" style={{ width: totalDays * dayWidth, height: ganttRows.length * ROW_HEIGHT }}>
              {/* Background columns */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dayDates.map((d) => {
                  const date = new Date(d);
                  const isSaturday = date.getDay() === 6;
                  const isSundayOrHoliday = date.getDay() === 0 || isHoliday(d);
                  const isToday = d === today;
                  return (
                    <div
                      key={d}
                      className={`flex-shrink-0 border-r border-surface-50 ${
                        isToday ? 'bg-primary-50/30' : 
                        isSundayOrHoliday ? 'bg-red-50' : 
                        isSaturday ? 'bg-blue-50' : ''
                      }`}
                      style={{ width: dayWidth, height: ganttRows.length * ROW_HEIGHT }}
                    />
                  );
                })}
              </div>

              {/* Events */}
              {events.map((event) => {
                const eventOffset = Math.ceil((new Date(event.date).getTime() - new Date(dateRange.start).getTime()) / 86400000);
                if (eventOffset < 0 || eventOffset >= totalDays) return null; // out of view

                let top = 0;
                let height = ganttRows.length * ROW_HEIGHT;

                if (event.project_id) {
                  const startIdx = ganttRows.findIndex(r => r.type === 'project' && r.project.id === event.project_id);
                  if (startIdx === -1) return null; // Project not shown
                  let endIdx = ganttRows.findIndex((r, i) => i > startIdx && r.type === 'project');
                  if (endIdx === -1) endIdx = ganttRows.length;
                  
                  top = startIdx * ROW_HEIGHT;
                  height = (endIdx - startIdx) * ROW_HEIGHT;
                }

                return (
                  <div
                    key={event.id}
                    className="absolute z-[2] pointer-events-none"
                    style={{
                      left: eventOffset * dayWidth,
                      width: dayWidth,
                      top,
                      height,
                      backgroundColor: event.color,
                    }}
                  >
                    <div 
                      className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white tracking-widest drop-shadow-md pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ 
                        writingMode: 'vertical-rl', 
                        textOrientation: 'mixed',
                        maxHeight: 'calc(100% - 16px)',
                        overflow: 'hidden',
                        padding: '8px 0' // give some click area
                      }}
                      onClick={() => setActiveEventId(activeEventId === event.id ? null : event.id)}
                    >
                      {event.title}
                    </div>
                    
                    {activeEventId === event.id && (
                      <div className="absolute top-10 left-full ml-2 bg-white text-surface-800 px-3 py-2 rounded-lg shadow-xl border border-surface-200 z-50 whitespace-nowrap text-sm flex flex-col gap-1 pointer-events-auto">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold" style={{ color: event.color }}>{event.title}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveEventId(null); }}
                            className="text-surface-400 hover:text-surface-600"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="text-xs text-surface-500 font-normal">{event.date}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Today marker */}
              <div
                className="absolute top-0 w-0.5 bg-primary-500 z-[3] pointer-events-none"
                style={{ left: todayOffset + dayWidth / 2, height: ganttRows.length * ROW_HEIGHT }}
              >
                <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-primary-500 rounded-full border-2 border-white shadow-sm" />
              </div>

              {/* Bars */}
              {ganttRows.map((row, idx) => {
                if (row.type === 'project') {
                  // Project rows have no bars in timeline, just a subtle background
                  return (
                    <div
                      key={row.id}
                      className="absolute w-full bg-surface-50/50 pointer-events-none"
                      style={{ top: idx * ROW_HEIGHT, left: 0, height: ROW_HEIGHT }}
                    />
                  );
                }

                if (row.type === 'checklist') {
                  // Render a milestone marker if due_date is set
                  if (!row.item.due_date) {
                    return (
                      <div
                        key={row.id}
                        className="absolute w-full pointer-events-none"
                        style={{ top: idx * ROW_HEIGHT, left: 0, height: ROW_HEIGHT }}
                      />
                    );
                  }
                  
                  const milestoneStyle = getMilestoneStyle(row.item.due_date);
                  return (
                    <div
                      key={row.id}
                      className="absolute flex items-center justify-center"
                      style={{ top: idx * ROW_HEIGHT, left: 0, width: '100%', height: ROW_HEIGHT }}
                    >
                      <div
                        className="absolute z-10 w-3 h-3 bg-primary-500 transform rotate-45 border border-white shadow-sm cursor-pointer hover:scale-125 transition-transform"
                        style={{ left: milestoneStyle.left }}
                        onClick={() => openTaskModal(row.task.id)}
                        title={`${typeof row.item.title === 'string' ? row.item.title : getMultiLangText(row.item.title, lang)} (${row.item.due_date})`}
                      />
                    </div>
                  );
                }

                // type === 'task'
                const { task } = row;
                const barStyle = getBarStyle(task.planned_start_date!, task.planned_end_date!);
                const project = projects.find(p => p.id === task.project_id);
                const isOverdue = task.planned_end_date && task.planned_end_date < today && task.status !== 'done';
                const statusConf = STATUS_CONFIG[task.status];

                return (
                  <div
                    key={row.id}
                    className="absolute flex items-center"
                    style={{ top: idx * ROW_HEIGHT, left: 0, width: '100%', height: ROW_HEIGHT }}
                  >
                    {barStyle.width > 0 && (
                      <div
                        className={`gantt-bar absolute flex items-center px-2 text-white text-[10px] font-medium whitespace-nowrap overflow-hidden z-10 ${isOverdue ? 'overdue' : ''}`}
                        style={{
                          left: barStyle.left + 2,
                          width: barStyle.width,
                          height: ROW_HEIGHT - 12,
                          backgroundColor: project?.color || statusConf.color,
                          opacity: task.status === 'done' ? 0.6 : 1,
                        }}
                        onClick={() => openTaskModal(task.id)}
                        title={`${getMultiLangText(task.name, lang)} (${task.estimated_lead_days}d)`}
                      >
                        {barStyle.width > 50 && (
                          <span className="truncate drop-shadow-sm flex-1">{getMultiLangText(task.name, lang)}</span>
                        )}
                        {task.status === 'done' && <span className="absolute top-0 right-1 text-[9px] drop-shadow-sm">✅</span>}
                        {isOverdue && <span className="absolute top-0 right-1 text-[9px] drop-shadow-sm text-yellow-300">⚠</span>}
                      </div>
                    )}

                    {/* Actual progress overlay */}
                    {task.actual_start_at && task.status !== 'done' && barStyle.width > 0 && (
                      <div
                        className="absolute h-full rounded-md opacity-30 z-10 pointer-events-none"
                        style={{
                          left: barStyle.left + 2,
                          height: ROW_HEIGHT - 12,
                          width: Math.min(
                            Math.ceil((Date.now() - new Date(task.actual_start_at).getTime()) / 86400000) * dayWidth,
                            barStyle.width
                          ),
                          backgroundColor: '#000',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
