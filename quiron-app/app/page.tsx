"use client";

import Link from "next/link";

export default function DashboardPage() {
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

      {/* Cards superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">
            Total alumnos
          </p>

          <h2 className="text-5xl font-bold text-[#1E293B] mt-4">
            12
          </h2>

          <p className="text-green-500 mt-4 text-sm">
            +2 este mes
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">
            Evaluaciones
          </p>

          <h2 className="text-5xl font-bold text-[#5B6CFF] mt-4">
            84
          </h2>

          <p className="text-blue-500 mt-4 text-sm">
            Actualizadas hoy
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">
            Observación
          </p>

          <h2 className="text-5xl font-bold text-yellow-500 mt-4">
            3
          </h2>

          <p className="text-yellow-500 mt-4 text-sm">
            Requieren revisión
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">
            Promedio general
          </p>

          <h2 className="text-5xl font-bold text-[#1E293B] mt-4">
            5.8
          </h2>

          <p className="text-gray-400 mt-4 text-sm">
            Rendimiento actual
          </p>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico fake bonito */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1E293B]">
                Rendimiento mensual
              </h2>

              <p className="text-gray-500 mt-1">
                Evaluaciones registradas
              </p>
            </div>

            <div className="bg-[#EEF0FF] text-[#5B6CFF] px-4 py-2 rounded-full text-sm font-medium">
              Últimos 6 meses
            </div>
          </div>

          <div className="flex items-end gap-4 h-64">

            <div className="flex-1 bg-[#DDE3FF] rounded-t-3xl h-24"></div>

            <div className="flex-1 bg-[#C7D2FE] rounded-t-3xl h-40"></div>

            <div className="flex-1 bg-[#A5B4FC] rounded-t-3xl h-32"></div>

            <div className="flex-1 bg-[#818CF8] rounded-t-3xl h-52"></div>

            <div className="flex-1 bg-[#6366F1] rounded-t-3xl h-44"></div>

            <div className="flex-1 bg-[#4F46E5] rounded-t-3xl h-60"></div>

          </div>
        </div>

        {/* Accesos rápidos */}
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

            <div className="bg-[#F8FAFC] rounded-2xl p-5">
              <h3 className="font-semibold text-[#1E293B] text-lg">
                Plataforma clínica
              </h3>

              <p className="text-gray-500 mt-1 text-sm">
                Sistema sincronizado correctamente
              </p>
            </div>

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