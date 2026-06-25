import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGame(gameCode) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const fetchGame = useCallback(async () => {
    if (!gameCode) return
    const { data, error } = await supabase
      .from('mv_games')
      .select('*')
      .eq('code', gameCode.toUpperCase())
      .single()

    if (error) {
      setError(error.message)
    } else {
      setGame(data)
    }
    setLoading(false)
  }, [gameCode])

  useEffect(() => {
    if (!gameCode) return
    fetchGame()

    // Remove any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = `game:${gameCode}:${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_games', filter: `code=eq.${gameCode.toUpperCase()}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setGame(payload.new)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [gameCode])

  const updateGame = useCallback(async (updates) => {
    if (!game?.id) return { error: 'No game' }
    const { data, error } = await supabase
      .from('mv_games')
      .update(updates)
      .eq('id', game.id)
      .select()
      .single()
    if (!error) setGame(data)
    return { data, error }
  }, [game?.id])

  return { game, loading, error, refetch: fetchGame, updateGame }
}
