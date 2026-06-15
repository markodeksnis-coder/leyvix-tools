import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className={`relative z-10 bg-[#0f0f0f] border border-[#2a2a2a] ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'} mx-4 shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h3 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#666]">{title}</h3>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors"><X size={15} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
