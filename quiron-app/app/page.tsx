"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "./lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  average?: number;
};

export default function DashboardPage() {
  const [studentsCount, setStudentsCount] =
    useState(0);

  const [evaluationsCount, setEvaluationsCount] =
    useState(0);

  const [average, setAverage] = useState(0);

  const [observationCount, setObservationCount] =
    useState(0);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const studentsSnapshot = await getDocs(
          collection(db, "students")
        );

        setStudentsCount(
          studentsSnapshot.docs.length
        );

        let totalEvaluations = 0;
        let averages: number[] = [];
        let observations = 0;

        for (const studentDoc of studentsSnapshot.docs) {
          const student = studentDoc.data();

          const evaluationsSnapshot =
            await getDocs(
              collection(
                db,
                "students",
                studentDoc.id,
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

          if (
            student.status === "observacion"
          ) {
            observations++;
          }
        }

        setEvaluationsCount(totalEvaluations);

        setObservationCount(observations);

        if (averages.length > 0) {
          const avg =
            averages.reduce(
              (a, b) => a + b,
              0
            ) / averages.length;

          setAverage(Number(avg.toFixed(1)));
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="p-10">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-6xl font-bold text-slate-800 mb-3">
            Dashboard
          </h1>

          <p className="text-2xl text-slate-500">
            Bienvenida a Quirón ✨
          </p>
        </div>

        <div className="bg-white border rounded-3xl px-6 py-5 shadow-sm">
          <p className="text-slate-500 text-lg">
            Sistema operativo
          </p>

          <p className="text-emerald-600 font-bold text-2xl">
            Firebase conectado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-7 shadow-sm border">
          <p className="text-slate-500 text-xl mb-4">
            Total alumnos
          </p>

          <h2 className="text-6xl font-bold text-slate-800">
            {studentsCount}
          </h2>

          <p className="text-emerald-500 mt-4 text-xl">
            +2 este mes
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-sm border">
          <p className="text-slate-500 text-xl mb-4">
            Evaluaciones
          </p>

          <h2 className="text-6xl font-bold text-indigo-500">
            {evaluationsCount}
          </h2>

          <p className="text-indigo-500 mt-4 text-xl">
            Actualizadas hoy
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-sm border">
          <p className="text-slate-500 text-xl mb-4">
            Observación
          </p>

          <h2 className="text-6xl font-bold text-amber-500">
            {observationCount}
          </h2>

          <p className="text-amber-500 mt-4 text-xl">
            Requieren revisión
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-sm border">
          <p className="text-slate-500 text-xl mb-4">
            Promedio general
          </p>

          <h2 className="text-6xl font-bold text-slate-800">
            {average || "-"}
          </h2>

          <p className="text-slate-400 mt-4 text-xl">
            Rendimiento actual
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-3xl p-8 border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-4xl font-bold text-slate-800">
                Rendimiento mensual
              </h2>

              <p className="text-slate-500 text-xl mt-2">
                Evaluaciones registradas
              </p>
            </div>

            <div className="bg-indigo-100 text-indigo-500 px-5 py-3 rounded-2xl font-medium text-lg">
              Últimos 6 meses
            </div>
          </div>

          <div className="flex items-end gap-5 h-80 mt-10">
            <div className="bg-indigo-100 rounded-t-3xl w-20 h-24"></div>

            <div className="bg-indigo-200 rounded-t-3xl w-20 h-40"></div>

            <div className="bg-indigo-300 rounded-t-3xl w-20 h-32"></div>

            <div className="bg-indigo-400 rounded-t-3xl w-20 h-52"></div>

            <div className="bg-indigo-500 rounded-t-3xl w-20 h-44"></div>

            <div className="bg-indigo-600 rounded-t-3xl w-20 h-60"></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border shadow-sm">
            <h2 className="text-5xl font-bold text-slate-800 mb-6">
              Accesos rápidos
            </h2>

            <Link
              href="/students"
              className="block bg-indigo-50 hover:bg-indigo-100 transition rounded-3xl p-6"
            >
              <h3 className="text-3xl font-bold text-indigo-500 mb-3">
                Gestión de alumnos
              </h3>

              <p className="text-slate-500 text-xl">
                Ver y administrar internos clínicos
              </p>
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 border shadow-sm">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Plataforma
            </h2>

            <p className="text-slate-500 text-xl mb-6">
              Sistema académico operativo y sincronizado.
            </p>

            <div className="flex gap-3">
              <div className="bg-emerald-100 text-emerald-600 px-5 py-3 rounded-2xl text-lg font-medium">
                Firebase activo
              </div>

              <div className="bg-indigo-100 text-indigo-500 px-5 py-3 rounded-2xl text-lg font-medium">
                Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}