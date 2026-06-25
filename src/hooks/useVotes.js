import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useVotes(gameId, phaseNumber) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const phaseRef = useRef(phaseNumber)
  phaseRef.current = phaseNumber
  const keyRef = useRef(null)

  useEffect(() => {
    if (!gameId || phaseNumber == null) return
    const key = `${gameId}_${phaseNumber}`
    if (keyRef.current === key) return
    keyRef.current = key

    const fetch = () =>
      supabase
        .from('mv_votes')
        .select('*')
        .eq('game_id', gameId)
        .eq('phase_number', phaseRef.current)
        .then(({ data }) => { if (data) { setVotes(data); setLoading(false) } })

    fetch()

    const channel = supabase
      .channel(`mv_votes_${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mv_votes', filter: `game_id=eq.${gameId}` },
        fetch
      )
      .subscribe()

    return () => {
      keyRef.current = null
      supabase.removeChannel(channel)
    }
  }, [gameId, phaseNumber])

  const castVote = useCallback(async (voterId, targetId) => {
    return supabase.from('mv_votes').upsert({
      game_id: gameId, voter_id: voterId, target_id: targetId, phase_number: phaseNumber,
    }, { onConflict: 'game_id,voter_id,phase_number' }).select().single()
  }, [gameId, phaseNumber])

  return { votes, loading, castVote }
}
