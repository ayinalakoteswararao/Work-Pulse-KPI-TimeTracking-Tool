
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update companies" ON public.companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete companies" ON public.companies FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete departments" ON public.departments FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Roles
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update roles" ON public.roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete roles" ON public.roles FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Functions (tasks assigned to roles)
CREATE TABLE public.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  target_period TEXT NOT NULL DEFAULT 'daily' CHECK (target_period IN ('daily', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read functions" ON public.functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert functions" ON public.functions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update functions" ON public.functions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete functions" ON public.functions FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_functions_updated_at BEFORE UPDATE ON public.functions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete employees" ON public.employees FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task Logs
CREATE TABLE public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count NUMERIC NOT NULL DEFAULT 0,
  scale NUMERIC DEFAULT 100 CHECK (scale >= 0 AND scale <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read task_logs" ON public.task_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert task_logs" ON public.task_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update task_logs" ON public.task_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete task_logs" ON public.task_logs FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_task_logs_updated_at BEFORE UPDATE ON public.task_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_departments_company ON public.departments(company_id);
CREATE INDEX idx_roles_department ON public.roles(department_id);
CREATE INDEX idx_functions_role ON public.functions(role_id);
CREATE INDEX idx_employees_role ON public.employees(role_id);
CREATE INDEX idx_employees_department ON public.employees(department_id);
CREATE INDEX idx_task_logs_employee ON public.task_logs(employee_id);
CREATE INDEX idx_task_logs_function ON public.task_logs(function_id);
CREATE INDEX idx_task_logs_date ON public.task_logs(log_date);

-- User Roles (links auth.users to application roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone authenticated can insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
