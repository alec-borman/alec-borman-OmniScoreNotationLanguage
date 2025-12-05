import React from 'react';

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
}

const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  return (
    <div className="flex-1 bg-slate-800 rounded-lg p-1 overflow-hidden flex flex-col border border-slate-700 shadow-inner">
        <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 font-mono border-b border-slate-700 flex justify-between">
            <span>SCORE_EDITOR.omni</span>
            <span>UTF-8</span>
        </div>
        <textarea
            className="flex-1 w-full bg-slate-800 text-green-400 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed custom-scrollbar"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
        />
        <style>{`
            textarea::-webkit-scrollbar {
                width: 10px;
            }
            textarea::-webkit-scrollbar-track {
                background: #1e293b; 
            }
            textarea::-webkit-scrollbar-thumb {
                background: #334155; 
                border-radius: 4px;
            }
        `}</style>
    </div>
  );
};

export default Editor;
