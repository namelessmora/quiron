import { AreaRotation, parseLocalDate } from "./rotations";

export type StudentValidationInput = {
  name: string;
  university: string;
  areas: string[];
  rotations: AreaRotation[];
  role?: string;
  modality?: string;
  tutor?: string;
  tutorEmails?: string[];
};

export function validateStudentInput(input: StudentValidationInput) {
  const errors: string[] = [];

  if (!input.name.trim()) {
    errors.push("El nombre es obligatorio.");
  }

  if (!input.university.trim()) {
    errors.push("La universidad es obligatoria.");
  }

  if (input.areas.length === 0) {
    errors.push("Selecciona al menos un área.");
  }

  if (
    (input.role === "Interno" || input.role === "Pasante") &&
    !input.tutor?.trim() &&
    (input.tutorEmails || []).length === 0
  ) {
    errors.push("Asigna al menos un tutor.");
  }

  input.areas.forEach((area) => {
    const rotation = input.rotations.find(
      (currentRotation) => currentRotation.area === area
    );
    const modality = rotation?.modality || input.modality || "";
    const startDate = parseLocalDate(rotation?.startDate);
    const endDate = parseLocalDate(rotation?.endDate);

    if (!rotation?.startDate || !rotation?.endDate) {
      errors.push(`Completa inicio y fin de rotación para ${area}.`);
    }

    if (startDate && endDate && endDate < startDate) {
      errors.push(`La fecha fin de ${area} no puede ser anterior al inicio.`);
    }

    if (modality === "4to Modificado" && !rotation?.startDate) {
      errors.push(`El área ${area} en 4to Modificado requiere fecha de inicio.`);
    }
  });

  return errors;
}
