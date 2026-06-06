"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { UserRole } from "../data/userRoles";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { writeAuditLog } from "../lib/audit";
import { db } from "../lib/firebase";
import {
  isStudentFinalized,
  parseLocalDate,
  validRotations,
} from "../lib/rotations";
import { normalizeEmail, userRoleLabel } from "../lib/userRoles";

type AccessUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
};

type AuditLog = {
  id: string;
  action?: string;
  actorEmail?: string;
  targetType?: string;
  targetName?: string;
  createdAt?: Timestamp | { seconds?: number };
};

type HealthStudent = {
  id: string;
  name?: string;
  email?: string;
  areas?: string[];
  area?: string;
  tutor?: string;
  tutorEmails?: string[];
  rotations?: Array<{
    area: string;
    startDate?: string;
    endDate?: string;
    modality?: string;
    status?: string;
  }>;
};

type HealthAttendance = {
  id: string;
  studentId?: string;
  studentName?: string;
  status?: string;
  recoveryStatus?: string;
};

function auditDate(value: AuditLog["createdAt"]) {
  if (!value) return "Fecha pendiente";
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString("es-CL");
  }
  if ("seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleString("es-CL");
  }

  return "Fecha pendiente";
}

export default function SettingsPage() {
  const { user, role, permissions } =
    useCurrentUserPermissions();
  const [accessUsers, setAccessUsers] =
    useState<AccessUser[]>([]);
  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);
  const [healthItems, setHealthItems] =
    useState<string[]>([]);
  const [email, setEmail] =
    useState("");
  const [name, setName] =
    useState("");
  const [selectedRole, setSelectedRole] =
    useState<UserRole>("teacher");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  const canManageSettings =
    role === "admin" && permissions.canManageStudents;

  const loadSettings = useCallback(async () => {
    if (!canManageSettings) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const accessSnapshot =
        await getDocs(collection(db, "userAccess"));
      const nextAccessUsers = accessSnapshot.docs
        .map((accessDoc) => ({
          id: accessDoc.id,
          ...(accessDoc.data() as Omit<AccessUser, "id">),
        }))
        .filter((accessUser) =>
          ["admin", "teacher", "student"].includes(accessUser.role)
        )
        .sort((a, b) => a.email.localeCompare(b.email, "es"));

      const auditSnapshot = await getDocs(
        query(collection(db, "auditLogs"), orderBy("createdAt", "desc"))
      );
      const nextAuditLogs = auditSnapshot.docs
        .slice(0, 25)
        .map((auditDoc) => ({
          id: auditDoc.id,
          ...(auditDoc.data() as Omit<AuditLog, "id">),
        }));
      const studentsSnapshot =
        await getDocs(collection(db, "students"));
      const students = studentsSnapshot.docs.map((studentDoc) => ({
        id: studentDoc.id,
        ...(studentDoc.data() as Omit<HealthStudent, "id">),
      }));
      const attendanceSnapshot =
        await getDocs(collection(db, "attendance"));
      const attendanceRecords = attendanceSnapshot.docs.map((attendanceDoc) => ({
        id: attendanceDoc.id,
        ...(attendanceDoc.data() as Omit<HealthAttendance, "id">),
      }));
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const nextHealthItems = [
        `${students.filter((student) => !student.tutor && (student.tutorEmails || []).length === 0).length} alumnos sin tutor`,
        `${students.filter((student) => validRotations(student).length === 0).length} alumnos sin rotaciones`,
        `${students.filter((student) => validRotations(student).some((rotation) => !rotation.startDate || !rotation.endDate)).length} alumnos con fechas incompletas`,
        `${students.filter((student) => !isStudentFinalized(student) && validRotations(student).some((rotation) => {
          const endDate = parseLocalDate(rotation.endDate);
          return endDate && endDate < todayStart && rotation.status !== "Finalizada";
        })).length} alumnos con rotaciones vencidas sin finalizar`,
        `${attendanceRecords.filter((record) => record.status === "absent" && (record.recoveryStatus === "pending" || record.recoveryStatus === "later")).length} inasistencias con recuperación pendiente`,
      ];

      setAccessUsers(nextAccessUsers);
      setAuditLogs(nextAuditLogs);
      setHealthItems(nextHealthItems);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }, [canManageSettings]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSettings();
    });
  }, [loadSettings]);

  const groupedUsers = useMemo(
    () => ({
      admin: accessUsers.filter((accessUser) => accessUser.role === "admin"),
      teacher: accessUsers.filter(
        (accessUser) => accessUser.role === "teacher"
      ),
      student: accessUsers.filter(
        (accessUser) => accessUser.role === "student"
      ),
    }),
    [accessUsers]
  );

  async function handleSaveAccess() {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      setError("Ingresa un correo válido.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await setDoc(doc(db, "userAccess", cleanEmail), {
        email: cleanEmail,
        name: name.trim(),
        role: selectedRole,
        updatedAt: new Date().toISOString(),
        updatedBy: normalizeEmail(user?.email),
      });
      await writeAuditLog({
        action: "access.updated",
        actorEmail: user?.email,
        targetType: "userAccess",
        targetId: cleanEmail,
        targetName: cleanEmail,
        details: {
          role: selectedRole,
        },
      });

      setEmail("");
      setName("");
      setSelectedRole("teacher");
      await loadSettings();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar el acceso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccess(accessUser: AccessUser) {
    const confirmed = confirm(
      `¿Eliminar acceso de ${accessUser.email}?`
    );

    if (!confirmed) return;

    await deleteDoc(doc(db, "userAccess", accessUser.email));
    await writeAuditLog({
      action: "access.deleted",
      actorEmail: user?.email,
      targetType: "userAccess",
      targetId: accessUser.email,
      targetName: accessUser.email,
      details: {
        role: accessUser.role,
      },
    });
    await loadSettings();
  }

  async function copyInvitation(accessUser: AccessUser) {
    const appUrl = "https://quiron-sigma.vercel.app";
    const text = `Hola ${accessUser.name || ""}. Tu acceso a Quirón está habilitado como ${userRoleLabel(accessUser.role)} para el correo ${accessUser.email}. Ingresa con Google en ${appUrl}`;

    await navigator.clipboard.writeText(text);
  }

  if (!canManageSettings) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-6 text-amber-700">
          Sólo administradores pueden modificar la configuración.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Configuración
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
          Accesos y auditoría
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-500">
          Administra roles del piloto y revisa la bitácora de acciones
          relevantes.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Agregar o actualizar usuario
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
          <input
            type="email"
            placeholder="correo@dominio.cl"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <input
            type="text"
            placeholder="Nombre visible"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={selectedRole}
            onChange={(event) =>
              setSelectedRole(event.target.value as UserRole)
            }
            className="rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="admin">Administrador</option>
            <option value="teacher">Docente</option>
            <option value="student">Alumno</option>
          </select>
          <button
            type="button"
            onClick={() => void handleSaveAccess()}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Salud del sistema
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Checklist rápido para detectar datos incompletos o pendientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="w-fit rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Recalcular
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {healthItems.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        {(["admin", "teacher", "student"] as UserRole[]).map((userRole) => (
          <article
            key={userRole}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900">
              {userRoleLabel(userRole)}
            </h2>
            <div className="mt-4 grid gap-2">
              {loading && (
                <p className="text-sm text-slate-400">Cargando...</p>
              )}
              {!loading && groupedUsers[userRole].length === 0 && (
                <p className="text-sm text-slate-400">Sin usuarios.</p>
              )}
              {groupedUsers[userRole].map((accessUser) => (
                <div
                  key={accessUser.email}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                >
                  <p className="font-semibold text-slate-900">
                    {accessUser.name || accessUser.email}
                  </p>
                  <p className="text-sm text-slate-500">
                    {accessUser.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccess(accessUser)}
                    className="mt-2 text-sm font-semibold text-red-600"
                  >
                    Eliminar acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyInvitation(accessUser)}
                    className="ml-3 mt-2 text-sm font-semibold text-indigo-600"
                  >
                    Copiar invitación
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Bitácora reciente
        </h2>
        <div className="mt-4 grid gap-3">
          {auditLogs.length === 0 && !loading && (
            <p className="text-sm text-slate-400">
              Aún no hay eventos registrados.
            </p>
          )}
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-slate-900">
                  {log.action || "Acción"}
                </p>
                <p className="text-sm text-slate-400">
                  {auditDate(log.createdAt)}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {log.actorEmail || "Usuario"} · {log.targetType || "-"} ·{" "}
                {log.targetName || "-"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
