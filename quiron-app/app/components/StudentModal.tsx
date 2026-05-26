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

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function StudentModal({ onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    university: "",
    career: "",
    area: "",
    role: "",
    modality: "",
    tutor: "",
  });

  async function handleSave() {
    const cleanName = form.name.trim();
    const cleanUniversity = form.university.trim();

    if (!cleanName || !cleanUniversity || !form.area) {
      setError("Nombre, universidad y área son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "students"), {
        name: cleanName,
        university: cleanUniversity,
        career: form.career.trim(),
        areas: [form.area],
        area: form.area,
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
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
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

          <select
            value={form.area}
            onChange={(event) =>
              setForm({
                ...form,
                area: event.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">
              Área
            </option>

            {areaOptions.map((area) => (
              <option
                key={area}
                value={area}
              >
                {area}
              </option>
            ))}
          </select>

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
