"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "./lib/firebase";

export default function DashboardPage() {

  const [studentsCount, setStudentsCount] =
    useState(0);

  const [evaluationsCount, setEvaluationsCount] =
    useState(0);

  const [generalAverage, setGeneralAverage] =
    useState("0");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    async function loadDashboard() {

      try {

        const studentsSnapshot =
          await getDocs(
            collection(db, "students")
          );

        const students =
          studentsSnapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data(),
            })
          );

        setStudentsCount(
          students.length
        );

        let totalEvaluations = 0;

        let averages: number[] = [];

        for (const student of students) {

          const evaluationsSnapshot =
            await getDocs(
              collection(
                db,
                "students",
                student.id,
                "evaluations"
              )
            );

          totalEvaluations +=
            evaluationsSnapshot.docs.length;

          if (student.average) {

            averages.push(
              Number(student.average)
            );

          }

        }

        setEvaluationsCount(
          totalEvaluations
        );

        if (averages.length > 0) {

          const avg =
            averages.reduce(
              (a, b) => a + b,
              0
            ) / averages.length;

          setGeneralAverage(
            avg.toFixed(1)
          );

        }

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);

      }
    }

    loadDashboard();

  }, []);

  if (loading) {

    return (
      <div className="p-10">
        Cargando dashboard...
      </div>
    );

  }

  return (
    <div className="p-10 bg-[#F7F8FC] min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">

        <div>
          <h1 className="text-5xl font-bold text-[#1E293B]">
            Dashboard
          </h1>

          <p className="text-gray-500 mt-3 text-lg">
            Bienvenida a Quirón ✨
          </p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">

          <p className="text-sm text-gray-500">
            Sistema operativo
          </p>

          <p className="text-green-600 font-semibold">
            Firebase conectado
          </p>

        </div>

      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

          <p className="text-gray-500 text-sm">
            Total alumnos
          </p>

          <h2 className="text-5xl font-bold text-[#1E293B] mt-4">
            {studentsCount}
          </h2>

        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

          <p className="text-gray-500 text-sm">
            Evaluaciones
          </p>

          <h2 className="text-5xl font-bold text-[#5B6CFF] mt-4">
            {evaluationsCount}
          </h2>

        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

          <p className="text-gray-500 text-sm">
            Promedio general
          </p>

          <h2 className="text-5xl font-bold text-[#1E293B] mt-4">
            {generalAverage}
          </h2>

        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

          <p className="text-gray-500 text-sm">
            Estado sistema
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-4">
            Operativo
          </h2>

        </div>

      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Fake chart bonito */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

          <div className="flex items-center justify-between mb-8">

            <div>

              <h2 className="text-2xl font-bold text-[#1E293B]">
                Actividad plataforma
              </h2>

              <p className="text-gray-500 mt-1">
                Datos académicos actuales
              </p>

            </div>

          </div>

          <div className="flex items-end gap-4 h-64">

            <div className="flex-1 bg-[#DDE3FF] rounded-t-3xl h-20"></div>

            <div className="flex-1 bg-[#C7D2FE] rounded-t-3xl h-40"></div>

            <div className="flex-1 bg-[#A5B4FC] rounded-t-3xl h-28"></div>

            <div className="flex-1 bg-[#818CF8] rounded-t-3xl h-52"></div>

            <div className="flex-1 bg-[#6366F1] rounded-t-3xl h-44"></div>

            <div className="flex-1 bg-[#4F46E5] rounded-t-3xl h-60"></div>

          </div>

        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

          <h2 className="text-2xl font-bold text-[#1E293B] mb-6">
            Accesos rápidos
          </h2>

          <div className="space-y-4">

            <Link
              href="/students"
              className="block bg-[#EEF0FF] hover:bg-[#E0E7FF] transition rounded-2xl p-5"
            >

              <h3 className="font-semibold text-[#5B6CFF] text-lg">
                Gestión de alumnos
              </h3>

              <p className="text-gray-500 mt-1 text-sm">
                Ver y administrar internos clínicos
              </p>

            </Link>

            <div className="bg-[#F0FDF4] rounded-2xl p-5">

              <h3 className="font-semibold text-green-700 text-lg">
                Firebase activo
              </h3>

              <p className="text-green-600 mt-1 text-sm">
                Base de datos operativa
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}