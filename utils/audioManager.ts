
class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement;
  private musicMuted: boolean = false;
  private sfxMuted: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Música de fundo (Placeholder suave)
    this.music = new Audio('https://cdn.pixabay.com/audio/2022/10/24/audio_34b757303d.mp3'); 
    this.music.loop = true;
    this.music.volume = 0.2; // Volume mais baixo para não competir com SFX

    // Load preferences
    const savedMusic = localStorage.getItem('musicMuted');
    const savedSfx = localStorage.getItem('sfxMuted');
    
    if (savedMusic) this.musicMuted = JSON.parse(savedMusic);
    if (savedSfx) this.sfxMuted = JSON.parse(savedSfx);
  }

  init() {
    if (this.isInitialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isInitialized = true;
      this.playMusic();
      console.log("Audio System Initialized");
    } catch (e) {
      console.error("Audio Context not supported", e);
    }
  }

  playMusic() {
    if (!this.musicMuted && this.isInitialized) {
      this.music.play().catch(e => console.log("Music waiting for interaction...", e));
    }
  }

  stopMusic() {
    this.music.pause();
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('musicMuted', JSON.stringify(this.musicMuted));
    
    if (this.musicMuted) this.music.pause();
    else if (this.isInitialized) this.music.play().catch(() => {});
    
    return this.musicMuted;
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('sfxMuted', JSON.stringify(this.sfxMuted));
    return this.sfxMuted;
  }

  // --- SINTETIZADOR SUAVE (SOFT SYNTH) ---
  
  playSfx(key: string) {
    if (this.sfxMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    
    // Função auxiliar para criar osciladores rápidos
    const createOsc = (type: OscillatorType, freqStart: number, freqEnd: number, duration: number, volume: number, delay: number = 0) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = type;
        
        // Frequency envelope
        osc.frequency.setValueAtTime(freqStart, t + delay);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, t + delay + duration);
        }

        // Volume envelope (Soft Attack/Release)
        gain.gain.setValueAtTime(0, t + delay);
        gain.gain.linearRampToValueAtTime(volume, t + delay + (duration * 0.1)); // 10% attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + duration); // Smooth release
        
        osc.start(t + delay);
        osc.stop(t + delay + duration);
    };

    switch (key) {
      case 'select': 
        // "Blip" muito curto e suave
        createOsc('sine', 600, 600, 0.05, 0.05);
        break;

      case 'swap': 
        // "Whoosh" sutil de baixa frequência
        createOsc('sine', 250, 400, 0.15, 0.03);
        break;

      case 'match': 
        // "Pop" / "Bolha" agradável
        // VARIAÇÃO ALEATÓRIA: Muda ligeiramente o tom a cada match para não enjoar
        const variance = (Math.random() * 100) - 50; // +/- 50Hz
        const baseFreq = 350 + variance;
        
        // Som principal (corpo)
        createOsc('sine', baseFreq, baseFreq * 1.5, 0.12, 0.08);
        // Harmônico sutil (brilho)
        createOsc('sine', baseFreq * 2, baseFreq * 2.5, 0.1, 0.02);
        break;

      case 'combo': 
        // Acorde Mágico (Tríade Maior Cintilante)
        // Toca 3 notas rápidas em sucessão (arpejo muito rápido)
        const root = 523.25; // C5
        createOsc('sine', root, root, 0.4, 0.05, 0);          // Root
        createOsc('sine', root * 1.25, root * 1.25, 0.4, 0.05, 0.05); // Major 3rd (E)
        createOsc('sine', root * 1.5, root * 1.5, 0.5, 0.05, 0.1);   // Perfect 5th (G)
        // Um brilho extra agudo
        createOsc('triangle', root * 2, root * 2, 0.2, 0.01, 0.15); 
        break;

      case 'special': 
        // Som etéreo para poderes
        createOsc('sine', 200, 800, 0.4, 0.1);
        createOsc('triangle', 205, 805, 0.4, 0.05);
        break;

      case 'win': 
        // Acorde de Vitória Suave
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            createOsc('sine', freq, freq, 0.6, 0.05, i * 0.1);
        });
        break;

      case 'lose': 
        // Tom descendente suave
        createOsc('sine', 300, 100, 0.5, 0.1);
        createOsc('triangle', 305, 105, 0.5, 0.05);
        break;

      case 'ui': 
        // Clique quase imperceptível
        createOsc('sine', 800, 800, 0.03, 0.02);
        break;
    }
  }

  isMusicMuted() { return this.musicMuted; }
  isSfxMuted() { return this.sfxMuted; }
}

export const audioManager = new AudioManager();
