"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-10">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          Bienvenida a Quirón ✨
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm mb-3">
            Total alumnos
          </p>

          <h2 className="text-5xl font-bold text-gray-900">
            12
          </h2>

          <p className="text-green-500 mt-3 text-sm">
            +2 este mes
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm mb-3">
            Evaluaciones
          </p>

          <h2 className="text-5xl font-bold text-gray-900">
            84
          </h2>

          <p className="text-blue-500 mt-3 text-sm">
            Actualizadas hoy
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm mb-3">
            Estado sistema
          </p>

          <h2 className="text-3xl font-bold text-green-600">
            Operativo
          </h2>

          <p className="text-gray-500 mt-3 text-sm">
            Firebase conectado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/students"
          className="bg-black text-white rounded-3xl p-8 hover:scale-[1.02] transition"
        >
          <h2 className="text-3xl font-bold mb-3">
            Gestión de alumnos
          </h2>

          <p className="text-gray-300">
            Ver, agregar y evaluar internos clínicos.
          </p>
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">
            Plataforma clínica
          </h2>

          <p className="text-gray-500">
            Sistema académico operativo y sincronizado.
          </p>

          <div className="mt-6 flex gap-3">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              Firebase activo
            </div>

            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              Online
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}