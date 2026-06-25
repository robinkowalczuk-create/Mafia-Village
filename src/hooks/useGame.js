import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGame(gameCode) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const subscribedRef = useRef(false)
  const gameIdRef = useRef(null)

  useEffect(() => {
    if (!gameCode || subscribedRef.current) return
    subscribedRef.current = true

    const upper = gameCode.toUpperCase()

    supabase
      .from('mv_games')
      .select('*')
      .eq('code', upper)
      .single()
      .then(({ data, error }) => {
        if (error) { setError(error.message) }
        else { setGame(data); gameIdRef.current = data?.id }
        setLoading(false)
      })

    const channel = supabase
      .channel(`game_${gameCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_games', filter: `code=eq.${upper}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setGame(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      subscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [gameCode])

  const updateGame = useCallback(async (updates) => {
    if (!gameIdRef.current) return { error: 'No game' }
    const { data, error } = await supabase
      .from('mv_games')
      .update(updates)
      .eq('id', gameIdRef.current)
      .select()
      .single()
    if (!error) setGame(data)
    return { data, error }
  }, [])

  return { game, loading, error, updateGame }
}
