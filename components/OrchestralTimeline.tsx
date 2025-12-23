import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as Tone from 'tone';
import { NoteEvent } from '../types';
import { ScoreStructure } from '../services/parserService';

interface OrchestralTimelineProps {
    events: NoteEvent[];
    structure: ScoreStructure;
    isPlaying: boolean;
}

// Color Palette for Groups
const GROUP_COLORS: Record<string, string> = {
    'Woodwinds': 'bg-emerald-500 border-emerald-400 text-emerald-900',
    'Brass': 'bg-amber-500 border-amber-400 text-amber-900',
    'Strings': 'bg-indigo-500 border-indigo-400 text-indigo-100',
    'Percussion': 'bg-rose-500 border-rose-400 text-rose-900',
    'Keys': 'bg-fuchsia-500 border-fuchsia-400 text-fuchsia-900',
    'Default': 'bg-slate-500 border-slate-400 text-slate-900'
};

const getGroupStyle = (groupName: string) => {
    if (groupName.includes('Wood')) return GROUP_COLORS['Woodwinds'];
    if (groupName.includes('Brass') || groupName.includes('Corni') || groupName.includes('Trombe')) return GROUP_COLORS['Brass'];
    if (groupName.includes('String') || groupName.includes('Viol')) return GROUP_COLORS['Strings'];
    if (groupName.includes('Percussion') || groupName.includes('Timp')) return GROUP_COLORS['Percussion'];
    return GROUP_COLORS['Default'];
};

const OrchestralTimeline: React.FC<OrchestralTimelineProps> = ({ events, structure, isPlaying }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    
    // Zoom / Scale
    const PIXELS_PER_SECOND = 100;
    const totalWidth = Math.max(structure.duration * PIXELS_PER_SECOND, 800); // Min width

    // Animation Loop for Playhead
    const animate = () => {
        if (isPlaying && cursorRef.current && scrollRef.current) {
            const now = Tone.Transport.seconds;
            const leftPos = now * PIXELS_PER_SECOND;
            
            cursorRef.current.style.transform = `translateX(${leftPos}px)`;
            
            // Auto-scroll logic
            const containerWidth = scrollRef.current.clientWidth;
            const scrollLeft = scrollRef.current.scrollLeft;
            
            // If cursor moves past 70% of screen, scroll
            if (leftPos > scrollLeft + (containerWidth * 0.7)) {
                scrollRef.current.scrollLeft = leftPos - (containerWidth * 0.2);
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    // Group events by instrument ID for efficient rendering
    const eventsByInstrument = useMemo(() => {
        const map = new Map<string, NoteEvent[]>();
        events.forEach(ev => {
            const id = ev.hand || 'unknown';
            if (!map.has(id)) map.set(id, []);
            map.get(id)!.push(ev);
        });
        return map;
    }, [events]);

    return (
        <div className="flex flex-col h-full bg-slate-950 select-none overflow-hidden border-t-4 border-slate-800">
            {/* Header / Timeline Ruler */}
            <div className="flex h-8 bg-slate-900 border-b border-slate-800">
                <div className="w-48 flex-shrink-0 border-r border-slate-800 flex items-center px-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Instrument</span>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    {/* Simple Ruler */}
                    <div className="absolute top-0 bottom-0 left-0 flex items-end pb-1 text-[10px] text-slate-600 font-mono">
                        {Array.from({ length: Math.ceil(structure.duration) + 1 }).map((_, i) => (
                            <div key={i} className="absolute border-l border-slate-800 h-full pl-1" style={{ left: `${i * PIXELS_PER_SECOND}px` }}>
                                {i}s
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Instruments */}
                <div className="w-48 flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto custom-scrollbar z-20 shadow-xl">
                    {structure.groups.map((group, gIdx) => (
                        <div key={group.name + gIdx} className="mb-1">
                            {/* Group Header */}
                            <div className="px-3 py-1 bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                                {group.name}
                            </div>
                            {/* Instruments */}
                            {group.instruments.map(inst => (
                                <div key={inst.id} className="h-10 px-4 flex items-center border-b border-slate-800/50 bg-slate-900/50">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getGroupStyle(group.name).split(' ')[0]}`}></div>
                                        <span className="text-xs text-slate-300 font-medium truncate w-32" title={inst.name}>{inst.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Right Area: Timeline Scroll */}
                <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative bg-slate-950">
                    
                    <div style={{ width: `${totalWidth}px`, height: '100%' }} className="relative">
                        
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: Math.ceil(structure.duration * 4) }).map((_, i) => ( // Quarter second grid
                                <div key={i} className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? 'border-slate-800' : 'border-slate-900'}`} 
                                     style={{ left: `${i * (PIXELS_PER_SECOND / 4)}px` }}></div>
                            ))}
                        </div>

                        {/* Tracks */}
                        <div className="flex flex-col">
                            {structure.groups.map((group, gIdx) => (
                                <div key={group.name + gIdx} className="mb-1">
                                    <div className="h-6"></div> {/* Spacer for sticky header in sidebar */}
                                    {group.instruments.map(inst => {
                                        const instEvents = eventsByInstrument.get(inst.id) || [];
                                        const colorClass = getGroupStyle(group.name);
                                        
                                        return (
                                            <div key={inst.id} className="h-10 relative border-b border-slate-800/30 w-full group hover:bg-white/5 transition-colors">
                                                {instEvents.map((ev, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`absolute top-1 bottom-1 rounded-sm text-[9px] font-bold flex items-center justify-center overflow-hidden whitespace-nowrap border shadow-sm ${colorClass}`}
                                                        style={{
                                                            left: `${ev.time * PIXELS_PER_SECOND}px`,
                                                            width: `${Math.max(ev.duration * PIXELS_PER_SECOND - 1, 2)}px`
                                                        }}
                                                        title={`${ev.note} (${ev.duration}s)`}
                                                    >
                                                        {ev.duration * PIXELS_PER_SECOND > 20 && ev.note}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Playhead Cursor */}
                        <div 
                            ref={cursorRef}
                            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] z-30 pointer-events-none"
                            style={{ transform: 'translateX(0px)' }}
                        >
                            <div className="w-2 h-2 -ml-[3px] bg-yellow-400 transform rotate-45 mt-[-4px]"></div>
                        </div>

                    </div>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0f172a; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155; 
                    border-radius: 5px;
                    border: 2px solid #0f172a;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569; 
                }
            `}</style>
        </div>
    );
};

export default OrchestralTimeline;