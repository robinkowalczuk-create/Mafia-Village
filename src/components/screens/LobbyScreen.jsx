import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { assignRoles, clearPlayerId } from '../../lib/gameUtils'
import { PHASES, ROLE_COMPOSITIONS, ROLES } from '../../lib/constants'
import { Button } from '../ui/Button'
import { sounds } from '../../lib/sounds'

// Rôles disponibles dans l'éditeur, dans l'ordre d'affichage
const EDITABLE_ROLES = [
  { id: 'villager',  label: 'Habitant',        min: 1 },
  { id: 'werewolf',  label: 'Loup-Garou',       min: 1 },
  { id: 'seer',      label: 'Voyante',          min: 0 },
  { id: 'witch',     label: 'Sorcière',         min: 0 },
  { id: 'hunter',    label: 'Chasseur',         min: 0 },
  { id: 'cupid',     label: 'Cupidon',          min: 0 },
  { id: 'bodyguard', label: 'Garde du Corps',   min: 0 },
  { id: 'littlegirl',label: 'Petite Fille',     min: 0 },
  { id: 'idiot',     label: 'Idiot du Village', min: 0 },
]

const ROLE_EMOJI = {
  villager: '🏡', werewolf: '🐺', seer: '🔮', witch: '🧪',
  hunter: '🏹', cupid: '💘', bodyguard: '🛡️', littlegirl: '👁️', idiot: '🤡',
}

function buildDefaultComposition(playerCount) {
  const base = ROLE_COMPOSITIONS[playerCount]
  if (!base) return null
  // S'assurer que tous les rôles éditables ont une valeur (0 si absent)
  const comp = {}
  for (const r of EDITABLE_ROLES) comp[r.id] = base[r.id] || 0
  return comp
}

function compositionTotal(comp) {
  return Object.values(comp).reduce((a, b) => a + b, 0)
}

function isValidComposition(comp, playerCount) {
  return (
    compositionTotal(comp) === playerCount &&
    (comp.werewolf || 0) >= 1 &&
    (comp.villager || 0) >= 1
  )
}

