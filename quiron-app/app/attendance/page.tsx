"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import * as XLSX from "xlsx";

import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { areaOptions } from "../data/studentOptions";
import { writeAuditLog } from "../lib/audit";
import { db } from "../lib/firebase";
import {
  AreaRotation,
  parseLocalDate,
} from "../lib/rotations";
import { canUserAccessStudent } from "../lib/tutors";
import { normalizeEmail } from "../lib/userRoles";

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

type AttendanceType = "in" | "out";

type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  area?: string;
  type: AttendanceType;
  markedAt?: Timestamp | { seconds?: number } | Date | null;
  markedAtIso?: string;
  markedBy?: string;
};

type AttendanceRecordWithArea = AttendanceRecord & {
  resolvedArea: string;
};

const attendanceFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
});

function attendanceDate(record: AttendanceRecord) {
  if (record.markedAt instanceof Date) return record.markedAt;

  if (record.markedAt instanceof Timestamp) {
    return record.markedAt.toDate();
  }

  if (
    record.markedAt &&
    "seconds" in record.markedAt &&
    typeof record.markedAt.seconds === "number"
  ) {
    return new Date(record.markedAt.seconds * 1000);
  }

  if (record.markedAtIso) {
    const parsedDate = new Date(record.markedAtIso);

    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }

  return null;
}

function dateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateInRotation(date: Date, rotation: AreaRotation) {
  const startDate = parseLocalDate(rotation.startDate);
  const endDate = parseLocalDate(rotation.endDate);
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (startDate && dayStart < startDate) return false;
  if (endDate && dayStart > endDate) return false;

  return Boolean(startDate || endDate);
}

function studentAreaForDate(student: Student | undefined, date: Date | null) {
  if (!student || !date) return "";

  const activeRotation = (student.rotations || []).find(
    (rotation) =>
      areaOptions.includes(rotation.area) &&
      dateInRotation(date, rotation)
  );

  if (activeRotation) return activeRotation.area;

  const validArea = (student.areas || []).find((area) =>
    areaOptions.includes(area)
  );

  if (validArea) return validArea;

  return areaOptions.includes(student.area || "")
    ? student.area || ""
    : "";
}

function typeLabel(type: AttendanceType) {
  return type === "in" ? "Ingreso" : "Salida";
}

