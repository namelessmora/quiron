"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import { db } from "./lib/firebase";

import DashboardCard from "./components/DashboardCard";

type Student = {
  id?: string;
  name: string;
  university: string;
  average?: number;
};

type Activity = {
  studentId: string;
  studentName: string;
  area: string;
  grade: number;
  date: string;
};

export default function Home() {

  const [students, setStudents] =
    useState<Student[]>([]);

  const [criticalStudents, setCriticalStudents] =
    useState<Student[]>([]);

  const [recentActivity, setRecentActivity] =
    useState<Activity[]>([]);

  const [averageGrade, setAverageGrade] =
    useState("-");

  const [evaluationsCount, setEvaluationsCount] =
    useState(0);

  const [chartData, setChartData] =
    useState<any[]>([]);

  useEffect(() => {

    loadDashboard();

  }, []);

  async function loadDashboard() {

    const studentsSnapshot =
      await getDocs(
        collection(db, "students")
      );

    const studentsData: Student[] = [];

    const activityData: Activity[] = [];

    let allGrades: number[] = [];

    let approved = 0;
    let observation = 0;
    let critical = 0;
    let noEvaluations = 0;

    for (const studentDoc of studentsSnapshot.docs) {

      const student =
        studentDoc.data();

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

          allGrades.push(
            Number(data.grade)
          );

          activityData.push({
            studentId:
              studentDoc.id,

            studentName:
              student.name,

            area:
              data.area,

            grade:
              Number(data.grade),

            date:
              data.date,
          });

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

      // ESTADOS
      if (!average) {

        noEvaluations++;

      } else if (average < 4) {

        critical++;

      } else if (average < 5) {

        observation++;

      } else {

        approved++;

      }

      studentsData.push({
        id: studentDoc.id,
        name: student.name,
        university:
          student.university,
        average,
      });

    }

    // CHART
    setChartData([
      {
        name: "Aprobados",
        value: approved,
        color: "#86efac",
      },
      {
        name: "Observación",
        value: observation,
        color: "#fde68a",
      },
      {
        name: "Críticos",
        value: critical,
        color: "#fca5a5",
      },
      {
        name: "Sin evaluación",
        value: noEvaluations,
        color: "#d1d5db",
      },
    ]);

    const criticalStudentsList =
      studentsData.filter(
        (student) =>
          student.average &&
          student.average < 4
      );

    setCriticalStudents(
      criticalStudentsList
    );

    setStudents(studentsData);

    setRecentActivity(
      activityData.reverse().slice(0, 5)
    );

    if (allGrades.length > 0) {

      const globalAverage =
        (
          allGrades.reduce(
            (
              acc,
              grade
            ) => acc + grade,
            0
          ) / allGrades.length
        ).toFixed(1);

      setAverageGrade(
        globalAverage
      );

    }

    setEvaluationsCount(
      allGrades.length
    );

  }

  return (
    <main className="p-10">

      <div className="mb-10">

        <h1 className="text-5xl font-bold text-gray-800 mb-3">
          Dashboard clínico
        </h1>

        <p className="text-gray-500 text-lg">
          Supervisión docente de internos
        </p>

      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-6 mb-10">

        <DashboardCard
          title="Internos"
          value={students.length.toString()}
        />

        <DashboardCard
          title="Evaluaciones"
          value={evaluationsCount.toString()}
        />

        <DashboardCard
          title="Promedio global"
          value={averageGrade}
        />

      </div>

      {/* CHART */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 mb-10">

        <div className="mb-6">

          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Estado de internos
          </h2>

          <p className="text-gray-400">
            Distribución clínica general
          </p>

        </div>

        <div className="grid grid-cols-2 gap-10 items-center">

          <div className="h-[300px] w-full min-w-[300px]">

            <ResponsiveContainer
              width="99%"
              height={300}
            >

              <PieChart>

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >

                  {chartData.map(
                    (
                      entry,
                      index
                    ) => (

                      <Cell
                        key={index}
                        fill={entry.color}
                      />

                    )
                  )}

                </Pie>

              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="space-y-4">

            {chartData.map(
              (item, index) => (

                <div
                  key={index}
                  className="flex items-center justify-between border border-gray-100 rounded-2xl px-5 py-4 bg-[#fcfcff]"
                >

                  <div className="flex items-center gap-3">

                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <p className="font-medium text-gray-700">
                      {item.name}
                    </p>

                  </div>

                  <p className="text-2xl font-bold text-gray-800">
                    {item.value}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* ALERTAS */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Alertas clínicas
              </h2>

              <p className="text-gray-400">
                Internos con promedio crítico
              </p>

            </div>

            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold">

              {criticalStudents.length} críticos

            </div>

          </div>

          <div className="space-y-4">

            {criticalStudents.length > 0 ? (

              criticalStudents.map((student) => (

                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between border border-red-100 bg-red-50 rounded-2xl p-5 hover:opacity-80 transition"
                >

                  <div>

                    <p className="font-semibold text-gray-800">
                      {student.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {student.university}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-sm text-red-500 mb-1">
                      Promedio crítico
                    </p>

                    <p className="text-2xl font-bold text-red-600">
                      {student.average}
                    </p>

                  </div>

                </Link>

              ))

            ) : (

              <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center">

                <p className="text-gray-400">
                  No hay internos críticos 😌
                </p>

              </div>

            )}

          </div>

        </div>

        {/* ACTIVIDAD */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">

          <div className="mb-6">

            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Actividad reciente
            </h2>

            <p className="text-gray-400">
              Últimas evaluaciones registradas
            </p>

          </div>

          <div className="space-y-4">

            {recentActivity.length > 0 ? (

              recentActivity.map(
                (
                  activity,
                  index
                ) => (

                  <Link
                    key={index}
                    href={`/students/${activity.studentId}`}
                    className="block border border-gray-100 rounded-2xl p-5 hover:border-[#4f6ef7]/30 hover:shadow-sm transition"
                  >

                    <div className="flex items-center justify-between mb-2">

                      <p className="font-semibold text-gray-800">
                        {activity.studentName}
                      </p>

                      <p className={`text-xl font-bold

                        ${
                          activity.grade < 4
                            ? "text-red-500"
                            : "text-[#4f6ef7]"
                        }
                      `}>
                        {activity.grade}
                      </p>

                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400">

                      <p>
                        {activity.area}
                      </p>

                      <p>
                        {activity.date}
                      </p>

                    </div>

                  </Link>

                )
              )

            ) : (

              <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center">

                <p className="text-gray-400">
                  No hay actividad reciente
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  );
}