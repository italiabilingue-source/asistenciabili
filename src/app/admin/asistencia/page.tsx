"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Student, DailyAttendance, AttendanceRecord, AttendanceStatus } from "@/types";
import { Check, X, Clock, Save, Plus, Settings, LogOut, Users } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";

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
      // In a real app we'd query students by courseId: where("courseId", "==", selectedCourse)
      // Since we don't have indexes setup, we just fetch all and filter client side for MVP
      const studSnapshot = await getDocs(collection(db, "students"));
      const allStudents = studSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      const courseStudents = allStudents.filter(s => s.courseId === selectedCourse);
      setStudents(courseStudents);

      // Fetch Attendance
      const docId = `${selectedCourse}_${date}`;
      const attSnap = await getDoc(doc(db, "daily_attendance", docId));
      
      if (attSnap.exists()) {
        const attData = attSnap.data() as DailyAttendance;
        setRecords(attData.records);
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
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], studentId, status }
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
    
    // Add student names to records to denormalize data for the teacher view
    const recordsWithNames: Record<string, any> = {};
    Object.keys(records).forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      recordsWithNames[studentId] = {
        ...records[studentId],
        studentName: student ? `${student.lastName}, ${student.firstName}` : "Desconocido"
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
      alert("Parte diario guardado exitosamente!");
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parte Diario</h2>
            <p className="text-gray-500">Carga rápida de inasistencias</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={selectedCourse} 
              onChange={e => setSelectedCourse(e.target.value)}
              className="flex-1 md:w-48 bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="flex-1 md:w-48 bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
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
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Agregar Alumnos
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <span className="font-semibold text-gray-700">{students.length} Alumnos</span>
              <button 
                onClick={markAllPresent}
                className="text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Marcar Todos Presentes
              </button>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {students.map(student => {
                const status = records[student.id]?.status || "presente";
                return (
                  <li key={student.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-900">{student.lastName}, {student.firstName}</p>
                    </div>
                    
                    <div className="flex bg-gray-100 rounded-lg p-1 w-full md:w-auto">
                      <button 
                        onClick={() => setStatus(student.id, "presente")}
                        className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-all ${
                          status === "presente" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Check className="w-4 h-4 mr-1 hidden sm:block" /> Presente
                      </button>
                      <button 
                        onClick={() => setStatus(student.id, "ausente")}
                        className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-all ${
                          status === "ausente" ? "bg-red-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <X className="w-4 h-4 mr-1 hidden sm:block" /> Ausente
                      </button>
                      <button 
                        onClick={() => setStatus(student.id, "tardanza")}
                        className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-all ${
                          status === "tardanza" ? "bg-yellow-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Clock className="w-4 h-4 mr-1 hidden sm:block" /> Tarde
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-[#199A46] hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center disabled:opacity-50"
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

// Simple icon for Users since it wasn't imported from lucide initially
function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
