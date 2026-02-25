import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Settings2,
  Database,
  Key,
  CheckCircle2,
  XCircle,
  Terminal,
  RefreshCcw,
  Zap,
  TrendingUp,
  X,
  ShieldAlert,
  Unplug,
  Fingerprint,
  Lock,
  Save
} from 'lucide-react';

// --- 🛡️ PERMANENT CONFIGURATION OVERRIDE 🛡️ ---
// PASTE YOUR CONFIG OBJECT BELOW TO STOP THE "FORGETTING" ON REFRESH
// It should look like: { apiKey: "...", projectId: "brandally-105d1", ... }
const MANUAL_CONFIG_OVERRIDE = {
  apiKey: "AIzaSyBbk9uSVpB6-U8w43jIEmP1IAT9Hj5b2Yw",
  authDomain: "brandally-105d1.firebaseapp.com",
  projectId: "brandally-105d1",
  storageBucket: "brandally-105d1.firebasestorage.app",
  messagingSenderId: "98581524146",
  appId: "1:98581524146:web:c1b9ce77193ca1a7d1e3ab"
}; 

// --- INITIAL FOUNDATION ---
const getEnvVar = (key, fallback = "") => {
  if (key === 'VITE_FIREBASE_CONFIG' && typeof __firebase_config !== 'undefined') return __firebase_config;
  if (key === 'VITE_APP_ID' && typeof __app_id !== 'undefined') return __app_id;
  try {
    const meta = typeof import.meta !== 'undefined' ? import.meta : null;
    if (meta && meta.env && meta.env[key]) return meta.env[key];
  } catch (e) {}
  return fallback;
};

