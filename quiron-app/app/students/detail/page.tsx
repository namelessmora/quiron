"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import { useSearchParams } from "next/navigation";

import { db } from "../../lib/firebase";

type Student = {
  id: string;
  name: string;
  university: string;
  career?: string;
  area?: string;
};

type Evaluation = {
  id: string;
  title: string;
  score: number;
};

export default function StudentDetail() {
  const searchParams = useSearchParams();

  const id = searchParams.get("id");

  const [student, setStudent] =
    useState<Student | null>(null);

  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadStudent = useCallback(async () => {
    if (!id) return;

    try {
      const docRef = doc(
        db,
        "students",
        id
      );

      const docSnap =
        await getDoc(docRef);

      if (docSnap.exists()) {

        setStudent({
          id: docSnap.id,
          ...(docSnap.data() as Omit<
            Student,
            "id"
          >),
        });

      }

      const evaluationsSnapshot =
        await getDocs(
          collection(
            db,
            "students",
            id,
            "evaluations"
          )
        );

      const evals =
        evaluationsSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<
              Evaluation,
              "id"
            >),
          })
        );

      setEvaluations(evals);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }
  }, [id]);

  async function addEvaluation() {

    if (!id) return;

    const title =
      prompt("Nombre evaluación");

    const score =
      prompt("Nota");

    if (!title || !score) return;

    try {

      await addDoc(
        collection(
          db,
          "students",
          id,
          "evaluations"
        ),

        {
          title,
          score:
            Number(score),
        }
      );

      loadStudent();

    } catch (error) {

      console.error(error);

    }

  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudent();
    });
  }, [loadStudent]);

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

      <div className="bg-white rounded-3xl p-8 border max-w-4xl">

        <div className="grid grid-cols-2 gap-6 mb-10">

          <div>
            <p className="text-gray-500 mb-1">
              Universidad
            </p>

            <p className="font-semibold text-xl">
              {student.university}
            </p>
          </div>

          <div>
            <p className="text-gray-500 mb-1">
              Carrera
            </p>

            <p className="font-semibold text-xl">
              {student.career ||
                "Sin definir"}
            </p>
          </div>

        </div>

        <div className="flex items-center justify-between mb-6">

          <h2 className="text-2xl font-bold">
            Evaluaciones
          </h2>

          <button
            onClick={addEvaluation}
            className="bg-black text-white px-5 py-3 rounded-2xl"
          >
            + Nueva evaluación
          </button>

        </div>

        <div className="space-y-4">

          {evaluations.length === 0 ? (

            <div className="text-gray-500">
              Sin evaluaciones
            </div>

          ) : (

            evaluations.map(
              (evaluation) => (

                <div
                  key={evaluation.id}
                  className="border rounded-2xl p-5 flex items-center justify-between"
                >

                  <div>
                    <p className="font-semibold">
                      {evaluation.title}
                    </p>
                  </div>

                  <div className="text-2xl font-bold">
                    {evaluation.score}
                  </div>

                </div>

              )
            )

          )}

        </div>

      </div>

    </div>
  );
}
