"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";

import StudentModal from "../components/StudentModal";
import {
  rubrics,
  type Rubric,
} from "../data/rubrics";
import {
  areaOptions,
  careerOptions,
  modalityOptions,
  roleOptions,
  universityOptions,
} from "../data/studentOptions";
import {
  academicStatusOptions,
  getAcademicStatus,
} from "../lib/academicStatus";
import { db } from "../lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  areas?: string[];
  role?: string;
  modality?: string;
  tutor?: string;
  average?: string | number;
};

type EvaluationSummary = {
  rubricId?: string;
  rubricName?: string;
};

function studentAreas(student: Student) {
  const areas = [
    ...(student.areas || []),
    student.area,
  ].filter(
    (area): area is string =>
      typeof area === "string" &&
      areaOptions.includes(area)
  );

  return Array.from(new Set(areas));
}

function normalizeMatchValue(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function areaMatchesRubric(area: string, rubric: Rubric) {
  const normalizedArea = normalizeMatchValue(area);

  return [rubric.area, ...rubric.areaAliases].some((candidate) => {
    const normalizedCandidate = normalizeMatchValue(candidate);

    return (
      normalizedArea === normalizedCandidate ||
      normalizedArea.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedArea)
    );
  });
}

function evaluationMatchesArea(evaluation: EvaluationSummary, area: string) {
  const rubric = rubrics.find(
    (currentRubric) =>
      currentRubric.id === evaluation.rubricId ||
      currentRubric.name === evaluation.rubricName
  );

  return rubric ? areaMatchesRubric(area, rubric) : false;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluationsByStudent, setEvaluationsByStudent] = useState<
    Record<string, EvaluationSummary[]>
  >({});
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [areaEvaluationFilter, setAreaEvaluationFilter] = useState("");
  const [careerFilter, setCareerFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [tutorFilter, setTutorFilter] = useState("");
  const [academicStatusFilter, setAcademicStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStudentModal, setShowStudentModal] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(collection(db, "students"));

      const data = snapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      const evaluationSnapshots = await Promise.all(
        data.map((student) =>
          getDocs(collection(db, "students", student.id, "evaluations"))
        )
      );

      const nextEvaluationsByStudent = data.reduce<
        Record<string, EvaluationSummary[]>
      >((summary, student, index) => {
        summary[student.id] = evaluationSnapshots[index].docs.map(
          (evaluationDoc) => {
            const evaluation = evaluationDoc.data() as EvaluationSummary;

            return {
              rubricId: evaluation.rubricId,
              rubricName: evaluation.rubricName,
            };
          }
        );

        return summary;
      }, {});

      setStudents(data);
      setEvaluationsByStudent(nextEvaluationsByStudent);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la lista de alumnos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudents();
    });
  }, [loadStudents]);

  async function handleDeleteStudent(id: string) {
    const confirmDelete = confirm("¿Eliminar alumno?");

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "students", id));

    loadStudents();
  }

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) =>
      [
        student.name,
        student.university,
        student.career,
        studentAreas(student).join(" "),
        student.role,
        student.modality,
        student.tutor,
        getAcademicStatus(student.average).label,
        ...(student.areas || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)) &&
      (!universityFilter || student.university === universityFilter) &&
      (!areaFilter || studentAreas(student).includes(areaFilter)) &&
      (!areaEvaluationFilter ||
        !areaFilter ||
        (areaEvaluationFilter === "with"
          ? (evaluationsByStudent[student.id] || []).some((evaluation) =>
              evaluationMatchesArea(evaluation, areaFilter)
            )
          : !(evaluationsByStudent[student.id] || []).some((evaluation) =>
              evaluationMatchesArea(evaluation, areaFilter)
            ))) &&
      (!careerFilter || student.career === careerFilter) &&
      (!roleFilter || student.role === roleFilter) &&
      (!modalityFilter || student.modality === modalityFilter) &&
      (!tutorFilter || student.tutor === tutorFilter) &&
      (!academicStatusFilter ||
        getAcademicStatus(student.average).label === academicStatusFilter)
    );
  }, [
    academicStatusFilter,
    areaFilter,
    areaEvaluationFilter,
    careerFilter,
    evaluationsByStudent,
    modalityFilter,
    roleFilter,
    search,
    students,
    tutorFilter,
    universityFilter,
  ]);

  const tutorOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.tutor).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b), "es")),
    [students]
  );

  const activeFilters = [
    universityFilter,
    areaFilter,
    areaEvaluationFilter,
    careerFilter,
    roleFilter,
    modalityFilter,
    tutorFilter,
    academicStatusFilter,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setUniversityFilter("");
    setAreaFilter("");
    setAreaEvaluationFilter("");
    setCareerFilter("");
    setRoleFilter("");
    setModalityFilter("");
    setTutorFilter("");
    setAcademicStatusFilter("");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Alumnos
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Internos clínicos
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Busca, revisa y administra los registros académicos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowStudentModal(true)}
          className="w-fit rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Nuevo alumno
        </button>
      </header>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="block">
          <span className="sr-only">Buscar alumnos</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, universidad, área o tutor"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <p className="text-sm font-medium text-slate-500">
          {loading
            ? "Cargando..."
            : `${filteredStudents.length} de ${students.length} alumnos`}
        </p>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">
              Cruza datos académicos y administrativos para encontrar alumnos.
            </p>
          </div>

          {(activeFilters > 0 || search) && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-fit rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={universityFilter}
            onChange={(event) => setUniversityFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Universidad</option>
            {universityOptions.map((university) => (
              <option key={university} value={university}>
                {university}
              </option>
            ))}
          </select>

          <select
            value={areaFilter}
            onChange={(event) => {
              setAreaFilter(event.target.value);
              if (!event.target.value) {
                setAreaEvaluationFilter("");
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Área</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={areaEvaluationFilter}
            onChange={(event) => setAreaEvaluationFilter(event.target.value)}
            disabled={!areaFilter}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Evaluación por área</option>
            <option value="with">Con evaluación del área</option>
            <option value="without">Sin evaluación del área</option>
          </select>

          <select
            value={careerFilter}
            onChange={(event) => setCareerFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Carrera</option>
            {careerOptions.map((career) => (
              <option key={career} value={career}>
                {career}
              </option>
            ))}
          </select>

          <select
            value={academicStatusFilter}
            onChange={(event) => setAcademicStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Estado académico</option>
            {academicStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Rol</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            value={modalityFilter}
            onChange={(event) => setModalityFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Modalidad</option>
            {modalityOptions.map((modality) => (
              <option key={modality} value={modality}>
                {modality}
              </option>
            ))}
          </select>

          <select
            value={tutorFilter}
            onChange={(event) => setTutorFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Tutor</option>
            {tutorOptions.map((tutor) => (
              <option key={tutor} value={tutor}>
                {tutor}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {loading &&
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}

        {!loading && filteredStudents.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Sin alumnos para mostrar
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ajusta la búsqueda o crea un nuevo registro.
            </p>
          </div>
        )}

        {!loading &&
          filteredStudents.map((student) => {
            const academicStatus = getAcademicStatus(student.average);

            return (
              <article
                key={student.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-xl font-bold text-slate-900 transition hover:text-indigo-600"
                      >
                        {student.name}
                      </Link>

                      <span
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${academicStatus.badgeClassName}`}
                      >
                        {academicStatus.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                        {student.university || "Sin universidad"}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                        {studentAreas(student).join(", ") || "Sin área"}
                      </span>
                      {student.career && (
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                          {student.career}
                        </span>
                      )}
                      {student.role && (
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                          {student.role}
                        </span>
                      )}
                      {student.modality && (
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                          {student.modality}
                        </span>
                      )}
                      {student.tutor && (
                        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                          Tutor: {student.tutor}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 lg:justify-end">
                    <div className="text-left lg:text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Promedio
                      </p>
                      <p className={`mt-1 text-3xl font-bold ${academicStatus.textColor}`}>
                        {student.average || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student.id)}
                      className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {showStudentModal && (
        <StudentModal
          onClose={() => setShowStudentModal(false)}
          onSaved={() => {
            setShowStudentModal(false);
            loadStudents();
          }}
        />
      )}
    </div>
  );
}