const App = () => {
  const [config, setConfig] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('pending'); 
  const [authErrorMsg, setAuthErrorMsg] = useState("Checking Identity...");
  const [dbStatus, setDbStatus] = useState('pending'); 
  const [milestones, setMilestones] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [manualConfigInput, setManualConfigInput] = useState("");
  const [configError, setConfigError] = useState("");

  const EXPECTED_PROJECT = "brandally-105d1";

  // 1. PERSISTENCE ENGINE: Prioritize Hardcoded > Memory > Environment
  useEffect(() => {
    // Priority 1: Hardcoded Override (Survives all refreshes)
    if (MANUAL_CONFIG_OVERRIDE && MANUAL_CONFIG_OVERRIDE.projectId) {
      setConfig(MANUAL_CONFIG_OVERRIDE);
      return;
    }

    // Priority 2: Local Storage (Backup)
    const savedConfig = localStorage.getItem('brandally_manual_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
        return;
      } catch (e) {
        localStorage.removeItem('brandally_manual_config');
      }
    }

    // Priority 3: Default Environment Settings
    const raw = getEnvVar('VITE_FIREBASE_CONFIG');
    if (raw) {
      try { setConfig(JSON.parse(raw)); } catch (e) {}
    }
  }, []);

  // 2. Instance Re-Initialization
  useEffect(() => {
    if (!config || !config.projectId) return;

    const setup = async () => {
      try {
        try { await deleteApp(getApp()); } catch (e) {}
        const newApp = initializeApp(config);
        setAuth(getAuth(newApp));
        setDb(getFirestore(newApp));
        
        setAuthStatus('pending');
        setDbStatus('pending');
        setMilestones([]);
      } catch (e) {
        setAuthStatus('failed');
        setAuthErrorMsg("Config Error");
      }
    };
    setup();
  }, [config]);

  // 3. SECURE AUTH HANDSHAKE
  useEffect(() => {
    if (!auth) return;
    let isMounted = true;

    const runAuth = async () => {
      try {
        // ALWAYS use Anonymous for the user's project to avoid token mismatch
        const isUserProject = config?.projectId === EXPECTED_PROJECT;
        const hasSystemToken = typeof __initial_auth_token !== 'undefined' && __initial_auth_token;

        if (hasSystemToken && !isUserProject && !MANUAL_CONFIG_OVERRIDE) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        if (isMounted) {
          setAuthStatus('failed');
          setAuthErrorMsg(err.code || "Handshake Failed");
        }
      }
    };
    runAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && isMounted) {
        setUser(u);
        setAuthStatus('success');
        setAuthErrorMsg("Anonymous Session Active");
      }
    });
    return () => { isMounted = false; unsub(); };
  }, [auth, config]);

  // 4. DATA SYNC
  useEffect(() => {
    if (!user || !db) return;
    
    const ref = collection(db, 'artifacts', 'brandally-prod-v1', 'public', 'data', 'milestones');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMilestones(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setDbStatus('success');
    }, (err) => {
      if (err.code === 'permission-denied') setDbStatus('denied');
    });
    return () => unsub();
  }, [user, db]);

  const handleApplyConfig = () => {
    setConfigError("");
    try {
      let cleaned = manualConfigInput.replace(/^(const|let|var|export)\s+\w+\s*=\s*/, '').replace(/;+\s*$/, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1) throw new Error("Missing { } braces.");
      cleaned = cleaned.substring(start, end + 1);
      const jsonFriendly = cleaned.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9_]+)(['"])?\s*?:/g, '$1"$3":');
      const parsed = JSON.parse(jsonFriendly);
      localStorage.setItem('brandally_manual_config', JSON.stringify(parsed));
      setConfig(parsed);
      setShowConfigModal(false);
    } catch (e) {
      setConfigError(e.message);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('brandally_manual_config');
    window.location.reload();
  };

  const handleCommit = async () => {
    if (!userInput.trim() || !user || !db) return;
    setIsGenerating(true);
    try {
      const ref = collection(db, 'artifacts', 'brandally-prod-v1', 'public', 'data', 'milestones');
      await addDoc(ref, {
        public_log: userInput,
        createdAt: Date.now(),
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
      setUserInput("");
    } catch (err) {
      alert("Permission denied. Check Firestore Rules.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 w-6 h-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            <span className="font-black text-lg uppercase italic tracking-tighter">BrandAlly</span>
          </div>
          <button onClick={() => setShowConfigModal(true)} className="p-2 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all">
            <Settings2 size={18} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
               <Fingerprint size={10} /> Connection Hub
            </h3>
            <StatusBox icon={<Key size={14}/>} label="Auth Handshake" status={authStatus} msg={authErrorMsg} />
            <StatusBox icon={<Database size={14}/>} label="Cloud Access" status={dbStatus} msg={dbStatus === 'success' ? 'Database Online' : 'Access Blocked'} />
          </section>

          <section className="p-5 rounded-[32px] border bg-emerald-500/5 border-emerald-500/10 space-y-4">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-emerald-500">Active Project</span>
                <CheckCircle2 size={12} className="text-emerald-500" />
             </div>
             <div className="bg-black/60 p-4 rounded-2xl border border-white/5 shadow-inner">
                <p className="text-[11px] font-mono break-all text-emerald-400 font-bold">
                  {config?.projectId || "---"}
                </p>
             </div>
             {(localStorage.getItem('brandally_manual_config') || MANUAL_CONFIG_OVERRIDE) && (
               <button onClick={handleReset} className="mt-4 text-[9px] font-bold text-zinc-600 hover:text-white flex items-center gap-1 uppercase transition-colors">
                 <RefreshCcw size={10} /> Reset to Default
               </button>
             )}
          </section>
        </div>
        
        <div className="p-6 border-t border-zinc-900 text-[9px] text-zinc-700 font-mono italic truncate bg-black/30">
          UID: {user?.uid || 'INIT...'}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-[radial-gradient(circle_at_top_right,_#10b98105,_transparent_40%)]">
        {dbStatus === 'denied' || authStatus === 'failed' ? (
          <div className="max-w-xl mx-auto py-10 text-center space-y-8 animate-in fade-in duration-500">
             <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-xl shadow-red-500/5">
               <ShieldAlert className="text-red-500" size={40} />
             </div>
             <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Security Blocked</h2>
             
             <div className="bg-zinc-900/50 p-8 rounded-[40px] text-left border border-white/5 space-y-6 shadow-2xl backdrop-blur-sm">
                <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-white/5 pb-4 flex items-center gap-2">
                   <Lock size={14} className="text-red-500" /> Connection Checklist:
                </p>
                <div className="space-y-5">
                  <div className={`flex gap-4 items-start p-4 rounded-2xl border transition-all ${authStatus === 'failed' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shrink-0 mt-1">1</div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white uppercase tracking-tight">Anonymous Authentication</p>
                      <p className="text-[11px] text-zinc-400">Go to <b>Authentication {' > '} Sign-in method</b> in project <b>{config?.projectId}</b> and turn on <b>Anonymous</b>.</p>
                    </div>
                  </div>
                  <div className={`flex gap-4 items-start p-4 rounded-2xl border transition-all ${dbStatus === 'denied' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shrink-0 mt-1">2</div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white uppercase tracking-tight">Universal Access Rules</p>
                      <p className="text-[11px] text-zinc-400">Paste the <b>PANIC_MODE.rules</b> code from the chat into <b>Firestore {' > '} Rules</b> and click <b>Publish</b>.</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-1000">
            <header className="flex justify-between items-start">
              <div>
                <h1 className="text-6xl font-black italic uppercase leading-none">Founder Log</h1>
                <p className="text-zinc-500 mt-4 font-medium italic">Verified momentum for <b>{config?.projectId}</b>.</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Sync Ready</span>
              </div>
            </header>

            <div className="bg-zinc-900 border border-white/5 p-10 rounded-[48px] shadow-2xl space-y-8 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
              <textarea 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                placeholder="What did you build today?"
                className="w-full bg-transparent border-none text-2xl focus:ring-0 min-h-[140px] resize-none placeholder:text-zinc-800 leading-relaxed font-medium"
              />
              <div className="flex justify-end pt-6 border-t border-white/5">
                <button 
                  onClick={handleCommit} 
                  disabled={isGenerating || !userInput.trim()} 
                  className="bg-emerald-500 text-black px-12 py-4 rounded-full font-black text-sm hover:scale-105 transition-all shadow-xl shadow-emerald-500/10"
                >
                   {isGenerating ? "Syncing..." : "Commit Win"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
               {milestones.length === 0 ? (
                 <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[48px] text-zinc-700 italic text-sm">
                   The ledger is currently empty.
                 </div>
               ) : (
                 milestones.map(m => (
                   <div key={m.id} className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5 flex justify-between items-center group animate-in slide-in-from-top-2">
                     <div className="flex gap-6 items-center">
                        <div className="w-1.5 h-10 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]"></div>
                        <p className="text-lg font-medium text-zinc-200 tracking-tight">{m.public_log}</p>
                     </div>
                     <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{m.timestamp}</span>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-[48px] p-12 space-y-8 shadow-[0_0_100px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white text-center w-full">Manual Override</h3>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-zinc-400 leading-relaxed text-center">
                     Paste your <b>firebaseConfig</b> object to connect.
                   </p>
                   <textarea 
                    value={manualConfigInput}
                    onChange={(e) => setManualConfigInput(e.target.value)}
                    placeholder='const firebaseConfig = { ... };'
                    className={`w-full h-56 bg-black border ${configError ? 'border-red-500/50' : 'border-zinc-800'} rounded-3xl p-6 font-mono text-[11px] text-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none shadow-inner`}
                   />
                   {configError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold">{configError}</div>}
                </div>
                <button onClick={handleApplyConfig} className="w-full py-5 bg-emerald-500 text-black font-black uppercase text-sm rounded-3xl hover:bg-emerald-400 transition-all">
                  Apply Connection Fix
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatusBox = ({ icon, label, status, msg }) => (
  <div className={`p-4 rounded-2xl border transition-all duration-500 ${
    status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 
    status === 'pending' ? 'bg-zinc-900 border-white/5' :
    'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
  }`}>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      {status === 'success' ? <CheckCircle2 size={14} className="text-emerald-500"/> : 
       status === 'pending' ? <Loader2 size={14} className="animate-spin text-zinc-600"/> : 
       <XCircle size={14} className="text-red-500"/>}
    </div>
    <p className={`text-[9px] font-black uppercase tracking-tight truncate ${status === 'success' ? 'text-emerald-500' : 'text-zinc-600'}`}>{msg}</p>
  </div>
);

export default App;