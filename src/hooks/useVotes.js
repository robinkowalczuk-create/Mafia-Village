import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useVotes(gameId, phaseNumber) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const fetchVotes = useCallback(async () => {
    if (!gameId || phaseNumber == null) return
    const { data } = await supabase
      .from('mv_votes')
      .select('*')
      .eq('game_id', gameId)
      .eq('phase_number', phaseNumber)

    if (data) setVotes(data)
    setLoading(false)
  }, [gameId, phaseNumber])

  useEffect(() => {
    if (!gameId) return
    fetchVotes()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`votes:${gameId}:${phaseNumber}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_votes', filter: `game_id=eq.${gameId}` },
        () => fetchVotes()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
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

  return { votes, loading, refetch: fetchVotes, castVote }
}
