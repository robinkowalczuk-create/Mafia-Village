// ═══════════════════════════════════════════════════════
// RÔLES — Le Village de Grasse
// ═══════════════════════════════════════════════════════

export const ROLES = {
  villager: {
    id: 'villager',
    name: 'Habitant',
    camp: 'village',
    emoji: '🏡',
    image: '/villager.png',  // upload villager.png à la racine du repo
    color: '#2E5E4E',
    colorLight: '#3D7A64',
    bgGradient: 'from-forest/30 to-night',
    description: 'Âme simple de Grasse. Votre seule arme : votre flair lors des votes du jour.',
    nightAction: null,
    wakeOrder: null,
    powers: ['Votez le jour venu — c\'est votre seule arme'],
  },
  werewolf: {
    id: 'werewolf',
    name: 'Loup-Garou',
    camp: 'werewolves',
    emoji: '🐺',
    image: '/werewolf.png',
    color: '#8B1A1A',
    colorLight: '#B02020',
    bgGradient: 'from-blood/30 to-night',
    description: 'Prédateur des collines de Grasse. Vous rôdez la nuit dans les champs de lavande pour dévorer un habitant.',
    nightAction: 'werewolf_kill',
    wakeOrder: 3,
    powers: ['Choisir une victime chaque nuit (consensus avec les autres loups)'],
  },
  seer: {
    id: 'seer',
    name: 'Voyante',
    camp: 'village',
    emoji: '🔮',
    image: '/seer.png',
    color: '#6B4FA0',
    colorLight: '#8B6FC0',
    bgGradient: 'from-purple-900/30 to-night',
    description: 'Herboriste mystique de Grasse. Chaque nuit, vos essences révèlent la véritable nature d\'un habitant.',
    nightAction: 'seer_inspect',
    wakeOrder: 1,
    powers: ['Inspecter un habitant par nuit', 'Connaître son camp (village ou loups)'],
  },
  witch: {
    id: 'witch',
    name: 'Sorcière',
    camp: 'village',
    emoji: '🧪',
    image: '/witch.png',
    color: '#4A7A8A',
    colorLight: '#5A9AAA',
    bgGradient: 'from-teal-900/30 to-night',
    description: 'Parfumeuse secrète de Grasse. Deux philtres précieux — l\'un redonne la vie, l\'autre l\'ôte.',
    nightAction: 'witch_action',
    wakeOrder: 4,
    powers: ['Potion de vie : ressusciter la victime de la nuit (1 fois)', 'Potion de mort : éliminer n\'importe qui (1 fois)'],
  },
  hunter: {
    id: 'hunter',
    name: 'Chasseur',
    camp: 'village',
    emoji: '🏹',
    image: '/hunter.png',
    color: '#7A5A2A',
    colorLight: '#9A7A3A',
    bgGradient: 'from-amber-900/30 to-night',
    description: 'Garde des collines de Grasse. La mort ne vous prend pas seul — vous emportez un ennemi dans la tombe.',
    nightAction: null,
    wakeOrder: null,
    powers: ['À l\'élimination : choisir un habitant à éliminer avec vous'],
  },
  cupid: {
    id: 'cupid',
    name: 'Cupidon',
    camp: 'village',
    emoji: '💘',
    image: '/cupid.png',
    color: '#A04060',
    colorLight: '#C05070',
    bgGradient: 'from-rose-900/30 to-night',
    description: 'Enfant espiègle de Grasse. La première nuit, liez deux cœurs parmi les habitants.',
    nightAction: 'cupid_link',
    wakeOrder: 0,
    powers: ['Nuit 1 uniquement : désigner deux amants', 'Si l\'un meurt, l\'autre meurt de chagrin'],
  },
  littlegirl: {
    id: 'littlegirl',
    name: 'Petite Fille',
    camp: 'village',
    emoji: '👁️',
    image: '/littlegirl.png',
    color: '#8A6A3A',
    colorLight: '#AA8A5A',
    bgGradient: 'from-yellow-900/30 to-night',
    description: 'Curieuse des ruelles de Grasse. Vous osez espionner les loups dans les collines la nuit.',
    nightAction: 'spy',
    wakeOrder: 3.5,
    powers: ['Peut "jeter un œil" pendant la nuit des loups', 'Si surprise, elle est éliminée à leur place'],
  },
  thief: {
    id: 'thief',
    name: 'Voleur',
    camp: 'village',
    emoji: '🃏',
    image: '/thief.png',
    color: '#3A5A7A',
    colorLight: '#5A7A9A',
    bgGradient: 'from-blue-900/30 to-night',
    description: 'Pickpocket des marchés de Grasse. Avant la partie, volez une identité parmi deux cartes cachées.',
    nightAction: 'thief_steal',
    wakeOrder: -1,
    powers: ['Avant la 1ère nuit : choisir l\'un des 2 rôles non distribués'],
  },
  idiot: {
    id: 'idiot',
    name: 'Idiot du Village',
    camp: 'village',
    emoji: '🤡',
    image: '/idiot.png',
    color: '#2E5E4E',
    colorLight: '#3D7A64',
    bgGradient: 'from-forest/20 to-night',
    description: 'Bouffon bien-aimé de Grasse. Si le village vous élimine, vous survivez... mais perdez votre droit de vote.',
    nightAction: null,
    wakeOrder: null,
    powers: ['Survive au premier vote d\'élimination', 'Perd définitivement le droit de vote après'],
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Garde du Corps',
    camp: 'village',
    emoji: '🛡️',
    image: '/bodyguard.png',
    color: '#4A4A8A',
    colorLight: '#6A6AAA',
    bgGradient: 'from-indigo-900/30 to-night',
    description: 'Protecteur des ruelles de Grasse. Chaque nuit, veillez sur un habitant — mais jamais deux fois de suite.',
    nightAction: 'bodyguard_protect',
    wakeOrder: 2,
    powers: ['Protéger un habitant par nuit', 'Ne peut pas protéger la même personne deux nuits consécutives'],
  },
}

