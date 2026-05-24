"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import { rubrics } from "../../data/rubrics";

import EvaluationCard from "../../components/EvaluationCard";
import EvaluationModal from "../../components/EvaluationModal";
import PDFButton from "../../components/PDFButton";

type Student = {
  id?: string;
  name: string;
  university: string;
  career: string;
  areas: string[];
  tutor: string;
  shift: string;
  status: string;
};

type Evaluation = {
  id?: string;
  area: string;
  evaluator: string;
  grade: number;
  comments: string;
  date: string;
};

export default function StudentDetailPage() {

  const params = useParams();

  const [student, setStudent] =
    useState<Student | null>(null);

  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [showModal, setShowModal] =
    useState(false);

  const [editingEvaluation, setEditingEvaluation] =
    useState<Evaluation | null>(null);

  const [editingMode, setEditingMode] =
    useState(false);

  const [area, setArea] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [comments, setComments] = useState("");

  const [manualGrade, setManualGrade] =
    useState("");

  const [responses, setResponses] = useState<
    {
      criterion: string;
      score: number;
    }[]
  >([]);

  const average =
    evaluations.length > 0
      ? (
          evaluations.reduce(
            (acc, evaluation) =>
              acc + Number(evaluation.grade),
            0
          ) / evaluations.length
        ).toFixed(1)
      : "-";

  const rubricGrade =
    responses.length > 0
      ? (
          responses.reduce(
            (acc, response) =>
              acc + response.score,
            0
          ) / responses.length
        ).toFixed(1)
      : "0";

  const selectedRubric = rubrics.find(
    (rubric) =>
      rubric.university === student?.university &&
      student?.areas?.includes(rubric.area)
  );

  const hasCriticalFail =
    selectedRubric?.criticalCriteria.some(
      (criticalCriterion) => {

        const response = responses.find(
          (response) =>
            response.criterion === criticalCriterion
        );

        return response?.score === 1;

      }
    );

  function selectOption(
    criterion: string,
    score: number
  ) {

    const filteredResponses =
      responses.filter(
        (response) =>
          response.criterion !== criterion
      );

    setResponses([
      ...filteredResponses,
      {
        criterion,
        score,
      },
    ]);

  }

  function handleEditEvaluation(
    evaluation: Evaluation
  ) {

    setEditingEvaluation(
      evaluation
    );

    setEditingMode(true);

    setArea(evaluation.area);

    setEvaluator(
      evaluation.evaluator
    );

    setComments(
      evaluation.comments
    );

    setManualGrade(
      evaluation.grade.toString()
    );

    setShowModal(true);

  }

  async function loadStudent() {

    const id = params.id as string;

    const docRef = doc(
      db,
      "students",
      id
    );

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {

      setStudent({
        id: docSnap.id,
        ...(docSnap.data() as Student),
      });

    }

  }

  async function loadEvaluations() {

    const id = params.id as string;

    const querySnapshot = await getDocs(
      collection(
        db,
        "students",
        id,
        "evaluations"
      )
    );

    const evaluationsData: Evaluation[] = [];

    querySnapshot.forEach((doc) => {

      evaluationsData.push({
        id: doc.id,
        ...(doc.data() as Evaluation),
      });

    });

    setEvaluations(evaluationsData);

  }

  useEffect(() => {

    loadStudent();

    loadEvaluations();

  }, []);

  async function addEvaluation() {

    const id = params.id as string;

    if (
      !area ||
      !evaluator
    ) {
      alert("Completa los campos 😭");
      return;
    }

    const evaluationData = {

      area,

      evaluator,

      grade: selectedRubric
        ? hasCriticalFail
          ? 1.0
          : Number(rubricGrade)
        : Number(manualGrade),

      comments,

      responses,

      criticalFail:
        hasCriticalFail || false,

      date:
        new Date().toLocaleDateString(),

    };

    if (
      editingMode &&
      editingEvaluation?.id
    ) {

      await updateDoc(

        doc(
          db,
          "students",
          id,
          "evaluations",
          editingEvaluation.id
        ),

        evaluationData

      );

      alert(
        "Evaluación actualizada 😌"
      );

    }

    else {

      await addDoc(

        collection(
          db,
          "students",
          id,
          "evaluations"
        ),

        evaluationData

      );

      alert(
        "Evaluación agregada 😌"
      );

    }

    setArea("");

    setEvaluator("");

    setComments("");

    setResponses([]);

    setManualGrade("");

    setEditingMode(false);

    setEditingEvaluation(null);

    setShowModal(false);

    loadEvaluations();

  }

  async function deleteEvaluation(
    evaluationId: string
  ) {

    const id = params.id as string;

    const confirmDelete =
      confirm(
        "¿Eliminar evaluación?"
      );

    if (!confirmDelete) return;

    await deleteDoc(
      doc(
        db,
        "students",
        id,
        "evaluations",
        evaluationId
      )
    );

    loadEvaluations();

  }

  if (!student) {

    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando alumno...</p>
      </main>
    );

  }

  return (
    <main className="p-10">

      <div
        id="student-report"
        className="space-y-8"
      >

        <div className="flex items-start justify-between">

          <div>

            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {student.name}
            </h1>

            <p className="text-gray-500">
              Perfil del alumno
            </p>

          </div>

          <div className="flex gap-3">

            <PDFButton
              targetId="student-report"
            />

            <button
              onClick={() => {

                setEditingMode(false);

                setEditingEvaluation(null);

                setArea("");

                setEvaluator("");

                setComments("");

                setManualGrade("");

                setResponses([]);

                setShowModal(true);

              }}
              className="bg-[#4f6ef7] text-white px-6 py-3 rounded-2xl font-medium hover:opacity-90 transition"
            >
              Nueva evaluación
            </button>

          </div>

        </div>

        {/* PROMEDIO */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">

          <div>

            <p className="text-gray-400 text-sm mb-1">
              Promedio general
            </p>

            <p className="text-4xl font-bold text-[#4f6ef7]">
              {average}
            </p>

          </div>

          <div className="text-right">

            <p className="text-gray-400 text-sm mb-1">
              Evaluaciones
            </p>

            <p className="text-2xl font-semibold text-gray-800">
              {evaluations.length}
            </p>

          </div>

        </div>

        {/* DATOS */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

          <div className="grid grid-cols-2 gap-6">

            <div>

              <p className="text-gray-400 text-sm mb-1">
                Universidad
              </p>

              <p className="text-gray-800 font-medium">
                {student.university}
              </p>

            </div>

            <div>

              <p className="text-gray-400 text-sm mb-1">
                Carrera
              </p>

              <p className="text-gray-800 font-medium">
                {student.career}
              </p>

            </div>

            <div>

              <p className="text-gray-400 text-sm mb-1">
                Tutor clínico
              </p>

              <p className="text-gray-800 font-medium">
                {student.tutor || "-"}
              </p>

            </div>

            <div>

              <p className="text-gray-400 text-sm mb-1">
                Jornada
              </p>

              <p className="text-gray-800 font-medium">
                {student.shift || "-"}
              </p>

            </div>

          </div>

        </div>

        {/* EVALUACIONES */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Evaluaciones
          </h2>

          <div className="space-y-4">

            {evaluations.map((evaluation) => (

              <EvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
                onDelete={deleteEvaluation}
                onEdit={handleEditEvaluation}
              />

            ))}

          </div>

        </div>

      </div>

      <EvaluationModal
        showModal={showModal}
        setShowModal={setShowModal}
        student={student}
        area={area}
        setArea={setArea}
        evaluator={evaluator}
        setEvaluator={setEvaluator}
        comments={comments}
        setComments={setComments}
        manualGrade={manualGrade}
        setManualGrade={setManualGrade}
        selectedRubric={selectedRubric}
        responses={responses}
        selectOption={selectOption}
        hasCriticalFail={hasCriticalFail}
        rubricGrade={rubricGrade}
        addEvaluation={addEvaluation}
      />

    </main>
  );
}