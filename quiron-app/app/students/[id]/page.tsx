"use client";

import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../../lib/firebase";

type Props = {
  params: {
    id: string;
  };
};

export default function StudentDetail({
  params,
}: Props) {
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    const ref = doc(
      db,
      "students",
      params.id
    );

    const snap = await getDoc(ref);

    if (snap.exists()) {
      setStudent(snap.data());
    }
  }

  if (!student) {
    return (
      <div className="p-10">
        Cargando...
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="text-5xl font-bold mb-2">
        {student.name}
      </h1>

      <p className="text-gray-500 mb-10">
        Perfil del alumno
      </p>

      <div className="bg-white rounded-3xl p-8 shadow space-y-4">
        <div>
          <strong>
            Universidad:
          </strong>{" "}
          {student.university}
        </div>

        <div>
          <strong>
            Carrera:
          </strong>{" "}
          {student.career}
        </div>

        <div>
          <strong>
            Áreas:
          </strong>{" "}
          {student.areas?.join(", ")}
        </div>

        <button className="bg-black text-white px-6 py-3 rounded-2xl mt-6">
          + Nueva evaluación
        </button>
      </div>
    </div>
  );
}