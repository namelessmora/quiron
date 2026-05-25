"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";

import StudentModal from "../components/StudentModal";
import { db } from "../lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  areas?: string[];
  tutor?: string;
  average?: string | number;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
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

      setStudents(data);
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

    if (!query) return students;

    return students.filter((student) =>
      [
        student.name,
        student.university,
        student.career,
        student.area,
        student.tutor,
        ...(student.areas || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, students]);

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
          filteredStudents.map((student) => (
            <article
              key={student.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <Link
                    href={`/students/${student.id}`}
                    className="text-xl font-bold text-slate-900 transition hover:text-indigo-600"
                  >
                    {student.name}
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                      {student.university || "Sin universidad"}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      {student.area || student.areas?.[0] || "General"}
                    </span>
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
                    <p className="mt-1 text-3xl font-bold text-indigo-600">
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
          ))}
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
