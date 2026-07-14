-- Admin Users RLS Update
-- This script adds a policy allowing admins and owners to update and delete other users' profiles.

CREATE POLICY "Admins can update all profiles" ON public.users 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users AS admins
    WHERE admins.id = auth.uid() AND admins.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can delete all profiles" ON public.users 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users AS admins
    WHERE admins.id = auth.uid() AND admins.role IN ('admin', 'owner')
  )
);
