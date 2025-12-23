import React, { useState, useEffect, useMemo } from 'react';
import Controls from './components/Controls';
import Editor from './components/Editor';
import OrchestralTimeline from './components/OrchestralTimeline';
import { INSTRUMENTS } from './types';
import { INITIAL_SCORE } from './constants';
import { audioService } from './services/audioService';
import { ParserService, ScoreStructure } from './services/parserService';

const App: React.FC = () => {
  const [score, setScore] = useState<string>(INITIAL_SCORE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [instrumentId, setInstrumentId] = useState<string>(INSTRUMENTS[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parsedData = useMemo(() => {
      try {
          setError(null);
          return ParserService.parse(score);
      } catch (e: any) {
          console.error("Parser Error:", e);
          return { events: [], structure: { groups: [], duration: 0 } as ScoreStructure };
      }
  }, [score]);

  const { events, structure } = parsedData;

  useEffect(() => {
    return () => {
        audioService.stop();
    };
  }, []);

  const handlePlay = async () => {
    try {
        setError(null);
        // Important: Prime audio context on user gesture
        await audioService.start();
        
        if (events.length === 0) {
            setError("No playable notes found in score.");
            return;
        }

        setIsLoading(true);
        await audioService.preparePlayback(events);
        setIsLoading(false);

        setIsPlaying(true);
        audioService.play(events, () => {
            setIsPlaying(false);
        });

    } catch (e: any) {
        console.error("Playback Error:", e);
        setError("Playback failed. Please check your score syntax.");
        setIsLoading(false);
        setIsPlaying(false);
    }
  };

  const handleStop = () => {
    audioService.stop();
    setIsPlaying(false);
  };

  const handleInstrumentChange = async (id: string) => {
    if (isPlaying) return;
    try {
        setIsLoading(true);
        setInstrumentId(id);
        await audioService.start();
        await audioService.loadSoundfont(id);
        setIsLoading(false);
    } catch (e) {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <Controls 
        isPlaying={isPlaying}
        isLoading={isLoading}
        onPlay={handlePlay}
        onStop={handleStop}
        instrumentId={instrumentId}
        onInstrumentChange={handleInstrumentChange}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
         <div className="h-1/3 min-h-[200px] p-4 pb-0 flex flex-col min-h-0 border-b border-slate-800">
             <div className="flex justify-between items-end mb-2 px-1">
                 <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    <i className="fas fa-code mr-2"></i>OmniScore Editor
                 </h2>
                 {error && (
                     <div className="text-red-400 text-xs bg-red-900/20 px-3 py-1 rounded border border-red-900/50 animate-pulse">
                         <i className="fas fa-exclamation-circle mr-2"></i>{error}
                     </div>
                 )}
             </div>
             <Editor value={score} onChange={setScore} />
         </div>

         <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
             <div className="px-5 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center shadow-md z-10">
                 <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-indigo-400">
                    <i className="fas fa-stream mr-2"></i>Omni-Grid Orchestration
                 </h2>
                 <div className="flex gap-4 items-center">
                    <span className="text-slate-600 text-[10px] font-mono">
                        {structure.groups.length} GROUPS • {events.length} EVENTS • {structure.duration.toFixed(1)}s
                    </span>
                 </div>
             </div>
             <OrchestralTimeline 
                events={events} 
                structure={structure} 
                isPlaying={isPlaying} 
             />
         </div>
      </div>
    </div>
  );
};

export default App;
