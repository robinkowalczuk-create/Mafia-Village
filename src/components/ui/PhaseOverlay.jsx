import { useEffect, useState } from 'react'
import { PHASE_NARRATIVES } from '../../lib/constants'

export function PhaseOverlay({ phase, onDone, duration = 3000 }) {
  const [visible, setVisible] = useState(true)
  const narrative = PHASE_NARRATIVES[phase] || {}

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone?.(), 400)
    }, duration)
    return () => clearTimeout(timer)
  }, [phase, duration, onDone])

  if (!narrative.title) return null

  return (
    <div
      className={`
        phase-overlay transition-opacity duration-400
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ background: `linear-gradient(135deg, ${narrative.bgColor}, #0A0A14)` }}
    >
      {/* Stars */}
      <div className="stars-bg" />

      {/* Fog */}
      <div className="fog-layer" />

      {/* Village silhouette */}
      <div className="village-silhouette" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center animate-phase-enter">
        {/* Decorative line */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
          <span className="text-gold/60 text-xs font-display tracking-widest uppercase">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        <h1
          className="font-display font-black text-4xl tracking-wide text-shadow-gold"
          style={{ color: narrative.accentColor || '#C8A96E' }}
        >
          {narrative.title}
        </h1>

        <p className="font-display text-xl text-parchment/80 tracking-wide">
          {narrative.subtitle}
        </p>

        {narrative.atmosphere && (
          <p className="font-body text-sm text-parchment-dim max-w-xs leading-relaxed">
            {narrative.atmosphere}
          </p>
        )}

        {/* Decorative line */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
          <span className="text-gold/60 text-xs font-display tracking-widest uppercase">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        {/* Loading dots */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
