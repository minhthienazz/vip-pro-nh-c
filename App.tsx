
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppStatus, SongMetadata } from './types';
import { geminiService } from './services/geminiService';

// Định nghĩa bộ màu sắc đẹp mắt (Neon Themes)
const THEMES = [
  { // Neon Green (Mặc định)
    activeText: 'text-green-400',
    border: 'border-green-500', 
    bg: 'bg-green-500/20', 
    shadow: 'shadow-green-500/50', 
    subText: 'text-green-200/70' 
  },
  { // Cyan Blue
    activeText: 'text-cyan-400',
    border: 'border-cyan-500', 
    bg: 'bg-cyan-500/20', 
    shadow: 'shadow-cyan-500/50', 
    subText: 'text-cyan-200/70'
  },
  { // Hot Pink
    activeText: 'text-fuchsia-400',
    border: 'border-fuchsia-500', 
    bg: 'bg-fuchsia-500/20', 
    shadow: 'shadow-fuchsia-500/50', 
    subText: 'text-fuchsia-200/70'
  },
  { // Amber Gold
    activeText: 'text-amber-400',
    border: 'border-amber-500', 
    bg: 'bg-amber-500/20', 
    shadow: 'shadow-amber-500/50', 
    subText: 'text-amber-200/70'
  },
  { // Violet
    activeText: 'text-violet-400',
    border: 'border-violet-500', 
    bg: 'bg-violet-500/20', 
    shadow: 'shadow-violet-500/50', 
    subText: 'text-violet-200/70'
  }
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [songMetadata, setSongMetadata] = useState<SongMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isEnded, setIsEnded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Căn giữa câu đang hát
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeLine = activeLineRef.current;
      
      const containerCenter = container.clientHeight / 2;
      const elementCenter = activeLine.clientHeight / 2;
      const targetScroll = activeLine.offsetTop - containerCenter + elementCenter;
      
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (isEnded) setIsEnded(false);
    }
  };

  const handleEnded = () => {
    setIsEnded(true);
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsEnded(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSongMetadata(null);
    setCurrentTime(0);
    setIsEnded(false);
    setVideoUrl(URL.createObjectURL(file));
    setStatus(AppStatus.PROCESSING);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const result = await geminiService.processMusicVideo(base64Data, file.type);
          setSongMetadata(result);
          setStatus(AppStatus.READY);
        } catch (err) {
          setError("Lỗi xử lý AI. Thử lại video khác.");
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (err) {
      setError("Lỗi tải file.");
      setStatus(AppStatus.ERROR);
    }
  };

  const activeLineId = useMemo(() => {
    if (!songMetadata) return null;
    return songMetadata.subtitles.find(line => 
      currentTime >= line.start_time && currentTime <= line.end_time
    )?.id || null;
  }, [currentTime, songMetadata]);

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Navbar AZZ PRO */}
      <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[100] pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center rounded-lg font-black text-sm shadow-lg shadow-purple-500/30">A</div>
          <h1 className="text-sm font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 drop-shadow-md">AZZ PRO</h1>
        </div>
        
        {/* Nút Đổi Video dạng Icon */}
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="pointer-events-auto w-10 h-10 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center border border-white/10 backdrop-blur-md transition-all shadow-lg group hover:scale-105 active:scale-95"
          title="Đổi Video"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {status === AppStatus.IDLE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-10 text-center">
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">AZZ PRO</h2>
            <p className="text-[10px] tracking-[0.6em] text-zinc-500 uppercase font-light">Professional Karaoke System</p>
          </div>
        )}

        {status === AppStatus.PROCESSING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[#050505]">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Đang khởi tạo...</p>
          </div>
        )}

        {status === AppStatus.READY && videoUrl && songMetadata && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* VÙNG VIDEO */}
            <div className="h-[40vh] shrink-0 w-full bg-black relative flex items-center justify-center overflow-hidden z-10 border-b border-white/5 shadow-2xl">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPlay={() => setIsEnded(false)}
                playsInline
                autoPlay
                controls={!isEnded} 
              />
              
              {/* Overlay Replay */}
              {isEnded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all duration-500">
                  <button 
                    onClick={handleReplay}
                    className="group relative flex items-center justify-center w-16 h-16 bg-white/10 hover:bg-purple-600 rounded-full backdrop-blur-md border border-white/20 transition-all duration-300 scale-100 hover:scale-110 shadow-2xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white pl-1">
                      <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <p className="absolute mt-24 text-[10px] uppercase tracking-[0.3em] font-bold text-white/50">Phát lại</p>
                </div>
              )}
            </div>

            {/* VÙNG LỜI NHẠC */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-[10vh] space-y-8 custom-scrollbar bg-[#0a0a0a] relative"
            >
              {songMetadata.subtitles.map((line, index) => {
                const isActive = activeLineId === line.id;
                const isPassed = currentTime > line.end_time;
                
                // Chọn theme dựa trên index để tạo sự đa dạng màu sắc
                const theme = THEMES[index % THEMES.length];

                return (
                  <div 
                    key={line.id} 
                    ref={isActive ? activeLineRef : null}
                    className={`mx-auto max-w-2xl transition-all duration-700 rounded-2xl px-6 py-6 border-l-[3px] flex flex-col items-start text-left gap-2 ${
                      isActive 
                        ? `bg-zinc-900/40 ${theme.border} shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] scale-100 opacity-100 backdrop-blur-sm` 
                        : isPassed 
                        ? 'bg-transparent border-transparent opacity-20 scale-95 grayscale blur-[1px]' 
                        : 'bg-transparent border-transparent opacity-20 scale-95'
                    }`}
                  >
                    {/* Dòng 1: Phiên âm - Có màu mờ mờ theo theme khi Active */}
                    {line.phonetic_vietnamese && (
                      <div className={`text-sm md:text-base font-mono tracking-wide pl-1 transition-colors duration-500 ${
                        isActive ? theme.subText : 'text-zinc-600'
                      }`}>
                        {line.phonetic_vietnamese}
                      </div>
                    )}

                    {/* Dòng 2: Lời gốc - Highlight nhiều màu */}
                    <div className="text-2xl md:text-3xl font-bold text-white leading-relaxed flex flex-wrap gap-x-3 gap-y-2 my-1">
                      {line.word_level_timings.map((word, idx) => {
                        const isWordActive = currentTime >= word.start_time && currentTime <= word.end_time;
                        return (
                          <span 
                            key={idx}
                            className={`px-2 py-0.5 rounded-lg transition-all duration-200 border-2 ${
                              isWordActive 
                                ? `${theme.border} ${theme.bg} text-white ${theme.shadow} translate-y-[-2px]` 
                                : 'border-transparent text-zinc-300'
                            }`}
                          >
                            {word.word}
                          </span>
                        );
                      })}
                    </div>

                    {/* Dòng 3: Dịch nghĩa - Có màu mờ mờ theo theme khi Active */}
                    <div className={`text-base md:text-lg italic pl-1 mt-1 font-medium transition-colors duration-500 ${
                      isActive ? theme.subText : 'text-zinc-700'
                    }`}>
                      {line.vietnamese_translation}
                    </div>
                  </div>
                );
              })}
              
              <div className="h-[30vh]"></div>
            </div>
          </div>
        )}
      </main>

      <footer className="shrink-0 py-2 text-center bg-[#050505] border-t border-white/5 z-50">
        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest opacity-60">
          © Nguyễn Minh Thiện
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        video { outline: none; border: none; background: black; }
        .transition-all { transition-timing-function: cubic-bezier(0.2, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default App;
