"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

import {
  universityOptions,
} from "../data/studentOptions";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import {
  getAcademicStatus,
  parseAverage,
} from "../lib/academicStatus";
import { db } from "../lib/firebase";
import {
  AreaRotation,
  formatRotationDate,
  parseLocalDate,
  validRotations,
  validStudentAreas,
} from "../lib/rotations";

type Student = {
  id: string;
  name: string;
  email?: string;
  university?: string;
  career?: string;
  areas?: string[];
  area?: string;
  average?: string | number;
  rotations?: AreaRotation[];
};

type Evaluation = {
  id: string;
  studentId: string;
  rubricName?: string;
  score?: string;
  createdAt?: { seconds?: number };
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  area?: string;
  date?: string;
  status?: "present" | "absent";
  recoveryStatus?: string;
};

function dateYear(value?: string) {
  return parseLocalDate(value)?.getFullYear() || null;
}

function dateSemester(value?: string) {
  const date = parseLocalDate(value);

  if (!date) return null;

  return date.getMonth() < 6 ? "1" : "2";
}

function rotationMatchesPeriod(
  rotation: AreaRotation,
  year: string,
  semester: string
) {
  if (!year && !semester) return true;

  const dates = [rotation.startDate, rotation.endDate].filter(Boolean) as string[];

  if (dates.length === 0) return !year && !semester;

  return dates.some((date) => {
    const matchesYear = !year || String(dateYear(date)) === year;
    const matchesSemester = !semester || dateSemester(date) === semester;

    return matchesYear && matchesSemester;
  });
}

function studentMatchesPeriod(student: Student, year: string, semester: string) {
  const rotations = validRotations(student);

  if (rotations.length === 0) return !year && !semester;

  return rotations.some((rotation) =>
    rotationMatchesPeriod(rotation, year, semester)
  );
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((summary, value) => {
    const key = value || "Sin dato";

    summary[key] = (summary[key] || 0) + 1;

    return summary;
  }, {});
}

function tableRows(summary: Record<string, number>) {
  return Object.entries(summary)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
}

function exportWorkbook(fileName: string, sheets: Record<string, unknown[]>) {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, rows]) => {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      sheetName
    );
  });

  XLSX.writeFile(workbook, fileName);
}

