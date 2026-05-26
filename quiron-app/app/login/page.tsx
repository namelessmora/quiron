"use client";

import { useState } from "react";

import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  useRouter,
} from "next/navigation";

import { auth } from "../lib/firebase";

export default function LoginPage() {

  const router =
    useRouter();

  const [googleLoading, setGoogleLoading] =
    useState(false);

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
            Ingresa con tu cuenta Google autorizada
          </p>

        </div>

        <div className="space-y-4">

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#4f6ef7] py-4 font-medium text-white transition hover:bg-[#415fe0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-bold text-[#4f6ef7]">
              G
            </span>

            {googleLoading
              ? "Conectando..."
              : "Continuar con Google"}

          </button>

          <p className="text-center text-sm leading-6 text-gray-400">
            Si no puedes ingresar, pide a administración que agregue tu correo
            en Configuración.
          </p>

        </div>

      </div>

    </main>
  );
}
