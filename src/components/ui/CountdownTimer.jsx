import { useState, useEffect, useRef } from 'react'
import { sounds } from '../../lib/sounds'
import { formatTime } from '../../lib/gameUtils'

export function CountdownTimer({ duration, onExpire, running = true }) {
  const [remaining, setRemaining] = useState(duration)
  const intervalRef = useRef(null)

  useEffect(() => {
    setRemaining(duration)
  }, [duration])

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        sounds.countdownTick(next)
        if (next <= 0) {
          clearInterval(intervalRef.current)
          onExpire?.()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [running, onExpire])

  const pct = (remaining / duration) * 100
  const isUrgent = remaining <= 10
  const isDanger = remaining <= 5

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular timer */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={isDanger ? '#8B1A1A' : isUrgent ? '#C8A96E' : '#2E5E4E'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className={`
          absolute inset-0 flex items-center justify-center
          font-display font-bold text-lg
          ${isDanger ? 'text-blood animate-pulse' : isUrgent ? 'text-gold' : 'text-parchment'}
        `}>
          {formatTime(remaining)}
        </div>
      </div>

      {isUrgent && (
        <p className={`text-xs font-body uppercase tracking-widest ${isDanger ? 'text-blood animate-pulse' : 'text-gold'}`}>
          {isDanger ? 'Dépêchez-vous !' : 'Temps limité'}
        </p>
      )}
    </div>
  )
}
