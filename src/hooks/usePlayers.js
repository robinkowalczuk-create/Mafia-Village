import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const gameIdRef = useRef(null)

  useEffect(() => {
    if (!gameId) return
    // Si même gameId, pas besoin de re-souscrire
    if (gameIdRef.current === gameId) return
    gameIdRef.current = gameId

    const fetch = () =>
      supabase
        .from('mv_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true })
        .then(({ data }) => { if (data) { setPlayers(data); setLoading(false) } })

    fetch()

    const channel = supabase
      .channel(`mv_players_${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mv_players', filter: `game_id=eq.${gameId}` },
        fetch
      )
      .subscribe()

    return () => {
      gameIdRef.current = null
      supabase.removeChannel(channel)
    }
  }, [gameId])

  return { players, loading }
}
