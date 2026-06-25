import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generateRoomCode, getOrCreatePlayerId } from '../../lib/gameUtils'
import { Button } from '../ui/Button'
import { sounds } from '../../lib/sounds'

export function HomeScreen({ onJoined }) {
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return setError('Entre ton prénom')
    setLoading(true)
    setError('')

    const roomCode = generateRoomCode()
    const playerId = getOrCreatePlayerId()

    // Créer la partie
    const { data: game, error: gameErr } = await supabase
      .from('mv_games')
      .insert({ code: roomCode, status: 'lobby', current_phase: 'lobby', phase_number: 0 })
      .select()
      .single()

    if (gameErr) { setError('Erreur lors de la création.'); setLoading(false); return }

    // Rejoindre comme MJ
    const { data: player, error: playerErr } = await supabase
      .from('mv_players')
      .insert({ id: playerId, game_id: game.id, name: name.trim(), is_mj: true })
      .select()
      .single()

    if (playerErr) { setError('Erreur lors de la création.'); setLoading(false); return }

    sessionStorage.setItem('mafia_game_code', roomCode)
    sounds.phaseTransition()
    onJoined({ game, player })
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Entre ton prénom')
    if (code.trim().length !== 4) return setError('Code de 4 lettres requis')
    setLoading(true)
    setError('')

    const playerId = getOrCreatePlayerId()
    const upperCode = code.trim().toUpperCase()

    // Trouver la partie
    const { data: game, error: gameErr } = await supabase
      .from('mv_games')
      .select('*')
      .eq('code', upperCode)
      .single()

    if (gameErr || !game) { setError('Code invalide ou partie introuvable.'); setLoading(false); return }
    if (game.status !== 'lobby') { setError('Cette partie est déjà en cours.'); setLoading(false); return }

    // Vérifier si déjà dans la partie
    const { data: existing } = await supabase
      .from('mv_players')
      .select('*')
      .eq('id', playerId)
      .eq('game_id', game.id)
      .single()

    if (existing) {
      sessionStorage.setItem('mafia_game_code', upperCode)
      onJoined({ game, player: existing })
      return
    }

    // Ajouter le joueur
    const { data: player, error: playerErr } = await supabase
      .from('mv_players')
      .insert({ id: playerId, game_id: game.id, name: name.trim(), is_mj: false })
      .select()
      .single()

    if (playerErr) { setError('Impossible de rejoindre. Réessaie.'); setLoading(false); return }

    sessionStorage.setItem('mafia_game_code', upperCode)
    sounds.phaseTransition()
    onJoined({ game, player })
  }

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="village-silhouette" />
      <div className="fog-layer" />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-12 gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 animate-moon-rise">
          <div className="text-7xl animate-float">🌕</div>
          <h1 className="font-display font-black text-4xl text-gold text-shadow-gold tracking-wider">
            Mafia<br />
            <span className="text-parchment/60 text-2xl font-normal tracking-widest">Village</span>
          </h1>
          <div className="flex items-center gap-3 w-48">
            <div className="flex-1 h-px bg-gold/20" />
            <span className="text-gold/40 text-xs">✦</span>
            <div className="flex-1 h-px bg-gold/20" />
          </div>
          <p className="text-parchment-dim text-xs font-body tracking-widest uppercase text-center">
            4 à 12 joueurs · Loup-Garou digital
          </p>
        </div>

        {/* Main card */}
        {!mode ? (
          <div className="w-full max-w-sm flex flex-col gap-4 animate-fade-up">
            <Button
              variant="primary"
              className="w-full text-base py-5"
              icon="🏰"
              onClick={() => setMode('create')}
            >
              Créer une partie
            </Button>
            <Button
              variant="ghost"
              className="w-full text-base py-5"
              icon="🚪"
              onClick={() => setMode('join')}
            >
              Rejoindre une partie
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm card-dark p-6 flex flex-col gap-5 animate-fade-up">
            <button
              onClick={() => { setMode(null); setError('') }}
              className="self-start text-parchment-dim text-sm flex items-center gap-1 active:opacity-60"
            >
              ← Retour
            </button>

            <h2 className="font-display text-xl text-gold tracking-wide">
              {mode === 'create' ? '🏰 Nouvelle partie' : '🚪 Rejoindre'}
            </h2>

            <div className="flex flex-col gap-3">
              <input
                className="input-dark"
                placeholder="Ton prénom"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />

              {mode === 'join' && (
                <input
                  className="input-dark uppercase tracking-[0.3em] text-center text-xl font-display"
                  placeholder="CODE"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
                  maxLength={4}
                  autoComplete="off"
                />
              )}
            </div>

            {error && (
              <p className="text-blood-light text-sm font-body text-center animate-shake">
                {error}
              </p>
            )}

            <Button
              variant="primary"
              className="w-full"
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? 'Chargement...' : mode === 'create' ? 'Créer' : 'Rejoindre'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
