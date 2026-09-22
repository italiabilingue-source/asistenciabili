import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#199A46] h-32 relative flex items-center justify-center">
          {/* Header Band Red */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#CE2B37]"></div>
          
          <div className="bg-white w-20 h-20 rounded-full border-4 border-white shadow-lg absolute -bottom-10 flex items-center justify-center overflow-hidden">
            {/* Italy Flag Colors for Logo */}
            <div className="w-1/3 h-full bg-[#199A46]"></div>
            <div className="w-1/3 h-full bg-white"></div>
            <div className="w-1/3 h-full bg-[#CE2B37]"></div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AsistenciaBili</h1>
          <p className="text-gray-500 text-sm mb-8">Instituto República de Italia - Entre Ríos</p>
          
          <div className="space-y-4">
            <Link 
              href="/admin/asistencia" 
              className="flex items-center justify-between w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 px-6 py-4 rounded-xl font-medium transition-colors"
            >
              <span>Acceso Preceptoría</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            
            <Link 
              href="/admin/qr" 
              className="flex items-center justify-between w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 px-6 py-4 rounded-xl font-medium transition-colors"
            >
              <span>Generador QR</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-400">
        Plataforma de gestión de asistencia en tiempo real
      </p>
    </div>
  );
}
