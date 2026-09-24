"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Teacher } from "@/types";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Plus, Trash2, Edit2, X, Search, Key, GraduationCap, CheckCircle2 } from "lucide-react";

const INITIAL_SAMPLE_TEACHERS = [
  { name: "Martínez, Juan Carlos", pin: "1234", active: true },
  { name: "González, Silvina", pin: "2345", active: true },
  { name: "Rodríguez, Fernando", pin: "3456", active: true },
  { name: "Rossi, Mariela", pin: "4567", active: true },
  { name: "Albornoz, Esteban", pin: "5678", active: true },
  { name: "Pérez, Luciana", pin: "6789", active: true },
];

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "teachers"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
      list.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
      setTeachers(list);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      alert("Por favor completa el nombre y el PIN de 4 dígitos.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      alert("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    const payload = {
      name: name.trim(),
      pin: pin.trim(),
      active: true,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "teachers", editingId), payload);
      } else {
        await addDoc(collection(db, "teachers"), payload);
      }
      setShowModal(false);
      resetForm();
      fetchTeachers();
    } catch (err) {
      console.error("Error saving teacher:", err);
      alert("Error al guardar el docente. Verifica los permisos de Firebase.");
    }
  };

  const handleDelete = async (id: string, teacherName: string) => {
    if (confirm(`¿Estás seguro de eliminar al docente "${teacherName}"?`)) {
      try {
        await deleteDoc(doc(db, "teachers", id));
        fetchTeachers();
      } catch (err) {
        console.error("Error deleting teacher:", err);
        alert("Error al eliminar el docente.");
      }
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setName(teacher.name);
    setPin(teacher.pin);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPin("");
  };

  const seedSampleTeachers = async () => {
    if (confirm("¿Cargar docentes iniciales de ejemplo para comenzar a usar la firma digital?")) {
      setLoading(true);
      try {
        for (const t of INITIAL_SAMPLE_TEACHERS) {
          await addDoc(collection(db, "teachers"), t);
        }
        fetchTeachers();
      } catch (err) {
        console.error("Error seeding sample teachers:", err);
        alert("Error al cargar docentes de ejemplo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestionar Docentes</h2>
            <p className="text-gray-500">Alta y asignación de PIN de 4 dígitos para firma de actas diarias</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {teachers.length === 0 && !loading && (
              <button
                onClick={seedSampleTeachers}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl font-medium text-sm transition-colors"
              >
                Cargar Docentes de Ejemplo
              </button>
            )}
            <button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium inline-flex items-center transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" /> Nuevo Docente
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por apellido o nombre..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay docentes registrados</h3>
            <p className="text-gray-500 mb-6">Registra a los profesores con su PIN de 4 dígitos para que puedan firmar las horas de clase.</p>
            <button
              onClick={seedSampleTeachers}
              className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium inline-flex items-center hover:bg-green-700 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Cargar Docentes de Ejemplo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex justify-between items-center">
              <span className="font-semibold text-gray-700 text-sm">
                {filteredTeachers.length} {filteredTeachers.length === 1 ? "Docente registrado" : "Docentes registrados"}
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="p-4 pl-6 font-semibold">Apellido y Nombre</th>
                  <th className="p-4 font-semibold">PIN de Firma</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 pr-6 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-900">
                      {t.name}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-mono font-bold px-2.5 py-1 rounded-md border border-gray-200">
                        <Key className="w-3 h-3 mr-1 text-gray-500" />
                        {t.pin}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center text-emerald-700 bg-emerald-50 text-xs font-semibold px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Activo
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button 
                        onClick={() => handleEdit(t)} 
                        className="text-gray-400 hover:text-green-600 p-1.5 transition-colors rounded-lg hover:bg-gray-100"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id, t.name)} 
                        className="text-gray-400 hover:text-red-600 p-1.5 transition-colors rounded-lg hover:bg-gray-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? "Editar Docente" : "Nuevo Docente"}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Apellido y Nombre *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ej. Gómez, Martín" 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    PIN Personal de Firma (4 dígitos) *
                  </label>
                  <input 
                    type="password" 
                    inputMode="numeric"
                    maxLength={4}
                    required 
                    value={pin} 
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} 
                    placeholder="••••" 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este PIN es el que el docente ingresará en el aula para firmar el acta de su hora.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-all"
                  >
                    {editingId ? "Actualizar" : "Guardar Docente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
