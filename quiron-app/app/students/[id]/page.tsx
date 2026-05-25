"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Props = {
  params: {
    id: string;
  };
};

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
};

export default function StudentDetail({ params }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStudent() {
    try {
      const docRef = doc(db, "students", params.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setStudent({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Student, "id">),
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudent();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        Cargando alumno...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10">
        Alumno no encontrado
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="text-5xl font-bold mb-8">
        {student.name}
      </h1>

      <div className="bg-white rounded-3xl p-8 border max-w-3xl">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500 mb-1">
              Universidad
            </p>

            <p className="font-semibold text-xl">
              {student.university || "-"}
            </p>
          </div>

          <div>
            <p className="text-gray-500 mb-1">
              Carrera
            </p>

            <p className="font-semibold text-xl">
              {student.career || "Sin definir"}
            </p>
          </div>

          <div>
            <p className="text-gray-500 mb-1">
              Área
            </p>

            <p className="font-semibold text-xl">
              {student.area || "General"}
            </p>
          </div>
        </div>

        <button className="mt-10 bg-black text-white px-6 py-3 rounded-2xl">
          + Nueva evaluación
        </button>
      </div>
    </div>
  );
}