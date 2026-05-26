export type RubricOption = {
  label: string;
  score: number;
  description: string;
};

export type RubricCriterion = {
  id: string;
  dimension: string;
  group?: string;
  title: string;
  options: RubricOption[];
};

export type RubricGradeGroup = {
  id: string;
  label: string;
  weight: number;
};

export type Rubric = {
  id: string;
  university: string;
  universityAliases?: string[];
  area: string;
  areaAliases: string[];
  name: string;
  scale: number;
  maxScore: number;
  passingScore: number;
  gradeStrategy?: "percentageScale" | "weightedAverageScore";
  gradeGroups?: RubricGradeGroup[];
  excludeFromGradeLabels?: string[];
  criticalCriteria: string[];
  criteria: RubricCriterion[];
};

const uboPerformanceOptions: RubricOption[] = [
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
  titles: string[],
  options = uboPerformanceOptions,
  group?: string
) {
  return titles.map((title, index) => ({
    id: `${dimension
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${index + 1}`,
    dimension,
    group,
    title,
    options,
  }));
}

const enacOptions: RubricOption[] = [
  {
    label: "Logrado",
    score: 7,
    description:
      "El criterio se cumple según lo esperado para la práctica laboral.",
  },
  {
    label: "No logrado",
    score: 0,
    description:
      "El criterio no se cumple o requiere desarrollo adicional.",
  },
  {
    label: "No aplica",
    score: 0,
    description:
      "El criterio no corresponde a la experiencia evaluada.",
  },
];

const stoOptions: RubricOption[] = [
  {
    label: "Excelente",
    score: 5,
    description:
      "El desempeño se logra completamente o supera las expectativas.",
  },
  {
    label: "Bueno",
    score: 4,
    description:
      "El desempeño se logra, con imprecisiones ocasionales.",
  },
  {
    label: "Regular",
    score: 2,
    description:
      "El desempeño se logra de forma mínima y requiere mejora.",
  },
  {
    label: "Insuficiente",
    score: 1,
    description:
      "El desempeño se presenta con dificultades relevantes.",
  },
  {
    label: "No aplica",
    score: 0,
    description:
      "El desempeño descrito no se desarrolla en el área.",
  },
];

const uboAttitudinalCriteria = [
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
];

