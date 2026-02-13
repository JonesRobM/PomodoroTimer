import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, SkipForward, CheckCircle2, Circle, Plus, Trash2, 
  Award, Zap, Brain, Coffee, Wind, Info, ChevronRight, Sparkles, Loader2, ListTree,
  Activity, ShieldCheck
} from 'lucide-react';

// --- API Configuration ---
const apiKey = ""; 
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

const App = () => {
  // --- Constants ---
  const MODES = {
    FOCUS: { id: 'FOCUS', label: 'Focus Deep', time: 25 * 60, desc: 'High-intensity cognitive work.' },
    SHORT_BREAK: { id: 'SHORT_BREAK', label: 'Short Rest', time: 5 * 60, desc: 'Brief physiological reset.' },
    LONG_BREAK: { id: 'LONG_BREAK', label: 'Deep Reset', time: 15 * 60, desc: 'Extended recovery.' }
  };

  // --- Persistence & State ---
  const [mode, setMode] = useState('FOCUS');
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.time);
  const [isActive, setIsActive] = useState(false);
  const [points, setPoints] = useState(() => Number(localStorage.getItem('focus_points')) || 0);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('focus_history')) || []);
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('focus_tasks')) || []);
  const [newTask, setNewTask] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiCoachResponse, setAiCoachResponse] = useState(null);
  const [showPreFlight, setShowPreFlight] = useState(false);
  
  const timerRef = useRef(null);

  // --- Side Effects: Persistence ---
  useEffect(() => {
    localStorage.setItem('focus_points', points);
    localStorage.setItem('focus_history', JSON.stringify(history));
    localStorage.setItem('focus_tasks', JSON.stringify(tasks));
  }, [points, history, tasks]);

  // --- Helpers ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Gemini API Integration ---
  const callGemini = async (prompt, systemInstruction = "You are a productivity coach.") => {
    setIsAiLoading(true);
    let retries = 0;
    const delays = [1000, 2000, 4000, 8000, 16000];
    while (retries < 5) {
      try {
        const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        setIsAiLoading(false);
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        retries++;
        if (retries === 5) { setIsAiLoading(false); return null; }
        await new Promise(res => setTimeout(res, delays[retries - 1]));
      }
    }
  };

  const generateFocusProtocol = async () => {
    const taskContext = tasks.filter(t => !t.completed).map(t => t.text).join(", ");
    const prompt = `Session: ${MODES[mode].label}. Tasks: ${taskContext || 'General'}. Protocol for mindset? 2 sentences. Stoic.`;
    const result = await callGemini(prompt, "High-performance coach. Systems thinker. Concise.");
    if (result) setAiCoachResponse(result);
  };

  const breakdownTask = async (taskId, taskText) => {
    const prompt = `Break down "${taskText}" into 3 actionable steps. Bulleted list only.`;
    const result = await callGemini(prompt, "Systems engineer. Logic-based micro-steps.");
    if (result) {
      const subTasks = result.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-*•\d.]\s*/, '').trim());
      const newTasks = subTasks.map(st => ({ id: Date.now() + Math.random(), text: st, completed: false }));
      setTasks(prev => [...prev.filter(t => t.id !== taskId), ...newTasks]);
    }
  };

  // --- Recommendation Engine ---
  const recommendation = useMemo(() => {
    const focusCount = history.filter(m => m === 'FOCUS').length;
    const lastThree = history.slice(-3);
    const isHighEntropy = lastThree.length === 3 && lastThree.every(m => m === 'FOCUS');

    if (isActive) return { text: "Protocol Active", icon: ShieldCheck };
    if (isHighEntropy) return { text: "Entropy high. Reset suggested.", target: 'LONG_BREAK', icon: Activity };
    if (history[history.length - 1] === 'FOCUS') return { text: "Phase complete. Rest advised.", target: 'SHORT_BREAK', icon: Coffee };
    
    return { text: "Ready. Engage Focus.", target: 'FOCUS', icon: Brain };
  }, [history, isActive]);

  // --- Timer Operations ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleComplete = () => {
    const earned = Math.floor(MODES[mode].time / 60);
    setPoints(prev => prev + earned);
    setHistory(prev => [...prev, mode]);
    setIsActive(false);
    setAiCoachResponse(null);
  };

  const startSession = () => {
    if (mode === 'FOCUS' && !isActive) {
      setShowPreFlight(true);
    } else {
      setIsActive(!isActive);
    }
  };

  const confirmPreFlight = () => {
    setShowPreFlight(false);
    setIsActive(true);
  };

  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].time);
    setAiCoachResponse(null);
    setShowPreFlight(false);
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask('');
  };

  const RecIcon = recommendation.icon;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-400 font-sans selection:bg-zinc-800 touch-none overscroll-none">
      <div className="max-w-xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-6 md:space-y-8 h-full overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-end border-b border-zinc-900 pb-4 md:pb-6">
          <div>
            <h1 className="text-base md:text-lg font-medium tracking-tight text-zinc-100">Focus System</h1>
            <p className="text-[8px] md:text-[9px] text-zinc-600 uppercase tracking-[0.3em] mt-1">Mobile Integrity // v2.4</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-wider mb-1 justify-end">
              <Award size={10} />
              <span>Credit</span>
            </div>
            <span className="text-xl md:text-2xl font-light tabular-nums text-zinc-300">{points}</span>
          </div>
        </header>

        {/* System Recommender / Coach */}
        {aiCoachResponse ? (
          <div className="bg-zinc-900/40 border border-zinc-800 text-zinc-300 rounded-2xl p-4 md:p-5 relative animate-in fade-in slide-in-from-top-2">
            <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-2">
              <Sparkles size={10} /> Active Protocol
            </p>
            <p className="text-xs md:text-sm font-light leading-relaxed italic">"{aiCoachResponse}"</p>
          </div>
        ) : (
          <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 shrink-0">
                <RecIcon size={14} />
              </div>
              <p className="text-xs md:text-sm text-zinc-500 font-light truncate">{recommendation.text}</p>
            </div>
            <button onClick={generateFocusProtocol} disabled={isAiLoading}
              className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-2 rounded-lg shrink-0 active:bg-zinc-800 transition-colors">
              {isAiLoading ? <Loader2 size={10} className="animate-spin" /> : "Protocol"}
            </button>
          </div>
        )}

        {/* Timer Card */}
        <main className="relative">
          <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2rem] md:rounded-[2.5rem] py-8 md:py-12 px-4 text-center relative overflow-hidden">
            
            {showPreFlight && (
              <div className="absolute inset-0 bg-zinc-950/98 z-20 flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <ShieldCheck className="text-zinc-700" size={40} />
                <div className="space-y-2 px-4">
                  <h3 className="text-zinc-200 text-xs md:text-sm font-medium uppercase tracking-[0.2em]">Pre-Flight Check</h3>
                  <p className="text-[10px] md:text-xs text-zinc-600 leading-relaxed mx-auto">Mute notifications. Clear space. <br/>Define the single objective.</p>
                </div>
                <button onClick={confirmPreFlight} className="bg-zinc-100 text-zinc-900 w-full max-w-[220px] py-4 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-white/5">
                  Confirm Engagement
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 mb-8 md:mb-12">
              {Object.keys(MODES).map((m) => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`text-[8px] md:text-[9px] uppercase font-bold tracking-[0.2em] px-3 md:px-4 py-2 rounded-lg transition-all border ${
                    mode === m ? `bg-zinc-800 border-zinc-700 text-zinc-100` : 'border-transparent text-zinc-600'
                  }`}>
                  {MODES[m].label}
                </button>
              ))}
            </div>

            <div className="mb-8 md:mb-12">
              <span className="text-[22vw] md:text-[8.5rem] font-extralight tracking-tighter tabular-nums leading-none block text-zinc-200">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-zinc-600 mt-4 md:mt-8">{MODES[mode].desc}</p>
            </div>

            <div className="flex justify-center items-center gap-6 md:gap-10">
              <button onClick={() => { setIsActive(false); setTimeLeft(MODES[mode].time); }} className="p-4 text-zinc-800 active:text-zinc-400"><RotateCcw size={20} /></button>
              <button onClick={startSession} className={`w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] flex items-center justify-center border transition-all active:scale-90 ${
                  isActive ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-white text-zinc-900 shadow-[0_0_40px_rgba(255,255,255,0.05)]'
                }`}>
                {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>
              <button onClick={handleComplete} className="p-4 text-zinc-800 active:text-zinc-400"><SkipForward size={20} /></button>
            </div>
          </div>
        </main>

        {/* Task Protocol */}
        <section className="space-y-4 pb-12">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Objective Stack</h2>
            <button onClick={() => { if(window.confirm('Wipe session memory?')) setTasks([]); }} className="text-[8px] text-zinc-800 active:text-red-900 tracking-widest uppercase p-2">Clear</button>
          </div>

          <form onSubmit={addTask} className="flex gap-2">
            <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Define objective..."
              className="flex-1 bg-zinc-900/30 border border-zinc-900 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-zinc-800 transition-all text-zinc-300 placeholder:text-zinc-800" />
            <button type="submit" className="bg-zinc-800 text-zinc-200 px-6 rounded-xl border border-zinc-700 active:bg-zinc-700 transition-colors"><Plus size={20} /></button>
          </form>

          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${task.completed ? 'bg-transparent border-transparent opacity-20' : 'bg-zinc-900/20 border-zinc-900'}`}>
                <button onClick={() => setTasks(tasks.map(t => t.id === task.id ? {...t, completed: !t.completed} : t))}
                  className={`p-1 transition-colors ${task.completed ? 'text-zinc-700' : 'text-zinc-800 active:text-zinc-400'}`}>
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <span className={`text-sm flex-1 font-light ${task.completed ? 'line-through' : 'text-zinc-400'}`}>{task.text}</span>
                <div className="flex items-center gap-2">
                  {!task.completed && <button onClick={() => breakdownTask(task.id, task.text)} className="p-2 text-zinc-700 active:text-zinc-300"><ListTree size={18} /></button>}
                  <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="p-2 text-zinc-800 active:text-red-900"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default App;