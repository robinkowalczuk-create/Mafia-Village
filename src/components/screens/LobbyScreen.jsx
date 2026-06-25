import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePlayers } from '../../hooks/usePlayers'
import { assignRoles, checkVictory } from '../../lib/gameUtils'
import { PHASES, ROLE_COMPOSITIONS } from '../../lib/constants'
import { Button } from '../ui/Button'
import { sounds } from '../../lib/sounds'

export function LobbyScreen({ game, currentPlayer, onPhaseChange }) {
  const { players } = usePlayers(game.id)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isMJ = currentPlayer?.is_mj
  const playerCount = players.length
  const minPlayers = 4
  const maxPlayers = 12
  const canStart = playerCount >= minPlayers && playerCount <= maxPlayers && ROLE_COMPOSITIONS[playerCount]

  const copyCode = () => {
    navigator.clipboard.writeText(game.code)
    setCopied(true)
    sounds.uiClick()
    setTimeout(() => setCopied(false), 2000)
  }

  const startGame = async () => {
    if (!canStart || !isMJ) return
    setStarting(true)
    sounds.phaseTransition()

    try {
      // Attribuer les rôles
      const playersWithRoles = assignRoles(players)

      // Mettre à jour chaque joueur avec son rôle
      for (const p of playersWithRoles) {
        await supabase
          .from('players')
          .update({ role: p.role })
          .eq('id', p.id)
      }

      // Changer la phase
      await supabase
        .from('games')
        .update({ current_phase: PHASES.ROLE_REVEAL, status: 'in_progress', phase_number: 1 })
        .eq('id', game.id)

    } catch (e) {
      console.error(e)
    } finally {
      setStarting(false)
    }
  }

  const composition = ROLE_COMPOSITIONS[playerCount]

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="village-silhouette" />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <p className="text-parchment-dim text-xs font-body uppercase tracking-widest">Salle d'attente</p>
          <h1 className="font-display font-black text-3xl text-gold text-shadow-gold">
            Code de room
          </h1>

          {/* Room code badge */}
          <button
            onClick={copyCode}
            className="flex items-center gap-3 bg-slate-light border border-gold/20 rounded-2xl px-8 py-4 active:scale-95 transition-transform"
          >
            <span className="font-display font-black text-4xl text-gold tracking-[0.3em]">
              {game.code}
            </span>
            <span className="text-parchment-dim text-xl">{copied ? '✓' : '📋'}</span>
          </button>
          <p className="text-parchment-dim text-xs">
            {copied ? 'Copié !' : 'Appuyez pour copier'}
          </p>
        </div>

        {/* Player count indicator */}
        <div className="flex items-center gap-2 justify-center">
          {Array.from({ length: maxPlayers }).map((_, i) => (
            <div
              key={i}
              className={`
                h-2 rounded-full transition-all duration-300
                ${i < playerCount
                  ? 'bg-gold w-4'
                  : i < minPlayers
                  ? 'bg-blood/40 w-2'
                  : 'bg-white/10 w-2'
                }
              `}
            />
          ))}
        </div>
        <p className="text-center text-parchment-dim text-sm font-body -mt-4">
          {playerCount} / {maxPlayers} joueurs
          {playerCount < minPlayers && <span className="text-blood-light"> · minimum {minPlayers}</span>}
        </p>

        {/* Players list */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`
                card-dark flex items-center gap-3 px-4 py-3
                ${p.id === currentPlayer?.id ? 'border-gold/30 bg-gold/5' : ''}
                animate-fade-up
              `}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold
                ${p.is_mj ? 'bg-gold/20 text-gold' : 'bg-white/5 text-parchment-dim'}
              `}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className={`font-body font-medium ${p.id === currentPlayer?.id ? 'text-gold' : 'text-parchment'}`}>
                  {p.name}
                  {p.id === currentPlayer?.id && <span className="text-gold/60 text-xs ml-1">(toi)</span>}
                </p>
                {p.is_mj && (
                  <p className="text-xs text-gold/60 font-body">Maître du Jeu</p>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full ${p.is_mj ? 'bg-gold' : 'bg-forest'} animate-pulse`} />
            </div>
          ))}

          {/* Empty slots */}
          {playerCount < minPlayers && Array.from({ length: minPlayers - playerCount }).map((_, i) => (
            <div key={`empty-${i}`} className="card-dark flex items-center gap-3 px-4 py-3 opacity-30">
              <div className="w-9 h-9 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                <span className="text-parchment-dim text-sm">?</span>
              </div>
              <p className="text-parchment-dim text-sm font-body">En attente...</p>
            </div>
          ))}
        </div>

        {/* Composition preview */}
        {composition && playerCount >= minPlayers && (
          <div className="card-dark p-4">
            <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mb-3">
              Composition pour {playerCount} joueurs
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(composition).map(([role, count]) => (
                <span key={role} className="text-xs bg-white/5 text-parchment-dim px-2 py-1 rounded-lg font-body">
                  {count}× {role === 'villager' ? '🏡' : role === 'werewolf' ? '🐺' : role === 'seer' ? '🔮' : role === 'witch' ? '🧪' : role === 'hunter' ? '🏹' : role === 'cupid' ? '💘' : role === 'bodyguard' ? '🛡️' : '?'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Start button (MJ only) */}
        {isMJ ? (
          <Button
            variant="primary"
            className="w-full text-base py-5"
            disabled={!canStart || starting}
            onClick={startGame}
            icon="⚔️"
          >
            {starting ? 'Démarrage...' : canStart ? 'Lancer la partie' : `Attente (min. ${minPlayers})`}
          </Button>
        ) : (
          <div className="card-dark p-4 text-center">
            <p className="text-parchment-dim text-sm font-body">
              ⏳ En attente du Maître du Jeu...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
