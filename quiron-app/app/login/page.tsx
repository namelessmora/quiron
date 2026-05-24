"use client";

import { useState } from "react";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  useRouter,
} from "next/navigation";

import { auth } from "../lib/firebase";

export default function LoginPage() {

  const router =
    useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleLogin() {

    try {

      setLoading(true);

      await signInWithEmailAndPassword(

        auth,

        email,

        password

      );

      router.push("/");

    }

    catch {

      alert(
        "Credenciales inválidas 😭"
      );

    }

    finally {

      setLoading(false);

    }

  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f7ff] p-6">

      <div className="bg-white w-full max-w-md rounded-3xl shadow-sm border border-gray-100 p-10">

        <div className="mb-8 text-center">

          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Quirón
          </h1>

          <p className="text-gray-400">
            Plataforma clínica docente
          </p>

        </div>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4f6ef7]"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4f6ef7]"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#4f6ef7] text-white rounded-2xl py-4 font-medium hover:opacity-90 transition"
          >

            {loading
              ? "Ingresando..."
              : "Iniciar sesión"}

          </button>

        </div>

      </div>

    </main>
  );
}