export type RubricOption = {
  label: string;
  score: number;
  description: string;
};

export type RubricCriterion = {
  id: string;
  dimension: string;
  title: string;
  options: RubricOption[];
};

export type Rubric = {
  id: string;
  university: string;
  area: string;
  areaAliases: string[];
  name: string;
  scale: number;
  maxScore: number;
  passingScore: number;
  criticalCriteria: string[];
  criteria: RubricCriterion[];
};

const uboRxOptions: RubricOption[] = [
  {
    label: "Destacado",
    score: 10,
    description:
      "Cumple a la perfección con el criterio de evaluación establecido.",
  },
  {
    label: "Habilitado",
    score: 7,
    description:
      "Competencia mínima para aprobar el criterio. Equivale a nota 4.0.",
  },
  {
    label: "No logrado",
    score: 0,
    description:
      "Desempeño insuficiente que no permite aprobar el criterio.",
  },
];

function criteria(
  dimension: string,
  titles: string[]
) {
  return titles.map((title, index) => ({
    id: `${dimension
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${index + 1}`,
    dimension,
    title,
    options: uboRxOptions,
  }));
}

export const rubrics: Rubric[] = [
  {
    id: "ubo-rx",
    university: "UBO",
    area: "RX",
    areaAliases: [
      "RX",
      "Radiodiagnóstico",
      "Radiodiagnostico",
      "Radiología",
      "Radiologia",
      "Radiografía",
      "Radiografia",
    ],
    name: "Pauta RX UBO",
    scale: 70,
    maxScore: 10,
    passingScore: 7,
    criticalCriteria: [],
    criteria: [
      ...criteria("Aspectos actitudinales", [
        "Llega con puntualidad a la práctica.",
        "Asiste con uniforme según reglamento de Escuela al lugar de práctica.",
        "Tiene un trato respetuoso con las personas con que se relaciona.",
        "Cumple con las tareas asignadas.",
        "Tiene capacidad para organizar su trabajo o las responsabilidades asignadas.",
        "Participa en forma activa en los equipos de trabajo relacionados con la atención de pacientes.",
        "Demuestra capacidad de manejo de grupo.",
        "Demuestra actitud de servicio en la práctica realizada.",
        "Demuestra una actitud reflexiva respecto a los acontecimientos y experiencias de la práctica.",
        "Manifiesta una actitud de autoaprendizaje respecto a los desafíos que le presenta la práctica.",
        "Respeta las normas del Centro durante la práctica, como horarios, métodos y protocolos.",
      ]),
      ...criteria("Procedimiento con el usuario", [
        "Recibe en forma cordial al usuario.",
        "Consulta la razón del examen y solicita la documentación necesaria.",
        "Explica al usuario el procedimiento a seguir en la exploración por radiografía.",
        "Pregunta al usuario si tiene restricciones para realizar el examen.",
        "Solicita al usuario utilizar vestimenta especial para el examen.",
        "Respeta la dignidad del paciente, su privacidad, pudor e información.",
        "Realiza correctamente el posicionamiento en la camilla o estativo según examen solicitado.",
      ]),
      ...criteria("Uso del equipo radiológico", [
        "Ajusta correctamente los parámetros de exploración, como mAs y kVp.",
        "Selecciona y carga de forma correcta el chasis a utilizar.",
        "Selecciona correctamente la DFP para el examen requerido.",
        "Obtiene las imágenes por radiografía correctas solicitadas y sabe corregir errores.",
        "Realiza una correcta marcación respecto a lateralidad.",
        "Realiza correctas angulaciones del rayo central al obtener radiografías.",
        "Logra el grado de densidad óptica requerida y sabe corregir si no lo obtiene.",
        "Utiliza correctamente los aditamentos disponibles en la sala de radiografías.",
      ]),
      ...criteria("Bioseguridad", [
        "Se asegura de mantener los elementos de bioseguridad en la sala de radiografía.",
        "Permanece en la sala de radiografía cumpliendo sus tareas.",
        "Utiliza su dosímetro durante toda la práctica.",
        "Mantiene la puerta cerrada de la sala de radiografía.",
        "Se asegura de proteger radiológicamente a usuarios y usuarias.",
        "No expone al usuario a exploraciones continuas por errores técnicos u otros.",
        "Brinda medidas de protección personal al usuario o usuaria.",
        "Se protege radiológicamente a sí mismo o misma.",
      ]),
      ...criteria("Aspectos finales del procedimiento", [
        "Indica al usuario que el examen ha concluido y puede levantarse o vestirse.",
        "Informa al usuario sobre la fecha de los resultados del examen.",
        "Responde correctamente preguntas del usuario cuando corresponden a su nivel de competencia.",
        "Se despide cordialmente del usuario.",
      ]),
      ...criteria("Análisis del examen", [
        "Interpreta correctamente el resultado del examen.",
        "Argumenta verbalmente la interpretación del examen realizado.",
        "Apoya técnicamente con las dudas que pueda tener el médico radiólogo.",
        "Maneja con discreción los resultados del examen.",
        "Entiende la patología y puede sugerir exámenes complementarios.",
        "Identifica correctamente estructuras anatómicas.",
      ]),
    ],
  },
];
