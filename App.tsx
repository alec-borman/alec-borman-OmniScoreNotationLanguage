import React, { useState, useEffect } from 'react';
import Controls from './components/Controls';
import Editor from './components/Editor';
import Piano from './components/Piano';
import { INSTRUMENTS } from './types';
import { INITIAL_SCORE } from './constants';
import { audioService } from './services/audioService';
import { ParserService } from './services/parserService';

const App: React.FC = () => {
  const [score, setScore] = useState<string>(INITIAL_SCORE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [instrumentId, setInstrumentId] = useState<string>(INSTRUMENTS[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load: we can just load the default piano to have something ready
    // But the new logic handles loading on play.
    return () => {
        audioService.stop();
    };
  }, []);

  // Updated: this manually loads a specific instrument if selected from dropdown
  // BUT: The dropdown now acts more like a "Preview" or "Default" selector if the score uses generic names.
  const loadInstrument = async (id: string, startContext = true) => {
      try {
          setIsLoading(true);
          setInstrumentId(id);
          if (startContext) await audioService.start();
          await audioService.loadSoundfont(id); // Using new method
          setIsLoading(false);
      } catch (e: any) {
          console.error(e);
          setError(`Failed to load instrument: ${e.message}`);
          setIsLoading(false);
      }
  };

  const handlePlay = async () => {
    try {
        setError(null);
        await audioService.start();
        
        const events = ParserService.parse(score);
        if (events.length === 0) {
            setError("No playable notes found in the score.");
            return;
        }

        // AUTO-LOAD ORCHESTRA
        // Instead of playing immediately, we ask AudioService to prepare (load) needed instruments
        setIsLoading(true);
        await audioService.preparePlayback(events);
        setIsLoading(false);

        setIsPlaying(true);
        audioService.play(events, () => {
            setIsPlaying(false);
        });

    } catch (e: any) {
        setError(e.message || "An error occurred during playback.");
        setIsLoading(false);
        setIsPlaying(false);
    }
  };

  const handleStop = () => {
    audioService.stop();
    setIsPlaying(false);
  };

  const handleInstrumentChange = (id: string) => {
    if (isPlaying) return;
    loadInstrument(id, true);
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
         {/* Top Section: Editor */}
         <div className="flex-1 p-4 pb-0 flex flex-col min-h-0">
             <div className="flex justify-between items-end mb-2 px-1">
                 <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    <i className="fas fa-code mr-2"></i>Source Code
                 </h2>
                 {error && (
                     <div className="text-red-400 text-xs bg-red-900/20 px-3 py-1 rounded border border-red-900/50 animate-pulse">
                         <i className="fas fa-exclamation-circle mr-2"></i>{error}
                     </div>
                 )}
             </div>
             <Editor value={score} onChange={setScore} />
         </div>

         {/* Bottom Section: Piano Visualizer */}
         <div className="mt-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
             <div className="px-5 py-2 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                 <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <i className="fas fa-border-all mr-2"></i>Keyboard Visualization (88 Keys)
                 </h2>
                 <span className="text-slate-600 text-[10px] font-mono">SCROLL TO NAVIGATE • A0 - C8</span>
             </div>
             <Piano />
         </div>
      </div>
    </div>
  );
};

export default App;
