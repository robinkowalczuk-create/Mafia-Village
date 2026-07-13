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
  const [selectedCard, setSelectedCard] = useState(null) // 0, 1, ou 'keep'
  const [confirmed, setConfirmed] = useState(false)

  const bonusCards = game.thief_bonus_cards || []
  const isThief = currentPlayer?.role === 'thief'

  const handleConfirm = async () => {
    if (selectedCard === null || !isThief) return
    setConfirmed(true)
    sounds.uiClick()

    if (selectedCard === 'keep') {
      // Le voleur garde sa carte actuelle — on passe directement à la nuit
      await supabase.from('mv_games')
        .update({ current_phase: PHASES.NIGHT })
        .eq('id', game.id)
    } else {
      // Le voleur échange avec l'une des 2 cartes
      const chosenRole = bonusCards[selectedCard]
      await supabase.from('mv_players')
        .update({ role: chosenRole })
        .eq('id', currentPlayer.id)
      await supabase.from('mv_games')
        .update({ current_phase: PHASES.NIGHT })
        .eq('id', game.id)
    }
  }

  // Les autres joueurs voient un écran d'attente neutre (sans révéler qu'il y a un voleur)
  if (!isThief) {
    return (
      <div className="screen flex flex-col items-center justify-center px-6">
        <div className="stars-bg" />
        <div className="fog-layer" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="text-6xl opacity-20">🌙</div>
          <h1 className="font-display font-black text-2xl text-gold/60">La Nuit commence...</h1>
          <p className="text-parchment-dim/50 text-sm font-body">Gardez les yeux fermés.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen flex flex-col items-center justify-center px-6">
      <div className="stars-bg" />
      <div className="absolute inset-0 opacity-15"
        style={{ background: 'radial-gradient(ellipse at center, #3A5A7A 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-5xl animate-float">🃏</div>
        <div className="text-center">
          <h1 className="font-display font-black text-2xl text-gold">Voleur, ouvre les yeux</h1>
          <p className="text-parchment-dim text-sm font-body mt-2">
            Voici les deux cartes non distribuées.<br/>
            Tu peux en prendre une ou garder ta carte actuelle.
          </p>
        </div>

        {!confirmed && (
          <>
            {/* Carte actuelle */}
            <div className="w-full">
              <p className="text-parchment-dim text-xs font-body uppercase tracking-wider mb-2 text-center">Ta carte actuelle</p>
              <button onClick={() => setSelectedCard('keep')}
                className={`w-full card-dark flex items-center gap-4 px-4 py-3 border-2 transition-all active:scale-95 ${
                  selectedCard === 'keep' ? 'border-gold/60 bg-gold/10' : 'border-white/10'}`}>
                <span className="text-3xl">{ROLE_EMOJI[currentPlayer?.role] || '🃏'}</span>
                <div className="flex-1 text-left">
                  <p className="text-parchment font-body font-medium">
                    {ROLES[currentPlayer?.role]?.name || 'Voleur'}
                  </p>
                  <p className="text-parchment-dim text-xs font-body">Garder cette carte</p>
                </div>
                {selectedCard === 'keep' && <span className="text-gold">✓</span>}
              </button>
            </div>

            {/* Séparateur */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-parchment-dim/40 text-xs font-body">ou échanger avec</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 2 cartes bonus */}
            <div className="w-full">
              <p className="text-parchment-dim text-xs font-body uppercase tracking-wider mb-2 text-center">Cartes non distribuées</p>
              <div className="flex gap-3">
                {bonusCards.map((roleId, idx) => {
                  const role = ROLES[roleId] || ROLES.villager
                  const isSelected = selectedCard === idx
                  return (
                    <button key={idx} onClick={() => setSelectedCard(idx)}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                        isSelected ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/10 bg-white/5'}`}>
                      <span className="text-3xl">{role.emoji}</span>
                      <p className="font-display font-bold text-sm text-center"
                        style={{ color: isSelected ? '#93C5FD' : role.colorLight }}>
                        {role.name}
                      </p>
                      <div className="px-2 py-0.5 rounded-full text-xs font-body"
                        style={{ background: `${role.color}20`, color: role.colorLight }}>
                        {role.camp === 'werewolves' ? '🐺' : '☀️'}
                      </div>
                      <p className="text-parchment-dim text-xs font-body text-center leading-relaxed">
                        {role.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={handleConfirm} disabled={selectedCard === null}
              className="btn-primary w-full disabled:opacity-30">
              {selectedCard === 'keep' ? '✓ Garder ma carte' : '🃏 Prendre cette carte'}
            </button>
          </>
        )}

        {confirmed && (
          <div className="card-dark p-6 text-center w-full border-forest/30 animate-fade-in">
            <p className="text-forest-light font-display text-lg">✓ Choix effectué</p>
            <p className="text-parchment-dim text-xs font-body mt-1">
              Referme les yeux. La nuit commence.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
