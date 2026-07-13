import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { clearPlayerId } from '../../lib/gameUtils'
import { PHASES, ROLE_COMPOSITIONS, ROLES } from '../../lib/constants'
import { Button } from '../ui/Button'
import { sounds } from '../../lib/sounds'

const EDITABLE_ROLES = [
  { id: 'villager',   label: 'Habitant',        min: 1 },
  { id: 'werewolf',   label: 'Loup-Garou',       min: 1 },
  { id: 'seer',       label: 'Voyante',          min: 0 },
  { id: 'witch',      label: 'Sorcière',         min: 0 },
  { id: 'hunter',     label: 'Chasseur',         min: 0 },
  { id: 'cupid',      label: 'Cupidon',          min: 0 },
  { id: 'bodyguard',  label: 'Garde du Corps',   min: 0 },
  { id: 'littlegirl', label: 'Petite Fille',     min: 0 },
  { id: 'idiot',      label: 'Idiot du Village', min: 0 },
  { id: 'thief',      label: 'Voleur',           min: 0, max: 1 },
]

const BONUS_ROLES = EDITABLE_ROLES.filter(r => r.id !== 'thief')

const ROLE_EMOJI = {
  villager: '🏡', werewolf: '🐺', seer: '🔮', witch: '🧪',
  hunter: '🏹', cupid: '💘', bodyguard: '🛡️', littlegirl: '👁️',
  idiot: '🤡', thief: '🃏',
}

function buildDefaultComposition(playerCount) {
  const base = ROLE_COMPOSITIONS[playerCount]
  if (!base) return null
  const comp = {}
  for (const r of EDITABLE_ROLES) comp[r.id] = base[r.id] || 0
  return comp
}

function compositionTotal(comp) {
  return Object.values(comp).reduce((a, b) => a + b, 0)
}

function hasThief(comp) { return (comp?.thief || 0) > 0 }

function targetTotal(comp, playerCount) {
  return playerCount + (hasThief(comp) ? 2 : 0)
}

