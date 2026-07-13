import { useState, useEffect, useRef } from 'react'
import { useActions } from '../../hooks/useActions'
import { useWolfChat } from '../../hooks/useWolfChat'
import { ROLES, PHASES } from '../../lib/constants'
import { checkVictory } from '../../lib/gameUtils'
import { sounds } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'

export function NightScreen({ game, currentPlayer, players = [] }) {
  const { actions, submitAction } = useActions(game.id, game.phase_number)
  const { messages, sendMessage } = useWolfChat(game.id)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [actionDone, setActionDone] = useState(false)
  const [witchMode, setWitchMode] = useState(null)
  const [spying, setSpying] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const chatEndRef = useRef(null)
  const advancedKey = useRef(null)
  const victoryCheckedKey = useRef(null)

  const role = ROLES[currentPlayer?.role] || ROLES.villager
  const myRoleId = currentPlayer?.role
  const isWolf = myRoleId === 'werewolf'
  const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id)
  const aliveWolves = players.filter(p => p.is_alive && p.role === 'werewolf' && p.id !== currentPlayer?.id)

  const nightKillActions = actions.filter(a => a.action_type === 'werewolf_kill')
  const nightKillTargetId = nightKillActions[0]?.target_id
  const nightKillPlayer = players.find(p => p.id === nightKillTargetId)

  const witchIsActive = myRoleId === 'witch' &&
    (!currentPlayer?.witch_heal_used || !currentPlayer?.witch_poison_used)
  const hasNightAction = role.nightAction &&
    role.nightAction !== 'spy' &&
    !(myRoleId === 'witch' && currentPlayer?.witch_heal_used && currentPlayer?.witch_poison_used)

  // ── FIX : check victoire au DÉBUT de la nuit (avant toute action) ──
  useEffect(() => {
    if (!game?.id || game.current_phase !== PHASES.NIGHT) return
    if (!players.length) return

    const nightKey = `victory_${game.id}_${game.phase_number}`
    if (victoryCheckedKey.current === nightKey) return

    // Seul le premier joueur vérifie
    const sorted = [...players].filter(p => p.is_alive).sort((a, b) => a.joined_at > b.joined_at ? 1 : -1)
    if (sorted[0]?.id !== currentPlayer?.id) return

    victoryCheckedKey.current = nightKey

    const winner = checkVictory(players)
    if (winner) {
      sounds[winner === 'werewolves' ? 'wolvesVictory' : 'villageVictory']()
      supabase.from('mv_games').update({
        current_phase: PHASES.VICTORY,
        status: 'finished',
        winner_camp: winner,
      }).eq('id', game.id)
    }
  }, [game?.id, game?.phase_number, players.length])

  // ── Check si déjà joué ──
  useEffect(() => {
    if (!actions.length) return
    const myAction = actions.find(a => a.player_id === currentPlayer?.id)
    if (myAction) setActionDone(true)
  }, [actions, currentPlayer?.id])

  // ── Auto-advance quand tous les acteurs nocturnes ont joué ──
  useEffect(() => {
    if (!game?.id || game.current_phase !== PHASES.NIGHT) return
    if (!players.length) return

    const nightKey = `${game.id}_${game.phase_number}`
    const sorted = [...players].filter(p => p.is_alive).sort((a, b) => a.joined_at > b.joined_at ? 1 : -1)
    if (sorted[0]?.id !== currentPlayer?.id) return

    const checkAndAdvance = async () => {
      if (advancedKey.current === nightKey) return

      const { data: freshActions } = await supabase
        .from('mv_actions').select('*')
        .eq('game_id', game.id).eq('phase_number', game.phase_number)

      if (!freshActions) return

      const nightActors = players.filter(p => {
        if (!p.is_alive) return false
        const r = ROLES[p.role]
        if (!r?.nightAction || r.nightAction === 'spy') return false
        if (p.role === 'witch' && p.witch_heal_used && p.witch_poison_used) return false
        return true
      })

      if (!nightActors.length) {
        advancedKey.current = nightKey
        await supabase.from('mv_games').update({
          current_phase: PHASES.NIGHT_RESOLUTION, night_kills: [],
        }).eq('id', game.id)
        return
      }

      const doneIds = freshActions.map(a => a.player_id)
      const allDone = nightActors.every(p => doneIds.includes(p.id))
      if (!allDone) return

      advancedKey.current = nightKey

      const killActions    = freshActions.filter(a => a.action_type === 'werewolf_kill')
      const healActions    = freshActions.filter(a => a.action_type === 'witch_heal')
      const poisonActions  = freshActions.filter(a => a.action_type === 'witch_poison')
      const protectActions = freshActions.filter(a => a.action_type === 'bodyguard_protect')

      let killed = killActions[0]?.target_id || null
      const protected_ = protectActions[0]?.target_id
      if (healActions.length && healActions[0].target_id === killed) killed = null
      if (protected_ && protected_ === killed) killed = null

      const poisoned = poisonActions[0]?.target_id || null
      const nightKills = [killed, poisoned].filter(Boolean)

      await supabase.from('mv_games').update({
        current_phase: PHASES.NIGHT_RESOLUTION, night_kills: nightKills,
      }).eq('id', game.id)
    }

    checkAndAdvance()
  }, [actions, players, game?.id, game?.phase_number, game?.current_phase])

  // ── Scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showChat])

  const handleTarget = (id) => { setSelectedTarget(p => p === id ? null : id); sounds.uiClick() }

  const handleSubmitWolf = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'werewolf_kill', selectedTarget)
    sounds.elimination()
    setActionDone(true)
  }

  const handleSubmitSeer = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'seer_inspect', selectedTarget)
    sounds.seerInspect()
    setActionDone(true)
  }

  const handleSubmitWitch = async (type) => {
    if (type === 'heal') {
      await submitAction(currentPlayer.id, 'witch_heal', nightKillTargetId)
      await supabase.from('mv_players').update({ witch_heal_used: true }).eq('id', currentPlayer.id)
    } else if (type === 'poison' && selectedTarget) {
      await submitAction(currentPlayer.id, 'witch_poison', selectedTarget)
      await supabase.from('mv_players').update({ witch_poison_used: true }).eq('id', currentPlayer.id)
    } else {
      await submitAction(currentPlayer.id, 'witch_heal', null)
    }
    sounds.witchPotion()
    setActionDone(true)
    setWitchMode(null)
  }

  const handleSubmitBodyguard = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'bodyguard_protect', selectedTarget)
    setActionDone(true)
  }

  const handleSubmitCupid = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'cupid_link', selectedTarget)
    setActionDone(true)
  }

  const handleSendChat = async (e) => {
    e?.preventDefault()
    if (!chatInput.trim()) return
    await sendMessage(currentPlayer.id, currentPlayer.name, chatInput)
    setChatInput('')
  }

  const inspectedPlayer = actionDone
    ? players.find(p => p.id === actions.find(a =>
        a.player_id === currentPlayer?.id && a.action_type === 'seer_inspect'
      )?.target_id)
    : null

  // ── WOLF CHAT OVERLAY ──
  if (isWolf && showChat) {
    return (
      <div className="screen flex flex-col">
        <div className="stars-bg" />
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-8 pb-4 border-b border-blood/20">
            <button onClick={() => setShowChat(false)} className="text-parchment-dim text-sm active:opacity-60">← Retour</button>
            <div className="flex-1 text-center">
              <p className="text-blood-light font-display font-bold text-sm">🐺 Chat des Loups</p>
              <p className="text-parchment-dim/50 text-xs font-body">Invisible aux villageois</p>
            </div>
            <div className="w-16" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-parchment-dim/40 text-xs font-body text-center mt-8">
                Chuchotez entre loups...
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.player_id === currentPlayer?.id
              return (
                <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-blood-light/60 text-xs font-body px-1">🐺 {msg.player_name}</p>
                  )}
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm font-body ${
                    isMe
                      ? 'bg-blood/30 text-parchment rounded-br-sm'
                      : 'bg-white/5 text-parchment-dim rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-8 pt-3 border-t border-blood/20 flex gap-3">
            <input
              className="flex-1 bg-slate-light border border-blood/20 rounded-xl px-4 py-3 text-parchment placeholder-parchment-dim/40 focus:outline-none focus:border-blood/40 text-sm font-body"
              placeholder="Message secret..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              maxLength={200}
            />
            <button onClick={handleSendChat} disabled={!chatInput.trim()}
              className="w-12 h-12 rounded-xl bg-blood/40 flex items-center justify-center text-lg active:scale-95 disabled:opacity-30">
              🐺
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN NIGHT SCREEN ──
  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="fog-layer" />
      <div className="village-silhouette" />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5">

        {/* Header */}
        <div className="text-center pt-4">
          <div className="text-4xl mb-2">🌙</div>
          <h1 className="font-display font-black text-2xl text-gold">Nuit {game.phase_number}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: `${role.color}20`, border: `1px solid ${role.color}40` }}>
              <span>{role.emoji}</span>
              <span className="text-xs font-body" style={{ color: role.colorLight }}>{role.name}</span>
            </div>
          </div>
        </div>

        {/* Bouton chat loups */}
        {isWolf && (
          <button onClick={() => setShowChat(true)}
            className="card-dark border-blood/30 px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform">
            <span className="text-xl">🐺</span>
            <div className="flex-1 text-left">
              <p className="text-blood-light text-sm font-body font-medium">Chat des Loups</p>
              <p className="text-parchment-dim/50 text-xs font-body">Coordonnez-vous en secret</p>
            </div>
            {messages.length > 0 && (
              <span className="bg-blood/40 text-parchment-dim text-xs px-2 py-0.5 rounded-full font-body">
                {messages.length}
              </span>
            )}
            <span className="text-parchment-dim/40">›</span>
          </button>
        )}

        {/* Action done */}
        {actionDone && myRoleId !== 'seer' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="text-5xl animate-float opacity-60">✓</div>
            <p className="text-parchment-dim text-sm font-body text-center">
              Action enregistrée.<br/>En attente des autres joueurs...
            </p>
          </div>
        )}

        {/* Passif */}
        {!actionDone && !hasNightAction && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-6xl animate-float opacity-30">😴</div>
            <p className="text-parchment-dim text-sm font-body text-center max-w-xs">
              {myRoleId === 'witch'
                ? 'Vos deux potions sont épuisées. Reposez-vous.'
                : 'Votre rôle n\'agit pas la nuit. Restez silencieux.'}
            </p>
            {myRoleId === 'littlegirl' && (
              <div className="card-dark p-4 max-w-xs text-center">
                <p className="text-parchment-dim text-xs font-body mb-3">Osez-vous espionner les loups ?</p>
                <button className="text-gold text-sm font-display border border-gold/30 rounded-xl px-4 py-2 active:scale-95"
                  onClick={() => { setSpying(true); sounds.uiClick() }}>👁️ J'espionne</button>
              </div>
            )}
            {spying && (
              <div className="card-glow-blood p-4 max-w-xs text-center animate-fade-in">
                <p className="text-blood-light text-xs font-body font-bold uppercase tracking-wider mb-2">⚠️ Vous espionnez</p>
                {aliveWolves.map(w => <p key={w.id} className="text-parchment text-sm font-body">🐺 {w.name}</p>)}
              </div>
            )}
          </div>
        )}

        {/* LOUP-GAROU */}
        {myRoleId === 'werewolf' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            {aliveWolves.length > 0 && (
              <div className="card-glow-blood p-4 text-center">
                <p className="text-blood-light text-xs font-body uppercase tracking-wider mb-2">Vos frères loups</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {aliveWolves.map(w => (
                    <span key={w.id} className="text-parchment text-sm font-body bg-blood/20 px-3 py-1 rounded-full">🐺 {w.name}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-parchment-dim text-xs text-center font-body">Choisissez votre victime</p>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {alivePlayers.filter(p => p.role !== 'werewolf').map(p => (
                <button key={p.id} onClick={() => handleTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 text-left ${selectedTarget === p.id ? 'border-blood/60 bg-blood/10' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm">{p.name[0]}</div>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto text-blood">🎯</span>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmitWolf} disabled={!selectedTarget}
              className="btn-danger w-full disabled:opacity-30">🐺 Confirmer la victime</button>
          </div>
        )}

        {/* VOYANTE */}
        {myRoleId === 'seer' && !actionDone && currentPlayer?.is_alive && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">Choisissez un joueur à inspecter</p>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {alivePlayers.map(p => (
                <button key={p.id} onClick={() => handleTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-purple-500/60 bg-purple-900/10' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm">{p.name[0]}</div>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">🔮</span>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmitSeer} disabled={!selectedTarget}
              className="btn-primary w-full disabled:opacity-30">🔮 Inspecter</button>
          </div>
        )}

        {/* Résultat voyante */}
        {myRoleId === 'seer' && actionDone && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            {inspectedPlayer ? (
              <div className="w-full max-w-xs">
                <p className="text-parchment-dim text-xs text-center font-body mb-4">Vision révélée</p>
                <div className="rounded-3xl p-6 flex flex-col items-center gap-4 border animate-glow-in"
                  style={{
                    background: `linear-gradient(160deg, ${inspectedPlayer.role === 'werewolf' ? '#8B1A1A' : '#2E5E4E'}30, #0A0A14)`,
                    borderColor: inspectedPlayer.role === 'werewolf' ? '#8B1A1A60' : '#2E5E4E60',
                  }}>
                  <div className="text-6xl animate-float">{inspectedPlayer.role === 'werewolf' ? '🐺' : '☀️'}</div>
                  <p className="font-display font-black text-2xl text-parchment">{inspectedPlayer.name}</p>
                  <div className="w-16 h-px bg-white/20" />
                  <p className="font-display font-bold text-lg"
                    style={{ color: inspectedPlayer.role === 'werewolf' ? '#B02020' : '#3D7A64' }}>
                    {inspectedPlayer.role === 'werewolf' ? '🐺 Loup-Garou !' : '☀️ Camp du Village'}
                  </p>
                  <p className="text-parchment-dim text-xs font-body text-center">Mémorisez. Ne révélez rien trop tôt.</p>
                </div>
                <p className="text-parchment-dim text-xs font-body text-center mt-4">En attente des autres...</p>
              </div>
            ) : (
              <p className="text-parchment-dim text-sm font-body">En attente des autres...</p>
            )}
          </div>
        )}

        {/* SORCIÈRE */}
        {myRoleId === 'witch' && !actionDone && currentPlayer?.is_alive && witchIsActive && (
          <div className="flex flex-col gap-4 flex-1">
            {!witchMode && (
              <>
                {!currentPlayer.witch_heal_used && (
                  <div className="card-dark border-blood/20 p-4 text-center">
                    <p className="text-blood-light text-xs uppercase tracking-wider font-body mb-1">Victime des loups cette nuit</p>
                    {nightKillPlayer
                      ? <p className="text-parchment font-display text-xl">{nightKillPlayer.name}</p>
                      : <p className="text-parchment-dim text-sm font-body">
                          {nightKillActions.length === 0 ? 'En attente du vote des loups...' : 'Personne'}
                        </p>
                    }
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {!currentPlayer.witch_heal_used && nightKillTargetId && (
                    <button onClick={() => setWitchMode('heal')} className="card-dark border-forest/30 p-4 text-center active:scale-95">
                      <p className="text-forest-light font-display text-base">💊 Potion de Vie</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Ressusciter {nightKillPlayer?.name}</p>
                    </button>
                  )}
                  {!currentPlayer.witch_poison_used && (
                    <button onClick={() => setWitchMode('poison')} className="card-dark border-blood/30 p-4 text-center active:scale-95">
                      <p className="text-blood-light font-display text-base">☠️ Potion de Mort</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Éliminer n'importe qui</p>
                    </button>
                  )}
                  <button onClick={() => handleSubmitWitch('skip')}
                    className="card-dark p-4 text-center text-parchment-dim text-sm font-body active:scale-95">
                    Passer
                  </button>
                </div>
              </>
            )}
            {witchMode === 'heal' && (
              <div className="flex flex-col gap-4 flex-1 items-center justify-center">
                <p className="text-parchment-dim text-sm text-center font-body">
                  Soigner <strong className="text-parchment">{nightKillPlayer?.name}</strong> ?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleSubmitWitch('heal')} className="btn-primary px-6">Oui</button>
                  <button onClick={() => setWitchMode(null)} className="btn-ghost px-6">Non</button>
                </div>
              </div>
            )}
            {witchMode === 'poison' && (
              <div className="flex flex-col gap-4 flex-1">
                <p className="text-parchment-dim text-xs text-center font-body">Choisissez la cible du poison</p>
                <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                  {alivePlayers.map(p => (
                    <button key={p.id} onClick={() => handleTarget(p.id)}
                      className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-blood/60 bg-blood/10' : ''}`}>
                      <span className="text-parchment font-body">{p.name}</span>
                      {selectedTarget === p.id && <span className="ml-auto">☠️</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleSubmitWitch('poison')} disabled={!selectedTarget}
                    className="btn-danger flex-1 disabled:opacity-30">☠️ Empoisonner</button>
                  <button onClick={() => setWitchMode(null)} className="btn-ghost px-4">←</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GARDE DU CORPS */}
        {myRoleId === 'bodyguard' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">Choisissez qui vous protégez cette nuit</p>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {alivePlayers.map(p => (
                <button key={p.id} onClick={() => handleTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-indigo-400/60 bg-indigo-900/10' : ''}`}>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">🛡️</span>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmitBodyguard} disabled={!selectedTarget}
              className="btn-primary w-full disabled:opacity-30">🛡️ Protéger</button>
          </div>
        )}

        {/* CUPIDON */}
        {myRoleId === 'cupid' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">Désignez un amant</p>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {alivePlayers.map(p => (
                <button key={p.id} onClick={() => handleTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-rose-400/60 bg-rose-900/10' : ''}`}>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">💘</span>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmitCupid} disabled={!selectedTarget}
              className="btn-primary w-full disabled:opacity-30">💘 Lier les amants</button>
          </div>
        )}
      </div>
    </div>
  )
}
