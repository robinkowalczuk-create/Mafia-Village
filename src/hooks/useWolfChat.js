import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useWolfChat(gameId) {
  const [messages, setMessages] = useState([])
  const channelRef = useRef(null)

  useEffect(() => {
    if (!gameId) return

    // Load recent messages
    supabase
      .from('mv_wolf_chat')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { if (data) setMessages(data) })

    // Subscribe to new messages
    const channel = supabase
      .channel(`wolf_chat_${gameId}_${Math.random()}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mv_wolf_chat', filter: `game_id=eq.${gameId}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [gameId])

  const sendMessage = async (playerId, playerName, text) => {
    if (!text.trim()) return
    await supabase.from('mv_wolf_chat').insert({
      game_id: gameId,
      player_id: playerId,
      player_name: playerName,
      text: text.trim(),
    })
  }

  return { messages, sendMessage }
}
