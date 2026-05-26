"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, getDocs } from "firebase/firestore";

import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { db } from "../lib/firebase";
import { AreaRotation } from "../lib/rotations";
import {
  alertToneClass,
  buildClinicalAlerts,
  ClinicalAlert,
} from "../lib/clinicalAlerts";
import { canUserAccessStudent } from "../lib/tutors";

type Student = {
  id: string;
  name: string;
  email?: string;
  university?: string;
  area?: string;
  areas?: string[];
  rotations?: AreaRotation[];
  tutor?: string;
  tutorEmails?: string[];
};

type EvaluationSummary = {
  rubricId?: string;
  rubricName?: string;
};

export default function AlertsPage() {
  const { user, role } =
    useCurrentUserPermissions();
  const [alerts, setAlerts] =
    useState<ClinicalAlert[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const studentsSnapshot =
        await getDocs(collection(db, "students"));
      const students = studentsSnapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .filter((student) =>
          canUserAccessStudent(role, user?.email, student)
        );

      const evaluationSnapshots = await Promise.all(
        students.map((student) =>
          getDocs(collection(db, "students", student.id, "evaluations"))
        )
      );

      const nextAlerts = students.flatMap((student, index) => {
        const evaluations = evaluationSnapshots[index].docs.map(
          (evaluationDoc) =>
            evaluationDoc.data() as EvaluationSummary
        );

        return buildClinicalAlerts(student, evaluations);
      });

      setAlerts(nextAlerts);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudieron cargar los avisos.");
    } finally {
      setLoading(false);
    }
  }, [role, user?.email]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAlerts();
    });
  }, [loadAlerts]);

  const visibleAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (role === "admin") return true;
        if (role === "teacher") return alert.audience === "teacher";

        return alert.audience === "student";
      }),
    [alerts, role]
  );

  const teacherAlertCount = visibleAlerts.filter(
    (alert) => alert.audience === "teacher"
  ).length;
  const studentAlertCount = visibleAlerts.filter(
    (alert) => alert.audience === "student"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Avisos
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Alertas clínicas
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Pendientes de evaluación, rotaciones próximas a finalizar y salas
            o unidades informadas para alumnos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts()}
          className="w-fit rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Actualizar avisos
        </button>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "-" : visibleAlerts.length}
          </p>
        </article>
        <article className="rounded-lg border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-700">
            Docentes
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {loading ? "-" : teacherAlertCount}
          </p>
        </article>
        <article className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm font-semibold text-blue-700">
            Alumnos
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {loading ? "-" : studentAlertCount}
          </p>
        </article>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4">
        {loading &&
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}

        {!loading && visibleAlerts.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Sin avisos pendientes
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              No hay evaluaciones pendientes, cierres próximos ni salas nuevas
              para mostrar.
            </p>
          </div>
        )}

        {!loading &&
          visibleAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-lg border p-5 shadow-sm ${alertToneClass(
                alert.tone
              )}`}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                      {alert.audience === "student"
                        ? "Alumno"
                        : "Docente"}
                    </span>
                    {alert.dueDate && (
                      <span className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold">
                        Fecha: {alert.dueDate}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-xl font-bold">
                    {alert.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6">
                    {alert.description}
                  </p>
                  <p className="mt-3 text-sm font-semibold">
                    {alert.studentName}
                  </p>
                </div>

                <Link
                  href={`/students/${alert.studentId}`}
                  className="w-fit rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir ficha
                </Link>
              </div>
            </article>
          ))}
      </section>
    </div>
  );
}
