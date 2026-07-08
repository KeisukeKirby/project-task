'use client';

import React, { useState, useMemo } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useProjectStore, useUIStore } from '@/stores';
import { STATUS_CONFIG } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarView() {
  const { lang, t, formatDate } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const { openTaskModal } = useUIStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date().toISOString().split('T')[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleDateString(
    lang === 'ja' ? 'ja-JP' : lang === 'th' ? 'th-TH' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const weekDays = useMemo(() => {
    const locale = lang === 'ja' ? 'ja-JP' : lang === 'th' ? 'th-TH' : 'en-US';
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i); // Jan 2024 starts on Monday
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [lang]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: true });
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(t => t.planned_end_date === dateStr);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-surface-900">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors">
            {t('common.today')}
          </button>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card flex-1 overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-surface-200">
          {weekDays.map((day, i) => (
            <div key={i} className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-danger' : i === 6 ? 'text-primary-500' : 'text-surface-500'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((dayInfo, i) => {
            const dayTasks = getTasksForDate(dayInfo.date);
            const isToday = dayInfo.date === today;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={dayInfo.date}
                className={`min-h-[100px] border-b border-r border-surface-100 p-1.5 transition-colors
                  ${!dayInfo.isCurrentMonth ? 'bg-surface-50/50' : ''}
                  ${isWeekend && dayInfo.isCurrentMonth ? 'bg-surface-50/30' : ''}
                  ${isToday ? 'bg-primary-50/50 ring-1 ring-inset ring-primary-200' : ''}
                  hover:bg-surface-50`}
              >
                {/* Day number */}
                <div className={`text-xs mb-1 ${
                  isToday ? 'w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold' :
                  !dayInfo.isCurrentMonth ? 'text-surface-300' :
                  'text-surface-600 font-medium'
                }`}>
                  {dayInfo.day}
                </div>

                {/* Tasks */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const project = projects.find(p => p.id === task.project_id);
                    const statusConf = STATUS_CONFIG[task.status];
                    return (
                      <div
                        key={task.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity font-medium"
                        style={{
                          backgroundColor: `${project?.color || statusConf.color}15`,
                          color: project?.color || statusConf.color,
                          borderLeft: `2px solid ${project?.color || statusConf.color}`,
                        }}
                        onClick={() => openTaskModal(task.id)}
                        title={getMultiLangText(task.name, lang)}
                      >
                        {getMultiLangText(task.name, lang)}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-surface-400 pl-1.5">+{dayTasks.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
