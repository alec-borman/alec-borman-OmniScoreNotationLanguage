import React from 'react';
import { INSTRUMENTS } from '../types';

interface ControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onStop: () => void;
  instrumentId: string;
  onInstrumentChange: (id: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, isLoading, onPlay, onStop, instrumentId, onInstrumentChange }) => {
  return (
    <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-md z-20">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-music text-white text-sm"></i>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">OmniScore <span className="text-indigo-400 font-light">Maestro</span></h1>
            </div>
            
            <div className="h-6 w-px bg-slate-600 mx-2 hidden sm:block"></div>

            <div className="flex gap-2">
                <button
                    onClick={onPlay}
                    disabled={isPlaying || isLoading}
                    className={`
                        px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center
                        ${isPlaying || isLoading
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95'}
                    `}
                >
                    {isLoading ? (
                        <><i className="fas fa-circle-notch fa-spin"></i> Loading</>
                    ) : (
                        <><i className="fas fa-play"></i> Play</>
                    )}
                </button>
                
                <button
                    onClick={onStop}
                    disabled={!isPlaying}
                    className={`
                        px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center gap-2
                        ${!isPlaying 
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95'}
                    `}
                >
                     <i className="fas fa-stop"></i> Stop
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3">
             {isLoading && <span className="text-xs text-indigo-400 animate-pulse mr-2">Downloading Samples...</span>}
             <label className="text-slate-400 text-xs font-bold uppercase tracking-wider hidden sm:block">Instrument</label>
             <div className="relative">
                <select
                    value={instrumentId}
                    onChange={(e) => onInstrumentChange(e.target.value)}
                    disabled={isLoading || isPlaying}
                    className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 py-2 pl-4 pr-10 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                    {INSTRUMENTS.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <i className="fas fa-chevron-down text-xs"></i>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Controls;