function csvValue(value: string | number | undefined | null) {
  const cleanValue = String(value ?? "").replace(/"/g, '""');

  return `"${cleanValue}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) => row.map(csvValue).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx(filename: string, rows: string[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Marcaciones");
  XLSX.writeFile(workbook, filename);
}

export default function AttendancePage() {
  const { user, role } =
    useCurrentUserPermissions();
  const [students, setStudents] =
    useState<Student[]>([]);
  const [records, setRecords] =
    useState<AttendanceRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] =
    useState("");
  const [selectedArea, setSelectedArea] =
    useState("");
  const [startDate, setStartDate] =
    useState("");
  const [endDate, setEndDate] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState<AttendanceType | null>(null);
  const [error, setError] =
    useState("");

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const studentsSnapshot =
        await getDocs(collection(db, "students"));
      const visibleStudents = studentsSnapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .filter((student) =>
          canUserAccessStudent(role, user?.email, student)
        )
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      const attendanceSnapshot =
        await getDocs(collection(db, "attendance"));
      const visibleStudentIds = new Set(
        visibleStudents.map((student) => student.id)
      );
      const visibleRecords = attendanceSnapshot.docs
        .map((recordDoc) => ({
          id: recordDoc.id,
          ...(recordDoc.data() as Omit<AttendanceRecord, "id">),
        }))
        .filter((record) => visibleStudentIds.has(record.studentId))
        .sort((a, b) => {
          const firstDate = attendanceDate(a)?.getTime() || 0;
          const secondDate = attendanceDate(b)?.getTime() || 0;

          return secondDate - firstDate;
        });

      setStudents(visibleStudents);
      setRecords(visibleRecords);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la marcación.");
    } finally {
      setLoading(false);
    }
  }, [role, user?.email]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAttendance();
    });
  }, [loadAttendance]);

  const studentProfile = useMemo(
    () =>
      students.find(
        (student) =>
          normalizeEmail(student.email) ===
          normalizeEmail(user?.email)
      ),
    [students, user?.email]
  );

  const recordsWithArea = useMemo<AttendanceRecordWithArea[]>(
    () =>
      records.map((record) => {
        const recordDate = attendanceDate(record);
        const student = students.find(
          (currentStudent) =>
            currentStudent.id === record.studentId
        );

        return {
          ...record,
          resolvedArea:
            record.area ||
            studentAreaForDate(student, recordDate),
        };
      }),
    [records, students]
  );

  const filteredRecords = useMemo(
    () =>
      recordsWithArea.filter((record) => {
        const recordDate = attendanceDate(record);
        const recordDateValue =
          recordDate ? dateInputValue(recordDate) : "";

        return (
          (!selectedStudentId ||
            record.studentId === selectedStudentId) &&
          (!selectedArea ||
            record.resolvedArea === selectedArea) &&
          (!startDate || recordDateValue >= startDate) &&
          (!endDate || recordDateValue <= endDate)
        );
      }),
    [
      endDate,
      recordsWithArea,
      selectedArea,
      selectedStudentId,
      startDate,
    ]
  );

  const todayRecords = useMemo(() => {
    const today = dateInputValue(new Date());

    return recordsWithArea.filter((record) => {
      const recordDate = attendanceDate(record);

      return recordDate && dateInputValue(recordDate) === today;
    });
  }, [recordsWithArea]);

  const latestStudentRecord = useMemo(() => {
    if (!studentProfile) return null;

    return recordsWithArea.find(
      (record) => record.studentId === studentProfile.id
    );
  }, [recordsWithArea, studentProfile]);

  async function handleMark(type: AttendanceType) {
    if (!studentProfile || !user?.email) {
      setError(
        "No encontramos una ficha de alumno asociada a este correo."
      );
      return;
    }

    try {
      setSaving(type);
      setError("");

      const now = new Date();
      const activeArea =
        studentAreaForDate(studentProfile, now);

      const attendanceRef = await addDoc(collection(db, "attendance"), {
        studentId: studentProfile.id,
        studentName: studentProfile.name,
        studentEmail: normalizeEmail(studentProfile.email),
        area: activeArea,
        type,
        markedAt: serverTimestamp(),
        markedAtIso: now.toISOString(),
        markedBy: normalizeEmail(user.email),
      });

      await writeAuditLog({
        action:
          type === "in"
            ? "attendance.check_in"
            : "attendance.check_out",
        actorEmail: user.email,
        targetType: "attendance",
        targetId: attendanceRef.id,
        targetName: studentProfile.name,
        details: {
          studentId: studentProfile.id,
          area: activeArea,
        },
      });

      await loadAttendance();
    } catch (markError) {
      console.error(markError);
      setError("No se pudo guardar la marcación.");
    } finally {
      setSaving(null);
    }
  }

  function exportRows() {
    return [
      [
        "Alumno",
        "Correo",
        "Área",
        "Tipo",
        "Fecha",
        "Hora",
        "Marcado por",
      ],
      ...filteredRecords.map((record) => {
        const recordDate = attendanceDate(record);

        return [
          record.studentName,
          record.studentEmail || "",
          record.resolvedArea || "",
          typeLabel(record.type),
          recordDate
            ? recordDate.toLocaleDateString("es-CL")
            : "",
          recordDate
            ? recordDate.toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          record.markedBy || "",
        ];
      }),
    ];
  }

  function exportFilteredRecords() {
    downloadCsv(
      `marcaciones-${dateInputValue(new Date())}.csv`,
      exportRows()
    );
  }

  function exportFilteredRecordsXlsx() {
    downloadXlsx(
      `marcaciones-${dateInputValue(new Date())}.xlsx`,
      exportRows()
    );
  }

  const canMarkAttendance =
    role === "student" && Boolean(studentProfile);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Marcación
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Ingreso y salida
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Registro horario de alumnos con exportación general o filtrada por
            alumno y rango de fechas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAttendance()}
          className="w-fit rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Actualizar
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">
            Marcaciones visibles
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "-" : records.length}
          </p>
        </article>
        <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-700">
            Ingresos hoy
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {loading
              ? "-"
              : todayRecords.filter((record) => record.type === "in").length}
          </p>
        </article>
        <article className="rounded-lg border border-rose-100 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-700">
            Salidas hoy
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {loading
              ? "-"
              : todayRecords.filter((record) => record.type === "out").length}
          </p>
        </article>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Marcar asistencia
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Esta acción queda registrada con fecha, hora y correo del usuario.
          </p>

          {canMarkAttendance ? (
            <>
              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-500">
                  Alumno
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {studentProfile?.name}
                </p>
                {latestStudentRecord && (
                  <p className="mt-2 text-sm text-slate-500">
                    Última marca: {typeLabel(latestStudentRecord.type)} ·{" "}
                    {attendanceDate(latestStudentRecord)
                      ? attendanceFormatter.format(
                          attendanceDate(latestStudentRecord) as Date
                        )
                      : "Hora pendiente"}
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleMark("in")}
                  disabled={saving !== null}
                  className="rounded-lg bg-emerald-600 px-5 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === "in" ? "Guardando..." : "Marcar ingreso"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleMark("out")}
                  disabled={saving !== null}
                  className="rounded-lg bg-rose-600 px-5 py-4 font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === "out" ? "Guardando..." : "Marcar salida"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
              La marcación directa está disponible para perfiles de alumno con
              correo asociado a su ficha. Los perfiles docentes y
              administradores pueden revisar y exportar registros.
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Filtros y exportación
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Exporta la lista completa visible o filtra antes por alumno y
                fecha o área activa según la fecha de rotación.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportFilteredRecords}
                disabled={filteredRecords.length === 0}
                className="w-fit rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={exportFilteredRecordsXlsx}
                disabled={filteredRecords.length === 0}
                className="w-fit rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <select
              value={selectedStudentId}
              onChange={(event) =>
                setSelectedStudentId(event.target.value)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todos los alumnos</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>

            <select
              value={selectedArea}
              onChange={(event) =>
                setSelectedArea(event.target.value)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todas las áreas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Registros
          </h2>
          <p className="text-sm font-semibold text-slate-400">
            {loading
              ? "Cargando..."
              : `${filteredRecords.length} registros`}
          </p>
        </div>

        {loading && (
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        )}

        {!loading && filteredRecords.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay marcaciones para los filtros seleccionados.
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4">Alumno</th>
                  <th className="py-3 pr-4">Área</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Fecha y hora</th>
                  <th className="py-3 pr-4">Correo</th>
                  <th className="py-3 pr-4">Marcado por</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const recordDate = attendanceDate(record);

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {record.studentName}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                          {record.resolvedArea || "Sin área"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                            record.type === "in"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {typeLabel(record.type)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {recordDate
                          ? attendanceFormatter.format(recordDate)
                          : "Hora pendiente"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {record.studentEmail || "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {record.markedBy || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
