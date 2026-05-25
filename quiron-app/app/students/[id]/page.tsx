"use client";

import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

import { db, auth } from "../../lib/firebase";

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

  const [student, setStudent] =
    useState<Student | null>(null);

  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [score, setScore] =
    useState("");

  const [description, setDescription] =
    useState("");

  useEffect(() => {
    loadStudent();
  }, []);

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
          ...(docSnap.data() as Omit<
            Student,
            "id"
          >),
        };

        setStudent(studentData);

        loadEvaluations(
          resolvedParams.id
        );
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }
  }

  async function loadEvaluations(
    studentId: string
  ) {

    const snapshot = await getDocs(
      collection(
        db,
        "students",
        studentId,
        "evaluations"
      )
    );

    const data = snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<
          Evaluation,
          "id"
        >),
      })
    );

    setEvaluations(data);
  }

  async function handleAddEvaluation() {

    if (!student) return;

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
          description,

          createdBy:
            auth.currentUser?.email ||
            "Usuario",

          createdAt:
            serverTimestamp(),
        }
      );

      setShowModal(false);

      setTitle("");
      setScore("");
      setDescription("");

      loadEvaluations(student.id);

    } catch (error) {

      console.error(error);

    }
  }

  async function handleDeleteEvaluation(
    evaluationId: string
  ) {

    if (!student) return;

    const confirmDelete = confirm(
      "¿Eliminar evaluación?"
    );

    if (!confirmDelete) return;

    try {

      await deleteDoc(
        doc(
          db,
          "students",
          student.id,
          "evaluations",
          evaluationId
        )
      );

      loadEvaluations(student.id);

    } catch (error) {

      console.error(error);

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

    <div className="p-10 max-w-5xl">

      <h1 className="text-6xl font-bold text-[#1E293B] mb-4">
        {student.name}
      </h1>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">

        <div className="grid grid-cols-2 gap-8">

          <div>

            <p className="text-gray-400 mb-1">
              Universidad
            </p>

            <p className="text-2xl font-semibold text-[#1E293B]">
              {student.university}
            </p>

          </div>

          <div>

            <p className="text-gray-400 mb-1">
              Carrera
            </p>

            <p className="text-2xl font-semibold text-[#1E293B]">
              {student.career ||
                "Sin definir"}
            </p>

          </div>

          <div>

            <p className="text-gray-400 mb-1">
              Área
            </p>

            <p className="text-2xl font-semibold text-[#1E293B]">
              {student.area ||
                "General"}
            </p>

          </div>

          <div>

            <p className="text-gray-400 mb-1">
              Tutor
            </p>

            <p className="text-2xl font-semibold text-[#1E293B]">
              {student.tutor || "-"}
            </p>

          </div>

        </div>

      </div>

      <div className="flex items-center justify-between mb-8">

        <h2 className="text-4xl font-bold text-[#1E293B]">
          Evaluaciones
        </h2>

        <button
          onClick={() =>
            setShowModal(true)
          }
          className="bg-[#5B6CFF] hover:bg-[#4C5DF5] text-white px-6 py-4 rounded-3xl transition font-semibold"
        >
          + Nueva evaluación
        </button>

      </div>

      <div className="grid gap-6">

        {evaluations.length === 0 ? (

          <div className="bg-white rounded-3xl p-8 border border-gray-100 text-gray-500">
            Sin evaluaciones registradas
          </div>

        ) : (

          evaluations.map(
            (evaluation) => (

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
                            evaluation.createdAt.seconds *
                              1000
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

                  <div className="flex items-center gap-3">

                    <div className="bg-[#EEF0FF] text-[#5B6CFF] px-5 py-3 rounded-2xl text-xl font-bold">
                      {evaluation.score}
                    </div>

                    <button
                      onClick={() =>
                        handleDeleteEvaluation(
                          evaluation.id
                        )
                      }
                      className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl hover:bg-red-100 transition"
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

                <p className="text-gray-700 leading-relaxed">
                  {evaluation.description ||
                    "Sin comentarios"}
                </p>

              </div>

            )
          )

        )}

      </div>

      {showModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-3xl p-8 w-full max-w-xl">

            <h2 className="text-3xl font-bold mb-6 text-[#1E293B]">
              Nueva evaluación
            </h2>

            <div className="grid gap-4">

              <input
                placeholder="Título"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

              <input
                placeholder="Nota"
                value={score}
                onChange={(e) =>
                  setScore(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

              <textarea
                placeholder="Descripción"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4 min-h-[140px]"
              />

            </div>

            <div className="flex items-center justify-end gap-4 mt-8">

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="px-5 py-3 rounded-2xl bg-gray-100"
              >
                Cancelar
              </button>

              <button
                onClick={
                  handleAddEvaluation
                }
                className="bg-[#5B6CFF] hover:bg-[#4C5DF5] text-white px-6 py-3 rounded-2xl transition"
              >
                Guardar
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}