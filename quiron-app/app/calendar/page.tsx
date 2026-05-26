"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, getDocs } from "firebase/firestore";

import { useCurrentUserPermissions } from "../hooks/useCurrentUserPermissions";
import { db } from "../lib/firebase";
import {
  AreaRotation,
  formatRotationDate,
  parseLocalDate,
} from "../lib/rotations";
import { canUserAccessStudent } from "../lib/tutors";

type Student = {
  id: string;
  name: string;
  email?: string;
  university?: string;
  area?: string;
  areas?: string[];
  rotations?: AreaRotation[];
  tutor?: string;
  tutorEmails?: string[];
};

type CalendarEvent = {
  id: string;
  studentId: string;
  studentName: string;
  area: string;
  date: Date;
  dateKey: string;
  type: "start" | "end";
  room?: string;
};

const weekdays = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

const monthFormatter = new Intl.DateTimeFormat("es-CL", {
  month: "long",
  year: "numeric",
});

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDays(month: Date) {
  const start = monthStart(month);
  const mondayOffset = (start.getDay() + 6) % 7;
  const firstGridDate = new Date(start);

  firstGridDate.setDate(start.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDate);
    day.setDate(firstGridDate.getDate() + index);

    return day;
  });
}

function rotationEvents(student: Student) {
  return (student.rotations || []).flatMap((rotation, index) => {
    const events: CalendarEvent[] = [];
    const startDate = parseLocalDate(rotation.startDate);
    const endDate = parseLocalDate(rotation.endDate);
    const area = rotation.area || "Rotación";

    if (startDate) {
      events.push({
        id: `${student.id}-${index}-start`,
        studentId: student.id,
        studentName: student.name,
        area,
        date: startDate,
        dateKey: dateKey(startDate),
        type: "start",
        room: rotation.room,
      });
    }

    if (endDate) {
      events.push({
        id: `${student.id}-${index}-end`,
        studentId: student.id,
        studentName: student.name,
        area,
        date: endDate,
        dateKey: dateKey(endDate),
        type: "end",
        room: rotation.room,
      });
    }

    return events;
  });
}

function eventTypeLabel(type: CalendarEvent["type"]) {
  return type === "start" ? "Ingreso" : "Egreso";
}

function eventClassName(type: CalendarEvent["type"]) {
  return type === "start"
    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : "border-rose-100 bg-rose-50 text-rose-800";
}

export default function CalendarPage() {
  const { user, role } =
    useCurrentUserPermissions();
  const [students, setStudents] =
    useState<Student[]>([]);
  const [currentMonth, setCurrentMonth] =
    useState(() => monthStart(new Date()));
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot =
        await getDocs(collection(db, "students"));
      const data = snapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...(studentDoc.data() as Omit<Student, "id">),
        }))
        .filter((student) =>
          canUserAccessStudent(role, user?.email, student)
        )
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      setStudents(data);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }, [role, user?.email]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudents();
    });
  }, [loadStudents]);

  const events = useMemo(
    () =>
      students
        .flatMap(rotationEvents)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [students]
  );

  const visibleDays = useMemo(
    () => calendarDays(currentMonth),
    [currentMonth]
  );

  const eventsByDay = useMemo(
    () =>
      events.reduce<Record<string, CalendarEvent[]>>((summary, event) => {
        summary[event.dateKey] = [
          ...(summary[event.dateKey] || []),
          event,
        ];

        return summary;
      }, {}),
    [events]
  );

  const monthEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.date.getFullYear() === currentMonth.getFullYear() &&
          event.date.getMonth() === currentMonth.getMonth()
      ),
    [currentMonth, events]
  );

  const todayKey = dateKey(new Date());

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Calendario
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
            Ingresos y egresos
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Vista mensual de inicios y términos de rotación por alumno, área y
            sala/unidad cuando esté registrada.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadStudents()}
          className="w-fit rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Actualizar calendario
        </button>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">
            Eventos del mes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "-" : monthEvents.length}
          </p>
        </article>
        <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-700">
            Ingresos
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {loading
              ? "-"
              : monthEvents.filter((event) => event.type === "start").length}
          </p>
        </article>
        <article className="rounded-lg border border-rose-100 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-700">
            Egresos
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {loading
              ? "-"
              : monthEvents.filter((event) => event.type === "end").length}
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold capitalize text-slate-900">
            {monthFormatter.format(currentMonth)}
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((month) => addMonths(month, -1))
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Mes anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(monthStart(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((month) => addMonths(month, 1))
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Mes siguiente
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-7 border-y border-slate-100 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
          {weekdays.map((weekday) => (
            <div key={weekday} className="px-2 py-3">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-7 md:gap-0 md:pt-0">
          {visibleDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay[key] || [];
            const isCurrentMonth =
              day.getMonth() === currentMonth.getMonth();
            const isToday = key === todayKey;

            return (
              <article
                key={key}
                className={`min-h-[150px] rounded-lg border p-3 md:rounded-none md:border-slate-100 ${
                  isCurrentMonth
                    ? "bg-white"
                    : "bg-slate-50 text-slate-400"
                } ${isToday ? "ring-2 ring-indigo-200" : ""}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                  {dayEvents.length > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {loading && isCurrentMonth && (
                    <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                  )}

                  {!loading &&
                    dayEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/students/${event.studentId}`}
                        className={`block rounded-lg border px-2.5 py-2 text-xs font-semibold leading-5 transition hover:brightness-95 ${eventClassName(
                          event.type
                        )}`}
                      >
                        <span className="block">
                          {eventTypeLabel(event.type)} · {event.area}
                        </span>
                        <span className="block font-bold">
                          {event.studentName}
                        </span>
                        {event.room && (
                          <span className="block font-medium">
                            {event.room}
                          </span>
                        )}
                      </Link>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Eventos del mes
        </h2>

        {monthEvents.length === 0 && !loading ? (
          <p className="mt-3 text-sm text-slate-500">
            No hay ingresos ni egresos registrados para este mes.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {monthEvents.map((event) => (
              <Link
                key={`list-${event.id}`}
                href={`/students/${event.studentId}`}
                className={`rounded-lg border px-4 py-3 transition hover:brightness-95 ${eventClassName(
                  event.type
                )}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold">
                      {eventTypeLabel(event.type)} {event.area}
                    </p>
                    <p className="mt-1 text-sm">
                      {event.studentName}
                      {event.room ? ` · ${event.room}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold">
                    {formatRotationDate(event.dateKey)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
