import { useState } from 'react'
import { ROLES, PHASES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../lib/sounds'

const ROLE_EMOJI = {
  villager: '🏡', werewolf: '🐺', seer: '🔮', witch: '🧪',
  hunter: '🏹', cupid: '💘', bodyguard: '🛡️', littlegirl: '👁️',
  idiot: '🤡', thief: '🃏',
}

export function ThiefTurnScreen({ game, currentPlayer, players = [] }) {
  const [selectedCard, setSelectedCard] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const bonusCards = game.thief_bonus_cards || ['villager', 'villager']
  const isThief = currentPlayer?.role === 'thief'

  const handleConfirm = async () => {
    if (selectedCard === null || !isThief) return
    setConfirmed(true)
    sounds.uiClick()

    const chosenRole = bonusCards[selectedCard]

    // Mettre à jour le rôle du Voleur
    await supabase.from('mv_players')
      .update({ role: chosenRole })
      .eq('id', currentPlayer.id)

    // Passer à la révélation des rôles
    await supabase.from('mv_games')
      .update({ current_phase: PHASES.ROLE_REVEAL })
      .eq('id', game.id)
  }

  return (
    <div className="screen flex flex-col items-center justify-center px-6">
      <div className="stars-bg" />
      <div className="absolute inset-0 opacity-15"
        style={{ background: 'radial-gradient(ellipse at center, #3A5A7A 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">

        <div className="text-6xl animate-float">🃏</div>
        <h1 className="font-display font-black text-2xl text-gold text-center">
          Le Voleur choisit
        </h1>

        {isThief && !confirmed ? (
          <>
            <p className="text-parchment-dim text-sm font-body text-center">
              Choisissez l'une de ces deux cartes.<br/>
              <span className="text-parchment-dim/60 text-xs">Votre rôle de Voleur sera remplacé.</span>
            </p>

            <div className="flex gap-4 w-full">
              {bonusCards.map((roleId, idx) => {
                const role = ROLES[roleId] || ROLES.villager
                const isSelected = selectedCard === idx
                return (
                  <button key={idx} onClick={() => setSelectedCard(idx)}
                    className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-gold/60 bg-gold/10'
                        : 'border-white/10 bg-white/5'
                    }`}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                      style={{ background: `${role.color}20` }}>
                      {role.image
                        ? <img src={role.image} className="w-full h-full object-contain" />
                        : <span>{role.emoji}</span>
                      }
                    </div>
                    <p className="font-display font-bold text-base text-center"
                      style={{ color: isSelected ? '#C8A96E' : role.colorLight }}>
                      {role.name}
                    </p>
                    <div className="px-2 py-0.5 rounded-full text-xs font-body"
                      style={{ background: `${role.color}20`, color: role.colorLight }}>
                      {role.camp === 'werewolves' ? '🐺 Loups' : '☀️ Village'}
                    </div>
                    <p className="text-parchment-dim text-xs font-body text-center leading-relaxed">
                      {role.description}
                    </p>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={selectedCard === null}
              className="btn-primary w-full disabled:opacity-30">
              🃏 Choisir ce rôle
            </button>
          </>
        ) : !isThief ? (
          <div className="card-dark p-6 text-center w-full">
            <p className="text-parchment-dim text-sm font-body">
              ⏳ Le Voleur choisit son rôle en secret...
            </p>
            <div className="flex gap-2 justify-center mt-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-blue-400/40 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="card-dark p-6 text-center w-full border-forest/30">
            <p className="text-forest-light font-display text-lg">✓ Rôle choisi</p>
            <p className="text-parchment-dim text-xs font-body mt-1">
              Passage à la révélation des rôles...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
