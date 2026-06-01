import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Square, Hash, Plus, Trophy, Trash2, CheckCircle, Settings, Award, Upload, X, Edit2, Save, Clock, ChevronUp, ChevronDown } from 'lucide-react';

const AdminPanel = ({ gameState, prizes, refreshGame, refreshPrizes, user }) => {
  const [newPrize, setNewPrize] = useState({ name: '', description: '' });
  const [editingPrize, setEditingPrize] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(Array(25).fill(true));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [manualNumber, setManualNumber] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [ticketToVerify, setTicketToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');

  const [editingNumber, setEditingNumber] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [hourOffset, setHourOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [logoFile, setLogoFile] = useState(null);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      now.setHours(now.getHours() + hourOffset);
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [hourOffset]);

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
    if (!twoFAToken.trim()) return;
    try {
      const res = await axios.post(`${apiUrl}/api/admin/confirm-2fa`, { token: twoFAToken }, { withCredentials: true });
      if (res.data.success) {
        alert('✅ 2FA Activado correctamente. Panel desbloqueado.');
        setShow2FASetup(false);
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (err) {
      console.error('Confirm 2FA error:', err);
      alert('❌ Código inválido o error de servidor: ' + (err.response?.data?.message || err.message));
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
    try {
      await axios.post(`${apiUrl}/api/prizes/start`, { prize_id: prizeId });
      refreshGame();
    } catch (err) {
      console.error('Error starting game:', err);
      alert('Error al iniciar el sorteo');
    }
  };

  const handleAddPrize = async (e) => {
    e.preventDefault();
    if (!newPrize.name.trim()) return;
    const formData = new FormData();
    formData.append('name', newPrize.name);
    formData.append('description', newPrize.description);
    formData.append('winning_pattern', JSON.stringify(selectedPattern));
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
      alert('Error al guardar el premio');
    }
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

  const handleUpdateLogo = async (e) => {
    e.preventDefault();
    if (!logoFile) return;
    
    setIsUpdatingLogo(true);
    const formData = new FormData();
    formData.append('image', logoFile);

    try {
      await axios.post(`${apiUrl}/api/admin/config/logo`, formData, { withCredentials: true });
      alert('✅ Logo de la promoción actualizado con éxito');
      setLogoFile(null);
      // El cambio se verá reflejado por socket o al recargar
    } catch (err) {
      console.error('Error updating logo:', err);
      alert('Error al actualizar el logo');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('¿Eliminar este premio?')) return;
    try {
      await axios.delete(`${apiUrl}/api/prizes/${id}`);
      refreshPrizes();
    } catch (err) {
      console.error('Error deleting prize:', err);
      alert('Error al eliminar el premio');
    }
  };

  const handleFinishGame = async () => {
    if (!gameState.prize) return;
    try {
      await axios.post(`${apiUrl}/api/prizes/finish`, { 
        prize_id: gameState.prize.id,
        winner_name: winnerName 
      });
      setWinnerName('');
      setIsVerified(false);
      setVerificationResult(null);
      setTicketToVerify('');
      refreshGame();
      refreshPrizes();
      // Forzar recarga suave o reset de estados críticos para asegurar visibilidad
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error finishing game:', err);
      alert('Error al finalizar el sorteo');
    }
  };

  const handleDrawNumber = async (e) => {
    e.preventDefault();
    if (!gameState.prize) return alert('Selecciona un premio e inicia el sorteo');
    const num = parseInt(manualNumber);
    if (isNaN(num) || num < 1 || num > 75) return alert('Número inválido (1-75)');
    if (gameState.drawnNumbers.some(n => n.number === num)) return alert('Número ya sorteado');
    try {
      await axios.post(`${apiUrl}/api/prizes/draw`, { 
        prize_id: gameState.prize.id,
        number: num,
        drawn_at: currentTime.toISOString()
      });
      setManualNumber('');
      refreshGame();
    } catch (err) {
      console.error('Error drawing number:', err);
      alert('Error al registrar número');
    }
  };

  const handleEditNumber = async (id, newNum) => {
    if (!newNum || isNaN(newNum) || newNum < 1 || newNum > 75) return;
    try {
      await axios.put(`${apiUrl}/api/drawn-numbers/${id}`, { number: parseInt(newNum) });
      setEditingNumber(null);
      setEditValue('');
      refreshGame();
    } catch (err) {
      console.error('Error editing number:', err);
      alert('Error al editar el número');
    }
  };

  const startEditing = (n) => {
    setEditingNumber(n.id);
    setEditValue(n.number.toString());
  };

  const cancelEditing = () => {
    setEditingNumber(null);
    setEditValue('');
  };

  const handleDeleteNumber = async (id) => {
    if (!window.confirm('¿Eliminar este número del sorteo?')) return;
    try {
      await axios.delete(`${apiUrl}/api/drawn-numbers/${id}`);
      refreshGame();
    } catch (err) {
      console.error('Error deleting number:', err);
      alert('Error al eliminar el número');
    }
  };

  const handleVerifyWinner = async (e) => {
    e.preventDefault();
    if (!ticketToVerify.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);
    setIsVerified(false);
    try {
      const res = await axios.get(`${apiUrl}/api/winner-verification/${ticketToVerify}`, { withCredentials: true });
      if (res.data.success) {
        setVerificationResult(res.data);
        setWinnerName(res.data.buyer);
        setIsVerified(true);
      } else {
        setVerificationResult(res.data);
        setIsVerified(false);
      }
    } catch (err) {
      console.error('Error verifying winner:', err);
      alert('Error al verificar el cartón.');
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user?.two_fa_enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
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

        {show2FASetup && (
          <div className="fixed inset-0 bg-unt-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
              <div className="bg-unt-blue p-6 text-center relative">
                <button onClick={() => setShow2FASetup(false)} className="absolute right-4 top-4 text-white/50 hover:text-white"><X size={20} /></button>
                <div className="w-16 h-16 bg-unt-yellow rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg rotate-3"><Settings className="text-unt-blue" size={32} /></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Configurar 2FA</h3>
                <p className="text-unt-yellow/70 text-[10px] font-bold">ESCANE EL CÓDIGO QR</p>
              </div>
              <div className="p-8 space-y-6 text-center">
                {twoFAData ? (
                  <>
                    <div className="bg-gray-50 p-4 rounded-3xl border-2 border-dashed border-gray-200 inline-block mx-auto">
                      <img src={twoFAData.qrCode} alt="QR Code" className="w-40 h-40 mx-auto" />
                    </div>
                    <div className="space-y-4 pt-2">
                      <input type="text" placeholder="000 000" value={twoFAToken} onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full text-center py-4 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-2xl outline-none transition-all font-black text-2xl tracking-[0.5em]" />
                      <button onClick={handleConfirm2FA} className="w-full bg-unt-blue text-unt-yellow py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">ACTIVAR SEGURIDAD</button>
                    </div>
                  </>
                ) : <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-unt-blue mx-auto"></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column */}
      <div className={`lg:col-span-4 space-y-6 ${!user?.two_fa_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-unt-blue flex items-center space-x-2">
              <Trophy size={20} className="text-unt-yellow" />
              <span>{editingPrize ? 'EDITAR PREMIO' : 'GESTIÓN DE PREMIOS'}</span>
            </h2>
            {editingPrize && <button onClick={resetForm} className="text-gray-400 hover:text-red-500"><X size={20} /></button>}
          </div>
          <form onSubmit={handleAddPrize} className="space-y-4">
            <input type="text" value={newPrize.name} onChange={(e) => setNewPrize({...newPrize, name: e.target.value})} placeholder="Nombre" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold" />
            <input type="text" value={newPrize.description} onChange={(e) => setNewPrize({...newPrize, description: e.target.value})} placeholder="Descripción" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none" />
            <div className="relative group">
              <input type="file" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" />
              <div className={`w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center ${imagePreview ? 'border-unt-blue bg-white' : 'border-gray-200 bg-gray-50'}`}>
                {imagePreview ? <img src={imagePreview} className="h-full w-full object-contain p-2" /> : <Upload className="text-gray-300" size={24} />}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-gray-100 p-2 rounded-xl">
              {selectedPattern.map((sel, i) => (
                <button key={i} type="button" onClick={() => togglePattern(i)} className={`aspect-square rounded-md border ${i === 12 ? 'bg-unt-blue' : sel ? 'bg-unt-yellow' : 'bg-white'}`} />
              ))}
            </div>
            <button className="w-full bg-unt-blue text-unt-yellow py-3 rounded-xl font-black flex items-center justify-center space-x-2 hover:bg-unt-blue/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-unt-blue/20">
              {editingPrize ? <Save size={18} /> : <Plus size={18} />}
              <span>{editingPrize ? 'GUARDAR' : 'AÑADIR PREMIO'}</span>
            </button>
          </form>
        </section>

        {/* NEW: Logo Upload Section */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <h2 className="text-lg font-black text-unt-blue flex items-center space-x-2 mb-4">
            <Settings size={20} className="text-unt-yellow" />
            <span>LOGO PROMOCIÓN</span>
          </h2>
          <form onSubmit={handleUpdateLogo} className="space-y-4">
            <div className="relative group">
              <input 
                type="file" 
                onChange={(e) => setLogoFile(e.target.files[0])} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                accept="image/*" 
              />
              <div className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${logoFile ? 'border-unt-blue bg-unt-blue/5' : 'border-gray-200 bg-gray-50 hover:border-unt-blue/30'}`}>
                {logoFile ? (
                  <div className="text-center">
                    <p className="text-[10px] font-black text-unt-blue uppercase">Archivo seleccionado</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{logoFile.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-gray-300 mb-1" size={20} />
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Cambiar Logo Promoción</p>
                  </>
                )}
              </div>
            </div>
            <button 
              type="submit"
              disabled={!logoFile || isUpdatingLogo}
              className="w-full bg-unt-blue text-unt-yellow py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isUpdatingLogo ? 'SUBIENDO...' : 'ACTUALIZAR LOGO'}
            </button>
          </form>
        </section>
      </div>

      {/* Right Column */}
      <div className={`lg:col-span-8 space-y-6 ${!user?.two_fa_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Prizes List */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <h2 className="text-lg font-black text-unt-blue mb-4 uppercase">Lista de Premios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
            {prizes.map(p => (
              <div key={p.id} className={`p-4 rounded-2xl border-2 ${gameState.prize?.id === p.id ? 'border-unt-yellow bg-unt-yellow/5' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    {p.image_url && <img src={p.image_url} className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                      <h3 className="font-black text-unt-blue uppercase text-xs">{p.name}</h3>
                      <p className="text-[8px] text-gray-400">{p.status === 'finished' ? `Ganador: ${p.winner_name}` : p.status}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditPrize(p)} 
                      className="text-gray-400 hover:text-unt-blue"
                      aria-label={`Editar premio ${p.name}`}
                    >
                      <Edit2 size={14}/>
                    </button>
                    <button 
                      onClick={() => handleDeletePrize(p.id)} 
                      className="text-gray-400 hover:text-red-500"
                      aria-label={`Eliminar premio ${p.name}`}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
                {p.status !== 'finished' && p.status !== 'active' && (
                  <button 
                    onClick={() => handleStartGame(p.id)} 
                    className="w-full mt-3 bg-white border-2 border-unt-blue text-unt-blue text-[10px] font-black py-2 rounded-lg uppercase hover:bg-unt-blue hover:text-unt-yellow transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-unt-blue/20"
                    aria-label={`Iniciar sorteo para ${p.name}`}
                  >
                    Iniciar
                  </button>
                )}
                {p.status === 'active' && <div className="mt-3 text-center bg-unt-blue text-unt-yellow text-[10px] font-black py-2 rounded-lg animate-pulse uppercase">En curso...</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Game Control */}
        {gameState.prize && (
          <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Balotas</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock size={14} className="text-unt-blue" />
                  <span className="text-sm font-black text-unt-blue">{currentTime.toLocaleTimeString()}</span>
                  <div className="flex space-x-1">
                    <button onClick={() => setHourOffset(prev => prev + 1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronUp size={10}/></button>
                    <button onClick={() => setHourOffset(prev => prev - 1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronDown size={10}/></button>
                  </div>
                </div>
              </div>
              <span className="bg-unt-yellow text-unt-blue text-[10px] font-black px-3 py-1 rounded-full uppercase">{gameState.prize.name}</span>
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
                    <div 
                      key={n.id || idx} 
                      className={`group relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${idx === 0 ? 'bg-unt-yellow border-unt-yellow shadow-lg scale-110' : 'bg-gray-50 border-gray-100'}`}
                    >
                      {editingNumber === n.id ? (
                        <div className="absolute inset-0 z-20 bg-white rounded-2xl flex flex-col p-1 shadow-2xl border-2 border-unt-blue">
                          <input 
                            autoFocus 
                            type="number" 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full flex-grow text-center font-black text-xl outline-none"
                          />
                          <div className="flex space-x-1 mt-1">
                            <button 
                              onClick={() => handleEditNumber(n.id, editValue)}
                              className="flex-1 bg-green-500 text-white p-1 rounded-lg hover:bg-green-600 transition-colors"
                              title="Actualizar"
                            >
                              <Save size={12} className="mx-auto" />
                            </button>
                            <button 
                              onClick={cancelEditing}
                              className="flex-1 bg-gray-200 text-gray-500 p-1 rounded-lg hover:bg-gray-300 transition-colors"
                              title="Cancelar"
                            >
                              <X size={12} className="mx-auto" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                              onClick={() => startEditing(n)} 
                              className="p-1 bg-white/80 rounded-md text-unt-blue hover:text-unt-blue/70 shadow-sm"
                              aria-label={`Editar número ${n.number}`}
                              title="Editar"
                            >
                              <Edit2 size={8} />
                            </button>
                            <button 
                              onClick={() => handleDeleteNumber(n.id)} 
                              className="p-1 bg-white/80 rounded-md text-red-500 hover:text-red-600 shadow-sm"
                              aria-label={`Eliminar número ${n.number}`}
                              title="Eliminar"
                            >
                              <Trash2 size={8} />
                            </button>
                          </div>
                          <span className={`text-[8px] font-black ${idx === 0 ? 'text-unt-blue/70' : 'text-gray-500'}`}>{n.letter}</span>
                          <span className={`text-xl font-black ${idx === 0 ? 'text-unt-blue' : 'text-gray-700'}`}>{n.number}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Verification */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <h2 className="text-lg font-black text-unt-blue uppercase mb-4">Verificador</h2>
          <form onSubmit={handleVerifyWinner} className="flex flex-col sm:flex-row gap-3 mb-4">
            <input 
              type="text" 
              placeholder="Nro Cartilla" 
              value={ticketToVerify} 
              onChange={(e) => setTicketToVerify(e.target.value)} 
              className="flex-grow p-3 bg-gray-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-unt-blue transition-all" 
              aria-label="Número de Cartilla a verificar"
            />
            <button 
              type="submit" 
              disabled={isVerifying} 
              className="bg-unt-blue text-unt-yellow px-8 py-3 sm:py-0 rounded-xl font-black uppercase text-xs hover:bg-unt-blue/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-unt-blue/20 disabled:opacity-50"
            >
              {isVerifying ? 'VERIFICANDO...' : 'Verificar'}
            </button>
          </form>
              {verificationResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gray-50 rounded-[2rem] p-6 border-2 border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Vendedor</p>
                          <p className="text-xl font-black text-unt-blue">{verificationResult.seller}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Comprador</p>
                          <p className="text-xl font-black text-unt-blue">{verificationResult.buyer}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 border border-gray-100 min-h-[400px]">
                        {verificationResult.file ? (
                          <div className="text-center space-y-4 w-full h-full flex flex-col">
                            <p className="text-[10px] text-gray-500 font-black uppercase">Archivo de la Cartilla</p>
                            
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
                                rel="noopener noreferrer"
                                className="inline-block text-xs font-black text-unt-blue underline uppercase bg-gray-50 px-4 py-2 rounded-lg hover:bg-unt-yellow transition-colors"
                              >
                                Abrir en Drive
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-8">
                            <X size={48} className="text-red-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-500 uppercase">Foto no encontrada en Drive</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón Finalizar reubicado y condicional */}
                  {isVerified && gameState.prize && gameState.prize.status === 'active' && (
                    <div className="flex flex-col items-center space-y-4 pt-4">
                      <div className="text-center">
                        <p className="text-xs font-black text-green-600 uppercase mb-2">¡GANADOR VERIFICADO!</p>
                        <p className="text-sm font-bold text-gray-500">Se registrará a: <span className="text-unt-blue">{winnerName}</span></p>
                      </div>
                      <button 
                        onClick={handleFinishGame}
                        className="w-full max-w-md bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 hover:scale-[1.05] active:scale-[0.98] border-b-4 border-red-800"
                      >
                        FINALIZAR SORTEO Y GUARDAR GANADOR
                      </button>
                    </div>
                  )}
                </div>
              )}
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
