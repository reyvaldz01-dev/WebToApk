'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Globe, AlertCircle, CheckCircle2, History, Trash2, LayoutTemplate, Layers, Cpu, Code, Hexagon, Zap, Shield, Sparkles } from 'lucide-react';

interface HistoryItem {
  id: string;
  appName: string;
  websiteUrl: string;
  date: number;
  status: string;
  androidUrl?: string | null;
  iosUrl?: string | null;
}

export default function Home() {
  const [appName, setAppName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<any>(null);
  const [isDone, setIsDone] = useState(false);
  
  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Rate limiting state
  const [lastBuildTime, setLastBuildTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    // Load history from local storage
    const saved = localStorage.getItem('aldzyx_history');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }

    const lastTime = localStorage.getItem('aldzyx_last_build');
    if (lastTime) {
      setLastBuildTime(Number(lastTime));
    }
  }, []);

  useEffect(() => {
    if (lastBuildTime) {
      const checkRateLimit = () => {
        const timeDiff = Date.now() - lastBuildTime;
        const oneDay = 24 * 60 * 60 * 1000;
        if (timeDiff < oneDay) {
          const remainingMs = oneDay - timeDiff;
          const h = Math.floor(remainingMs / (1000 * 60 * 60));
          const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
          
          const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          setTimeRemaining(formatted);
        } else {
          setTimeRemaining(null);
        }
      };
      
      checkRateLimit();
      const interval = setInterval(checkRateLimit, 1000);
      return () => clearInterval(interval);
    }
  }, [lastBuildTime]);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('aldzyx_history', JSON.stringify(items));
  };

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    setHistory(prev => {
      const newHistory = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('aldzyx_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    if (confirm('Yakin ingin menghapus semua history?')) {
      saveHistory([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !websiteUrl) {
      setError('App Name and Website URL are required.');
      return;
    }

    if (lastBuildTime && Date.now() - lastBuildTime < 24 * 60 * 60 * 1000) {
      const remainingMs = 24 * 60 * 60 * 1000 - (Date.now() - lastBuildTime);
      const h = Math.floor(remainingMs / (1000 * 60 * 60));
      const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
      const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setError(`Rate limit maksimal riset 1 hari 1 kali. Anda sudah membuat aplikasi hari ini. Tunggu besok (${formatted} lagi) untuk membuat aplikasi baru.`);
      return;
    }
    
    // Ensure URL starts with http:// or https://
    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setIsLoading(true);
    setError(null);
    setBuildStatus(null);
    setIsDone(false);
    setRequestId(null);
    
    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appName, websiteUrl: formattedUrl }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initiate application build.');
      }
      
      const newId = result.data.requestId;
      setRequestId(newId);
      
      // Update rate limit
      const now = Date.now();
      setLastBuildTime(now);
      localStorage.setItem('aldzyx_last_build', now.toString());
      
      // Save initial history
      const newItem: HistoryItem = {
        id: newId,
        appName,
        websiteUrl: formattedUrl,
        date: now,
        status: 'PROCESSING'
      };
      saveHistory([newItem, ...history]);
      
    } catch (err: any) {
      setError(err.message || 'System error occurred.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!requestId) return;

      try {
        const response = await fetch(`/api/status?requestId=${requestId}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const data = result.data;
          
          setBuildStatus(data);

          if (data.isDone) {
            setIsDone(true);
            setIsLoading(false);
            clearInterval(interval);
            
            // Update history
            updateHistoryItem(requestId, {
              status: 'DONE',
              androidUrl: data.android_url,
              iosUrl: data.ios_url
            });
          }
        }
      } catch (err) {
        console.error('Failed to check status', err);
      }
    };

    if (requestId && !isDone) {
      // Check immediately, then every 5 seconds
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [requestId, isDone]);

  // View renderer
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans p-4 md:p-8 flex flex-col items-center">
      
      <header className="w-full max-w-xl mx-auto flex justify-between items-center mb-12 mt-4 px-2">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setShowHistory(false)}
        >
          <div className="relative">
            <Hexagon className="w-9 h-9 text-purple-400 group-hover:-rotate-12 transition-transform drop-shadow-lg" />
            <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">ALDZYX</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-300">Void Engine</span>
          </div>
        </div>
        
        <button 
           onClick={() => setShowHistory(!showHistory)}
           className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors relative backdrop-blur-sm"
           aria-label="History">
           <History className="w-5 h-5 text-purple-300" />
        </button>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto flex flex-col gap-8 pb-12 px-2">
        
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6"
            >
              <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">Recent Builds</h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-sm rounded-[24px] p-8 text-center text-purple-300/70 flex flex-col items-center shadow-xl border border-white/10">
                  <History className="w-8 h-8 mb-4 opacity-50" />
                  <p className="font-medium text-sm">No recent apps compiled yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((item) => (
                    <div key={item.id} className="bg-white/5 backdrop-blur-sm shadow-xl rounded-[20px] p-5 flex flex-col gap-4 border border-white/10 hover:border-purple-500/50 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg leading-tight text-purple-200">{item.appName}</h3>
                          <p className="text-xs text-purple-300/60 mt-1 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {item.websiteUrl}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider shadow-sm ${item.status === 'DONE' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && (
                              <a href={item.androidUrl} target="_blank" rel="noreferrer" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-sm px-4 py-2.5 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Android
                              </a>
                            )}
                            {item.iosUrl && (
                              <a href={item.iosUrl} target="_blank" rel="noreferrer" className="flex-1 bg-white/10 hover:bg-white/20 text-purple-200 border border-white/20 shadow-sm px-4 py-2.5 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> iOS
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="w-full bg-white/10 shadow-sm px-4 py-2.5 rounded-full text-xs font-semibold text-purple-300 text-center flex items-center justify-center gap-2 border border-white/10">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling Platform Packages...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-10"
            >
              <div className="px-2 text-center">
                <div className="inline-flex items-center gap-2 bg-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-purple-400/30">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 tracking-wider">ENGINE V2.0</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                  Unlock native mobile<br/>experiences
                </h1>
                <p className="text-sm text-purple-300/80 font-medium max-w-sm mx-auto">
                  Powered by ALDZYX - Engine — Easily wrap any responsive website into powerful Android & iOS applications seamlessly. Zero coding. Absolute freedom.
                </p>
              </div>

              {/* Form Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-3 pb-0 overflow-hidden shadow-2xl border border-white/10">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="appName" className="text-xs font-bold text-purple-300 px-1">App Name</label>
                    <input
                      id="appName"
                      type="text"
                      placeholder="My Premium App"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className="w-full bg-slate-900/50 rounded-2xl px-5 py-4 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner transition-all disabled:opacity-60 disabled:bg-slate-800/50 placeholder:text-purple-300/40 border border-white/10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="websiteUrl" className="text-xs font-bold text-purple-300 px-1">Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-5 top-[18px] w-5 h-5 text-purple-400/60" />
                      <input
                        id="websiteUrl"
                        type="text"
                        placeholder="example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                        className="w-full bg-slate-900/50 rounded-2xl pl-12 pr-5 py-4 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner transition-all disabled:opacity-60 disabled:bg-slate-800/50 placeholder:text-purple-300/40 border border-white/10"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-2xl text-xs font-medium mt-1"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                  
                  {timeRemaining && !error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex flex-col items-center justify-center gap-1.5 text-orange-400 bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl text-xs font-bold mt-1 text-center"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <p>Rate limit maksimal riset 1 hari 1 kali agar spam terhindarkan.<br/>1 orang tidak bisa bikin banyak2. Silahkan tunggu besok (<span className="font-mono text-sm tracking-widest text-orange-300">{timeRemaining}</span> lagi).</p>
                    </motion.div>
                  )}
                </form>

                <div className="bg-slate-900/30 p-6 pt-5 mt-2 rounded-t-[2.5rem]">
                   {!requestId && !isDone && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !!timeRemaining}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(147,51,234,0.4)] text-[15px]"
                    >
                      {timeRemaining ? (
                        `Limit Tercapai (Tunggu Besok)`
                      ) : isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing Wrap...
                        </>
                      ) : (
                        "Get ALDZYX Bundle"
                      )}
                    </button>
                  )}

                  <AnimatePresence>
                    {(requestId || isLoading || isDone) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-col gap-4 overflow-hidden"
                      >
                         <div className="flex items-center justify-between bg-gradient-to-r from-purple-700 to-pink-700 p-5 rounded-[24px] shadow-xl mt-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mb-0.5">Status</span>
                              <span className="text-[15px] font-bold flex items-center gap-2">
                                {isDone ? (
                                  <><CheckCircle2 className="w-4 h-4 text-green-400" /> Build Completed</>
                                ) : (
                                  <><Loader2 className="w-4 h-4 animate-spin text-purple-300" /> Compiling systems</>
                                )}
                              </span>
                            </div>
                            {!isDone && (
                               <div className="text-right">
                                  <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block mb-0.5">ETA</span>
                                  <span className="text-[15px] font-semibold">~2 mins</span>
                               </div>
                            )}
                         </div>

                         {buildStatus && (
                            <div className="flex flex-col gap-3 mt-3 bg-white/5 p-4 rounded-2xl shadow-inner border border-white/10">
                              <div className="flex justify-between items-center text-xs font-semibold px-2">
                                <span className="text-purple-300">Android Generation</span>
                                <span className={buildStatus.android_status === 'DONE' ? 'text-green-400' : 'text-orange-400'}>{buildStatus.android_status || 'WAITING'}</span>
                              </div>
                              <div className="h-px w-full bg-white/10" />
                              <div className="flex justify-between items-center text-xs font-semibold px-2">
                                <span className="text-purple-300">iOS Generation</span>
                                <span className={buildStatus.ios_status === 'DONE' ? 'text-green-400' : 'text-orange-400'}>{buildStatus.ios_status || 'WAITING'}</span>
                              </div>
                            </div>
                         )}

                         {isDone && buildStatus && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col gap-3 mt-4"
                            >
                               {buildStatus.android_url && (
                                <a 
                                  href={buildStatus.android_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-4 rounded-full flex items-center justify-center gap-2 transition-all font-bold text-[15px] shadow-[0_8px_20px_rgba(147,51,234,0.4)]"
                                >
                                  <Download className="w-5 h-5" /> Download Android APK
                                </a>
                               )}
                               {buildStatus.ios_url && (
                                <a 
                                  href={buildStatus.ios_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-white/10 hover:bg-white/20 text-purple-200 border border-white/20 py-4 rounded-full flex items-center justify-center gap-2 transition-all font-bold text-[15px] shadow-sm"
                                >
                                  <Download className="w-5 h-5" /> Download iOS IPA
                                </a>
                               )}

                               <button 
                                 onClick={() => {
                                   setIsDone(false);
                                   setBuildStatus(null);
                                   setRequestId(null);
                                   setAppName('');
                                   setWebsiteUrl('');
                                 }}
                                 className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors text-center w-full uppercase tracking-wider"
                               >
                                 Start New Wrap
                               </button>
                            </motion.div>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Documentation Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 mt-4">
                
                <h3 className="text-xl font-bold mb-8 flex items-center justify-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-purple-400" /> Documentation
                </h3>
                
                <div className="flex flex-col gap-6">
                  <div className="flex gap-5 items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5 backdrop-blur-sm">
                      <Code className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-purple-200">1. Input Details</h4>
                      <p className="text-xs text-purple-300/60 mt-1 font-medium leading-relaxed">Enter your app name which will appear on devices. Supply a valid URL. Required to be mobile-friendly for best experience.</p>
                    </div>
                    <div className="hidden sm:flex items-center h-8">
                       <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>

                  <div className="h-px bg-white/10 w-full pl-13 ml-12" />

                  <div className="flex gap-5 items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5 backdrop-blur-sm">
                       <Layers className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-purple-200">2. Native Wrapping</h4>
                      <p className="text-xs text-purple-300/60 mt-1 font-medium leading-relaxed">ALDZYX Engine generates native Android and iOS configurations. A WebToNative module proxies interactions for seamless behavior.</p>
                    </div>
                    <div className="hidden sm:flex items-center h-8">
                       <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>

                  <div className="h-px bg-white/10 w-full pl-13 ml-12" />

                  <div className="flex gap-5 items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5 backdrop-blur-sm">
                      <Cpu className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-purple-200">3. Compilation</h4>
                      <p className="text-xs text-purple-300/60 mt-1 font-medium leading-relaxed">Cloud runners sign, compile, and prepare both an APK and IPA package containing your optimized wrapper securely.</p>
                    </div>
                    <div className="hidden sm:flex items-center h-8">
                       <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="flex flex-col gap-1 items-center bg-purple-500/10 p-3 rounded-2xl shadow-sm border border-purple-400/20 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Language</span>
                        <div className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-purple-400"/> <span className="font-bold text-xs text-purple-200">TypeScript</span></div>
                     </div>
                     <div className="flex flex-col gap-1 items-center bg-purple-500/10 p-3 rounded-2xl shadow-sm border border-purple-400/20 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Framework</span>
                        <div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-400"/> <span className="font-bold text-xs text-purple-200">Next.js 15</span></div>
                     </div>
                     <div className="flex flex-col gap-1 items-center bg-purple-500/10 p-3 rounded-2xl shadow-sm border border-purple-400/20 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Styling</span>
                        <div className="flex items-center gap-1.5"><LayoutTemplate className="w-3.5 h-3.5 text-purple-400"/> <span className="font-bold text-xs text-purple-200">Tailwind</span></div>
                     </div>
                     <div className="flex flex-col gap-1 items-center bg-purple-500/10 p-3 rounded-2xl shadow-sm border border-purple-400/20 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Rate Limit</span>
                        <div className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-purple-400"/> <span className="font-bold text-xs text-orange-400">1 / 24hrs</span></div>
                     </div>
                  </div>
                </div>
                
                <div className="mt-8 text-center flex flex-col items-center">
                   <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-400 mb-2">
                     <Shield className="w-3 h-3" />
                     Powered By
                   </div>
                   <div className="text-sm font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">ALDZYX - ENGINE</div>
                   <div className="text-[10px] text-purple-500/60 mt-1">Made By Master Aldz</div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}