import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPlayers = useCallback(async () => {
    if (!gameId) return
    const { data } = await supabase
      .from('mv_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })

    if (data) setPlayers(data)
    setLoading(false)
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    fetchPlayers()

    const channel = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_players', filter: `game_id=eq.${gameId}` },
        () => fetchPlayers()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [gameId, fetchPlayers])

  return { players, loading, refetch: fetchPlayers }
}
