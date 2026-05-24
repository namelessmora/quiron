"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";

type Student = {
  id?: string;
  name: string;
  university: string;
  career: string;
  areas: string[];
  tutor: string;
  shift: string;
  status: string;
  average?: number;
};

export default function StudentsPage() {

  const [students, setStudents] =
    useState<Student[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedUniversity, setSelectedUniversity] =
    useState("TODAS");

  const [selectedStatus, setSelectedStatus] =
    useState("TODOS");

  const [selectedArea, setSelectedArea] =
    useState("TODAS");

  useEffect(() => {

    loadStudents();

  }, []);

  async function loadStudents() {

    const querySnapshot =
      await getDocs(
        collection(db, "students")
      );

    const studentsData: Student[] = [];

    for (const studentDoc of querySnapshot.docs) {

      const student =
        studentDoc.data() as Student;

      const evaluationsSnapshot =
        await getDocs(
          collection(
            db,
            "students",
            studentDoc.id,
            "evaluations"
          )
        );

      const grades: number[] = [];

      evaluationsSnapshot.forEach((doc) => {

        const data = doc.data();

        if (data.grade) {

          grades.push(
            Number(data.grade)
          );

        }

      });

      const average =
        grades.length > 0
          ? Number(
              (
                grades.reduce(
                  (
                    acc,
                    grade
                  ) => acc + grade,
                  0
                ) / grades.length
              ).toFixed(1)
            )
          : undefined;

      studentsData.push({
        id: studentDoc.id,
        ...student,
        average,
      });

    }

    setStudents(studentsData);

  }

  // ESTADO
  function getStatus(
    average?: number
  ) {

    if (!average) {

      return "SIN EVALUACIONES";

    }

    if (average < 4) {

      return "CRÍTICO";

    }

    if (average < 5) {

      return "OBSERVACIÓN";

    }

    return "APROBADO";

  }

  // BADGE
  function getBadge(
    average?: number
  ) {

    if (!average) {

      return {
        label:
          "SIN EVALUACIONES",

        color:
          "bg-gray-100 text-gray-500",
      };

    }

    if (average < 4) {

      return {
        label:
          "CRÍTICO",

        color:
          "bg-red-100 text-red-600",
      };

    }

    if (average < 5) {

      return {
        label:
          "OBSERVACIÓN",

        color:
          "bg-yellow-100 text-yellow-700",
      };

    }

    return {
      label:
        "APROBADO",

      color:
        "bg-green-100 text-green-700",
    };

  }

  // LISTAS ÚNICAS
  const universities = [
    "TODAS",

    ...new Set(
      students.map(
        (student) =>
          student.university
      )
    ),
  ];

  const areas = [
    "TODAS",

    ...new Set(
      students.flatMap(
        (student) =>
          student.areas || []
      )
    ),
  ];

  // FILTRO
  const filteredStudents =
    students.filter((student) => {

      const matchesSearch =
        student.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesUniversity =
        selectedUniversity ===
          "TODAS" ||

        student.university ===
          selectedUniversity;

      const matchesStatus =
        selectedStatus ===
          "TODOS" ||

        getStatus(
          student.average
        ) ===
          selectedStatus;

      const matchesArea =
        selectedArea ===
          "TODAS" ||

        student.areas?.includes(
          selectedArea
        );

      return (
        matchesSearch &&
        matchesUniversity &&
        matchesStatus &&
        matchesArea
      );

    });

  return (
    <main className="p-10">

      <div className="mb-8">

        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Alumnos
        </h1>

        <p className="text-gray-500">
          Gestión clínica de internos
        </p>

      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-4 gap-4 mb-8">

        <input
          type="text"
          placeholder="Buscar alumno..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm outline-none focus:ring-2 focus:ring-[#4f6ef7]"
        />

        {/* UNIVERSIDAD */}
        <select
          value={selectedUniversity}
          onChange={(e) =>
            setSelectedUniversity(
              e.target.value
            )
          }
          className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm outline-none"
        >

          {universities.map(
            (university) => (

              <option
                key={university}
              >
                {university}
              </option>

            )
          )}

        </select>

        {/* ESTADO */}
        <select
          value={selectedStatus}
          onChange={(e) =>
            setSelectedStatus(
              e.target.value
            )
          }
          className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm outline-none"
        >

          <option>
            TODOS
          </option>

          <option>
            APROBADO
          </option>

          <option>
            OBSERVACIÓN
          </option>

          <option>
            CRÍTICO
          </option>

          <option>
            SIN EVALUACIONES
          </option>

        </select>

        {/* ÁREA */}
        <select
          value={selectedArea}
          onChange={(e) =>
            setSelectedArea(
              e.target.value
            )
          }
          className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm outline-none"
        >

          {areas.map(
            (area) => (

              <option
                key={area}
              >
                {area}
              </option>

            )
          )}

        </select>

      </div>

      {/* TABLA */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-[#f8f7ff] border-b border-gray-100">

              <tr className="text-left">

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Alumno
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Universidad
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Áreas
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Tutor
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Promedio
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-gray-500">
                  Estado
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredStudents.map((student) => {

                const badge =
                  getBadge(
                    student.average
                  );

                return (

                  <tr
                    key={student.id}
                    className="border-b border-gray-50 hover:bg-[#fcfcff] transition"
                  >

                    <td className="px-6 py-5">

                      <Link
                        href={`/students/${student.id}`}
                        className="font-semibold text-gray-800 hover:text-[#4f6ef7]"
                      >
                        {student.name}
                      </Link>

                    </td>

                    <td className="px-6 py-5 text-gray-600">

                      {student.university}

                    </td>

                    <td className="px-6 py-5">

                      <div className="flex flex-wrap gap-2">

                        {student.areas?.map(
                          (area) => (

                            <span
                              key={area}
                              className="bg-[#eef2ff] text-[#4f6ef7] px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {area}
                            </span>

                          )
                        )}

                      </div>

                    </td>

                    <td className="px-6 py-5 text-gray-600">

                      {student.tutor || "-"}

                    </td>

                    <td className="px-6 py-5">

                      <p className="text-xl font-bold text-[#4f6ef7]">

                        {student.average
                          ? student.average
                          : "-"}

                      </p>

                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                      >
                        {badge.label}
                      </span>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      </div>

    </main>
  );
}