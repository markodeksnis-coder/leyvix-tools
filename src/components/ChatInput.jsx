import { useState, useRef } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="p-4 pb-5">
      <div
        className={`flex items-end gap-3 bg-[#1A1A1A] rounded-2xl p-3 border transition-colors ${
          disabled ? 'border-[#1A1A1A]' : 'border-[#2A2A2A] focus-within:border-[#1D9E75]'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Paste a conversation, describe a situation, or ask anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm resize-none outline-none max-h-[200px] overflow-y-auto leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-2.5 rounded-xl bg-[#1D9E75] text-white hover:bg-[#17825f] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-center text-xs text-gray-700 mt-2">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
