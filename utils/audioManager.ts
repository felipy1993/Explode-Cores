
class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement;
  private musicMuted: boolean = false;
  private sfxMuted: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Música de fundo (Mantemos link externo para música, mas usamos um mais estável ou placeholder)
    // Se falhar, pelo menos os efeitos sonoros funcionarão via sintetizador.
    this.music = new Audio('https://cdn.pixabay.com/audio/2022/10/24/audio_34b757303d.mp3'); 
    this.music.loop = true;
    this.music.volume = 0.3;

    // Load preferences
    const savedMusic = localStorage.getItem('musicMuted');
    const savedSfx = localStorage.getItem('sfxMuted');
    
    if (savedMusic) this.musicMuted = JSON.parse(savedMusic);
    if (savedSfx) this.sfxMuted = JSON.parse(savedSfx);
  }

  // Inicializa o contexto de áudio no primeiro clique do usuário
  init() {
    if (this.isInitialized) return;
    
    try {
      // Cross-browser support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Resume context if suspended (browser autoplay policy)
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

  // --- SINTETIZADOR DE EFEITOS SONOROS (WEB AUDIO API) ---
  // Gera sons matematicamente para não depender de arquivos externos que podem quebrar.
  
  playSfx(key: string) {
    if (this.sfxMuted || !this.ctx) return;
    
    // Resume context if needed
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (key) {
      case 'select': // Short blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;

      case 'swap': // Whoosh slide
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;

      case 'match': // High ping/bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        
        // Harmonic
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, t);
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc2.start(t);
        osc2.stop(t + 0.3);
        break;

      case 'combo': // Ascending Arpeggio
        this.playTone(440, 'sine', 0.1, t);
        this.playTone(554, 'sine', 0.1, t + 0.1); // C#
        this.playTone(659, 'sine', 0.2, t + 0.2); // E
        break;

      case 'special': // Laser/Zap
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
        break;

      case 'win': // Victory Chord
        this.playTone(523.25, 'triangle', 0.4, t); // C
        this.playTone(659.25, 'triangle', 0.4, t + 0.1); // E
        this.playTone(783.99, 'triangle', 0.6, t + 0.2); // G
        this.playTone(1046.50, 'sine', 0.8, t + 0.3); // High C
        break;

      case 'lose': // Sad slide
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.5);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        break;

      case 'ui': // Soft click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
    }
  }

  private playTone(freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', duration: number, startTime: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = type;
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  isMusicMuted() { return this.musicMuted; }
  isSfxMuted() { return this.sfxMuted; }
}

export const audioManager = new AudioManager();
