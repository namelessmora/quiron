"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-10">
      <h1 className="text-5xl font-bold mb-4">
        Dashboard
      </h1>

      <p className="text-gray-500 mb-10">
        Bienvenida a Quirón ✨
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-gray-500 text-sm mb-2">
            Total alumnos
          </h2>

          <p className="text-4xl font-bold">
            24
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-gray-500 text-sm mb-2">
            En observación
          </h2>

          <p className="text-4xl font-bold text-yellow-500">
            3
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-gray-500 text-sm mb-2">
            Sin evaluaciones
          </h2>

          <p className="text-4xl font-bold text-red-500">
            5
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/students"
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          Ir a alumnos
        </Link>
      </div>
    </div>
  );
}