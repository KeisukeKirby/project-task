'use client';

import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { BarChart3, Mail, Lock, Loader2 } from 'lucide-react';
import { useUserStore } from '@/stores';

export function UserSelectModal() {
  const { lang, t, setLang } = useI18n();
  const users = useUserStore((s) => s.users);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (users.length === 0) {
      supabase.from('users').select('*').then(({ data, error }) => {
        if (data && !error && data.length > 0) {
          useUserStore.setState({ users: data });
        }
      });
    }
  }, [users.length]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        let loginEmail = email;
        if (selectedUserId) {
          const u = users.find(u => u.id === selectedUserId);
          if (u) loginEmail = u.email;
        }
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        });
        if (signUpError) throw signUpError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ProjectHub</h1>
          <p className="text-primary-200 text-sm mt-1">
            {lang === 'ja' ? 'プロジェクト進捗管理ダッシュボード' :
             lang === 'th' ? 'ระบบจัดการความคืบหน้าโปรเจกต์' :
             'Project Progress Management Dashboard'}
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center justify-center gap-1 mb-6 bg-surface-0/10 rounded-lg p-1 mx-auto w-fit">
          {(['ja', 'en', 'th'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                lang === l ? 'bg-surface-0 text-surface-900 shadow-md' : 'text-white/60 hover:text-white/90'
              }`}
            >
              {l === 'ja' ? '日本語' : l === 'en' ? 'English' : 'ภาษาไทย'}
            </button>
          ))}
        </div>

        {/* Auth Form */}
        <div className="bg-surface-0/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {isLogin ? (lang === 'ja' ? 'ログイン' : 'Login') : (lang === 'ja' ? 'アカウント作成' : 'Sign Up')}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-0/5 border border-white/10 rounded-lg pl-3 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all"
                    placeholder="Your Name"
                  />
                </div>
              </div>
            )}
            
            {isLogin && users.length > 0 ? (
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">User</label>
                <div className="relative">
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-surface-0/5 border border-white/10 rounded-lg pl-3 pr-4 py-2.5 text-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all appearance-none"
                  >
                    <option value="" disabled className="text-surface-900">Select your name</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="text-surface-900">{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-0/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-surface-0/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? (lang === 'ja' ? 'ログイン' : 'Sign In') : (lang === 'ja' ? '登録する' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-primary-300 hover:text-primary-200 transition-colors"
            >
              {isLogin 
                ? (lang === 'ja' ? 'アカウントを作成する' : 'Create an account') 
                : (lang === 'ja' ? '既存のアカウントでログイン' : 'Sign in with existing account')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
