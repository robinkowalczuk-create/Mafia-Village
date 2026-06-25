import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useVotes(gameId, phaseNumber) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const subscribedRef = useRef(false)

  const doFetch = (gid, phase) => {
    supabase
      .from('mv_votes')
      .select('*')
      .eq('game_id', gid)
      .eq('phase_number', phase)
      .then(({ data }) => { if (data) setVotes(data); setLoading(false) })
  }

  useEffect(() => {
    if (!gameId || phaseNumber == null || subscribedRef.current) return
    subscribedRef.current = true

    doFetch(gameId, phaseNumber)

    const channel = supabase
      .channel(`votes_${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_votes', filter: `game_id=eq.${gameId}` },
        () => doFetch(gameId, phaseNumber)
      )
      .subscribe()

    return () => {
      subscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [gameId, phaseNumber])

  const castVote = useCallback(async (voterId, targetId) => {
    const { data, error } = await supabase
      .from('mv_votes')
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

  return { votes, loading, castVote }
}
