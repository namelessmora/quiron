"use client";

import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../../lib/firebase";

import { useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  tutor?: string;
};

export default function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {

    async function loadStudent() {

      try {

        const resolvedParams =
          await params;

        const docRef = doc(
          db,
          "students",
          resolvedParams.id
        );

        const docSnap =
          await getDoc(docRef);

        if (docSnap.exists()) {

          setStudent({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Student, "id">),
          });
        }

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    }

    loadStudent();

  }, [params]);

  async function handleSave() {

    if (!student) return;

    try {

      setSaving(true);

      const docRef = doc(
        db,
        "students",
        student.id
      );

      await updateDoc(docRef, {
        name: student.name,
        university: student.university,
        career: student.career || "",
        area: student.area || "",
        tutor: student.tutor || "",
      });

      alert("Alumno actualizado ✨");

    } catch (error) {

      console.error(error);

      alert("Error al guardar");

    } finally {

      setSaving(false);
    }
  }

  async function handleDelete() {

    if (!student) return;

    const confirmDelete = confirm(
      "¿Eliminar alumno?"
    );

    if (!confirmDelete) return;

    try {

      await deleteDoc(
        doc(db, "students", student.id)
      );

      router.push("/students");

    } catch (error) {

      console.error(error);

      alert("Error al eliminar");
    }
  }

  if (loading) {
    return (
      <div className="p-10">
        Cargando alumno...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10">
        Alumno no encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-10">

      <div className="mb-10">

        <h1 className="text-5xl font-bold text-[#1E293B]">
          {student.name}
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          Perfil clínico del alumno
        </p>

      </div>

      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm max-w-5xl">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div>
            <p className="text-gray-500 mb-2">
              Nombre
            </p>

            <input
              value={student.name}
              onChange={(e) =>
                setStudent({
                  ...student,
                  name: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Universidad
            </p>

            <input
              value={student.university}
              onChange={(e) =>
                setStudent({
                  ...student,
                  university: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Carrera
            </p>

            <input
              value={student.career || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  career: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Área
            </p>

            <input
              value={student.area || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  area: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Tutor
            </p>

            <input
              value={student.tutor || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  tutor: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

        </div>

        <div className="flex gap-4 mt-10">

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#5B6CFF] hover:bg-[#4F46E5] transition text-white px-6 py-4 rounded-2xl font-medium"
          >
            {saving
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

          <button
            className="bg-[#EEF0FF] text-[#5B6CFF] px-6 py-4 rounded-2xl font-medium"
          >
            + Nueva evaluación
          </button>

          <button
            onClick={handleDelete}
            className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-medium"
          >
            Eliminar alumno
          </button>

        </div>

      </div>

    </div>
  );
}