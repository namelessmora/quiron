"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStudents() {
    try {
      const querySnapshot = await getDocs(
        collection(db, "students")
      );

      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Student, "id">),
      }));

      setStudents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = confirm(
      "¿Eliminar alumno?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "students", id));

      loadStudents();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-xl">
        Cargando alumnos...
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold mb-2">
            Alumnos
          </h1>

          <p className="text-gray-500">
            Gestión clínica de internos
          </p>
        </div>

        <a
          href="/students/new"
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          + Nuevo Alumno
        </a>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden border">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr className="text-left">
              <th className="p-5">Alumno</th>
              <th className="p-5">Universidad</th>
              <th className="p-5">Carrera</th>
              <th className="p-5">Área</th>
              <th className="p-5">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-5">
                  <a
                    href={`/students/detail?id=${student.id}`}
                    className="font-semibold text-black hover:underline"
                  >
                    {student.name}
                  </a>
                </td>

                <td className="p-5">
                  {student.university || "-"}
                </td>

                <td className="p-5">
                  {student.career || "Sin definir"}
                </td>

                <td className="p-5">
                  {student.area || "General"}
                </td>

                <td className="p-5">
                  <button
                    onClick={() =>
                      handleDelete(student.id)
                    }
                    className="bg-red-500 text-white px-4 py-2 rounded-xl"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}