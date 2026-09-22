"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Plus, Trash2, Edit2, X } from "lucide-react";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [shift, setShift] = useState<"Mañana" | "Tarde">("Mañana");
  const [accessPin, setAccessPin] = useState("");

  const fetchCourses = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "courses"));
    const coursesData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    setCourses(coursesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      shift,
      accessPin,
    };

    if (editingId) {
      await updateDoc(doc(db, "courses", editingId), payload);
    } else {
      await addDoc(collection(db, "courses"), payload);
    }
    
    setShowModal(false);
    resetForm();
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este curso? Se perderán las asociaciones con los alumnos.")) {
      await deleteDoc(doc(db, "courses", id));
      fetchCourses();
    }
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setName(course.name);
    setShift(course.shift);
    setAccessPin(course.accessPin);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setShift("Mañana");
    setAccessPin("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestionar Cursos</h2>
            <p className="text-gray-500">Administra las divisiones del colegio</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium inline-flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Nuevo Curso
          </button>
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
                  <th className="p-4 font-semibold">Nombre</th>
                  <th className="p-4 font-semibold">Turno</th>
                  <th className="p-4 font-semibold">PIN Acceso</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay cursos registrados.</td></tr>
                )}
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{course.name}</td>
                    <td className="p-4 text-gray-600">{course.shift}</td>
                    <td className="p-4 text-gray-600">
                      {course.accessPin ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{course.accessPin}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin PIN</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleEdit(course)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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
              <h3 className="font-bold text-lg">{editingId ? "Editar Curso" : "Nuevo Curso"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Curso</label>
                <input 
                  type="text" 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: 4to Año 'A'" required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                <select 
                  value={shift} onChange={e => setShift(e.target.value as "Mañana" | "Tarde")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Acceso Docente (Opcional)</label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={accessPin} onChange={e => setAccessPin(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: 1234" 
                />
                <p className="text-xs text-gray-500 mt-1">4 dígitos numéricos para proteger la vista pública de asistencia.</p>
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
