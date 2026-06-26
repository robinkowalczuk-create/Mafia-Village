import { useState, useEffect } from 'react'
import { ROLES, PHASES } from '../../lib/constants'
import { checkVictory } from '../../lib/gameUtils'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

// Durées des phases de suspense
const TIMING = {
  suspense:  3000,  // "Le village a parlé..."
  drumroll:  3500,  // dots qui clignotent
  name:      4000,  // nom révélé
  roleFlip:  4500,  // carte qui se retourne
  verdict:   3500,  // "C'était un loup / Ce n'était pas un loup"
  aftermath: 0,     // bouton continuer
}

export function EliminationScreen({ game, currentPlayer, players = [] }) {
  const [phase, setPhase] = useState('suspense')
  const [checking, setChecking] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)

  const eliminatedId = game.eliminated_player_id
  const eliminated = players.find(p => p.id === eliminatedId)
  const isTie = game.vote_tie
  const role = eliminated ? ROLES[eliminated.role] : null
  const isEliminated = currentPlayer?.id === eliminatedId

  useEffect(() => {
    if (isTie) { sounds.phaseTransition(); setPhase('tie'); return }
    if (!eliminated) return

    sounds.elimination()

    const t1 = setTimeout(() => setPhase('drumroll'), TIMING.suspense)
    const t2 = setTimeout(() => setPhase('name'), TIMING.suspense + TIMING.drumroll)
    const t3 = setTimeout(() => {
      setPhase('role')
      setTimeout(() => { setCardFlipped(true); sounds.roleReveal() }, 600)
    }, TIMING.suspense + TIMING.drumroll + TIMING.name)
    const t4 = setTimeout(() => setPhase('verdict'),
      TIMING.suspense + TIMING.drumroll + TIMING.name + TIMING.roleFlip)
    const t5 = setTimeout(() => setPhase('aftermath'),
      TIMING.suspense + TIMING.drumroll + TIMING.name + TIMING.roleFlip + TIMING.verdict)

    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout)
  }, [eliminated?.id, isTie])

  const advance = async () => {
    if (checking) return
    setChecking(true)
    const updatedPlayers = players.map(p =>
      p.id === eliminatedId ? { ...p, is_alive: false } : p
    )
    const winner = checkVictory(updatedPlayers)
    if (winner) {
      sounds[winner === 'werewolves' ? 'wolvesVictory' : 'villageVictory']()
      await supabase.from('mv_games').update({
        current_phase: PHASES.VICTORY, status: 'finished', winner_camp: winner,
      }).eq('id', game.id)
    } else {
      await supabase.from('mv_games').update({
        current_phase: PHASES.NIGHT,
        phase_number: game.phase_number + 1,
        eliminated_player_id: null,
        night_kills: [],
        vote_tie: false,
      }).eq('id', game.id)
    }
  }

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="absolute inset-0 opacity-20 transition-all duration-1000"
        style={{
          background: (phase === 'role' || phase === 'verdict' || phase === 'aftermath') && role
            ? `radial-gradient(ellipse at center, ${role.color} 0%, transparent 70%)`
            : 'radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)'
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 gap-8">

        {/* ── SUSPENSE ── */}
        {phase === 'suspense' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="text-6xl animate-pulse">⚖️</div>
            <h1 className="font-display font-black text-3xl text-gold text-center">
              Le village a parlé...
            </h1>
          </div>
        )}

        {/* ── DRUMROLL ── */}
        {phase === 'drumroll' && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <div className="text-6xl">🥁</div>
            <h1 className="font-display font-black text-3xl text-gold text-center">
              Et le verdict tombe...
            </h1>
            <div className="flex gap-3">
              {[0,1,2,3,4].map(i => (
                <div key={i}
                  className="w-3 h-3 rounded-full bg-blood animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── NOM ── */}
        {phase === 'name' && eliminated && (
          <div className="flex flex-col items-center gap-5 animate-victory-burst w-full max-w-sm">
            <div className="text-7xl animate-float">💀</div>
            <h2 className="font-display font-black text-5xl text-parchment text-center text-shadow-gold">
              {eliminated.name}
            </h2>
            <p className="text-blood-light text-base font-body tracking-wide">
              quitte le village...
            </p>
            {isEliminated && (
              <div className="card-glow-blood p-4 text-center w-full animate-shake mt-2">
                <p className="text-blood-light font-display text-lg">C'est vous...</p>
                <p className="text-parchment-dim text-xs font-body mt-1">
                  Restez silencieux. Votre rôle va être révélé à tous.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── RÉVÉLATION DU RÔLE (carte flip) ── */}
        {phase === 'role' && eliminated && role && (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <p className="text-parchment-dim text-sm font-body animate-fade-in">
              {eliminated.name} était...
            </p>

            {/* Carte flip */}
            <div className="role-card-container w-56 h-80">
              <div className={`role-card-inner w-full h-full ${cardFlipped ? 'flipped' : ''}`}>
                {/* Dos */}
                <div className="role-card-front">
                  <div className="w-56 h-80 rounded-3xl border-2 border-gold/30 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1A1A2E, #0A0A14)' }}>
                    <span className="text-6xl">🂠</span>
                  </div>
                </div>
                {/* Face */}
                <div className="role-card-back">
                  <div className="w-56 h-80 rounded-3xl border-2 flex flex-col items-center justify-center gap-3"
                    style={{
                      background: `linear-gradient(160deg, ${role.color}40, #0A0A14)`,
                      borderColor: `${role.color}70`,
                      boxShadow: `0 0 50px ${role.color}40`,
                    }}>
                    <div className="text-6xl animate-float">{role.emoji}</div>
                    <h3 className="font-display font-black text-2xl" style={{ color: role.colorLight }}>
                      {role.name}
                    </h3>
                    <div className="px-3 py-1 rounded-full text-xs font-body uppercase tracking-widest"
                      style={{ background: `${role.color}25`, color: role.colorLight }}>
                      {role.camp === 'werewolves' ? '🐺 Loups' : '☀️ Village'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VERDICT ── */}
        {phase === 'verdict' && eliminated && role && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-up">
            <div className="text-5xl">{role.emoji}</div>
            <h2 className="font-display font-black text-3xl text-center" style={{ color: role.colorLight }}>
              {eliminated.name}
            </h2>
            <p className="text-sm font-body text-center" style={{ color: role.colorLight }}>
              {role.name} · {role.camp === 'werewolves' ? 'Camp des Loups' : 'Camp du Village'}
            </p>
            <div className={`
              w-full rounded-2xl p-5 text-center border animate-glow-in
              ${role.camp === 'werewolves'
                ? 'bg-forest/10 border-forest/30'
                : 'bg-blood/10 border-blood/30'
              }
            `}>
              {role.camp === 'werewolves' ? (
                <>
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-forest-light font-display font-bold text-lg">Bien joué, village !</p>
                  <p className="text-parchment-dim text-xs font-body mt-1">Un loup de moins parmi vous.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">✗</p>
                  <p className="text-blood-light font-display font-bold text-lg">Mauvaise piste...</p>
                  <p className="text-parchment-dim text-xs font-body mt-1">Ce n'était pas un loup. Les loups jubilent.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── AFTERMATH ── */}
        {phase === 'aftermath' && (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-fade-up">
            {eliminated && role && (
              <div className="card-dark p-4 flex items-center gap-4 w-full"
                style={{ borderColor: `${role.color}30` }}>
                <span className="text-3xl">{role.emoji}</span>
                <div className="flex-1">
                  <p className="text-parchment font-body font-medium">{eliminated.name}</p>
                  <p className="text-xs font-body" style={{ color: role.colorLight }}>
                    {role.name} · éliminé(e) · Nuit {game.phase_number}
                  </p>
                </div>
                <span className="text-lg">💀</span>
              </div>
            )}

            {currentPlayer?.is_mj ? (
              <button onClick={advance} className="btn-primary w-full text-base py-5">
                🌙 Nuit {game.phase_number + 1} →
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

        {/* ── ÉGALITÉ ── */}
        {isTie && (
          <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm">
            <div className="text-6xl">🤝</div>
            <h1 className="font-display font-black text-3xl text-gold text-center">Égalité !</h1>
            <p className="text-parchment-dim text-sm font-body text-center">
              Le village ne s'est pas mis d'accord. Personne n'est éliminé.
            </p>
            {currentPlayer?.is_mj ? (
              <button onClick={advance} className="btn-primary w-full mt-4">
                🌙 Nuit {game.phase_number + 1} →
              </button>
            ) : (
              <p className="text-parchment-dim text-xs font-body">En attente du MJ...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
