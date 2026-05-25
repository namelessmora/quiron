"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";

import StudentModal from "../components/StudentModal";

type Student = {
  id?: string;
  name: string;
  university: string;
  career: string;
  areas: string[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const querySnapshot = await getDocs(
        collection(db, "students")
      );

      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Student),
      }));

      setStudents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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

        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          + Nuevo Alumno
        </button>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden shadow">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-4">
                Nombre
              </th>

              <th className="p-4">
                Universidad
              </th>

              <th className="p-4">
                Carrera
              </th>

              <th className="p-4">
                Áreas
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-4">
                  Cargando...
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-blue-600 font-semibold"
                    >
                      {student.name}
                    </Link>
                  </td>

                  <td className="p-4 text-gray-600">
                    {student.university}
                  </td>

                  <td className="p-4 text-gray-600">
                    {student.career}
                  </td>

                  <td className="p-4 text-gray-600">
                    {student.areas?.join(", ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <StudentModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            loadStudents();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}