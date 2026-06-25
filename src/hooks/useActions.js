import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useActions(gameId, phaseNumber) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const phaseRef = useRef(phaseNumber)
  phaseRef.current = phaseNumber
  const keyRef = useRef(null)

  useEffect(() => {
    if (!gameId || phaseNumber == null) return
    const key = `${gameId}_${phaseNumber}`
    if (keyRef.current === key) return
    keyRef.current = key

    const fetch = () =>
      supabase
        .from('mv_actions')
        .select('*')
        .eq('game_id', gameId)
        .eq('phase_number', phaseRef.current)
        .then(({ data }) => { if (data) { setActions(data); setLoading(false) } })

    fetch()

    const channel = supabase
      .channel(`mv_actions_${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mv_actions', filter: `game_id=eq.${gameId}` },
        fetch
      )
      .subscribe()

    return () => {
      keyRef.current = null
      supabase.removeChannel(channel)
    }
  }, [gameId, phaseNumber])

  const submitAction = useCallback(async (playerId, actionType, targetId = null) => {
    return supabase.from('mv_actions').upsert({
      game_id: gameId, player_id: playerId, action_type: actionType,
      target_id: targetId, phase_number: phaseNumber,
    }, { onConflict: 'game_id,player_id,action_type,phase_number' }).select().single()
  }, [gameId, phaseNumber])

  return { actions, loading, submitAction }
}
