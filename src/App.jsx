import { useState, useEffect } from 'react'
import { useGame } from './hooks/useGame'
import { usePlayers } from './hooks/usePlayers'
import { PHASES } from './lib/constants'
import { getOrCreatePlayerId, clearPlayerId } from './lib/gameUtils'
import { sounds } from './lib/sounds'
import { supabase } from './lib/supabase'

import { HomeScreen } from './components/screens/HomeScreen'
import { LobbyScreen } from './components/screens/LobbyScreen'
import { RoleRevealScreen } from './components/screens/RoleRevealScreen'
import { NightScreen } from './components/screens/NightScreen'
import { DayScreen } from './components/screens/DayScreen'
import { VoteScreen } from './components/screens/VoteScreen'
import { EliminationScreen } from './components/screens/EliminationScreen'
import { HunterShotScreen } from './components/screens/HunterShotScreen'
import { VictoryScreen } from './components/screens/VictoryScreen'
import { PhaseOverlay } from './components/ui/PhaseOverlay'

export default function App() {
  const [gameCode, setGameCode] = useState(() => sessionStorage.getItem('mafia_game_code'))
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayPhase, setOverlayPhase] = useState(null)
  const [prevPhase, setPrevPhase] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibroEnabled, setVibroEnabled] = useState(true)

  const { game, loading } = useGame(gameCode)
  const { players } = usePlayers(game?.id)

  // Re-hydrate current player from Supabase on mount
  useEffect(() => {
    const rehydrate = async () => {
      const playerId = getOrCreatePlayerId()
      const savedCode = sessionStorage.getItem('mafia_game_code')
      if (!savedCode || !playerId) return

      const { data: gameData } = await supabase
        .from('games').select('*').eq('code', savedCode).single()
      if (!gameData) return

      const { data: playerData } = await supabase
        .from('players').select('*').eq('id', playerId).eq('game_id', gameData.id).single()
      if (playerData) setCurrentPlayer(playerData)
    }
    rehydrate()
  }, [])

  // Keep currentPlayer in sync with realtime players
  useEffect(() => {
    if (!currentPlayer || !players.length) return
    const updated = players.find(p => p.id === currentPlayer.id)
    if (updated) setCurrentPlayer(updated)
  }, [players])

  // Phase change → show overlay
  useEffect(() => {
    if (!game) return
    const phase = game.current_phase

    if (phase !== prevPhase) {
      // Phases that get a cinematic overlay
      const overlayPhases = [PHASES.NIGHT, PHASES.DAY, PHASES.VOTE, PHASES.ELIMINATION, PHASES.NIGHT_RESOLUTION]
      if (overlayPhases.includes(phase) && prevPhase !== null) {
        setOverlayPhase(phase)
        setShowOverlay(true)
        if (phase === PHASES.NIGHT) sounds.nightFall()
        else if (phase === PHASES.VOTE) sounds.voteStart()
        else sounds.phaseTransition()
      }
      setPrevPhase(phase)
    }
  }, [game?.current_phase])

  const handleJoined = ({ game, player }) => {
    setCurrentPlayer(player)
    setGameCode(game.code)
    setPrevPhase(game.current_phase)
  }

  const handlePlayAgain = () => {
    clearPlayerId()
    setGameCode(null)
    setCurrentPlayer(null)
    setPrevPhase(null)
    sessionStorage.removeItem('mafia_game_code')
  }

  const toggleSound = () => {
    const on = sounds.toggle()
    setSoundEnabled(on)
  }

  const toggleVibro = () => {
    const on = sounds.toggleVibrations()
    setVibroEnabled(on)
  }

  // ── RENDER ──

  if (!gameCode || !currentPlayer) {
    return <HomeScreen onJoined={handleJoined} />
  }

  if (loading || !game) {
    return (
      <div className="screen flex items-center justify-center">
        <div className="stars-bg" />
        <div className="relative z-10 text-center">
          <div className="text-4xl mb-4 animate-float">🌕</div>
          <p className="text-parchment-dim font-body text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  const phase = game.current_phase

  const renderPhase = () => {
    switch (phase) {
      case PHASES.LOBBY:
        return <LobbyScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.ROLE_REVEAL:
        return <RoleRevealScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.NIGHT:
        return <NightScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.NIGHT_RESOLUTION:
      case PHASES.DAY:
        return <DayScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.VOTE:
        return <VoteScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.ELIMINATION:
        return <EliminationScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.HUNTER_SHOT:
        return <HunterShotScreen game={game} currentPlayer={currentPlayer} />

      case PHASES.VICTORY:
        return <VictoryScreen game={game} currentPlayer={currentPlayer} onPlayAgain={handlePlayAgain} />

      default:
        return (
          <div className="screen flex items-center justify-center">
            <p className="text-parchment-dim font-body text-sm">Phase inconnue : {phase}</p>
          </div>
        )
    }
  }

  return (
    <>
      {/* Sound/vibro controls — persistent top-right */}
      {phase !== PHASES.LOBBY && phase !== PHASES.VICTORY && (
        <div className="fixed top-3 right-3 z-40 flex gap-2">
          <button
            onClick={toggleVibro}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity ${vibroEnabled ? 'opacity-70' : 'opacity-25'}`}
          >
            📳
          </button>
          <button
            onClick={toggleSound}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity ${soundEnabled ? 'opacity-70' : 'opacity-25'}`}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      )}

      {/* Phase overlay */}
      {showOverlay && overlayPhase && (
        <PhaseOverlay
          phase={overlayPhase}
          onDone={() => {
            setShowOverlay(false)
            setOverlayPhase(null)
          }}
        />
      )}

      {/* Current phase screen */}
      {renderPhase()}
    </>
  )
}
