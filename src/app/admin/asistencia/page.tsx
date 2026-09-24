"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Student, DailyAttendance, AttendanceRecord, AttendanceStatus } from "@/types";
import { Check, X, Clock, Save, Plus, LogOut, Users, AlertCircle, ArrowRightLeft, Sparkles } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";

const COMMON_ABSENCE_REASONS = [
  "Enfermedad",
  "Certificado médico",
  "Sin aviso",
  "Motivo personal",
  "Turno médico"
];

const COMMON_LATE_REASONS = [
  "Problema de transporte",
  "Turno médico",
  "Trámite familiar",
  "Sin aviso"
];

const COMMON_WITHDRAW_REASONS = [
  "Descompuesto / Malestar",
  "Retiro con tutor/padre",
  "Turno médico",
  "Trámite familiar",
  "Autorizado"
];

export default function AdminAttendancePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [students, setStudents] = useState<Student[]>([]);
  
  // records state maps studentId -> AttendanceRecord
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Fetch Students & Attendance for selected course and date
  useEffect(() => {
    if (!selectedCourse) return;
    
    const fetchStudentsAndAttendance = async () => {
      setLoading(true);
      const studSnapshot = await getDocs(collection(db, "students"));
      const allStudents = studSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      
      // Filter by selected course and sort alphabetically by last name, then first name
      const courseStudents = allStudents
        .filter(s => s.courseId === selectedCourse)
        .sort((a, b) => {
          const lastComp = (a.lastName || "").trim().localeCompare((b.lastName || "").trim(), "es", { sensitivity: "base" });
          if (lastComp !== 0) return lastComp;
          return (a.firstName || "").trim().localeCompare((b.firstName || "").trim(), "es", { sensitivity: "base" });
        });
      
      setStudents(courseStudents);

      // Fetch Attendance
      const docId = `${selectedCourse}_${date}`;
      const attSnap = await getDoc(doc(db, "daily_attendance", docId));
      
      if (attSnap.exists()) {
        const attData = attSnap.data() as DailyAttendance;
        const loadedRecords = attData.records || {};
        
        // Ensure every student has a record initialized
        const mergedRecords: Record<string, AttendanceRecord> = {};
        courseStudents.forEach(s => {
          if (loadedRecords[s.id]) {
            mergedRecords[s.id] = {
              studentId: s.id,
              status: loadedRecords[s.id].status || "presente",
              reason: loadedRecords[s.id].reason ?? (loadedRecords[s.id].note || ""),
              returnsLater: loadedRecords[s.id].returnsLater,
              returnTime: loadedRecords[s.id].returnTime || "",
              note: loadedRecords[s.id].note || ""
            };
          } else {
            mergedRecords[s.id] = { studentId: s.id, status: "presente" };
          }
        });
        setRecords(mergedRecords);
      } else {
        // Initialize records as Present by default for loaded students
        const initialRecords: Record<string, AttendanceRecord> = {};
        courseStudents.forEach(s => {
          initialRecords[s.id] = { studentId: s.id, status: "presente" };
        });
        setRecords(initialRecords);
      }
      setLoading(false);
    };

    fetchStudentsAndAttendance();
  }, [selectedCourse, date]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => {
      const current = prev[studentId] || { studentId, status: "presente" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          studentId,
          status,
          // When switching to retirado, default returnsLater to false if not set
          returnsLater: status === "retirado" ? (current.returnsLater ?? false) : current.returnsLater
        }
      };
    });
  };

  const updateReason = (studentId: string, reason: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId, status: "presente" }),
        reason
      }
    }));
  };

  const updateReturnsLater = (studentId: string, returnsLater: boolean) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId, status: "retirado" }),
        returnsLater
      }
    }));
  };

  const updateReturnTime = (studentId: string, returnTime: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId, status: "retirado" }),
        returnTime
      }
    }));
  };

  const markAllPresent = () => {
    const newRecords: Record<string, AttendanceRecord> = {};
    students.forEach(s => {
      newRecords[s.id] = { studentId: s.id, status: "presente" };
    });
    setRecords(newRecords);
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    
    // Add student names to records and build note string for backwards compatibility
    const recordsWithNames: Record<string, any> = {};
    Object.keys(records).forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      const rec = records[studentId];

      let computedNote = "";
      if (rec.status === "ausente") {
        computedNote = rec.reason?.trim() ? `Motivo: ${rec.reason.trim()}` : "";
      } else if (rec.status === "tardanza") {
        computedNote = rec.reason?.trim() ? `Motivo: ${rec.reason.trim()}` : "";
      } else if (rec.status === "retirado") {
        const parts: string[] = [];
        if (rec.reason?.trim()) parts.push(`Motivo: ${rec.reason.trim()}`);
        if (rec.returnsLater === true) {
          parts.push(`Vuelve más tarde${rec.returnTime?.trim() ? ` (${rec.returnTime.trim()})` : ""}`);
        } else if (rec.returnsLater === false) {
          parts.push("No vuelve más tarde");
        }
        computedNote = parts.join(" | ");
      }

      recordsWithNames[studentId] = {
        ...rec,
        studentName: student ? `${student.lastName}, ${student.firstName}` : "Desconocido",
        note: computedNote
      };
    });

    const docId = `${selectedCourse}_${date}`;
    const payload: DailyAttendance = {
      courseId: selectedCourse,
      date,
      updatedAt: Date.now(),
      records: recordsWithNames
    };

    try {
      await setDoc(doc(db, "daily_attendance", docId), payload);
      alert("¡Parte diario guardado exitosamente!");
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Count summaries
  const presentCount = students.filter(s => (records[s.id]?.status || "presente") === "presente").length;
  const absentCount = students.filter(s => records[s.id]?.status === "ausente").length;
  const lateCount = students.filter(s => records[s.id]?.status === "tardanza").length;
  const withdrawCount = students.filter(s => records[s.id]?.status === "retirado").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parte Diario</h2>
            <p className="text-gray-500">Carga rápida de inasistencias, tardanzas y retiros anticipados</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={selectedCourse} 
              onChange={e => setSelectedCourse(e.target.value)}
              className="flex-1 md:w-52 bg-white border border-gray-300 text-gray-900 font-medium rounded-xl px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="flex-1 md:w-44 bg-white border border-gray-300 text-gray-900 font-medium rounded-xl px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay alumnos</h3>
            <p className="text-gray-500 mb-4">No se encontraron alumnos para este curso.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header info & quick actions */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800 mr-2 text-sm sm:text-base">
                  {students.length} Alumnos (ordenados alfabéticamente)
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {presentCount} Presentes
                </span>
                {absentCount > 0 && (
                  <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {absentCount} Ausentes
                  </span>
                )}
                {lateCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {lateCount} Tardanzas
                  </span>
                )}
                {withdrawCount > 0 && (
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {withdrawCount} Retirados
                  </span>
                )}
              </div>

              <button 
                onClick={markAllPresent}
                className="text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium shadow-sm transition-colors self-stretch sm:self-auto text-center"
              >
                Marcar Todos Presentes
              </button>
            </div>
            
            {/* Student attendance list */}
            <ul className="divide-y divide-gray-200">
              {students.map((student, index) => {
                const rec = records[student.id] || { studentId: student.id, status: "presente" };
                const status = rec.status;
                const isPresent = status === "presente";
                const isAbsent = status === "ausente";
                const isLate = status === "tardanza";
                const isWithdrawn = status === "retirado";

                return (
                  <li 
                    key={student.id} 
                    className={`p-4 transition-colors ${
                      isAbsent 
                        ? "bg-rose-50/30" 
                        : isLate 
                        ? "bg-amber-50/30" 
                        : isWithdrawn 
                        ? "bg-purple-50/30" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Top row: Name & Status buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-6">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="font-bold text-gray-900 text-base">
                            {student.lastName}, {student.firstName}
                          </p>
                          
                          {/* Inline indicators when not present */}
                          {!isPresent && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                              {isAbsent && (
                                <span className="bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded">
                                  Ausente {rec.reason ? `• ${rec.reason}` : ""}
                                </span>
                              )}
                              {isLate && (
                                <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                                  Tardanza {rec.reason ? `• ${rec.reason}` : ""}
                                </span>
                              )}
                              {isWithdrawn && (
                                <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                                  Retirado {rec.returnsLater ? "(Vuelve más tarde)" : "(No vuelve)"} {rec.reason ? `• ${rec.reason}` : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 4 Status Switch Buttons */}
                      <div className="flex bg-gray-100/90 p-1 rounded-xl w-full lg:w-auto shadow-inner">
                        <button 
                          onClick={() => setStatus(student.id, "presente")}
                          className={`flex-1 lg:flex-none flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                            isPresent 
                              ? "bg-emerald-600 text-white shadow-sm font-bold" 
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                          }`}
                        >
                          <Check className="w-4 h-4 mr-1 sm:mr-1.5" /> Presente
                        </button>

                        <button 
                          onClick={() => setStatus(student.id, "ausente")}
                          className={`flex-1 lg:flex-none flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                            isAbsent 
                              ? "bg-rose-600 text-white shadow-sm font-bold" 
                              : "text-gray-600 hover:text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          <X className="w-4 h-4 mr-1 sm:mr-1.5" /> Ausente
                        </button>

                        <button 
                          onClick={() => setStatus(student.id, "tardanza")}
                          className={`flex-1 lg:flex-none flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                            isLate 
                              ? "bg-amber-500 text-white shadow-sm font-bold" 
                              : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          <Clock className="w-4 h-4 mr-1 sm:mr-1.5" /> Tarde
                        </button>

                        <button 
                          onClick={() => setStatus(student.id, "retirado")}
                          className={`flex-1 lg:flex-none flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                            isWithdrawn 
                              ? "bg-purple-600 text-white shadow-sm font-bold" 
                              : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                          }`}
                        >
                          <LogOut className="w-4 h-4 mr-1 sm:mr-1.5" /> Retiro
                        </button>
                      </div>
                    </div>

                    {/* Detailed input section when not present */}
                    {isAbsent && (
                      <div className="mt-3 ml-0 sm:ml-9 p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                            Motivo de la ausencia:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {COMMON_ABSENCE_REASONS.map(quickReason => (
                              <button
                                key={quickReason}
                                type="button"
                                onClick={() => updateReason(student.id, quickReason)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  rec.reason === quickReason
                                    ? "bg-rose-600 text-white border-rose-600 font-semibold"
                                    : "bg-white text-rose-800 border-rose-300 hover:bg-rose-100"
                                }`}
                              >
                                {quickReason}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Escribe el motivo de la inasistencia (ej. Fiebre, viaje, trámite)..."
                          value={rec.reason || ""}
                          onChange={e => updateReason(student.id, e.target.value)}
                          className="w-full bg-white border border-rose-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                        />
                      </div>
                    )}

                    {isLate && (
                      <div className="mt-3 ml-0 sm:ml-9 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                            Motivo / Detalle de llegada tarde:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {COMMON_LATE_REASONS.map(quickReason => (
                              <button
                                key={quickReason}
                                type="button"
                                onClick={() => updateReason(student.id, quickReason)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  rec.reason === quickReason
                                    ? "bg-amber-600 text-white border-amber-600 font-semibold"
                                    : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                                }`}
                              >
                                {quickReason}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Escribe el motivo o detalle (ej. Llegó 8:25 hs por tránsito, turno médico)..."
                          value={rec.reason || ""}
                          onChange={e => updateReason(student.id, e.target.value)}
                          className="w-full bg-white border border-amber-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    )}

                    {isWithdrawn && (
                      <div className="mt-3 ml-0 sm:ml-9 p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                        {/* Motivo de la retirada */}
                        <div className="space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <label className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                              Motivo de la retirada:
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {COMMON_WITHDRAW_REASONS.map(quickReason => (
                                <button
                                  key={quickReason}
                                  type="button"
                                  onClick={() => updateReason(student.id, quickReason)}
                                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                    rec.reason === quickReason
                                      ? "bg-purple-600 text-white border-purple-600 font-semibold"
                                      : "bg-white text-purple-800 border-purple-300 hover:bg-purple-100"
                                  }`}
                                >
                                  {quickReason}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Escribe el motivo del retiro (ej. Descompuesto, retirado por su madre)..."
                            value={rec.reason || ""}
                            onChange={e => updateReason(student.id, e.target.value)}
                            className="w-full bg-white border border-purple-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>

                        {/* ¿Vuelve o no más tarde? */}
                        <div className="pt-2 border-t border-purple-200/80">
                          <p className="text-xs font-bold text-purple-900 uppercase tracking-wide mb-2">
                            ¿Vuelve más tarde a clases?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateReturnsLater(student.id, false)}
                              className={`flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                                rec.returnsLater === false
                                  ? "bg-rose-600 text-white ring-2 ring-rose-400"
                                  : "bg-white text-gray-700 border border-purple-200 hover:bg-purple-100/60"
                              }`}
                            >
                              <X className="w-3.5 h-3.5 mr-1.5" /> No vuelve más tarde
                            </button>

                            <button
                              type="button"
                              onClick={() => updateReturnsLater(student.id, true)}
                              className={`flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                                rec.returnsLater === true
                                  ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
                                  : "bg-white text-gray-700 border border-purple-200 hover:bg-purple-100/60"
                              }`}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Sí, vuelve más tarde
                            </button>
                          </div>

                          {/* Campo de hora estimada de regreso si vuelve más tarde */}
                          {rec.returnsLater === true && (
                            <div className="mt-2.5">
                              <label className="text-xs font-semibold text-purple-900 mb-1 block">
                                Hora estimada o detalle de regreso:
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: 11:30 hs / después del almuerzo / al 4to módulo..."
                                value={rec.returnTime || ""}
                                onChange={e => updateReturnTime(student.id, e.target.value)}
                                className="w-full bg-white border border-purple-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            
            {/* Footer with save button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                Los cambios se reflejarán instantáneamente en la pantalla del aula al guardar.
              </p>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto bg-[#199A46] hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {saving ? "Guardando..." : "Guardar Parte Diario"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
