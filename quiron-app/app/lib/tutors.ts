import {
  configuredUserRoles,
  UserRole,
} from "../data/userRoles";

import { normalizeEmail } from "./userRoles";

type TutorStudent = {
  email?: string;
  tutor?: string;
  tutorEmails?: string[];
};

export type TeacherProfile = {
  email: string;
  label: string;
};

export function teacherProfileOptions(): TeacherProfile[] {
  return Object.entries(configuredUserRoles)
    .filter(([, role]) => role === "teacher")
    .map(([email]) => {
      const normalizedEmail = normalizeEmail(email);

      return {
        email: normalizedEmail,
        label: normalizedEmail,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function studentTutorEmails(student: TutorStudent) {
  return Array.from(
    new Set(
      (student.tutorEmails || [])
        .map((email) => normalizeEmail(email))
        .filter(Boolean)
    )
  );
}

export function studentTutorLabel(student: TutorStudent) {
  if (student.tutor) return student.tutor;

  const emails = studentTutorEmails(student);

  return emails.join(", ");
}

export function hasAssignedTutors(student: TutorStudent) {
  return studentTutorEmails(student).length > 0 || Boolean(student.tutor);
}

export function isAssignedTutor(
  student: TutorStudent,
  email?: string | null
) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return false;

  return studentTutorEmails(student).includes(normalizedEmail);
}

export function canUserAccessStudent(
  role: UserRole,
  email: string | null | undefined,
  student: TutorStudent
) {
  if (role === "admin") return true;

  if (role === "teacher") {
    return isAssignedTutor(student, email);
  }

  return normalizeEmail(student.email) === normalizeEmail(email);
}

export function canUserEvaluateStudent(
  role: UserRole,
  email: string | null | undefined,
  student: TutorStudent
) {
  return (
    role === "admin" ||
    (role === "teacher" &&
      isAssignedTutor(student, email))
  );
}
