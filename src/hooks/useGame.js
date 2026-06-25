import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGame(gameCode) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const gameCodeRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!gameCode) return
    if (gameCodeRef.current === gameCode) return
    gameCodeRef.current = gameCode

    const upper = gameCode.toUpperCase()

    supabase
      .from('mv_games')
      .select('*')
      .eq('code', upper)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else { setGame(data); gameRef.current = data }
        setLoading(false)
      })

    const channel = supabase
      .channel(`mv_games_${upper}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mv_games', filter: `code=eq.${upper}` },
        (payload) => { setGame(payload.new); gameRef.current = payload.new }
      )
      .subscribe()

    return () => {
      gameCodeRef.current = null
      supabase.removeChannel(channel)
    }
  }, [gameCode])

  const updateGame = useCallback(async (updates) => {
    const id = gameRef.current?.id
    if (!id) return { error: 'No game' }
    const { data, error: err } = await supabase
      .from('mv_games').update(updates).eq('id', id).select().single()
    if (!err) { setGame(data); gameRef.current = data }
    return { data, error: err }
  }, [])

  return { game, loading, error, updateGame }
}
