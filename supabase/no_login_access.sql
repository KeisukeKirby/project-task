-- =======================================================================================
-- ProjectHub: ログイン画面なし運用のための Supabase 設定（1 回だけ SQL Editor で実行）
--
-- アプリは Supabase Auth を使わず、公開 anon キーだけで読み書きします。
-- そのため、行レベルセキュリティ (RLS) のポリシーを「誰でも読み書きできる」に変更し、
-- users テーブルを auth.users から切り離して、名前だけでメンバーを追加できるようにします。
--
-- 注意: この設定後は URL を知っている人は誰でもデータを編集できます。
--       社内向け・リンクを共有した人だけが使う前提の設定です。
-- =======================================================================================

-- 1. users を Supabase Auth から切り離す（名前だけのメンバーを追加できるようにする）
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. 既存の RLS ポリシーをすべて外し、「誰でも読み書き可」のポリシーに置き換える
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'task_templates', 'template_steps', 'projects', 'project_members',
    'tasks', 'task_dependencies', 'checklist_items', 'task_activities'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Anyone with the app link can read and write" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- 3. anon / authenticated ロールにテーブル権限があることを確認（通常は既定で付与済み）
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
