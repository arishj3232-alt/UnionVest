// Web Audio API sound effects utility
// Generates synthesized sounds for instant playback without external API calls

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      type AudioWindow = Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const audioWindow = window as AudioWindow;
      const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioCtor) {
        throw new Error('Web Audio API not supported in this browser');
      }
      this.audioContext = new AudioCtor();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Soft click sound for buttons
  playClick() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  // Success/purchase sound
  playSuccess() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    // Play a pleasant ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + index * 0.08;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    });
  }

  // Level up celebration fanfare
  playLevelUp() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    // Triumphant fanfare sequence
    const melody = [
      { freq: 523.25, time: 0, duration: 0.15 },     // C5
      { freq: 659.25, time: 0.12, duration: 0.15 },  // E5
      { freq: 783.99, time: 0.24, duration: 0.15 },  // G5
      { freq: 1046.50, time: 0.36, duration: 0.4 },  // C6 (held)
      { freq: 987.77, time: 0.5, duration: 0.15 },   // B5
      { freq: 1046.50, time: 0.65, duration: 0.5 },  // C6 (final)
    ];
    
    melody.forEach(({ freq, time, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time);
      oscillator.type = 'triangle';
      
      const startTime = ctx.currentTime + time;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.setValueAtTime(0.2, startTime + duration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });

    // Add a shimmer effect
    this.playShimmer(0.8);
  }

  // Sparkle/shimmer effect
  playShimmer(delay: number = 0) {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    // High frequency sparkles
    const sparkles = [
      { freq: 2093, time: 0 },
      { freq: 2637, time: 0.1 },
      { freq: 3136, time: 0.2 },
      { freq: 2093, time: 0.3 },
    ];
    
    sparkles.forEach(({ freq, time }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay + time);
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + delay + time;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  }

  // Unlock sound (treasure chest opening feel)
  playUnlock() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    // Rising sweep
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);

    // Add sparkle after sweep
    this.playShimmer(0.2);
  }

  // Hover sound (subtle)
  playHover() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }

  // Error/warning sound
  playError() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    [0, 0.15].forEach((delay) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(200, ctx.currentTime + delay);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.1);
      
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.1);
    });
  }

  // Coin/money sound
  playCoin() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
    oscillator.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.08); // G6
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }
}

// Singleton instance
export const soundEffects = new SoundEffects();

// Convenience exports
export const playClick = () => soundEffects.playClick();
export const playSuccess = () => soundEffects.playSuccess();
export const playLevelUp = () => soundEffects.playLevelUp();
export const playUnlock = () => soundEffects.playUnlock();
export const playHover = () => soundEffects.playHover();
export const playError = () => soundEffects.playError();
export const playCoin = () => soundEffects.playCoin();
export const playShimmer = (delay?: number) => soundEffects.playShimmer(delay);
