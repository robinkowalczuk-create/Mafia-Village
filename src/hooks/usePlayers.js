import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gameId) return

    let active = true

    const fetch = () =>
      supabase
        .from('mv_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true })
        .then(({ data }) => { if (active && data) { setPlayers(data); setLoading(false) } })

    fetch()

    const channel = supabase
      .channel(`mv_players_${gameId}_${Math.random()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mv_players', filter: `game_id=eq.${gameId}` },
        fetch
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [gameId])

  return { players, loading }
}
