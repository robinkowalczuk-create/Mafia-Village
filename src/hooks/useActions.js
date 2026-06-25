import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateChannel, removeChannel } from '../lib/realtimeManager'

export function useActions(gameId, phaseNumber) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const phaseRef = useRef(phaseNumber)
  phaseRef.current = phaseNumber

  const fetchActions = (gid, phase) =>
    supabase
      .from('mv_actions')
      .select('*')
      .eq('game_id', gid)
      .eq('phase_number', phase)
      .then(({ data }) => { if (data) setActions(data); setLoading(false) })

  useEffect(() => {
    if (!gameId || phaseNumber == null || mountedRef.current) return
    mountedRef.current = true

    fetchActions(gameId, phaseNumber)

    const channelKey = `actions_${gameId}`
    getOrCreateChannel(
      channelKey,
      'mv_actions',
      `game_id=eq.${gameId}`,
      () => fetchActions(gameId, phaseRef.current)
    )

    return () => {
      mountedRef.current = false
      removeChannel(channelKey)
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
