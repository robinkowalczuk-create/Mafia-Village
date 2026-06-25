import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useActions(gameId, phaseNumber) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const subscribedRef = useRef(false)

  const doFetch = (gid, phase) => {
    supabase
      .from('mv_actions')
      .select('*')
      .eq('game_id', gid)
      .eq('phase_number', phase)
      .then(({ data }) => { if (data) setActions(data); setLoading(false) })
  }

  useEffect(() => {
    if (!gameId || phaseNumber == null || subscribedRef.current) return
    subscribedRef.current = true

    doFetch(gameId, phaseNumber)

    const channel = supabase
      .channel(`actions_${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mv_actions', filter: `game_id=eq.${gameId}` },
        () => doFetch(gameId, phaseNumber)
      )
      .subscribe()

    return () => {
      subscribedRef.current = false
      supabase.removeChannel(channel)
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

  return { actions, loading, submitAction }
}
