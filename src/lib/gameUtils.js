import { ROLE_COMPOSITIONS, ROLES, PHASES } from './constants.js'

// ── Génère un code de room 4 lettres majuscules ──
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Mélange un tableau (Fisher-Yates) ──
export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Génère la liste des rôles pour N joueurs ──
export function generateRoles(playerCount, hasThief = false) {
  const composition = ROLE_COMPOSITIONS[playerCount]
  if (!composition) throw new Error(`Pas de composition définie pour ${playerCount} joueurs`)
  const roles = []
  for (const [roleId, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) roles.push(roleId)
  }
  if (hasThief && playerCount >= 6) {
    roles.push('villager', 'villager')
    const villagerIdx = roles.indexOf('villager')
    if (villagerIdx !== -1) roles[villagerIdx] = 'thief'
  }
  return shuffle(roles)
}

// ── Attribue les rôles aux joueurs ──
export function assignRoles(players, hasThief = false) {
  const playerCount = players.length
  const roles = generateRoles(playerCount, hasThief)
  return players.map((player, i) => ({ ...player, role: roles[i] || 'villager' }))
}

// ── Vérifie la condition de victoire ──
export function checkVictory(players) {
  const alive = players.filter(p => p.is_alive)
  const aliveWolves = alive.filter(p => p.role === 'werewolf')
  const aliveVillagers = alive.filter(p => p.role !== 'werewolf')

  if (aliveWolves.length === 0) {
    const lovers = alive.filter(p => p.is_lover)
    if (lovers.length === 2 && alive.length === 2) return 'lovers'
    return 'village'
  }
  if (aliveWolves.length > aliveVillagers.length) return 'werewolves'
  return null
}

// ── FIX #5 — Calcule les résultats du vote (algo corrigé) ──
export function tallyVotes(votes, players) {
  const counts = {}
  for (const vote of votes) {
    counts[vote.target_id] = (counts[vote.target_id] || 0) + 1
  }

  if (Object.keys(counts).length === 0) {
    return { counts, eliminated: null, isTie: false }
  }

  const maxVotes = Math.max(...Object.values(counts))
  const leaders = Object.entries(counts).filter(([, c]) => c === maxVotes)

  // Égalité si plusieurs joueurs ont le même nombre max de votes
  if (leaders.length > 1) {
    return { counts, eliminated: null, isTie: true }
  }

  const eliminatedPlayer = players.find(p => p.id === leaders[0][0]) || null
  return { counts, eliminated: eliminatedPlayer, isTie: false }
}

export function sortByWakeOrder(players) {
  return [...players].sort((a, b) => {
    const aOrder = ROLES[a.role]?.wakeOrder ?? 99
    const bOrder = ROLES[b.role]?.wakeOrder ?? 99
    return aOrder - bOrder
  })
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

export function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('mafia_player_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('mafia_player_id', id)
  }
  return id
}

export function clearPlayerId() {
  sessionStorage.removeItem('mafia_player_id')
  sessionStorage.removeItem('mafia_game_code')
}
