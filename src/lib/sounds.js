// ═══════════════════════════════════════════════════════
// SOUND MANAGER — Web Audio API
// Sons atmosphériques générés procéduralement (pas de fichiers externes)
// ═══════════════════════════════════════════════════════

class SoundManager {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.vibrationsEnabled = true
    this._init()
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      this.enabled = false
    }
  }

  _resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume()
  }

  // ── Vibration ──
  vibrate(pattern = [100]) {
    if (!this.vibrationsEnabled) return
    if (navigator.vibrate) navigator.vibrate(pattern)
  }

  // ── Oscillateur de base ──
  _osc(type, freq, duration, volume = 0.3, startTime = 0) {
    if (!this.ctx || !this.enabled) return
    this._resume()
    const t = this.ctx.currentTime + startTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + duration)
  }

  // ── Bruit filtré ──
  _noise(duration, freq = 400, volume = 0.1, startTime = 0) {
    if (!this.ctx || !this.enabled) return
    this._resume()
    const t = this.ctx.currentTime + startTime
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const source = this.ctx.createBufferSource()
    source.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 0.5

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)
    source.start(t)
    source.stop(t + duration)
  }

  // ═══════════════════════════════════════════════════
  // SONS THÉMATIQUES
  // ═══════════════════════════════════════════════════

  // Transition vers la nuit — cloche grave + réverbération
  nightFall() {
    this._osc('sine', 110, 3.0, 0.15)
    this._osc('sine', 55, 4.0, 0.1, 0.2)
    this._osc('sine', 82.5, 2.5, 0.08, 0.5)
    this._noise(2.5, 200, 0.05, 0.1)
    this.vibrate([50, 100, 50])
  }

  // Révélation de rôle — crescendo mystique
  roleReveal() {
    this._osc('sine', 261, 0.3, 0.1)
    this._osc('sine', 329, 0.3, 0.12, 0.15)
    this._osc('sine', 392, 0.3, 0.15, 0.3)
    this._osc('sine', 523, 0.8, 0.25, 0.5)
    this._osc('triangle', 1046, 0.3, 0.15, 0.5)
    this.vibrate([30, 50, 200])
  }

  // Révélation loup — grave et menaçant
  wolfReveal() {
    this._osc('sawtooth', 55, 0.5, 0.08)
    this._osc('sine', 110, 1.5, 0.12)
    this._osc('sine', 82, 2.0, 0.1, 0.3)
    this._noise(1.0, 150, 0.08)
    this.vibrate([200, 100, 200, 100, 200])
  }

  // Vote ouvert — cloche d'appel
  voteStart() {
    this._osc('triangle', 440, 0.4, 0.15)
    this._osc('triangle', 550, 0.3, 0.12, 0.1)
    this._osc('sine', 660, 0.5, 0.2, 0.25)
    this.vibrate([100, 50, 100])
  }

  // Vote enregistré — tic discret
  voteCast() {
    this._osc('sine', 800, 0.15, 0.08)
    this._osc('sine', 1000, 0.1, 0.06, 0.08)
    this.vibrate([30])
  }

  // Élimination — coup de gong dramatique
  elimination() {
    this._osc('sine', 80, 3.0, 0.2)
    this._osc('sine', 60, 3.5, 0.15, 0.1)
    this._noise(2.0, 300, 0.12)
    this._osc('sawtooth', 40, 2.0, 0.08, 0.5)
    this.vibrate([50, 50, 50, 50, 400])
  }

  // Victoire village — fanfare lumineuse
  villageVictory() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      this._osc('triangle', freq, 0.5, 0.15, i * 0.15)
      this._osc('sine', freq * 1.5, 0.3, 0.4, i * 0.15 + 0.1)
    })
    this.vibrate([100, 50, 100, 50, 100])
  }

  // Victoire loups — accord sombre et triomphant
  wolvesVictory() {
    this._osc('sawtooth', 55, 2.0, 0.15)
    this._osc('sine', 82, 2.5, 0.12, 0.1)
    this._osc('sine', 110, 2.0, 0.1, 0.3)
    this._noise(2.0, 200, 0.1)
    this.vibrate([200, 100, 200, 100, 500])
  }

  // Compte à rebours — tic pressant
  countdownTick(secondsLeft) {
    if (secondsLeft <= 10) {
      const freq = 600 + (10 - secondsLeft) * 40
      this._osc('square', freq, 0.05, 0.04)
      if (secondsLeft <= 5) this.vibrate([20])
    }
  }

  // Voyante — inspection mystique
  seerInspect() {
    this._osc('sine', 396, 0.4, 0.3, 0)
    this._osc('sine', 528, 0.3, 0.4, 0.2)
    this._osc('sine', 432, 0.2, 0.5, 0.4)
    this.vibrate([50, 100])
  }

  // Sorcière — philtres
  witchPotion() {
    this._osc('triangle', 330, 0.2, 0.15)
    this._osc('triangle', 415, 0.15, 0.12, 0.1)
    this._noise(0.3, 600, 0.06, 0.1)
    this.vibrate([100])
  }

  // Transition de phase générique
  phaseTransition() {
    this._osc('sine', 220, 0.5, 0.1)
    this._osc('sine', 330, 0.4, 0.1, 0.15)
    this.vibrate([50, 50])
  }

  // Clic UI
  uiClick() {
    this._osc('sine', 600, 0.08, 0.04)
    this.vibrate([10])
  }

  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }

  toggleVibrations() {
    this.vibrationsEnabled = !this.vibrationsEnabled
    return this.vibrationsEnabled
  }
}

export const sounds = new SoundManager()
