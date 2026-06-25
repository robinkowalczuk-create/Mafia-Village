import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateChannel, removeChannel } from '../lib/realtimeManager'

export function useVotes(gameId, phaseNumber) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const phaseRef = useRef(phaseNumber)
  phaseRef.current = phaseNumber

  const fetchVotes = (gid, phase) =>
    supabase
      .from('mv_votes')
      .select('*')
      .eq('game_id', gid)
      .eq('phase_number', phase)
      .then(({ data }) => { if (data) setVotes(data); setLoading(false) })

  useEffect(() => {
    if (!gameId || phaseNumber == null || mountedRef.current) return
    mountedRef.current = true

    fetchVotes(gameId, phaseNumber)

    const channelKey = `votes_${gameId}`
    getOrCreateChannel(
      channelKey,
      'mv_votes',
      `game_id=eq.${gameId}`,
      () => fetchVotes(gameId, phaseRef.current)
    )

    return () => {
      mountedRef.current = false
      removeChannel(channelKey)
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
