"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import * as XLSX from "xlsx";

import { areaOptions } from "../data/studentOptions";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { writeAuditLog } from "../lib/audit";
import { db } from "../lib/firebase";
import {
  AreaRotation,
  formatRotationDate,
  parseLocalDate,
} from "../lib/rotations";
import { canUserAccessStudent } from "../lib/tutors";
import { normalizeEmail } from "../lib/userRoles";

type Student = {
  id: string;
  name: string;
  email?: string;
  area?: string;
  areas?: string[];
  modality?: string;
  rotations?: AreaRotation[];
  tutor?: string;
  tutorEmails?: string[];
};

type AttendanceStatus = "present" | "absent";
type RecoveryStatus = "none" | "pending" | "accepted" | "rejected" | "later";

type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  area?: string;
  date?: string;
  status?: AttendanceStatus;
  recoveryStatus?: RecoveryStatus;
  recoveryDate?: string;
  modality?: string;
  markedBy?: string;
  markedAt?: Timestamp | { seconds?: number } | Date | null;
  type?: "in" | "out";
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Asistió",
  absent: "No asistió",
};

const recoveryLabels: Record<RecoveryStatus, string> = {
  none: "Sin recuperación",
  pending: "Recuperación sugerida",
  accepted: "Recuperación aceptada",
  rejected: "Recuperación rechazada",
  later: "Recordar más tarde",
};

function dateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);

  nextDate.setDate(date.getDate() + amount);

  return new Date(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate()
  );
}

function dateInRotation(date: Date, rotation: AreaRotation) {
  const startDate = parseLocalDate(rotation.startDate);
  const endDate = parseLocalDate(rotation.endDate);

  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;

  return Boolean(startDate || endDate);
}

function activeRotationForDate(student: Student, date: Date) {
  return (student.rotations || []).find(
    (rotation) =>
      areaOptions.includes(rotation.area) &&
      dateInRotation(date, rotation)
  );
}

function rotationModality(student: Student, rotation: AreaRotation) {
  return rotation.modality || student.modality || "Diurno";
}

