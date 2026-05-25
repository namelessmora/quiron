"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";

export default function StudentsPage() {

  const [students, setStudents] = useState<any[]>([]);

  async function loadStudents() {
    const querySnapshot = await getDocs(
      collection(db, "students")
    );

    const studentsData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setStudents(studentsData);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">

        <div>
          <h1 className="text-5xl font-bold text-[#1E293B]">
            Alumnos
          </h1>

          <p className="text-gray-500 mt-3 text-lg">
            Gestión clínica de internos
          </p>
        </div>

        <Link
          href="/students/new"
          className="bg-[#5B6CFF] hover:bg-[#4F46E5] transition text-white px-6 py-4 rounded-2xl font-medium shadow-sm"
        >
          + Nuevo alumno
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

        <input
          placeholder="Buscar alumno..."
          className="bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none shadow-sm"
        />

        <select className="bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none shadow-sm">
          <option>TODAS</option>
        </select>

        <select className="bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none shadow-sm">
          <option>TODOS</option>
        </select>

        <select className="bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none shadow-sm">
          <option>TODAS</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="grid grid-cols-6 px-8 py-5 border-b border-gray-100 text-sm font-semibold text-gray-500">
          <div>Alumno</div>
          <div>Universidad</div>
          <div>Área</div>
          <div>Tutor</div>
          <div>Promedio</div>
          <div>Estado</div>
        </div>

        {students.map((student) => (

          <Link
            key={student.id}
            href={`/students/${student.id}`}
            className="grid grid-cols-6 px-8 py-6 border-b border-gray-50 hover:bg-[#FAFBFF] transition items-center"
          >
            <div className="font-semibold text-[#1E293B]">
              {student.name}
            </div>

            <div className="text-gray-600">
              {student.university || "-"}
            </div>

            <div>
              <span className="bg-[#EEF0FF] text-[#5B6CFF] px-4 py-2 rounded-full text-sm font-medium">
                {student.area || "General"}
              </span>
            </div>

            <div className="text-gray-500">
              {student.tutor || "-"}
            </div>

            <div className="font-semibold text-[#5B6CFF]">
              {student.average || "-"}
            </div>

            <div>
              <span className="bg-[#F0FDF4] text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                Activo
              </span>
            </div>
          </Link>

        ))}

      </div>
    </div>
  );
}