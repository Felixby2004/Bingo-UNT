import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, AlertCircle, Mail, CheckCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresEmailCode, setRequiresEmailCode] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [isResetting2FA, setIsResetting2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.post(`${apiUrl}/api/login`, { 
        username, 
        password
      }, { 
        withCredentials: true,
        timeout: 20000 // 20 seconds timeout
      });
      
      if (res.data.requiresTOTP) {
        setRequiresTOTP(true);
        setUserId(res.data.userId);
        setLoading(false);
        return;
      }

      if (res.data.requiresEmailCode) {
        setRequiresEmailCode(true);
        setUserId(res.data.userId);
        setLoading(false);
        return;
      }

      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('admin_token', res.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        }
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Usuario o contraseña incorrectos');
      setLoading(false);
    }
  };

  const handleEmailCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.post(`${apiUrl}/api/verify-email-code`, { 
        username, 
        code: emailCode
      }, { 
        withCredentials: true,
        timeout: 20000 // 20 seconds timeout
      });
      
      if (res.data.success) {
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido o expirado');
      setLoading(false);
    }
  };

  const handleTOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.post(`${apiUrl}/api/verify-totp`, { 
        username, 
        code: totpCode
      }, { 
        withCredentials: true,
        timeout: 20000 // 20 seconds timeout
      });
      
      if (res.data.success) {
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Código de autenticador inválido');
      setLoading(false);
    }
  };

  const handleRequestReset2FA = async () => {
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await axios.post(`${apiUrl}/api/request-2fa-reset`, { username });
      setIsResetting2FA(true);
      setRequiresTOTP(false);
      setLoading(false);
    } catch (err) {
      setError('Error al solicitar el reset de 2FA');
      setLoading(false);
    }
  };

  const handleVerifyReset2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.post(`${apiUrl}/api/verify-reset-2fa`, { 
        username, 
        code: emailCode
      });
      if (res.data.success) {
        alert(res.data.message);
        window.location.reload(); // Recargar para volver al login normal
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido');
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresEmailCode(false);
    setRequiresTOTP(false);
    setIsResetting2FA(false);
    setEmailCode('');
    setTotpCode('');
    setError('');
    setUserId(null);
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

        <form 
          onSubmit={isResetting2FA ? handleVerifyReset2FA : (requiresTOTP ? handleTOTPSubmit : (requiresEmailCode ? handleEmailCodeSubmit : handleLoginSubmit))} 
          className="p-8 space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-2 text-sm font-bold border border-red-100">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {!requiresEmailCode && !requiresTOTP && !isResetting2FA ? (
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
                      disabled={loading}
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
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </>
            ) : requiresTOTP ? (
              <div className="space-y-4">
                <div className="bg-unt-yellow/10 border-2 border-unt-yellow/20 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-unt-yellow rounded-xl flex items-center justify-center mx-auto shadow-sm">
                    <Lock className="text-unt-blue" size={24} />
                  </div>
                  <h3 className="text-lg font-black text-unt-blue uppercase">Doble Factor (App)</h3>
                  <p className="text-sm text-gray-600 font-medium">
                    Ingresa el código de 6 dígitos generado por tu aplicación.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Código de Seguridad</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-unt-blue" size={18} />
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength="6"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all font-black text-lg tracking-[0.5em]"
                      disabled={loading}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <button 
                    type="button" 
                    onClick={handleRequestReset2FA}
                    className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest text-left"
                  >
                    ¿Perdiste el acceso a tu celular? Resetear 2FA vía Email
                  </button>
                  <button 
                    type="button" 
                    onClick={handleBackToLogin}
                    className="text-[10px] font-bold text-gray-400 hover:text-unt-blue transition-colors uppercase tracking-widest text-left"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center space-y-3">
                  <Mail className="mx-auto text-blue-600" size={40} />
                  <h3 className="text-lg font-black text-unt-blue uppercase">
                    {isResetting2FA ? 'Recuperación de 2FA' : 'Verifica tu Email'}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">
                    {isResetting2FA 
                      ? 'Para desactivar el 2FA, ingresa el código enviado a tu correo.' 
                      : 'Hemos enviado un código de 6 dígitos a tu correo. Ingrésalo abajo.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Código de Verificación</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" size={18} />
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength="6"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all font-black text-lg tracking-[0.5em]"
                      disabled={loading}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleBackToLogin}
                  className="text-[10px] font-bold text-gray-400 mt-2 hover:text-unt-blue transition-colors uppercase tracking-widest"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!requiresEmailCode && !requiresTOTP && !isResetting2FA && (!username || !password)) || (requiresEmailCode && !emailCode) || (requiresTOTP && !totpCode) || (isResetting2FA && !emailCode)}
            className="w-full bg-unt-blue text-unt-yellow py-4 rounded-xl font-black text-lg shadow-xl shadow-unt-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'PROCESANDO...' : (requiresEmailCode || requiresTOTP || isResetting2FA ? 'VERIFICAR ACCESO' : 'ENVIAR CÓDIGO')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
