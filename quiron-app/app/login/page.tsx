"use client";

import { useState } from "react";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
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

  const [googleLoading, setGoogleLoading] =
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

  async function handleGoogleLogin() {

    try {

      setGoogleLoading(true);

      const provider =
        new GoogleAuthProvider();

      await signInWithPopup(
        auth,
        provider
      );

      router.push("/");

    }

    catch {

      alert(
        "No se pudo iniciar sesión con Google."
      );

    }

    finally {

      setGoogleLoading(false);

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
            disabled={loading || googleLoading}
            className="w-full bg-[#4f6ef7] text-white rounded-2xl py-4 font-medium hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loading
              ? "Ingresando..."
              : "Iniciar sesión"}

          </button>

          <div className="flex items-center gap-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
            <span className="h-px flex-1 bg-gray-100" />
            o
            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-4 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-gray-200 text-sm font-bold text-[#4f6ef7]">
              G
            </span>

            {googleLoading
              ? "Conectando..."
              : "Continuar con Google"}

          </button>

        </div>

      </div>

    </main>
  );
}
