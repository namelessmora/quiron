export type AcademicStatusKey = "approved" | "critical" | "failed" | "ungraded";

export type AcademicStatus = {
  key: AcademicStatusKey;
  label: string;
  pluralLabel: string;
  helper: string;
  color: string;
  dotColor: string;
  textColor: string;
  badgeClassName: string;
  panelClassName: string;
};

export const academicStatusOptions = [
  "Aprobado",
  "Crítico",
  "Reprobado",
  "Sin promedio",
];

export function parseAverage(value?: string | number | null) {
  const numericAverage = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(numericAverage) ? numericAverage : null;
}

export function getAcademicStatus(value?: string | number | null): AcademicStatus {
  const average = parseAverage(value);

  if (average === null) {
    return {
      key: "ungraded",
      label: "Sin promedio",
      pluralLabel: "Sin promedio",
      helper: "Sin evaluaciones suficientes",
      color: "#94a3b8",
      dotColor: "bg-slate-400",
      textColor: "text-slate-500",
      badgeClassName: "bg-slate-100 text-slate-600",
      panelClassName: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  if (average >= 5) {
    return {
      key: "approved",
      label: "Aprobado",
      pluralLabel: "Aprobados",
      helper: "Nota 5.0 o superior",
      color: "#10b981",
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-600",
      badgeClassName: "bg-emerald-50 text-emerald-700",
      panelClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  if (average >= 4) {
    return {
      key: "critical",
      label: "Crítico",
      pluralLabel: "Críticos",
      helper: "Nota entre 4.0 y 4.9",
      color: "#f59e0b",
      dotColor: "bg-amber-500",
      textColor: "text-amber-600",
      badgeClassName: "bg-amber-50 text-amber-700",
      panelClassName: "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  return {
    key: "failed",
    label: "Reprobado",
    pluralLabel: "Reprobados",
    helper: "Nota bajo 4.0",
    color: "#f43f5e",
    dotColor: "bg-rose-500",
    textColor: "text-rose-600",
    badgeClassName: "bg-rose-50 text-rose-700",
    panelClassName: "border-rose-100 bg-rose-50 text-rose-700",
  };
}
