"use client";

import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../../lib/firebase";

import { useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
  tutor?: string;
  average?: string;
};

type Evaluation = {
  id: string;
  title: string;
  score: string;
  description?: string;
  createdBy?: string;
  createdAt?: any;
};

export default function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {

    async function loadStudent() {

      try {

        const resolvedParams =
          await params;

        const docRef = doc(
          db,
          "students",
          resolvedParams.id
        );

        const docSnap =
          await getDoc(docRef);

        if (docSnap.exists()) {

          const studentData = {
            id: docSnap.id,
            ...(docSnap.data() as Omit<Student, "id">),
          };

          setStudent(studentData);

          const evaluationsSnapshot =
            await getDocs(
              collection(
                db,
                "students",
                resolvedParams.id,
                "evaluations"
              )
            );

          const evaluationsData =
            evaluationsSnapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            ) as Evaluation[];

          setEvaluations(evaluationsData);
        }

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    }

    loadStudent();

  }, [params]);

  async function handleSave() {

    if (!student) return;

    try {

      setSaving(true);

      const docRef = doc(
        db,
        "students",
        student.id
      );

      await updateDoc(docRef, {
        name: student.name,
        university: student.university,
        career: student.career || "",
        area: student.area || "",
        tutor: student.tutor || "",
      });

      alert("Alumno actualizado ✨");

    } catch (error) {

      console.error(error);

      alert("Error al guardar");

    } finally {

      setSaving(false);
    }
  }

  async function handleDelete() {

    if (!student) return;

    const confirmDelete = confirm(
      "¿Eliminar alumno?"
    );

    if (!confirmDelete) return;

    try {

      await deleteDoc(
        doc(db, "students", student.id)
      );

      router.push("/students");

    } catch (error) {

      console.error(error);

      alert("Error al eliminar");
    }
  }

  async function handleNewEvaluation() {

    if (!student) return;

    const title =
      prompt("Nombre evaluación");

    if (!title) return;

    const score =
      prompt("Nota");

    if (!score) return;

    const description =
      prompt("Comentario evaluación");

    try {

      await addDoc(

        collection(
          db,
          "students",
          student.id,
          "evaluations"
        ),

        {
          title,
          score,
          description: description || "",
          createdBy:
            auth.currentUser?.email ||
            "Desconocido",
          createdAt:
            serverTimestamp(),
        }

      );

      const currentEvaluations =
        [...evaluations];

      currentEvaluations.push({
        id: crypto.randomUUID(),
        title,
        score,
      });

      const numericScores =
        currentEvaluations.map((e) =>
          Number(e.score)
        );

      const average =
        numericScores.reduce(
          (a, b) => a + b,
          0
        ) / numericScores.length;

      await updateDoc(
        doc(db, "students", student.id),
        {
          average:
            average.toFixed(1),
        }
      );

      const evaluationsSnapshot =
        await getDocs(
          collection(
            db,
            "students",
            student.id,
            "evaluations"
          )
        );

      const evaluationsData =
        evaluationsSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        ) as Evaluation[];

      setEvaluations(evaluationsData);

      setStudent({
        ...student,
        average:
          average.toFixed(1),
      });

    } catch (error) {

      console.error(error);

      alert(
        "Error al crear evaluación"
      );
    }
  }

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
    <div className="min-h-screen bg-[#F7F8FC] p-10">

      <div className="mb-10">

        <h1 className="text-5xl font-bold text-[#1E293B]">
          {student.name}
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          Perfil clínico del alumno
        </p>

      </div>

      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm max-w-5xl">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div>
            <p className="text-gray-500 mb-2">
              Nombre
            </p>

            <input
              value={student.name}
              onChange={(e) =>
                setStudent({
                  ...student,
                  name: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Universidad
            </p>

            <input
              value={student.university}
              onChange={(e) =>
                setStudent({
                  ...student,
                  university: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Carrera
            </p>

            <input
              value={student.career || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  career: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Área
            </p>

            <input
              value={student.area || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  area: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Tutor
            </p>

            <input
              value={student.tutor || ""}
              onChange={(e) =>
                setStudent({
                  ...student,
                  tutor: e.target.value,
                })
              }
              className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-4 outline-none"
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">
              Promedio
            </p>

            <div className="w-full bg-[#EEF0FF] text-[#5B6CFF] rounded-2xl px-5 py-4 font-bold text-xl">
              {student.average || "-"}
            </div>
          </div>

        </div>

        <div className="flex gap-4 mt-10 flex-wrap">

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#5B6CFF] hover:bg-[#4F46E5] transition text-white px-6 py-4 rounded-2xl font-medium"
          >
            {saving
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

          <button
            onClick={handleNewEvaluation}
            className="bg-[#EEF0FF] text-[#5B6CFF] px-6 py-4 rounded-2xl font-medium"
          >
            + Nueva evaluación
          </button>

          <button
            onClick={handleDelete}
            className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-medium"
          >
            Eliminar alumno
          </button>

        </div>

      </div>

      {/* Evaluaciones */}
      <div className="mt-10 max-w-5xl">

        <h2 className="text-3xl font-bold text-[#1E293B] mb-6">
          Evaluaciones
        </h2>

        <div className="space-y-5">

          {evaluations.length === 0 ? (

            <div className="bg-white rounded-3xl p-8 border border-gray-100 text-gray-500">
              Sin evaluaciones registradas
            </div>

          ) : (

            evaluations.map((evaluation) => (

              <div
                key={evaluation.id}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm"
              >

                <div className="flex items-start justify-between mb-4">

                  <div>

                    <h3 className="text-2xl font-bold text-[#1E293B]">
                      {evaluation.title}
                    </h3>

                    <p className="text-gray-500 mt-1 text-sm">
                      {evaluation.createdBy}
                    </p>

                    <p className="text-gray-400 text-sm mt-1">
                      {evaluation.createdAt?.seconds
                        ? new Date(
                            evaluation.createdAt.seconds * 1000
                          ).toLocaleDateString(
                            "es-CL",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : "Fecha pendiente"}
                    </p>

                  </div>

                  <div className="bg-[#EEF0FF] text-[#5B6CFF] px-5 py-3 rounded-2xl text-xl font-bold">
                    {evaluation.score}
                  </div>

                </div>

                <p className="text-gray-700 leading-relaxed">
                  {evaluation.description ||
                    "Sin comentarios"}
                </p>

              </div>

            ))

          )}

        </div>

      </div>

    </div>
  );
}