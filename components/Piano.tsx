import React, { useEffect, useRef } from 'react';
import { KEYBOARD_KEYS } from '../constants';

const Piano: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Center the view on Middle C (C4) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const c4Key = document.getElementById('key-c4');
      if (c4Key) {
        const container = scrollContainerRef.current;
        const offset = c4Key.offsetLeft - (container.clientWidth / 2) + 20;
        container.scrollTo({ left: offset, behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <div className="relative w-full h-[220px] bg-gray-900 border-t-4 border-gray-700 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-800 to-transparent z-30 pointer-events-none"></div>
        
        {/* Scroll Container */}
        <div 
            ref={scrollContainerRef}
            className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar relative select-none"
            style={{ scrollBehavior: 'smooth' }}
        >
            <div className="h-full relative mx-auto" style={{ width: `${52 * 42}px` }}> {/* 52 white keys * approx width */}
                {/* Render Keys */}
                {(() => {
                    let whiteKeyOffset = 0;
                    const WHITE_KEY_WIDTH = 42;
                    const BLACK_KEY_WIDTH = 28;

                    return KEYBOARD_KEYS.map((key) => {
                        const isBlack = key.type === 'black';
                        const noteId = `key-${key.note.toLowerCase().replace('#', 's')}`;

                        if (!isBlack) {
                            // Render White Key
                            const style = {
                                left: `${whiteKeyOffset}px`,
                                width: `${WHITE_KEY_WIDTH}px`,
                                height: '200px'
                            };
                            whiteKeyOffset += WHITE_KEY_WIDTH;

                            return (
                                <div
                                    key={key.note}
                                    id={noteId}
                                    className="absolute top-0 bg-white border border-gray-300 rounded-b-lg hover:bg-gray-100 transition-colors z-10 shadow-md group active-white-target"
                                    style={style}
                                >
                                    <div className="absolute bottom-4 w-full text-center text-[10px] text-gray-400 font-semibold group-hover:text-gray-600">
                                        {key.note}
                                    </div>
                                </div>
                            );
                        } else {
                            // Render Black Key
                            // Position logic: it sits on the previous whiteKeyOffset border
                            // roughly centered on the line.
                            // Current whiteKeyOffset is actually at the END of the previous white key.
                            const style = {
                                left: `${whiteKeyOffset - (BLACK_KEY_WIDTH / 2)}px`,
                                width: `${BLACK_KEY_WIDTH}px`,
                                height: '130px'
                            };

                            return (
                                <div
                                    key={key.note}
                                    id={noteId}
                                    className="absolute top-0 bg-gray-900 border-x border-b border-black rounded-b-md z-20 shadow-xl active-black-target"
                                    style={style}
                                ></div>
                            );
                        }
                    });
                })()}
            </div>
        </div>
        
        <style>{`
            /* Dynamic classes added by Tone.Draw */
            .active-white {
                background-color: #6366f1 !important; /* Indigo 500 */
                box-shadow: 0 0 15px #6366f1 !important;
                transform: translateY(2px);
                border-color: #4338ca !important;
            }
            .active-black {
                background-color: #ef4444 !important; /* Red 500 */
                background-image: linear-gradient(to bottom, #ef4444, #b91c1c);
                box-shadow: 0 0 15px #ef4444 !important;
                transform: translateY(2px);
            }
            .custom-scrollbar::-webkit-scrollbar {
                height: 12px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #1f2937; 
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #4b5563; 
                border-radius: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #6b7280; 
            }
        `}</style>
    </div>
  );
};

export default Piano;