function dayDifference(startDate: Date, date: Date) {
  return Math.floor(
    (date.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function isFourthModifiedAttendanceDay(
  rotation: AreaRotation,
  date: Date
) {
  const startDate = parseLocalDate(rotation.startDate);

  if (!startDate) return false;

  const difference = dayDifference(startDate, date);
  const cycleDay = ((difference % 4) + 4) % 4;

  return cycleDay === 0 || cycleDay === 1;
}

function shouldAttend(student: Student, date: Date) {
  const rotation = activeRotationForDate(student, date);

  if (!rotation) return false;

  if (rotationModality(student, rotation) === "4to Modificado") {
    return isFourthModifiedAttendanceDay(rotation, date);
  }

  const weekday = date.getDay();

  return weekday >= 1 && weekday <= 5;
}

function nextRecoveryDate(student: Student, rotation: AreaRotation) {
  const endDate =
    parseLocalDate(rotation.endDate) ||
    parseLocalDate(rotation.startDate) ||
    new Date();
  let candidate = addDays(endDate, 1);

  for (let index = 0; index < 30; index += 1) {
    if (rotationModality(student, rotation) === "4to Modificado") {
      if (isFourthModifiedAttendanceDay(rotation, candidate)) {
        return dateInputValue(candidate);
      }
    } else {
      const weekday = candidate.getDay();

      if (weekday >= 1 && weekday <= 5) {
        return dateInputValue(candidate);
      }
    }

    candidate = addDays(candidate, 1);
  }

  return dateInputValue(addDays(endDate, 1));
}

function csvValue(value: string | number | undefined | null) {
  const cleanValue = String(value ?? "").replace(/"/g, '""');

  return `"${cleanValue}"`;
}

function exportSpreadsheet(filename: string, rows: string[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");
  XLSX.writeFile(workbook, filename);
}

function exportCsv(filename: string, rows: string[][]) {
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

export default function AttendancePage() {
  const { user, role } =
    useCurrentUserPermissions();
  const [students, setStudents] =
    useState<Student[]>([]);
  const [records, setRecords] =
    useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] =
    useState(() => dateInputValue(new Date()));
  const [selectedStudentId, setSelectedStudentId] =
    useState("");
  const [selectedArea, setSelectedArea] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [savingId, setSavingId] =
    useState("");
  const [error, setError] =
    useState("");

  const selectedDateObject = useMemo(
    () => parseLocalDate(selectedDate) || new Date(),
    [selectedDate]
  );
  const userEmail = normalizeEmail(user?.email);
  const canManageAttendance =
    role === "admin" || role === "teacher";

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const studentsQuery =
        role === "admin"
          ? collection(db, "students")
          : role === "teacher"
            ? query(
                collection(db, "students"),
                where("tutorEmails", "array-contains", userEmail)
              )
            : query(
                collection(db, "students"),
                where("email", "==", userEmail)
              );
      const studentsSnapshot = await getDocs(studentsQuery);
      const visibleStudents = studentsSnapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .filter((student) =>
          canUserAccessStudent(role, userEmail, student)
        )
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      const visibleStudentIds = new Set(
        visibleStudents.map((student) => student.id)
      );

      if (visibleStudentIds.size === 0) {
        setStudents(visibleStudents);
        setRecords([]);
        return;
      }

      const attendanceSnapshots =
        role === "admin"
          ? [await getDocs(collection(db, "attendance"))]
          : await Promise.all(
              Array.from(visibleStudentIds)
                .reduce<string[][]>((chunks, studentId, index) => {
                  const chunkIndex = Math.floor(index / 30);

                  chunks[chunkIndex] = chunks[chunkIndex] || [];
                  chunks[chunkIndex].push(studentId);

                  return chunks;
                }, [])
                .map((studentIds) =>
                  getDocs(
                    query(
                      collection(db, "attendance"),
                      where("studentId", "in", studentIds)
                    )
                  )
                )
            );
      const visibleRecords = attendanceSnapshots
        .flatMap((attendanceSnapshot) =>
          attendanceSnapshot.docs.map((recordDoc) => ({
            id: recordDoc.id,
            ...(recordDoc.data() as Omit<AttendanceRecord, "id">),
          }))
        )
        .filter((record) => visibleStudentIds.has(record.studentId))
        .filter((record) => record.status === "present" || record.status === "absent")
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      setStudents(visibleStudents);
      setRecords(visibleRecords);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la asistencia.");
    } finally {
      setLoading(false);
    }
  }, [role, userEmail]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAttendance();
    });
  }, [loadAttendance]);

  const scheduledStudents = useMemo(
    () =>
      students
        .map((student) => {
          const rotation =
            activeRotationForDate(student, selectedDateObject);

          return {
            student,
            rotation,
            shouldAttend:
              rotation && shouldAttend(student, selectedDateObject),
          };
        })
        .filter((item) => item.shouldAttend)
        .filter(
          (item) =>
            (!selectedStudentId ||
              item.student.id === selectedStudentId) &&
            (!selectedArea ||
              item.rotation?.area === selectedArea)
        ),
    [selectedArea, selectedDateObject, selectedStudentId, students]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (!selectedStudentId ||
            record.studentId === selectedStudentId) &&
          (!selectedArea || record.area === selectedArea)
      ),
    [records, selectedArea, selectedStudentId]
  );

  const recordsByStudentDateArea = useMemo(
    () =>
      records.reduce<Record<string, AttendanceRecord>>((summary, record) => {
        const key = `${record.studentId}-${record.date}-${record.area}`;

        summary[key] = record;

        return summary;
      }, {}),
    [records]
  );

  async function saveAttendance(
    student: Student,
    rotation: AreaRotation,
    status: AttendanceStatus
  ) {
    if (!canManageAttendance || !user?.email) return;

    const key = `${student.id}-${selectedDate}-${rotation.area}`;
    const existingRecord = recordsByStudentDateArea[key];
    const suggestedRecovery =
      status === "absent"
        ? nextRecoveryDate(student, rotation)
        : "";
    const recoveryStatus: RecoveryStatus =
      status === "absent" ? "pending" : "none";
    const payload = {
      studentId: student.id,
      studentName: student.name,
      studentEmail: normalizeEmail(student.email),
      area: rotation.area,
      date: selectedDate,
      status,
      recoveryStatus,
      recoveryDate: suggestedRecovery,
      modality: rotationModality(student, rotation),
      markedBy: normalizeEmail(user.email),
      markedAt: serverTimestamp(),
    };

    try {
      setSavingId(key);

      let savedRecordId = existingRecord?.id || "";

      if (existingRecord) {
        await updateDoc(
          doc(db, "attendance", existingRecord.id),
          payload
        );
      } else {
        const recordRef = await addDoc(
          collection(db, "attendance"),
          payload
        );

        savedRecordId = recordRef.id;
      }

      const savedRecord: AttendanceRecord = {
        ...payload,
        id: savedRecordId,
        markedAt: new Date(),
      };

      setRecords((currentRecords) => {
        const otherRecords = currentRecords.filter(
          (record) =>
            `${record.studentId}-${record.date}-${record.area}` !== key
        );

        return [savedRecord, ...otherRecords].sort((a, b) =>
          (b.date || "").localeCompare(a.date || "")
        );
      });

      await writeAuditLog({
        action:
          status === "present"
            ? "attendance.present"
            : "attendance.absent",
        actorEmail: user.email,
        targetType: "attendance",
        targetName: student.name,
        details: {
          studentId: student.id,
          area: rotation.area,
          date: selectedDate,
          recoveryDate: suggestedRecovery,
        },
      });
      void loadAttendance();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar la asistencia.");
    } finally {
      setSavingId("");
    }
  }

  async function updateRecovery(
    record: AttendanceRecord,
    recoveryStatus: RecoveryStatus
  ) {
    const student = students.find(
      (currentStudent) => currentStudent.id === record.studentId
    );

    if (!student || !record.area) return;

    try {
      setSavingId(record.id);

      if (recoveryStatus === "accepted" && record.recoveryDate) {
        const nextRotations = (student.rotations || []).map((rotation) =>
          rotation.area === record.area
            ? {
                ...rotation,
                endDate: record.recoveryDate,
              }
            : rotation
        );

        await updateDoc(doc(db, "students", student.id), {
          rotations: nextRotations,
        });
      }

      await updateDoc(doc(db, "attendance", record.id), {
        recoveryStatus,
      });
      await writeAuditLog({
        action: `attendance.recovery.${recoveryStatus}`,
        actorEmail: user?.email,
        targetType: "attendance",
        targetId: record.id,
        targetName: record.studentName,
        details: {
          studentId: record.studentId,
          area: record.area,
          recoveryDate: record.recoveryDate,
        },
      });
      await loadAttendance();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo actualizar la recuperación.");
    } finally {
      setSavingId("");
    }
  }

  function exportRows() {
    return [
      [
        "Alumno",
        "Correo",
        "Área",
        "Fecha",
        "Modalidad",
        "Asistencia",
        "Recuperación",
        "Fecha recuperación",
        "Registrado por",
      ],
      ...filteredRecords.map((record) => [
        record.studentName,
        record.studentEmail || "",
        record.area || "",
        record.date || "",
        record.modality || "",
        record.status ? statusLabels[record.status] : "",
        recoveryLabels[record.recoveryStatus || "none"],
        record.recoveryDate || "",
        record.markedBy || "",
      ]),
    ];
  }

  function exportCsvRecords() {
    exportCsv(`asistencia-${selectedDate}.csv`, exportRows());
  }

  function exportExcelRecords() {
    exportSpreadsheet(`asistencia-${selectedDate}.xlsx`, exportRows());
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Asistencia
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Control docente de asistencia
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Registra si el alumno asistió, sugiere recuperación ante
            inasistencia y extiende la rotación cuando el tutor acepta.
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
            Programados
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "-" : scheduledStudents.length}
          </p>
        </article>
        <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-700">
            Asistencias
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {
              filteredRecords.filter((record) => record.status === "present")
                .length
            }
          </p>
        </article>
        <article className="rounded-lg border border-rose-100 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-700">
            Inasistencias
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {
              filteredRecords.filter((record) => record.status === "absent")
                .length
            }
          </p>
        </article>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
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
            onChange={(event) => setSelectedArea(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Todas las áreas</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCsvRecords}
              disabled={filteredRecords.length === 0}
              className="flex-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={exportExcelRecords}
              disabled={filteredRecords.length === 0}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Excel
            </button>
          </div>
        </div>
      </section>

      {!canManageAttendance && (
        <div className="mb-6 rounded-lg border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-700">
          La asistencia la registra el docente tutor o administración.
        </div>
      )}

      {canManageAttendance && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Pasar asistencia del día
          </h2>

          <div className="mt-4 grid gap-3">
            {loading && (
              <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
            )}
            {!loading && scheduledStudents.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No hay alumnos programados para asistir en esta fecha.
              </div>
            )}
            {scheduledStudents.map(({ student, rotation }) => {
              if (!rotation) return null;

              const key = `${student.id}-${selectedDate}-${rotation.area}`;
              const record = recordsByStudentDateArea[key];

              return (
                <article
                  key={key}
                  className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {student.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {rotation.area} · {rotationModality(student, rotation)}
                    </p>
                    {record && (
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        Registro:{" "}
                        {record.status ? statusLabels[record.status] : "-"}
                        {record.recoveryDate
                          ? ` · Recuperación sugerida ${formatRotationDate(
                              record.recoveryDate
                            )}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void saveAttendance(student, rotation, "present")
                      }
                      disabled={savingId === key}
                      className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Asistió
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void saveAttendance(student, rotation, "absent")
                      }
                      disabled={savingId === key}
                      className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      No asistió
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Registro y recuperaciones
          </h2>
          <p className="text-sm font-semibold text-slate-400">
            {filteredRecords.length} registros
          </p>
        </div>

        <div className="grid gap-3">
          {filteredRecords.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No hay registros para los filtros seleccionados.
            </div>
          )}

          {filteredRecords.map((record) => (
            <article
              key={record.id}
              className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      record.status === "present"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {record.status ? statusLabels[record.status] : "-"}
                  </span>
                  <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                    {record.area || "Sin área"}
                  </span>
                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                    {formatRotationDate(record.date)}
                  </span>
                </div>

                <p className="mt-3 text-lg font-bold text-slate-900">
                  {record.studentName}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {record.modality || "Diurno"} · Registrado por{" "}
                  {record.markedBy || "-"}
                </p>
                {record.status === "absent" && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {recoveryLabels[record.recoveryStatus || "pending"]}
                    {record.recoveryDate
                      ? ` · ${formatRotationDate(record.recoveryDate)}`
                      : ""}
                  </p>
                )}
              </div>

              {canManageAttendance && record.status === "absent" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void updateRecovery(record, "accepted")}
                    disabled={savingId === record.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateRecovery(record, "later")}
                    disabled={savingId === record.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Recordar más tarde
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateRecovery(record, "rejected")}
                    disabled={savingId === record.id}
                    className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
