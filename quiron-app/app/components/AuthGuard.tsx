"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  auth,
} from "../lib/firebase";

type Props = {
  children: React.ReactNode;
};

export default function AuthGuard({
  children,
}: Props) {

  const router =
    useRouter();

  const pathname =
    usePathname();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(

        auth,

        (user) => {

          if (
            pathname === "/login"
          ) {

            setLoading(false);

            return;

          }

          if (!user) {

            router.push(
              "/login"
            );

          }

          else {

            setLoading(false);

          }

        }

      );

    return () =>
      unsubscribe();

  }, [pathname, router]);

  if (loading) {

    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8f7ff]">

        <div className="text-center">

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Quirón
          </h1>

          <p className="text-gray-400">
            Verificando sesión...
          </p>

        </div>

      </main>
    );

  }

  return children;

}