function isValidComposition(comp, playerCount) {
  if (!comp) return false
  return (
    compositionTotal(comp) === targetTotal(comp, playerCount) &&
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
  const [bonusCards, setBonusCards] = useState(['villager', 'villager'])
  const [showBonusEditor, setShowBonusEditor] = useState(false)

  const isMJ = currentPlayer?.is_mj
  const playerCount = players.length
  const minPlayers = 2
  const maxPlayers = 12
  const isTestMode = playerCount > 0 && playerCount < 4
  const thiefInGame = hasThief(composition)
  const target = composition ? targetTotal(composition, playerCount) : playerCount
  const total = composition ? compositionTotal(composition) : 0
  const remaining = target - total
  const canStart = playerCount >= minPlayers && playerCount <= maxPlayers &&
    composition && isValidComposition(composition, playerCount)

  useEffect(() => {
    if (playerCount < minPlayers || playerCount > maxPlayers) return
    const def = buildDefaultComposition(playerCount)
    if (!def) return
    if (!composition || compositionTotal(composition) !== playerCount) {
      setComposition(def)
    }
  }, [playerCount])

  const resetComposition = () => {
    const def = buildDefaultComposition(playerCount)
    if (def) setComposition(def)
    setBonusCards(['villager', 'villager'])
  }

  const adjustRole = (roleId, delta) => {
    setComposition(prev => {
      const next = { ...prev }
      const r = EDITABLE_ROLES.find(r => r.id === roleId)
      const minVal = r?.min ?? 0
      const maxVal = r?.max ?? 99
      const newVal = Math.max(minVal, Math.min(maxVal, (next[roleId] || 0) + delta))
      const newComp = { ...next, [roleId]: newVal }
      const newTotal = compositionTotal(newComp)
      const newTarget = targetTotal(newComp, playerCount)
      if (newTotal > newTarget) return prev
      return newComp
    })
  }

  const setBonusCard = (index, roleId) => {
    setBonusCards(prev => { const n = [...prev]; n[index] = roleId; return n })
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
    try {
      const roleList = []
      for (const [roleId, count] of Object.entries(composition)) {
        for (let i = 0; i < count; i++) roleList.push(roleId)
      }
      const shuffled = [...roleList].sort(() => Math.random() - 0.5)
      for (let i = 0; i < players.length; i++) {
        await supabase.from('mv_players')
          .update({ role: shuffled[i] })
          .eq('id', players[i].id)
      }
      await supabase.from('mv_games').update({
        current_phase: thiefInGame ? PHASES.THIEF_TURN : PHASES.ROLE_REVEAL,
        status: 'in_progress',
        phase_number: 1,
        thief_bonus_cards: thiefInGame ? bonusCards : null,
      }).eq('id', game.id)
    } catch (e) { console.error(e) }
    finally { setStarting(false) }
  }

  const deleteGame = async () => {
    setDeleting(true)
    await supabase.from('mv_games').delete().eq('id', game.id)
    clearPlayerId()
    onPlayAgain()
  }

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
          {players.map((p) => (
            <div key={p.id}
              className={`card-dark flex items-center gap-3 px-4 py-3 ${p.id === currentPlayer?.id ? 'border-gold/30 bg-gold/5' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold ${p.is_mj ? 'bg-gold/20 text-gold' : 'bg-white/5 text-parchment-dim'}`}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className={`font-body font-medium ${p.id === currentPlayer?.id ? 'text-gold' : 'text-parchment'}`}>
                  {p.name}{p.id === currentPlayer?.id && <span className="text-gold/60 text-xs ml-1">(toi)</span>}
                </p>
                {p.is_mj && <p className="text-xs text-gold/60 font-body">Maître du Jeu</p>}
              </div>
              <div className={`w-2 h-2 rounded-full ${p.is_mj ? 'bg-gold' : 'bg-forest'} animate-pulse`} />
            </div>
          ))}
          {playerCount < 4 && Array.from({ length: Math.max(0, 4 - playerCount) }).map((_, i) => (
            <div key={i} className="card-dark flex items-center gap-3 px-4 py-3 opacity-25">
              <div className="w-9 h-9 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                <span className="text-parchment-dim text-sm">?</span>
              </div>
              <p className="text-parchment-dim text-sm font-body">En attente...</p>
            </div>
          ))}
        </div>

        {isTestMode && playerCount >= minPlayers && (
          <div className="card-dark border-amber-500/20 p-3 text-center">
            <p className="text-amber-400/80 text-xs font-body">⚠️ Moins de 4 joueurs — mode test.</p>
          </div>
        )}

        {/* Composition */}
        {composition && playerCount >= minPlayers && (
          <div className="card-dark p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-parchment-dim text-xs uppercase tracking-wider font-body">
                Composition · {playerCount} joueurs{thiefInGame && <span className="text-blue-300/60"> +2 bonus</span>}
              </p>
              {isMJ && (
                <div className="flex gap-2">
                  <button onClick={resetComposition}
                    className="text-parchment-dim/50 text-xs font-body border border-white/10 rounded-lg px-2 py-1 active:opacity-60">↺</button>
                  <button onClick={() => setShowEditor(e => !e)}
                    className={`text-xs font-body border rounded-lg px-2 py-1 active:opacity-60 ${showEditor ? 'border-gold/40 text-gold' : 'border-white/10 text-parchment-dim/50'}`}>
                    {showEditor ? '✓ Fermer' : '✏️ Modifier'}
                  </button>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.filter(r => (composition[r.id] || 0) > 0).map(r => (
                <div key={r.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body border ${
                    r.id === 'werewolf' ? 'bg-blood/15 border-blood/30 text-blood-light'
                    : r.id === 'thief' ? 'bg-blue-900/20 border-blue-500/30 text-blue-300'
                    : 'bg-white/5 border-white/10 text-parchment-dim'
                  }`}>
                  <span>{ROLE_EMOJI[r.id]}</span>
                  <span className="font-bold">{composition[r.id]}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            {/* Compteur */}
            {isMJ && (
              <div className={`text-xs font-body flex justify-between ${remaining !== 0 ? 'text-amber-400' : 'text-forest-light'}`}>
                <span>Total : {total} / {target}{thiefInGame && ' (joueurs + 2 bonus)'}</span>
                {remaining > 0 && <span>+{remaining} à distribuer</span>}
                {remaining < 0 && <span>{Math.abs(remaining)} en trop</span>}
                {remaining === 0 && <span>✓</span>}
              </div>
            )}

            {/* Éditeur rôles */}
            {isMJ && showEditor && (
              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 animate-fade-up">
                <p className="text-parchment-dim text-xs font-body text-center">
                  Min. 1 loup · Min. 1 habitant · Total = {target}{thiefInGame && ' (joueurs + 2 bonus Voleur)'}
                </p>
                {EDITABLE_ROLES.map(r => {
                  const count = composition[r.id] || 0
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">{ROLE_EMOJI[r.id]}</span>
                      <div className="flex-1">
                        <span className={`font-body text-sm ${count > 0 ? 'text-parchment' : 'text-parchment-dim/50'}`}>
                          {r.label}
                        </span>
                        {r.id === 'thief' && count > 0 && (
                          <p className="text-blue-300/60 text-xs font-body">Nécessite +2 cartes bonus</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => adjustRole(r.id, -1)} disabled={count <= (r.min ?? 0)}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold active:bg-white/10 disabled:opacity-20">−</button>
                        <span className={`w-6 text-center font-display font-bold ${
                          r.id === 'werewolf' && count > 0 ? 'text-blood-light'
                          : r.id === 'thief' && count > 0 ? 'text-blue-300'
                          : count > 0 ? 'text-gold' : 'text-parchment-dim/30'
                        }`}>{count}</span>
                        <button onClick={() => adjustRole(r.id, 1)}
                          disabled={total >= target || (r.max !== undefined && count >= r.max)}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold active:bg-white/10 disabled:opacity-20">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cartes bonus Voleur */}
            {isMJ && thiefInGame && (
              <div className="border-t border-blue-500/20 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-xs font-body uppercase tracking-wider">🃏 Cartes bonus Voleur</p>
                    <p className="text-parchment-dim/60 text-xs font-body mt-0.5">Le Voleur choisira l'une de ces deux cartes</p>
                  </div>
                  <button onClick={() => setShowBonusEditor(e => !e)}
                    className={`text-xs font-body border rounded-lg px-2 py-1 active:opacity-60 ${showBonusEditor ? 'border-blue-400/40 text-blue-300' : 'border-white/10 text-parchment-dim/50'}`}>
                    {showBonusEditor ? '✓' : '✏️'}
                  </button>
                </div>

                <div className="flex gap-3">
                  {bonusCards.map((roleId, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 card-dark border-blue-500/20 p-3 rounded-xl">
                      <span className="text-2xl">{ROLE_EMOJI[roleId]}</span>
                      <span className="text-parchment-dim text-xs font-body text-center">
                        {BONUS_ROLES.find(r => r.id === roleId)?.label || roleId}
                      </span>
                    </div>
                  ))}
                </div>

                {showBonusEditor && (
                  <div className="flex flex-col gap-4 animate-fade-up">
                    {[0, 1].map(idx => (
                      <div key={idx}>
                        <p className="text-parchment-dim text-xs font-body mb-2">Carte bonus {idx + 1}</p>
                        <div className="flex flex-wrap gap-2">
                          {BONUS_ROLES.map(r => (
                            <button key={r.id} onClick={() => setBonusCard(idx, r.id)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-body border transition-all active:scale-95 ${
                                bonusCards[idx] === r.id
                                  ? 'border-blue-400/60 bg-blue-900/20 text-blue-200'
                                  : 'border-white/10 text-parchment-dim/60'
                              }`}>
                              <span>{ROLE_EMOJI[r.id]}</span>
                              <span>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vue joueur lecture seule */}
        {!isMJ && composition && playerCount >= minPlayers && (
          <div className="card-dark p-4">
            <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mb-3">Composition</p>
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.filter(r => (composition[r.id] || 0) > 0).map(r => (
                <div key={r.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body bg-white/5 border border-white/10 text-parchment-dim">
                  <span>{ROLE_EMOJI[r.id]}</span>
                  <span className="font-bold">{composition[r.id]}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {isMJ ? (
          <div className="flex flex-col gap-3">
            {composition && !isValidComposition(composition, playerCount) && playerCount >= minPlayers && (
              <div className="card-dark border-amber-500/20 p-3 text-center">
                <p className="text-amber-400 text-xs font-body">
                  {remaining > 0 ? `Attribuez encore ${remaining} rôle${remaining > 1 ? 's' : ''}`
                    : remaining < 0 ? `Retirez ${Math.abs(remaining)} rôle${Math.abs(remaining) > 1 ? 's' : ''}`
                    : 'Min. 1 loup et 1 habitant requis'}
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
                <p className="text-blood-light text-sm font-body text-center">Supprimer définitivement ?</p>
                <div className="flex gap-3">
                  <button onClick={deleteGame} disabled={deleting}
                    className="btn-danger flex-1 text-sm py-3 disabled:opacity-40">
                    {deleting ? 'Suppression...' : '🗑 Confirmer'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1 text-sm py-3">Annuler</button>
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