// ═══════════════════════════════════════════════════════
// COMPOSITION PAR NOMBRE DE JOUEURS (2–12)
// ═══════════════════════════════════════════════════════

export const ROLE_COMPOSITIONS = {
  // ── Modes test ──
  2:  { villager: 1, werewolf: 1 },
  3:  { villager: 1, werewolf: 1, seer: 1 },
  // ── Parties normales ──
  4:  { villager: 1, werewolf: 1, seer: 1, witch: 1 },
  5:  { villager: 2, werewolf: 1, seer: 1, witch: 1 },
  6:  { villager: 2, werewolf: 1, seer: 1, witch: 1, hunter: 1 },
  7:  { villager: 2, werewolf: 2, seer: 1, witch: 1, hunter: 1 },
  8:  { villager: 3, werewolf: 2, seer: 1, witch: 1, hunter: 1 },
  9:  { villager: 3, werewolf: 2, seer: 1, witch: 1, hunter: 1, cupid: 1 },
  10: { villager: 3, werewolf: 2, seer: 1, witch: 1, hunter: 1, cupid: 1, bodyguard: 1 },
  11: { villager: 3, werewolf: 3, seer: 1, witch: 1, hunter: 1, cupid: 1, bodyguard: 1 },
  12: { villager: 3, werewolf: 3, seer: 1, witch: 1, hunter: 1, cupid: 1, bodyguard: 1, littlegirl: 1 },
}

export const MIN_PLAYERS = 2
export const MIN_PLAYERS_REAL = 4

// ═══════════════════════════════════════════════════════
// PHASES
// ═══════════════════════════════════════════════════════

export const PHASES = {
  LOBBY:            'lobby',
  ROLE_REVEAL:      'role_reveal',
  THIEF_TURN:       'thief_turn',
  CUPID_TURN:       'cupid_turn',
  NIGHT:            'night',
  NIGHT_RESOLUTION: 'night_resolution',
  DAY:              'day',
  VOTE:             'vote',
  ELIMINATION:      'elimination',
  HUNTER_SHOT:      'hunter_shot',
  VICTORY:          'victory',
}

export const PHASE_FLOW = [
  PHASES.NIGHT,
  PHASES.NIGHT_RESOLUTION,
  PHASES.DAY,
  PHASES.VOTE,
  PHASES.ELIMINATION,
]

