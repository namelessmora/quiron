"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { collection, getDocs, Timestamp } from "firebase/firestore";

import { db } from "./lib/firebase";

type EvaluationDoc = {
  title?: string;
  score?: string | number;
  createdBy?: string;
  createdAt?: Timestamp | { seconds?: number } | Date | null;
};

type StudentDoc = {
  name?: string;
  average?: string | number;
  status?: string;
};

type GradeStatus = {
  key: "approved" | "critical" | "failed";
  label: string;
  helper: string;
  count: number;
  color: string;
  textColor: string;
};

type TimelineItem = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  score?: string | number;
  createdBy: string;
  createdAt: Date | null;
};

const timelineDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function evaluationDate(value: EvaluationDoc["createdAt"]) {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (value instanceof Timestamp) return value.toDate();

  if ("seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
}

function timelineTime(value: Date | null) {
  return value?.getTime() ?? 0;
}

function parseAverage(value: StudentDoc["average"]) {
  const numericAverage = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(numericAverage) ? numericAverage : null;
}

function emptyGradeStatus(): GradeStatus[] {
  return [
    {
      key: "approved",
      label: "Aprobados",
      helper: "Notas 5.0 o superior",
      count: 0,
      color: "#10b981",
      textColor: "text-emerald-600",
    },
    {
      key: "critical",
      label: "Críticos",
      helper: "Notas entre 4.0 y 4.9",
      count: 0,
      color: "#f59e0b",
      textColor: "text-amber-600",
    },
    {
      key: "failed",
      label: "Reprobados",
      helper: "Notas bajo 4.0",
      count: 0,
      color: "#f43f5e",
      textColor: "text-rose-600",
    },
  ];
}

export default function DashboardPage() {
  const [studentsCount, setStudentsCount] = useState(0);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  const [average, setAverage] = useState(0);
  const [observationCount, setObservationCount] = useState(0);
  const [gradeStatus, setGradeStatus] = useState<GradeStatus[]>(emptyGradeStatus);
  const [ungradedCount, setUngradedCount] = useState(0);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const studentsSnapshot = await getDocs(collection(db, "students"));
      const students = studentsSnapshot.docs.map((studentDoc) => ({
        id: studentDoc.id,
        data: studentDoc.data() as StudentDoc,
      }));

      const evaluationSnapshots = await Promise.all(
        students.map((student) =>
          getDocs(collection(db, "students", student.id, "evaluations"))
        )
      );

      const studentAverages = students.map((student) =>
        parseAverage(student.data.average)
      );

      const averages = studentAverages.filter(
        (studentAverage): studentAverage is number => studentAverage !== null
      );

      const nextGradeStatus = emptyGradeStatus();

      studentAverages.forEach((studentAverage) => {
        if (studentAverage === null) return;

        if (studentAverage >= 5) {
          nextGradeStatus[0].count += 1;
          return;
        }

        if (studentAverage >= 4) {
          nextGradeStatus[1].count += 1;
          return;
        }

        nextGradeStatus[2].count += 1;
      });

      const observations = students.filter((student) =>
        ["observacion", "observación"].includes(
          String(student.data.status || "").toLowerCase()
        )
      ).length;

      const evaluationDocs = evaluationSnapshots.flatMap((snapshot, index) =>
        snapshot.docs.map((evaluationDoc) => {
          const evaluation = evaluationDoc.data() as EvaluationDoc;
          const student = students[index];

          return {
            id: evaluationDoc.id,
            studentId: student.id,
            studentName: student.data.name || "Alumno sin nombre",
            title: evaluation.title || "Evaluación clínica",
            score: evaluation.score,
            createdBy: evaluation.createdBy || "Usuario",
            createdAt: evaluationDate(evaluation.createdAt),
          };
        })
      );

      setStudentsCount(students.length);
      setEvaluationsCount(evaluationDocs.length);
      setObservationCount(observations);
      setGradeStatus(nextGradeStatus);
      setUngradedCount(studentAverages.length - averages.length);
      setTimeline(
        evaluationDocs
          .sort((a, b) => {
            return timelineTime(b.createdAt) - timelineTime(a.createdAt);
          })
          .slice(0, 5)
      );

      if (averages.length > 0) {
        const totalAverage =
          averages.reduce((total, studentAverage) => total + studentAverage, 0) /
          averages.length;

        setAverage(Number(totalAverage.toFixed(1)));
      } else {
        setAverage(0);
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard();
    });
  }, [loadDashboard]);

  const gradedStudentsCount = useMemo(
    () => gradeStatus.reduce((total, status) => total + status.count, 0),
    [gradeStatus]
  );

  const pieGradient = useMemo(() => {
    if (gradedStudentsCount === 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }

    let currentPercent = 0;
    const segments = gradeStatus.map((status) => {
      const start = currentPercent;
      const end = start + (status.count / gradedStudentsCount) * 100;
      currentPercent = end;

      return `${status.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [gradeStatus, gradedStudentsCount]);

  const mainGradeStatus = useMemo(
    () =>
      gradeStatus.reduce((current, status) =>
        status.count > current.count ? status : current
      ),
    [gradeStatus]
  );

  const stats = [
    {
      label: "Alumnos",
      value: studentsCount,
      helper: loading ? "Cargando..." : "Registros activos",
      color: "text-slate-900",
    },
    {
      label: "Evaluaciones",
      value: evaluationsCount,
      helper: "Total histórico",
      color: "text-indigo-600",
    },
    {
      label: "Observación",
      value: observationCount,
      helper: "Requieren revisión",
      color: "text-amber-600",
    },
    {
      label: "Promedio",
      value: average || "-",
      helper: "Rendimiento general",
      color: "text-slate-900",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Quirón
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Dashboard clínico
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Vista rápida del estado académico y evaluativo de los internos.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-700">Firebase conectado</p>
          <p className="text-emerald-600">Datos sincronizados en tiempo real</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className={`mt-3 text-4xl font-bold ${stat.color}`}>
              {loading ? "..." : stat.value}
            </p>
            <p className="mt-2 text-sm text-slate-400">{stat.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Estado académico
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Distribución de alumnos según su promedio actual.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                {loading ? "Calculando..." : `${gradedStudentsCount} con nota`}
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-center">
              <div className="mx-auto flex w-full max-w-[300px] flex-col items-center">
                <div
                  className="relative grid aspect-square w-full place-items-center rounded-full shadow-inner"
                  style={{
                    background: loading
                      ? "conic-gradient(#c7d2fe 0deg 130deg, #e2e8f0 130deg 360deg)"
                      : pieGradient,
                  }}
                >
                  <div
                    className="grid h-[62%] w-[62%] place-items-center rounded-full border border-slate-100 bg-white text-center shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Total
                      </p>
                      <p className="mt-1 text-4xl font-bold text-slate-900">
                        {loading ? "..." : gradedStudentsCount}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        alumnos con promedio
                      </p>
                    </div>
                  </div>
                </div>

                {!loading && ungradedCount > 0 && (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-500">
                    {ungradedCount} sin promedio registrado
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                {gradeStatus.map((status) => {
                  const percentage =
                    gradedStudentsCount > 0
                      ? Math.round((status.count / gradedStudentsCount) * 100)
                      : 0;

                  return (
                    <div
                      key={status.key}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1 h-3 w-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {status.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {status.helper}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-2xl font-bold ${status.textColor}`}>
                            {loading ? "..." : status.count}
                          </p>
                          <p className="text-xs font-semibold text-slate-400">
                            {loading ? "" : `${percentage}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!loading && gradedStudentsCount > 0 && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                    Mayor grupo actual:{" "}
                    <span className="font-semibold">{mainGradeStatus.label}</span>
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Timeline clínico
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Últimos movimientos registrados en evaluaciones.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                Actividad reciente
              </span>
            </div>

            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            )}

            {!loading && timeline.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aún no hay movimientos clínicos registrados.
              </div>
            )}

            {!loading && timeline.length > 0 && (
              <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {timeline.map((item) => (
                  <li key={`${item.studentId}-${item.id}`} className="relative">
                    <span className="absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100" />
                    <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.createdBy} añadió evaluación a{" "}
                          <Link
                            href={`/students/${item.studentId}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {item.studentName}
                          </Link>
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:justify-end">
                        {item.score && (
                          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-600">
                            {item.score}
                          </span>
                        )}
                        <time className="text-xs font-medium capitalize text-slate-400">
                          {item.createdAt
                            ? timelineDateFormatter.format(item.createdAt)
                            : "Fecha pendiente"}
                        </time>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Accesos rápidos</h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/students"
                className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-4 font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
              >
                Gestión de alumnos
              </Link>
              <Link
                href="/import"
                className="rounded-lg border border-slate-200 px-4 py-4 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Importar agenda
              </Link>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Foco operativo</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Revisa primero alumnos en observación y evaluaciones recientes para
              mantener el seguimiento académico al día.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
