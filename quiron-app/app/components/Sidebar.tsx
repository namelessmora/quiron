"use client";

import Link from "next/link";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  signOut,
} from "firebase/auth";

import {
  auth,
} from "../lib/firebase";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { userRoleLabel } from "../lib/userRoles";

export default function Sidebar() {

  const pathname =
    usePathname();
  const searchParams =
    useSearchParams();

  const router =
    useRouter();
  const { role, permissions } =
    useCurrentUserPermissions();

  async function handleLogout() {

    await signOut(auth);

    router.push("/login");

  }

  const links = [

    {
      label: "Dashboard",
      href: "/",
      visible: permissions.canViewAllStudents,
    },

    {
      label: "Alumnos activos",
      href: "/students",
      visible: true,
    },

    {
      label: "Calendario",
      href: "/calendar",
      visible: true,
    },

    {
      label: "Alumnos finalizados",
      href: "/students?view=finished",
      visible: permissions.canViewAllStudents,
    },

    {
      label: "Avisos",
      href: "/alerts",
      visible: true,
    },

    {
      label: "Demo hospital",
      href: "/demo",
      visible: permissions.canViewAllStudents,
    },

  ].filter((link) => link.visible);

  if (pathname === "/login") {
    return null;
  }

  return (
    <aside className="w-[260px] min-h-screen bg-white border-r border-gray-100 px-6 py-8 flex flex-col justify-between">

      <div>

        {/* LOGO */}
        <div className="mb-10">

          <h1 className="text-3xl font-bold text-[#4f6ef7]">
            Quirón
          </h1>

          <p className="text-gray-400 text-sm mt-1">
            Plataforma clínica
          </p>

        </div>

        {/* NAV */}
        <nav className="space-y-2">

          {links.map((link) => {

            const active =
              link.href.includes("?")
                ? pathname === "/students" &&
                  searchParams.get("view") === "finished"
                : pathname === link.href &&
                  searchParams.get("view") !== "finished";

            return (

              <Link
                key={link.href}
                href={link.href}
                className={`block px-5 py-4 rounded-2xl transition font-medium

                  ${
                    active

                      ? "bg-[#eef2ff] text-[#4f6ef7]"

                      : "text-gray-600 hover:bg-gray-50"
                  }
                `}
              >

                {link.label}

              </Link>

            );

          })}

        </nav>

      </div>

      {/* USER */}
      <div className="border-t border-gray-100 pt-6">

        <div className="mb-4">

          <p className="font-semibold text-gray-800">
            Sesión iniciada
          </p>

          <p className="text-sm text-gray-400">
            {userRoleLabel(role)}
          </p>

        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-500 rounded-2xl py-3 font-medium hover:bg-red-100 transition"
        >
          Cerrar sesión
        </button>

      </div>

    </aside>
  );
}
