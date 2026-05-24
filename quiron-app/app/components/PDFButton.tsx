"use client";

import jsPDF from "jspdf";

type Props = {
  targetId: string;
};

export default function PDFButton({
  targetId,
}: Props) {

  async function exportPDF() {

    const input =
      document.getElementById(
        targetId
      );

    if (!input) return;

    const pdf =
      new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

    // TEXTO SIMPLE 😭
    const content =
      input.innerText;

    const lines =
      pdf.splitTextToSize(
        content,
        500
      );

    pdf.text(
      lines,
      40,
      40
    );

    pdf.save(
      "informe-clinico.pdf"
    );

  }

  return (
    <button
      onClick={exportPDF}
      className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-sm hover:bg-gray-50 transition"
    >
      Exportar PDF
    </button>
  );
}