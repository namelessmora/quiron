"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  Rubric,
  RubricOption,
  rubrics as baseRubrics,
} from "../data/rubrics";
import {
  areaOptions,
  universityOptions,
} from "../data/studentOptions";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { db } from "../lib/firebase";
import {
  loadStoredRubrics,
  StoredRubric,
} from "../lib/rubricStore";

type CriterionDraft = {
  id: string;
  dimension: string;
  title: string;
};

type OptionPreset = "standard" | "enac" | "simple";

const optionPresets: Record<OptionPreset, RubricOption[]> = {
  standard: [
    {
      label: "Excelente",
      score: 5,
      description: "Cumple completamente el criterio.",
    },
    {
      label: "Bueno",
      score: 4,
      description: "Cumple el criterio con detalles menores.",
    },
    {
      label: "Regular",
      score: 2,
      description: "Cumple parcialmente y requiere apoyo.",
    },
    {
      label: "Insuficiente",
      score: 1,
      description: "No alcanza el desempeño esperado.",
    },
    {
      label: "No aplica",
      score: 0,
      description: "El criterio no corresponde a esta rotación.",
    },
  ],
  enac: [
    {
      label: "Logrado",
      score: 7,
      description: "El desempeño esperado se cumple.",
    },
    {
      label: "No logrado",
      score: 0,
      description: "El desempeño esperado no se cumple.",
    },
    {
      label: "No aplica",
      score: 0,
      description: "El criterio no corresponde a esta rotación.",
    },
  ],
  simple: [
    {
      label: "Cumple",
      score: 1,
      description: "El criterio se cumple.",
    },
    {
      label: "No cumple",
      score: 0,
      description: "El criterio no se cumple.",
    },
    {
      label: "No aplica",
      score: 0,
      description: "El criterio no corresponde a esta rotación.",
    },
  ],
};

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RubricsPage() {
  const { permissions } = useCurrentUserPermissions();
  const [storedRubrics, setStoredRubrics] = useState<StoredRubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [university, setUniversity] = useState("UBO");
  const [area, setArea] = useState("TC");
  const [scale, setScale] = useState("60");
  const [maxScore, setMaxScore] = useState("5");
  const [passingScore, setPassingScore] = useState("4");
  const [preset, setPreset] = useState<OptionPreset>("standard");
  const [dimension, setDimension] = useState("");
  const [criterionTitle, setCriterionTitle] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);

  const loadRubrics = useCallback(async () => {
    try {
      setLoading(true);
      setStoredRubrics(await loadStoredRubrics());
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudieron cargar las pautas personalizadas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRubrics();
    });
  }, [loadRubrics]);

  const groupedRubrics = useMemo(() => {
    const allRubrics = [
      ...baseRubrics.map((rubric) => ({
        ...rubric,
        source: "base" as const,
      })),
      ...storedRubrics.map((rubric) => ({
        ...rubric,
        source: "custom" as const,
      })),
    ];

    return allRubrics.sort((a, b) =>
      `${a.university}-${a.area}-${a.name}`.localeCompare(
        `${b.university}-${b.area}-${b.name}`,
        "es"
      )
    );
  }, [storedRubrics]);

  function addCriterion() {
    const nextDimension = dimension.trim();
    const nextTitle = criterionTitle.trim();

    if (!nextDimension || !nextTitle) {
      setError("Agrega dimensión y criterio antes de sumarlo a la pauta.");
      return;
    }

    setCriteria((current) => [
      ...current,
      {
        id: `${slug(nextDimension)}-${Date.now()}`,
        dimension: nextDimension,
        title: nextTitle,
      },
    ]);
    setCriterionTitle("");
    setError("");
  }

  function removeCriterion(id: string) {
    setCriteria((current) =>
      current.filter((criterion) => criterion.id !== id)
    );
  }

  async function saveRubric() {
    if (!permissions.canManageStudents) return;

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Ponle un nombre a la pauta.");
      return;
    }

    if (criteria.length === 0) {
      setError("Agrega al menos un criterio.");
      return;
    }

    try {
      setSaving(true);

      const selectedOptions = optionPresets[preset];
      const rubricId = `custom-${slug(university)}-${slug(area)}-${Date.now()}`;
      const payload: Rubric & {
        source: "custom";
        createdAt: unknown;
      } = {
        id: rubricId,
        name: name.trim(),
        university,
        universityAliases: university === "UST" ? ["STO", "UST"] : [],
        area,
        areaAliases: [area],
        scale: Number(scale) || 60,
        maxScore: Number(maxScore) || selectedOptions[0].score,
        passingScore: Number(passingScore) || 4,
        excludeFromGradeLabels: ["No aplica"],
        criticalCriteria: [],
        criteria: criteria.map((criterion, index) => ({
          id: `${slug(criterion.dimension)}-${index + 1}`,
          dimension: criterion.dimension,
          title: criterion.title,
          options: selectedOptions,
        })),
        source: "custom",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "rubrics"), payload);
      setName("");
      setCriteria([]);
      setSuccess("Pauta cargada. Ya queda disponible al evaluar alumnos compatibles.");
      await loadRubrics();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar la pauta. Revisa permisos de Firestore.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRubric(rubric: StoredRubric) {
    if (!permissions.canManageStudents) return;

    const confirmed = confirm(`¿Eliminar "${rubric.name}"?`);

    if (!confirmed) return;

    await deleteDoc(doc(db, "rubrics", rubric.docId));
    await loadRubrics();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Pautas
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
          Biblioteca de evaluación
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-500">
          Carga pautas nuevas, asígnalas por universidad y área, y déjalas
          disponibles para seleccionar dentro de la evaluación del alumno.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="mb-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Nueva pauta
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Las opciones con “No aplica” ajustan el puntaje máximo al calcular
              la nota.
            </p>
          </div>

          <div className="grid gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de pauta"
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={university}
                onChange={(event) => setUniversity(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {universityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {areaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <select
                value={preset}
                onChange={(event) =>
                  setPreset(event.target.value as OptionPreset)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
              >
                <option value="standard">Escala 5 niveles</option>
                <option value="enac">Logrado / No logrado</option>
                <option value="simple">Cumple / No cumple</option>
              </select>

              <input
                value={scale}
                onChange={(event) => setScale(event.target.value)}
                type="number"
                min="1"
                max="100"
                placeholder="Exigencia"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              <input
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                type="number"
                min="1"
                placeholder="Puntaje máx."
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <input
              value={passingScore}
              onChange={(event) => setPassingScore(event.target.value)}
              type="number"
              min="1"
              max="7"
              step="0.1"
              placeholder="Nota mínima"
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Criterios
            </h3>

            <div className="mt-3 grid gap-3">
              <input
                value={dimension}
                onChange={(event) => setDimension(event.target.value)}
                placeholder="Dimensión, por ejemplo Bioseguridad"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              <textarea
                value={criterionTitle}
                onChange={(event) => setCriterionTitle(event.target.value)}
                placeholder="Criterio de evaluación"
                className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={addCriterion}
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
              >
                Agregar criterio
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {criteria.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aún no hay criterios cargados.
                </p>
              ) : (
                criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-indigo-600">
                          {criterion.dimension}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {criterion.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCriterion(criterion.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={saveRubric}
            disabled={saving || !permissions.canManageStudents}
            className="mt-5 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Guardando..." : "Guardar pauta"}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Pautas disponibles
              </h2>
              <p className="text-sm text-slate-500">
                {loading
                  ? "Cargando..."
                  : `${groupedRubrics.length} pautas en biblioteca`}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {groupedRubrics.map((rubric) => (
              <article
                key={`${rubric.source}-${rubric.id}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {rubric.name}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {rubric.source === "base" ? "Base" : "Personalizada"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {rubric.university} · {rubric.area} ·{" "}
                      {rubric.criteria.length} criterios
                    </p>
                  </div>

                  {rubric.source === "custom" && "docId" in rubric && (
                    <button
                      type="button"
                      onClick={() => deleteRubric(rubric)}
                      disabled={!permissions.canManageStudents}
                      className="w-fit rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Array.from(
                    new Set(rubric.criteria.map((criterion) => criterion.dimension))
                  )
                    .slice(0, 4)
                    .map((currentDimension) => (
                      <div
                        key={currentDimension}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      >
                        {currentDimension}
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
