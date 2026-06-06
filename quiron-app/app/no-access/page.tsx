"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "../lib/firebase";

export default function NoAccessPage() {
  const router = useRouter();
  const email = auth.currentUser?.email || "tu cuenta Google";

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff] p-6">
      <section className="w-full max-w-lg rounded-3xl border border-amber-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Acceso pendiente
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Tu cuenta no tiene acceso a Quirón
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Iniciaste sesión con {email}, pero ese correo no está registrado en
          Configuración &gt; Accesos. Pide a administración que lo agregue como
          administrador, docente o alumno.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Usar otra cuenta
        </button>
      </section>
    </main>
  );
}
