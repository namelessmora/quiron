export const rubrics = [

  {
    university: "UBO",
    area: "RM",

    name: "Rúbrica UBO RM",

    scale: 70,

    criticalCriteria: [],

    criteria: [

      {
        id: 1,
        title: "Responsabilidad",
        options: [
          { label: "Excelente", score: 7 },
          { label: "Bueno", score: 5 },
          { label: "Deficiente", score: 3 },
        ],
      },

      {
        id: 2,
        title: "Trato al paciente",
        options: [
          { label: "Excelente", score: 7 },
          { label: "Bueno", score: 5 },
          { label: "Deficiente", score: 3 },
        ],
      },

    ],
  },

  {
    university: "STO",
    area: "TC",

    name: "Rúbrica STO TC",

    scale: 60,

    criticalCriteria: [
      "Seguridad del paciente",
    ],

    criteria: [

      {
        id: 1,
        title: "Seguridad del paciente",
        options: [
          { label: "Cumple", score: 7 },
          { label: "No cumple", score: 1 },
        ],
      },

      {
        id: 2,
        title: "Trabajo en equipo",
        options: [
          { label: "Excelente", score: 7 },
          { label: "Regular", score: 4 },
          { label: "Deficiente", score: 2 },
        ],
      },

    ],
  },

];