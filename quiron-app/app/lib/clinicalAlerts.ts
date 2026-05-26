import {
  Rubric,
  rubrics,
} from "../data/rubrics";

import {
  AreaRotation,
  formatRotationDate,
  parseLocalDate,
  validStudentAreas,
} from "./rotations";

export type AlertAudience = "teacher" | "student" | "admin";
export type AlertTone = "amber" | "blue" | "red" | "emerald";

export type AlertStudent = {
  id: string;
  name: string;
  email?: string;
  university?: string;
  area?: string;
  areas?: string[];
  rotations?: AreaRotation[];
};

export type AlertEvaluation = {
  rubricId?: string;
  rubricName?: string;
};

export type ClinicalAlert = {
  id: string;
  studentId: string;
  studentName: string;
  audience: AlertAudience;
  tone: AlertTone;
  title: string;
  description: string;
  dueDate?: string;
};

function normalizeMatchValue(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesValue(
  source: string | undefined,
  candidates: string[]
) {
  const normalizedSource = normalizeMatchValue(source);

  if (!normalizedSource) return false;

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeMatchValue(candidate);

    if (!normalizedCandidate) return false;

    return (
      normalizedSource === normalizedCandidate ||
      normalizedSource.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedSource)
    );
  });
}

function rubricMatchesArea(rubric: Rubric, area: string) {
  return matchesValue(area, [
    rubric.area,
    ...rubric.areaAliases,
  ]);
}

function evaluationUsesArea(
  evaluation: AlertEvaluation,
  area: string
) {
  const rubric = rubrics.find(
    (currentRubric) =>
      currentRubric.id === evaluation.rubricId ||
      currentRubric.name === evaluation.rubricName
  );

  return rubric ? rubricMatchesArea(rubric, area) : false;
}

function daysUntil(value?: string) {
  const date = parseLocalDate(value);

  if (!date) return null;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.ceil(
    (date.getTime() - todayStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export function alertToneClass(tone: AlertTone) {
  const classes: Record<AlertTone, string> = {
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    red: "border-red-100 bg-red-50 text-red-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
  };

  return classes[tone];
}

export function buildClinicalAlerts(
  student: AlertStudent,
  evaluations: AlertEvaluation[] = []
) {
  const alerts: ClinicalAlert[] = [];
  const areas = validStudentAreas(student);

  areas.forEach((area) => {
    const compatibleAreaRubrics = rubrics.filter((rubric) =>
      rubricMatchesArea(rubric, area)
    );
    const hasAreaEvaluation = evaluations.some((evaluation) =>
      evaluationUsesArea(evaluation, area)
    );

    if (compatibleAreaRubrics.length > 0 && !hasAreaEvaluation) {
      alerts.push({
        id: `${student.id}-${area}-pending-evaluation`,
        studentId: student.id,
        studentName: student.name,
        audience: "teacher",
        tone: "amber",
        title: `Evaluación pendiente en ${area}`,
        description:
          "El alumno tiene una pauta compatible sin evaluación registrada para esta área.",
      });
    }
  });

  (student.rotations || []).forEach((rotation, index) => {
    const remainingDays = daysUntil(rotation.endDate);
    const rotationLabel = rotation.area || `Rotación ${index + 1}`;

    if (remainingDays !== null && remainingDays >= 0 && remainingDays <= 7) {
      alerts.push({
        id: `${student.id}-${rotationLabel}-${index}-ending`,
        studentId: student.id,
        studentName: student.name,
        audience: "teacher",
        tone: remainingDays <= 1 ? "red" : "amber",
        title:
          remainingDays === 0
            ? `Rotación ${rotationLabel} termina hoy`
            : `Rotación ${rotationLabel} termina en ${remainingDays} días`,
        description:
          "Conviene revisar evaluación, comentarios y cierre administrativo.",
        dueDate: rotation.endDate,
      });
    }

    if (rotation.room || rotation.studentNotice) {
      alerts.push({
        id: `${student.id}-${rotationLabel}-${index}-student-room`,
        studentId: student.id,
        studentName: student.name,
        audience: "student",
        tone: "blue",
        title: `Sala asignada: ${rotation.room || rotationLabel}`,
        description:
          rotation.studentNotice ||
          `Rotación ${rotationLabel}. Inicio: ${formatRotationDate(
            rotation.startDate
          )}. Fin: ${formatRotationDate(rotation.endDate)}.`,
        dueDate: rotation.startDate,
      });
    }
  });

  return alerts;
}
