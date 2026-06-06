"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  auth,
  db,
} from "../lib/firebase";
import { normalizeEmail } from "../lib/userRoles";

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

        async (user) => {

          if (
            pathname === "/login"
          ) {
            if (user) {
              const email = normalizeEmail(user.email);
              const accessDoc = email
                ? await getDoc(doc(db, "userAccess", email))
                : null;

              router.replace(accessDoc?.exists() ? "/" : "/no-access");
            }

            setLoading(false);

            return;

          }

          if (!user) {

            router.push(
              "/login"
            );

          }

          else {
            if (pathname === "/no-access") {
              setLoading(false);
              return;
            }

            const email = normalizeEmail(user.email);
            const accessDoc = email
              ? await getDoc(doc(db, "userAccess", email))
              : null;

            if (!accessDoc?.exists()) {
              router.replace("/no-access");
              setLoading(false);
              return;
            }

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
