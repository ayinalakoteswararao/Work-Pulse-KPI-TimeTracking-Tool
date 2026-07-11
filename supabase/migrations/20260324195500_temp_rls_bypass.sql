-- Temporary: Add a bypass policy for debugging work_sessions
-- This allows authenticated users to read their own work sessions without complex checks
DROP POLICY IF EXISTS "Users can read own work sessions" ON public.work_sessions;

CREATE POLICY "Users can read own work sessions" ON public.work_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Also add a temporary policy that allows any authenticated user to read work_sessions (for debugging only)
-- WARNING: This is not secure and should be removed after debugging
CREATE POLICY "Temp bypass for debugging" ON public.work_sessions FOR SELECT TO authenticated USING (true);
