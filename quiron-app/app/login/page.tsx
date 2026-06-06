"use client";

import { useEffect, useState } from "react";

import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect,
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
  const [redirectLoading, setRedirectLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  function googleProvider() {
    const provider =
      new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    return provider;
  }

  function authErrorMessage(error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (code === "auth/unauthorized-domain") {
      return "Este dominio no está autorizado en Firebase Authentication. Agrega quiron-sigma.vercel.app en Authentication > Settings > Authorized domains.";
    }

    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request"
    ) {
      return "El navegador bloqueó la ventana de Google. Prueba con ingreso por redirección.";
    }

    if (code === "auth/popup-closed-by-user") {
      return "Se cerró la ventana de Google antes de completar el ingreso.";
    }

    return code
      ? `No se pudo iniciar sesión con Google (${code}).`
      : "No se pudo iniciar sesión con Google.";
  }

  useEffect(() => {
    async function completeRedirectLogin() {
      try {
        setRedirectLoading(true);

        const result = await getRedirectResult(auth);

        if (result?.user) {
          router.replace("/");
        }
      } catch (redirectError) {
        console.error(redirectError);
        setError(authErrorMessage(redirectError));
      } finally {
        setRedirectLoading(false);
      }
    }

    void completeRedirectLogin();
  }, [router]);

  async function handleGoogleLogin() {

    try {

      setGoogleLoading(true);
      setError("");

      await signInWithPopup(
        auth,
        googleProvider()
      );

      router.replace("/");

    }

    catch (loginError) {
      console.error(loginError);
      setError(authErrorMessage(loginError));

    }

    finally {

      setGoogleLoading(false);

    }

  }

  async function handleGoogleRedirectLogin() {
    try {
      setRedirectLoading(true);
      setError("");

      await signInWithRedirect(
        auth,
        googleProvider()
      );
    } catch (redirectError) {
      console.error(redirectError);
      setError(authErrorMessage(redirectError));
      setRedirectLoading(false);
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

          <button
            type="button"
            onClick={handleGoogleRedirectLogin}
            disabled={googleLoading || redirectLoading}
            className="w-full rounded-2xl border border-gray-200 bg-white py-4 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {redirectLoading
              ? "Verificando ingreso..."
              : "Ingresar con redirección"}
          </button>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          <p className="text-center text-sm leading-6 text-gray-400">
            Si no puedes ingresar, pide a administración que agregue tu correo
            en Configuración.
          </p>

        </div>

      </div>

    </main>
  );
}
