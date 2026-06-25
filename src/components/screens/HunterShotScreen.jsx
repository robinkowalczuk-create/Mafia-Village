import { useState } from 'react'
import { usePlayers } from '../../hooks/usePlayers'
import { PHASES } from '../../lib/constants'
import { checkVictory } from '../../lib/gameUtils'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

export function HunterShotScreen({ game, currentPlayer }) {
  const { players } = usePlayers(game.id)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [done, setDone] = useState(false)

  const hunter = players.find(p => p.id === game.eliminated_player_id)
  const isHunter = currentPlayer?.id === hunter?.id
  const alivePlayers = players.filter(p => p.is_alive && p.id !== hunter?.id)

  const handleShot = async () => {
    if (!selectedTarget || !isHunter) return
    sounds.elimination()

    await supabase.from('players')
      .update({ is_alive: false, hunter_shot_used: true })
      .eq('id', selectedTarget)

    await supabase.from('players')
      .update({ hunter_shot_used: true })
      .eq('id', hunter.id)

    setDone(true)

    // Check victory
    const updatedPlayers = players.map(p =>
      p.id === selectedTarget || p.id === hunter.id ? { ...p, is_alive: false } : p
    )
    const winner = checkVictory(updatedPlayers)

    setTimeout(async () => {
      if (winner) {
        sounds[winner === 'werewolves' ? 'wolvesVictory' : 'villageVictory']()
        await supabase.from('games').update({
          current_phase: PHASES.VICTORY,
          status: 'finished',
          winner_camp: winner,
        }).eq('id', game.id)
      } else {
        await supabase.from('games').update({
          current_phase: PHASES.ELIMINATION,
          hunter_target_id: selectedTarget,
        }).eq('id', game.id)
      }
    }, 2000)
  }

  return (
    <div className="screen flex flex-col items-center justify-center px-6">
      <div className="stars-bg" />
      <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(ellipse at center, #7A5A2A 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-6xl animate-float">🏹</div>
        <h1 className="font-display font-black text-2xl text-gold text-center">
          Le Chasseur tire !
        </h1>
        <p className="text-parchment-dim text-sm font-body text-center">
          <strong className="text-parchment">{hunter?.name}</strong> tombe...
          mais emporte quelqu'un dans sa chute.
        </p>

        {isHunter && !done && (
          <>
            <p className="text-gold text-sm font-body text-center">
              C'est vous ! Choisissez votre dernière cible.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-amber-600/60 bg-amber-900/10' : ''}`}
                >
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">🎯</span>}
                </button>
              ))}
            </div>
            <button
              onClick={handleShot}
              disabled={!selectedTarget}
              className="btn-danger w-full disabled:opacity-30"
            >
              🏹 Tirer
            </button>
          </>
        )}

        {!isHunter && (
          <div className="card-dark p-4 text-center w-full">
            <p className="text-parchment-dim text-sm font-body">
              ⏳ Le Chasseur choisit sa cible...
            </p>
          </div>
        )}

        {done && (
          <div className="card-glow-blood p-4 text-center w-full animate-fade-in">
            <p className="text-blood-light font-display">🏹 Le tir a retenti dans la nuit...</p>
          </div>
        )}
      </div>
    </div>
  )
}
