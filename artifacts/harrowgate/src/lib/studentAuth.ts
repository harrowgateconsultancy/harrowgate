import { useState, useEffect } from "react";

export interface StudentUser {
  id: string;
  email: string;
  name: string | null;
}

export function getStudentToken(): string | null {
  return localStorage.getItem("student_token");
}

export function getStudentUser(): StudentUser | null {
  try {
    const data = localStorage.getItem("student_user");
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function isStudentLoggedIn(): boolean {
  return !!getStudentToken();
}

export function studentSignOut(): void {
  localStorage.removeItem("student_token");
  localStorage.removeItem("student_user");
}

export function getStudentAuthHeaders(): Record<string, string> {
  const token = getStudentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useStudentUser() {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setUser(getStudentUser());
    setIsLoaded(true);
  }, []);

  return { user, isLoaded };
}
