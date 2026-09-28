"use client";

import { useState, useEffect, use } from "react";
import { useAttendance } from "@/lib/hooks/useAttendance";
import { AttendanceRecord, Course, Teacher, DailyActa, HourlySignature, StudentObservation } from "@/types";
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
  ShieldCheck,
  MessageSquare,
  MessageSquarePlus,
  GraduationCap,
  Fingerprint
} from "lucide-react";
import { getSubjectsForCourseAndDate, getDayOfWeekFromDate, DEFAULT_MODULE_TIMES } from "@/lib/scheduleHelper";
import { isBiometricsAvailable, registerBiometrics, verifyBiometrics } from "@/lib/webauthn";

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

  // Remembered teacher on this device
  const [savedTeacher, setSavedTeacher] = useState<Teacher | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Biometrics (Fingerprint / Face ID / Phone Screen Lock)
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [bioStatusMsg, setBioStatusMsg] = useState("");

  // Signing modal state
  const [signingHourIndex, setSigningHourIndex] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [signingError, setSigningError] = useState("");
  const [signingSuccess, setSigningSuccess] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  // Teacher observation modal state
  const [obsModalStudent, setObsModalStudent] = useState<(AttendanceRecord & { studentName?: string }) | null>(null);
  const [obsTeacherId, setObsTeacherId] = useState("");
  const [obsTeacherPin, setObsTeacherPin] = useState("");
  const [obsText, setObsText] = useState("");
  const [obsError, setObsError] = useState("");
  const [obsSuccess, setObsSuccess] = useState(false);
  const [savingObs, setSavingObs] = useState(false);

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
        let teachersList: Teacher[] = [];
        try {
          const teachersSnap = await getDocs(collection(db, "teachers"));
          teachersList = teachersSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Teacher))
            .filter(t => t.active);
        } catch (tErr) {
          console.warn("Could not read teachers collection directly, trying fallback:", tErr);
        }

        // Also check fallback in courses collection
        try {
          const fallbackSnap = await getDoc(doc(db, "courses", "_system_teachers"));
          if (fallbackSnap.exists() && Array.isArray(fallbackSnap.data().list)) {
            const fallbackList = (fallbackSnap.data().list as Teacher[]).filter(t => t.active);
            fallbackList.forEach(ft => {
              if (!teachersList.some(t => t.id === ft.id)) {
                teachersList.push(ft);
              }
            });
          }
        } catch (fbErr) {
          console.warn("Could not read teachers fallback:", fbErr);
        }

        teachersList.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
        setTeachers(teachersList);

        // Check if there is a saved teacher in localStorage
        if (typeof window !== "undefined") {
          const savedId = localStorage.getItem("bili_teacher_id");
          if (savedId) {
            const found = teachersList.find(t => t.id === savedId);
            if (found) {
              setSavedTeacher(found);
              setSelectedTeacherId(found.id);
              setObsTeacherId(found.id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading teachers:", err);
        setTeachers([]);
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

  // Check if phone/device supports biometrics (Face ID, Touch ID, Fingerprint, Screen Lock)
  useEffect(() => {
    isBiometricsAvailable().then(avail => {
      setBiometricsAvailable(avail);
    });
  }, []);

  // Update biometric enabled state when saved teacher changes
  useEffect(() => {
    if (savedTeacher && typeof window !== "undefined") {
      const enabled = localStorage.getItem(`bili_bio_enabled_${savedTeacher.id}`) === "true";
      const credId = localStorage.getItem(`bili_bio_cred_${savedTeacher.id}`);
      setBiometricsEnabled(enabled);
      setBiometricCredentialId(credId);
    } else {
      setBiometricsEnabled(false);
      setBiometricCredentialId(null);
    }
  }, [savedTeacher]);

  const handleToggleBiometrics = async () => {
    if (!savedTeacher) return;
    setBioStatusMsg("");

    if (biometricsEnabled) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`bili_bio_enabled_${savedTeacher.id}`);
        localStorage.removeItem(`bili_bio_cred_${savedTeacher.id}`);
      }
      setBiometricsEnabled(false);
      setBiometricCredentialId(null);
      setBioStatusMsg("Huella/Face ID desactivada en este dispositivo.");
      setTimeout(() => setBioStatusMsg(""), 3000);
      return;
    }

    setIsRegisteringBio(true);
    try {
      const credId = await registerBiometrics(savedTeacher.id, savedTeacher.name);
      if (credId) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`bili_bio_enabled_${savedTeacher.id}`, "true");
          localStorage.setItem(`bili_bio_cred_${savedTeacher.id}`, credId);
        }
        setBiometricsEnabled(true);
        setBiometricCredentialId(credId);
        setBioStatusMsg("¡Huella / Face ID vinculada con éxito!");
      }
    } catch (err: any) {
      console.warn("Biometric enrollment failed:", err);
      setBioStatusMsg(err.message || "No se pudo registrar la huella en este navegador.");
    } finally {
      setIsRegisteringBio(false);
      setTimeout(() => setBioStatusMsg(""), 4000);
    }
  };

  const handleForgetTeacher = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bili_teacher_id");
      localStorage.removeItem("bili_teacher_name");
      if (savedTeacher) {
        localStorage.removeItem(`bili_bio_enabled_${savedTeacher.id}`);
        localStorage.removeItem(`bili_bio_cred_${savedTeacher.id}`);
      }
    }
    setSavedTeacher(null);
    setBiometricsEnabled(false);
    setBiometricCredentialId(null);
    setSelectedTeacherId(teachers.length > 0 ? teachers[0].id : "");
    setTeacherPin("");
    setObsTeacherId(teachers.length > 0 ? teachers[0].id : "");
    setObsTeacherPin("");
  };

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
    if (savedTeacher) {
      setSelectedTeacherId(savedTeacher.id);
    } else {
      setSelectedTeacherId(teachers.length > 0 ? teachers[0].id : "");
    }
    setTeacherPin("");
    setSigningError("");
    setSigningSuccess(false);
  };

  const executeSaveSignature = async (teacherToUse?: Teacher) => {
    if (signingHourIndex === null) return;
    const teacher = teacherToUse || savedTeacher || teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      setSigningError("Selecciona un docente válido.");
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

  const handleConfirmSignatureWithBiometrics = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!savedTeacher) return;
    setSigningError("");

    try {
      const verified = await verifyBiometrics(biometricCredentialId);
      if (!verified) {
        setSigningError("No se pudo verificar la huella o se canceló el desbloqueo.");
        return;
      }
      await executeSaveSignature(savedTeacher);
    } catch (err: any) {
      console.warn("Biometrics error:", err);
      setSigningError("Error de biometría. Puedes usar el botón de 1 toque directo.");
    }
  };

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingHourIndex === null) return;

    const teacher = savedTeacher || teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      setSigningError("Selecciona un docente válido.");
      return;
    }

    // Only verify PIN if teacher is not already remembered on this device
    if (!savedTeacher) {
      if (teacherPin.trim() !== teacher.pin) {
        setSigningError("El PIN ingresado es incorrecto.");
        return;
      }
      if (rememberDevice && typeof window !== "undefined") {
        localStorage.setItem("bili_teacher_id", teacher.id);
        localStorage.setItem("bili_teacher_name", teacher.name);
        setSavedTeacher(teacher);
      }
    }

    await executeSaveSignature(teacher);
  };

  const openObsModal = (student: AttendanceRecord & { studentName?: string }) => {
    setObsModalStudent(student);
    if (savedTeacher) {
      setObsTeacherId(savedTeacher.id);
    } else {
      setObsTeacherId(teachers.length > 0 ? teachers[0].id : "");
    }
    setObsTeacherPin("");
    setObsText("");
    setObsError("");
    setObsSuccess(false);
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsModalStudent) return;

    const teacher = savedTeacher || teachers.find(t => t.id === obsTeacherId);
    if (!teacher) {
      setObsError("Selecciona un docente válido.");
      return;
    }

    // Only verify PIN if teacher is not already remembered on this device
    if (!savedTeacher) {
      if (obsTeacherPin.trim() !== teacher.pin) {
        setObsError("El PIN ingresado es incorrecto.");
        return;
      }
      if (rememberDevice && typeof window !== "undefined") {
        localStorage.setItem("bili_teacher_id", teacher.id);
        localStorage.setItem("bili_teacher_name", teacher.name);
        setSavedTeacher(teacher);
      }
    }

    if (!obsText.trim()) {
      setObsError("Escribe el texto de la observación.");
      return;
    }

    setSavingObs(true);
    setObsError("");

    try {
      const docId = `${courseId}_${today}`;
      const docRef = doc(db, "daily_attendance", docId);
      const snap = await getDoc(docRef);

      const newObs: StudentObservation = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: obsText.trim(),
        author: `Prof. ${teacher.name}`,
        authorRole: "docente",
        timestamp: Date.now()
      };

      const existingData = snap.exists() ? snap.data() : { courseId, date: today, updatedAt: Date.now(), records: {} };
      const currentRecords = existingData.records || {};
      const targetRec = currentRecords[obsModalStudent.studentId] || {
        studentId: obsModalStudent.studentId,
        status: obsModalStudent.status || "presente",
        studentName: obsModalStudent.studentName || `Alumno ${obsModalStudent.studentId}`
      };

      const updatedList = [...(targetRec.observationsList || []), newObs];

      await setDoc(docRef, {
        records: {
          ...currentRecords,
          [obsModalStudent.studentId]: {
            ...targetRec,
            observationsList: updatedList
          }
        },
        updatedAt: Date.now()
      }, { merge: true });

      setObsSuccess(true);
      setTimeout(() => {
        setObsModalStudent(null);
        setObsSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Error saving observation:", err);
      setObsError("Error al guardar la observación. Intenta nuevamente.");
    } finally {
      setSavingObs(false);
    }
  };

  const renderStudentObservations = (student: AttendanceRecord & { studentName?: string }) => {
    const hasPreceptorObs = !!student.observation;
    const teacherObs = student.observationsList || [];

    if (!hasPreceptorObs && teacherObs.length === 0) return null;

    return (
      <div className="mt-2 space-y-1.5 w-full">
        {hasPreceptorObs && (
          <div className="text-xs bg-emerald-50/90 border border-emerald-200 text-emerald-950 rounded-lg p-2 flex items-start gap-1.5">
            <span className="font-bold text-emerald-800 shrink-0">Preceptoría:</span>
            <span>{student.observation}</span>
          </div>
        )}
        {teacherObs.map(obs => (
          <div key={obs.id} className="text-xs bg-blue-50/90 border border-blue-200 text-blue-950 rounded-lg p-2">
            <div className="flex items-center justify-between font-bold text-blue-900 text-[11px] mb-0.5">
              <span>{obs.author}</span>
              <span className="font-normal text-gray-500">
                {new Date(obs.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
              </span>
            </div>
            <p className="text-gray-800">{obs.text}</p>
          </div>
        ))}
      </div>
    );
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
          <div className="flex justify-between items-center gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{course.name}</h1>
              <p className="text-xs text-gray-500 font-medium">Turno {course.shift} • {dayOfWeek}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {savedTeacher && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">Prof. {savedTeacher.name}</span>
                  <button
                    type="button"
                    onClick={handleForgetTeacher}
                    className="text-emerald-700 hover:text-emerald-950 underline text-[10px] ml-0.5 cursor-pointer"
                    title="Cambiar docente en este celular"
                  >
                    (Cambiar)
                  </button>
                </div>
              )}
              <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                {new Date().toLocaleDateString("es-AR", { day: 'numeric', month: 'short' })}
              </div>
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
                    <div key={idx} className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => openObsModal(student)}
                            className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs active:scale-95"
                            title="Agregar observación del profesor"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            + Observación
                          </button>
                          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            AUSENTE
                          </span>
                        </div>
                      </div>
                      {renderStudentObservations(student)}
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
                    <div key={idx} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => openObsModal(student)}
                            className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs active:scale-95"
                            title="Agregar observación del profesor"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            + Observación
                          </button>
                          <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            TARDANZA
                          </span>
                        </div>
                      </div>
                      {renderStudentObservations(student)}
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
                            <button
                              type="button"
                              onClick={() => openObsModal(student)}
                              className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs active:scale-95"
                              title="Agregar observación del profesor"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              + Observación
                            </button>
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
                        {renderStudentObservations(student)}
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
                      <div key={idx} className="p-3 px-4 text-gray-700 text-sm font-medium flex flex-col gap-1.5 hover:bg-gray-50/60 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900">{student.studentName || `Alumno ${student.studentId}`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Presente</span>
                            <button
                              type="button"
                              onClick={() => openObsModal(student)}
                              className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs active:scale-95"
                              title="Agregar observación del profesor"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              + Observación
                            </button>
                          </div>
                        </div>
                        {renderStudentObservations(student)}
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

                    <div className="w-full sm:w-auto pt-1 sm:pt-0">
                      {isSigned ? (
                        <div className="w-full sm:w-auto flex items-center justify-center bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold shadow-sm">
                          <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> Firmado
                        </div>
                      ) : (
                        <button
                          onClick={() => openSignModal(idx)}
                          className="w-full sm:w-auto justify-center bg-[#199A46] hover:bg-green-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-2 rounded-xl shadow-sm hover:shadow transition-all flex items-center active:scale-95"
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
                {savedTeacher ? (
                  <>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5">
                      <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wide">
                        Firmando como
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-700" />
                        <span className="text-base font-bold text-emerald-950">
                          {savedTeacher.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Dispositivo identificado
                      </p>
                      <button
                        type="button"
                        onClick={handleForgetTeacher}
                        className="text-xs text-gray-500 hover:text-gray-800 underline pt-1 block mx-auto cursor-pointer"
                      >
                        ¿No eres tú? Cambiar docente
                      </button>
                    </div>

                    {/* Biometrics Card */}
                    {biometricsAvailable && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-xs text-slate-700">
                          <Fingerprint className={`w-5 h-5 shrink-0 ${biometricsEnabled ? "text-emerald-600" : "text-slate-400"}`} />
                          <div>
                            <span className="font-semibold block text-slate-900 leading-tight">
                              {biometricsEnabled ? "Huella / Face ID activa" : "Huella / Face ID del celular"}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                              {biometricsEnabled ? "Puedes firmar apoyando el dedo o la cara" : "Vincúlala para mayor seguridad y rapidez"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isRegisteringBio}
                          onClick={handleToggleBiometrics}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer shrink-0 ${
                            biometricsEnabled 
                              ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100" 
                              : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-2xs active:scale-95"
                          }`}
                        >
                          {isRegisteringBio ? "Vinculando..." : biometricsEnabled ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    )}

                    {bioStatusMsg && (
                      <p className="text-xs text-center font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                        {bioStatusMsg}
                      </p>
                    )}
                  </>
                ) : teachers.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    Aún no hay docentes registrados con PIN en el sistema. Puedes darlos de alta desde el panel de preceptoría.
                  </div>
                ) : (
                  <>
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
                        Ingresa tu PIN personal para identificarte.
                      </p>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={e => setRememberDevice(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <span className="font-medium text-gray-800">
                        Recordarme en este celular <span className="text-gray-500 block text-[11px] font-normal">(no te volverá a pedir buscar tu nombre ni ingresar PIN)</span>
                      </span>
                    </label>
                  </>
                )}

                {signingError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                    {signingError}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  {savedTeacher && biometricsEnabled ? (
                    <>
                      <button
                        type="button"
                        onClick={handleConfirmSignatureWithBiometrics}
                        disabled={savingSignature}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {savingSignature ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <>
                            <Fingerprint className="w-5 h-5 text-emerald-100" />
                            Firmar con Huella / Face ID
                          </>
                        )}
                      </button>
                      <button
                        type="submit"
                        disabled={savingSignature}
                        className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer text-center block"
                      >
                        O firmar con 1 toque sin biometría
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={savingSignature || (!savedTeacher && teachers.length === 0)}
                      className="w-full py-3 bg-[#199A46] hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      {savingSignature ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        savedTeacher ? "Confirmar Firma (1 Toque)" : "Confirmar Firma"
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSigningHourIndex(null)}
                    className="w-full py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium text-xs hover:bg-gray-50 cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          TEACHER OBSERVATION MODAL WITH PIN VERIFICATION
         ============================================================== */}
      {obsModalStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start mb-4 pb-3 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Observación de Docente
                </h3>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">
                  Alumno: <span className="font-bold text-gray-900">{obsModalStudent.studentName || `Alumno ${obsModalStudent.studentId}`}</span>
                </p>
              </div>
              <button 
                onClick={() => setObsModalStudent(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {obsSuccess ? (
              <div className="py-8 text-center text-blue-600 space-y-2">
                <CheckCircle2 className="w-16 h-16 mx-auto animate-bounce text-emerald-600" />
                <h4 className="text-lg font-bold text-gray-900">¡Observación Guardada!</h4>
                <p className="text-xs text-gray-500">Se registró la observación en el parte diario del curso.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveObservation} className="space-y-4">
                {savedTeacher ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-700 shrink-0" />
                      <div>
                        <span className="text-[11px] text-blue-700 block leading-tight font-medium">Docente:</span>
                        <span className="text-sm font-bold text-blue-950">Prof. {savedTeacher.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleForgetTeacher}
                      className="text-xs text-blue-700 underline hover:text-blue-900 cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    Aún no hay docentes registrados en el sistema.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                        Docente que registra la observación:
                      </label>
                      <select
                        value={obsTeacherId}
                        onChange={e => setObsTeacherId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                        Tu PIN de Docente (4 dígitos):
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        value={obsTeacherPin}
                        onChange={e => setObsTeacherPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="••••"
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-center text-2xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-[11px] text-gray-500 mt-1 text-center">
                        Ingresa tu PIN personal para identificarte.
                      </p>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={e => setRememberDevice(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-800">
                        Recordarme en este celular <span className="text-gray-500 block text-[11px] font-normal">(no te volverá a pedir buscar tu nombre ni ingresar PIN)</span>
                      </span>
                    </label>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Observación / Novedad:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={obsText}
                    onChange={e => setObsText(e.target.value)}
                    placeholder="Escribe la observación sobre el alumno (ej. No trajo materiales, excelente participación, se sintió descompuesto...)"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {obsError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                    {obsError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setObsModalStudent(null)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingObs || (!savedTeacher && teachers.length === 0)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    {savingObs ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      "Guardar Observación"
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