export default function HistoryPage() {
  const { permissions } = useCurrentUserPermissions();
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const studentsSnapshot = await getDocs(collection(db, "students"));
      const nextStudents = studentsSnapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      const evaluationSnapshots = await Promise.all(
        nextStudents.map((student) =>
          getDocs(collection(db, "students", student.id, "evaluations"))
        )
      );
      const nextEvaluations = evaluationSnapshots.flatMap((snapshot, index) =>
        snapshot.docs.map((evaluationDoc) => ({
          id: evaluationDoc.id,
          studentId: nextStudents[index].id,
          ...(evaluationDoc.data() as Omit<Evaluation, "id" | "studentId">),
        }))
      );

      const attendanceSnapshot = await getDocs(collection(db, "attendance"));
      const nextAttendance = attendanceSnapshot.docs.map((attendanceDoc) => ({
        id: attendanceDoc.id,
        ...(attendanceDoc.data() as Omit<AttendanceRecord, "id">),
      }));

      setStudents(nextStudents);
      setEvaluations(nextEvaluations);
      setAttendance(nextAttendance);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el histórico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadHistory();
    });
  }, [loadHistory]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();

    students.forEach((student) => {
      validRotations(student).forEach((rotation) => {
        [rotation.startDate, rotation.endDate].forEach((date) => {
          const year = dateYear(date);

          if (year) years.add(String(year));
        });
      });
    });

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [students]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          (!universityFilter || student.university === universityFilter) &&
          studentMatchesPeriod(student, yearFilter, semesterFilter)
      ),
    [semesterFilter, students, universityFilter, yearFilter]
  );

  const filteredStudentIds = useMemo(
    () => new Set(filteredStudents.map((student) => student.id)),
    [filteredStudents]
  );

  const filteredEvaluations = useMemo(
    () =>
      evaluations.filter((evaluation) =>
        filteredStudentIds.has(evaluation.studentId)
      ),
    [evaluations, filteredStudentIds]
  );

  const filteredAttendance = useMemo(
    () =>
      attendance.filter((record) =>
        filteredStudentIds.has(record.studentId)
      ),
    [attendance, filteredStudentIds]
  );

  const metrics = useMemo(() => {
    const academicCounts = filteredStudents.reduce(
      (summary, student) => {
        summary[getAcademicStatus(student.average).key] += 1;
        return summary;
      },
      {
        approved: 0,
        critical: 0,
        failed: 0,
        ungraded: 0,
      }
    );
    const graded = filteredStudents.filter(
      (student) => parseAverage(student.average) !== null
    ).length;
    const approvalRate =
      graded > 0
        ? Math.round((academicCounts.approved / graded) * 100)
        : 0;
    const averageGrade =
      graded > 0
        ? (
            filteredStudents.reduce(
              (total, student) => total + (parseAverage(student.average) || 0),
              0
            ) / graded
          ).toFixed(1)
        : "-";
    const attendancePresent = filteredAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const attendanceAbsent = filteredAttendance.filter(
      (record) => record.status === "absent"
    ).length;

    return {
      ...academicCounts,
      total: filteredStudents.length,
      graded,
      approvalRate,
      averageGrade,
      evaluations: filteredEvaluations.length,
      attendancePresent,
      attendanceAbsent,
    };
  }, [filteredAttendance, filteredEvaluations.length, filteredStudents]);

  const universityRows = useMemo(
    () =>
      tableRows(
        countBy(filteredStudents.map((student) => student.university || "Sin dato"))
      ),
    [filteredStudents]
  );

  const areaRows = useMemo(
    () =>
      tableRows(
        countBy(
          filteredStudents.flatMap((student) => {
            const rotationAreas = validRotations(student).map(
              (rotation) => rotation.area
            );

            return rotationAreas.length > 0
              ? rotationAreas
              : validStudentAreas(student);
          })
        )
      ),
    [filteredStudents]
  );

  const periodRows = useMemo(
    () =>
      tableRows(
        countBy(
          filteredStudents.flatMap((student) =>
            validRotations(student).map((rotation) => {
              const year = dateYear(rotation.startDate || rotation.endDate);
              const semester = dateSemester(rotation.startDate || rotation.endDate);

              return year && semester
                ? `${year} · Semestre ${semester}`
                : "Sin fecha";
            })
          )
        )
      ),
    [filteredStudents]
  );

  const studentRows = useMemo(
    () =>
      filteredStudents.map((student) => ({
        Alumno: student.name,
        Email: student.email || "",
        Universidad: student.university || "",
        Carrera: student.career || "",
        Areas: validStudentAreas(student).join(", "),
        Promedio: parseAverage(student.average) ?? "",
        Estado: getAcademicStatus(student.average).label,
        "Inicio rotación": validRotations(student)
          .map((rotation) => formatRotationDate(rotation.startDate))
          .join(", "),
        "Fin rotación": validRotations(student)
          .map((rotation) => formatRotationDate(rotation.endDate))
          .join(", "),
      })),
    [filteredStudents]
  );

  function exportExcel() {
    exportWorkbook("historico-quiron.xlsx", {
      Resumen: [
        {
          Alumnos: metrics.total,
          Aprobados: metrics.approved,
          Criticos: metrics.critical,
          Reprobados: metrics.failed,
          "Sin promedio": metrics.ungraded,
          "Tasa aprobacion": `${metrics.approvalRate}%`,
          "Promedio general": metrics.averageGrade,
          Evaluaciones: metrics.evaluations,
          Asistencias: metrics.attendancePresent,
          Inasistencias: metrics.attendanceAbsent,
        },
      ],
      Universidad: universityRows.map((row) => ({
        Universidad: row.label,
        Alumnos: row.count,
      })),
      Areas: areaRows.map((row) => ({
        Area: row.label,
        Rotaciones: row.count,
      })),
      Periodos: periodRows.map((row) => ({
        Periodo: row.label,
        Rotaciones: row.count,
      })),
      Alumnos: studentRows,
    });
  }

  function exportPdf() {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 18;

    pdf.setFillColor(79, 70, 229);
    pdf.roundedRect(14, 12, 8, 8, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Histórico académico Quirón", 26, 19);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Filtros: ${yearFilter || "Todos los años"} · ${
        semesterFilter ? `Semestre ${semesterFilter}` : "Todos los semestres"
      } · ${universityFilter || "Todas las universidades"}`,
      14,
      30
    );

    y = 42;
    [
      ["Alumnos", metrics.total],
      ["Aprobados", metrics.approved],
      ["Críticos", metrics.critical],
      ["Reprobados", metrics.failed],
      ["Tasa aprobación", `${metrics.approvalRate}%`],
      ["Promedio general", metrics.averageGrade],
      ["Evaluaciones", metrics.evaluations],
      ["Inasistencias", metrics.attendanceAbsent],
    ].forEach(([label, value], index) => {
      const x = 14 + (index % 2) * 92;
      const rowY = y + Math.floor(index / 2) * 20;

      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, rowY, 84, 14, 2, 2, "FD");
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(value), x + 4, rowY + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(String(label), x + 4, rowY + 11);
    });

    y = 94;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Áreas con mayor rotativa", 14, y);
    y += 8;

    areaRows.slice(0, 8).forEach((row) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`${row.label}: ${row.count}`, 14, y);
      y += 7;
    });

    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Alumnos incluidos", 14, y);
    y += 8;

    studentRows.slice(0, 18).forEach((row) => {
      if (y > 276) {
        pdf.addPage();
        y = 18;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(
        `${row.Alumno} · ${row.Universidad} · ${row.Areas || "Sin área"} · ${row.Estado}`,
        14,
        y,
        { maxWidth: pageWidth - 28 }
      );
      y += 6;
    });

    pdf.save("historico-quiron.pdf");
  }

  if (!permissions.canViewAllStudents) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
          Esta sección está disponible para administradores.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Histórico
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Indicadores académicos
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Consolida aprobación, rotativas, asistencia y volumen de alumnos
            para reportes internos o universitarios.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Todos los años</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Todos los semestres</option>
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </select>

          <select
            value={universityFilter}
            onChange={(event) => setUniversityFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Todas las universidades</option>
            {universityOptions.map((university) => (
              <option key={university} value={university}>
                {university}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Alumnos", loading ? "..." : metrics.total],
          ["Aprobados", metrics.approved],
          ["Críticos", metrics.critical],
          ["Reprobados", metrics.failed],
          ["Tasa de aprobación", `${metrics.approvalRate}%`],
          ["Promedio general", metrics.averageGrade],
          ["Evaluaciones", metrics.evaluations],
          ["Inasistencias", metrics.attendanceAbsent],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {[
          {
            title: "Alumnos por universidad",
            rows: universityRows,
          },
          {
            title: "Rotativas por área",
            rows: areaRows,
          },
          {
            title: "Alumnos por año/semestre",
            rows: periodRows,
          },
        ].map((table) => (
          <div
            key={table.title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">{table.title}</h2>
            <div className="mt-4 space-y-2">
              {table.rows.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos.</p>
              ) : (
                table.rows.slice(0, 8).map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      {row.label}
                    </span>
                    <span className="font-bold text-slate-900">
                      {row.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
