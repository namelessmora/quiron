"use client";

import { useState } from "react";

import * as XLSX from "xlsx";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { areaOptions } from "../data/studentOptions";
import { AreaRotation } from "../lib/rotations";
import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";

type ImportRow = Record<string, string | number | Date | undefined>;

type ImportedStudent = {
  name: string;
  email: string;
  university: string;
  career: string;
  tutor: string;
  shift: string;
  status: string;
  areas: string[];
  rotations: AreaRotation[];
};

type ExistingStudent = {
  id: string;
  areas?: string[];
  rotations?: AreaRotation[];
};

function textValue(value: string | number | Date | undefined) {
  return value === undefined ? "" : String(value);
}

function validArea(value: string) {
  const normalizedValue = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return areaOptions.find(
    (area) =>
      area
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim() === normalizedValue
  );
}

function normalizedKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function rowValue(row: ImportRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizedKey);
  const entry = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalizedKey(key))
  );

  return entry?.[1];
}

function toIsoDate(value: string | number | Date | undefined) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return "";

    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
      parsed.d
    ).padStart(2, "0")}`;
  }

  const cleanValue = value.trim();
  const dayFirstMatch = cleanValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;

    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const isoMatch = cleanValue.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function mergeUnique<T>(current: T[], next: T[]) {
  return Array.from(new Set([...current, ...next]));
}

function mergeRotations(
  current: AreaRotation[] = [],
  next: AreaRotation[] = []
) {
  const rotationMap = new Map<string, AreaRotation>();

  [...current, ...next].forEach((rotation) => {
    if (!rotation.area) return;

    const key = rotation.area;
    const previous = rotationMap.get(key);

    rotationMap.set(key, {
      area: rotation.area,
      startDate: rotation.startDate || previous?.startDate || "",
      endDate: rotation.endDate || previous?.endDate || "",
    });
  });

  return Array.from(rotationMap.values());
}

export default function ImportPage() {
  const { permissions } =
    useCurrentUserPermissions();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!permissions.canImportStudents) return;

    try {

      const file =
        event.target.files?.[0];

      if (!file) return;

      setLoading(true);

      setMessage(
        "Leyendo archivo..."
      );

      const data =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(data);

      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[sheetName];

      const jsonData =
        XLSX.utils.sheet_to_json(
          worksheet
        ) as ImportRow[];

      console.log(jsonData);

      setMessage(
        `Filas encontradas: ${jsonData.length}`
      );

      // EXISTENTES
      const existingSnapshot =
        await getDocs(
          collection(db, "students")
        );

      const existingStudents:
        Record<string, ExistingStudent> = {};

      existingSnapshot.forEach((doc) => {

        const data = doc.data();

        const name =
          typeof data.name === "string"
            ? data.name.toLowerCase()
            : "";

        if (name) {
          existingStudents[name] = {
            id: doc.id,
            areas: Array.isArray(data.areas)
              ? (data.areas as string[])
              : [],
            rotations: Array.isArray(data.rotations)
              ? (data.rotations as AreaRotation[])
              : [],
          };
        }

      });

      const studentsMap:
        Record<string, ImportedStudent> = {};

      for (const row of jsonData) {

        console.log(row);

        const name = textValue(
          rowValue(row, ["Nombre", "Alumno", "Estudiante"])
        );

        if (!name) continue;

        const cleanName =
          name.trim();

        const area = validArea(
          textValue(rowValue(row, ["Área", "Area"]))
        );
        const startDate = toIsoDate(
          rowValue(row, [
            "Fecha inicio",
            "Fecha de inicio",
            "Inicio",
            "Inicio internado",
            "Fecha inicio internado",
          ])
        );
        const endDate = toIsoDate(
          rowValue(row, [
            "Fecha fin",
            "Fecha de fin",
            "Fin",
            "Término",
            "Termino",
            "Fin internado",
            "Fecha fin internado",
          ])
        );
        const rotation = area
          ? {
              area,
              startDate,
              endDate,
            }
          : null;

        if (!studentsMap[cleanName]) {

          studentsMap[cleanName] = {

            name: cleanName,
            email: textValue(
              rowValue(row, ["Correo", "Email", "Mail"])
            )
              .trim()
              .toLowerCase(),

            university:
              textValue(rowValue(row, ["Universidad"])) ||
              "Sin universidad",

            career:
              textValue(rowValue(row, ["Carrera"])) ||
              "Sin definir",

            tutor:
              textValue(rowValue(row, ["Docente", "Tutor"])) ||
              "",

            shift:
              textValue(rowValue(row, ["Jornada", "Modalidad"])) ||
              "",

            status: "Activo",

            areas: area ? [area] : [],
            rotations: rotation ? [rotation] : [],

          };

        } else {

          if (
            area &&
            !studentsMap[
              cleanName
            ].areas.includes(area)
          ) {

            studentsMap[
              cleanName
            ].areas.push(area);

          }

          if (rotation) {
            studentsMap[
              cleanName
            ].rotations = mergeRotations(
              studentsMap[cleanName].rotations,
              [rotation]
            );
          }

        }

      }

      let importedCount = 0;
      let updatedCount = 0;

      for (const studentName in studentsMap) {

        const student =
          studentsMap[studentName];

        const existingStudent =
          existingStudents[
            student.name.toLowerCase()
          ];

        if (existingStudent) {
          await updateDoc(
            doc(db, "students", existingStudent.id),
            {
              areas: mergeUnique(
                existingStudent.areas || [],
                student.areas
              ),
              area:
                mergeUnique(
                  existingStudent.areas || [],
                  student.areas
                )[0] || "",
              rotations: mergeRotations(
                existingStudent.rotations || [],
                student.rotations
              ),
              ...(student.email
                ? { email: student.email }
                : {}),
            }
          );

          updatedCount++;
          continue;
        }

        await addDoc(
          collection(db, "students"),
          student
        );

        importedCount++;

      }

      setMessage(
        `${importedCount} alumnos importados y ${updatedCount} actualizados`
      );

      setLoading(false);

    } catch (error) {

      console.error(error);

      setMessage(
        "ERROR IMPORTANDO 😭"
      );

      setLoading(false);

    }

  }

  return (
    <main className="p-10">

      <h1 className="text-4xl font-bold text-gray-800 mb-2">
        Importar agenda
      </h1>

      <p className="text-gray-500 mb-10">
        Carga masiva de internos
      </p>

      {!permissions.canImportStudents ? (
        <div className="max-w-2xl rounded-3xl border border-amber-100 bg-amber-50 p-8 text-amber-700">
          Sólo los administradores pueden importar agenda.
        </div>
      ) : (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-2xl">

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="mb-6"
        />

        {loading && (
          <p className="text-[#4f6ef7] font-medium">
            Importando agenda...
          </p>
        )}

        {message && (
          <p className="mt-4 text-gray-700">
            {message}
          </p>
        )}

      </div>
      )}

    </main>
  );
}
