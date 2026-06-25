// ═══════════════════════════════════════════════════════
// NARRATEUR VOCAL — Web Speech API
// Voix grave et lente pour guider les phases de nuit
// ═══════════════════════════════════════════════════════

class Narrator {
  constructor() {
    this.enabled = true
    this.synth = window.speechSynthesis
    this.voice = null
    this._initVoice()
  }

  _initVoice() {
    const setVoice = () => {
      const voices = this.synth.getVoices()
      // Priorité : voix française grave
      const preferred = [
        'Thomas',         // macOS French male
        'French (France)', 
        'fr-FR',
        'fr_FR',
      ]
      for (const name of preferred) {
        const found = voices.find(v => v.name.includes(name) || v.lang.includes('fr'))
        if (found) { this.voice = found; break }
      }
      // Fallback : première voix disponible
      if (!this.voice && voices.length) this.voice = voices[0]
    }

    if (this.synth.getVoices().length) {
      setVoice()
    } else {
      this.synth.addEventListener('voiceschanged', setVoice, { once: true })
    }
  }

  // Parle un texte — retourne une Promise qui se résout quand c'est fini
  speak(text, { rate = 0.82, pitch = 0.75, volume = 1, pauseAfter = 800 } = {}) {
    if (!this.enabled || !this.synth) return Promise.resolve()

    return new Promise((resolve) => {
      this.synth.cancel() // Annule tout discours en cours

      const utterance = new SpeechSynthesisUtterance(text)
      if (this.voice) utterance.voice = this.voice
      utterance.lang = 'fr-FR'
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume

      utterance.onend = () => setTimeout(resolve, pauseAfter)
      utterance.onerror = () => resolve()

      this.synth.speak(utterance)
    })
  }

  stop() {
    this.synth?.cancel()
  }

  toggle() {
    this.enabled = !this.enabled
    if (!this.enabled) this.stop()
    return this.enabled
  }

  // ═══════════════════════════════════════════════════
  // SCRIPTS NARRATIFS PAR RÔLE
  // ═══════════════════════════════════════════════════

  async nightFall() {
    await this.speak(
      'La nuit tombe sur le village. Tout le monde ferme les yeux.',
      { rate: 0.78, pitch: 0.7, pauseAfter: 1200 }
    )
  }

  async wakeRole(roleName, instruction) {
    await this.speak(`${roleName}... ouvre les yeux.`, { rate: 0.8, pitch: 0.72, pauseAfter: 600 })
    if (instruction) {
      await this.speak(instruction, { rate: 0.85, pitch: 0.78, pauseAfter: 400 })
    }
  }

  async sleepRole(roleName) {
    await this.speak(`${roleName}... rendors-toi.`, { rate: 0.8, pitch: 0.72, pauseAfter: 1000 })
  }

  async dawn() {
    await this.speak(
      'Tout le monde ouvre les yeux. Le jour se lève sur le village.',
      { rate: 0.82, pitch: 0.78, pauseAfter: 800 }
    )
  }

  async voteCall() {
    await this.speak(
      'Le village doit désigner un coupable. Que le vote commence.',
      { rate: 0.82, pitch: 0.75, pauseAfter: 600 }
    )
  }

  async eliminationCall(name) {
    await this.speak(
      `${name} est éliminé du village.`,
      { rate: 0.78, pitch: 0.7, pauseAfter: 1000 }
    )
  }

  async noElimination() {
    await this.speak(
      'Le village ne s\'est pas mis d\'accord. Personne n\'est éliminé.',
      { rate: 0.82, pitch: 0.75, pauseAfter: 800 }
    )
  }
}

export const narrator = new Narrator()

// ═══════════════════════════════════════════════════════
// SCRIPTS NOCTURNES PAR RÔLE (dans l'ordre d'éveil)
// ═══════════════════════════════════════════════════════

export const NIGHT_SCRIPTS = {
  cupid: {
    wake: 'Cupidon',
    instruction: 'Désigne les deux amants.',
    sleep: 'Cupidon',
  },
  seer: {
    wake: 'La Voyante',
    instruction: 'Désigne un joueur pour connaître sa nature.',
    sleep: 'La Voyante',
  },
  bodyguard: {
    wake: 'Le Garde du Corps',
    instruction: 'Choisis qui tu protèges cette nuit.',
    sleep: 'Le Garde du Corps',
  },
  werewolf: {
    wake: 'Les Loups-Garous',
    instruction: 'Désignez votre victime.',
    sleep: 'Les Loups-Garous',
  },
  littlegirl: {
    wake: null, // La petite fille ne se réveille pas officiellement
    instruction: null,
    sleep: null,
  },
  witch: {
    wake: 'La Sorcière',
    instruction: 'Utilise tes potions si tu le souhaites.',
    sleep: 'La Sorcière',
  },
}

// Ordre d'éveil (wakeOrder de constants.js)
export const WAKE_ORDER = ['cupid', 'seer', 'bodyguard', 'werewolf', 'witch']
