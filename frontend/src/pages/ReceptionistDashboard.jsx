import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useQueueSocket from '../hooks/useQueueSocket';

export default function ReceptionistDashboard() {
  const navigate = useNavigate();

  // Get active receptionist user
  const [user] = useState(() => {
    const userString = localStorage.getItem('user');
    try {
      return userString ? JSON.parse(userString) : { username: 'Staff Member', email: 'receptionist@stjude.com' };
    } catch {
      return { username: 'Staff Member', email: 'receptionist@stjude.com' };
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Form and settings states
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avgConsultationTime, setAvgConsultationTime] = useState(15);
  
  // Data states
  const [queue, setQueue] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  
  // UI states
  const [toasts, setToasts] = useState([]);
  const [errorBanner, setErrorBanner] = useState('');
  
  // Loading states
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Helper to trigger toast notifications
  const triggerToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Callback to refresh data on socket update events
  const handleQueueUpdated = useCallback(() => {
    fetchQueueData(false); // fetch silently without full table skeleton flash
  }, []);

  const handleCurrentTokenUpdated = useCallback((calledPatient) => {
    setCurrentServing(calledPatient);
    fetchQueueData(false);
    if (calledPatient) {
      triggerToast(`Called Token #${calledPatient.tokenNumber} (${calledPatient.patientName}) to consulting room!`, 'info');
    } else {
      triggerToast('Queue is currently empty. No patients left to serve.', 'warning');
    }
  }, []);

  // Connect Socket.IO
  const { isConnected } = useQueueSocket({
    onQueueUpdated: handleQueueUpdated,
    onCurrentTokenUpdated: handleCurrentTokenUpdated
  });

  // Load initial data on mount
  useEffect(() => {
    fetchQueueData(true); // show skeleton on initial load
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchQueueData(showSkeleton = false) {
    if (showSkeleton) setIsLoadingQueue(true);
    setErrorBanner('');
    try {
      const queueRes = await api.get('/patients');
      // Filter list to show pending waiting patients
      const waitingPatients = queueRes.data.filter((p) => p.status === 'waiting');
      setQueue(waitingPatients);

      const servingRes = await api.get('/current-token');
      setCurrentServing(servingRes.data);
    } catch (err) {
      console.error('Error fetching queue data:', err);
      setErrorBanner('Failed to synchronize queue with database. Check server connection.');
    } finally {
      if (showSkeleton) setIsLoadingQueue(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await api.get('/settings');
      setAvgConsultationTime(res.data.averageConsultationTime);
    } catch (err) {
      console.error('Error fetching settings:', err);
      triggerToast('Failed to load clinic configurations.', 'error');
    }
  }

  async function handleAddPatient(e) {
    e.preventDefault();
    if (!patientName.trim()) return;

    setIsAddingPatient(true);
    setErrorBanner('');
    try {
      const res = await api.post('/patients', { patientName, phoneNumber });
      setPatientName('');
      setPhoneNumber('');
      triggerToast(`Added ${patientName} successfully! Token Number: ${res.data.tokenNumber}`, 'success');
    } catch (err) {
      console.error('Error adding patient:', err);
      const errMsg = err.response?.data?.error || 'Failed to add patient to queue.';
      triggerToast(errMsg, 'error');
    } finally {
      setIsAddingPatient(false);
    }
  }

  async function handleCallNext() {
    setIsCallingNext(true);
    setErrorBanner('');
    try {
      const res = await api.post('/call-next');
      const called = res.data.calledPatient;
      if (called) {
        // Handled also by socket, but updated locally as well in case of lag
        setCurrentServing(called);
        triggerToast(`Called Token #${called.tokenNumber} (${called.patientName}) next!`, 'success');
      } else {
        triggerToast('No patients left in the waiting queue!', 'warning');
      }
    } catch (err) {
      console.error('Error calling next patient:', err);
      triggerToast('Error calling next patient. Please try again.', 'error');
    } finally {
      setIsCallingNext(false);
    }
  }

  async function handleUpdateSettings(e) {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.post('/settings', { averageConsultationTime: avgConsultationTime });
      triggerToast('Clinic consultation settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      const errMsg = err.response?.data?.error || 'Failed to save settings.';
      triggerToast(errMsg, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Stats derivations
  const totalWaitingCount = queue.length;
  const estimatedQueueDelay = totalWaitingCount * avgConsultationTime;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Queue Cure Receptionist Dashboard
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                St. Jude General Clinic • Live Portal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-full px-4 py-1.5 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`}></span>
              <span className="text-xs font-semibold text-slate-300">
                {isConnected ? 'Sync Active' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-white">{user.username}</p>
                <p className="text-[9px] text-slate-400 font-semibold">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-950 hover:bg-slate-950/40 border border-slate-800 text-slate-300 hover:text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Error Banner */}
      {errorBanner && (
        <div className="bg-rose-950/40 border-b border-rose-500/20 text-rose-300 px-4 py-3 text-center text-sm shadow-md flex items-center justify-center gap-2 animate-fade-in font-medium">
          <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {errorBanner}
          <button onClick={() => fetchQueueData(true)} className="underline hover:text-white ml-2 text-xs">Retry Sync</button>
        </div>
      )}

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Actions & Configurations */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Section 1: Add Patient Form */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-800/50 transition-colors">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="h-4 w-1 bg-gradient-to-b from-indigo-500 to-teal-500 rounded-full"></span>
              Add Patient Form
            </h2>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Patient Name
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  disabled={isAddingPatient}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-55"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  disabled={isAddingPatient}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-55"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingPatient || !patientName.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isAddingPatient ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding Patient...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Add Patient</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Section 5: Call Next Patient (Prominent Control) */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-sm hover:border-slate-800/50 transition-colors">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="h-4 w-1 bg-gradient-to-b from-indigo-500 to-teal-500 rounded-full"></span>
              Queue Controls
            </h2>
            <button
              onClick={handleCallNext}
              disabled={isCallingNext}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {isCallingNext ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Progressing Queue...</span>
                </>
              ) : (
                <>
                  <span>Call Next Patient</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </section>

          {/* Section 3: Average Consultation Time Configuration */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-sm hover:border-slate-800/50 transition-colors">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="h-4 w-1 bg-gradient-to-b from-indigo-500 to-teal-500 rounded-full"></span>
              Average Consultation Time
            </h2>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Minutes Per Consultation
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="180"
                  value={avgConsultationTime}
                  onChange={(e) => setAvgConsultationTime(parseInt(e.target.value) || 1)}
                  disabled={isSavingSettings}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-55"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold py-3 px-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving settings...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </form>
          </section>

        </div>

        {/* Right Columns: Current Token Card & Active Queue Table */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Analytics Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Total Pending Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Waiting Patients</p>
                <p className="text-3xl font-extrabold text-white mt-1">{totalWaitingCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            {/* Estimated Wait Delay Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Queue Delay</p>
                <p className="text-3xl font-extrabold text-teal-400 mt-1">
                  {estimatedQueueDelay} <span className="text-sm font-semibold text-slate-500">mins</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

          </div>

          {/* Section 2: Current Token Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/20 border border-slate-900/60 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:border-slate-800/40 transition-colors">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="space-y-2">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-indigo-500/20">
                Currently Serving
              </span>
              {currentServing ? (
                <div>
                  <h3 className="text-3xl font-extrabold text-white tracking-tight pt-2">
                    {currentServing.patientName}
                  </h3>
                  {currentServing.phoneNumber && (
                    <p className="text-xs text-indigo-300 font-semibold font-mono mt-1 flex items-center gap-1">
                      📱 {currentServing.phoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    In consulting room since {new Date(currentServing.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="pt-2 text-slate-500 font-bold text-sm uppercase tracking-wider">
                  No Active Consultation
                </div>
              )}
            </div>

            {currentServing && (
              <div className="bg-slate-950/80 border border-indigo-500/20 rounded-2xl px-6 py-5 text-center min-w-[150px] shadow-inner shrink-0 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Token</span>
                <span className="text-5xl font-black text-indigo-400 mt-1 tracking-tighter">
                  {String(currentServing.tokenNumber).padStart(3, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Queue Table */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-sm hover:border-slate-800/40 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="h-4 w-1 bg-gradient-to-b from-indigo-500 to-teal-500 rounded-full"></span>
                Waiting Queue Table
              </h2>
              <span className="text-xs font-semibold bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300">
                {queue.length} Patients Waiting
              </span>
            </div>

            <div className="overflow-x-auto">
              {isLoadingQueue ? (
                // Loading Skeletons
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center justify-between bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50 animate-pulse">
                      <div className="h-5 w-16 bg-slate-800 rounded-lg"></div>
                      <div className="h-5 w-40 bg-slate-800 rounded-lg"></div>
                      <div className="h-5 w-24 bg-slate-800 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : queue.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4">Token Number</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-sm">
                    {queue.map((patient) => (
                      <tr key={patient._id} className="hover:bg-slate-900/30 transition-colors group">
                        <td className="py-4 px-4 font-mono font-bold text-indigo-400 group-hover:text-indigo-300">
                          #{String(patient.tokenNumber).padStart(3, '0')}
                        </td>
                        <td className="py-4 px-4 text-slate-200 group-hover:text-white font-semibold">
                          {patient.patientName}
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-mono">
                          {patient.phoneNumber || '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                            Waiting
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-slate-500 font-bold uppercase tracking-widest border border-dashed border-slate-800/80 rounded-2xl">
                  No Patients Waiting
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Slide-in Toast notifications container */}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 border p-4 rounded-2xl shadow-xl backdrop-blur-md animate-slide-in relative overflow-hidden ${
              toast.type === 'success'
                ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-slate-900/90 border-rose-500/30 text-rose-400'
                : toast.type === 'warning'
                ? 'bg-slate-900/90 border-amber-500/30 text-amber-400'
                : 'bg-slate-900/90 border-indigo-500/30 text-indigo-400'
            }`}
          >
            {/* Visual glow indicator */}
            <span className={`absolute top-0 bottom-0 left-0 w-1.5 ${
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : toast.type === 'warning'
                ? 'bg-amber-500'
                : 'bg-indigo-500'
            }`}></span>
            
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