const uboAnalysisCriteria = [
  "Interpreta correctamente el resultado del examen.",
  "Argumenta verbalmente la interpretación del examen realizado.",
  "Apoya técnicamente con las dudas que pueda tener el médico radiólogo.",
  "Maneja con discreción los resultados del examen.",
  "Entiende la patología y puede sugerir exámenes complementarios.",
  "Identifica correctamente estructuras anatómicas.",
];

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
      ...criteria("Aspectos actitudinales", uboAttitudinalCriteria),
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
      ...criteria("Análisis del examen", uboAnalysisCriteria),
    ],
  },
  {
    id: "ubo-tc",
    university: "UBO",
    area: "TC",
    areaAliases: [
      "TC",
      "TAC",
      "Scanner",
      "Escáner",
      "Tomografía",
      "Tomografia",
      "Tomografía Computarizada",
      "Tomografia Computarizada",
    ],
    name: "Pauta TC UBO",
    scale: 70,
    maxScore: 10,
    passingScore: 7,
    criticalCriteria: [],
    criteria: [
      ...criteria("Aspectos actitudinales", uboAttitudinalCriteria),
      ...criteria("Procedimiento con el usuario", [
        "Recibe en forma cordial al usuario.",
        "Consulta la razón del examen y solicita la documentación necesaria, como consentimiento informado y antecedentes de reacciones adversas al contraste yodado.",
        "Explica al usuario el procedimiento a seguir en la exploración por scanner.",
        "Pregunta al usuario si tiene restricciones para realizar el examen, como embarazo u otras.",
        "Solicita al usuario utilizar vestimenta especial para el examen.",
        "Respeta la dignidad del paciente, su privacidad, pudor e información.",
        "Realiza correctamente el posicionamiento en la camilla según examen solicitado.",
      ]),
      ...criteria("Uso del equipo radiológico", [
        "Ajusta correctamente los parámetros de exploración, como mA, kV y pitch.",
        "Ubica en forma correcta el cabezal en la mesa de exploración.",
        "Selecciona correctamente el protocolo a utilizar para el examen.",
        "Obtiene las imágenes por TC correctas solicitadas y sabe corregir errores.",
        "Realiza una correcta selección de imágenes al enviarlas al PACS.",
        "Selecciona correctamente ventana y kernel respecto a la patología.",
        "Logra el grado de densidades y nitidez requerida para el examen y sabe corregir si no lo obtiene.",
        "Logra una resolución espacial suficiente para analizar el examen.",
      ]),
      ...criteria("Bioseguridad", [
        "Se asegura de mantener los elementos de bioseguridad en la sala del scanner.",
        "Permanece en el bunker del scanner cumpliendo sus tareas.",
        "Utiliza su dosímetro desde el inicio hasta el final de su jornada.",
        "Mantiene la puerta cerrada de la sala de scanner.",
        "Solicita al personal no estar presente durante la exploración por exposición a radiación ionizante.",
        "No expone al usuario a exploraciones continuas en tomografía computarizada por errores técnicos u otros.",
        "Brinda medidas de protección radiológica al usuario o usuaria.",
        "Brinda medidas de protección radiológica y consulta antecedentes al acompañante si debe permanecer en la sala del tomógrafo.",
      ]),
      ...criteria("Aspectos finales del procedimiento", [
        "Solicita al usuario que, al concluir el examen, puede levantarse de la mesa y/o vestirse.",
        "Informa al usuario sobre la fecha de los resultados del examen.",
        "Responde correctamente preguntas del usuario cuando corresponden a su nivel de competencia.",
        "Se despide cordialmente del usuario.",
      ]),
      ...criteria("Análisis del examen", uboAnalysisCriteria),
    ],
  },
  {
    id: "sto-tc",
    university: "UST",
    universityAliases: ["STO"],
    area: "TC",
    areaAliases: [
      "TC",
      "TAC",
      "Scanner",
      "Escáner",
      "Tomografía",
      "Tomografia",
      "Tomografía Computarizada",
      "Tomografia Computarizada",
    ],
    name: "Pauta TC STO",
    scale: 0,
    maxScore: 5,
    passingScore: 4,
    gradeStrategy: "weightedAverageScore",
    gradeGroups: [
      { id: "specific", label: "Competencias específicas", weight: 0.7 },
      { id: "generic", label: "Competencias genéricas", weight: 0.3 },
    ],
    excludeFromGradeLabels: ["No aplica"],
    criticalCriteria: [],
    criteria: [
      ...criteria("Competencias específicas", [
        "Identifica componentes y recursos tecnológicos de un Tomógrafo Computado.",
        "Explicita principios físicos esenciales en la formación de imagen en TC.",
        "Aplica factores técnicos y parámetros de adquisición en la calidad de imagen tomográfica.",
        "Distingue alteraciones tomográficas por posicionamiento o factor técnico inadecuado.",
        "Identifica artefactos en imágenes adquiridas y los corrige.",
        "Utiliza equipos de TC, reconociendo conformación y aditamentos accesorios.",
        "Ejecuta exámenes de TC según protocolos establecidos.",
        "Ejecuta técnicas especiales en TC.",
        "Identifica estructuras anatómicas y fisiología en imágenes obtenidas.",
        "Evalúa condición física y mental del paciente y su posicionamiento.",
        "Fundamenta uso de medio de contraste intravenoso considerando seguridad.",
        "Aplica protocolos de premedicación y administración de contraste.",
        "Prepara y administra medios de contraste según fases y órganos a estudiar.",
        "Realiza venopunciones de acuerdo con norma interna, evitando IAAS.",
        "Toma decisiones fundadas en análisis de imágenes obtenidas.",
        "Proporciona información verbal o escrita respecto de hipótesis diagnóstica.",
        "Realiza adquisición de imágenes y análisis dosimétrico en TC.",
        "Selecciona software y criterios clínicos para controlar dosis y calidad.",
        "Utiliza dosis de radiación acorde al principio ALARA.",
        "Evalúa y adapta protocolos en post proceso y distribución RIS/PACS.",
        "Envía y distribuye exámenes según protocolo y estándares.",
        "Evalúa formatos e informes tomográficos con exámenes complementarios.",
        "Expresa hallazgos de exámenes TC para apoyar decisiones clínicas.",
        "Aplica protocolos administrativos y de gestión de calidad.",
        "Utiliza protocolos de flujo de trabajo y herramientas TIC validadas.",
      ], stoOptions, "specific"),
      ...criteria("Competencias genéricas", [
        "Utiliza lenguaje técnico acorde a su nivel de formación.",
        "Se comunica de manera clara, pertinente y efectiva.",
        "Aplica instructivos técnicos o equipos en idioma inglés.",
        "Se integra al equipo con relaciones empáticas y respetuosas.",
        "Evidencia actitud proactiva y responsable.",
        "Busca soluciones en conjunto con el equipo.",
        "Selecciona herramientas TIC para gestión de información disciplinar.",
        "Utiliza documentación actualizada para proponer mejoras.",
        "Da aviso oportuno ante errores u omisiones.",
        "Mantiene confidencialidad institucional y de usuarios.",
        "Demuestra trato deferente y respeto por la dignidad humana.",
        "Analiza críticamente su desempeño.",
        "Recibe observaciones y mejora comportamiento y desempeño.",
      ], stoOptions, "generic"),
    ],
  },
  {
    id: "sto-rx",
    university: "UST",
    universityAliases: ["STO"],
    area: "RX",
    areaAliases: [
      "RX",
      "Radiología",
      "Radiologia",
      "Radiografía",
      "Radiografia",
      "Radiología General",
      "Radiologia General",
    ],
    name: "Pauta RX STO",
    scale: 0,
    maxScore: 5,
    passingScore: 4,
    gradeStrategy: "weightedAverageScore",
    gradeGroups: [
      { id: "specific", label: "Competencias específicas", weight: 0.7 },
      { id: "generic", label: "Competencias genéricas", weight: 0.3 },
    ],
    excludeFromGradeLabels: ["No aplica"],
    criticalCriteria: [],
    criteria: [
      ...criteria("Competencias específicas", [
        "Reconoce factores técnicos para obtención de exámenes radiológicos.",
        "Realiza posicionamiento del paciente según contexto clínico.",
        "Reconoce alteraciones radiográficas por posicionamiento o angulación inadecuada.",
        "Corrige posicionamiento o angulación para lograr radiografías evaluables.",
        "Reconoce artefactos radiográficos y los corrige.",
        "Analiza radiografías detectando patología y anatomía normal.",
        "Identifica patologías en proyecciones radiológicas obtenidas.",
        "Utiliza campos de colimación acordes a la estructura anatómica.",
        "Realiza adquisición de radiografías usando radioprotección.",
        "Utiliza dosis acorde a proyecciones aplicando ALARA.",
        "Utiliza protocolos de flujo de trabajo del servicio.",
        "Aplica protocolos de calidad y seguridad del servicio.",
      ], stoOptions, "specific"),
      ...criteria("Competencias genéricas", [
        "Utiliza lenguaje técnico acorde a su nivel de formación.",
        "Se comunica de manera clara, pertinente y efectiva.",
        "Aplica instructivos técnicos o equipos en idioma inglés.",
        "Se integra al equipo con relaciones empáticas y respetuosas.",
        "Evidencia actitud proactiva y responsable.",
        "Busca soluciones en conjunto con el equipo.",
        "Selecciona herramientas TIC para gestión de información disciplinar.",
        "Utiliza documentación actualizada para proponer mejoras.",
        "Da aviso oportuno ante errores u omisiones.",
        "Mantiene confidencialidad institucional y de usuarios.",
        "Demuestra trato deferente y respeto por la dignidad humana.",
        "Analiza críticamente su desempeño.",
        "Recibe observaciones y mejora comportamiento y desempeño.",
      ], stoOptions, "generic"),
    ],
  },
  {
    id: "sto-rm",
    university: "UST",
    universityAliases: ["STO"],
    area: "RM",
    areaAliases: [
      "RM",
      "Resonancia",
      "Resonancia Magnética",
      "Resonancia Magnetica",
    ],
    name: "Pauta RM STO",
    scale: 0,
    maxScore: 5,
    passingScore: 4,
    gradeStrategy: "weightedAverageScore",
    gradeGroups: [
      { id: "specific", label: "Competencias específicas", weight: 0.7 },
      { id: "generic", label: "Competencias genéricas", weight: 0.3 },
    ],
    excludeFromGradeLabels: ["No aplica"],
    criticalCriteria: [],
    criteria: [
      ...criteria("Competencias específicas", [
        "Chequea orden médica, antecedentes y exámenes previos según diagnóstico.",
        "Reconoce y elige protocolos según contexto clínico-patológico.",
        "Entrevista al paciente y confirma bioseguridad antes de contraste.",
        "Revisa equipamiento considerando protocolos de emergencia.",
        "Elige bobina y aditamentos correctos y posiciona al paciente.",
        "Verifica y analiza localizador o topograma adquirido.",
        "Planifica y ejecuta imágenes finales posteriores.",
        "Ejecuta el procedimiento con fluidez y seguridad.",
        "Utiliza protocolos de flujo y RIS/PACS del servicio.",
        "Analiza imágenes resultantes según contexto clínico.",
        "Realiza preguntas de bioseguridad para evitar accidentes.",
        "Entrega instrucciones para prevenir artefactos o averías.",
        "Aplica normativa de bioseguridad en sala de resonancia magnética.",
      ], stoOptions, "specific"),
      ...criteria("Competencias genéricas", [
        "Utiliza lenguaje técnico acorde a su nivel de formación.",
        "Se comunica de manera clara, pertinente y efectiva.",
        "Aplica instructivos técnicos o equipos en idioma inglés.",
        "Se integra al equipo con relaciones empáticas y respetuosas.",
        "Evidencia actitud proactiva y responsable.",
        "Busca soluciones en conjunto con el equipo.",
        "Selecciona herramientas TIC para gestión de información disciplinar.",
        "Utiliza documentación actualizada para proponer mejoras.",
        "Da aviso oportuno ante errores u omisiones.",
        "Mantiene confidencialidad institucional y de usuarios.",
        "Demuestra trato deferente y respeto por la dignidad humana.",
        "Analiza críticamente su desempeño.",
        "Recibe observaciones y mejora comportamiento y desempeño.",
      ], stoOptions, "generic"),
    ],
  },
  {
    id: "enac-multiple",
    university: "ENAC",
    area: "Múltiple",
    areaAliases: [
      "Múltiple",
      "Multiple",
      "General",
      "Práctica laboral",
      "Practica laboral",
      "Imagenología",
      "Imagenologia",
      "Radioterapia",
      "Todas",
    ],
    name: "Pauta Práctica Laboral ENAC",
    scale: 0,
    maxScore: 7,
    passingScore: 4,
    gradeStrategy: "weightedAverageScore",
    gradeGroups: [
      {
        id: "disciplinary",
        label: "Competencias específicas y transversales",
        weight: 0.6,
      },
      {
        id: "seal",
        label: "Competencias del perfil sello",
        weight: 0.4,
      },
    ],
    excludeFromGradeLabels: ["No aplica"],
    criticalCriteria: [],
    criteria: [
      ...criteria(
        "SALTIR201A: Asistencia al usuario en procedimientos imagenológicos",
        [
          "La información de la solicitud del examen es verificada frente a la persona de acuerdo con los datos de identificación, procedimiento y protocolos institucionales.",
          "Los datos de la entrevista preliminar al usuario hecha por el profesional responsable (Mamografía o exámenes que usan medios de contraste, por ejemplo) son verificados.",
          "Las indicaciones previas que el procedimiento requiere del usuario son verificadas, según el protocolo específico.",
          "Las condiciones físicas que el procedimiento requiere del usuario son verificadas, según el protocolo específico.",
          "Se verifica que el consentimiento informado se encuentra firmado.",
          "El usuario o tutor es informado del procedimiento, indicando las acciones que se le van a realizar.",
          "El usuario es asistido en la colocación de la bata u otros implementos requeridos por el procedimiento a realizar.",
          "El retiro de objetos metálicos y otros que puedan interferir con la imagen se realiza antes del procedimiento.",
          "El control de signos vitales se realiza según protocolo.",
          "Los insumos y/o materiales requeridos son seleccionados y preparados de acuerdo al examen a realizar y la vía de administración.",
          "Los medicamentos y/o medios de contraste son preparados según el examen a realizar y los protocolos establecidos.",
          "El usuario es informado sobre el procedimiento a realizar.",
          "La zona de punción es seleccionada de acuerdo a la edad del usuario, el tiempo de permanencia de la vía, la viscosidad de la solución a administrar y otros criterios establecidos por protocolo.",
          "Los medicamentos y/o medios de contraste son administrados según examen a realizar y los protocolos establecidos.",
          "Las reacciones adversas son informadas al profesional responsable.",
          "Las observaciones sobre las reacciones físicas y psicológicas son reportadas al profesional responsable.",
          "Usuarios con reacciones emocionales son contenidas psicológicamente de acuerdo al nivel de responsabilidad que su cargo le permite.",
          "Usuarios con conductas desafiantes son contenidos psicológicamente y reportados de acuerdo a los protocolos definidos.",
          "Las reacciones físicas del usuario durante el examen son atendidas con cuidados de enfermería.",
          "Las indicaciones son entregadas al usuario en la etapa post examen imagenológico, verificando su comprensión.",
          "Las dudas del usuario sobre los cuidados posteriores son resueltas, de acuerdo al nivel de responsabilidad que su cargo le permite.",
        ],
        enacOptions,
        "disciplinary"
      ),
      ...criteria(
        "SALTIR202A: Preparación y mantención de sala, equipos y materiales",
        [
          "El equipo y la sala se acondiciona para el inicio de la jornada laboral de acuerdo a protocolo establecido.",
          "La mantención de la reveladora (carga y descarga de químicos, aseo de rodillo) se realiza según indicaciones del proveedor.",
          "Los aditamentos de apoyo son seleccionados e instalados, de acuerdo a las características del usuario, el procedimiento imagenológico y los protocolos establecidos.",
          "El equipo es operado de acuerdo a las indicaciones del proveedor y bajo supervisión del profesional responsable.",
          "En exámenes radiológicos, el chasis es elegido de acuerdo a las características del usuario y del examen solicitado.",
          "En exámenes radiológicos, el chasis o detector se coloca de acuerdo al examen solicitado y la superficie utilizada.",
          "En Densitometría ósea, el equipo es calibrado según indicaciones del proveedor.",
          "En Tomografía computada y Resonancia nuclear magnética, la inyectora automática de medio de contraste se arma según el examen solicitado.",
          "En Resonancia nuclear magnética, la bobina se selecciona de acuerdo al examen solicitado.",
          "En procedimientos imagenológicos de Ecotomografía y Medicina nuclear, el equipo específico es preparado para que el profesional realice el examen solicitado.",
          "El área estéril es preparada para la realización de procedimientos invasivos, según protocolos establecidos.",
          "La asistencia en el procedimiento invasivo se realiza según protocolo establecido.",
          "Los equipos son limpiados antes y después de cada procedimiento, de acuerdo al protocolo establecido.",
          "Los aditamentos son limpiados y ordenados al final de cada procedimiento, de acuerdo al protocolo establecido.",
          "La sala y los equipos son limpiados y ordenados al final de la jornada según protocolos establecidos.",
          "Los desechos biológicos, los materiales cortopunzantes y la basura común son identificados, separados y eliminados de acuerdo al protocolo establecido.",
          "Los materiales reutilizables son identificados y enviados a esterilización, de acuerdo a protocolos establecidos.",
        ],
        enacOptions,
        "disciplinary"
      ),
      ...criteria(
        "SALTIR203A: Procesamiento y envío de imagen",
        [
          "Se verifica que la imagen digitalizada o revelada corresponde a la identidad del usuario.",
          "Se verifica que la imagen corresponde a la solicitud de examen ejecutado.",
          "Se verifica que la imagen contenga identificación de lateralidad, según normativa internacional.",
          "La distribución de los exámenes para el informe se realiza según los criterios establecidos por la unidad, tipo de examen y especialidad.",
          "En sistemas de adquisición de imágenes digitales, el examen se envía al sistema de almacenamiento y comunicación de imágenes digital.",
          "Los datos del usuario y del procedimiento realizado son ingresados al sistema de información.",
          "Las películas son impresas y los CDs producidos, según requerimientos.",
          "Lenguaje técnico del área de imagenología es utilizado para comunicarse con integrantes del equipo de salud.",
          "La información obtenida del procedimiento es archivada de acuerdo a los protocolos establecidos.",
          "La información del usuario y los resultados de los procedimientos, son mantenidos de manera confidencial, de acuerdo con los estándares de calidad.",
          "El uso de medicamentos y/o medios de contraste son registrados en los medios que indique la organización.",
        ],
        enacOptions,
        "disciplinary"
      ),
      ...criteria(
        "SALTIR204A: Medicina nuclear",
        [
          "La información de la solicitud del procedimiento es verificada frente a la persona de acuerdo con los datos de identificación, procedimiento y protocolos institucionales.",
          "Las indicaciones previas que el procedimiento requiere del usuario son verificadas, según el protocolo específico.",
          "Las condiciones físicas que el procedimiento requiere del usuario son verificadas, según el protocolo específico.",
          "Se verifica que el consentimiento informado se encuentra firmado.",
          "El usuario es acompañado hacia y desde la sala de procedimientos.",
          "El usuario o tutor es informado del procedimiento, indicando las acciones que se le van a realizar.",
          "El usuario es asistido en la colocación de la bata u otros implementos requeridos por el procedimiento a realizar.",
          "El posicionamiento del usuario se realiza según la región anatómica a estudiar, de acuerdo al procedimiento.",
          "El control de signos vitales se realiza según protocolo.",
          "El cierre de puertas de salas de examen es verificado entre cada uno de los procedimientos realizados según manual de protección radiológica.",
          "La condición de gravidez de las pacientes es verificada en cada procedimiento imagenológico, informando al profesional responsable y entregando indicaciones según manual de protección radiológica.",
          "Las medidas de blindaje son utilizadas en cada procedimiento de acuerdo a protocolo establecido.",
          "Las medidas de protección son informadas tanto a personal ajeno a la unidad como a usuarios.",
          "Las medidas de protección personal establecidas en los protocolos se aplican y cumplen para evitar sobre exposiciones.",
          "Las observaciones sobre las reacciones físicas y psicológicas del paciente son reportadas al profesional responsable.",
          "Usuarios con reacciones emocionales son contenidas psicológicamente de acuerdo al nivel de responsabilidad que su cargo le permite.",
          "Usuarios con conductas desafiantes son contenidos psicológicamente y reportados de acuerdo a los protocolos definidos.",
          "Las reacciones físicas del usuario durante el procedimiento son atendidas con cuidados de enfermería.",
          "Los cuidados del usuario y las precauciones que deben tomar por los riesgos del procedimiento de medicina nuclear se realizan de acuerdo a protocolos establecidos.",
          "Las indicaciones son entregadas al usuario en la etapa post procedimiento, verificando su comprensión.",
          "Las dudas del usuario sobre los cuidados posteriores son resueltas, de acuerdo al nivel de responsabilidad que su cargo le permite.",
          "Las actividades y reacciones del usuario son registradas en los formatos establecidos por la unidad, según los protocolos establecidos.",
          "Las medidas de protección personal establecidas en los protocolos se aplican y cumplen para evitar sobre exposiciones.",
          "Los insumos e implementos personales utilizados por el usuario durante el procedimiento de medicina nuclear son desechados de acuerdo a los protocolos establecidos.",
          "Los residuos biológicos radioactivos líquidos y sólidos del usuario durante el tratamiento de medicina nuclear son desechados de acuerdo a los protocolos establecidos.",
          "Los niveles de radiación ambiental son medidos según protocolos establecidos.",
          "Los niveles de radiación ambiental son registrados y se reporta al profesional responsable en caso de alteraciones, según nivel de referencia y protocolos establecidos.",
        ],
        enacOptions,
        "disciplinary"
      ),
      ...criteria(
        "SALGEN101A: IAAS, asepsia y bioseguridad",
        [
          "La higienización de manos se realiza según protocolos establecidos.",
          "Las barreras protectoras se utilizan según protocolo de bioseguridad establecido en el lugar de trabajo.",
          "El trabajo realizado respeta la delimitación de área limpia y sucia.",
          "El depósito de eliminación de material cortopunzante es localizado y utilizado según protocolo establecido.",
          "El depósito de eliminación de desechos de alto riesgo es localizado y utilizado según protocolo establecido.",
          "El lavado y preparación de materiales para la esterilización se realiza según protocolos establecidos.",
          "Los requisitos de esterilidad del material son reconocidos y revisados de acuerdo a protocolos establecidos.",
          "Los accidentes cortopunzantes son manejados de acuerdo a protocolos establecidos derivados de las normas ministeriales.",
        ],
        enacOptions,
        "disciplinary"
      ),
      ...criteria(
        "ENASEL203A: Trabajar con alegría",
        [
          "Cumple con requerimientos de horario y asistencia predefinidos.",
          "Realiza sus actividades obteniendo un trabajo bien hecho cumpliendo los estándares solicitados.",
          "Demuestra un comportamiento honesto en todo su quehacer.",
          "Cumple con los requerimientos de presentación personal asociados a las actividades y contexto asociado a la disciplina.",
        ],
        enacOptions,
        "seal"
      ),
      ...criteria(
        "ENASEL201A: Respeto por la dignidad de la persona",
        [
          "Demuestra respeto (trato personalizado y deferente) con las personas con las que interactúa en el desarrollo de las actividades.",
          "Demuestra responsabilidad y cuidado con los datos e/o información que debe manejar en el desarrollo de sus actividades.",
          "Demuestra respeto a los integrantes del equipo de trabajo.",
          "Considera opiniones y punto de vista de los demás en las actividades realizadas.",
        ],
        enacOptions,
        "seal"
      ),
      ...criteria(
        "ENASEL202A: Espíritu de servicio y colaboración",
        [
          "Demuestra conducta explícita de ayuda/apoyo a los demás en su quehacer laboral.",
          "Manifiesta una actitud proactiva para integrar equipos de trabajo.",
          "Manifiesta actitudes colaborativas y/o solidarias con su equipo de trabajo.",
          "Se expresa de manera adecuada y cordial aportando al funcionamiento del equipo de trabajo.",
        ],
        enacOptions,
        "seal"
      ),
      ...criteria(
        "ENASEL204A: Superación de sí mismo",
        [
          "Responde por el resultado de sus accciones de acuerdo a su ámito de acción.",
          "Actúa de acuerdo a los conocimientos/competencias, experticia y alcances de las actividades realizadas.",
          "Demuestra control/manejo de sus emociones frente a hechos que lo pudiesen alterar.",
          "Demuestra interés y motivación en su aprendizaje y formación continua",
          "Demuestra capacidad de autocrítica, reconociendo aciertos, errores, limitaciones y aspectos a mejorar.",
        ],
        enacOptions,
        "seal"
      ),
    ],
  },
];
