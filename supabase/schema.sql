-- =======================================================================================
-- ProjectHub Supabase Schema
-- =======================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Users (Profiles) ──
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member', -- admin, owner, member, viewer
    team TEXT,
    max_concurrent_tasks INTEGER NOT NULL DEFAULT 5,
    preferred_language TEXT NOT NULL DEFAULT 'ja', -- ja, en, th
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ── 2. Task Templates ──
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name JSONB NOT NULL, -- {ja, en, th}
    description JSONB NOT NULL, -- {ja, en, th}
    category TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are viewable by everyone" ON public.task_templates FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert templates" ON public.task_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own templates" ON public.task_templates FOR UPDATE USING (auth.uid() = created_by);

-- ── 3. Template Steps ──
CREATE TABLE IF NOT EXISTS public.template_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
    name JSONB NOT NULL,
    description JSONB NOT NULL,
    sort_order INTEGER NOT NULL,
    estimated_days INTEGER NOT NULL DEFAULT 1,
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    depends_on_step_id UUID REFERENCES public.template_steps(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Template steps are viewable by everyone" ON public.template_steps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert steps" ON public.template_steps FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update steps" ON public.template_steps FOR UPDATE USING (auth.role() = 'authenticated');

-- ── 4. Projects ──
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name JSONB NOT NULL,
    description JSONB NOT NULL,
    deadline_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning', -- planning, active, completed, on_hold
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '📁',
    template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert projects" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update projects" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated');

-- ── 5. Project Members ──
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- owner, member, viewer
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members are viewable by everyone" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert project members" ON public.project_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update project members" ON public.project_members FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete project members" ON public.project_members FOR DELETE USING (auth.role() = 'authenticated');

-- ── 6. Tasks ──
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    template_step_id UUID REFERENCES public.template_steps(id) ON DELETE SET NULL,
    name JSONB NOT NULL, -- TranslatableText
    description JSONB NOT NULL, -- TranslatableText
    status TEXT NOT NULL DEFAULT 'todo', -- todo, in_progress, review, revision, done
    priority TEXT NOT NULL DEFAULT 'medium', -- critical, high, medium, low
    sort_order INTEGER NOT NULL,
    estimated_lead_days INTEGER NOT NULL DEFAULT 1,
    actual_lead_days INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_at TIMESTAMP WITH TIME ZONE,
    actual_end_at TIMESTAMP WITH TIME ZONE,
    assignees UUID[] DEFAULT '{}', -- Array of user IDs
    delay_tags TEXT[] DEFAULT '{}',
    post_processes JSONB DEFAULT '[]'::jsonb,
    editing_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    editing_started_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');

-- ── 7. Task Dependencies ──
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'finish_to_start',
    UNIQUE(task_id, depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dependencies are viewable by everyone" ON public.task_dependencies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert dependencies" ON public.task_dependencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update dependencies" ON public.task_dependencies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete dependencies" ON public.task_dependencies FOR DELETE USING (auth.role() = 'authenticated');

-- ── 8. Checklist Items ──
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checklist items are viewable by everyone" ON public.checklist_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert checklist items" ON public.checklist_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update checklist items" ON public.checklist_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete checklist items" ON public.checklist_items FOR DELETE USING (auth.role() = 'authenticated');

-- ── Realtime triggers ──
-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for tables
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_members;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.checklist_items;
alter publication supabase_realtime add table public.task_activities;

-- ── 9. Task Activities (History) ──
CREATE TABLE IF NOT EXISTS public.task_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,  -- 'name', 'description', 'status', 'planned_end_date', etc.
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities are viewable by everyone" ON public.task_activities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert activities" ON public.task_activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
- -   A d m i n   U s e r s   R L S   U p d a t e  
 - -   T h i s   s c r i p t   a d d s   a   p o l i c y   a l l o w i n g   a d m i n s   a n d   o w n e r s   t o   u p d a t e   a n d   d e l e t e   o t h e r   u s e r s '   p r o f i l e s .  
  
 C R E A T E   P O L I C Y   " A d m i n s   c a n   u p d a t e   a l l   p r o f i l e s "   O N   p u b l i c . u s e r s    
 F O R   U P D A T E   U S I N G   (  
     E X I S T S   (  
         S E L E C T   1   F R O M   p u b l i c . u s e r s   A S   a d m i n s  
         W H E R E   a d m i n s . i d   =   a u t h . u i d ( )   A N D   a d m i n s . r o l e   I N   ( ' a d m i n ' ,   ' o w n e r ' )  
     )  
 ) ;  
  
 C R E A T E   P O L I C Y   " A d m i n s   c a n   d e l e t e   a l l   p r o f i l e s "   O N   p u b l i c . u s e r s    
 F O R   D E L E T E   U S I N G   (  
     E X I S T S   (  
         S E L E C T   1   F R O M   p u b l i c . u s e r s   A S   a d m i n s  
         W H E R E   a d m i n s . i d   =   a u t h . u i d ( )   A N D   a d m i n s . r o l e   I N   ( ' a d m i n ' ,   ' o w n e r ' )  
     )  
 ) ;  
 