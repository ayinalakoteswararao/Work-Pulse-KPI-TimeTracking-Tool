import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "manager" | "employee" | null;

interface UserRoleData {
  role: UserRole;
  employee_id: string | null;
  department_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRoleData;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsEmployee: (email: string, password: string) => Promise<void>;
  signInWithEmployeeId: (employeeId: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: "admin" | "manager" | "employee") => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  upgradeToAdmin: () => Promise<void>;
  updateEmployeePassword: (newPassword: string) => Promise<void>;
  checkFirstLogin: () => Promise<boolean>;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isEmployee: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleData>({ role: null, employee_id: null, department_id: null });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const skipFetchUserRole = useRef(false);

  // Fetch user role from database
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, employee_id, department_id")
        .eq("user_id", userId);
      
      if (error || !data || data.length === 0) {
        // Don't create roles automatically here - let login functions handle it
        setUserRole({ role: null, employee_id: null, department_id: null });
      } else {
        // Sort roles by priority: admin > manager > employee
        // For managers, they might have multiple departments - use the first manager role
        const sortedRoles = (data as any[]).sort((a: any, b: any) => {
          const priority = { admin: 0, manager: 1, employee: 2 };
          return (priority[a.role as keyof typeof priority] ?? 3) - (priority[b.role as keyof typeof priority] ?? 3);
        });
        const primaryRole = sortedRoles[0];
        setUserRole({ 
          role: primaryRole.role as UserRole, 
          employee_id: primaryRole.employee_id, 
          department_id: primaryRole.department_id 
        });
      }
    } catch (err) {
      console.log('Error in fetchUserRole:', err);
      // Table doesn't exist yet
      setUserRole({ role: null, employee_id: null, department_id: null });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Check localStorage for employee login flag - this persists until explicit logout
      const isEmployeeLogin = localStorage.getItem('employee_login') === 'true';
      if (session?.user && !skipFetchUserRole.current && !isEmployeeLogin) {
        fetchUserRole(session.user.id).finally(() => setLoading(false));
      } else if (!session?.user) {
        setUserRole({ role: null, employee_id: null, department_id: null });
        localStorage.removeItem('employee_login');
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Check localStorage for employee login flag - this persists until explicit logout
      const isEmployeeLogin = localStorage.getItem('employee_login') === 'true';
      if (session?.user) {
        if (isEmployeeLogin) {
          // Restore employee role from user metadata
          const employeeId = session.user.user_metadata?.employee_id;
          setUserRole({ role: "employee", employee_id: employeeId || null, department_id: null });
          setLoading(false);
        } else {
          fetchUserRole(session.user.id).finally(() => setLoading(false));
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!email || !email.trim()) {
      throw new Error("Email is required");
    }
    if (!password || !password.trim()) {
      throw new Error("Password is required");
    }
    
    // Clear employee login flag since this is an admin/manager login
    localStorage.removeItem('employee_login');
    
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
    if (error) {
      console.error('Supabase signIn error:', error.message, error.status, error);
      throw error;
    }
    
    // After successful login, create employee record if needed
    if (user) {
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("employee_id")
          .eq("user_id", user.id)
          .limit(1);
        
        if (!roleData || roleData.length === 0 || !roleData[0].employee_id) {
          // Create employee record for admin user
          await createAdminEmployeeRecord(user);
        }
      } catch (err) {
        console.error("Error checking employee record:", err);
      }
    }
  };

  // Sign in and verify User is an admin
  const signInAsEmployee = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Check if User has employee role
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, employee_id")
        .eq("user_id", data.user.id)
        .single();
      
      if (roleError || !roleData) {
        // No role found - create default admin role for first user or employee for others
        const { data: allUsers } = await supabase.from("user_roles").select("user_id");
        if (!allUsers || allUsers.length === 0) {
          // First user becomes admin
          const { error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "admin" });
          
          if (!insertError) {
            setUserRole({ role: "admin", employee_id: null, department_id: null });
            return;
          }
        }
        setUserRole({ role: null, employee_id: null, department_id: null });
      } else {
        const roleDataAny = roleData as any;
        setUserRole({ role: roleDataAny.role as UserRole, employee_id: roleDataAny.employee_id, department_id: roleDataAny.department_id });
      }
    } catch (err) {
      // Table doesn't exist yet
      setUserRole({ role: null, employee_id: null, department_id: null });
    }
  };

  // Create employee record for admin users to enable work sessions
  const createAdminEmployeeRecord = async (user: any) => {
    try {
      // First check if admin has an employee record
      const { data: existingRecord } = await supabase
        .from("user_roles")
        .select("employee_id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (!existingRecord || existingRecord.length === 0) {
        // Get or create default department and role
        let { data: departments } = await supabase
          .from("departments")
          .select("id, name")
          .limit(1)
          .order("name");
        
        if (!departments || departments.length === 0) {
          // Create default department
          const { data: newDept } = await supabase
            .from("departments")
            .insert({ name: "Admin Department", company_id: null })
            .select("id")
            .single();
          departments = [newDept as any];
        }
        
        let { data: roles } = await supabase
          .from("roles")
          .select("id, role_name")
          .eq("department_id", departments[0].id)
          .limit(1)
          .order("role_name");
        
        if (!roles || roles.length === 0) {
          // Create default role
          const { data: newRole } = await supabase
            .from("roles")
            .insert({ role_name: "Administrator", department_id: departments[0].id })
            .select("id")
            .single();
          roles = [newRole as any];
        }
        
        // Create employee record for admin
        const { data: newEmployee } = await supabase
          .from("employees")
          .insert({
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin User',
            email: user.email,
            role_id: roles[0].id,
            department_id: departments[0].id
          })
          .select("id")
          .single();
        
        // Create user role record
        await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            role: user.user_metadata?.role || "admin",
            employee_id: (newEmployee as any).id
          } as any);
        
      }
    } catch (error) {
      console.error("Error creating admin employee record:", error);
    }
  };

  // Sign in using employee ID with default password system
  const signInWithEmployeeId = async (employeeId: string, password: string) => {
    // Set flag to skip fetchUserRole in onAuthStateChange
    // This prevents it from overriding our forced employee role with an existing manager role
    skipFetchUserRole.current = true;
    
    try {
      // Get employee info
      const { data: employeeData, error: employeeError } = await supabase
        .rpc('verify_employee_password' as any, { 
          employee_code_input: employeeId, 
          password_input: password 
        });
    
      if (employeeError) {
        console.error('Employee lookup error:', employeeError);
        throw new Error(`Database error: ${employeeError.message}`);
      }
      
      if (!employeeData || !Array.isArray(employeeData) || employeeData.length === 0) {
        throw new Error("Employee ID not found. Please check your employee ID.");
      }

      const employee = employeeData[0] as any;
      
      // Verify password
      if (employee.is_first_login && password !== '12345678') {
        throw new Error("Invalid password. For first login, use: 12345678");
      }
      
      if (!employee.is_first_login && password === '12345678') {
        throw new Error("Please use your new password, not the default one.");
      }
      
      const supabasePassword = '12345678';
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: employee.email, 
        password: supabasePassword
      });
      
      if (error) {
        // Handle different error cases
        if (error.message.includes('Invalid login credentials')) {
          // User doesn't exist - create new auth user (no email confirmation needed)
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: employee.email,
            password: supabasePassword,
            options: {
              data: { role: 'employee', employee_id: employee.employee_id }
            }
          });
          
          if (signUpError) {
            console.error('Signup error:', signUpError);
            
            if (signUpError.status === 429 || signUpError.message.includes('rate limit') || signUpError.message.includes('Too Many Requests')) {
              throw new Error("Too many signups from this IP address. Please wait a bit before trying again, or configure a custom SMTP server in your Supabase dashboard to remove this limit.");
            }
            if (signUpError.message.includes('already registered')) {
              // User exists but can't login - likely unconfirmed email from old setting
              // Delete and recreate the user
              throw new Error(`Account exists but is not active. Please contact admin to reset the account for ${employee.email}.`);
            }
            throw new Error(`Failed to create account: ${signUpError.message}`);
          }
          
          if (signUpData.user) {
            if (signUpData.session) {
              // Auto-confirmed - logged in
              // Force employee role
              setUserRole({ role: "employee", employee_id: employee.employee_id, department_id: null });
              await createOrUpdateUserRole(signUpData.user.id, employee.employee_id, employee.is_first_login, "employee");
              return;
            } else {
              // Should not happen with "Confirm email" disabled, but handle gracefully
              throw new Error(`Account created for ${employee.email}! Please try logging in again.`);
            }
          }
        } else if (error.message.includes('Email not confirmed')) {
          // This shouldn't happen with "Confirm email" disabled, but handle it
          throw new Error(`Account not activated for ${employee.email}. Please contact admin.`);
        } else {
          throw new Error(`Login error: ${error.message}`);
        }
      } else {
        // Force employee role for Employee ID login
        setUserRole({ role: "employee", employee_id: employee.employee_id, department_id: null });
        // Set persistent flag in localStorage to prevent fetchUserRole from overriding
        // This flag stays until explicit logout
        localStorage.setItem('employee_login', 'true');
        await createOrUpdateUserRole(data.user.id, employee.employee_id, employee.is_first_login, "employee");
      }
    } finally {
      skipFetchUserRole.current = false;
    }
  };

  // Helper function to create or update user role
  const createOrUpdateUserRole = async (userId: string, employeeId: string, isFirstLogin: boolean, forcedRole?: string) => {
    try {
      const { data: existingRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role, employee_id")
        .eq("user_id", userId)
        .single();
      
      if (roleError || !existingRole) {
        // Create user role if it doesn't exist
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ 
            user_id: userId, 
            role: forcedRole || "employee",
            employee_id: employeeId
          });
        
        if (insertError) {
          console.error('Error creating user role:', insertError);
        }
      } else if (existingRole.role !== "employee" && !forcedRole) {
        // Sign out if not an employee
        await supabase.auth.signOut();
        throw new Error("This account is not registered as an employee. Please use Admin Login.");
      } else if (!existingRole.employee_id) {
        // Update existing role to link to employee
        const { error: updateError } = await supabase
          .from("user_roles")
          .update({ employee_id: employeeId })
          .eq("user_id", userId);
        
        if (updateError) {
          console.error('Error updating employee_id in user role:', updateError);
        }
      }
      
      // Only refresh role if not forced (for employee ID login, we already set it)
      if (!forcedRole) {
        await fetchUserRole(userId);
      }
    } catch (err) {
      console.error('Error in user role management:', err);
    }
  };

  // New function to upgrade user to admin
  const upgradeToAdmin = async () => {
    if (!user) throw new Error("No user logged in");
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", user.id);
    
    if (error) throw error;
    
    // Refresh the role
    await fetchUserRole(user.id);
  };

  // Function to send login notification email - DISABLED (no email notifications)
  const sendLoginNotification = async (email: string, userName: string, loginType?: 'employee' | 'admin') => {
    // Email notifications disabled - just log to console
    console.log('Login notification (disabled):', { email, userName, loginType, time: new Date().toISOString() });
  };

  // Function to update employee password
  const updateEmployeePassword = async (newPassword: string) => {
    if (!user || !userRole.employee_id) throw new Error("No employee logged in");
    
    // Update password in employees table
    const { error } = await supabase
      .rpc('update_employee_password' as any, { 
        employee_id_input: userRole.employee_id, 
        new_password: newPassword 
      });
    
    if (error) throw error;
    
    // Update first_login flag to false after password update
    const { error: updateError } = await supabase
      .from("employees")
      .update({ first_login: false } as any)
      .eq("id", userRole.employee_id);
    
    if (updateError) {
      console.error('Error updating first_login flag:', updateError);
    }
    
    // Update Supabase auth password
    const { error: authUpdateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (authUpdateError) throw authUpdateError;
  };

  // Function to check if it's first login
  const checkFirstLogin = async (): Promise<boolean> => {
    if (!user || !userRole.employee_id) return false;
    
    const { data, error } = await supabase
      .from("employees")
      .select("first_login")
      .eq("id", userRole.employee_id)
      .single();
    
    if (error) {
      console.log('Error checking first login:', error);
      return false;
    }
    
    if (!data) return false;
    
    return (data as any).first_login || false;
  };

  const signUp = async (email: string, password: string, role: "admin" | "manager" | "employee" = "employee") => {
    // Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          role: role // Pass role in user metadata
        }
      }
    });
    
    if (signUpError) {
      if (signUpError.status === 429 || signUpError.message.includes('rate limit') || signUpError.message.includes('Too Many Requests')) {
        throw new Error("Too many signups from this IP address. Please wait a bit before trying again, or configure a custom SMTP server in your Supabase dashboard to remove this limit.");
      }
      throw signUpError;
    }
    
    // If we have a session, user is auto-confirmed - create user_roles record
    if (signUpData.session && signUpData.user) {
      console.log(`User signed up and auto-confirmed with role: ${role}`);
      
      // Create user_roles record with the specified role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: signUpData.user.id,
          role: role,
          employee_id: null
        });
      
      if (roleError) {
        console.error('Error creating user_roles:', roleError);
      } else {
        console.log('Created user_roles record with role:', role);
      }
      
      return;
    }
    
    // If no session, email confirmation might be required
    // Try to sign in immediately (this may fail if confirmation is required)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      // Email confirmation is required by Supabase
      console.log('Email confirmation required, but bypassing for UX:', email);
      // Throw special error that AuthPage will handle as success
      throw new Error(`SIGNUP_SUCCESS_CONFIRM_EMAIL|Account created! You can log in once your email is confirmed. Please check your email (${email}).`);
    }
    
    // Successfully signed in without confirmation
    console.log('Auto-login successful after signup:', email);
  };

  const resetPassword = async (email: string) => {
    if (!email || !email.trim()) {
      throw new Error("Email is required");
    }

    console.log('Sending password reset email to:', email.trim());
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Password reset error:', error.message);
      throw error;
    }
    
    console.log('Password reset email sent successfully to:', email.trim());
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserRole({ role: null, employee_id: null, department_id: null });
    localStorage.removeItem('employee_login');
  };

  const isAdmin = () => userRole.role === "admin";
  const isManager = () => userRole.role === "manager";
  const isEmployee = () => userRole.role === "employee";

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole, 
      loading, 
      signIn, 
      signInAsEmployee, 
      signInWithEmployeeId, 
      signUp, 
      signOut, 
      resetPassword,
      upgradeToAdmin, 
      updateEmployeePassword,
      checkFirstLogin,
      isAdmin, 
      isManager, 
      isEmployee 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return a default context value instead of throwing error immediately
    // This handles cases where the component renders before AuthProvider is fully initialized
    return {
      session: null,
      user: null,
      userRole: { role: null, employee_id: null, department_id: null },
      loading: true,
      signIn: async () => { throw new Error("Auth context not available"); },
      signInAsEmployee: async () => { throw new Error("Auth context not available"); },
      signInWithEmployeeId: async () => { throw new Error("Auth context not available"); },
      signUp: async () => { throw new Error("Auth context not available"); },
      signOut: async () => { throw new Error("Auth context not available"); },
      resetPassword: async () => { throw new Error("Auth context not available"); },
      upgradeToAdmin: async () => { throw new Error("Auth context not available"); },
      updateEmployeePassword: async () => { throw new Error("Auth context not available"); },
      checkFirstLogin: async () => false,
      isAdmin: () => false,
      isManager: () => false,
      isEmployee: () => false,
    };
  }
  return ctx;
}
