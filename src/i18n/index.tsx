'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';

import ja from './ja.json';
import en from './en.json';
import th from './th.json';

const translations: Record<Language, Record<string, unknown>> = { ja, en, th };

type TranslationFunction = (key: string, params?: Record<string, string>) => string;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationFunction;
  formatDate: (dateStr: string | null | undefined) => string;
  formatRelativeDate: (dateStr: string | null | undefined) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === 'string' ? current : path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ja');

  useEffect(() => {
    const saved = localStorage.getItem('projecthub_lang') as Language | null;
    if (saved && ['ja', 'en', 'th'].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('projecthub_lang', newLang);
    document.documentElement.lang = newLang === 'th' ? 'th' : newLang === 'en' ? 'en' : 'ja';
  }, []);

  const t: TranslationFunction = useCallback((key: string, params?: Record<string, string>) => {
    let text = getNestedValue(translations[lang] as Record<string, unknown>, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [lang]);

  const formatDate = useCallback((dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dateOnly.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return getNestedValue(translations[lang] as Record<string, unknown>, 'common.today');
    if (diffDays === 1) return getNestedValue(translations[lang] as Record<string, unknown>, 'common.tomorrow');
    if (diffDays === -1) return getNestedValue(translations[lang] as Record<string, unknown>, 'common.yesterday');

    const localeMap: Record<Language, string> = { ja: 'ja-JP', en: 'en-US', th: 'th-TH' };
    return date.toLocaleDateString(localeMap[lang], { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }, [lang]);

  const formatRelativeDate = useCallback((dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (lang === 'ja') {
      if (diffMin < 1) return 'たった今';
      if (diffMin < 60) return `${diffMin}分前`;
      if (diffHrs < 24) return `${diffHrs}時間前`;
      if (diffDays < 7) return `${diffDays}日前`;
    } else if (lang === 'th') {
      if (diffMin < 1) return 'เมื่อสักครู่';
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      if (diffHrs < 24) return `${diffHrs} ชั่วโมงที่แล้ว`;
      if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    } else {
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
    }
    return formatDate(dateStr);
  }, [lang, formatDate]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, formatDate, formatRelativeDate }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function getMultiLangText(text: { ja: string; en: string; th: string } | undefined, lang: Language): string {
  if (!text) return '';
  return text[lang] || text.ja || text.en || '';
}
