"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "preceptor" && password === "Cole1046-") {
      sessionStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border-t-4 border-[#199A46]">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-[#199A46]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Acceso Administrativo</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">Ingresa tus credenciales para continuar</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#199A46] outline-none transition-colors"
                placeholder="Ej. preceptor"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#199A46] outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium text-center">Credenciales incorrectas</p>}
            
            <button type="submit" className="w-full bg-[#199A46] hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md mt-2">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
