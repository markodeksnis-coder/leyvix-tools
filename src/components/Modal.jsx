import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111] border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">{title}</h3>
          <button onClick={onClose} className="text-neutral-700 hover:text-neutral-300 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
