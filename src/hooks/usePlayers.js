import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!gameId || subscribedRef.current) return
    subscribedRef.current = true

    // Initial fetch
    supabase
      .from('mv_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })
      .then(({ data }) => {
        if (data) setPlayers(data)
        setLoading(false)
      })

    const channel = supabase
      .channel(`players_${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_players', filter: `game_id=eq.${gameId}` },
        () => {
          supabase
            .from('mv_players')
            .select('*')
            .eq('game_id', gameId)
            .order('joined_at', { ascending: true })
            .then(({ data }) => { if (data) setPlayers(data) })
        }
      )
      .subscribe()

    return () => {
      subscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [gameId])

  return { players, loading }
}
