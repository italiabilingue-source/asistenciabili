"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Settings, Users, LogOut, FileSpreadsheet, GraduationCap, QrCode, Menu, X } from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    window.location.href = "/admin/asistencia";
  };

  const navLinks = [
    { href: "/admin/asistencia", label: "Tomar Lista", icon: Check },
    { href: "/admin/actas", label: "Actas e Impresión", icon: FileSpreadsheet },
    { href: "/admin/qr", label: "Carteles QR", icon: QrCode },
  ];

  const adminLinks = [
    { href: "/admin/docentes", label: "Gestionar Docentes", icon: GraduationCap },
    { href: "/admin/cursos", label: "Gestionar Cursos", icon: Settings },
    { href: "/admin/alumnos", label: "Gestionar Alumnos", icon: Users },
  ];

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white bg-white shrink-0">
            <div className="w-full h-full flex">
              <div className="w-1/3 h-full bg-[#199A46]"></div>
              <div className="w-1/3 h-full bg-white"></div>
              <div className="w-1/3 h-full bg-[#CE2B37]"></div>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-xs leading-tight">Inst. Rep. de Italia</h1>
            <p className="text-[10px] text-gray-400">Preceptoría</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-gray-800 text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 w-72 bg-gray-900 text-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-white shrink-0">
              <div className="w-full h-full flex">
                <div className="w-1/3 h-full bg-[#199A46]"></div>
                <div className="w-1/3 h-full bg-white"></div>
                <div className="w-1/3 h-full bg-[#CE2B37]"></div>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">Inst. Rep. de Italia</h2>
              <p className="text-xs text-gray-400">Preceptoría</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                pathname === href
                  ? "bg-gray-800 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${pathname === href ? "text-green-400" : ""}`} />
              <span>{label}</span>
            </Link>
          ))}

          <div className="pt-4 pb-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3">
              Administración
            </p>
          </div>

          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                pathname === href
                  ? "bg-gray-800 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${pathname === href ? "text-green-400" : ""}`} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-gray-400 hover:text-white px-3 py-2.5 w-full rounded-xl text-sm hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-800 flex items-center justify-start space-x-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white bg-white shrink-0">
            <div className="w-full h-full flex">
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

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === href
                  ? "bg-gray-800 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${pathname === href ? "text-green-400" : ""}`} />
              <span className="font-medium text-sm">{label}</span>
            </Link>
          ))}

          <div className="pt-6 pb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4">
              Administración
            </p>
          </div>

          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === href
                  ? "bg-gray-800 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${pathname === href ? "text-green-400" : ""}`} />
              <span className="font-medium text-sm">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-gray-400 hover:text-white px-4 py-2 w-full text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
