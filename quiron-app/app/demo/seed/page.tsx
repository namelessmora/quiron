"use client";

import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

import { useCurrentUserPermissions } from "../../hooks/useCurrentUserPermissions";
import { writeAuditLog } from "../../lib/audit";
import { db } from "../../lib/firebase";
import { normalizeEmail } from "../../lib/userRoles";

const demoUsers = [
  {
    email: "admin.demo@quiron.cl",
    name: "Admin Demo",
    role: "admin",
  },
  {
    email: "docente.demo@quiron.cl",
    name: "Docente Demo",
    role: "teacher",
  },
  {
    email: "alumno.demo@quiron.cl",
    name: "Alumno Demo",
    role: "student",
  },
] as const;

export default function SeedDemoPage() {
  const { user, role } =
    useCurrentUserPermissions();
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");

  async function createDemoData() {
    if (role !== "admin") return;

    try {
      setLoading(true);
      setMessage("");

      await Promise.all(
        demoUsers.map((demoUser) =>
          setDoc(doc(db, "userAccess", demoUser.email), {
            ...demoUser,
            updatedAt: new Date().toISOString(),
            updatedBy: normalizeEmail(user?.email),
          })
        )
      );

      const today = new Date();
      const startDate = new Date(today);
      const endDate = new Date(today);

      startDate.setDate(today.getDate() - 3);
      endDate.setDate(today.getDate() + 7);

      const iso = (date: Date) => date.toISOString().slice(0, 10);

      const studentRef = await addDoc(collection(db, "students"), {
        name: "Valentina Demo",
        email: "alumno.demo@quiron.cl",
        university: "ENAC",
        career: "Técnico en Imagenología",
        area: "Múltiple",
        areas: ["Múltiple"],
        role: "Interno",
        modality: "Diurno",
        tutor: "docente.demo@quiron.cl",
        tutorEmails: ["docente.demo@quiron.cl"],
        rotations: [
          {
            area: "Múltiple",
            startDate: iso(startDate),
            endDate: iso(endDate),
            modality: "Diurno",
            room: "Sala TC 2",
            studentNotice:
              "Presentarse en sala TC 2 a las 08:00 con credencial.",
          },
        ],
        average: "5.8",
        status: "Activo",
        observations: "Registro ficticio para demo hospitalaria.",
      });

      await addDoc(
        collection(db, "students", studentRef.id, "evaluations"),
        {
          title: "Evaluación demo",
          score: "5.8",
          description:
            "Evaluación ficticia para mostrar el flujo de retroalimentación.",
          createdBy: "docente.demo@quiron.cl",
          createdAt: new Date(),
        }
      );

      await writeAuditLog({
        action: "demo.seeded",
        actorEmail: user?.email,
        targetType: "demo",
        targetId: studentRef.id,
        targetName: "Valentina Demo",
      });

      setMessage(
        "Datos demo creados. Recuerda crear estas cuentas en Firebase Auth o ingresar con Google usando esos correos si existen."
      );
    } catch (error) {
      console.error(error);
      setMessage("No se pudieron crear los datos demo.");
    } finally {
      setLoading(false);
    }
  }

  if (role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-6 text-amber-700">
          Sólo administradores pueden crear datos demo.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Demo hospital
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Crear datos ficticios
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Esto agrega usuarios de prueba, un alumno ENAC, una rotación, una sala
          y una evaluación ficticia para presentar la app sin datos reales.
        </p>

        <button
          type="button"
          onClick={() => void createDemoData()}
          disabled={loading}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear datos demo"}
        </button>

        {message && (
          <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
