import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateChannel, removeChannel } from '../lib/realtimeManager'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)

  const fetchPlayers = (gid) =>
    supabase
      .from('mv_players')
      .select('*')
      .eq('game_id', gid)
      .order('joined_at', { ascending: true })
      .then(({ data }) => { if (data) setPlayers(data); setLoading(false) })

  useEffect(() => {
    if (!gameId || mountedRef.current) return
    mountedRef.current = true

    fetchPlayers(gameId)

    const channelKey = `players_${gameId}`
    getOrCreateChannel(
      channelKey,
      'mv_players',
      `game_id=eq.${gameId}`,
      () => fetchPlayers(gameId)
    )

    return () => {
      mountedRef.current = false
      removeChannel(channelKey)
    }
  }, [gameId])

  return { players, loading }
}
