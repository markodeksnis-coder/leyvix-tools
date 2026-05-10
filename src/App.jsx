import { useState, useRef, useEffect } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const WELCOME = {
  role: 'assistant',
  content:
    "Hey — I'm your Leyvix Setter Coach. Show me a conversation you're stuck on, an objection you don't know how to handle, or ask me anything about the booking process. I'll give you exactly what to say.",
  isWelcome: true,
};

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    setError(null);
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Placeholder for the streaming assistant response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      // Build API payload — exclude the welcome display message
      const apiMessages = updatedMessages
        .filter((m) => !m.isWelcome)
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            setIsStreaming(false);
            return;
          }
          try {
            const { text: chunk, error: apiError } = JSON.parse(payload);
            if (apiError) throw new Error(apiError);
            if (chunk) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: 'assistant',
                  content: copy[copy.length - 1].content + chunk,
                };
                return copy;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please check your connection and try again.',
        };
        return copy;
      });
      setError(err.message);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-[#1A1A1A] bg-[#0F0F0F]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1D9E75] flex items-center justify-center shadow-lg shadow-[#1D9E75]/30">
            <span className="text-white font-bold text-base">L</span>
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm leading-tight">Leyvix Setter Coach</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-600 hidden sm:block">
          Your Leyvix booking assistant
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-2 py-6">
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1}
            />
          ))}
          {error && (
            <p className="text-center text-xs text-red-500/70 mb-4">{error}</p>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#1A1A1A]">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
