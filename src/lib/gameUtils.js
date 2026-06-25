import { ROLE_COMPOSITIONS, ROLES, PHASES } from './constants.js'

// ── Génère un code de room 4 lettres majuscules ──
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sans I et O pour éviter confusions
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
    for (let i = 0; i < count; i++) {
      roles.push(roleId)
    }
  }

  // Si le Voleur est activé, ajouter 2 cartes bonus dans le deck et le rôle Voleur
  if (hasThief && playerCount >= 6) {
    // Ajouter 2 villageois en réserve (le voleur les verra pour choisir)
    roles.push('villager', 'villager')
    // Remplacer un villageois par le Voleur
    const villagerIdx = roles.indexOf('villager')
    if (villagerIdx !== -1) roles[villagerIdx] = 'thief'
  }

  return shuffle(roles)
}

// ── Attribue les rôles aux joueurs ──
export function assignRoles(players, hasThief = false) {
  const playerCount = players.length
  const roles = generateRoles(playerCount, hasThief)

  return players.map((player, i) => ({
    ...player,
    role: roles[i] || 'villager',
  }))
}

// ── Vérifie la condition de victoire ──
export function checkVictory(players) {
  const alive = players.filter(p => p.is_alive && !p.is_mj)
  const aliveWolves = alive.filter(p => p.role === 'werewolf')
  const aliveVillagers = alive.filter(p => p.role !== 'werewolf')

  // Victoire des loups : autant (ou plus) de loups que de villageois
  if (aliveWolves.length >= aliveVillagers.length) {
    return 'werewolves'
  }

  // Victoire du village : plus de loups
  if (aliveWolves.length === 0) {
    // Vérifier victoire amants (si les deux seuls survivants sont amants)
    const lovers = alive.filter(p => p.is_lover)
    if (lovers.length === 2 && alive.length === 2) {
      return 'lovers'
    }
    return 'village'
  }

  return null // partie continue
}

// ── Calcule les résultats du vote ──
export function tallyVotes(votes, players) {
  const counts = {}
  for (const vote of votes) {
    counts[vote.target_id] = (counts[vote.target_id] || 0) + 1
  }

  let maxVotes = 0
  let eliminated = null

  for (const [playerId, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count
      eliminated = playerId
    } else if (count === maxVotes) {
      // Égalité → pas d'élimination
      eliminated = null
    }
  }

  const eliminatedPlayer = eliminated
    ? players.find(p => p.id === eliminated)
    : null

  return {
    counts,
    eliminated: eliminatedPlayer,
    isTie: eliminated === null && Object.keys(counts).length > 0,
  }
}

// ── Ordonne les joueurs par ordre d'éveil nocturne ──
export function sortByWakeOrder(players) {
  return [...players].sort((a, b) => {
    const aOrder = ROLES[a.role]?.wakeOrder ?? 99
    const bOrder = ROLES[b.role]?.wakeOrder ?? 99
    return aOrder - bOrder
  })
}

// ── Formate le temps restant ──
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

// ── Calcule la phase suivante ──
export function getNextPhase(currentPhase, phaseNumber, game) {
  switch (currentPhase) {
    case PHASES.LOBBY:
      return { phase: PHASES.ROLE_REVEAL, phaseNumber }
    case PHASES.ROLE_REVEAL:
      // Si Voleur dans la partie, passer au tour du Voleur d'abord
      return { phase: PHASES.NIGHT, phaseNumber: 1 }
    case PHASES.NIGHT:
      return { phase: PHASES.NIGHT_RESOLUTION, phaseNumber }
    case PHASES.NIGHT_RESOLUTION:
      return { phase: PHASES.DAY, phaseNumber }
    case PHASES.DAY:
      return { phase: PHASES.VOTE, phaseNumber }
    case PHASES.VOTE:
      return { phase: PHASES.ELIMINATION, phaseNumber }
    case PHASES.ELIMINATION:
      return { phase: PHASES.NIGHT, phaseNumber: phaseNumber + 1 }
    case PHASES.HUNTER_SHOT:
      return { phase: PHASES.NIGHT, phaseNumber: phaseNumber + 1 }
    default:
      return { phase: currentPhase, phaseNumber }
  }
}

// ── Génère un ID de session local ──
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
