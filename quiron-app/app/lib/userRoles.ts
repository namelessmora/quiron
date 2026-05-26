import { User } from "firebase/auth";

import {
  configuredUserRoles,
  UserRole,
} from "../data/userRoles";

export type UserPermissions = {
  role: UserRole;
  canManageStudents: boolean;
  canManageEvaluations: boolean;
  canViewAllStudents: boolean;
  canImportStudents: boolean;
};

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Docente",
  student: "Alumno",
};

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}

export function resolveUserRole(user: User | null): UserRole {
  const email = normalizeEmail(user?.email);
  const configuredEmails = Object.keys(configuredUserRoles);

  if (email && configuredUserRoles[email]) {
    return configuredUserRoles[email];
  }

  if (configuredEmails.length === 0) {
    return "admin";
  }

  return "teacher";
}

export function permissionsForRole(role: UserRole): UserPermissions {
  return {
    role,
    canManageStudents: role === "admin",
    canManageEvaluations: role === "admin" || role === "teacher",
    canViewAllStudents: role === "admin" || role === "teacher",
    canImportStudents: role === "admin",
  };
}

export function userRoleLabel(role: UserRole) {
  return roleLabels[role];
}
