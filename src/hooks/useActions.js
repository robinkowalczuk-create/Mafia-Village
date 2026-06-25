import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useActions(gameId, phaseNumber) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const fetchActions = useCallback(async () => {
    if (!gameId || phaseNumber == null) return
    const { data } = await supabase
      .from('mv_actions')
      .select('*')
      .eq('game_id', gameId)
      .eq('phase_number', phaseNumber)

    if (data) setActions(data)
    setLoading(false)
  }, [gameId, phaseNumber])

  useEffect(() => {
    if (!gameId) return
    fetchActions()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`actions:${gameId}:${phaseNumber}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_actions', filter: `game_id=eq.${gameId}` },
        () => fetchActions()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [gameId, phaseNumber])

  const submitAction = useCallback(async (playerId, actionType, targetId = null) => {
    const { data, error } = await supabase
      .from('mv_actions')
      .upsert({
        game_id: gameId,
        player_id: playerId,
        action_type: actionType,
        target_id: targetId,
        phase_number: phaseNumber,
      }, { onConflict: 'game_id,player_id,action_type,phase_number' })
      .select()
      .single()

    return { data, error }
  }, [gameId, phaseNumber])

  return { actions, loading, refetch: fetchActions, submitAction }
}
