import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'
import { ROLES, VICTORY_CONDITIONS } from '../../lib/constants'
import { sounds } from '../../lib/sounds'
import { clearPlayerId } from '../../lib/gameUtils'

export function VictoryScreen({ game, currentPlayer, players = [], onPlayAgain }) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  const winner = game.winner_camp || 'village'
  const vc = VICTORY_CONDITIONS[winner]
  const isWinner = winner === 'werewolves'
    ? currentPlayer?.role === 'werewolf'
    : winner === 'lovers'
    ? currentPlayer?.is_lover
    : currentPlayer?.role !== 'werewolf'

  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    setTimeout(() => setShowConfetti(true), 500)
    setTimeout(() => setShowRoles(true), 2000)
    if (winner === 'village' || winner === 'lovers') sounds.villageVictory()
    else sounds.wolvesVictory()
  }, [winner])

  const confettiColors = winner === 'werewolves'
    ? ['#8B1A1A', '#B02020', '#FF4444', '#500000']
    : winner === 'lovers'
    ? ['#A04060', '#C05070', '#FF8FAB', '#FFB3C6']
    : ['#C8A96E', '#2E5E4E', '#E8C98E', '#3D7A64', '#FFFFFF']

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />

      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          colors={confettiColors}
          numberOfPieces={150}
          recycle={false}
          tweenDuration={8000}
        />
      )}

      <div
        className="absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(ellipse at center, ${vc.color} 0%, transparent 70%)` }}
      />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-10 overflow-y-auto">

        {/* Victory header */}
        <div className="flex flex-col items-center gap-5 text-center animate-victory-burst">
          <div className="text-7xl animate-float">
            {winner === 'werewolves' ? '🐺' : winner === 'lovers' ? '💘' : '☀️'}
          </div>

          <div>
            <h1
              className="font-display font-black text-4xl tracking-wide"
              style={{ color: vc.color, textShadow: `0 0 30px ${vc.color}60` }}
            >
              {vc.title}
            </h1>
            <p className="text-parchment/60 font-display text-lg mt-1">{vc.subtitle}</p>
          </div>

          <p className="text-parchment-dim text-sm font-body max-w-xs leading-relaxed">
            {vc.description}
          </p>

          {/* Personal result */}
          <div
            className={`
              px-6 py-3 rounded-2xl font-display font-bold text-lg animate-pulse-gold
              ${isWinner ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-parchment-dim border border-white/10'}
            `}
          >
            {isWinner ? '🏆 Vous avez gagné !' : '😔 Défaite'}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">✦</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Role reveal — all players */}
        {showRoles && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <p className="text-parchment-dim text-xs uppercase tracking-wider font-body text-center mb-1">
              Révélation des rôles
            </p>

            {players
              .sort((a, b) => {
                // Loups en premier si loups gagnent, sinon village
                if (winner === 'werewolves') {
                  return (a.role === 'werewolf' ? -1 : 1) - (b.role === 'werewolf' ? -1 : 1)
                }
                return (a.role !== 'werewolf' ? -1 : 1) - (b.role !== 'werewolf' ? -1 : 1)
              })
              .map((p, i) => {
                const r = ROLES[p.role] || ROLES.villager
                return (
                  <div
                    key={p.id}
                    className="card-dark flex items-center gap-4 px-4 py-3 animate-fade-up"
                    style={{
                      animationDelay: `${i * 0.08}s`,
                      borderColor: `${r.color}30`,
                      opacity: p.is_alive ? 1 : 0.6,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ background: `${r.color}20` }}
                    >
                      {r.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-parchment font-body font-medium">
                        {p.name}
                        {p.id === currentPlayer?.id && <span className="text-gold/60 text-xs ml-1">(toi)</span>}
                      </p>
                      <p className="text-xs font-body" style={{ color: r.colorLight }}>{r.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.is_alive && <span className="text-xs text-parchment-dim font-body">💀</span>}
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: r.color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Play again */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => {
              clearPlayerId()
              onPlayAgain()
            }}
            className="btn-primary w-full text-base py-5"
          >
            🔄 Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  )
}
