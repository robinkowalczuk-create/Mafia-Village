import { useEffect, useState, useRef } from 'react'
import { PHASES, ROLES } from '../../lib/constants'
import { checkVictory } from '../../lib/gameUtils'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'
import React from 'react'

const DEATH_TIMING = {
  suspense: 2500,
  name:     3500,
  role:     4500,
  done:     2000,
}

function RoleImage({ role, size = 'w-24 h-24' }) {
  const [err, setErr] = React.useState(false)
  if (role.image && !err) {
    return (
      <div className={`${size} flex items-center justify-center`}>
        <img src={role.image} className="w-full h-full object-contain" onError={() => setErr(true)} />
      </div>
    )
  }
  return <span className="text-5xl">{role.emoji}</span>
}

export function DayScreen({ game, currentPlayer, players = [] }) {
  const [revealed, setRevealed] = useState(false)
  const [deathPhase, setDeathPhase] = useState('suspense')
  const [cardFlipped, setCardFlipped] = useState(false)
  const [currentDeathIndex, setCurrentDeathIndex] = useState(0)
  const appliedRef = useRef(false)

  const nightKills = game.night_kills || []
  const deadPlayers = players.filter(p => nightKills.includes(p.id))
  const isNightResolution = game.current_phase === PHASES.NIGHT_RESOLUTION

  // ── Appliquer les morts (un seul joueur le fait : le premier dans la liste) ──
  useEffect(() => {
    if (game.current_phase !== PHASES.NIGHT_RESOLUTION) return
    if (!players.length || appliedRef.current) return

    // Seul le premier joueur vivant dans l'ordre déclenche l'update
    const sortedAlive = [...players].sort((a, b) => a.joined_at > b.joined_at ? 1 : -1)
    const isFirst = sortedAlive[0]?.id === currentPlayer?.id
    if (!isFirst) return

    appliedRef.current = true

    const applyKills = async () => {
      for (const killId of nightKills) {
        const p = players.find(pl => pl.id === killId)
        if (!p?.is_alive) continue
        if (p.role === 'hunter' && !p.hunter_shot_used) {
          await supabase.from('mv_games').update({ current_phase: PHASES.HUNTER_SHOT }).eq('id', game.id)
          return
        }
        await supabase.from('mv_players').update({ is_alive: false }).eq('id', p.id)
      }
    }

    applyKills()
  }, [game.current_phase, players.length])

  // ── Séquence dramatique morts nocturnes ──
  useEffect(() => {
    if (!isNightResolution) return

    if (nightKills.length === 0) {
      setTimeout(async () => {
        await supabase.from('mv_games').update({
          current_phase: PHASES.DAY, night_kills: [],
        }).eq('id', game.id)
      }, 3000)
      return
    }

    sounds.elimination()

    const total = DEATH_TIMING.suspense + DEATH_TIMING.name + DEATH_TIMING.role

    const t1 = setTimeout(() => setDeathPhase('name'), DEATH_TIMING.suspense)
    const t2 = setTimeout(() => {
      setDeathPhase('role')
      setTimeout(() => { setCardFlipped(true); sounds.roleReveal() }, 600)
    }, DEATH_TIMING.suspense + DEATH_TIMING.name)
    const t3 = setTimeout(() => {
      setDeathPhase('done')
      if (currentDeathIndex < nightKills.length - 1) {
        setTimeout(() => {
          setCurrentDeathIndex(i => i + 1)
          setDeathPhase('suspense')
          setCardFlipped(false)
        }, DEATH_TIMING.done)
      } else {
        setTimeout(async () => {
          const updatedPlayers = players.map(p =>
            nightKills.includes(p.id) ? { ...p, is_alive: false } : p
          )
          const winner = checkVictory(updatedPlayers)
          if (winner) {
            sounds[winner === 'werewolves' ? 'wolvesVictory' : 'villageVictory']()
            await supabase.from('mv_games').update({
              current_phase: PHASES.VICTORY, status: 'finished', winner_camp: winner,
            }).eq('id', game.id)
          } else {
            await supabase.from('mv_games').update({
              current_phase: PHASES.DAY, night_kills: [],
            }).eq('id', game.id)
          }
        }, DEATH_TIMING.done)
      }
    }, total)

    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [isNightResolution, currentDeathIndex])

  useEffect(() => {
    if (game.current_phase === PHASES.DAY) setTimeout(() => setRevealed(true), 300)
  }, [game.current_phase])

  const alivePlayers = players.filter(p => p.is_alive)
  const deadAll = players.filter(p => !p.is_alive)

  const startVote = async () => {
    sounds.voteStart()
    await supabase.from('mv_games').update({
      current_phase: PHASES.VOTE,
      vote_started_at: new Date().toISOString(),
    }).eq('id', game.id)
  }

  // ── NIGHT RESOLUTION ──
  if (isNightResolution) {
    const currentDead = deadPlayers[currentDeathIndex]
    const role = currentDead ? ROLES[currentDead.role] : null

    return (
      <div className="screen flex flex-col items-center justify-center">
        <div className="stars-bg" />
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center w-full max-w-sm">

          {/* Nuit paisible */}
          {nightKills.length === 0 && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="text-6xl animate-float">🌅</div>
              <h1 className="font-display font-black text-3xl text-gold">L'Aube se lève</h1>
              <p className="text-forest-light font-display text-lg">Une nuit paisible sur Grasse...</p>
            </div>
          )}

          {/* Suspense */}
          {nightKills.length > 0 && deathPhase === 'suspense' && (
            <div className="flex flex-col items-center gap-6 animate-fade-in">
              <div className="text-6xl animate-pulse">🌅</div>
              <h1 className="font-display font-black text-3xl text-gold">L'Aube se lève</h1>
              <p className="text-blood-light font-display text-lg">La nuit a été cruelle...</p>
              <div className="flex gap-3 mt-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-blood animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              {nightKills.length > 1 && (
                <p className="text-parchment-dim text-xs font-body">
                  {nightKills.length} victimes cette nuit
                </p>
              )}
            </div>
          )}

          {/* Nom */}
          {nightKills.length > 0 && deathPhase === 'name' && currentDead && (
            <div className="flex flex-col items-center gap-5 animate-victory-burst">
              <div className="text-6xl animate-float">💀</div>
              <p className="text-parchment-dim text-sm font-body">Cette nuit, les ténèbres ont emporté...</p>
              <h2 className="font-display font-black text-5xl text-parchment text-shadow-gold">
                {currentDead.name}
              </h2>
              {nightKills.length > 1 && (
                <p className="text-parchment-dim text-xs font-body">
                  {currentDeathIndex + 1} / {nightKills.length}
                </p>
              )}
            </div>
          )}

          {/* Carte flip */}
          {nightKills.length > 0 && (deathPhase === 'role' || deathPhase === 'done') && currentDead && role && (
            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-parchment-dim text-sm font-body animate-fade-in">
                {currentDead.name} était...
              </p>
              <div className="role-card-container w-52 h-72">
                <div className={`role-card-inner w-full h-full ${cardFlipped ? 'flipped' : ''}`}>
                  <div className="role-card-front">
                    <div className="w-52 h-72 rounded-3xl border-2 border-gold/30 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1A1A2E, #0A0A14)' }}>
                      <span className="text-5xl">🂠</span>
                    </div>
                  </div>
                  <div className="role-card-back">
                    <div className="w-52 h-72 rounded-3xl border-2 flex flex-col items-center justify-center gap-3"
                      style={{
                        background: `linear-gradient(160deg, ${role.color}40, #0A0A14)`,
                        borderColor: `${role.color}70`,
                        boxShadow: `0 0 40px ${role.color}40`,
                      }}>
                      <RoleImage role={role} size="w-20 h-20" />
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
              {deathPhase === 'done' && (
                <div className={`w-full rounded-2xl p-4 text-center border animate-fade-up ${
                  role.camp === 'werewolves' ? 'bg-forest/10 border-forest/30' : 'bg-blood/10 border-blood/30'
                }`}>
                  {role.camp === 'werewolves'
                    ? <p className="text-forest-light font-display">Un loup de moins dans les collines.</p>
                    : <p className="text-blood-light font-display">Un innocent a perdu la vie...</p>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── JOUR ──
  return (
    <div className="screen flex flex-col">
      <div className="stars-bg opacity-30" />
      <div className="village-silhouette" />
      <div className={`relative z-10 flex flex-col flex-1 px-5 py-8 gap-5 transition-opacity duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center pt-4">
          <div className="text-4xl mb-2">☀️</div>
          <h1 className="font-display font-black text-2xl text-gold">Jour {game.phase_number}</h1>
          <p className="text-parchment-dim text-sm font-body mt-1">Discussion libre — Grasse s'éveille</p>
        </div>

        {alivePlayers.length <= 1 ? null : (
          <>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
                En vie ({alivePlayers.length})
              </p>
              {alivePlayers.map(p => (
                <div key={p.id} className={`card-dark px-4 py-3 flex items-center gap-3 ${p.id === currentPlayer?.id ? 'border-gold/20' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-forest/20 flex items-center justify-center text-xs font-display text-forest-light">
                    {p.name[0]}
                  </div>
                  <span className={`font-body text-sm ${p.id === currentPlayer?.id ? 'text-gold' : 'text-parchment'}`}>
                    {p.name} {p.id === currentPlayer?.id && '(toi)'}
                  </span>
                </div>
              ))}
              {deadAll.length > 0 && (
                <>
                  <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mt-2">
                    Éliminés ({deadAll.length})
                  </p>
                  {deadAll.map(p => (
                    <div key={p.id} className="card-dark px-4 py-3 flex items-center gap-3 opacity-40">
                      <span className="text-base">💀</span>
                      <span className="text-parchment-dim font-body text-sm line-through">{p.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className={`card-dark p-4 text-center ${!currentPlayer?.is_alive ? 'opacity-60 border-blood/30' : ''}`}>
              {currentPlayer?.is_alive
                ? <p className="text-forest-light text-sm font-body">✓ Vous êtes vivant(e)</p>
                : <p className="text-blood-light text-sm font-body">💀 Éliminé(e) — restez silencieux</p>
              }
            </div>

            <div className="card-dark p-4 text-center">
              <p className="text-parchment-dim text-sm font-body mb-3">
                Débattez. Quand vous êtes prêts, lancez le vote.
              </p>
              {currentPlayer?.is_mj && (
                <button onClick={startVote} className="btn-primary w-full">⚖️ Lancer le vote</button>
              )}
              {!currentPlayer?.is_mj && (
                <p className="text-parchment-dim text-xs font-body">Le MJ lancera le vote</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
