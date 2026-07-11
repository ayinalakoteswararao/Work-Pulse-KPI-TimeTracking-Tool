export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone?: string;
  department_id: string;
  role_id: string;
  join_date?: string | null;
  gender?: string | null;
  created_at: string;
  departments?: {
    name: string;
    companies?: {
      name: string;
    };
  };
  roles?: {
    role_name: string;
  };
}
