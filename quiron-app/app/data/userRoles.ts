export type UserRole = "admin" | "teacher" | "student";

export const configuredUserRoles: Record<string, UserRole> = {
  // Agrega acá los correos exactos de Firebase Auth:
  // "tu-correo@dominio.cl": "admin",
  // "alan@dominio.cl": "admin",
  // "docente@dominio.cl": "teacher",
  // "alumno@dominio.cl": "student",
};
