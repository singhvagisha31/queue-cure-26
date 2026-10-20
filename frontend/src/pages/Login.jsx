import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [activeTab, setActiveTab] = useState('receptionist'); // 'receptionist' | 'patient'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenNumberInput, setTokenNumberInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleReceptionistLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/receptionist');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    const tokenNum = parseInt(tokenNumberInput, 10);
    if (isNaN(tokenNum)) {
      setError('Please enter a valid numeric token number.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await api.get('/patients');
      const foundPatient = res.data.find((p) => p.tokenNumber === tokenNum);
      if (foundPatient) {
        const patientData = {
          patientName: foundPatient.patientName,
          tokenNumber: foundPatient.tokenNumber,
          role: 'patient'
        };
        localStorage.setItem('patient', JSON.stringify(patientData));
        navigate('/waiting-room');
      } else {
        setError('Token number not found in the active queue.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoCredentials = () => {
    setUsername('receptionist');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans relative overflow-hidden px-4">
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[180px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 space-y-8">
        
        {/* Title logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
            <span className="text-2xl font-black text-white">Q</span>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent tracking-tight">
            Queue Cure '26
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Clinic Access Portal
          </p>
        </div>

        {/* Auth Box Container */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          
          {/* Tabs header */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 border border-slate-800/60 rounded-2xl mb-6">
            <button
              onClick={() => { setActiveTab('receptionist'); setError(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'receptionist'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Staff Portal
            </button>
            <button
              onClick={() => { setActiveTab('patient'); setError(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'patient'
                  ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Patient Portal
            </button>
          </div>

          {error && (
            <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs font-semibold p-3.5 rounded-2xl mb-5 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form receptionist */}
          {activeTab === 'receptionist' && (
            <form onSubmit={handleReceptionistLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. receptionist"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Log In to Dashboard</span>
                )}
              </button>

              {/* Demo Assist */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={loadDemoCredentials}
                  className="w-full bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-bold py-2.5 px-3 rounded-2xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Quick Load Staff Demo credentials</span>
                </button>
              </div>
            </form>
          )}

          {/* Form patient portal */}
          {activeTab === 'patient' && (
            <form onSubmit={handlePatientLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Token Number
                </label>
                <input
                  type="number"
                  required
                  placeholder="Enter your Token Number (e.g. 101)"
                  value={tokenNumberInput}
                  onChange={(e) => setTokenNumberInput(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors disabled:opacity-50 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !tokenNumberInput}
                className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-violet-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Accessing Lobby...</span>
                  </>
                ) : (
                  <span>Access Patient Lobby</span>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-300 text-xs font-semibold hover:underline cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>

      </div>
    </div>
  );
}
