"use client";

import { useState, useEffect, use } from "react";
import { useAttendance } from "@/lib/hooks/useAttendance";
import { AttendanceRecord, Course } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertCircle, CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";

export default function CourseAttendancePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  
  // Get local date in YYYY-MM-DD
  const today = new Date().toLocaleDateString("en-CA");
  
  const { attendance, loading, error } = useAttendance(courseId, today);
  const [course, setCourse] = useState<Course | null>(null);
  
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [showPresent, setShowPresent] = useState(false);

  useEffect(() => {
    // Check if PIN is in sessionStorage
    const storedPin = sessionStorage.getItem(`pin_${courseId}`);
    
    // Fetch course details
    const fetchCourse = async () => {
      const docRef = doc(db, "courses", courseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
        setCourse(courseData);
        if (courseData.accessPin === "" || !courseData.accessPin || storedPin === courseData.accessPin) {
          setIsAuthenticated(true);
        }
      }
    };
    fetchCourse();
  }, [courseId]);

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

  if (loading || !course) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900"><div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;
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
  // In a real app we'd fetch the student list from a context or a collection. 
  // For the prompt requirement, the teacher only sees what the preceptor loaded in "daily_attendance.records".
  const records: Record<string, AttendanceRecord & { studentName: string }> = attendance?.records as any || {};
  
  const absents = Object.values(records).filter(r => r.status === "ausente");
  const lates = Object.values(records).filter(r => r.status === "tardanza" || r.status === "retirado");
  const presents = Object.values(records).filter(r => r.status === "presente");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b">
        <div className="p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">{course.name}</h1>
            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
              {new Date().toLocaleDateString("es-AR", { day: 'numeric', month: 'short' })}
            </div>
          </div>
          <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-lg font-semibold text-sm">
            <Users className="w-4 h-4 mr-2" />
            {absents.length} Ausentes hoy
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {!attendance ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-400 w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-700">Aún no hay datos</h2>
            <p className="text-gray-500 mt-2 text-sm">Preceptoría todavía no ha cargado el parte diario para la fecha de hoy.</p>
          </div>
        ) : (
          <>
            {/* Ausentes Destacados */}
            {absents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
                  Ausentes ({absents.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {absents.map((student, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                      <span className="font-bold text-red-900 text-lg">{student.studentName || `Alumno ${student.studentId}`}</span>
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">AUSENTE</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tardanzas / Retiros */}
            {lates.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-yellow-500" />
                  Tardanzas / Retiros ({lates.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {lates.map((student, idx) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex flex-col shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-yellow-900">{student.studentName || `Alumno ${student.studentId}`}</span>
                        <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-1 rounded-md uppercase">{student.status}</span>
                      </div>
                      {student.note && <span className="text-sm text-yellow-800">{student.note}</span>}
                    </div>
                  ))}
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
                      <div key={idx} className="p-3 px-4 text-gray-700 text-sm font-medium">
                        {student.studentName || `Alumno ${student.studentId}`}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            
            {absents.length === 0 && lates.length === 0 && (
              <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-200 shadow-sm mt-4">
                <CheckCircle2 className="text-green-500 w-10 h-10 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-green-800">¡Asistencia Perfecta!</h2>
                <p className="text-green-600 mt-1 text-sm">Todos los alumnos están presentes hoy.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
