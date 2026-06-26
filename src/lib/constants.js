// ═══════════════════════════════════════════════════════
// RÔLES
// ═══════════════════════════════════════════════════════

export const ROLES = {
  villager: {
    id: 'villager',
    name: 'Villageois',
    camp: 'village',
    emoji: '🏡',
    image: '/villager.jpg',  
    color: '#2E5E4E',
    colorLight: '#3D7A64',
    bgGradient: 'from-forest/30 to-night',
    description: 'Âme simple du village. Votre seule arme : votre flair lors des votes du jour.',
    nightAction: null,
    wakeOrder: null,
    powers: [],
  },
  werewolf: {
    id: 'werewolf',
    name: 'Loup-Garou',
    camp: 'werewolves',
    emoji: '🐺',
    color: '#8B1A1A',
    colorLight: '#B02020',
    bgGradient: 'from-blood/30 to-night',
    description: 'Prédateur de la nuit. Vous vous réveillez avec vos frères pour dévorer un villageois.',
    nightAction: 'werewolf_kill',
    wakeOrder: 3,
    powers: ['Choisir une victime chaque nuit (consensus avec les autres loups)'],
  },
  seer: {
    id: 'seer',
    name: 'Voyante',
    camp: 'village',
    emoji: '🔮',
    color: '#6B4FA0',
    colorLight: '#8B6FC0',
    bgGradient: 'from-purple-900/30 to-night',
    description: 'Vous percez les ténèbres. Chaque nuit, révélez la véritable nature d\'un joueur.',
    nightAction: 'seer_inspect',
    wakeOrder: 1,
    powers: ['Inspecter un joueur par nuit', 'Connaître son camp (village ou loups)'],
  },
  witch: {
    id: 'witch',
    name: 'Sorcière',
    camp: 'village',
    emoji: '🧪',
    color: '#4A7A8A',
    colorLight: '#5A9AAA',
    bgGradient: 'from-teal-900/30 to-night',
    description: 'Deux philtres, deux destins. Guérissez une victime ou empoisonnez un suspect — chaque potion, une seule fois.',
    nightAction: 'witch_action',
    wakeOrder: 4,
    powers: ['Potion de vie : ressusciter la victime de la nuit (1 fois)', 'Potion de mort : éliminer n\'importe qui (1 fois)'],
  },
  hunter: {
    id: 'hunter',
    name: 'Chasseur',
    camp: 'village',
    emoji: '🏹',
    color: '#7A5A2A',
    colorLight: '#9A7A3A',
    bgGradient: 'from-amber-900/30 to-night',
    description: 'La mort ne vous prend pas seul. Si vous tombez, vous emportez un ennemi dans la tombe.',
    nightAction: null,
    wakeOrder: null,
    powers: ['À l\'élimination : choisir un joueur à éliminer avec vous'],
  },
  cupid: {
    id: 'cupid',
    name: 'Cupidon',
    camp: 'village',
    emoji: '💘',
    color: '#A04060',
    colorLight: '#C05070',
    bgGradient: 'from-rose-900/30 to-night',
    description: 'La première nuit, liez deux cœurs. Les amants vivent et meurent ensemble.',
    nightAction: 'cupid_link',
    wakeOrder: 0,
    powers: ['Nuit 1 uniquement : désigner deux amants', 'Si l\'un meurt, l\'autre meurt de chagrin'],
  },
  littlegirl: {
    id: 'littlegirl',
    name: 'Petite Fille',
    camp: 'village',
    emoji: '👁️',
    color: '#8A6A3A',
    colorLight: '#AA8A5A',
    bgGradient: 'from-yellow-900/30 to-night',
    description: 'Vous osez espionner les loups la nuit. Risqué, mais précieux si vous survivez.',
    nightAction: 'spy',
    wakeOrder: 3.5,
    powers: ['Peut "jeter un œil" pendant la nuit des loups', 'Si surprise par les loups, elle est éliminée à leur place'],
  },
  thief: {
    id: 'thief',
    name: 'Voleur',
    camp: 'village',
    emoji: '🃏',
    color: '#3A5A7A',
    colorLight: '#5A7A9A',
    bgGradient: 'from-blue-900/30 to-night',
    description: 'Avant la partie, choisissez votre vrai rôle parmi deux cartes supplémentaires.',
    nightAction: 'thief_steal',
    wakeOrder: -1,
    powers: ['Avant la 1ère nuit : choisir l\'un des 2 rôles non distribués'],
  },
  idiot: {
    id: 'idiot',
    name: 'Idiot du Village',
    camp: 'village',
    emoji: '🤡',
    color: '#2E5E4E',
    colorLight: '#3D7A64',
    bgGradient: 'from-forest/20 to-night',
    description: 'Si le village vous élimine, vous survivez... mais perdez votre droit de vote.',
    nightAction: null,
    wakeOrder: null,
    powers: ['Survive au premier vote d\'élimination', 'Perd définitivement le droit de vote après'],
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Garde du Corps',
    camp: 'village',
    emoji: '🛡️',
    color: '#4A4A8A',
    colorLight: '#6A6AAA',
    bgGradient: 'from-indigo-900/30 to-night',
    description: 'Chaque nuit, protégez un joueur des loups. Mais jamais deux fois de suite la même personne.',
    nightAction: 'bodyguard_protect',
    wakeOrder: 2,
    powers: ['Protéger un joueur par nuit', 'Ne peut pas protéger la même personne deux nuits consécutives'],
  },
}