export function LobbyScreen({ game, currentPlayer, players = [], onPlayAgain }) {
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [composition, setComposition] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const isMJ = currentPlayer?.is_mj
  const playerCount = players.length
  const minPlayers = 2
  const maxPlayers = 12
  const isTestMode = playerCount > 0 && playerCount < 4
  const canStart = playerCount >= minPlayers && playerCount <= maxPlayers &&
    composition && isValidComposition(composition, playerCount)

  // Mettre à jour la composition par défaut quand le nombre de joueurs change
  useEffect(() => {
    if (playerCount < minPlayers || playerCount > maxPlayers) return
    const def = buildDefaultComposition(playerCount)
    if (!def) return
    // Si pas encore de compo, ou si la compo actuelle ne matche plus le count
    if (!composition || compositionTotal(composition) !== playerCount) {
      setComposition(def)
    }
  }, [playerCount])

  const resetComposition = () => {
    const def = buildDefaultComposition(playerCount)
    if (def) setComposition(def)
  }

  const adjustRole = (roleId, delta) => {
    setComposition(prev => {
      const next = { ...prev }
      const minVal = EDITABLE_ROLES.find(r => r.id === roleId)?.min ?? 0
      const newVal = Math.max(minVal, (next[roleId] || 0) + delta)
      const total = compositionTotal(next) - (next[roleId] || 0) + newVal
      if (total > playerCount) return prev // ne pas dépasser
      next[roleId] = newVal
      return next
    })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(game.code)
    setCopied(true)
    sounds.uiClick()
    setTimeout(() => setCopied(false), 2000)
  }

  const startGame = async () => {
    if (!canStart || !isMJ) return
    setStarting(true)
    sounds.phaseTransition()
    try {
      // Construire la liste des rôles depuis la composition choisie
      const roleList = []
      for (const [roleId, count] of Object.entries(composition)) {
        for (let i = 0; i < count; i++) roleList.push(roleId)
      }
      // Mélanger
      const shuffled = [...roleList].sort(() => Math.random() - 0.5)
      // Attribuer
      for (let i = 0; i < players.length; i++) {
        await supabase.from('mv_players')
          .update({ role: shuffled[i] })
          .eq('id', players[i].id)
      }
      await supabase.from('mv_games').update({
        current_phase: PHASES.ROLE_REVEAL,
        status: 'in_progress',
        phase_number: 1,
      }).eq('id', game.id)
    } catch (e) {
      console.error(e)
    } finally {
      setStarting(false)
    }
  }

  const deleteGame = async () => {
    setDeleting(true)
    await supabase.from('mv_games').delete().eq('id', game.id)
    clearPlayerId()
    onPlayAgain()
  }

  const total = composition ? compositionTotal(composition) : 0
  const remaining = playerCount - total

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="village-silhouette" />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5 overflow-y-auto">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <p className="text-parchment-dim text-xs font-body uppercase tracking-widest">Salle d'attente</p>
          <h1 className="font-display font-black text-3xl text-gold text-shadow-gold">Code de room</h1>
          <button onClick={copyCode}
            className="flex items-center gap-3 bg-slate-light border border-gold/20 rounded-2xl px-8 py-4 active:scale-95 transition-transform">
            <span className="font-display font-black text-4xl text-gold tracking-[0.3em]">{game.code}</span>
            <span className="text-parchment-dim text-xl">{copied ? '✓' : '📋'}</span>
          </button>
          <p className="text-parchment-dim text-xs">{copied ? 'Copié !' : 'Appuyez pour copier'}</p>
        </div>

        {/* Joueurs */}
        <div className="flex flex-col gap-2">
          <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
            Joueurs ({playerCount}/{maxPlayers})
          </p>
          {players.map((p, i) => (
            <div key={p.id}
              className={`card-dark flex items-center gap-3 px-4 py-3 ${p.id === currentPlayer?.id ? 'border-gold/30 bg-gold/5' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold ${p.is_mj ? 'bg-gold/20 text-gold' : 'bg-white/5 text-parchment-dim'}`}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className={`font-body font-medium ${p.id === currentPlayer?.id ? 'text-gold' : 'text-parchment'}`}>
                  {p.name}
                  {p.id === currentPlayer?.id && <span className="text-gold/60 text-xs ml-1">(toi)</span>}
                </p>
                {p.is_mj && <p className="text-xs text-gold/60 font-body">Maître du Jeu</p>}
              </div>
              <div className={`w-2 h-2 rounded-full ${p.is_mj ? 'bg-gold' : 'bg-forest'} animate-pulse`} />
            </div>
          ))}
          {playerCount < 4 && Array.from({ length: Math.max(0, 4 - playerCount) }).map((_, i) => (
            <div key={`empty-${i}`} className="card-dark flex items-center gap-3 px-4 py-3 opacity-25">
              <div className="w-9 h-9 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                <span className="text-parchment-dim text-sm">?</span>
              </div>
              <p className="text-parchment-dim text-sm font-body">En attente...</p>
            </div>
          ))}
        </div>

        {/* Mode test */}
        {isTestMode && playerCount >= minPlayers && (
          <div className="card-dark border-amber-500/20 p-3 text-center">
            <p className="text-amber-400/80 text-xs font-body">
              ⚠️ Moins de 4 joueurs — mode test uniquement.
            </p>
          </div>
        )}

        {/* ── COMPOSITION ── */}
        {isMJ && composition && playerCount >= minPlayers ? (
          <div className="card-dark p-4 flex flex-col gap-4">

            {/* Header compo */}
            <div className="flex items-center justify-between">
              <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
                Composition · {playerCount} joueurs
              </p>
              <div className="flex gap-2">
                <button onClick={resetComposition}
                  className="text-parchment-dim/50 text-xs font-body border border-white/10 rounded-lg px-2 py-1 active:opacity-60">
                  ↺ Défaut
                </button>
                <button onClick={() => setShowEditor(e => !e)}
                  className={`text-xs font-body border rounded-lg px-2 py-1 active:opacity-60 transition-colors ${
                    showEditor ? 'border-gold/40 text-gold' : 'border-white/10 text-parchment-dim/50'
                  }`}>
                  {showEditor ? '✓ Fermer' : '✏️ Modifier'}
                </button>
              </div>
            </div>

            {/* Résumé compact (toujours visible) */}
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.filter(r => (composition[r.id] || 0) > 0).map(r => (
                <div key={r.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body border ${
                    r.id === 'werewolf' ? 'bg-blood/15 border-blood/30 text-blood-light' : 'bg-white/5 border-white/10 text-parchment-dim'
                  }`}>
                  <span>{ROLE_EMOJI[r.id]}</span>
                  <span className="font-bold">{composition[r.id]}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            {/* Compteur total */}
            <div className={`flex items-center justify-between text-xs font-body px-1 ${
              remaining !== 0 ? 'text-amber-400' : 'text-forest-light'
            }`}>
              <span>Total attribué : {total} / {playerCount}</span>
              {remaining > 0 && <span>+{remaining} à distribuer</span>}
              {remaining < 0 && <span>{remaining} en trop</span>}
              {remaining === 0 && <span>✓ Prêt</span>}
            </div>

            {/* Éditeur (dépliable) */}
            {showEditor && (
              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 animate-fade-up">
                <p className="text-parchment-dim text-xs font-body text-center">
                  Min. 1 loup · Min. 1 habitant · Total = {playerCount} joueurs
                </p>
                {EDITABLE_ROLES.map(r => {
                  const count = composition[r.id] || 0
                  const isWolf = r.id === 'werewolf'
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">{ROLE_EMOJI[r.id]}</span>
                      <span className={`flex-1 font-body text-sm ${count > 0 ? 'text-parchment' : 'text-parchment-dim/50'}`}>
                        {r.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => adjustRole(r.id, -1)}
                          disabled={count <= r.min}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-parchment-dim text-lg font-bold active:bg-white/10 disabled:opacity-20"
                        >−</button>
                        <span className={`w-6 text-center font-display font-bold text-base ${
                          isWolf && count > 0 ? 'text-blood-light' : count > 0 ? 'text-gold' : 'text-parchment-dim/30'
                        }`}>{count}</span>
                        <button
                          onClick={() => adjustRole(r.id, 1)}
                          disabled={total >= playerCount}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-parchment-dim text-lg font-bold active:bg-white/10 disabled:opacity-20"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : !isMJ && composition && playerCount >= minPlayers ? (
          /* Vue joueur — composition en lecture seule */
          <div className="card-dark p-4">
            <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mb-3">
              Composition
            </p>
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.filter(r => (composition[r.id] || 0) > 0).map(r => (
                <div key={r.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body bg-white/5 border border-white/10 text-parchment-dim">
                  <span>{ROLE_EMOJI[r.id]}</span>
                  <span className="font-bold">{composition[r.id]}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Actions MJ */}
        {isMJ ? (
          <div className="flex flex-col gap-3">
            {/* Alerte composition invalide */}
            {composition && !isValidComposition(composition, playerCount) && playerCount >= minPlayers && (
              <div className="card-dark border-amber-500/20 p-3 text-center">
                <p className="text-amber-400 text-xs font-body">
                  {remaining > 0
                    ? `Attribuez encore ${remaining} rôle${remaining > 1 ? 's' : ''}`
                    : remaining < 0
                    ? `Retirez ${Math.abs(remaining)} rôle${Math.abs(remaining) > 1 ? 's' : ''}`
                    : 'Min. 1 loup et 1 habitant requis'
                  }
                </p>
              </div>
            )}

            <Button variant="primary" className="w-full text-base py-5"
              disabled={!canStart || starting} onClick={startGame} icon="⚔️">
              {starting ? 'Démarrage...' : canStart ? 'Lancer la partie' : `Attente (min. ${minPlayers})`}
            </Button>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="text-parchment-dim/40 text-xs font-body text-center py-2 active:opacity-60 hover:text-blood-light transition-colors">
                🗑 Supprimer la partie
              </button>
            ) : (
              <div className="card-dark border-blood/30 p-4 flex flex-col gap-3 animate-fade-up">
                <p className="text-blood-light text-sm font-body text-center">
                  Supprimer définitivement cette partie ?
                </p>
                <div className="flex gap-3">
                  <button onClick={deleteGame} disabled={deleting}
                    className="btn-danger flex-1 text-sm py-3 disabled:opacity-40">
                    {deleting ? 'Suppression...' : '🗑 Confirmer'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1 text-sm py-3">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card-dark p-4 text-center">
            <p className="text-parchment-dim text-sm font-body">⏳ En attente du Maître du Jeu...</p>
          </div>
        )}
      </div>
    </div>
  )
}
