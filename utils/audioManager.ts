
class AudioManager {
  private music: HTMLAudioElement;
  private sounds: { [key: string]: HTMLAudioElement };
  private musicMuted: boolean = false;
  private sfxMuted: boolean = false;

  constructor() {
    // Background Music (Loop)
    this.music = new Audio('https://cdn.pixabay.com/audio/2022/10/24/audio_34b757303d.mp3'); // Fantasy Magical Loop
    this.music.loop = true;
    this.music.volume = 0.3;

    // Sound Effects
    this.sounds = {
      select: new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2490897711.mp3'), // Soft click/bubble
      swap: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3'), // Whoosh/Slide
      match: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3'), // Pop/Chime
      combo: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'), // Higher pitch chime
      special: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-fairy-glitter-867.mp3'), // Bomb/Powerup
      win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'), // Level Complete
      lose: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-game-over-470.mp3'), // Fail
      ui: new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3'), // UI Click
    };

    // Load preferences
    const savedMusic = localStorage.getItem('musicMuted');
    const savedSfx = localStorage.getItem('sfxMuted');
    
    if (savedMusic) this.musicMuted = JSON.parse(savedMusic);
    if (savedSfx) this.sfxMuted = JSON.parse(savedSfx);
  }

  playMusic() {
    if (!this.musicMuted) {
      // Browsers require interaction first, catch error if auto-play fails
      this.music.play().catch(e => console.log("Audio waiting for interaction"));
    }
  }

  stopMusic() {
    this.music.pause();
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('musicMuted', JSON.stringify(this.musicMuted));
    if (this.musicMuted) this.music.pause();
    else this.music.play();
    return this.musicMuted;
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('sfxMuted', JSON.stringify(this.sfxMuted));
    return this.sfxMuted;
  }

  playSfx(key: string) {
    if (this.sfxMuted || !this.sounds[key]) return;
    
    // Clone node to allow overlapping sounds (fast matches)
    const sound = this.sounds[key].cloneNode() as HTMLAudioElement;
    sound.volume = 0.5;
    sound.play().catch(() => {});
  }

  isMusicMuted() { return this.musicMuted; }
  isSfxMuted() { return this.sfxMuted; }
}

export const audioManager = new AudioManager();
