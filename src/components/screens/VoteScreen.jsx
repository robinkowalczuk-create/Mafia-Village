import { useState, useEffect, useCallback } from 'react'
import { useVotes } from '../../hooks/useVotes'
import { CountdownTimer } from '../ui/CountdownTimer'
import { tallyVotes } from '../../lib/gameUtils'
import { VOTE_DURATION_SECONDS, PHASES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

export function VoteScreen({ game, currentPlayer, players = [] }) {
  const { votes, castVote } = useVotes(game.id, game.phase_number)
  const [myVote, setMyVote] = useState(null)
  const [timerRunning, setTimerRunning] = useState(true)

  const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id)
  const canVote = currentPlayer?.is_alive && !currentPlayer?.idiot_voted_out
  const { counts, eliminated, isTie } = tallyVotes(votes, players)

  // Check if I already voted
  useEffect(() => {
    const existing = votes.find(v => v.voter_id === currentPlayer?.id)
    if (existing) setMyVote(existing.target_id)
  }, [votes, currentPlayer?.id])

  const handleVote = async (targetId) => {
    if (!canVote) return
    sounds.voteCast()
    setMyVote(targetId)
    await castVote(currentPlayer.id, targetId)
  }

  const resolveVote = useCallback(async () => {
    setTimerRunning(false)
    sounds.elimination()

    const { counts, eliminated, isTie } = tallyVotes(votes, players)

    if (isTie || !eliminated) {
      // Égalité : pas d'élimination
      await supabase.from('mv_games').update({
        current_phase: PHASES.ELIMINATION,
        eliminated_player_id: null,
        vote_tie: true,
      }).eq('id', game.id)
      return
    }

    // Idiot du Village : survit au premier vote
    if (eliminated.role === 'idiot' && !eliminated.idiot_voted_out) {
      await supabase.from('mv_players').update({ idiot_voted_out: true }).eq('id', eliminated.id)
      await supabase.from('mv_games').update({
        current_phase: PHASES.ELIMINATION,
        eliminated_player_id: eliminated.id,
        vote_tie: false,
      }).eq('id', game.id)
      return
    }

    // Chasseur éliminé : activer son pouvoir
    if (eliminated.role === 'hunter' && !eliminated.hunter_shot_used) {
      await supabase.from('mv_players').update({ is_alive: false }).eq('id', eliminated.id)
      await supabase.from('mv_games').update({
        current_phase: PHASES.HUNTER_SHOT,
        eliminated_player_id: eliminated.id,
      }).eq('id', game.id)
      return
    }

    // Élimination normale → séquence dramatique dans EliminationScreen
    // La victoire est vérifiée là-bas, après la révélation de carte
    await supabase.from('mv_players').update({ is_alive: false }).eq('id', eliminated.id)
    await supabase.from('mv_games').update({
      current_phase: PHASES.ELIMINATION,
      eliminated_player_id: eliminated.id,
      vote_tie: false,
    }).eq('id', game.id)
  }, [votes, players, game.id])

  // Tally when all alive players have voted OR timer expires
  const aliveVoters = players.filter(p => p.is_alive && !p.idiot_voted_out)
  const allVoted = votes.length >= aliveVoters.length && aliveVoters.length > 0

  useEffect(() => {
    if (allVoted && timerRunning) resolveVote()
  }, [allVoted, timerRunning, resolveVote])

  // Max vote count for bar widths
  const maxCount = Math.max(...Object.values(counts), 1)

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div
        className="absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5">

        {/* Header + Timer */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-4xl">⚖️</div>
          <h1 className="font-display font-black text-2xl text-gold">Vote d'élimination</h1>
          <CountdownTimer
            duration={VOTE_DURATION_SECONDS}
            running={timerRunning}
            onExpire={resolveVote}
          />
        </div>

        {/* Vote progress */}
        <div className="card-dark p-3 flex items-center justify-between">
          <span className="text-parchment-dim text-xs font-body">
            {votes.length} / {aliveVoters.length} votes
          </span>
          <div className="flex gap-1">
            {aliveVoters.map((p, i) => (
              <div
                key={p.id}
                className={`w-2 h-2 rounded-full transition-colors ${votes.find(v => v.voter_id === p.id) ? 'bg-gold' : 'bg-white/15'}`}
              />
            ))}
          </div>
        </div>

        {/* My vote / Player list */}
        {canVote ? (
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
              {myVote ? 'Votre vote (appuyez pour changer)' : 'Votez pour éliminer'}
            </p>
            {alivePlayers.map(p => {
              const voteCount = counts[p.id] || 0
              const isMyVote = myVote === p.id
              const pct = (voteCount / maxCount) * 100

              return (
                <button
                  key={p.id}
                  onClick={() => handleVote(p.id)}
                  className={`
                    relative card-dark px-4 py-3 flex items-center gap-3 text-left overflow-hidden
                    active:scale-98 transition-all duration-200
                    ${isMyVote ? 'border-blood/60' : ''}
                  `}
                >
                  {/* Vote bar background */}
                  <div
                    className="absolute inset-0 bg-blood/15 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative flex items-center gap-3 flex-1">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-display
                      ${isMyVote ? 'bg-blood/30 text-blood-light' : 'bg-white/5 text-parchment-dim'}
                    `}>
                      {p.name[0]}
                    </div>
                    <span className={`font-body ${isMyVote ? 'text-parchment font-medium' : 'text-parchment-dim'}`}>
                      {p.name}
                    </span>
                  </div>

                  <div className="relative flex items-center gap-2">
                    {voteCount > 0 && (
                      <span className="text-blood-light font-display font-bold text-sm">
                        {voteCount}
                      </span>
                    )}
                    {isMyVote && <span className="text-blood-light">🗳️</span>}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-5xl opacity-50">👁️</div>
            <p className="text-parchment-dim text-sm font-body text-center">
              {!currentPlayer?.is_alive
                ? 'Vous êtes éliminé(e). Observez en silence.'
                : 'Vous ne pouvez pas voter (Idiot du Village).'
              }
            </p>

            {/* Still show live counts */}
            <div className="w-full max-w-xs flex flex-col gap-2">
              {alivePlayers.map(p => {
                const count = counts[p.id] || 0
                return count > 0 ? (
                  <div key={p.id} className="flex items-center justify-between card-dark px-3 py-2">
                    <span className="text-parchment-dim text-sm font-body">{p.name}</span>
                    <span className="text-blood-light font-display font-bold">{count}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
