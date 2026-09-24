"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Student, DailyAttendance, DailyActa, HourlySignature, AttendanceRecord } from "@/types";
import { AdminSidebar } from "@/components/AdminSidebar";
import { getSubjectsForCourseAndDate, getDayOfWeekFromDate, DEFAULT_MODULE_TIMES } from "@/lib/scheduleHelper";
import { Printer, Calendar, ArrowLeft, CheckCircle2, AlertCircle, Clock, Users, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default function AdminActasPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [loading, setLoading] = useState(true);

  // Data for selected course & date
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null);
  const [acta, setActa] = useState<DailyActa | null>(null);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      const snap = await getDocs(collection(db, "courses"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourse(list[0].id);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Fetch attendance, students and acta for selected course and date
  useEffect(() => {
    if (!selectedCourse || !date) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Students
      const studSnap = await getDocs(collection(db, "students"));
      const allStud = studSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      const courseStudents = allStud
        .filter(s => s.courseId === selectedCourse)
        .sort((a, b) => {
          const lastComp = (a.lastName || "").trim().localeCompare((b.lastName || "").trim(), "es", { sensitivity: "base" });
          if (lastComp !== 0) return lastComp;
          return (a.firstName || "").trim().localeCompare((b.firstName || "").trim(), "es", { sensitivity: "base" });
        });
      setStudents(courseStudents);

      // 2. Daily Attendance
      const attDocId = `${selectedCourse}_${date}`;
      const attSnap = await getDoc(doc(db, "daily_attendance", attDocId));
      if (attSnap.exists()) {
        setAttendance(attSnap.data() as DailyAttendance);
      } else {
        setAttendance(null);
      }

      // 3. Daily Acta (Hourly Signatures)
      const actaDocId = `${selectedCourse}_${date}`;
      try {
        const actaSnap = await getDoc(doc(db, "daily_actas", actaDocId));
        if (actaSnap.exists()) {
          setActa(actaSnap.data() as DailyActa);
        } else if (attSnap.exists() && attSnap.data().signatures) {
          setActa({
            courseId: selectedCourse,
            date,
            dayOfWeek: getDayOfWeekFromDate(date),
            signatures: attSnap.data().signatures,
            updatedAt: attSnap.data().updatedAt || Date.now()
          });
        } else {
          setActa(null);
        }
      } catch (actaErr) {
        if (attSnap.exists() && attSnap.data().signatures) {
          setActa({
            courseId: selectedCourse,
            date,
            dayOfWeek: getDayOfWeekFromDate(date),
            signatures: attSnap.data().signatures,
            updatedAt: attSnap.data().updatedAt || Date.now()
          });
        } else {
          setActa(null);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedCourse, date]);

  const currentCourse = courses.find(c => c.id === selectedCourse);
  const subjects = getSubjectsForCourseAndDate(selectedCourse, date);
  const dayOfWeek = getDayOfWeekFromDate(date);

  // Derive attendance lists
  const records: Record<string, AttendanceRecord & { studentName?: string }> = attendance?.records || {};

  const sortByName = (a: any, b: any) =>
    (a.studentName || "").localeCompare(b.studentName || "", "es", { sensitivity: "base" });

  const absents = Object.values(records)
    .filter(r => r.status === "ausente")
    .sort(sortByName);

  const lates = Object.values(records)
    .filter(r => r.status === "tardanza")
    .sort(sortByName);

  const withdrawn = Object.values(records)
    .filter(r => r.status === "retirado")
    .sort(sortByName);

  const presentsCount = students.length - absents.length;

  const signatures = acta?.signatures || {};

  const handlePrint = () => {
    window.print();
  };

  // Format date nicely (ej: 24 de Septiembre de 2026)
  const [y, m, d] = date.split("-").map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row print:bg-white">
      {/* Sidebar hidden in print */}
      <div className="print:hidden">
        <AdminSidebar />
      </div>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:max-w-full">
        {/* Controls Bar (Hidden when printing) */}
        <div className="print:hidden mb-6 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                Parte Diario y Acta de Clases
              </h2>
              <p className="text-gray-500 text-sm">
                Generación de la planilla oficial diaria lista para imprimir al final de la jornada.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500"
              />

              <button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center transition-all"
              >
                <Printer className="w-5 h-5 mr-2" /> Imprimir Planilla
              </button>

              <Link
                href="/admin/asistencia"
                className="text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                Cargar Asistencia
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 print:hidden">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          /* ==============================================================
             OFFICIAL PRINTABLE SHEET (Matching paper layout from Excel)
             ============================================================== */
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 print:shadow-none print:border-none print:p-0 print:rounded-none max-w-5xl mx-auto print:max-w-full text-black">
            
            {/* Header with Institution Logo / Flags */}
            <div className="border-b-2 border-black pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-400 flex items-center justify-center flex-shrink-0">
                    <div className="w-1/3 h-full bg-[#199A46]"></div>
                    <div className="w-1/3 h-full bg-white"></div>
                    <div className="w-1/3 h-full bg-[#CE2B37]"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider leading-tight">
                      Instituto República de Italia D-201
                    </h1>
                    <p className="text-xs uppercase font-semibold text-gray-700">
                      Nivel Secundario • Preceptoría
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black border-2 border-black px-3 py-1 uppercase rounded-md tracking-wider">
                    PARTE DIARIO OFICIAL
                  </span>
                </div>
              </div>

              {/* Course & Date metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-300 text-xs font-bold uppercase">
                <div>
                  <span className="text-gray-600 block text-[10px]">CURSO:</span>
                  <span className="text-sm">{currentCourse?.name || "1° Año"}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">TURNO:</span>
                  <span className="text-sm">{currentCourse?.shift || "Mañana"}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">DÍA:</span>
                  <span className="text-sm">{dayOfWeek}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">FECHA:</span>
                  <span className="text-sm">{date}</span>
                </div>
              </div>
            </div>

            {/* Main Hourly Subjects & Signatures Table */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100 text-center font-black uppercase text-[11px] border-b border-black">
                    <th className="border border-black p-2 w-16">Hora</th>
                    <th className="border border-black p-2 text-left w-64">Asignatura</th>
                    <th className="border border-black p-2 w-56">Firma Profesor</th>
                    <th className="border border-black p-2 text-left">Alumnos Ausentes</th>
                    <th className="border border-black p-2 text-left w-48">Inasistencia Justificada / Motivo</th>
                    <th className="border border-black p-2 text-left w-52">Observaciones (Tardanzas / Retiros)</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-black p-6 text-center text-gray-500 italic">
                        No hay materias programadas para el día {dayOfWeek} en este curso.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((subject, idx) => {
                      const hourTime = DEFAULT_MODULE_TIMES[idx]?.time || "";
                      const sig = signatures[idx];
                      const isSigned = sig?.signed;

                      // Display absent students in corresponding rows
                      const absentItem = absents[idx];

                      return (
                        <tr key={idx} className="border-b border-gray-400">
                          {/* Hora */}
                          <td className="border border-black p-1.5 text-center font-bold">
                            <div>{idx + 1}ª</div>
                            {hourTime && <div className="text-[9px] text-gray-600 font-normal">{hourTime}</div>}
                          </td>

                          {/* Asignatura */}
                          <td className="border border-black p-1.5 font-bold uppercase">
                            {subject}
                          </td>

                          {/* Firma Profesor */}
                          <td className="border border-black p-1.5 text-center align-middle">
                            {isSigned ? (
                              <div className="bg-emerald-50 border border-emerald-300 rounded p-1 text-[10px] leading-tight text-emerald-900">
                                <div className="font-bold flex items-center justify-center gap-1 text-emerald-800">
                                  <span>✓ FIRMADO</span>
                                </div>
                                <div className="font-semibold truncate">{sig.teacherName || "Profesor"}</div>
                                <div className="text-[9px] text-gray-600">
                                  {sig.signedAt
                                    ? new Date(sig.signedAt).toLocaleTimeString("es-AR", {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      }) + " hs"
                                    : "Registrado"}
                                </div>
                              </div>
                            ) : (
                              <div className="h-9 flex flex-col justify-end">
                                <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-1"></div>
                                <span className="text-[9px] text-gray-400 italic">Pendiente</span>
                              </div>
                            )}
                          </td>

                          {/* Alumnos Ausentes (One per row if available) */}
                          <td className="border border-black p-1.5 font-semibold">
                            {absentItem ? (
                              <span className="text-rose-950 font-bold">
                                {absentItem.studentName || `Alumno ${absentItem.studentId}`}
                              </span>
                            ) : (
                              idx === 0 && absents.length === 0 ? (
                                <span className="text-gray-400 italic">Sin ausentes</span>
                              ) : null
                            )}
                          </td>

                          {/* Inasistencia Justificada / Motivo */}
                          <td className="border border-black p-1.5 text-[11px]">
                            {absentItem ? (
                              absentItem.reason || (absentItem.note ? absentItem.note.replace(/^Motivo:\s*/, "") : "Sin especificar")
                            ) : null}
                          </td>

                          {/* Observaciones (Tardanzas y Retiros) */}
                          <td className="border border-black p-1.5 text-[11px] leading-tight">
                            {/* Render withdrawals and lates on early rows */}
                            {idx === 0 && lates.length > 0 && (
                              <div className="mb-1 text-amber-900">
                                <span className="font-bold underline">Tardanzas:</span>{" "}
                                {lates.map(l => `${l.studentName || l.studentId}${l.reason ? ` (${l.reason})` : ""}`).join("; ")}
                              </div>
                            )}

                            {idx === (lates.length > 0 ? 1 : 0) && withdrawn.length > 0 && (
                              <div className="text-purple-900">
                                <span className="font-bold underline">Retiros:</span>{" "}
                                {withdrawn.map(w => 
                                  `${w.studentName || w.studentId} - ${w.returnsLater ? `Vuelve${w.returnTime ? ` (${w.returnTime})` : ""}` : "No vuelve"}${w.reason ? ` [${w.reason}]` : ""}`
                                ).join("; ")}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* If more absents than rows, show remaining absents in extended summary */}
            {absents.length > subjects.length && (
              <div className="border border-black p-2 mb-4 text-xs">
                <span className="font-bold uppercase text-rose-900 block mb-1">
                  Otros alumnos ausentes en la jornada:
                </span>
                <div className="grid grid-cols-2 gap-x-4">
                  {absents.slice(subjects.length).map((a, i) => (
                    <div key={i} className="flex justify-between border-b border-gray-200 py-0.5">
                      <span className="font-semibold">{a.studentName}</span>
                      <span className="text-gray-600">{a.reason || a.note || "Sin justificar"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Counters & Summary Block */}
            <div className="border-2 border-black p-3 mb-6 bg-gray-50 flex flex-wrap justify-between items-center text-xs font-bold uppercase gap-2">
              <div>
                <span>Matrícula Total:</span> <span className="text-sm font-black">{students.length}</span>
              </div>
              <div className="text-emerald-800">
                <span>Presentes:</span> <span className="text-sm font-black">{presentsCount}</span>
              </div>
              <div className="text-rose-800">
                <span>Ausentes:</span> <span className="text-sm font-black">{absents.length}</span>
              </div>
              <div className="text-amber-800">
                <span>Tardanzas:</span> <span className="text-sm font-black">{lates.length}</span>
              </div>
              <div className="text-purple-800">
                <span>Retirados:</span> <span className="text-sm font-black">{withdrawn.length}</span>
              </div>
            </div>

            {/* Signatures Footer */}
            <div className="pt-8 mt-6 border-t border-gray-300 flex justify-around text-center text-xs font-bold uppercase">
              <div className="w-56">
                <div className="border-b border-black mb-1 h-12"></div>
                <span>Firma y Aclaración Preceptor/a</span>
              </div>
              <div className="w-56">
                <div className="border-b border-black mb-1 h-12"></div>
                <span>Firma de Dirección / Vicedirección</span>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
