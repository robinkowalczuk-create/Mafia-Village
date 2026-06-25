import { useEffect, useState } from 'react'
import { usePlayers } from '../../hooks/usePlayers'
import { PHASES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

export function DayScreen({ game, currentPlayer }) {
  const { players } = usePlayers(game.id)
  const [revealed, setRevealed] = useState(false)

  const nightKills = game.night_kills || []
  const deadPlayers = players.filter(p => nightKills.includes(p.id))
  const isNightResolution = game.current_phase === PHASES.NIGHT_RESOLUTION

  // Auto-transition from night_resolution to day
  useEffect(() => {
    if (game.current_phase !== PHASES.NIGHT_RESOLUTION) return

    // Apply night kills to players
    const applyKills = async () => {
      for (const killId of nightKills) {
        const p = players.find(pl => pl.id === killId)
        if (!p?.is_alive) continue
        // Hunter power check
        if (p.role === 'hunter' && !p.hunter_shot_used) {
          await supabase.from('mv_games').update({ current_phase: PHASES.HUNTER_SHOT }).eq('id', game.id)
          return
        }
        // Idiot du village : survit au premier vote (not applicable here — night kills bypass)
        await supabase.from('mv_players').update({ is_alive: false }).eq('id', p.id)
      }

      sounds.nightFall()
      // Small delay then go to day
      setTimeout(async () => {
        await supabase.from('mv_games').update({
          current_phase: PHASES.DAY,
          night_kills: [],
        }).eq('id', game.id)
      }, 4000)
    }

    if (players.length > 0) applyKills()
  }, [game.current_phase, players.length])

  useEffect(() => {
    if (game.current_phase === PHASES.DAY) {
      setTimeout(() => setRevealed(true), 300)
    }
  }, [game.current_phase])

  const alivePlayers = players.filter(p => p.is_alive)
  const deadAll = players.filter(p => !p.is_alive)

  // MJ advances to vote
  const startVote = async () => {
    sounds.voteStart()
    await supabase.from('mv_games').update({
      current_phase: PHASES.VOTE,
      vote_started_at: new Date().toISOString(),
    }).eq('id', game.id)
  }

  if (isNightResolution) {
    return (
      <div className="screen flex flex-col items-center justify-center">
        <div className="stars-bg" />
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center animate-fade-in">
          <div className="text-6xl animate-float">🌅</div>
          <h1 className="font-display font-black text-3xl text-gold">L'Aube se lève</h1>

          {nightKills.length === 0 ? (
            <>
              <p className="text-forest-light font-display text-lg">Une nuit paisible...</p>
              <p className="text-parchment-dim text-sm font-body">
                Les loups n'ont pas frappé cette nuit. Le village est sain et sauf.
              </p>
            </>
          ) : (
            <>
              <p className="text-blood-light font-display text-lg">La nuit a été cruelle.</p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {deadPlayers.map(p => (
                  <div key={p.id} className="card-glow-blood p-4 text-center animate-shake">
                    <p className="text-3xl mb-1">💀</p>
                    <p className="font-display text-xl text-parchment">{p.name}</p>
                    <p className="text-parchment-dim text-xs font-body mt-1">
                      a été {p.role === 'werewolf' ? 'un Loup-Garou' : 'un(e) ' + p.name} — rôle révélé après élimination
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-1 mt-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg opacity-30" />
      <div className="village-silhouette" />

      <div className={`relative z-10 flex flex-col flex-1 px-5 py-8 gap-5 transition-opacity duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}>

        {/* Header */}
        <div className="text-center pt-4">
          <div className="text-4xl mb-2">☀️</div>
          <h1 className="font-display font-black text-2xl text-gold">Jour {game.phase_number}</h1>
          <p className="text-parchment-dim text-sm font-body mt-1">Discussion libre</p>
        </div>

        {/* Last night summary */}
        {nightKills.length === 0 ? (
          <div className="card-dark border-forest/20 p-4 text-center">
            <p className="text-forest-light font-body text-sm">🌿 Nuit paisible — personne n'a été éliminé</p>
          </div>
        ) : (
          <div className="card-dark border-blood/20 p-4">
            <p className="text-blood-light text-xs uppercase tracking-wider font-body mb-2">Victimes de la nuit</p>
            {deadPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-lg">💀</span>
                <span className="text-parchment font-body">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Your status */}
        <div
          className={`card-dark p-4 text-center ${!currentPlayer?.is_alive ? 'opacity-60 border-blood/30' : ''}`}
        >
          {currentPlayer?.is_alive ? (
            <p className="text-forest-light text-sm font-body">✓ Vous êtes vivant(e)</p>
          ) : (
            <p className="text-blood-light text-sm font-body">💀 Vous avez été éliminé(e) — restez silencieux</p>
          )}
        </div>

        {/* Alive players */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
            Joueurs en vie ({alivePlayers.length})
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

        {/* Vote button — auto-triggered but MJ also has a manual override */}
        <div className="card-dark p-4 text-center">
          <p className="text-parchment-dim text-sm font-body mb-3">
            Débattez librement. Quand vous êtes prêts, lancez le vote.
          </p>
          {currentPlayer?.is_mj && (
            <button
              onClick={startVote}
              className="btn-primary w-full"
            >
              ⚖️ Lancer le vote
            </button>
          )}
          {!currentPlayer?.is_mj && (
            <p className="text-parchment-dim text-xs font-body">Le MJ lancera le vote</p>
          )}
        </div>
      </div>
    </div>
  )
}
