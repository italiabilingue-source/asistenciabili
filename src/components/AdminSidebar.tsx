"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Settings, Users, LogOut, FileSpreadsheet, GraduationCap, QrCode } from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    window.location.href = "/admin/asistencia";
  };

  return (
    <aside className="w-full md:w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white mb-2 mr-3 bg-white flex-shrink-0">
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
             <div className="w-1/3 h-full bg-[#199A46]"></div>
             <div className="w-1/3 h-full bg-white"></div>
             <div className="w-1/3 h-full bg-[#CE2B37]"></div>
          </div>
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">Inst. Rep. de Italia</h1>
          <p className="text-xs text-gray-400">Preceptoría</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link 
          href="/admin/asistencia" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/asistencia' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <Check className={`w-5 h-5 ${pathname === '/admin/asistencia' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Tomar Lista</span>
        </Link>

        <Link 
          href="/admin/actas" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/actas' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <FileSpreadsheet className={`w-5 h-5 ${pathname === '/admin/actas' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Actas e Impresión</span>
        </Link>

        <Link 
          href="/admin/qr" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/qr' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <QrCode className={`w-5 h-5 ${pathname === '/admin/qr' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Carteles QR</span>
        </Link>
        
        <div className="pt-6 pb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4">Administración</p>
        </div>

        <Link 
          href="/admin/docentes" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/docentes' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <GraduationCap className={`w-5 h-5 ${pathname === '/admin/docentes' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Gestionar Docentes</span>
        </Link>
        
        <Link 
          href="/admin/cursos" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/cursos' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <Settings className={`w-5 h-5 ${pathname === '/admin/cursos' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Gestionar Cursos</span>
        </Link>

        <Link 
          href="/admin/alumnos" 
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/alumnos' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <Users className={`w-5 h-5 ${pathname === '/admin/alumnos' ? 'text-green-400' : ''}`} />
          <span className="font-medium">Gestionar Alumnos</span>
        </Link>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <button onClick={handleLogout} className="flex items-center space-x-3 text-gray-400 hover:text-white px-4 py-2 w-full">
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
