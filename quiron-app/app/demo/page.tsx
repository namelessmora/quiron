import Link from "next/link";

const demoSteps = [
  {
    role: "Administrador",
    title: "Preparar alumnos y campos clínicos",
    time: "2 min",
    objective:
      "Mostrar que el equipo coordinador puede crear o importar alumnos, registrar universidad, carrera, áreas, fechas de rotación y tutor docente.",
    actions: [
      "Abrir Alumnos activos.",
      "Crear un alumno o editar uno existente.",
      "Completar universidad, carrera, áreas, rol, modalidad, fechas de rotación y tutor.",
    ],
    result:
      "El alumno queda visible como rotando y con su tutor docente asignado.",
    href: "/students",
    cta: "Ir a alumnos activos",
  },
  {
    role: "Administrador",
    title: "Asignar tutores docentes",
    time: "1 min",
    objective:
      "Explicar que cada tutor sólo ve y evalúa a los alumnos que tiene asignados.",
    actions: [
      "Entrar a la ficha del alumno.",
      "Seleccionar uno o más tutores docentes.",
      "Guardar la ficha.",
    ],
    result:
      "El vínculo queda guardado por correo, no como texto suelto.",
    href: "/students",
    cta: "Revisar fichas",
  },
  {
    role: "Docente",
    title: "Evaluar con pauta clínica",
    time: "4 min",
    objective:
      "Mostrar el flujo principal del docente: entrar, elegir pauta y registrar evaluación sin tocar datos administrativos.",
    actions: [
      "Ingresar con cuenta docente.",
      "Abrir un alumno asignado.",
      "Elegir la pauta sugerida por universidad y área.",
      "Completar criterios, nota, comentario y guardar.",
    ],
    result:
      "La evaluación queda guardada, actualiza promedio y aparece en el historial del alumno.",
    href: "/students",
    cta: "Ver alumnos asignados",
  },
  {
    role: "Alumno",
    title: "Revisar notas y retroalimentación",
    time: "2 min",
    objective:
      "Mostrar transparencia para el alumno sin permitir edición.",
    actions: [
      "Ingresar con cuenta de alumno.",
      "Abrir su ficha.",
      "Revisar evaluaciones, notas, comentarios y pautas realizadas.",
    ],
    result:
      "El alumno ve sólo su información académica y no puede modificar registros.",
    href: "/students",
    cta: "Abrir vista alumno",
  },
  {
    role: "Administrador",
    title: "Exportar respaldo PDF",
    time: "1 min",
    objective:
      "Mostrar cómo generar evidencia formal de una rotación o evaluación.",
    actions: [
      "Abrir la ficha del alumno.",
      "Presionar Exportar PDF.",
      "Revisar que incluya datos, evaluaciones, notas y comentarios.",
    ],
    result:
      "Se descarga un informe completo para respaldo docente o administrativo.",
    href: "/students",
    cta: "Exportar desde ficha",
  },
  {
    role: "Administrador",
    title: "Cerrar con dashboard",
    time: "2 min",
    objective:
      "Terminar mostrando valor para gestión: estado académico, actividad reciente y alumnos finalizados.",
    actions: [
      "Volver al Dashboard.",
      "Mostrar aprobados, críticos y reprobados.",
      "Abrir alumnos finalizados.",
    ],
    result:
      "El hospital ve seguimiento global, trazabilidad y cierre de rotaciones.",
    href: "/",
    cta: "Ir al dashboard",
  },
];

const demoRoles = [
  {
    label: "Admin",
    description:
      "Crea alumnos, edita datos administrativos, asigna tutores, importa planillas y exporta informes.",
  },
  {
    label: "Docente",
    description:
      "Ve sólo sus alumnos asignados y puede registrar, editar o eliminar evaluaciones.",
  },
  {
    label: "Alumno",
    description:
      "Ve sus evaluaciones, notas, comentarios y pautas realizadas, sin permisos de edición.",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Demo hospital
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
          Flujo de presentación
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-500">
          Guion práctico para mostrar Quirón como piloto clínico docente:
          desde la creación del alumno hasta la evaluación, revisión del
          alumno y respaldo administrativo.
        </p>
      </header>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        {demoRoles.map((role) => (
          <article
            key={role.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Perfil
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {role.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {role.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mb-8 rounded-lg border border-indigo-100 bg-indigo-50 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-indigo-950">
              Antes de presentar
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-indigo-900 md:grid-cols-2">
              <p>Usar alumnos ficticios o anonimizados.</p>
              <p>Tener una cuenta admin, una docente y una de alumno.</p>
              <p>Preparar al menos un alumno con tutor asignado.</p>
              <p>Preparar una evaluación ya guardada y otra para crear en vivo.</p>
            </div>
          </div>

          <Link
            href="/demo/seed"
            className="w-fit rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Crear datos demo
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        {demoSteps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="grid gap-5 lg:grid-cols-[220px_1fr_auto] lg:items-start">
              <div>
                <p className="text-sm font-semibold text-indigo-600">
                  Paso {index + 1}
                </p>
                <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {step.role}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Tiempo sugerido: {step.time}
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.objective}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Acciones
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {step.actions.map((action) => (
                        <li key={action} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Resultado esperado
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.result}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={step.href}
                className="w-fit rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                {step.cta}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Cierre sugerido
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          El mensaje central para el hospital: Quirón ordena la práctica
          clínica, reduce planillas dispersas, deja trazabilidad por tutor y
          permite que el alumno vea retroalimentación sin alterar la
          información oficial.
        </p>
      </section>
    </div>
  );
}
