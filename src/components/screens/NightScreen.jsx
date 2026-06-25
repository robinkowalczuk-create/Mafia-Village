import { useState, useEffect } from 'react'
import { useActions } from '../../hooks/useActions'
import { ROLES, ROLE_NIGHT_INSTRUCTIONS, PHASES } from '../../lib/constants'
import { sounds } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'
import { checkVictory } from '../../lib/gameUtils'

export function NightScreen({ game, currentPlayer, players = [] }) {
  const { actions, submitAction } = useActions(game.id, game.phase_number)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [actionDone, setActionDone] = useState(false)
  const [witchMode, setWitchMode] = useState(null) // 'heal' | 'poison' | null
  const [spying, setSpying] = useState(false)

  const role = ROLES[currentPlayer?.role] || ROLES.villager
  const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id)
  const aliveWolves = alivePlayers.filter(p => p.role === 'werewolf')
  const nightKillTarget = game.night_kills?.[0]
  const nightKillPlayer = players.find(p => p.id === nightKillTarget)

  // Check if this player already acted
  useEffect(() => {
    if (!actions.length) return
    const myAction = actions.find(a => a.player_id === currentPlayer?.id)
    if (myAction) setActionDone(true)
  }, [actions, currentPlayer?.id])

  // Auto-advance phase when all night actors have acted
  useEffect(() => {
    const autoAdvance = async () => {
      if (!game || game.current_phase !== PHASES.NIGHT) return

      const nightActors = players.filter(p =>
        p.is_alive &&
        ROLES[p.role]?.nightAction &&
        ROLES[p.role]?.nightAction !== 'spy' // Petite Fille n'est pas obligée
      )
      const actorIds = nightActors.map(p => p.id)
      const doneIds = actions.map(a => a.player_id)
      const allDone = actorIds.every(id => doneIds.includes(id))

      if (allDone && actorIds.length > 0) {
        // Calculer la victime de la nuit
        const killActions = actions.filter(a => a.action_type === 'werewolf_kill')
        const healActions = actions.filter(a => a.action_type === 'witch_heal')
        const poisonActions = actions.filter(a => a.action_type === 'witch_poison')
        const protectActions = actions.filter(a => a.action_type === 'bodyguard_protect')

        let killed = killActions[0]?.target_id || null
        const protected_ = protectActions[0]?.target_id

        // Sorcière a soigné la victime ?
        if (healActions.length > 0 && healActions[0].target_id === killed) killed = null

        // Sorcière a empoisonné ?
        const poisoned = poisonActions[0]?.target_id || null

        // Garde du corps a protégé la victime des loups ?
        if (protected_ && protected_ === killed) killed = null

        const nightKills = [killed, poisoned].filter(Boolean)

        await supabase.from('mv_games').update({
          current_phase: PHASES.NIGHT_RESOLUTION,
          night_kills: nightKills,
        }).eq('id', game.id)
      }
    }
    autoAdvance()
  }, [actions, players, game])

  const handleTarget = (playerId) => {
    setSelectedTarget(prev => prev === playerId ? null : playerId)
    sounds.uiClick()
  }

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
      await submitAction(currentPlayer.id, 'witch_heal', nightKillTarget)
      await supabase.from('mv_players').update({ witch_heal_used: true }).eq('id', currentPlayer.id)
    } else if (type === 'poison' && selectedTarget) {
      await submitAction(currentPlayer.id, 'witch_poison', selectedTarget)
      await supabase.from('mv_players').update({ witch_poison_used: true }).eq('id', currentPlayer.id)
    } else if (type === 'skip') {
      await submitAction(currentPlayer.id, 'witch_heal', null)
    }
    sounds.witchPotion()
    setActionDone(true)
    setWitchMode(null)
  }

  const handleSubmitBodyguard = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'bodyguard_protect', selectedTarget)
    sounds.uiClick()
    setActionDone(true)
  }

  const handleSubmitCupid = async () => {
    // Cupid picks 2 lovers — simplified: first click = lover1, second = lover2
    // For now we handle via a two-pick mechanism stored in actions
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'cupid_link', selectedTarget)
    sounds.roleReveal()
    setActionDone(true)
  }

  const inspectedPlayer = actionDone
    ? players.find(p => p.id === actions.find(a => a.player_id === currentPlayer?.id)?.target_id)
    : null

  // ── RENDER ──

  // Rôles passifs (villageois, chasseur, idiot) — attendent simplement
  const isPassive = !role.nightAction || role.nightAction === 'spy'

  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="fog-layer" />
      <div className="village-silhouette" />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5">

        {/* Phase header */}
        <div className="text-center pt-4">
          <div className="text-4xl mb-2">🌙</div>
          <h1 className="font-display font-black text-2xl text-gold">Nuit {game.phase_number}</h1>
          <p className="text-parchment-dim text-sm font-body mt-1">
            {ROLE_NIGHT_INSTRUCTIONS[currentPlayer?.role] || 'Attendez en silence.'}
          </p>
        </div>

        {/* Role badge */}
        <div className="flex items-center justify-center">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-body"
            style={{ background: `${role.color}20`, border: `1px solid ${role.color}40`, color: role.colorLight }}
          >
            {role.emoji} {role.name}
          </div>
        </div>

        {/* ACTION ZONE */}

        {/* === PASSIF === */}
        {(isPassive || actionDone && role.nightAction === null) && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-6xl animate-float opacity-30">😴</div>
            <p className="text-parchment-dim text-sm font-body text-center max-w-xs">
              {actionDone
                ? 'Action accomplie. En attente des autres...'
                : 'Gardez les yeux fermés. Restez silencieux.'}
            </p>

            {/* Petite Fille — option d'espionner */}
            {currentPlayer?.role === 'littlegirl' && !actionDone && (
              <div className="card-dark p-4 max-w-xs text-center">
                <p className="text-parchment-dim text-xs font-body mb-3">
                  Osez-vous espionner les loups ? C'est risqué mais précieux.
                </p>
                <button
                  className="text-gold text-sm font-display border border-gold/30 rounded-xl px-4 py-2 active:scale-95"
                  onClick={() => {
                    setSpying(true)
                    sounds.uiClick()
                  }}
                >
                  👁️ J'espionne
                </button>
              </div>
            )}

            {spying && (
              <div className="card-glow-blood p-4 max-w-xs text-center animate-fade-in">
                <p className="text-blood-light text-xs font-body font-bold uppercase tracking-wider mb-2">
                  ⚠️ Vous espionnez les loups
                </p>
                <div className="flex flex-col gap-1">
                  {aliveWolves.map(w => (
                    <p key={w.id} className="text-parchment text-sm font-body">🐺 {w.name}</p>
                  ))}
                </div>
                <p className="text-blood-light/60 text-xs mt-2 font-body">
                  Si vous êtes vue, vous serez éliminée.
                </p>
              </div>
            )}
          </div>
        )}

        {/* === LOUP-GAROU === */}
        {currentPlayer?.role === 'werewolf' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="card-glow-blood p-4 text-center">
              <p className="text-blood-light text-xs font-body uppercase tracking-wider mb-1">
                Vos frères loups
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {aliveWolves.map(w => (
                  <span key={w.id} className="text-parchment text-sm font-body bg-blood/20 px-3 py-1 rounded-full">
                    🐺 {w.name}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-parchment-dim text-xs text-center font-body">
              Choisissez votre victime (consensus entre loups)
            </p>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {alivePlayers.filter(p => p.role !== 'werewolf').map(p => (
                <button
                  key={p.id}
                  onClick={() => handleTarget(p.id)}
                  className={`
                    card-dark px-4 py-3 flex items-center gap-3 text-left
                    active:scale-98 transition-all
                    ${selectedTarget === p.id ? 'border-blood/60 bg-blood/10' : ''}
                  `}
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm font-display">
                    {p.name[0]}
                  </div>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto text-blood">🎯</span>}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitWolf}
              disabled={!selectedTarget}
              className="btn-danger w-full disabled:opacity-30"
            >
              🐺 Confirmer la victime
            </button>
          </div>
        )}

        {/* === VOYANTE === */}
        {currentPlayer?.role === 'seer' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">
              Choisissez un joueur à inspecter
            </p>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleTarget(p.id)}
                  className={`
                    card-dark px-4 py-3 flex items-center gap-3 text-left
                    ${selectedTarget === p.id ? 'border-purple-500/60 bg-purple-900/10' : ''}
                  `}
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm">
                    {p.name[0]}
                  </div>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">🔮</span>}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmitSeer}
              disabled={!selectedTarget}
              className="btn-primary w-full disabled:opacity-30"
            >
              🔮 Inspecter
            </button>
          </div>
        )}

        {/* Seer result */}
        {currentPlayer?.role === 'seer' && actionDone && inspectedPlayer && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div
              className="card-dark p-6 text-center w-full"
              style={{
                borderColor: inspectedPlayer.role === 'werewolf' ? '#8B1A1A60' : '#2E5E4E60',
                boxShadow: `0 0 20px ${inspectedPlayer.role === 'werewolf' ? '#8B1A1A' : '#2E5E4E'}20`
              }}
            >
              <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mb-2">Vision révélée</p>
              <p className="font-display text-xl text-parchment mb-1">{inspectedPlayer.name}</p>
              <div className="text-4xl my-3">
                {inspectedPlayer.role === 'werewolf' ? '🐺' : '☀️'}
              </div>
              <p
                className="font-display font-bold text-lg"
                style={{ color: inspectedPlayer.role === 'werewolf' ? '#B02020' : '#3D7A64' }}
              >
                {inspectedPlayer.role === 'werewolf' ? 'Camp des Loups !' : 'Camp du Village'}
              </p>
              <p className="text-parchment-dim text-xs font-body mt-2">
                Mémorisez. Ne révélez rien trop vite.
              </p>
            </div>
            <p className="text-parchment-dim text-xs font-body text-center">En attente des autres...</p>
          </div>
        )}

        {/* === SORCIÈRE === */}
        {currentPlayer?.role === 'witch' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            {!witchMode && (
              <>
                {nightKillPlayer && (
                  <div className="card-dark border-blood/30 p-4 text-center">
                    <p className="text-blood-light text-xs uppercase tracking-wider font-body mb-1">Victime des loups</p>
                    <p className="text-parchment font-display text-xl">{nightKillPlayer.name}</p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {!currentPlayer.witch_heal_used && nightKillTarget && (
                    <button
                      onClick={() => setWitchMode('heal')}
                      className="card-dark border-forest/30 p-4 text-center active:scale-95"
                    >
                      <p className="text-forest-light font-display text-base">💊 Potion de Vie</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Ressusciter {nightKillPlayer?.name}</p>
                    </button>
                  )}
                  {!currentPlayer.witch_poison_used && (
                    <button
                      onClick={() => setWitchMode('poison')}
                      className="card-dark border-blood/30 p-4 text-center active:scale-95"
                    >
                      <p className="text-blood-light font-display text-base">☠️ Potion de Mort</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Éliminer n'importe qui</p>
                    </button>
                  )}
                  <button
                    onClick={() => handleSubmitWitch('skip')}
                    className="card-dark p-4 text-center text-parchment-dim text-sm font-body active:scale-95"
                  >
                    Passer (ne rien faire)
                  </button>
                </div>
              </>
            )}

            {witchMode === 'heal' && (
              <div className="flex flex-col gap-4 flex-1 items-center justify-center">
                <p className="text-parchment-dim text-sm text-center font-body">
                  Soigner <strong className="text-parchment">{nightKillPlayer?.name}</strong> ?<br/>
                  <span className="text-xs">(Vous ne pourrez plus utiliser cette potion)</span>
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleSubmitWitch('heal')} className="btn-primary px-6">Oui, soigner</button>
                  <button onClick={() => setWitchMode(null)} className="btn-ghost px-6">Annuler</button>
                </div>
              </div>
            )}

            {witchMode === 'poison' && (
              <div className="flex flex-col gap-4 flex-1">
                <p className="text-parchment-dim text-xs text-center font-body">Choisissez la cible du poison</p>
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {alivePlayers.map(p => (
                    <button key={p.id} onClick={() => handleTarget(p.id)}
                      className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-blood/60 bg-blood/10' : ''}`}>
                      <span className="text-parchment font-body">{p.name}</span>
                      {selectedTarget === p.id && <span className="ml-auto">☠️</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleSubmitWitch('poison')} disabled={!selectedTarget} className="btn-danger flex-1 disabled:opacity-30">
                    ☠️ Empoisonner
                  </button>
                  <button onClick={() => setWitchMode(null)} className="btn-ghost px-4">←</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === GARDE DU CORPS === */}
        {currentPlayer?.role === 'bodyguard' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">
              Choisissez qui vous protégez cette nuit
            </p>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {alivePlayers.map(p => (
                <button key={p.id} onClick={() => handleTarget(p.id)}
                  className={`card-dark px-4 py-3 flex items-center gap-3 ${selectedTarget === p.id ? 'border-indigo-400/60 bg-indigo-900/10' : ''}`}>
                  <span className="text-parchment font-body">{p.name}</span>
                  {selectedTarget === p.id && <span className="ml-auto">🛡️</span>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmitBodyguard} disabled={!selectedTarget} className="btn-primary w-full disabled:opacity-30">
              🛡️ Protéger
            </button>
          </div>
        )}

        {/* Waiting indicator */}
        {actionDone && !['seer'].includes(currentPlayer?.role) && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 animate-fade-in">
            <div className="text-5xl animate-float">✓</div>
            <p className="text-parchment-dim text-sm font-body text-center">
              Action enregistrée.<br />En attente des autres joueurs...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
