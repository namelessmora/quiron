"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

import { db, auth } from "../../lib/firebase";
import { useCurrentUserPermissions } from "../../hooks/useCurrentUserPermissions";
import { useTeacherProfiles } from "../../hooks/useTeacherProfiles";
import { writeAuditLog } from "../../lib/audit";
import {
  Rubric,
  rubrics,
} from "../../data/rubrics";
import {
  areaOptions,
  careerOptions,
  modalityOptions,
  roleOptions,
  universityOptions,
} from "../../data/studentOptions";
import { getAcademicStatus } from "../../lib/academicStatus";
import {
  AreaRotation,
  formatRotationDate,
  validStudentAreas,
  validRotations,
} from "../../lib/rotations";
import {
  canUserAccessStudent,
  canUserEvaluateStudent,
  hasAssignedTutors,
  studentTutorLabel,
} from "../../lib/tutors";

type Student = {
  id: string;
  name: string;
  email?: string;
  university: string;
  career?: string;
  area?: string;
  areas?: string[];
  role?: string;
  modality?: string;
  tutor?: string;
  tutorEmails?: string[];
  average?: string;
  observations?: string;
  rotations?: AreaRotation[];
};

type Evaluation = {
  id: string;
  title: string;
  score: string;
  description?: string;
  rubricLink?: string;
  rubricId?: string;
  rubricName?: string;
  rubricResponses?: RubricResponse[];
  createdBy?: string;
  createdAt?: Timestamp | { seconds?: number };
};

type RubricResponse = {
  criterionId: string;
  criterion: string;
  dimension: string;
  group?: string;
  label: string;
  score: number;
};

function formatEvaluationDate(
  value: Evaluation["createdAt"]
) {

  if (!value) return "Fecha pendiente";

  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString(
      "es-CL"
    );
  }

  if (
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(
      value.seconds * 1000
    ).toLocaleDateString("es-CL");
  }

  return "Fecha pendiente";
}

