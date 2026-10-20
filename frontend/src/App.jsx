import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientWaitingRoom from './pages/PatientWaitingRoom';
import Login from './pages/Login';

// Protected Route to restrict dashboard to authenticated receptionist staff
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  let isReceptionist = false;
  try {
    const user = JSON.parse(userString);
    if (user && user.role === 'receptionist') {
      isReceptionist = true;
    }
  } catch {
    // Parsing or check failed
  }

  if (!isReceptionist) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans relative overflow-hidden px-4">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[180px] pointer-events-none"></div>

      <div className="max-w-3xl w-full text-center space-y-8 relative z-10">
        <div className="inline-flex h-16 w-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 items-center justify-center shadow-xl shadow-indigo-500/25 mb-4 animate-bounce">
          <span className="text-3xl font-extrabold text-white">Q</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
            Queue Cure '26
          </h1>
          <p className="text-slate-400 text-lg lg:text-xl font-medium max-w-xl mx-auto">
            A production-ready real-time clinic queue management system. Say goodbye to paper tokens and manual tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 max-w-2xl mx-auto">
          {/* Receptionist Portal Card */}
          <Link
            to="/receptionist"
            className="group relative bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
              Receptionist Portal
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Add new patients, call the next token, adjust average consultation times, and manage clinic queue flow.
            </p>
          </Link>

          {/* Patient Waiting Room Card */}
          <Link
            to="/waiting-room"
            className="group relative bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/30 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white group-hover:text-violet-400 transition-colors">
              Patient Waiting Room
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Real-time waiting lobby display. Show current token, upcoming queue, and estimated consultation waiting times.
            </p>
          </Link>
        </div>

        <footer className="pt-16 text-xs text-slate-600 font-semibold tracking-wider uppercase">
          Queue Cure System • Version 1.0.0
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/waiting-room" element={<PatientWaitingRoom />} />
      </Routes>
    </Router>
  );
}
