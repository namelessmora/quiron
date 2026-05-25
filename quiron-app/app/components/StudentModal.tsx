"use client";

import { useState } from "react";
import {
  addDoc,
  collection,
} from "firebase/firestore";

import { db } from "../lib/firebase";

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function StudentModal({
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    university: "",
    career: "",
    areas: "",
  });

  async function handleSave() {
    try {
      setLoading(true);

      await addDoc(
        collection(db, "students"),
        {
          name: form.name,
          university: form.university,
          career: form.career,
          areas: form.areas
            .split(",")
            .map((a) => a.trim()),
        }
      );

      onSaved();

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">
          Nuevo Alumno
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3"
          />

          <input
            type="text"
            placeholder="Universidad"
            value={form.university}
            onChange={(e) =>
              setForm({
                ...form,
                university: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3"
          />

          <input
            type="text"
            placeholder="Carrera"
            value={form.career}
            onChange={(e) =>
              setForm({
                ...form,
                career: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3"
          />

          <input
            type="text"
            placeholder="Áreas separadas por coma"
            value={form.areas}
            onChange={(e) =>
              setForm({
                ...form,
                areas: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}