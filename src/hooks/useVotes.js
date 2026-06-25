import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useVotes(gameId, phaseNumber) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchVotes = useCallback(async () => {
    if (!gameId || phaseNumber == null) return
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('game_id', gameId)
      .eq('phase_number', phaseNumber)

    if (data) setVotes(data)
    setLoading(false)
  }, [gameId, phaseNumber])

  useEffect(() => {
    if (!gameId) return
    fetchVotes()

    const channel = supabase
      .channel(`votes:${gameId}:${phaseNumber}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
        () => fetchVotes()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [gameId, phaseNumber, fetchVotes])

  const castVote = useCallback(async (voterId, targetId) => {
    // Upsert : remplace le vote existant si le joueur revoie
    const { data, error } = await supabase
      .from('votes')
      .upsert({
        game_id: gameId,
        voter_id: voterId,
        target_id: targetId,
        phase_number: phaseNumber,
      }, { onConflict: 'game_id,voter_id,phase_number' })
      .select()
      .single()

    return { data, error }
  }, [gameId, phaseNumber])

  return { votes, loading, refetch: fetchVotes, castVote }
}
