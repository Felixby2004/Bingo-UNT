import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.post(`${apiUrl}/api/login`, { 
        username, 
        password, 
        token2fa: requires2FA ? token2fa : undefined 
      });
      
      if (res.data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (res.data.success) {
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-unt-blue p-8 text-center">
          <div className="w-20 h-20 bg-unt-yellow rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-unt-blue" size={40} />
          </div>
          <h2 className="text-2xl font-black text-unt-white uppercase tracking-tight">Acceso Administrador</h2>
          <p className="text-unt-yellow/70 text-sm font-bold">BINGO - PROMO XXVIII</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-2 text-sm font-bold border border-red-100">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {!requires2FA ? (
              <>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Código 2FA (Authenticator)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={token2fa}
                    onChange={(e) => setToken2fa(e.target.value)}
                    placeholder="000000"
                    maxLength="6"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all font-black text-lg tracking-[0.5em]"
                    required
                    autoFocus
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setRequires2FA(false)}
                  className="text-[10px] font-bold text-gray-400 mt-2 hover:text-unt-blue"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-unt-blue text-unt-yellow py-4 rounded-xl font-black text-lg shadow-xl shadow-unt-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR AL PANEL'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
