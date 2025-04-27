/**
 * AudioManager class
 * Handles all audio effects using Web Audio API oscillators
 */

import { EventEmitter } from '../utils/EventEmitter';

// Envelope parameters for sound shaping
interface EnvelopeParams {
  attack: number; // Attack time in seconds
  decay: number; // Decay time in seconds
  sustain: number; // Sustain level (0-1)
  release: number; // Release time in seconds
}

// Note parameters for oscillator
interface NoteParams {
  frequency: number; // Frequency in Hz
  type: OscillatorType; // Oscillator type
  duration: number; // Duration in seconds
  gain: number; // Gain (0-1)
  envelope?: EnvelopeParams; // Optional envelope
}

export class AudioManager extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<string, OscillatorNode> = new Map();
  private activeGains: Map<string, GainNode> = new Map();
  private muted: boolean = false;

  /**
   * Initialize the audio manager
   */
  public async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5; // 50% volume by default
      this.masterGain.connect(this.audioContext.destination);

      // Defer resume until user gesture due to autoplay policies
      if (this.audioContext.state === 'suspended') {
        const resumeOnGesture = async () => {
          try {
            await this.audioContext!.resume();
            console.log('AudioContext resumed after user interaction');
          } catch (err) {
            console.error('Failed to resume audio context:', err);
          }
          document.removeEventListener('click', resumeOnGesture);
          document.removeEventListener('touchstart', resumeOnGesture);
        };
        document.addEventListener('click', resumeOnGesture, { once: true });
        document.addEventListener('touchstart', resumeOnGesture, { once: true });
      }

      this.emit('audio-initialized');
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize audio manager:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Set master volume
   * @param volume - Volume level (0-1)
   */
  public setVolume(volume: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Clamp volume to 0-1 range
    const clampedVolume = Math.max(0, Math.min(1, volume));

    // Apply volume with slight ramp to avoid clicks
    this.masterGain.gain.linearRampToValueAtTime(
      clampedVolume,
      this.audioContext.currentTime + 0.02
    );
  }

  /**
   * Mute/unmute all audio
   * @param muted - Whether audio should be muted
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;

    if (!this.audioContext || !this.masterGain) return;

    // Apply mute/unmute with slight ramp to avoid clicks
    this.masterGain.gain.linearRampToValueAtTime(
      muted ? 0 : 0.5, // 0 for muted, 0.5 for unmuted
      this.audioContext.currentTime + 0.02
    );
  }

  /**
   * Play a completion sound when an attempt is completed
   */
  public playAttemptCompleteSound(): void {
    if (!this.audioContext || this.muted) return;

    // Play a rising arpeggio
    const notes: NoteParams[] = [
      {
        frequency: 440, // A4
        type: 'sine',
        duration: 0.1,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
      },
      {
        frequency: 523.25, // C5
        type: 'sine',
        duration: 0.1,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
      },
      {
        frequency: 659.25, // E5
        type: 'sine',
        duration: 0.2,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
      },
    ];

    // Play notes with slight delay between them
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playNote(note, `complete-${index}`);
      }, index * 100);
    });
  }

  /**
   * Play a welcome sound when the game starts
   */
  public playWelcomeSound(): void {
    if (!this.audioContext || this.muted) return;

    // Play a gentle chord
    const notes: NoteParams[] = [
      {
        frequency: 277.18, // C#4
        type: 'sine',
        duration: 1.0,
        gain: 0.2,
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 },
      },
      {
        frequency: 349.23, // F4
        type: 'sine',
        duration: 1.0,
        gain: 0.2,
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.6, release: 0.5 },
      },
      {
        frequency: 440, // A4
        type: 'sine',
        duration: 1.0,
        gain: 0.2,
        envelope: { attack: 0.2, decay: 0.2, sustain: 0.6, release: 0.5 },
      },
    ];

    // Play notes simultaneously
    notes.forEach((note, index) => {
      this.playNote(note, `welcome-${index}`);
    });
  }

  /**
   * Play a fanfare sound for the final score
   */
  public playFanfareSound(): void {
    if (!this.audioContext || this.muted) return;

    // Define a simple fanfare melody
    const notes: NoteParams[] = [
      // First chord
      {
        frequency: 440, // A4
        type: 'triangle',
        duration: 0.2,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
      },
      {
        frequency: 523.25, // C5
        type: 'triangle',
        duration: 0.2,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
      },
      {
        frequency: 659.25, // E5
        type: 'triangle',
        duration: 0.2,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
      },

      // Trumpet-like fanfare
      {
        frequency: 587.33, // D5
        type: 'square',
        duration: 0.15,
        gain: 0.25,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.05 },
      },
      {
        frequency: 587.33, // D5
        type: 'square',
        duration: 0.15,
        gain: 0.25,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.05 },
      },
      {
        frequency: 784, // G5
        type: 'square',
        duration: 0.6,
        gain: 0.3,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.3 },
      },
    ];

    // Play chords simultaneously and melody sequentially
    const firstChord = notes.slice(0, 3);
    const fanfareMelody = notes.slice(3);

    // Play first chord
    firstChord.forEach((note, index) => {
      this.playNote(note, `fanfare-chord-${index}`);
    });

    // Play fanfare melody with delays
    let delay = 300; // ms
    fanfareMelody.forEach((note, index) => {
      setTimeout(() => {
        this.playNote(note, `fanfare-melody-${index}`);
      }, delay);
      delay += note.duration * 1000;
    });
  }

  /**
   * Play a sound when stroke is being drawn
   */
  public playStrokeSound(): void {
    if (!this.audioContext || this.muted) return;

    // Very subtle short beep
    const note: NoteParams = {
      frequency: 880, // A5
      type: 'sine',
      duration: 0.03,
      gain: 0.05, // Very quiet
      envelope: { attack: 0.01, decay: 0.01, sustain: 0.5, release: 0.01 },
    };

    // Use a timestamp to ensure unique ID
    this.playNote(note, `stroke-${Date.now()}`);
  }

  /**
   * Play a sound when an attempt starts
   */
  public playAttemptStartSound(): void {
    if (!this.audioContext || this.muted) return;

    // Play a descending tone
    const note: NoteParams = {
      frequency: 659.25, // E5
      type: 'sine',
      duration: 0.3,
      gain: 0.2,
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.15 },
    };

    this.playNote(note, 'attempt-start');
  }

  /**
   * Play a sound when drawing outside of constraint box
   */
  public playErrorSound(): void {
    if (!this.audioContext || this.muted) return;

    // Dissonant sound for error
    const notes: NoteParams[] = [
      {
        frequency: 220, // A3
        type: 'sine',
        duration: 0.1,
        gain: 0.15,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05 },
      },
      {
        frequency: 233.08, // Bb3 (slightly dissonant with A3)
        type: 'sine',
        duration: 0.1,
        gain: 0.15,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05 },
      },
    ];

    // Play both notes simultaneously for dissonance
    notes.forEach((note, index) => {
      this.playNote(note, `error-${index}`);
    });
  }

  /**
   * Play a sound for each star earned in score
   * @param starCount - Number of stars (1-5)
   */
  public playStarSound(starCount: number): void {
    if (!this.audioContext || this.muted) return;

    // Base frequency increases with each star
    const baseFreq = 440 + starCount * 110; // A4, A4+, A5, etc.

    const note: NoteParams = {
      frequency: baseFreq,
      type: 'sine',
      duration: 0.15,
      gain: 0.2,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
    };

    this.playNote(note, `star-${starCount}`);
  }

  /**
   * Play a note with the given parameters
   * @param params - Note parameters
   * @param id - Unique ID for tracking the note
   */
  private playNote(params: NoteParams, id: string): void {
    if (!this.audioContext || !this.masterGain) return;

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = params.type;
    oscillator.frequency.value = params.frequency;

    // Create gain node for this note
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0; // Start silent

    // Connect nodes: oscillator -> gain -> master -> output
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Store references for cleanup
    this.activeOscillators.set(id, oscillator);
    this.activeGains.set(id, gainNode);

    // Get current time
    const now = this.audioContext.currentTime;

    // Apply envelope
    const env = params.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 };

    // Attack
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(params.gain, now + env.attack);

    // Decay to sustain
    gainNode.gain.linearRampToValueAtTime(params.gain * env.sustain, now + env.attack + env.decay);

    // Start oscillator
    oscillator.start(now);

    // Release and stop
    const stopTime = now + params.duration;
    gainNode.gain.linearRampToValueAtTime(0, stopTime + env.release);
    oscillator.stop(stopTime + env.release);

    // Clean up after oscillator stops
    oscillator.onended = (): void => {
      this.activeOscillators.delete(id);
      this.activeGains.delete(id);
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Clean up all audio resources
   */
  public cleanup(): void {
    // Stop all active oscillators
    this.activeOscillators.forEach((oscillator, id) => {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (error) {
        console.warn(`Failed to stop oscillator ${id}:`, error);
      }
    });

    // Disconnect all gain nodes
    this.activeGains.forEach(gain => {
      try {
        gain.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect gain node:', error);
      }
    });

    // Clear references
    this.activeOscillators.clear();
    this.activeGains.clear();

    // Close audio context if supported
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.close) {
        this.audioContext.close().catch(error => {
          console.error('Failed to close audio context:', error);
        });
      }
    }

    this.audioContext = null;
    this.masterGain = null;
  }
}
