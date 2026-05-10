import { useState } from 'react';

export default function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative my-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-[#2A2A2A]">
        <span className="text-xs text-gray-500 font-mono">copy-paste ready</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-[#1D9E75] text-white hover:bg-[#17825f] active:scale-95 transition-all font-medium"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied ✓
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-gray-200 font-mono whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
