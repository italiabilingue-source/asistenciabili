"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Student } from "@/types";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Plus, Trash2, Edit2, X, Users, Search } from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Form State
  const [courseId, setCourseId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [studentsSnap, coursesSnap] = await Promise.all([
      getDocs(collection(db, "students")),
      getDocs(collection(db, "courses"))
    ]);
    
    setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    setCourses(coursesData);
    
    if (coursesData.length > 0 && !courseId) {
      setCourseId(coursesData[0].id);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      courseId,
      firstName,
      lastName,
      active: true,
    };

    if (editingId) {
      await updateDoc(doc(db, "students", editingId), payload);
    } else {
      await addDoc(collection(db, "students"), payload);
    }
    
    setShowModal(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este alumno? Se perderá todo su historial de asistencia.")) {
      await deleteDoc(doc(db, "students", id));
      fetchData();
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setCourseId(student.courseId);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFirstName("");
    setLastName("");
  };

  const filteredStudents = students.filter(s => {
    const matchCourse = selectedCourseFilter === "all" || s.courseId === selectedCourseFilter;
    const matchSearch = s.firstName.toLowerCase().includes(search.toLowerCase()) || 
                        s.lastName.toLowerCase().includes(search.toLowerCase());
    return matchCourse && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestionar Alumnos</h2>
            <p className="text-gray-500">Alta, baja y modificación del alumnado</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium inline-flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Nuevo Alumno
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select 
            value={selectedCourseFilter} onChange={e => setSelectedCourseFilter(e.target.value)}
            className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos los Cursos</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Alumno</th>
                  <th className="p-4 font-semibold">Curso</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-500"><Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />No se encontraron alumnos.</td></tr>
                )}
                {filteredStudents.map(student => {
                  const course = courses.find(c => c.id === student.courseId);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{student.lastName}, {student.firstName}</p>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        {course ? course.name : "Sin asignar"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleEdit(student)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingId ? "Editar Alumno" : "Nuevo Alumno"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input 
                    type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Juan" required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input 
                    type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Pérez" required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso Asignado</label>
                <select 
                  value={courseId} onChange={e => setCourseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="" disabled>Selecciona un curso</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700 rounded-lg shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
