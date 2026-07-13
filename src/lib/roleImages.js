// ═══════════════════════════════════════════════════════
// IMAGES DES RÔLES
// Chaque image doit être uploadée dans src/assets/
// Si une image est absente, le rôle affichera son emoji
// ═══════════════════════════════════════════════════════

// Importe uniquement villager.png qui est confirmé présent
import villagerImg from '../assets/villager.png'

// Les autres images sont chargées dynamiquement pour éviter
// les erreurs de build si elles ne sont pas encore uploadées
const loadImage = (path) => {
  try {
    return path
  } catch {
    return null
  }
}

export const ROLE_IMAGES = {
  villager:   villagerImg,
  werewolf:   null, // → uploader werewolf.png dans src/assets/
  seer:       null, // → uploader seer.png dans src/assets/
  witch:      null, // → uploader witch.png dans src/assets/
  hunter:     null, // → uploader hunter.png dans src/assets/
  cupid:      null, // → uploader cupid.png dans src/assets/
  littlegirl: null, // → uploader littlegirl.png dans src/assets/
  thief:      null, // → uploader thief.png dans src/assets/
  idiot:      null, // → uploader idiot.png dans src/assets/
  bodyguard:  null, // → uploader bodyguard.png dans src/assets/
}
