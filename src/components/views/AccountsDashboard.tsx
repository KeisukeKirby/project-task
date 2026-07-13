'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/stores';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { Shield, ShieldAlert, Key, UserPlus, CheckCircle2, User as UserIcon } from 'lucide-react';
import { getAvatarColor, isAdminUser } from '@/lib/utils';
import type { UserRole } from '@/types';

export function AccountsDashboard() {
  const { t } = useI18n();
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Check admin rights
  if (!isAdminUser(currentUser)) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-surface-900">アクセス権限がありません</h2>
        <p className="text-surface-500 mt-2">このページは管理者のみ表示できます。</p>
      </div>
    );
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email || !name || !password) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Add to public.users table (if not automatically created by triggers)
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert([{
          id: authData.user.id,
          email,
          name,
          role,
          preferred_language: 'ja'
        }]);

        if (dbError) throw dbError;

        setMessage('アカウントが正常に作成されました。');
        setEmail('');
        setName('');
        setPassword('');
        
        // Refresh users store (normally handled by realtime sync)
      }
    } catch (err: any) {
      setError(err.message || 'アカウント作成中にエラーが発生しました。');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            アカウント管理
          </h2>
          <p className="text-surface-500 text-sm mt-1">システムのアクセス権限とパスワード管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Account Form */}
        <div className="card p-5 lg:col-span-1 border-t-4 border-t-primary-500">
          <h3 className="font-bold text-surface-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5" />
            新規アカウント作成
          </h3>
          
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">メールアドレス</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">名前</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="田中 太郎"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">初期パスワード</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="6文字以上"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">権限 (Role)</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="admin">管理者 (Admin)</option>
                <option value="member">一般メンバー (Member)</option>
                <option value="viewer">閲覧者 (Viewer)</option>
              </select>
            </div>

            {error && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
            {message && <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {message}</div>}

            <button 
              type="submit" 
              disabled={isCreating}
              className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? '作成中...' : 'アカウントを作成'}
            </button>
          </form>
        </div>

        {/* Existing Users List */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-surface-900 flex items-center gap-2 mb-4">
            <UserIcon className="w-5 h-5" />
            登録済みアカウント一覧
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="pb-3 text-xs font-semibold text-surface-500">ユーザー</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">メールアドレス</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">権限</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm ring-2 ring-white" style={{ backgroundColor: getAvatarColor(user.id) }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-surface-900 text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-surface-600">{user.email}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        user.role === 'admin' ? 'bg-primary-100 text-primary-700' : 
                        user.role === 'member' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-surface-100 text-surface-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">
                        権限変更
                      </button>
                      <span className="text-surface-300 mx-2">|</span>
                      <button className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline">
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
