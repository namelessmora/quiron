import { areaOptions } from "../data/studentOptions";

export type AreaRotation = {
  area: string;
  startDate?: string;
  endDate?: string;
};

export type StudentWithRotations = {
  area?: string;
  areas?: string[];
  rotations?: AreaRotation[];
};

export function validStudentAreas(student: StudentWithRotations) {
  const areas = [
    ...(student.areas || []),
    student.area,
  ].filter(
    (area): area is string =>
      typeof area === "string" &&
      areaOptions.includes(area)
  );

  return Array.from(new Set(areas));
}

export function validRotations(student: StudentWithRotations) {
  return (student.rotations || []).filter((rotation) =>
    areaOptions.includes(rotation.area)
  );
}

export function parseLocalDate(value?: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function isStudentFinalized(student: StudentWithRotations) {
  const rotations = validRotations(student);

  if (rotations.length === 0) return false;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return rotations.every((rotation) => {
    const endDate = parseLocalDate(rotation.endDate);

    return endDate !== null && endDate < todayStart;
  });
}

export function formatRotationDate(value?: string) {
  const date = parseLocalDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
