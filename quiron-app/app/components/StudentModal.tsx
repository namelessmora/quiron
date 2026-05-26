"use client";

import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";

import {
  areaOptions,
  careerOptions,
  modalityOptions,
  roleOptions,
  universityOptions,
} from "../data/studentOptions";
import { db } from "../lib/firebase";
import { AreaRotation } from "../lib/rotations";

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function StudentModal({ onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    university: "",
    career: "",
    areas: [] as string[],
    rotations: [] as AreaRotation[],
    role: "",
    modality: "",
    tutor: "",
  });

  function toggleArea(area: string) {
    setForm((currentForm) => {
      const areas = currentForm.areas.includes(area)
        ? currentForm.areas.filter((currentArea) => currentArea !== area)
        : [...currentForm.areas, area];

      return {
        ...currentForm,
        areas,
      };
    });
  }

  function updateRotation(
    area: string,
    field: "startDate" | "endDate",
    value: string
  ) {
    setForm((currentForm) => {
      const existingRotation =
        currentForm.rotations.find(
          (rotation) => rotation.area === area
        );
      const otherRotations =
        currentForm.rotations.filter(
          (rotation) => rotation.area !== area
        );

      return {
        ...currentForm,
        rotations: [
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
          },
        ],
      };
    });
  }

  async function handleSave() {
    const cleanName = form.name.trim();
    const cleanUniversity = form.university.trim();

    if (!cleanName || !cleanUniversity || form.areas.length === 0) {
      setError("Nombre, universidad y al menos un área son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "students"), {
        name: cleanName,
        email: form.email.trim().toLowerCase(),
        university: cleanUniversity,
        career: form.career.trim(),
        areas: form.areas,
        area: form.areas[0],
        rotations: form.areas.map((area) => {
          const rotation = form.rotations.find(
            (currentRotation) =>
              currentRotation.area === area
          );

          return {
            area,
            startDate: rotation?.startDate || "",
            endDate: rotation?.endDate || "",
          };
        }),
        role: form.role,
        modality: form.modality,
        tutor: form.tutor.trim(),
        status: "Activo",
      });

      onSaved();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar el alumno.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Nuevo alumno</h2>
            <p className="mt-1 text-sm text-slate-500">
              Registra los datos base del interno clínico.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            X
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <input
            type="email"
            placeholder="Correo del alumno"
            value={form.email}
            onChange={(event) =>
              setForm({
                ...form,
                email: event.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            value={form.university}
            onChange={(event) =>
              setForm({
                ...form,
                university: event.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">
              Universidad
            </option>

            {universityOptions.map((university) => (
              <option
                key={university}
                value={university}
              >
                {university}
              </option>
            ))}
          </select>

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={form.career}
              onChange={(event) =>
                setForm({
                  ...form,
                  career: event.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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

            <input
              type="text"
              placeholder="Tutor"
              value={form.tutor}
              onChange={(event) =>
                setForm({
                  ...form,
                  tutor: event.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Áreas
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {areaOptions.map((area) => {
                const selected = form.areas.includes(area);

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
                      onChange={() => toggleArea(area)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {area}
                  </label>
                );
              })}
            </div>
          </div>

          {form.areas.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Fechas de rotación
              </p>

              <div className="mt-3 grid gap-3">
                {form.areas.map((area) => {
                  const rotation = form.rotations.find(
                    (currentRotation) =>
                      currentRotation.area === area
                  );

                  return (
                    <div
                      key={area}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[80px_1fr_1fr] sm:items-center"
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
                            updateRotation(
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
                            updateRotation(
                              area,
                              "endDate",
                              event.target.value
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
              value={form.modality}
              onChange={(event) =>
                setForm({
                  ...form,
                  modality: event.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
