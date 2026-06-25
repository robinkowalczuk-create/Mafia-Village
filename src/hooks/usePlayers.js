import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

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

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`players:${gameId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_players', filter: `game_id=eq.${gameId}` },
        () => fetchPlayers()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [gameId])

  return { players, loading, refetch: fetchPlayers }
}
