import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useQueueSocket from '../hooks/useQueueSocket';

export default function PatientWaitingRoom() {
  const navigate = useNavigate();

  // Get active patient session
  const [patient, setPatient] = useState(() => {
    const patientString = localStorage.getItem('patient');
    try {
      return patientString ? JSON.parse(patientString) : null;
    } catch {
      return null;
    }
  });

  const handlePatientLogout = () => {
    localStorage.removeItem('patient');
    setPatient(null);
  };

  // Data states
  const [queue, setQueue] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [avgConsultationTime, setAvgConsultationTime] = useState(15);

  // Search/Lookup states
  const [lookupToken, setLookupToken] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // UI animation alert states
  const [isFlashing, setIsFlashing] = useState(false);

  // Handles updating local page data on socket updates
  const handleQueueUpdated = useCallback(() => {
    fetchQueueData();
    fetchSettings();
  }, []);

  const handleCurrentTokenUpdated = useCallback((calledPatient) => {
    setCurrentServing(calledPatient);
    fetchQueueData();
    
    // Trigger visual flash ring to capture attention in the lobby
    setIsFlashing(true);
    // Play a chime/bell sound simulator (browser visual alert)
    setTimeout(() => setIsFlashing(false), 4000);
  }, []);

  // Socket.IO hook registration
  const { isConnected } = useQueueSocket({
    onQueueUpdated: handleQueueUpdated,
    onCurrentTokenUpdated: handleCurrentTokenUpdated
  });

  useEffect(() => {
    fetchQueueData();
    fetchSettings();
  }, []);

  // Keep lookup result synced if queue changes
  useEffect(() => {
    if (lookupToken) {
      performLookup(lookupToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentServing]);

  async function fetchQueueData() {
    try {
      const queueRes = await api.get('/patients');
      // Filter to pending waiting patients
      const waitingPatients = queueRes.data.filter((p) => p.status === 'waiting');
      setQueue(waitingPatients);

      const servingRes = await api.get('/current-token');
      setCurrentServing(servingRes.data);
    } catch (err) {
      console.error('Error fetching queue data:', err);
    }
  }

  async function fetchSettings() {
    try {
      const res = await api.get('/settings');
      setAvgConsultationTime(res.data.averageConsultationTime);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }

  // Process personal token status search
  function performLookup(tokenString) {
    const tokenNum = parseInt(tokenString, 10);
    if (isNaN(tokenNum)) {
      setLookupResult(null);
      return;
    }

    // 1. Is it currently serving?
    if (currentServing && Number(currentServing.tokenNumber) === tokenNum) {
      setLookupResult({
        status: 'serving',
        patientName: currentServing.patientName,
        tokenNumber: tokenNum,
        patientsAhead: 0,
        waitTime: 0
      });
      return;
    }

    // 2. Is it in the waiting queue?
    const indexInQueue = queue.findIndex((p) => Number(p.tokenNumber) === tokenNum);
    if (indexInQueue !== -1) {
      const patient = queue[indexInQueue];
      setLookupResult({
        status: 'waiting',
        patientName: patient.patientName,
        tokenNumber: tokenNum,
        patientsAhead: indexInQueue, // number of patients ahead of this one (0-indexed position)
        waitTime: patient.estimatedWaitingTime
      });
      return;
    }

    // 3. Fallback: Not found
    setLookupResult({
      status: 'not_found',
      tokenNumber: tokenNum
    });
  }

  function handleLookupChange(e) {
    const val = e.target.value;
    setLookupToken(val);
    if (!val.trim()) {
      setLookupResult(null);
      return;
    }
    performLookup(val);
  }

  function clearLookup() {
    setLookupToken('');
    setLookupResult(null);
  }

  // Stats derivations
  const totalPatientsAhead = queue.length;
  const totalEstimatedWait = totalPatientsAhead * avgConsultationTime;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Background ambient lighting glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[180px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl font-bold text-white">Q</span>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Queue Cure '26
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                St. Jude General Clinic • Waiting Lobby
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-full px-4.5 py-1.5 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`}></span>
              <span className="text-xs font-semibold text-slate-300">
                {isConnected ? 'Lobby Sync Connected' : 'Connecting Lobby...'}
              </span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              {patient ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-white">{patient.patientName}</p>
                    <p className="text-[9px] text-indigo-400 font-bold tracking-wider uppercase">Token #{String(patient.tokenNumber).padStart(3, '0')}</p>
                  </div>
                  <button
                    onClick={handlePatientLogout}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md"
                    title="Log Out"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Patient Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TV Screen Layout Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 relative z-10">
        
        {/* Personalized Welcome Banner if Logged In */}
        {patient && (() => {
          const currentServingToken = currentServing?.tokenNumber || 0;
          const myToken = patient.tokenNumber;

          // 1. Is it currently serving?
          const isServingNow = currentServingToken === myToken;

          // 2. How many ahead in the queue?
          const indexInQueue = queue.findIndex((p) => p.tokenNumber === myToken);
          const isWaiting = indexInQueue !== -1;

          // Est wait time
          const myWaitTime = isWaiting ? queue[indexInQueue].estimatedWaitingTime : 0;

          return (
            <div className={`border rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md transition-all duration-500 animate-fade-in ${
              isServingNow 
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30 animate-pulse' 
                : isWaiting
                ? 'bg-gradient-to-r from-indigo-950/20 via-slate-900 to-slate-900 border-indigo-500/25'
                : 'bg-gradient-to-r from-slate-900 to-slate-900/90 border-slate-800'
            }`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold tracking-widest px-3 py-1 rounded-full uppercase border ${
                      isServingNow 
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                        : isWaiting
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {isServingNow ? '🟢 Active Calling' : isWaiting ? '🕒 Waiting In Queue' : '⚪ Completed / Off Queue'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Welcome back, {patient.patientName}!
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {isServingNow 
                      ? 'Your token is being called right now! Please proceed to the consulting room.' 
                      : isWaiting 
                      ? `Your token #${String(myToken).padStart(3, '0')} is active. Please wait in the lobby.` 
                      : `Your token #${String(myToken).padStart(3, '0')} is not active in the waiting line.`}
                  </p>
                </div>

                {/* Token Badge and Stats Grid */}
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-center min-w-[110px] flex-1 md:flex-initial shadow-inner">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Your Token</span>
                    <span className="text-3xl font-black text-indigo-400 mt-0.5 block tracking-tighter">
                      {String(myToken).padStart(3, '0')}
                    </span>
                  </div>

                  {isWaiting && (
                    <>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-center min-w-[110px] flex-1 md:flex-initial shadow-inner">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Patients Ahead</span>
                        <span className="text-3xl font-black text-white mt-0.5 block tracking-tighter">
                          {indexInQueue}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-center min-w-[110px] flex-1 md:flex-initial shadow-inner">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Est. Wait Time</span>
                        <span className="text-3xl font-black text-teal-400 mt-0.5 block tracking-tighter">
                          {myWaitTime} <span className="text-xs font-semibold text-slate-500">min</span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Top Split - Large Token Board vs Stats & Search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 1. Now Serving Display (TV Screen Optimized) */}
          <div className={`lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/90 border rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-500 ${
            isFlashing ? 'border-emerald-500/60 ring-4 ring-emerald-500/10 scale-[1.01]' : 'border-slate-800/80'
          }`}>
            {/* Pulsing indicator background glow */}
            <div className={`absolute top-[-10%] right-[-10%] w-60 h-60 rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${
              isFlashing ? 'bg-emerald-500/15' : 'bg-indigo-500/5'
            }`}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-full uppercase border ${
                  isFlashing 
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 animate-bounce' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                  {isFlashing ? '🔔 Now Calling 🔔' : 'Now Serving'}
                </span>
                
                {currentServing ? (
                  <h2 className="text-3xl font-extrabold text-white mt-5 tracking-tight">
                    {currentServing.patientName}
                  </h2>
                ) : (
                  <div className="h-5"></div>
                )}
              </div>

              {/* Dynamic flashing bell indicator */}
              {isFlashing && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl animate-pulse text-emerald-400">
                  <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              )}
            </div>

            {/* Giant Token Number */}
            {currentServing ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-16 relative">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Token Number</p>
                <div className={`text-9xl md:text-[11rem] font-black tracking-tighter select-none transition-all duration-500 leading-none ${
                  isFlashing ? 'text-emerald-400 scale-[1.03]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400'
                }`}>
                  {String(currentServing.tokenNumber).padStart(3, '0')}
                </div>
                {isFlashing && (
                  <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs animate-pulse mt-4">
                    Please proceed to consulting room
                  </p>
                )}
              </div>
            ) : (
              <div className="py-24 text-center">
                <p className="text-slate-500 text-xl font-bold uppercase tracking-wider">No Active Consultation</p>
              </div>
            )}

            <div className="border-t border-slate-900 pt-6 flex justify-between items-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span>Automatic Live Refresh</span>
              <span>Avg Consult: {avgConsultationTime} mins</span>
            </div>
          </div>

          {/* 2. Side Panel - Stats Widgets & Token Search */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Total Waiting Stats */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-5 flex items-center justify-between shadow-xl backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patients Ahead</p>
                <p className="text-4xl font-extrabold text-white mt-1.5 tracking-tight">
                  {totalPatientsAhead} <span className="text-sm font-semibold text-slate-500">Ahead</span>
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Total Estimated Queue Wait Time */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-5 flex items-center justify-between shadow-xl backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Queue Waiting Time</p>
                <p className="text-4xl font-extrabold text-indigo-400 mt-1.5 tracking-tight">
                  {totalEstimatedWait} <span className="text-sm font-semibold text-slate-500">mins</span>
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* personal Token Status Lookup Card */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-sm flex-1 flex flex-col justify-between hover:border-slate-800 transition-colors">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-3 w-1 bg-indigo-500 rounded-full"></span>
                  Personal Token Lookup
                </h3>
                
                <div className="relative">
                  <input
                    type="text"
                    value={lookupToken}
                    onChange={handleLookupChange}
                    placeholder="Enter your Token e.g. 104"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-10 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono font-semibold"
                  />
                  {lookupToken && (
                    <button
                      onClick={clearLookup}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Lookup results response display */}
                {lookupResult && (
                  <div className="mt-4 animate-fade-in">
                    {lookupResult.status === 'serving' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px]">Your status: Serving</p>
                        <p className="font-medium text-slate-200">Hi <strong>{lookupResult.patientName}</strong>! Your token is currently being called. Please enter the consulting room.</p>
                      </div>
                    )}
                    
                    {lookupResult.status === 'waiting' && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-4 rounded-2xl text-xs space-y-2.5">
                        <p className="font-bold uppercase tracking-wider text-[10px]">Your status: Waiting</p>
                        <p className="font-medium text-slate-200">Hi <strong>{lookupResult.patientName}</strong>! Here is your position:</p>
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-indigo-500/10 text-center">
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Patients Ahead</span>
                            <span className="text-xl font-bold text-white mt-1 block">{lookupResult.patientsAhead}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Est. Wait Time</span>
                            <span className="text-xl font-bold text-indigo-300 mt-1 block">{lookupResult.waitTime} mins</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {lookupResult.status === 'not_found' && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px]">Token not found</p>
                        <p className="font-medium text-slate-300">Token <strong>#{lookupResult.tokenNumber}</strong> is not in the active waiting queue. It may have already been completed or is invalid.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!lookupResult && (
                <div className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase mt-4 text-center">
                  Search status instantly
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 3. Bottom Section - Upcoming Tokens Grid (TV Friendly) */}
        <section className="bg-slate-900/50 border border-slate-900 rounded-3xl p-8 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full"></span>
              Upcoming Queue Line
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Displaying Next up</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {queue.length > 0 ? (
              queue.slice(0, 8).map((patient, index) => {
                const estMinutes = patient.estimatedWaitingTime;

                return (
                  <div
                    key={patient._id}
                    className="relative bg-slate-950/60 hover:bg-slate-950 border border-slate-900/80 hover:border-indigo-500/25 p-5.5 rounded-2xl transition-all duration-300 group shadow-lg flex flex-col justify-between min-h-[120px]"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/15">
                        Token #{String(patient.tokenNumber).padStart(3, '0')}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        {index === 0 ? 'Next Up' : `${index} patient${index > 1 ? 's' : ''} ahead`}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">
                      {patient.patientName}
                    </h3>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      <span>Wait Time</span>
                      <span className="text-indigo-300 font-bold">
                        {index === 0 ? 'Immediate' : `~ ${estMinutes} min`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-500 font-bold uppercase tracking-widest border border-dashed border-slate-900 rounded-3xl">
                No Patients Waiting
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
