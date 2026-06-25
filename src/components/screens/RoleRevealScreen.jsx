import { useState, useEffect } from 'react'
import { ROLES, PHASES } from '../../lib/constants'
import { Button } from '../ui/Button'
import { sounds } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'

export function RoleRevealScreen({ game, currentPlayer }) {
  const [flipped, setFlipped] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [ready, setReady] = useState(false)

  const role = ROLES[currentPlayer?.role] || ROLES.villager
  const isWolf = role.camp === 'werewolves'

  const handleFlip = () => {
    if (flipped) return
    setFlipped(true)
    setTimeout(() => {
      setRevealed(true)
      if (isWolf) {
        sounds.wolfReveal()
      } else {
        sounds.roleReveal()
      }
    }, 400)
  }

  const handleReady = async () => {
    setReady(true)
    sounds.uiClick()

    // Marquer le joueur comme prêt
    await supabase
      .from('players')
      .update({ role_seen: true })
      .eq('id', currentPlayer.id)
  }

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />

      <div
        className="absolute inset-0 opacity-20 transition-opacity duration-1000"
        style={{
          background: revealed
            ? `radial-gradient(ellipse at center, ${role.color}40 0%, transparent 70%)`
            : 'transparent'
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-between flex-1 px-6 py-10">

        {/* Top */}
        <div className="text-center animate-fade-in">
          <p className="text-parchment-dim text-xs uppercase tracking-widest font-body mb-2">
            Distribution secrète
          </p>
          <h1 className="font-display font-black text-2xl text-gold">
            Votre rôle vous attend
          </h1>
          <p className="text-parchment-dim text-sm mt-2 font-body">
            Cachez votre écran des autres joueurs
          </p>
        </div>

        {/* Card */}
        <div className="role-card-container w-64 h-96" onClick={handleFlip}>
          <div className={`role-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>

            {/* Front — hidden card */}
            <div className="role-card-front">
              <div className={`
                w-64 h-96 rounded-3xl border-2 border-gold/30
                flex flex-col items-center justify-center gap-6
                cursor-pointer active:scale-95 transition-transform
                card-glow-gold animate-float
              `}
              style={{ background: 'linear-gradient(135deg, #1A1A2E, #0A0A14)' }}>
                <div className="text-7xl">🂠</div>
                <p className="font-display text-gold/60 text-sm tracking-wider uppercase">
                  Appuyez pour révéler
                </p>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-gold/40 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Back — role revealed */}
            <div className="role-card-back">
              <div
                className={`
                  w-64 h-96 rounded-3xl border-2 overflow-hidden
                  flex flex-col items-center justify-center gap-4
                  ${revealed ? 'animate-glow-in' : ''}
                `}
                style={{
                  background: `linear-gradient(160deg, ${role.color}30, #0A0A14 60%)`,
                  borderColor: `${role.color}60`,
                  boxShadow: `0 0 40px ${role.color}30`,
                }}
              >
                {/* Camp badge */}
                <div
                  className="px-3 py-1 rounded-full text-xs font-body uppercase tracking-widest"
                  style={{ background: `${role.color}30`, color: role.colorLight }}
                >
                  {role.camp === 'werewolves' ? 'Camp des Loups' : 'Camp du Village'}
                </div>

                {/* Emoji */}
                <div className="text-8xl animate-float">
                  {role.emoji}
                </div>

                {/* Name */}
                <h2
                  className="font-display font-black text-3xl tracking-wide"
                  style={{ color: role.colorLight, textShadow: `0 0 20px ${role.color}` }}
                >
                  {role.name}
                </h2>

                {/* Divider */}
                <div className="w-24 h-px" style={{ background: `${role.color}40` }} />

                {/* Description */}
                <p className="text-parchment-dim text-xs text-center px-6 leading-relaxed font-body">
                  {role.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Powers + Ready */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          {revealed && (
            <div
              className="card-dark p-4 animate-fade-up"
              style={{ borderColor: `${role.color}30` }}
            >
              <p className="text-xs uppercase tracking-wider font-body mb-2"
                style={{ color: role.colorLight }}>
                Vos pouvoirs
              </p>
              {role.powers.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {role.powers.map((power, i) => (
                    <li key={i} className="text-parchment-dim text-xs font-body flex gap-2">
                      <span style={{ color: role.color }}>›</span>
                      {power}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-parchment-dim text-xs font-body">
                  Votez le jour venu. C'est votre seule arme.
                </p>
              )}
            </div>
          )}

          {revealed && !ready && (
            <Button
              variant="primary"
              className="w-full"
              onClick={handleReady}
            >
              J'ai mémorisé mon rôle ✓
            </Button>
          )}

          {ready && (
            <div className="card-dark p-4 text-center border-forest/30 animate-fade-in">
              <p className="text-forest-light text-sm font-body">
                ✓ Prêt · En attente des autres joueurs...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