// ═══════════════════════════════════════════════════════
// COMPOSITION PAR NOMBRE DE JOUEURS (4–12)
// ═══════════════════════════════════════════════════════
// Format: { role: count }
// Le Voleur nécessite toujours +2 cartes dans le deck

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

// Ordre des phases en jeu
export const PHASE_FLOW = [
  PHASES.NIGHT,
  PHASES.NIGHT_RESOLUTION,
  PHASES.DAY,
  PHASES.VOTE,
  PHASES.ELIMINATION,
]

// ═══════════════════════════════════════════════════════
// TEXTES NARRATIFS PAR PHASE
// ═══════════════════════════════════════════════════════

export const PHASE_NARRATIVES = {
  [PHASES.NIGHT]: {
    title: 'La Nuit tombe',
    subtitle: 'Le village s\'endort...',
    atmosphere: 'Des ombres glissent entre les maisons. Personne ne sait ce qui rôde dans les ténèbres.',
    bgColor: '#0A0A14',
    accentColor: '#C8A96E',
  },
  [PHASES.NIGHT_RESOLUTION]: {
    title: 'L\'Aube se lève',
    subtitle: 'Le village s\'éveille...',
    atmosphere: 'Les habitants sortent de leurs maisons, le cœur serré. La nuit a-t-elle frappé ?',
    bgColor: '#1A1020',
    accentColor: '#C8A96E',
  },
  [PHASES.DAY]: {
    title: 'Le Jour se lève',
    subtitle: 'Débattez, accusez, défendez-vous.',
    atmosphere: 'La vérité se cache parmi vous. Qui ment ? Qui protège un loup ?',
    bgColor: '#0A1A14',
    accentColor: '#C8A96E',
  },
  [PHASES.VOTE]: {
    title: 'L\'Heure du Jugement',
    subtitle: 'Désignez le coupable.',
    atmosphere: 'Le village doit parler d\'une seule voix. Votez.',
    bgColor: '#1A0A0A',
    accentColor: '#8B1A1A',
  },
  [PHASES.ELIMINATION]: {
    title: 'L\'Élimination',
    subtitle: 'La foule a décidé.',
    atmosphere: 'Une âme quitte le village. Était-ce le bon choix ?',
    bgColor: '#0A0A14',
    accentColor: '#8B1A1A',
  },
}

// ═══════════════════════════════════════════════════════
// MESSAGES RÔLE × PHASE (ce que chaque rôle voit)
// ═══════════════════════════════════════════════════════

export const ROLE_NIGHT_INSTRUCTIONS = {
  villager:  'Fermez les yeux et attendez. Le village a besoin de vous demain.',
  werewolf:  'Ouvrez les yeux, loups. Désignez votre victime cette nuit.',
  seer:      'Ouvrez les yeux. Choisissez un joueur à inspecter.',
  witch:     'Ouvrez les yeux. Utilisez vos potions si vous le souhaitez.',
  hunter:    'Fermez les yeux. Votre pouvoir s\'active à votre mort.',
  cupid:     'Ouvrez les yeux. Désignez les deux amants.',
  littlegirl:'Vous pouvez espionner les loups... mais attention.',
  thief:     'Choisissez votre rôle parmi les deux cartes disponibles.',
  idiot:     'Fermez les yeux. Votre protection vient en plein jour.',
  bodyguard: 'Ouvrez les yeux. Choisissez qui vous protégez cette nuit.',
}

// ═══════════════════════════════════════════════════════
// VICTOIRE
// ═══════════════════════════════════════════════════════

export const VICTORY_CONDITIONS = {
  werewolves: {
    title: 'Les Loups ont gagné',
    subtitle: 'L\'obscurité règne sur le village.',
    description: 'Les loups-garous ont dévoré suffisamment de villageois pour prendre le contrôle.',
    color: '#8B1A1A',
    bgGradient: 'from-blood/40 via-night to-night',
  },
  village: {
    title: 'Le Village a gagné',
    subtitle: 'La lumière triomphe.',
    description: 'Les villageois ont réussi à éliminer tous les loups-garous. La paix revient.',
    color: '#2E5E4E',
    bgGradient: 'from-forest/40 via-night to-night',
  },
  lovers: {
    title: 'Les Amants ont gagné',
    subtitle: 'L\'amour transcende tout.',
    description: 'Seuls les deux amants ont survécu. Leur amour a vaincu la haine.',
    color: '#A04060',
    bgGradient: 'from-rose-900/40 via-night to-night',
  },
}

export const VOTE_DURATION_SECONDS = 60
