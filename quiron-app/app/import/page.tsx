"use client";

import { useState } from "react";

import * as XLSX from "xlsx";

import {
  addDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";

export default function ImportPage() {

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

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

      const jsonData: any[] =
        XLSX.utils.sheet_to_json(
          worksheet
        );

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
        Record<string, any> = {};

      existingSnapshot.forEach((doc) => {

        const data = doc.data();

        existingStudents[
          data.name?.toLowerCase()
        ] = true;

      });

      const studentsMap:
        Record<string, any> = {};

      for (const row of jsonData) {

        console.log(row);

        const name =
          row.Nombre ||
          row.nombre ||
          "";

        if (!name) continue;

        const cleanName =
          name.trim();

        const area =
          row.Area ||
          row.area ||
          "General";

        if (!studentsMap[cleanName]) {

          studentsMap[cleanName] = {

            name: cleanName,

            university:
              row.Universidad ||
              row.universidad ||
              "Sin universidad",

            career:
              row.Carrera ||
              row.carrera ||
              "Sin definir",

            tutor:
              row.Docente ||
              row.docente ||
              "",

            shift:
              row.Jornada ||
              row.jornada ||
              "",

            status: "Activo",

            areas: [area],

          };

        } else {

          if (
            !studentsMap[
              cleanName
            ].areas.includes(area)
          ) {

            studentsMap[
              cleanName
            ].areas.push(area);

          }

        }

      }

      let importedCount = 0;

      for (const studentName in studentsMap) {

        const student =
          studentsMap[studentName];

        if (
          existingStudents[
            student.name.toLowerCase()
          ]
        ) {
          continue;
        }

        await addDoc(
          collection(db, "students"),
          student
        );

        importedCount++;

      }

      setMessage(
        `${importedCount} alumnos importados 😭`
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

    </main>
  );
}