import { useState, useEffect, useRef } from 'react'
import { useActions } from '../../hooks/useActions'
import { ROLES, PHASES } from '../../lib/constants'
import { narrator, NIGHT_SCRIPTS, WAKE_ORDER } from '../../lib/narrator'
import { sounds } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'

export function NightScreen({ game, currentPlayer, players = [] }) {
  const { actions, submitAction } = useActions(game.id, game.phase_number)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [actionDone, setActionDone] = useState(false)
  const [witchMode, setWitchMode] = useState(null)
  const [spying, setSpying] = useState(false)
  const [myTurn, setMyTurn] = useState(false)
  const [nightPhase, setNightPhase] = useState('sleeping') // sleeping | myTurn | done | waiting
  const narratorRan = useRef(false)

  const role = ROLES[currentPlayer?.role] || ROLES.villager
  const myRoleId = currentPlayer?.role
  const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id)
  const aliveWolves = players.filter(p => p.is_alive && p.role === 'werewolf' && p.id !== currentPlayer?.id)
  const nightKillTarget = game.night_kills?.[0]
  const nightKillPlayer = players.find(p => p.id === nightKillTarget)
  const hasNightAction = role.nightAction && role.nightAction !== 'spy'
  const isPassive = !hasNightAction

  // ── Check si déjà joué ──
  useEffect(() => {
    if (!actions.length) return
    const myAction = actions.find(a => a.player_id === currentPlayer?.id)
    if (myAction) { setActionDone(true); setNightPhase('waiting') }
  }, [actions, currentPlayer?.id])

  // ── Séquence narrative nocturne (une seule fois par nuit) ──
  useEffect(() => {
    if (narratorRan.current) return
    if (!players.length || !currentPlayer) return
    if (game.current_phase !== PHASES.NIGHT) return
    narratorRan.current = true

    const runNight = async () => {
      // 1. Annonce la nuit
      sounds.nightFall()
      await narrator.nightFall()

      // 2. Réveille les rôles dans l'ordre
      const rolesInGame = WAKE_ORDER.filter(roleId =>
        players.some(p => p.is_alive && p.role === roleId)
      )

      for (const roleId of rolesInGame) {
        const script = NIGHT_SCRIPTS[roleId]
        if (!script || !script.wake) continue

        // Vibration pour tout le monde — le joueur concerné la ressentira
        sounds.vibrate([200, 100, 200])
        await narrator.wakeRole(script.wake, script.instruction)

        // Si c'est MON rôle → activer mon interface
        if (roleId === myRoleId) {
          setMyTurn(true)
          setNightPhase('myTurn')
          sounds.roleReveal()

          // Attendre que j'aie fait mon action (polling toutes les secondes)
          await new Promise(resolve => {
            const check = setInterval(async () => {
              const { data } = await supabase
                .from('mv_actions')
                .select('id')
                .eq('game_id', game.id)
                .eq('player_id', currentPlayer.id)
                .eq('phase_number', game.phase_number)
              if (data?.length) {
                clearInterval(check)
                setMyTurn(false)
                setNightPhase('waiting')
                resolve()
              }
            }, 1000)
          })
        } else {
          // Pas mon tour — attendre que ce rôle ait joué
          await new Promise(resolve => {
            const rolePlayer = players.find(p => p.is_alive && p.role === roleId)
            if (!rolePlayer) { resolve(); return }

            // Action type pour ce rôle
            const actionTypes = {
              cupid: 'cupid_link',
              seer: 'seer_inspect',
              bodyguard: 'bodyguard_protect',
              werewolf: 'werewolf_kill',
              witch: 'witch_heal',
            }
            const actionType = actionTypes[roleId]

            const check = setInterval(async () => {
              const { data } = await supabase
                .from('mv_actions')
                .select('id')
                .eq('game_id', game.id)
                .eq('action_type', actionType)
                .eq('phase_number', game.phase_number)
              if (data?.length) { clearInterval(check); resolve() }
            }, 1000)

            // Timeout de sécurité : 90s max par rôle
            setTimeout(() => { clearInterval(check); resolve() }, 90000)
          })
        }

        await narrator.sleepRole(script.sleep)
      }

      // 3. Aube
      await narrator.dawn()
      sounds.phaseTransition()

      // 4. Calculer et appliquer les morts de la nuit
      const { data: allActions } = await supabase
        .from('mv_actions')
        .select('*')
        .eq('game_id', game.id)
        .eq('phase_number', game.phase_number)

      if (allActions) {
        const killActions   = allActions.filter(a => a.action_type === 'werewolf_kill')
        const healActions   = allActions.filter(a => a.action_type === 'witch_heal')
        const poisonActions = allActions.filter(a => a.action_type === 'witch_poison')
        const protectActions = allActions.filter(a => a.action_type === 'bodyguard_protect')

        let killed = killActions[0]?.target_id || null
        const protected_ = protectActions[0]?.target_id

        if (healActions.length && healActions[0].target_id === killed) killed = null
        if (protected_ && protected_ === killed) killed = null

        const poisoned = poisonActions[0]?.target_id || null
        const nightKills = [killed, poisoned].filter(Boolean)

        await supabase.from('mv_games').update({
          current_phase: PHASES.NIGHT_RESOLUTION,
          night_kills: nightKills,
        }).eq('id', game.id)
      }
    }

    runNight()
  }, [players.length, currentPlayer?.id, game.current_phase])

  // ── Handlers ──
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
      await submitAction(currentPlayer.id, 'witch_heal', nightKillTarget)
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
    sounds.uiClick()
    setActionDone(true)
  }

  const handleSubmitCupid = async () => {
    if (!selectedTarget) return
    await submitAction(currentPlayer.id, 'cupid_link', selectedTarget)
    sounds.roleReveal()
    setActionDone(true)
  }

  const inspectedPlayer = actionDone
    ? players.find(p => p.id === actions.find(a => a.player_id === currentPlayer?.id)?.target_id)
    : null

  // ── RENDER ──

  // Écran "yeux fermés" — pas mon tour
  if (nightPhase === 'sleeping' || (nightPhase === 'waiting' && !isPassive)) {
    return (
      <div className="screen flex flex-col items-center justify-center gap-6 bg-night">
        <div className="stars-bg" />
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div className="text-7xl opacity-20">🌙</div>
          <h1 className="font-display font-black text-2xl text-gold/60">
            {nightPhase === 'waiting' ? 'Action enregistrée' : 'La Nuit...'}
          </h1>
          <p className="text-parchment-dim/50 text-sm font-body max-w-xs">
            {nightPhase === 'waiting'
              ? 'Attendez en silence. Le narrateur guide les autres.'
              : 'Gardez les yeux fermés et attendez votre tour.'
            }
          </p>
          {/* Role badge discret */}
          <div className="opacity-30 mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-white/10">
            <span>{role.emoji}</span>
            <span className="text-parchment-dim text-xs font-body">{role.name}</span>
          </div>
        </div>
      </div>
    )
  }

  // Écran "c'est mon tour" — interface d'action
  return (
    <div className="screen flex flex-col">
      <div className="stars-bg" />
      <div className="fog-layer" />

      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5">

        {/* Header */}
        <div className="text-center pt-4">
          <div className="text-4xl mb-2 animate-float">{role.emoji}</div>
          <h1 className="font-display font-black text-2xl animate-pulse-gold" style={{ color: role.colorLight }}>
            C'est votre tour
          </h1>
          <p className="text-parchment-dim text-sm font-body mt-1">
            {role.name} · Nuit {game.phase_number}
          </p>
        </div>

        {/* === LOUP-GAROU === */}
        {myRoleId === 'werewolf' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            {aliveWolves.length > 0 && (
              <div className="card-glow-blood p-4 text-center">
                <p className="text-blood-light text-xs font-body uppercase tracking-wider mb-2">Vos frères loups</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {aliveWolves.map(w => (
                    <span key={w.id} className="text-parchment text-sm font-body bg-blood/20 px-3 py-1 rounded-full">
                      🐺 {w.name}
                    </span>
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
              className="btn-danger w-full disabled:opacity-30">
              🐺 Confirmer la victime
            </button>
          </div>
        )}

        {/* === VOYANTE === */}
        {myRoleId === 'seer' && !actionDone && (
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
            <button onClick={handleSubmitSeer} disabled={!selectedTarget} className="btn-primary w-full disabled:opacity-30">
              🔮 Inspecter
            </button>
          </div>
        )}

        {/* Résultat voyante */}
        {myRoleId === 'seer' && actionDone && inspectedPlayer && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="card-dark p-6 text-center w-full"
              style={{ borderColor: inspectedPlayer.role === 'werewolf' ? '#8B1A1A60' : '#2E5E4E60' }}>
              <p className="text-parchment-dim text-xs uppercase tracking-wider font-body mb-2">Vision révélée</p>
              <p className="font-display text-xl text-parchment mb-1">{inspectedPlayer.name}</p>
              <div className="text-4xl my-3">{inspectedPlayer.role === 'werewolf' ? '🐺' : '☀️'}</div>
              <p className="font-display font-bold text-lg"
                style={{ color: inspectedPlayer.role === 'werewolf' ? '#B02020' : '#3D7A64' }}>
                {inspectedPlayer.role === 'werewolf' ? 'Camp des Loups !' : 'Camp du Village'}
              </p>
            </div>
            <p className="text-parchment-dim text-xs font-body text-center">Le narrateur va vous rendormir...</p>
          </div>
        )}

        {/* === SORCIÈRE === */}
        {myRoleId === 'witch' && !actionDone && (
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
                    <button onClick={() => setWitchMode('heal')}
                      className="card-dark border-forest/30 p-4 text-center active:scale-95">
                      <p className="text-forest-light font-display text-base">💊 Potion de Vie</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Ressusciter {nightKillPlayer?.name}</p>
                    </button>
                  )}
                  {!currentPlayer.witch_poison_used && (
                    <button onClick={() => setWitchMode('poison')}
                      className="card-dark border-blood/30 p-4 text-center active:scale-95">
                      <p className="text-blood-light font-display text-base">☠️ Potion de Mort</p>
                      <p className="text-parchment-dim text-xs font-body mt-1">Éliminer n'importe qui</p>
                    </button>
                  )}
                  <button onClick={() => handleSubmitWitch('skip')}
                    className="card-dark p-4 text-center text-parchment-dim text-sm font-body active:scale-95">
                    Passer (ne rien faire)
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
                  <button onClick={() => handleSubmitWitch('heal')} className="btn-primary px-6">Oui, soigner</button>
                  <button onClick={() => setWitchMode(null)} className="btn-ghost px-6">Annuler</button>
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

        {/* === GARDE DU CORPS === */}
        {myRoleId === 'bodyguard' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">Choisissez qui vous protégez</p>
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

        {/* === CUPIDON === */}
        {myRoleId === 'cupid' && !actionDone && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-parchment-dim text-xs text-center font-body">Choisissez un amant à lier (l'autre sera l'amant de l'autre loup)</p>
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

        {/* Passif — villageois, chasseur, idiot */}
        {isPassive && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-5xl opacity-20">😴</div>
            <p className="text-parchment-dim/50 text-sm font-body text-center">
              Votre rôle n'agit pas la nuit.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