function fileSafeName(value: string) {

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeMatchValue(value?: string) {

  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesValue(
  source: string | undefined,
  candidates: string[]
) {

  const normalizedSource =
    normalizeMatchValue(source);

  if (!normalizedSource) return false;

  return candidates.some((candidate) => {
    const normalizedCandidate =
      normalizeMatchValue(candidate);

    if (!normalizedCandidate) return false;

    return (
      normalizedSource === normalizedCandidate ||
      normalizedSource.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedSource)
    );
  });
}

function universityCandidates(
  rubric: Rubric
) {

  const candidates = [
    rubric.university,
    ...(rubric.universityAliases || []),
  ];

  if (
    matchesValue(rubric.university, ["STO"]) ||
    matchesValue(rubric.university, ["UST"])
  ) {
    candidates.push("STO", "UST");
  }

  return candidates;
}

function studentAreas(
  student: Student
) {
  return validStudentAreas(student);
}

function findSuggestedRubric(
  student: Student
) {

  return rubrics.find((rubric) =>
    rubricMatchesStudent(rubric, student)
  );
}

function rubricMatchesStudent(
  rubric: Rubric,
  student: Student
) {
    const universityMatches =
      matchesValue(
        student.university,
        universityCandidates(rubric)
      );

    const areas = studentAreas(student);
    const areaMatches =
      normalizeMatchValue(rubric.area) ===
        "multiple" &&
      areas.length === 0
        ? true
        : areas.some((area) =>
            matchesValue(area, [
              rubric.area,
              ...rubric.areaAliases,
            ])
          );

    return universityMatches && areaMatches;
}

function rubricMatchesArea(
  rubric: Rubric,
  area: string
) {
  return matchesValue(area, [
    rubric.area,
    ...rubric.areaAliases,
  ]);
}

function evaluationTime(
  evaluation: Evaluation
) {
  const createdAt = evaluation.createdAt;

  if (!createdAt) return 0;

  if (createdAt instanceof Timestamp) {
    return createdAt.toDate().getTime();
  }

  if (
    "seconds" in createdAt &&
    typeof createdAt.seconds === "number"
  ) {
    return createdAt.seconds * 1000;
  }

  return 0;
}

function evaluationUsesRubric(
  evaluation: Evaluation,
  rubric: Rubric
) {
  return (
    evaluation.rubricId === rubric.id ||
    evaluation.rubricName === rubric.name
  );
}

function isExcludedRubricResponse(
  response: RubricResponse | undefined,
  rubric: Rubric
) {
  if (!response) return false;

  const excludedLabels = [
    "No aplica",
    ...(rubric.excludeFromGradeLabels || []),
  ].map(normalizeMatchValue);

  return excludedLabels.includes(
    normalizeMatchValue(response.label)
  );
}

function calculateRubricGrade(
  rubric: Rubric,
  responses: Record<string, RubricResponse>
) {

  const answeredCriteria =
    rubric.criteria.filter(
      (criterion) =>
        responses[criterion.id] &&
        !isExcludedRubricResponse(
          responses[criterion.id],
          rubric
        )
    );

  if (answeredCriteria.length === 0) {
    return "";
  }

  if (
    rubric.gradeStrategy ===
      "weightedAverageScore" &&
    rubric.gradeGroups
  ) {
    let weightedTotal = 0;
    let usedWeight = 0;

    rubric.gradeGroups.forEach((group) => {
      const groupCriteria =
        answeredCriteria.filter(
          (criterion) =>
            criterion.group === group.id
        );

      if (groupCriteria.length === 0) {
        return;
      }

      const groupScore =
        groupCriteria.reduce(
          (total, criterion) =>
            total +
            responses[criterion.id].score,
          0
        ) / groupCriteria.length;

      weightedTotal +=
        groupScore * group.weight;
      usedWeight += group.weight;
    });

    if (usedWeight === 0) {
      return "";
    }

    return Math.min(
      7,
      Math.max(1, weightedTotal / usedWeight)
    ).toFixed(1);
  }

  const totalScore =
    answeredCriteria.reduce(
      (total, criterion) =>
        total +
        responses[criterion.id].score,
      0
    );

  const maxScore =
    answeredCriteria.length *
    rubric.maxScore;

  const percentage =
    (totalScore / maxScore) * 100;

  const grade =
    percentage < rubric.scale
      ? 1 + (percentage / rubric.scale) * 3
      : 4 +
        ((percentage - rubric.scale) /
          (100 - rubric.scale)) *
          3;

  return Math.min(7, Math.max(1, grade)).toFixed(1);
}

export default function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const [student, setStudent] =
    useState<Student | null>(null);
  const { user, role, permissions } =
    useCurrentUserPermissions();
  const teacherProfiles = useTeacherProfiles();

  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [
    editingEvaluation,
    setEditingEvaluation,
  ] = useState<Evaluation | null>(null);

  const [title, setTitle] =
    useState("");

  const [score, setScore] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [rubricLink, setRubricLink] =
  useState("");

  const [
    selectedRubricId,
    setSelectedRubricId,
  ] = useState("");

  const [
    rubricResponses,
    setRubricResponses,
  ] = useState<
    Record<string, RubricResponse>
  >({});

  const [editScore, setEditScore] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [
    editRubricLink,
    setEditRubricLink,
  ] = useState("");

  const [editName, setEditName] =
    useState("");
  const [editEmail, setEditEmail] =
    useState("");

  const [editUniversity, setEditUniversity] =
    useState("");

  const [editCareer, setEditCareer] =
    useState("");

  const [editAreas, setEditAreas] =
    useState<string[]>([]);

  const [editRotations, setEditRotations] =
    useState<AreaRotation[]>([]);

  const [editRole, setEditRole] =
    useState("");

  const [
    editModality,
    setEditModality,
  ] = useState("");

  const [editTutor, setEditTutor] =
    useState("");

  const [editTutorEmails, setEditTutorEmails] =
    useState<string[]>([]);

  const [
  editObservations,
  setEditObservations,
] = useState("");

  function toggleEditArea(area: string) {
    setEditAreas((currentAreas) =>
      currentAreas.includes(area)
        ? currentAreas.filter((currentArea) => currentArea !== area)
        : [...currentAreas, area]
    );
  }

  function updateEditRotation(
    area: string,
    field: "startDate" | "endDate" | "room" | "studentNotice",
    value: string
  ) {
    setEditRotations((currentRotations) => {
      const existingRotation =
        currentRotations.find(
          (rotation) => rotation.area === area
        );
      const otherRotations =
        currentRotations.filter(
          (rotation) => rotation.area !== area
        );

      return [
        ...otherRotations,
        {
          area,
          startDate:
            field === "startDate"
              ? value
              : existingRotation?.startDate || "",
          endDate:
            field === "endDate"
              ? value
              : existingRotation?.endDate || "",
          room:
            field === "room"
              ? value
              : existingRotation?.room || "",
          studentNotice:
            field === "studentNotice"
              ? value
              : existingRotation?.studentNotice || "",
        },
      ];
    });
  }

  function toggleEditTutorEmail(email: string) {
    setEditTutorEmails((currentEmails) =>
      currentEmails.includes(email)
        ? currentEmails.filter(
            (currentEmail) => currentEmail !== email
          )
        : [...currentEmails, email]
    );
  }

  const loadEvaluations = useCallback(async (
    studentId: string
  ) => {

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
  }, []);

  const loadStudent = useCallback(async () => {

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
  }, [loadEvaluations, params]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudent();
    });
  }, [loadStudent]);

  const selectedRubric =
    rubrics.find(
      (rubric) =>
        rubric.id === selectedRubricId
    );

  const compatibleRubrics = useMemo(
    () =>
      student
        ? rubrics.filter((rubric) =>
            rubricMatchesStudent(rubric, student)
          )
        : [],
    [student]
  );

  const otherRubrics = useMemo(
    () =>
      rubrics.filter(
        (rubric) =>
          !compatibleRubrics.some(
            (compatibleRubric) =>
              compatibleRubric.id === rubric.id
          )
      ),
    [compatibleRubrics]
  );

  const availableRubricsByArea = useMemo(() => {
    if (!student) return [];

    return studentAreas(student).map((area) => ({
      area,
      rubrics: compatibleRubrics.filter((rubric) =>
        rubricMatchesArea(rubric, area)
      ),
    }));
  }, [compatibleRubrics, student]);

  const rubricHistory = useMemo(
    () =>
      compatibleRubrics.map((rubric) => {
        const rubricEvaluations = evaluations
          .filter((evaluation) =>
            evaluationUsesRubric(evaluation, rubric)
          )
          .sort(
            (a, b) =>
              evaluationTime(b) - evaluationTime(a)
          );

        return {
          rubric,
          count: rubricEvaluations.length,
          latestEvaluation:
            rubricEvaluations[0] || null,
        };
      }),
    [compatibleRubrics, evaluations]
  );

  const pendingItems = useMemo(() => {
    if (!student) return [];

    const items: string[] = [];
    const areas = studentAreas(student);

    areas.forEach((area) => {
      const areaRubrics = compatibleRubrics.filter((rubric) =>
        rubricMatchesArea(rubric, area)
      );
      const hasAreaEvaluation = areaRubrics.some((rubric) =>
        evaluations.some((evaluation) =>
          evaluationUsesRubric(evaluation, rubric)
        )
      );

      if (areaRubrics.length > 0 && !hasAreaEvaluation) {
        items.push(`Falta evaluación ${area}`);
      }
    });

    if (!hasAssignedTutors(student)) {
      items.push("Sin tutor asignado");
    }

    const status = getAcademicStatus(student.average);

    if (status.key === "ungraded") {
      items.push("Sin promedio registrado");
    }

    if (status.key === "critical") {
      items.push("Alumno crítico");
    }

    if (status.key === "failed") {
      items.push("Alumno reprobado");
    }

    return items;
  }, [compatibleRubrics, evaluations, student]);

  const rubricGrade =
    selectedRubric
      ? calculateRubricGrade(
          selectedRubric,
          rubricResponses
        )
      : "";

  const canManageCurrentEvaluations =
    student
      ? canUserEvaluateStudent(
          role,
          user?.email,
          student
        )
      : permissions.canManageEvaluations;

  function openNewEvaluationModal(rubricId?: string) {
    if (!canManageCurrentEvaluations) return;

    if (student) {
      const suggestedRubric =
        rubricId
          ? rubrics.find((rubric) => rubric.id === rubricId)
          : findSuggestedRubric(student);

      setSelectedRubricId(
        suggestedRubric?.id || ""
      );
      setTitle(
        suggestedRubric?.name || ""
      );
      setScore("");
      setRubricResponses({});
    }

    setShowModal(true);
  }

  function handleRubricChange(
    rubricId: string
  ) {

    const rubric = rubrics.find(
      (currentRubric) =>
        currentRubric.id === rubricId
    );

    setSelectedRubricId(rubricId);
    setRubricResponses({});
    setScore("");

    if (rubric) {
      setTitle(rubric.name);
    }
  }

  function selectRubricOption(
    rubric: Rubric,
    criterionId: string,
    label: string,
    optionScore: number
  ) {

    const criterion =
      rubric.criteria.find(
        (currentCriterion) =>
          currentCriterion.id === criterionId
      );

    if (!criterion) return;

    setRubricResponses((current) => ({
      ...current,
      [criterion.id]: {
        criterionId: criterion.id,
        criterion: criterion.title,
        dimension: criterion.dimension,
        group: criterion.group,
        label,
        score: optionScore,
      },
    }));
  }

  async function handleAddEvaluation() {

    if (!student) return;
    if (!canManageCurrentEvaluations) return;

	    try {

      const evaluationScore =
        rubricGrade || score;

      const evaluationTitle =
        title ||
        selectedRubric?.name ||
        "Evaluación clínica";

      if (!evaluationScore) {
        alert(
          "Ingresa una nota o responde al menos un criterio de la pauta."
        );

        return;
      }
	
	      const evaluationRef = await addDoc(
        collection(
          db,
          "students",
          student.id,
          "evaluations"
        ),
	        {
	          title: evaluationTitle,
	          score: evaluationScore,
	          description,
	          rubricLink,
          rubricId:
            selectedRubric?.id || "",
          rubricName:
            selectedRubric?.name || "",
          rubricResponses:
            Object.values(
              rubricResponses
            ),
	
          createdBy:
            auth.currentUser?.email ||
            "Usuario",

          createdAt:
            serverTimestamp(),
        }
      );

      await writeAuditLog({
        action: "evaluation.created",
        actorEmail: auth.currentUser?.email,
        targetType: "evaluation",
        targetId: evaluationRef.id,
        targetName: evaluationTitle,
        details: {
          studentId: student.id,
          studentName: student.name,
          score: evaluationScore,
        },
      });

      const currentEvaluations =
        [...evaluations];

	      currentEvaluations.push({
	        id: crypto.randomUUID(),
	        title: evaluationTitle,
	        score: evaluationScore,
	      });

	      const numericScores =
	        currentEvaluations
            .map((e) =>
              Number(e.score)
            )
            .filter((evaluationScore) =>
              Number.isFinite(
                evaluationScore
              )
            );

	      const average =
	        numericScores.length > 0
            ? numericScores.reduce(
                (a, b) => a + b,
                0
              ) / numericScores.length
            : 0;

      await updateDoc(
        doc(db, "students", student.id),
        {
          average:
            average.toFixed(1),
        }
      );

      setStudent({
        ...student,
        average:
          average.toFixed(1),
      });

      setShowModal(false);

	      setTitle("");
	      setScore("");
	      setDescription("");
	      setRubricLink("");
      setSelectedRubricId("");
      setRubricResponses({});

      loadEvaluations(student.id);

    } catch (error) {

      console.error(error);

    }
  }

  async function handleDeleteEvaluation(
    evaluationId: string
  ) {

    if (!student) return;
    if (!canManageCurrentEvaluations) return;

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

      await writeAuditLog({
        action: "evaluation.deleted",
        actorEmail: auth.currentUser?.email,
        targetType: "evaluation",
        targetId: evaluationId,
        targetName: student.name,
        details: {
          studentId: student.id,
        },
      });

      const filtered =
        evaluations.filter(
          (evaluation) =>
            evaluation.id !== evaluationId
        );

      setEvaluations(filtered);

      if (filtered.length > 0) {

        const numericScores =
          filtered.map((e) =>
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

        setStudent({
          ...student,
          average:
            average.toFixed(1),
        });

      } else {

        await updateDoc(
          doc(db, "students", student.id),
          {
            average: "",
          }
        );

        setStudent({
          ...student,
          average: "",
        });

      }

    } catch (error) {

      console.error(error);

    }
  }

  async function updateStudentAverage(
    nextEvaluations: Evaluation[]
  ) {

    if (!student) return;

    const numericScores =
      nextEvaluations
        .map((evaluation) =>
          Number(evaluation.score)
        )
        .filter((evaluationScore) =>
          Number.isFinite(evaluationScore)
        );

    const nextAverage =
      numericScores.length > 0
        ? (
            numericScores.reduce(
              (total, evaluationScore) =>
                total + evaluationScore,
              0
            ) / numericScores.length
          ).toFixed(1)
        : "";

    await updateDoc(
      doc(db, "students", student.id),
      {
        average: nextAverage,
      }
    );

    setStudent({
      ...student,
      average: nextAverage,
    });
  }

  function openEvaluationEditor(
    evaluation: Evaluation
  ) {
    if (!canManageCurrentEvaluations) return;

    setEditingEvaluation(evaluation);
    setEditScore(evaluation.score || "");
    setEditDescription(
      evaluation.description || ""
    );
    setEditRubricLink(
      evaluation.rubricLink || ""
    );
  }

  function closeEvaluationEditor() {

    setEditingEvaluation(null);
    setEditScore("");
    setEditDescription("");
    setEditRubricLink("");
  }

  async function handleUpdateEvaluation() {

    if (!student || !editingEvaluation) return;
    if (!canManageCurrentEvaluations) return;

    try {

      const nextEvaluation = {
        ...editingEvaluation,
        score: editScore,
        description: editDescription,
        rubricLink: editRubricLink,
      };

      await updateDoc(
        doc(
          db,
          "students",
          student.id,
          "evaluations",
          editingEvaluation.id
        ),
        {
          score: editScore,
          description: editDescription,
          rubricLink: editRubricLink,
        }
      );

      await writeAuditLog({
        action: "evaluation.updated",
        actorEmail: auth.currentUser?.email,
        targetType: "evaluation",
        targetId: editingEvaluation.id,
        targetName: editingEvaluation.title,
        details: {
          studentId: student.id,
          score: editScore,
        },
      });

      const nextEvaluations =
        evaluations.map((evaluation) =>
          evaluation.id ===
          editingEvaluation.id
            ? nextEvaluation
            : evaluation
        );

      setEvaluations(nextEvaluations);
      await updateStudentAverage(
        nextEvaluations
      );
      closeEvaluationEditor();

    } catch (error) {

      console.error(error);

    }
  }

  async function handleUpdateStudent() {

    if (!student) return;
    if (!permissions.canManageStudents) return;

    try {
      const primaryArea = editAreas[0] || "";
      const nextRotations = editAreas.map((area) => {
        const rotation =
          editRotations.find(
            (currentRotation) =>
              currentRotation.area === area
          );

        return {
          area,
          startDate: rotation?.startDate || "",
          endDate: rotation?.endDate || "",
          room: rotation?.room || "",
          studentNotice: rotation?.studentNotice || "",
        };
      });
      const nextTutor =
        teacherProfiles.length > 0
          ? studentTutorLabel({
              tutorEmails: editTutorEmails,
            })
          : editTutor;

      await updateDoc(
        doc(db, "students", student.id),
        {
          name: editName,
          email: editEmail.trim().toLowerCase(),
          university: editUniversity,
          career: editCareer,
          area: primaryArea,
          areas: editAreas,
          rotations: nextRotations,
          role: editRole,
          modality: editModality,
          tutorEmails: editTutorEmails,
          tutor: nextTutor,
          observations: editObservations,
        }
      );

      await writeAuditLog({
        action: "student.updated",
        actorEmail: auth.currentUser?.email,
        targetType: "student",
        targetId: student.id,
        targetName: editName,
        details: {
          university: editUniversity,
          areas: editAreas.join(", "),
          tutor: nextTutor,
        },
      });

      setStudent({
        ...student,
        name: editName,
        email: editEmail.trim().toLowerCase(),
        university: editUniversity,
        career: editCareer,
        area: primaryArea,
        areas: editAreas,
        rotations: nextRotations,
        role: editRole,
        modality: editModality,
        tutorEmails: editTutorEmails,
        tutor: nextTutor,
        observations: editObservations,
      });

      setShowEditModal(false);

    } catch (error) {

      console.error(error);

    }
  }

  function handleExportPdf() {

    if (!student) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    const margin = 18;
    const contentWidth =
      pageWidth - margin * 2;

    let cursorY = 20;

    function addPageIfNeeded(
      neededHeight = 12
    ) {

      if (
        cursorY + neededHeight >
        pageHeight - margin
      ) {
        pdf.addPage();
        cursorY = 20;
      }
    }

    function addText(
      text: string,
      options: {
        size?: number;
        style?: "normal" | "bold";
        color?: [number, number, number];
        gap?: number;
      } = {}
    ) {

      const {
        size = 10,
        style = "normal",
        color = [30, 41, 59],
        gap = 6,
      } = options;

      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      pdf.setTextColor(...color);

      const lines = pdf.splitTextToSize(
        text || "-",
        contentWidth
      );

      const lineHeight = size * 0.42;
      addPageIfNeeded(
        lines.length * lineHeight + gap
      );

      pdf.text(lines, margin, cursorY);
      cursorY +=
        lines.length * lineHeight + gap;
    }

    function addDivider() {

      addPageIfNeeded(8);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(
        margin,
        cursorY,
        pageWidth - margin,
        cursorY
      );
      cursorY += 8;
    }

    addText("Informe clínico académico", {
      size: 18,
      style: "bold",
      color: [79, 70, 229],
      gap: 8,
    });

    addText(student.name, {
      size: 15,
      style: "bold",
      gap: 8,
    });

    addDivider();

    addText("Información del alumno", {
      size: 13,
      style: "bold",
      gap: 6,
    });

    [
      ["Universidad", student.university],
      ["Correo", student.email || "-"],
      ["Carrera", student.career || "Sin definir"],
      ["Áreas", studentAreas(student).join(", ") || "Sin área"],
      ["Rol", student.role || "-"],
      ["Modalidad", student.modality || "-"],
      ["Estado académico", getAcademicStatus(student.average).label],
      ["Tutor", studentTutorLabel(student) || "-"],
      ["Promedio", student.average || "-"],
    ].forEach(([label, value]) => {
      addText(`${label}: ${value}`, {
        size: 10,
        gap: 4,
      });
    });

    addText(
      `Observaciones generales: ${
        student.observations ||
        "Sin observaciones registradas"
      }`,
      {
        size: 10,
        gap: 8,
      }
    );

    addDivider();

    addText("Evaluaciones", {
      size: 13,
      style: "bold",
      gap: 6,
    });

    if (evaluations.length === 0) {
      addText("Sin evaluaciones registradas.", {
        color: [100, 116, 139],
      });
    }

    evaluations.forEach(
      (evaluation, index) => {

        addPageIfNeeded(34);

        addText(
          `${index + 1}. ${
            evaluation.title ||
            "Evaluación sin título"
          }`,
          {
            size: 11,
            style: "bold",
            gap: 5,
          }
        );

        addText(`Nota: ${evaluation.score || "-"}`, {
          size: 10,
          gap: 4,
        });

        addText(
          `Fecha: ${formatEvaluationDate(
            evaluation.createdAt
          )}`,
          {
            size: 10,
            gap: 4,
          }
        );

        addText(
          `Registrada por: ${
            evaluation.createdBy || "Usuario"
          }`,
          {
            size: 10,
            gap: 4,
          }
        );

        if (evaluation.rubricName) {
          addText(
            `Pauta: ${evaluation.rubricName}`,
            {
              size: 10,
              gap: 4,
            }
          );
        }

        addText(
          `Comentarios: ${
            evaluation.description ||
            "Sin comentarios"
          }`,
          {
            size: 10,
            gap: 4,
          }
        );

        if (evaluation.rubricLink) {
          addText(
            `Rúbrica: ${evaluation.rubricLink}`,
            {
              size: 10,
              color: [79, 70, 229],
              gap: 4,
            }
          );
        }

        if (
          evaluation.rubricResponses &&
          evaluation.rubricResponses.length > 0
        ) {
          addText("Respuestas de pauta:", {
            size: 10,
            style: "bold",
            gap: 4,
          });

          evaluation.rubricResponses.forEach(
            (response) => {
              addText(
                `${response.dimension} - ${response.criterion}: ${response.label} (${response.score})`,
                {
                  size: 9,
                  gap: 3,
                }
              );
            }
          );
        }

        if (index < evaluations.length - 1) {
          cursorY += 3;
          addDivider();
        }

      }
    );

    pdf.save(
      `informe-${fileSafeName(
        student.name
      )}.pdf`
    );
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

  const academicStatus = getAcademicStatus(student.average);
  const canViewStudent =
    canUserAccessStudent(role, user?.email, student);

  if (!canViewStudent) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-6 text-amber-700">
          No tienes permiso para ver esta ficha.
        </div>
      </div>
    );
  }

  return (

    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">

      <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Perfil clínico
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            {student.name}
          </h1>

          <p className="mt-2 text-base text-slate-500">
            Ficha académica, evaluaciones y seguimiento del interno.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <button
            onClick={handleExportPdf}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Exportar PDF
          </button>

          <button
            onClick={() => {
              setEditName(student.name || "");
              setEditEmail(student.email || "");
              setEditUniversity(student.university || "");
              setEditCareer(student.career || "");
              setEditAreas(studentAreas(student));
              setEditRotations(validRotations(student));
              setEditRole(student.role || "");
              setEditModality(student.modality || "");
              setEditTutor(student.tutor || "");
              setEditTutorEmails(student.tutorEmails || []);
              setEditObservations(student.observations || "");
              setShowEditModal(true);
            }}
            className={`rounded-lg border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 ${
              permissions.canManageStudents ? "" : "hidden"
            }`}
          >
            Editar alumno
          </button>

        </div>

      </header>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1fr_320px]">

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">

          <div className="grid gap-4 sm:grid-cols-2">

            {[
              ["Universidad", student.university || "-"],
              ["Correo", student.email || "-"],
              ["Carrera", student.career || "Sin definir"],
              ["Áreas", studentAreas(student).join(", ") || "Sin área"],
              ["Rol", student.role || "-"],
              ["Modalidad", student.modality || "-"],
              ["Estado académico", academicStatus.label],
              ["Tutor", studentTutorLabel(student) || "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {value}
                </p>
              </div>
            ))}

          </div>

          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Observaciones generales
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {student.observations || "Sin observaciones registradas"}
            </p>
          </div>

        </article>

        <aside
          className={`rounded-lg border p-6 shadow-sm ${academicStatus.panelClassName}`}
        >
          <p className="text-sm font-semibold">
            Promedio actual
          </p>

          <p className="mt-4 text-5xl font-bold">
            {student.average || "-"}
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-bold">
            <span className={`h-2.5 w-2.5 rounded-full ${academicStatus.dotColor}`} />
            {academicStatus.label}
          </div>

          <p className="mt-3 text-sm leading-6">
            Calculado a partir de las evaluaciones registradas para este alumno.
          </p>
        </aside>

        {validRotations(student).length > 0 && (
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <h2 className="text-xl font-bold text-slate-900">
              Fechas de internado
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {validRotations(student).map((rotation, index) => (
                <div
                  key={`${rotation.area}-${index}`}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {rotation.area}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Inicio:{" "}
                    <span className="font-semibold text-slate-700">
                      {formatRotationDate(rotation.startDate)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Fin:{" "}
                    <span className="font-semibold text-slate-700">
                      {formatRotationDate(rotation.endDate)}
                    </span>
                  </p>
                  {(rotation.room || rotation.studentNotice) && (
                    <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                      {rotation.room && (
                        <p>
                          Sala:{" "}
                          <span className="font-semibold text-slate-800">
                            {rotation.room}
                          </span>
                        </p>
                      )}
                      {rotation.studentNotice && (
                        <p className="mt-1">
                          {rotation.studentNotice}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        )}

      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Pautas disponibles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pautas compatibles con la universidad y áreas del alumno.
              </p>
            </div>
            <span className="w-fit rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600">
              {compatibleRubrics.length} pautas
            </span>
          </div>

          {availableRubricsByArea.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No hay áreas configuradas para sugerir pautas.
            </div>
          ) : (
            <div className="grid gap-4">
              {availableRubricsByArea.map((group) => (
                <div
                  key={group.area}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {group.area}
                  </p>

                  {group.rubrics.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Sin pauta compatible para esta área.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.rubrics.map((rubric) => (
                        canManageCurrentEvaluations ? (
                          <button
                            key={rubric.id}
                            type="button"
                            onClick={() =>
                              openNewEvaluationModal(rubric.id)
                            }
                            className="rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200"
                          >
                            {rubric.name}
                            <span className="ml-2 text-xs font-bold text-indigo-600">
                              Evaluar
                            </span>
                          </button>
                        ) : (
                          <span
                            key={rubric.id}
                            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            {rubric.name}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Pendientes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Señales rápidas para seguimiento académico.
            </p>

            {pendingItems.length === 0 ? (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
                Sin pendientes detectados.
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {pendingItems.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Historial por pauta
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Uso de las pautas compatibles en este alumno.
            </p>

            {rubricHistory.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Sin pautas compatibles para resumir.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {rubricHistory.map((item) => (
                  <div
                    key={item.rubric.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.rubric.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.count === 0
                            ? "Sin aplicaciones"
                            : `${item.count} aplicación${item.count === 1 ? "" : "es"}`}
                        </p>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
                        {item.latestEvaluation?.score || "-"}
                      </span>
                    </div>

                    {item.latestEvaluation && (
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        Última:{" "}
                        {formatEvaluationDate(
                          item.latestEvaluation.createdAt
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>

      <section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Evaluaciones
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {evaluations.length} registros clínicos asociados.
            </p>
          </div>

          <button
            onClick={() => openNewEvaluationModal()}
            className={`w-fit rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 ${
              canManageCurrentEvaluations ? "" : "hidden"
            }`}
          >
            Nueva evaluación
          </button>

        </div>

        <div className="grid gap-4">

          {evaluations.length === 0 ? (

            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
              Sin evaluaciones registradas
            </div>

          ) : (

            evaluations.map((evaluation) => (

              <article
                key={evaluation.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >

                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {evaluation.title}
                      </h3>

                      {evaluation.rubricName && (
                        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                          {evaluation.rubricName}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>{evaluation.createdBy || "Usuario"}</span>
                      <span>
                        {evaluation.createdAt?.seconds
                          ? new Date(
                              evaluation.createdAt.seconds * 1000
                            ).toLocaleDateString("es-CL", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Fecha pendiente"}
                      </span>
                    </div>

                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">

                    <div className="rounded-lg bg-indigo-50 px-4 py-2 text-xl font-bold text-indigo-600">
                      {evaluation.score}
                    </div>

                    <button
                      onClick={() => openEvaluationEditor(evaluation)}
                      className={`rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 ${
                        canManageCurrentEvaluations ? "" : "hidden"
                      }`}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDeleteEvaluation(evaluation.id)}
                      className={`rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 ${
                        canManageCurrentEvaluations ? "" : "hidden"
                      }`}
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {evaluation.description || "Sin comentarios"}
                </p>

                {evaluation.rubricLink && (
                  <a
                    href={evaluation.rubricLink}
                    target="_blank"
                    className="mt-4 inline-flex text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Ver rúbrica
                  </a>
                )}

              </article>

            ))

          )}

        </div>

      </section>

      {showModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-3xl font-bold mb-6 text-[#1E293B]">
              Nueva evaluación
            </h2>

	            <div className="grid gap-4">

              <select
                value={selectedRubricId}
                onChange={(e) =>
                  handleRubricChange(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              >
                <option value="">
                  Evaluación manual
                </option>

                {compatibleRubrics.length > 0 && (
                  <optgroup label="Pautas compatibles">
                    {compatibleRubrics.map((rubric) => (
                      <option
                        key={rubric.id}
                        value={rubric.id}
                      >
                        {rubric.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Otras pautas">
                  {otherRubrics.map((rubric) => (
                    <option
                      key={rubric.id}
                      value={rubric.id}
                    >
                      {rubric.name}
                    </option>
                  ))}
                </optgroup>
              </select>
	
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
	                type="number"
                min="1"
                max="7"
                step="0.1"
	                value={
                    selectedRubric
                      ? rubricGrade
                      : score
                  }
	                onChange={(e) =>
	                  setScore(
	                    e.target.value
	                  )
	                }
                  disabled={Boolean(
                    selectedRubric
                  )}
	                className="border border-gray-200 rounded-2xl px-5 py-4"
	              />

              {selectedRubric && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                  <p className="font-semibold text-[#5B6CFF]">
                    Nota calculada:{" "}
                    {rubricGrade || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Respuestas:{" "}
                    {
                      Object.keys(
                        rubricResponses
                      ).length
                    }{" "}
                    de{" "}
                    {
                      selectedRubric.criteria
                        .length
                    }{" "}
                    criterios
                  </p>
                </div>
              )}

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

	              <input
                placeholder="Link rúbrica"
                value={rubricLink}
                onChange={(e) =>
                  setRubricLink(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
	              />

              {selectedRubric && (
                <div className="space-y-5">
                  {Array.from(
                    new Set(
                      selectedRubric.criteria.map(
                        (criterion) =>
                          criterion.dimension
                      )
                    )
                  ).map((dimension) => (
                    <section
                      key={dimension}
                      className="rounded-2xl border border-gray-100 p-5"
                    >
                      <h3 className="text-xl font-bold text-[#1E293B]">
                        {dimension}
                      </h3>

                      <div className="mt-4 space-y-4">
                        {selectedRubric.criteria
                          .filter(
                            (criterion) =>
                              criterion.dimension ===
                              dimension
                          )
                          .map((criterion) => (
                            <div
                              key={criterion.id}
                              className="rounded-2xl bg-[#F8FAFC] p-4"
                            >
                              <p className="font-medium text-[#1E293B]">
                                {criterion.title}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {criterion.options.map(
                                  (option) => {
                                    const selected =
                                      rubricResponses[
                                        criterion.id
                                      ]?.label ===
                                      option.label;

                                    return (
                                      <button
                                        key={
                                          option.label
                                        }
                                        type="button"
                                        onClick={() =>
                                          selectRubricOption(
                                            selectedRubric,
                                            criterion.id,
                                            option.label,
                                            option.score
                                          )
                                        }
                                        className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                                          selected
                                            ? "border-[#5B6CFF] bg-[#5B6CFF] text-white"
                                            : "border-gray-200 bg-white text-gray-600 hover:border-[#5B6CFF]"
                                        }`}
                                      >
                                        {option.label} (
                                        {option.score})
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

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

      {editingEvaluation && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-8">

            <h2 className="text-3xl font-bold mb-6 text-[#1E293B]">
              Editar evaluación
            </h2>

            <div className="grid gap-4">

              <input
                placeholder="Nota"
                type="number"
                min="1"
                max="7"
                step="0.1"
                value={editScore}
                onChange={(e) =>
                  setEditScore(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

              <textarea
                placeholder="Descripción"
                value={editDescription}
                onChange={(e) =>
                  setEditDescription(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4 min-h-[140px]"
              />

              <input
                placeholder="Link rúbrica"
                value={editRubricLink}
                onChange={(e) =>
                  setEditRubricLink(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

            </div>

            <div className="flex items-center justify-end gap-4 mt-8">

              <button
                onClick={
                  closeEvaluationEditor
                }
                className="px-5 py-3 rounded-2xl bg-gray-100"
              >
                Cancelar
              </button>

              <button
                onClick={
                  handleUpdateEvaluation
                }
                className="bg-[#5B6CFF] hover:bg-[#4C5DF5] text-white px-6 py-3 rounded-2xl transition"
              >
                Guardar cambios
              </button>

            </div>

          </div>

        </div>

      )}

      {showEditModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-8">

            <h2 className="text-3xl font-bold mb-6 text-[#1E293B]">
              Editar alumno
            </h2>

            <div className="grid gap-4">

              <input
                placeholder="Nombre"
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

              <input
                type="email"
                placeholder="Correo del alumno"
                value={editEmail}
                onChange={(e) =>
                  setEditEmail(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              />

              <select
                value={editUniversity}
                onChange={(e) =>
                  setEditUniversity(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              >
                <option value="">
                  Universidad
                </option>

                {universityOptions.map(
                  (university) => (
                    <option
                      key={university}
                      value={university}
                    >
                      {university}
                    </option>
                  )
                )}
              </select>

              <select
                value={editCareer}
                onChange={(e) =>
                  setEditCareer(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              >
                <option value="">
                  Carrera
                </option>

                {careerOptions.map((career) => (
                  <option
                    key={career}
                    value={career}
                  >
                    {career}
                  </option>
                ))}
              </select>

              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">
                  Áreas
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {areaOptions.map((area) => {
                    const selected =
                      editAreas.includes(area);

                    return (
                      <label
                        key={area}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          selected
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleEditArea(area)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        {area}
                      </label>
                    );
                  })}
                </div>
              </div>

              {editAreas.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Fechas de rotación
                  </p>

                  <div className="mt-3 grid gap-3">
                    {editAreas.map((area) => {
                      const rotation =
                        editRotations.find(
                          (currentRotation) =>
                            currentRotation.area === area
                        );

                      return (
                        <div
                          key={area}
                          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[80px_1fr_1fr] sm:items-center lg:grid-cols-[80px_1fr_1fr_1fr]"
                        >
                          <p className="font-semibold text-slate-700">
                            {area}
                          </p>

                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Inicio
                            <input
                              type="date"
                              value={rotation?.startDate || ""}
                              onChange={(event) =>
                                updateEditRotation(
                                  area,
                                  "startDate",
                                  event.target.value
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700"
                            />
                          </label>

                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Fin
                            <input
                              type="date"
                              value={rotation?.endDate || ""}
                              onChange={(event) =>
                                updateEditRotation(
                                  area,
                                  "endDate",
                                  event.target.value
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700"
                            />
                          </label>

                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Sala/unidad
                            <input
                              type="text"
                              value={rotation?.room || ""}
                              onChange={(event) =>
                                updateEditRotation(
                                  area,
                                  "room",
                                  event.target.value
                                )
                              }
                              placeholder="Ej: Sala 3"
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700"
                            />
                          </label>

                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:col-span-3 lg:col-span-4">
                            Aviso para alumno
                            <input
                              type="text"
                              value={rotation?.studentNotice || ""}
                              onChange={(event) =>
                                updateEditRotation(
                                  area,
                                  "studentNotice",
                                  event.target.value
                                )
                              }
                              placeholder="Ej: Presentarse en sala 3 desde las 08:00"
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <select
                value={editRole}
                onChange={(e) =>
                  setEditRole(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              >
                <option value="">
                  Rol
                </option>

                {roleOptions.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                ))}
              </select>

              <select
                value={editModality}
                onChange={(e) =>
                  setEditModality(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4"
              >
                <option value="">
                  Modalidad
                </option>

                {modalityOptions.map((modality) => (
                  <option
                    key={modality}
                    value={modality}
                  >
                    {modality}
                  </option>
                ))}
              </select>

              {teacherProfiles.length > 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Tutor docente
                  </p>

                  <div className="mt-3 grid gap-2">
                    {teacherProfiles.map((teacher) => {
                      const selected =
                        editTutorEmails.includes(teacher.email);

                      return (
                        <label
                          key={teacher.email}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                            selected
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleEditTutorEmail(teacher.email)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {teacher.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <input
                  placeholder="Tutor"
                  value={editTutor}
                  onChange={(e) =>
                    setEditTutor(
                      e.target.value
                    )
                  }
                  className="border border-gray-200 rounded-2xl px-5 py-4"
                />
              )}
              <textarea
                placeholder="Observaciones generales"
                value={editObservations}
                onChange={(e) =>
                  setEditObservations(
                    e.target.value
                  )
                }
                className="border border-gray-200 rounded-2xl px-5 py-4 min-h-[140px]"
              />
            </div>

            <div className="flex items-center justify-end gap-4 mt-8">

              <button
                onClick={() =>
                  setShowEditModal(false)
                }
                className="px-5 py-3 rounded-2xl bg-gray-100"
              >
                Cancelar
              </button>

              <button
                onClick={
                  handleUpdateStudent
                }
                className="bg-[#5B6CFF] hover:bg-[#4C5DF5] text-white px-6 py-3 rounded-2xl transition"
              >
                Guardar cambios
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}
