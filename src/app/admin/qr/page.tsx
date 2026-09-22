"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function QRGeneratorPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const handlePrint = (courseId: string) => {
    // Basic print logic - in a real app, open a new window or use a print CSS media query
    window.print();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;
  }

  // Get current origin for the QR codes
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://asistenciabili.app';

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto print:max-w-full print:p-0">
        
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <Link href="/admin/asistencia" className="text-green-600 font-medium flex items-center hover:underline mb-2">
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver al panel
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Generador de Carteles QR</h1>
            <p className="text-gray-500">Imprime estos carteles para pegar en cada aula.</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold flex items-center shadow-md transition-colors"
          >
            <Printer className="w-5 h-5 mr-2" /> Imprimir Todos
          </button>
        </div>

        <div className="grid grid-cols-1 gap-12 print:gap-0">
          {courses.map(course => (
            <div key={course.id} className="bg-white border-2 border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden print:h-screen print:border-none print:shadow-none print:rounded-none break-after-page">
              
              {/* Header Band */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-[#199A46]"></div>
              
              <div className="mb-8 flex items-center flex-col">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 mb-4 bg-white flex items-center justify-center shadow-sm">
                   {/* Italy Flag Colors for Logo */}
                   <div className="w-1/3 h-full bg-[#199A46]"></div>
                   <div className="w-1/3 h-full bg-white"></div>
                   <div className="w-1/3 h-full bg-[#CE2B37]"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest">Instituto República de Italia</h2>
              </div>
              
              <h1 className="text-6xl font-black text-gray-900 mb-2">{course.name}</h1>
              <p className="text-xl text-gray-500 mb-12">Turno {course.shift}</p>

              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-12">
                <QRCodeSVG 
                  value={`${origin}/curso/${course.id}`} 
                  size={300} 
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="max-w-md bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-2 text-xl">Instrucciones para Docentes</h3>
                <ol className="text-gray-600 text-left list-decimal pl-5 space-y-2 font-medium">
                  <li>Abre la cámara de tu celular.</li>
                  <li>Apunta al código QR.</li>
                  <li>Visualiza la asistencia del día en tiempo real.</li>
                </ol>
                {course.accessPin && (
                  <div className="mt-4 bg-yellow-100 text-yellow-800 p-3 rounded-lg text-sm font-bold text-center border border-yellow-200">
                    PIN de acceso requerido
                  </div>
                )}
              </div>
              
              {/* Footer Band */}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#CE2B37]"></div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
