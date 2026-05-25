"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  tutor?: string;
  average?: string;
};

export default function StudentsPage() {

  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {

    const snapshot = await getDocs(
      collection(db, "students")
    );

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Student, "id">),
    }));

    setStudents(data);
  }

  async function handleDeleteStudent(id: string) {

    const confirmDelete = confirm(
      "¿Eliminar alumno?"
    );

    if (!confirmDelete) return;

    await deleteDoc(
      doc(db, "students", id)
    );

    loadStudents();
  }

  return (

    <div className="p-10">

      <div className="flex items-center justify-between mb-10">

        <div>

          <h1 className="text-6xl font-bold text-[#1E293B]">
            Alumnos
          </h1>

          <p className="text-gray-500 mt-2 text-xl">
            Gestión clínica de internos
          </p>

        </div>

        <Link
          href="/students/new"
          className="bg-[#5B6CFF] hover:bg-[#4c5df5] transition text-white px-6 py-4 rounded-3xl font-semibold"
        >
          + Nuevo alumno
        </Link>

      </div>

      <div className="grid gap-5">

        {students.map((student) => (

          <div
            key={student.id}
            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition"
          >

            <div className="flex items-center justify-between">

              <div>

                <Link
                  href={`/students/${student.id}`}
                  className="text-2xl font-bold text-[#1E293B] hover:text-[#5B6CFF] transition"
                >
                  {student.name}
                </Link>

                <div className="flex items-center gap-3 mt-3 flex-wrap">

                  <div className="bg-[#EEF0FF] text-[#5B6CFF] px-4 py-2 rounded-2xl text-sm font-medium">
                    {student.university}
                  </div>

                  <div className="bg-[#F5F7FB] text-gray-700 px-4 py-2 rounded-2xl text-sm">
                    {student.area || "General"}
                  </div>

                  {student.tutor && (

                    <div className="bg-[#ECFDF3] text-green-700 px-4 py-2 rounded-2xl text-sm">
                      Tutor: {student.tutor}
                    </div>

                  )}

                </div>

              </div>

              <div className="flex items-center gap-4">

                <div className="text-right">

                  <p className="text-gray-400 text-sm">
                    Promedio
                  </p>

                  <p className="text-3xl font-bold text-[#5B6CFF]">
                    {student.average || "-"}
                  </p>

                </div>

                <button
                  onClick={() =>
                    handleDeleteStudent(student.id)
                  }
                  className="bg-red-50 hover:bg-red-100 text-red-500 px-5 py-3 rounded-2xl transition"
                >
                  Eliminar
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}