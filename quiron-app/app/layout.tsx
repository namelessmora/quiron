import "./globals.css";

import Sidebar from "./components/Sidebar";
import AuthGuard from "./components/AuthGuard";

export const metadata = {
  title: "Quirón",
  description: "Gestión clínica de internos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="es">

      <body className="bg-[#f8f7ff] text-gray-800">

        <AuthGuard>

          <main className="flex min-h-screen">

            <Sidebar />

            <section className="flex-1">

              {children}

            </section>

          </main>

        </AuthGuard>

      </body>

    </html>
  );
}