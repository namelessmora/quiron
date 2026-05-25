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

type MonthlyPoint = {
  label: string;
  count: number;
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

const monthFormatter = new Intl.DateTimeFormat("es-CL", {
  month: "short",
});

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

function lastSixMonths(): MonthlyPoint[] {
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);

    return {
      label: monthFormatter.format(date).replace(".", ""),
      count: 0,
    };
  });
}

export default function DashboardPage() {
  const [studentsCount, setStudentsCount] = useState(0);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  const [average, setAverage] = useState(0);
  const [observationCount, setObservationCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>(lastSixMonths);
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

      const averages = students
        .map((student) => Number(student.data.average))
        .filter((studentAverage) => Number.isFinite(studentAverage));

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

      const months = lastSixMonths();
      const monthKeys = months.map((_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index), 1);
        return `${date.getFullYear()}-${date.getMonth()}`;
      });

      evaluationDocs.forEach((evaluation) => {
        const date = evaluation.createdAt;
        if (!date) return;

        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthIndex = monthKeys.indexOf(key);

        if (monthIndex >= 0) {
          months[monthIndex].count += 1;
        }
      });

      setStudentsCount(students.length);
      setEvaluationsCount(evaluationDocs.length);
      setObservationCount(observations);
      setMonthlyData(months);
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

  const maxMonthlyCount = useMemo(
    () => Math.max(...monthlyData.map((month) => month.count), 1),
    [monthlyData]
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
                  Evaluaciones por mes
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Actividad registrada durante los últimos 6 meses.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600">
                Últimos 6 meses
              </span>
            </div>

            <div className="flex h-72 items-end gap-3 border-b border-slate-200 pt-6">
              {monthlyData.map((month) => {
                const height = Math.max((month.count / maxMonthlyCount) * 100, 8);

                return (
                  <div
                    key={month.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="text-xs font-semibold text-slate-500">
                      {loading ? "" : month.count}
                    </div>
                    <div
                      className="w-full max-w-16 rounded-t-lg bg-indigo-500 transition-all"
                      style={{ height: `${loading ? 35 : height}%` }}
                    />
                    <div className="pb-2 text-xs font-medium capitalize text-slate-400">
                      {month.label}
                    </div>
                  </div>
                );
              })}
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
