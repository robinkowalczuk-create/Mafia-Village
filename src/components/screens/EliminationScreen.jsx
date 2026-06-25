import { useState, useEffect } from 'react'
import { usePlayers } from '../../hooks/usePlayers'
import { ROLES, PHASES } from '../../lib/constants'
import { checkVictory } from '../../lib/gameUtils'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

export function EliminationScreen({ game, currentPlayer }) {
  const { players } = usePlayers(game.id)
  const [phase, setPhase] = useState('suspense') // suspense → name → role → aftermath
  const [checking, setChecking] = useState(false)

  const eliminatedId = game.eliminated_player_id
  const eliminated = players.find(p => p.id === eliminatedId)
  const isTie = game.vote_tie
  const role = eliminated ? ROLES[eliminated.role] : null

  useEffect(() => {
    if (isTie) {
      sounds.phaseTransition()
      setPhase('tie')
      return
    }
    if (!eliminated) return

    sounds.elimination()

    const timers = [
      setTimeout(() => setPhase('name'), 2000),
      setTimeout(() => { setPhase('role'); sounds.roleReveal() }, 4500),
      setTimeout(() => setPhase('aftermath'), 7000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [eliminated, isTie])

  // Check victory and advance phase
  const advance = async () => {
    if (checking) return
    setChecking(true)

    const updatedPlayers = players.map(p =>
      p.id === eliminatedId ? { ...p, is_alive: false } : p
    )

    const winner = checkVictory(updatedPlayers)

    if (winner) {
      sounds[winner === 'werewolves' ? 'wolvesVictory' : 'villageVictory']()
      await supabase.from('games').update({
        current_phase: PHASES.VICTORY,
        status: 'finished',
        winner_camp: winner,
      }).eq('id', game.id)
    } else {
      await supabase.from('games').update({
        current_phase: PHASES.NIGHT,
        phase_number: game.phase_number + 1,
        eliminated_player_id: null,
        night_kills: [],
        vote_tie: false,
      }).eq('id', game.id)
    }
  }

  const isEliminated = currentPlayer?.id === eliminatedId

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div
        className="absolute inset-0 opacity-20 transition-opacity duration-1000"
        style={{
          background: phase === 'role' && role
            ? `radial-gradient(ellipse at center, ${role.color} 0%, transparent 70%)`
            : 'radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)'
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 gap-8">

        {/* Suspense */}
        {phase === 'suspense' && !isTie && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="text-6xl animate-pulse">⚖️</div>
            <h1 className="font-display font-black text-3xl text-gold text-center">
              Le village a parlé...
            </h1>
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-blood/60 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Tie */}
        {isTie && (
          <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm">
            <div className="text-6xl">🤝</div>
            <h1 className="font-display font-black text-3xl text-gold text-center">
              Égalité !
            </h1>
            <p className="text-parchment-dim text-sm font-body text-center">
              Le village n'a pas réussi à se mettre d'accord. Personne n'est éliminé ce tour.
            </p>
            {currentPlayer?.is_mj && (
              <button onClick={advance} className="btn-primary w-full mt-4">
                Continuer → Nuit {game.phase_number + 1}
              </button>
            )}
            {!currentPlayer?.is_mj && (
              <p className="text-parchment-dim text-xs font-body">En attente du MJ...</p>
            )}
          </div>
        )}

        {/* Name reveal */}
        {phase === 'name' && eliminated && (
          <div className="flex flex-col items-center gap-4 animate-glow-in w-full max-w-sm">
            <div className="text-6xl animate-float">💀</div>
            <h2 className="font-display font-black text-4xl text-parchment text-center">
              {eliminated.name}
            </h2>
            <p className="text-blood-light text-sm font-body">a été éliminé(e) par le village</p>
            {isEliminated && (
              <div className="card-glow-blood p-4 text-center w-full animate-shake">
                <p className="text-blood-light font-display">C'est vous...</p>
                <p className="text-parchment-dim text-xs font-body mt-1">
                  Restez silencieux. Votre rôle va être révélé.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Role reveal */}
        {phase === 'role' && eliminated && role && (
          <div className="flex flex-col items-center gap-5 animate-victory-burst w-full max-w-sm">
            <div className="text-5xl">💀</div>
            <p className="text-parchment-dim text-sm font-body">{eliminated.name} était...</p>

            <div
              className="w-full rounded-3xl p-6 flex flex-col items-center gap-3 border"
              style={{
                background: `linear-gradient(160deg, ${role.color}30, #0A0A14)`,
                borderColor: `${role.color}60`,
                boxShadow: `0 0 40px ${role.color}30`,
              }}
            >
              <div className="text-7xl animate-float">{role.emoji}</div>
              <h2
                className="font-display font-black text-3xl"
                style={{ color: role.colorLight }}
              >
                {role.name}
              </h2>
              <div
                className="px-3 py-1 rounded-full text-xs font-body uppercase tracking-widest"
                style={{ background: `${role.color}20`, color: role.colorLight }}
              >
                {role.camp === 'werewolves' ? '🐺 Camp des Loups' : '☀️ Camp du Village'}
              </div>
            </div>

            {role.camp === 'werewolves' ? (
              <p className="text-forest-light text-sm font-body text-center">
                ✓ Bien joué village ! Un loup de moins.
              </p>
            ) : (
              <p className="text-blood-light text-sm font-body text-center">
                ✗ Ce n'était pas un loup... Le village s'est trompé.
              </p>
            )}
          </div>
        )}

        {/* Aftermath + continue */}
        {phase === 'aftermath' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-up">
            {eliminated && role && (
              <div className="card-dark p-4 flex items-center gap-4 w-full"
                style={{ borderColor: `${role.color}30` }}>
                <span className="text-3xl">{role.emoji}</span>
                <div>
                  <p className="text-parchment font-body font-medium">{eliminated.name}</p>
                  <p className="text-parchment-dim text-xs font-body">{role.name} · éliminé(e)</p>
                </div>
              </div>
            )}

            {currentPlayer?.is_mj ? (
              <button onClick={advance} className="btn-primary w-full text-base py-5">
                🌙 Passer à la nuit suivante
              </button>
            ) : (
              <div className="card-dark p-4 text-center w-full">
                <p className="text-parchment-dim text-sm font-body">
                  ⏳ En attente du MJ pour continuer...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
