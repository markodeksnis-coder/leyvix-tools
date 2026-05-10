import { Children, isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 px-1`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow-lg shadow-[#1D9E75]/20">
          L
        </div>
      )}
      <div
        className={`max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[#1D9E75] text-white rounded-tr-sm shadow-lg shadow-[#1D9E75]/20'
            : 'bg-[#1A1A1A] text-gray-200 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  const child = Children.toArray(children)[0];
                  if (isValidElement(child)) {
                    const codeContent = child.props.children;
                    const text =
                      typeof codeContent === 'string'
                        ? codeContent
                        : Array.isArray(codeContent)
                        ? codeContent.join('')
                        : String(codeContent || '');
                    return <CodeBlock>{text.replace(/\n$/, '')}</CodeBlock>;
                  }
                  return <pre className="bg-[#0A0A0A] p-3 rounded-lg overflow-x-auto text-xs font-mono">{children}</pre>;
                },
                code({ children }) {
                  return (
                    <code className="bg-[#0F0F0F] px-1.5 py-0.5 rounded text-[#1D9E75] text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                },
                strong({ children }) {
                  return <strong className="font-semibold text-white">{children}</strong>;
                },
                em({ children }) {
                  return <em className="italic text-gray-300">{children}</em>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 space-y-1 text-gray-300">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-300">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>;
                },
                hr() {
                  return <hr className="border-[#2A2A2A] my-4" />;
                },
                h1({ children }) {
                  return <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-sm font-bold text-white mb-2 mt-3 first:mt-0">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-sm font-semibold text-[#1D9E75] mb-1 mt-2 first:mt-0">{children}</h3>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-[#1D9E75] pl-3 my-2 text-gray-400 italic">
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-[#1D9E75] animate-pulse ml-0.5 rounded-sm align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
