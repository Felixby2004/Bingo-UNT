import React, { useState } from 'react';
import axios from 'axios';
import { Play, Square, Hash, Plus, Trophy, Trash2, CheckCircle, Settings, Award, Upload, X, Edit2, Save } from 'lucide-react';

const AdminPanel = ({ gameState, prizes, refreshGame, refreshPrizes, user }) => {
  const [newPrize, setNewPrize] = useState({ name: '', description: '' });
  const [editingPrize, setEditingPrize] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(Array(25).fill(true)); // Default: All selected (Full Card)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [manualNumber, setManualNumber] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [ticketToVerify, setTicketToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');

  // 2FA for sensitive operations
  const [require2FATransaction, setRequire2FATransaction] = useState(false);
  const [transactionToken2FA, setTransactionToken2FA] = useState('');
  const [pendingOperation, setPendingOperation] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleSetup2FA = async () => {
    try {
      const res = await axios.post(`${apiUrl}/api/admin/setup-2fa`, {}, { withCredentials: true });
      setTwoFAData(res.data);
      setShow2FASetup(true);
    } catch (err) {
      console.error('Setup 2FA error:', err);
      alert('Error al configurar 2FA: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfirm2FA = async () => {
    try {
      const res = await axios.post(`${apiUrl}/api/admin/confirm-2fa`, { token: twoFAToken }, { withCredentials: true });
      if (res.data.success) {
        alert('✅ 2FA Activado correctamente. Panel desbloqueado.');
        setShow2FASetup(false);
        // Recargar la página para que App.jsx vuelva a verificar el estado del usuario
        window.location.reload();
      }
    } catch (err) {
      console.error('Confirm 2FA error:', err);
      alert('❌ Código inválido: ' + (err.response?.data?.message || err.message));
    }
  };

  // Wrapper for sensitive operations that require 2FA
  const withRequire2FA = async (operation) => {
    if (!user?.two_fa_enabled) {
      // 2FA not enabled - show setup requirement
      alert('⚠️ Debes configurar 2FA primero para realizar esta acción');
      setShow2FASetup(true);
      return;
    }
    
    // 2FA is enabled, execute the operation
    try {
      return await operation(undefined);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.requires2FA) {
        // Need 2FA code
        setPendingOperation(() => operation);
        setRequire2FATransaction(true);
        setTransactionToken2FA('');
      } else {
        throw err;
      }
    }
  };

  const handleSubmit2FATransaction = async () => {
    if (!transactionToken2FA.trim()) {
      alert('Ingrese el código 2FA');
      return;
    }

    try {
      await pendingOperation(transactionToken2FA);
      setRequire2FATransaction(false);
      setTransactionToken2FA('');
      setPendingOperation(null);
    } catch (err) {
      console.error('2FA transaction error:', err);
      if (err.response?.status === 401) {
        alert('Código 2FA inválido o expirado');
        setTransactionToken2FA('');
      } else {
        alert('Error: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const togglePattern = (index) => {
    const newPattern = [...selectedPattern];
    newPattern[index] = !newPattern[index];
    setSelectedPattern(newPattern);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleStartGame = async (prizeId) => {
    await withRequire2FA(async (token2fa) => {
      const payload = { prize_id: prizeId };
      if (token2fa) payload.token2fa = token2fa;
      await axios.post(`${apiUrl}/api/prizes/start`, payload);
      refreshGame();
    });
  };

  const handleAddPrize = async (e) => {
    e.preventDefault();
    if (!newPrize.name.trim()) return;
    
    await withRequire2FA(async (token2fa) => {
      const formData = new FormData();
      formData.append('name', newPrize.name);
      formData.append('description', newPrize.description);
      formData.append('winning_pattern', JSON.stringify(selectedPattern));
      if (token2fa) formData.append('token2fa', token2fa);
      if (imageFile) formData.append('image', imageFile);

      try {
        if (editingPrize) {
          await axios.put(`${apiUrl}/api/prizes/${editingPrize.id}`, formData);
        } else {
          await axios.post(`${apiUrl}/api/prizes`, formData);
        }
        resetForm();
        refreshPrizes();
      } catch (err) {
        console.error('Error adding prize:', err);
        throw err;
      }
    });
  };

  const resetForm = () => {
    setNewPrize({ name: '', description: '' });
    setEditingPrize(null);
    setSelectedPattern(Array(25).fill(true));
    setImageFile(null);
    setImagePreview(null);
  };

  const handleEditPrize = (prize) => {
    setEditingPrize(prize);
    setNewPrize({ name: prize.name, description: prize.description || '' });
    setSelectedPattern(prize.winning_pattern || Array(25).fill(true));
    setImagePreview(prize.image_url);
    setImageFile(null);
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('¿Eliminar este premio?')) return;
    await withRequire2FA(async (token2fa) => {
      const config = {};
      if (token2fa) config.params = { token2fa };
      await axios.delete(`${apiUrl}/api/prizes/${id}`, config);
      refreshPrizes();
    });
  };

  const handleFinishGame = async () => {
    if (!gameState.prize) return;
    await withRequire2FA(async (token2fa) => {
      const payload = { 
        prize_id: gameState.prize.id,
        winner_name: winnerName 
      };
      if (token2fa) payload.token2fa = token2fa;
      await axios.post(`${apiUrl}/api/prizes/finish`, payload);
      setWinnerName('');
      refreshGame();
    });
  };

  const handleDrawNumber = async (e) => {
    e.preventDefault();
    if (!gameState.prize) return alert('Selecciona un premio e inicia el sorteo');
    const num = parseInt(manualNumber);
    if (isNaN(num) || num < 1 || num > 75) return alert('Número inválido (1-75)');
    if (gameState.drawnNumbers.some(n => n.number === num)) return alert('Número ya sorteado');

    await withRequire2FA(async (token2fa) => {
      const payload = { 
        prize_id: gameState.prize.id,
        number: num
      };
      if (token2fa) payload.token2fa = token2fa;
      await axios.post(`${apiUrl}/api/prizes/draw`, payload);
      setManualNumber('');
    });
  };

  const handleVerifyWinner = async (e) => {
    e.preventDefault();
    if (!ticketToVerify.trim()) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await axios.get(`${apiUrl}/api/winner-verification/${ticketToVerify}`, { withCredentials: true });
      if (res.data.success) {
        setVerificationResult(res.data);
      } else {
        // Handle "Not found" case with custom message from server
        setVerificationResult(res.data);
      }
    } catch (err) {
      console.error('Error verifying winner:', err);
      alert('Error al verificar el cartón. Asegúrate de que las credenciales de Google estén configuradas.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Overlay de Bloqueo 2FA si no está activado */}
      {!user?.two_fa_enabled && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-[90] flex items-center justify-center p-6 rounded-[2rem] border-2 border-dashed border-unt-blue/20">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-unt-yellow rounded-3xl flex items-center justify-center mx-auto shadow-lg rotate-6">
              <Settings className="text-unt-blue" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-unt-blue uppercase tracking-tight">Seguridad Requerida</h3>
              <p className="text-sm text-gray-500 font-bold leading-relaxed">
                Para gestionar premios y sorteos, debes activar la verificación en dos pasos (2FA).
              </p>
            </div>
            <button 
              onClick={handleSetup2FA}
              className="w-full bg-unt-blue text-unt-yellow py-4 rounded-2xl font-black text-lg shadow-xl shadow-unt-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              CONFIGURAR 2FA AHORA
            </button>
          </div>
        </div>
      )}

      {show2FASetup && (
        <div className="fixed inset-0 bg-unt-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="bg-unt-blue p-6 text-center relative">
              <button 
                onClick={() => setShow2FASetup(false)}
                className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 bg-unt-yellow rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg rotate-3">
                <Settings className="text-unt-blue" size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Configurar 2FA</h3>
              <p className="text-unt-yellow/70 text-[10px] font-bold">ESCANE EL CÓDIGO QR</p>
            </div>
            
            <div className="p-8 space-y-6">
              {twoFAData ? (
                <div className="space-y-6 text-center">
                  <div className="bg-gray-50 p-4 rounded-3xl border-2 border-dashed border-gray-200 inline-block mx-auto">
                    <img src={twoFAData.qrCode} alt="QR Code" className="w-40 h-40 mx-auto" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <input
                      type="text"
                      placeholder="000 000"
                      value={twoFAToken}
                      onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center py-4 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-2xl outline-none transition-all font-black text-2xl tracking-[0.5em]"
                    />
                    <button
                      onClick={handleConfirm2FA}
                      className="w-full bg-unt-blue text-unt-yellow py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      ACTIVAR SEGURIDAD
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-unt-blue mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal for Sensitive Transactions */}
      {require2FATransaction && (
        <div className="fixed inset-0 bg-unt-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="bg-unt-blue p-6 text-center">
              <div className="w-16 h-16 bg-unt-yellow rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg -rotate-3">
                <Trophy className="text-unt-blue" size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Verificación</h3>
              <p className="text-unt-yellow/70 text-[10px] font-bold">CONFIRMA TU ACCIÓN</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="000 000"
                  value={transactionToken2FA}
                  onChange={(e) => setTransactionToken2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center py-4 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-2xl outline-none transition-all font-black text-2xl tracking-[0.5em]"
                  autoFocus
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setRequire2FATransaction(false);
                      setTransactionToken2FA('');
                      setPendingOperation(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleSubmit2FATransaction}
                    className="flex-2 bg-unt-blue text-unt-yellow py-4 px-6 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Required Warning */}
      {!user?.two_fa_enabled && (
        <div className="col-span-1 lg:col-span-12 bg-gradient-to-r from-orange-50 to-red-50 border-4 border-orange-300 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-orange-700 uppercase tracking-tight">⚠️ Autenticación de Dos Factores Requerida</h3>
            <p className="text-orange-600 font-bold text-base">
              Para acceder a la gestión de premios y realizar operaciones sensibles, debes configurar 2FA (Google Authenticator o Authy)
            </p>
          </div>
          <button
            onClick={handleSetup2FA}
            className="bg-orange-500 hover:bg-orange-600 text-white py-4 px-8 rounded-2xl font-black text-lg uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] mx-auto"
          >
            🔐 Configurar 2FA Ahora
          </button>
        </div>
      )}

      {/* Left Column: Prize Management */}
      <div className={`lg:col-span-4 space-y-6 ${!user?.two_fa_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-unt-blue flex items-center space-x-2">
              <Trophy size={20} className="text-unt-yellow" />
              <span>{editingPrize ? 'EDITAR PREMIO' : 'GESTIÓN DE PREMIOS'}</span>
            </h2>
            <div className="flex space-x-2">
              {!user?.two_fa_enabled && (
                <button 
                  onClick={handleSetup2FA}
                  className="text-gray-400 hover:text-unt-blue transition-colors"
                  title="Configurar 2FA"
                >
                  <Settings size={20} />
                </button>
              )}
              {editingPrize && (
                <button onClick={resetForm} className="text-gray-400 hover:text-red-500">
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleAddPrize} className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Básica</label>
              <input 
                type="text"
                value={newPrize.name}
                onChange={(e) => setNewPrize({...newPrize, name: e.target.value})}
                placeholder="Nombre del premio"
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all text-sm font-bold"
              />
              <input 
                type="text"
                value={newPrize.description}
                onChange={(e) => setNewPrize({...newPrize, description: e.target.value})}
                placeholder="Descripción (opcional)"
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-xl outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto del Premio</label>
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/*"
                />
                <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${imagePreview ? 'border-unt-blue bg-white' : 'border-gray-200 bg-gray-50 group-hover:border-unt-blue'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <>
                      <Upload className="text-gray-300 mb-2" size={24} />
                      <span className="text-[10px] font-bold text-gray-400">SUBIR IMAGEN</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patrón de Juego (5x5)</label>
              <div className="grid grid-cols-5 gap-1 bg-gray-100 p-2 rounded-xl">
                {selectedPattern.map((selected, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => togglePattern(i)}
                    className={`aspect-square rounded-md transition-all ${i === 12 ? 'bg-unt-blue' : selected ? 'bg-unt-yellow' : 'bg-white'} border border-gray-200`}
                  >
                    {i === 12 && 
                    <div className="flex flex-col items-center">
                      <span className="text-white text-[12px] uppercase leading-none mb-0.5">CONTROL</span>
                      <span className="text-white text-[10px] leading-none font-black">XXXX</span>
                    </div>
                  }
                  </button> 
                ))}
              </div>
              <p className="text-[8px] text-gray-400 text-center font-bold">Haz clic en las casillas para marcarlas como válidas</p>
            </div>

            <button className="w-full bg-unt-blue text-unt-yellow py-3 rounded-xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2">
              {editingPrize ? <Save size={18} /> : <Plus size={18} />}
              <span>{editingPrize ? 'GUARDAR CAMBIOS' : 'AÑADIR PREMIO'}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Right Column: List and Active Game */}
      <div className={`lg:col-span-8 space-y-6 ${!user?.two_fa_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <h2 className="text-lg font-black text-unt-blue mb-4 uppercase tracking-widest">Lista de Premios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {prizes.map(p => (
              <div key={p.id} className={`p-4 rounded-2xl border-2 transition-all ${gameState.prize?.id === p.id ? 'border-unt-yellow bg-unt-yellow/5' : 'border-gray-50 bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    {p.image_url && <img src={p.image_url} className="w-12 h-12 rounded-lg object-cover" alt={p.name} />}
                    <div className="flex-grow">
                      <h3 className="font-black text-unt-blue uppercase text-sm">{p.name}</h3>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEditPrize(p)} className="text-gray-300 hover:text-unt-blue transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeletePrize(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  {p.status === 'finished' ? (
                    <div className="flex items-center space-x-2 text-xs font-black text-green-600 bg-green-50 p-3 rounded-xl">
                      <CheckCircle size={16} />
                      <span className="truncate uppercase">GANADOR: {p.winner_name}</span>
                    </div>
                  ) : p.status === 'active' ? (
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-center bg-unt-blue text-unt-yellow text-xs font-black py-3 rounded-xl animate-pulse">
                        SORTEO EN CURSO...
                      </div>
                      <div className="flex space-x-2">
                        <input 
                          type="text" 
                          placeholder="Nombre del ganador"
                          value={winnerName}
                          onChange={(e) => setWinnerName(e.target.value)}
                          className="flex-grow bg-white border-2 border-gray-100 text-xs font-bold p-3 rounded-xl outline-none focus:border-unt-blue"
                        />
                        <button 
                          onClick={handleFinishGame}
                          className="bg-red-500 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                          FINALIZAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleStartGame(p.id)}
                      className="w-full bg-white border-2 border-unt-blue text-unt-blue text-xs font-black py-3 rounded-xl hover:bg-unt-blue hover:text-white transition-all shadow-sm"
                    >
                      INICIAR SORTEO
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {gameState.prize && (
          <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Panel de Control de Balotas</h2>
              <span className="bg-unt-yellow text-unt-blue text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                {gameState.prize.name}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-4 text-center">
                <form onSubmit={handleDrawNumber} className="space-y-4">
                  <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40">
                    <input 
                      type="number" 
                      min="1" 
                      max="75"
                      value={manualNumber}
                      onChange={(e) => setManualNumber(e.target.value)}
                      placeholder="00"
                      className="w-full h-full text-4xl sm:text-6xl font-black text-center bg-gray-50 border-4 border-dashed border-gray-100 focus:border-unt-yellow focus:bg-unt-yellow/5 rounded-full outline-none transition-all text-unt-blue"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-unt-yellow text-unt-blue py-3 sm:py-4 rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-unt-yellow/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    REGISTRAR NRO
                  </button>
                </form>
              </div>
              <div className="md:col-span-8">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {gameState.drawnNumbers.slice(0, 12).map((n, idx) => (
                    <div key={idx} className={`aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${idx === 0 ? 'bg-unt-yellow border-unt-yellow shadow-lg scale-110' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`text-[8px] font-black ${idx === 0 ? 'text-unt-blue/60' : 'text-gray-400'}`}>{n.letter}</span>
                      <span className={`text-xl font-black ${idx === 0 ? 'text-unt-blue' : 'text-gray-700'}`}>{n.number}</span>
                    </div>
                  ))}
                  {gameState.drawnNumbers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-300 italic text-sm font-bold uppercase tracking-widest">
                      Esperando primera balota...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Winner Verification Section */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex items-center space-x-2 mb-6">
            <CheckCircle className="text-green-500" size={20} />
            <h2 className="text-lg font-black text-unt-blue uppercase tracking-tight">Verificador de Ganador (Google)</h2>
          </div>
          
          <form onSubmit={handleVerifyWinner} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <input 
                type="text" 
                placeholder="Ingrese número de cartilla (CONTROL)"
                value={ticketToVerify}
                onChange={(e) => setTicketToVerify(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-unt-blue focus:bg-white rounded-2xl outline-none transition-all font-bold"
              />
            </div>
            <button 
              type="submit"
              disabled={isVerifying}
              className="bg-unt-blue text-unt-yellow py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isVerifying ? 'VERIFICANDO...' : 'VERIFICAR'}
            </button>
          </form>

          {verificationResult && (
            <div className="bg-gray-50 rounded-[2rem] p-6 border-2 border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Vendedor</p>
                    <p className="text-xl font-black text-unt-blue">{verificationResult.seller}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Comprador</p>
                    <p className="text-xl font-black text-unt-blue">{verificationResult.buyer}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 border border-gray-100 min-h-[400px]">
                  {verificationResult.file ? (
                    <div className="text-center space-y-4 w-full h-full flex flex-col">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Archivo de la Cartilla</p>
                      
                      <div className="flex-grow w-full h-[350px] rounded-xl overflow-hidden border-2 border-gray-50 shadow-inner">
                        <iframe 
                          src={verificationResult.file.viewLink.replace('/view', '/preview')} 
                          className="w-full h-full"
                          title="Vista previa de cartilla"
                          allow="autoplay"
                        ></iframe>
                      </div>

                      <div className="flex justify-center space-x-4">
                        <a 
                          href={verificationResult.file.viewLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-block text-xs font-black text-unt-blue underline uppercase bg-gray-50 px-4 py-2 rounded-lg hover:bg-unt-yellow transition-colors"
                        >
                          Abrir en Drive
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <X size={48} className="text-red-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400 uppercase">Foto no encontrada en Drive</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
