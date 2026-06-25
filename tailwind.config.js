/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night:    '#0A0A14',
        slate:    '#1A1A2E',
        'slate-light': '#252540',
        gold:     '#C8A96E',
        'gold-light': '#E8C98E',
        blood:    '#8B1A1A',
        'blood-light': '#B02020',
        forest:   '#2E5E4E',
        'forest-light': '#3D7A64',
        parchment:'#E8E0D0',
        'parchment-dim': '#B8B0A0',
        ember:    '#FF6B35',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      animation: {
        'card-flip':    'cardFlip 0.8s ease-in-out',
        'fade-in':      'fadeIn 0.6s ease-out',
        'fade-up':      'fadeUp 0.5s ease-out',
        'pulse-blood':  'pulseBlood 2s ease-in-out infinite',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'shake':        'shake 0.5s ease-in-out',
        'glow-in':      'glowIn 1.2s ease-out forwards',
        'float':        'float 3s ease-in-out infinite',
        'phase-enter':  'phaseEnter 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'victory-burst':'victoryBurst 0.8s ease-out forwards',
        'moon-rise':    'moonRise 1.5s ease-out forwards',
        'fog':          'fog 8s ease-in-out infinite alternate',
      },
      keyframes: {
        cardFlip: {
          '0%':   { transform: 'rotateY(0deg)', opacity: '1' },
          '50%':  { transform: 'rotateY(90deg)', opacity: '0.3' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBlood: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(139,26,26,0.4)' },
          '50%':      { boxShadow: '0 0 30px rgba(139,26,26,0.9)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(200,169,110,0.4)' },
          '50%':      { boxShadow: '0 0 30px rgba(200,169,110,0.8)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        glowIn: {
          '0%':   { opacity: '0', filter: 'brightness(3)' },
          '40%':  { opacity: '1', filter: 'brightness(2)' },
          '100%': { opacity: '1', filter: 'brightness(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        phaseEnter: {
          '0%':   { opacity: '0', transform: 'scale(1.1)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        victoryBurst: {
          '0%':   { transform: 'scale(0.5)', opacity: '0' },
          '60%':  { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        moonRise: {
          '0%':   { transform: 'translateY(60px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fog: {
          '0%':   { transform: 'translateX(-5%) scaleY(1)' },
          '100%': { transform: 'translateX(5%) scaleY(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
