// ═══════════════════════════════════════════════════════
// REALTIME MANAGER — singleton pour éviter les doublons
// Supabase ne permet pas d'appeler .on() après .subscribe()
// Ce manager garantit qu'un seul channel existe par clé
// ═══════════════════════════════════════════════════════
import { supabase } from './supabase'

const channels = new Map()

export function getOrCreateChannel(key, table, filter, onEvent) {
  // Si un channel existe déjà pour cette clé, on le retourne
  if (channels.has(key)) {
    return channels.get(key)
  }

  const channel = supabase
    .channel(key)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onEvent)
    .subscribe()

  channels.set(key, channel)
  return channel
}

export function removeChannel(key) {
  if (channels.has(key)) {
    supabase.removeChannel(channels.get(key))
    channels.delete(key)
  }
}
