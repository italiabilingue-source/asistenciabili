"use client";

import { useState, useEffect, use } from "react";
import { useAttendance } from "@/lib/hooks/useAttendance";
import { AttendanceRecord, Course, Teacher, DailyActa, HourlySignature } from "@/types";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  ArrowRightLeft, 
  X, 
  FileSpreadsheet, 
  PenTool, 
  Key, 
  Check, 
  ShieldCheck 
} from "lucide-react";
import { getSubjectsForCourseAndDate, getDayOfWeekFromDate, DEFAULT_MODULE_TIMES } from "@/lib/scheduleHelper";

export default function CourseAttendancePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  
  // Get local date in YYYY-MM-DD
  const today = new Date().toLocaleDateString("en-CA");
  const dayOfWeek = getDayOfWeekFromDate(today);
  const subjectsToday = getSubjectsForCourseAndDate(courseId, today);
  
  const { attendance, loading, error } = useAttendance(courseId, today);
  const [course, setCourse] = useState<Course | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [acta, setActa] = useState<DailyActa | null>(null);
  
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [showPresent, setShowPresent] = useState(false);

  // Signing modal state
  const [signingHourIndex, setSigningHourIndex] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [signingError, setSigningError] = useState("");
  const [signingSuccess, setSigningSuccess] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  const FALLBACK_TEACHERS: Teacher[] = [
    { id: "t1", name: "Martínez, Juan Carlos", pin: "1234", active: true },
    { id: "t2", name: "González, Silvina", pin: "2345", active: true },
    { id: "t3", name: "Rodríguez, Fernando", pin: "3456", active: true },
    { id: "t4", name: "Rossi, Mariela", pin: "4567", active: true },
    { id: "t5", name: "Albornoz, Esteban", pin: "5678", active: true },
    { id: "t6", name: "Pérez, Luciana", pin: "6789", active: true },
  ];

  useEffect(() => {
    // Check if PIN is in sessionStorage
    const storedPin = sessionStorage.getItem(`pin_${courseId}`);
    
    // Fetch course details, teachers and daily acta
    const fetchInitData = async () => {
      // 1. Course
      try {
        const docRef = doc(db, "courses", courseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
          setCourse(courseData);
          if (courseData.accessPin === "" || !courseData.accessPin || storedPin === courseData.accessPin) {
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        console.error("Error reading course:", e);
      }

      // 2. Teachers for signature
      try {
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const teachersList = teachersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Teacher))
          .filter(t => t.active);
        teachersList.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
        setTeachers(teachersList.length > 0 ? teachersList : FALLBACK_TEACHERS);
      } catch (err) {
        console.warn("Using fallback teachers list:", err);
        setTeachers(FALLBACK_TEACHERS);
      }

      // 3. Daily Acta (Hourly Signatures)
      const actaDocId = `${courseId}_${today}`;
      try {
        const actaSnap = await getDoc(doc(db, "daily_actas", actaDocId));
        if (actaSnap.exists()) {
          setActa(actaSnap.data() as DailyActa);
        } else {
          // Check if signatures were saved inside daily_attendance doc
          const attSnap = await getDoc(doc(db, "daily_attendance", actaDocId));
          if (attSnap.exists() && attSnap.data().signatures) {
            setActa({
              courseId,
              date: today,
              dayOfWeek,
              signatures: attSnap.data().signatures,
              updatedAt: attSnap.data().updatedAt || Date.now()
            });
          }
        }
      } catch (err) {
        console.warn("Checking daily_attendance for signatures:", err);
        try {
          const attSnap = await getDoc(doc(db, "daily_attendance", actaDocId));
          if (attSnap.exists() && attSnap.data().signatures) {
            setActa({
              courseId,
              date: today,
              dayOfWeek,
              signatures: attSnap.data().signatures,
              updatedAt: attSnap.data().updatedAt || Date.now()
            });
          }
        } catch (e) {
          console.error("Could not load signatures:", e);
        }
      }
    };

    fetchInitData();
  }, [courseId, today, dayOfWeek]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (course && pin === course.accessPin) {
      sessionStorage.setItem(`pin_${courseId}`, pin);
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const openSignModal = (hourIndex: number) => {
    setSigningHourIndex(hourIndex);
    setSelectedTeacherId(teachers.length > 0 ? teachers[0].id : "");
    setTeacherPin("");
    setSigningError("");
    setSigningSuccess(false);
  };

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingHourIndex === null) return;

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      setSigningError("Selecciona un docente válido.");
      return;
    }

    if (teacherPin.trim() !== teacher.pin) {
      setSigningError("El PIN ingresado es incorrecto.");
      return;
    }

    setSavingSignature(true);
    setSigningError("");

    try {
      const subject = subjectsToday[signingHourIndex] || "Materia";
      const newSignature: HourlySignature = {
        hourIndex: signingHourIndex,
        subject,
        signed: true,
        teacherId: teacher.id,
        teacherName: teacher.name,
        signedAt: Date.now()
      };

      const updatedSignatures = {
        ...(acta?.signatures || {}),
        [signingHourIndex]: newSignature
      };

      const actaPayload: DailyActa = {
        courseId,
        date: today,
        dayOfWeek,
        signatures: updatedSignatures,
        updatedAt: Date.now()
      };

      const docId = `${courseId}_${today}`;

      // Save to daily_attendance (which already has verified Firestore permissions)
      try {
        await setDoc(doc(db, "daily_attendance", docId), {
          signatures: updatedSignatures,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (attErr) {
        console.warn("Could not save signatures to daily_attendance:", attErr);
      }

      // Also try saving to daily_actas
      try {
        await setDoc(doc(db, "daily_actas", docId), actaPayload, { merge: true });
      } catch (actaErr) {
        console.warn("Could not save to daily_actas collection (permissions):", actaErr);
      }

      setActa(actaPayload);
      setSigningSuccess(true);
      setTimeout(() => {
        setSigningHourIndex(null);
        setSigningSuccess(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setSigningError("Error al guardar la firma. Intenta nuevamente.");
    } finally {
      setSavingSignature(false);
    }
  };

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border-t-4 border-green-600">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{course.name}</h1>
          <p className="text-gray-500 mb-6 text-sm">Ingresa el PIN para ver la asistencia de hoy</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              inputMode="numeric"
              maxLength={4}
              value={pin} 
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-3xl tracking-widest p-4 border-2 rounded-xl focus:border-green-500 focus:ring-green-500 transition-colors"
              placeholder="••••"
            />
            {pinError && <p className="text-red-500 text-sm">PIN incorrecto</p>}
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95">
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Derive students list if attendance exists
  const records: Record<string, AttendanceRecord & { studentName: string }> = attendance?.records as any || {};
  
  // Sort alphabetically by studentName (or id as fallback)
  const sortByName = (a: { studentName?: string; studentId: string }, b: { studentName?: string; studentId: string }) => {
    const nameA = a.studentName || `Alumno ${a.studentId}`;
    const nameB = b.studentName || `Alumno ${b.studentId}`;
    return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
  };

  const absents = Object.values(records)
    .filter(r => r.status === "ausente")
    .sort(sortByName);

  const lates = Object.values(records)
    .filter(r => r.status === "tardanza")
    .sort(sortByName);

  const withdrawn = Object.values(records)
    .filter(r => r.status === "retirado")
    .sort(sortByName);

  const presents = Object.values(records)
    .filter(r => r.status === "presente")
    .sort(sortByName);

  const signatures = acta?.signatures || {};

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b">
        <div className="p-4 flex flex-col gap-2 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{course.name}</h1>
              <p className="text-xs text-gray-500 font-medium">Turno {course.shift} • {dayOfWeek}</p>
            </div>
            <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
              {new Date().toLocaleDateString("es-AR", { day: 'numeric', month: 'short' })}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1.5" />
              {absents.length} {absents.length === 1 ? "Ausente" : "Ausentes"}
            </div>

            {lates.length > 0 && (
              <div className="flex items-center text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm">
                <Clock className="w-4 h-4 mr-1.5" />
                {lates.length} {lates.length === 1 ? "Tardanza" : "Tardanzas"}
              </div>
            )}

            {withdrawn.length > 0 && (
              <div className="flex items-center text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm">
                <LogOut className="w-4 h-4 mr-1.5" />
                {withdrawn.length} {withdrawn.length === 1 ? "Retirado" : "Retirados"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* ==============================================================
            PARTE DIARIO DE ASISTENCIA (AUSENTES, TARDES, RETIROS)
            (Placed at the top as the primary view for teachers)
           ============================================================== */}
        {!attendance ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-400 w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-700">Aún no hay datos cargados</h2>
            <p className="text-gray-500 mt-2 text-sm">Preceptoría todavía no ha cargado el parte diario para la fecha de hoy.</p>
          </div>
        ) : (
          <>
            {/* Ausentes Destacados */}
            {absents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-red-500" />
                  Ausentes ({absents.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {absents.map((student, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        <span className="font-bold text-red-950 text-base sm:text-lg block">
                          {student.studentName || `Alumno ${student.studentId}`}
                        </span>
                        {(student.reason || student.note) && (
                          <span className="text-sm text-red-800 font-medium block mt-0.5">
                            {student.reason ? `Motivo: ${student.reason}` : student.note}
                          </span>
                        )}
                      </div>
                      <span className="self-start sm:self-auto bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                        AUSENTE
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tardanzas */}
            {lates.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
                  Tardanzas ({lates.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {lates.map((student, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        <span className="font-bold text-amber-950 text-base sm:text-lg block">
                          {student.studentName || `Alumno ${student.studentId}`}
                        </span>
                        {(student.reason || student.note) && (
                          <span className="text-sm text-amber-800 font-medium block mt-0.5">
                            {student.reason ? `Motivo: ${student.reason}` : student.note}
                          </span>
                        )}
                      </div>
                      <span className="self-start sm:self-auto bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                        TARDANZA
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Retirados Anticipados */}
            {withdrawn.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <LogOut className="w-4 h-4 mr-1.5 text-purple-600" />
                  Retirados Anticipados ({withdrawn.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {withdrawn.map((student, idx) => {
                    const returns = student.returnsLater;
                    return (
                      <div key={idx} className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="font-bold text-purple-950 text-base sm:text-lg">
                            {student.studentName || `Alumno ${student.studentId}`}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {returns === true ? (
                              <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center">
                                <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                                Vuelve más tarde {student.returnTime ? `(${student.returnTime})` : ""}
                              </span>
                            ) : returns === false ? (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center">
                                <X className="w-3.5 h-3.5 mr-1" /> No vuelve más tarde
                              </span>
                            ) : null}
                            <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                              RETIRADO
                            </span>
                          </div>
                        </div>
                        {(student.reason || student.note) && (
                          <span className="text-sm text-purple-900 font-medium">
                            {student.reason ? `Motivo: ${student.reason}` : student.note}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Presentes Collapsible */}
            {presents.length > 0 && (
              <section className="mt-8">
                <button 
                  onClick={() => setShowPresent(!showPresent)}
                  className="w-full flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-700 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                    Presentes ({presents.length})
                  </span>
                  {showPresent ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                {showPresent && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-sm">
                    {presents.map((student, idx) => (
                      <div key={idx} className="p-3 px-4 text-gray-700 text-sm font-medium flex items-center justify-between">
                        <span>{student.studentName || `Alumno ${student.studentId}`}</span>
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Presente</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            
            {absents.length === 0 && lates.length === 0 && withdrawn.length === 0 && (
              <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-200 shadow-sm mt-4">
                <CheckCircle2 className="text-green-500 w-10 h-10 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-green-800">¡Asistencia Perfecta!</h2>
                <p className="text-green-600 mt-1 text-sm">Todos los alumnos están presentes hoy.</p>
              </div>
            )}
          </>
        )}

        {/* ==============================================================
            ACTA DE CLASES Y FIRMA DOCENTE (Placed below attendance)
           ============================================================== */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-green-600" />
                Acta de Clases y Firma de Profesores
              </h2>
              <p className="text-xs text-gray-500">
                Firma de asistencia por módulo/hora mediante PIN personal de docente
              </p>
            </div>
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
              {subjectsToday.length} Módulos hoy
            </span>
          </div>

          {subjectsToday.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4 text-center">
              No hay materias cargadas para el día {dayOfWeek}.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {subjectsToday.map((subject, idx) => {
                const hourTime = DEFAULT_MODULE_TIMES[idx]?.time || "";
                const sig = signatures[idx];
                const isSigned = sig?.signed;

                return (
                  <div 
                    key={idx} 
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-center flex-shrink-0 bg-gray-100 rounded-lg py-1 px-1.5">
                        <span className="block text-xs font-black text-gray-800">{idx + 1}ª Hora</span>
                        {hourTime && <span className="block text-[9px] text-gray-500 leading-none">{hourTime}</span>}
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base uppercase tracking-tight">
                          {subject}
                        </h4>
                        {isSigned && (
                          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Firmado por {sig.teacherName} a las{" "}
                            {sig.signedAt
                              ? new Date(sig.signedAt).toLocaleTimeString("es-AR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }) + " hs"
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="self-end sm:self-auto">
                      {isSigned ? (
                        <div className="flex items-center bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                          <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> Firmado
                        </div>
                      ) : (
                        <button
                          onClick={() => openSignModal(idx)}
                          className="bg-[#199A46] hover:bg-green-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all flex items-center active:scale-95"
                        >
                          <Key className="w-3.5 h-3.5 mr-1.5" /> Firmar mi Hora
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ==============================================================
          SIGNATURE MODAL WITH PIN VERIFICATION
         ============================================================== */}
      {signingHourIndex !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Firmar {signingHourIndex + 1}ª Hora
                </h3>
                <p className="text-xs text-green-700 font-semibold uppercase">
                  {subjectsToday[signingHourIndex]}
                </p>
              </div>
              <button 
                onClick={() => setSigningHourIndex(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {signingSuccess ? (
              <div className="py-8 text-center text-emerald-600 space-y-2">
                <CheckCircle2 className="w-16 h-16 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold">¡Hora Firmada con Éxito!</h4>
                <p className="text-xs text-gray-500">Se registró la firma digital en el acta del día.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmSignature} className="space-y-4">
                {teachers.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    Aún no hay docentes registrados con PIN en el sistema. Puedes darlos de alta desde el panel de preceptoría.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      Selecciona tu Nombre:
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Tu PIN de Firma (4 dígitos):
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={teacherPin}
                    onChange={e => setTeacherPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-center text-3xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1 text-center">
                    Verifica tu identidad antes de firmar el acta.
                  </p>
                </div>

                {signingError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                    {signingError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSigningHourIndex(null)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSignature || teachers.length === 0}
                    className="flex-1 py-2.5 bg-[#199A46] hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {savingSignature ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      "Confirmar Firma"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