// ═══════════════════════════════════════════════════════
// TEXTES NARRATIFS PAR PHASE — Grasse
// ═══════════════════════════════════════════════════════

export const PHASE_NARRATIVES = {
  [PHASES.NIGHT]: {
    title: 'La Nuit tombe sur Grasse',
    subtitle: 'Les habitants s\'endorment...',
    atmosphere: 'Des ombres glissent entre les ruelles pavées. Le parfum de lavande ne masque pas la peur.',
    bgColor: '#0A0A14',
    accentColor: '#C8A96E',
  },
  [PHASES.NIGHT_RESOLUTION]: {
    title: 'L\'Aube sur les collines',
    subtitle: 'Grasse s\'éveille...',
    atmosphere: 'Les habitants ouvrent leurs volets, le cœur serré. La nuit a-t-elle frappé parmi eux ?',
    bgColor: '#1A1020',
    accentColor: '#C8A96E',
  },
  [PHASES.DAY]: {
    title: 'Le Jour se lève',
    subtitle: 'Place du village — débattez.',
    atmosphere: 'Sur la place de Grasse, les regards s\'affrontent. Qui ment ? Qui cache un loup ?',
    bgColor: '#0A1A14',
    accentColor: '#C8A96E',
  },
  [PHASES.VOTE]: {
    title: 'L\'Heure du Jugement',
    subtitle: 'Grasse désigne un coupable.',
    atmosphere: 'Le village de Grasse doit parler d\'une seule voix. Votez.',
    bgColor: '#1A0A0A',
    accentColor: '#8B1A1A',
  },
  [PHASES.ELIMINATION]: {
    title: 'L\'Élimination',
    subtitle: 'La foule a décidé.',
    atmosphere: 'Un habitant de Grasse quitte le village pour toujours. Était-ce le bon choix ?',
    bgColor: '#0A0A14',
    accentColor: '#8B1A1A',
  },
}

// ═══════════════════════════════════════════════════════
// INSTRUCTIONS NOCTURNES
// ═══════════════════════════════════════════════════════

export const ROLE_NIGHT_INSTRUCTIONS = {
  villager:   'Fermez les yeux. Grasse a besoin de vous demain.',
  werewolf:   'Ouvrez les yeux, loups des collines. Désignez votre victime.',
  seer:       'Ouvrez les yeux. Vos essences vous guident vers la vérité.',
  witch:      'Ouvrez les yeux. Vos philtres sont prêts.',
  hunter:     'Fermez les yeux. Votre pouvoir s\'active à votre mort.',
  cupid:      'Ouvrez les yeux. Liez deux cœurs parmi les habitants.',
  littlegirl: 'Vous pouvez espionner les loups... mais attention.',
  thief:      'Choisissez votre identité parmi les deux cartes cachées.',
  idiot:      'Fermez les yeux. Votre protection vient en plein jour.',
  bodyguard:  'Ouvrez les yeux. Qui protégez-vous cette nuit ?',
}

// ═══════════════════════════════════════════════════════
// VICTOIRE
// ═══════════════════════════════════════════════════════

export const VICTORY_CONDITIONS = {
  werewolves: {
    title: 'Les Loups ont gagné',
    subtitle: 'Les collines de Grasse appartiennent aux prédateurs.',
    description: 'Les loups-garous ont dévoré suffisamment d\'habitants pour prendre le contrôle de Grasse.',
    color: '#8B1A1A',
    bgGradient: 'from-blood/40 via-night to-night',
  },
  village: {
    title: 'Grasse est sauvée !',
    subtitle: 'La lavande fleurit à nouveau.',
    description: 'Les habitants ont réussi à chasser tous les loups des collines. La paix revient sur Grasse.',
    color: '#2E5E4E',
    bgGradient: 'from-forest/40 via-night to-night',
  },
  lovers: {
    title: 'Les Amants ont gagné',
    subtitle: 'L\'amour triomphe sur les collines.',
    description: 'Seuls les deux amants ont survécu. Leur amour a vaincu la haine qui rongeait Grasse.',
    color: '#A04060',
    bgGradient: 'from-rose-900/40 via-night to-night',
  },
}

export const VOTE_DURATION_SECONDS = 60
