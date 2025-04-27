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

  // --- Continuous stroke sound state ---
  private strokeOscillator: OscillatorNode | null = null;
  private strokeGain: GainNode | null = null;
  private strokeStartY: number | null = null;
  private strokePaused: boolean = false;
  // Oscillator and gain for X-axis differentiation
  private strokeOscillatorX: OscillatorNode | null = null;
  private strokeGainX: GainNode | null = null;
  // Starting X position for stroke
  private strokeStartX: number | null = null;
  // Default gains for continuous stroke oscillators
  private defaultStrokeYGain: number = 0.08;
  private defaultStrokeXGain: number = 0.02;

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
        const resumeOnGesture = async (): Promise<void> => {
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
    if (!this.audioContext || !this.masterGain) {
      return;
    }

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

    if (!this.audioContext || !this.masterGain) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

    // Very subtle short beep
    const note: NoteParams = {
      frequency: 880, // A5
      type: 'sine',
      duration: 0.03,
      gain: 0.05, // Very quiet
      envelope: { attack: 0.02, decay: 0.02, sustain: 0.5, release: 0.01 },
    };

    // Use a timestamp to ensure unique ID
    this.playNote(note, `stroke-${Date.now()}`);
  }

  /**
   * Play a sound when an attempt starts
   */
  public playAttemptStartSound(): void {
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || this.muted) {
      return;
    }

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
    if (!this.audioContext || !this.masterGain) {
      return;
    }

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
    if (this.audioContext && this.audioContext.state !== 'closed' && this.audioContext.close) {
      this.audioContext.close().catch(error => {
        console.error('Failed to close audio context:', error);
      });
    }

    this.audioContext = null;
    this.masterGain = null;
  }

  /**
   * Start a continuous stroke sound with a second oscillator for X-axis. Call this when the stroke begins.
   * @param x0 - The starting X position of the stroke
   * @param y0 - The starting Y position of the stroke
   */
  public startStrokeSound(x0: number, y0: number): void {
    if (!this.audioContext || !this.masterGain || this.muted) {
      return;
    }
    this.stopStrokeSound(); // Ensure no previous stroke sound is running

    this.strokeOscillator = this.audioContext.createOscillator();
    this.strokeOscillator.type = 'sine';
    // Initial frequency (can be updated immediately after)
    this.strokeOscillator.frequency.value = 440;

    this.strokeGain = this.audioContext.createGain();
    // Start silent for fade-in
    this.strokeGain.gain.value = 0;

    this.strokeOscillator.connect(this.strokeGain);
    // Create second oscillator for X-axis
    this.strokeOscillatorX = this.audioContext.createOscillator();
    this.strokeOscillatorX.type = 'triangle';
    this.strokeOscillatorX.frequency.value = 440;
    this.strokeGainX = this.audioContext.createGain();
    this.strokeGainX.gain.value = 0;
    this.strokeOscillatorX.connect(this.strokeGainX);
    // Connect secondary X-axis gain to master output
    this.strokeGainX.connect(this.masterGain);
    // Connect primary Y-axis oscillator
    this.strokeGain.connect(this.masterGain);

    this.strokeOscillator.start();
    this.strokeOscillatorX.start();
    this.strokeStartX = x0;
    this.strokeStartY = y0;
    this.strokePaused = false;

    // Fade in to 0.08 over 100ms
    if (this.audioContext) {
      const now = this.audioContext.currentTime;
      // Y-axis fade-in to configurable gain
      this.strokeGain.gain.setValueAtTime(0, now);
      this.strokeGain.gain.linearRampToValueAtTime(this.defaultStrokeYGain, now + 0.1);
      // X-axis fade-in to configurable gain
      this.strokeGainX!.gain.setValueAtTime(0, now);
      this.strokeGainX!.gain.linearRampToValueAtTime(this.defaultStrokeXGain, now + 0.1);
    }
  }

  /**
   * Update the pitch of the stroke sound oscillators based on current Y (primary) and X (secondary) positions.
   * @param x - The current X position
   * @param y - The current Y position
   */
  public updateStrokeSound(x: number, y: number): void {
    // Guard: ensure oscillators and start positions are initialized
    if (
      !this.strokeOscillator ||
      !this.strokeOscillatorX ||
      this.strokeStartY === null ||
      this.strokeStartX === null
    ) {
      return;
    }
    // Compute primary Y-axis frequency (e.g., 220 Hz to 880 Hz)
    const minFreq = 220;
    const maxFreq = 880;
    const maxDeltaY = 400;
    const deltaY = -Math.max(-maxDeltaY, Math.min(maxDeltaY, y - this.strokeStartY));
    const normY = (deltaY + maxDeltaY) / (8 * maxDeltaY);
    const freq = minFreq + (maxFreq - minFreq) * normY;
    this.strokeOscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);

    // Apply X-axis delta as frequency offset to the secondary oscillator
    const maxDeltaX = 800;
    const deltaX = Math.max(-maxDeltaX, Math.min(maxDeltaX, x - this.strokeStartX));
    const panNormalized = deltaX / maxDeltaX; // -1 .. 1
    const offsetRange = (maxFreq - minFreq) / 8; // one eigth of Y-axis range
    const freqX = freq + panNormalized * offsetRange;
    this.strokeOscillatorX.frequency.setValueAtTime(freqX, this.audioContext!.currentTime);
  }

  /**
   * Stop the continuous stroke sound. Call this when the stroke ends.
   */
  public stopStrokeSound(): void {
    if (this.strokeOscillator) {
      try {
        // Fade out over 100ms
        if (this.strokeGain && this.audioContext) {
          this.strokeGain.gain.cancelScheduledValues(this.audioContext.currentTime);
          this.strokeGain.gain.setValueAtTime(
            this.strokeGain.gain.value,
            this.audioContext.currentTime
          );
          this.strokeGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
          if (this.strokeGainX) {
            this.strokeGainX.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.strokeGainX.gain.setValueAtTime(
              this.strokeGainX.gain.value,
              this.audioContext.currentTime
            );
            this.strokeGainX.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
          }
        }
        this.strokeOscillator.stop(this.audioContext!.currentTime + 0.11);
        if (this.strokeOscillatorX) {
          this.strokeOscillatorX.stop(this.audioContext!.currentTime + 0.11);
        }
      } catch (e) {
        console.error('Failed to play stroke sound:', e);
      }
      this.strokeOscillator.disconnect();
      if (this.strokeGain) {
        this.strokeGain.disconnect();
      }
      if (this.strokeOscillatorX) {
        this.strokeOscillatorX.disconnect();
      }
      if (this.strokeGainX) {
        this.strokeGainX.disconnect();
      }
    }
    this.strokeOscillator = null;
    this.strokeGain = null;
    this.strokeOscillatorX = null;
    this.strokeGainX = null;
    this.strokeStartY = null;
    this.strokeStartX = null;
    this.strokePaused = false;
  }

  public pauseStrokeSound(): void {
    if (this.strokeGain && !this.strokePaused) {
      // Mute both oscillators
      this.strokeGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      if (this.strokeGainX) {
        this.strokeGainX.gain.setValueAtTime(0, this.audioContext!.currentTime);
      }
      this.strokePaused = true;
    }
  }

  public resumeStrokeSound(): void {
    if (this.strokeGain && this.strokePaused) {
      // Restore both oscillators to configurable gains
      this.strokeGain.gain.setValueAtTime(this.defaultStrokeYGain, this.audioContext!.currentTime);
      if (this.strokeGainX) {
        this.strokeGainX.gain.setValueAtTime(
          this.defaultStrokeXGain,
          this.audioContext!.currentTime
        );
      }
      this.strokePaused = false;
    }
  }

  /**
   * Set the default Y-axis gain for continuous stroke sound (0-1).
   */
  public setStrokeYGain(gain: number): void {
    const clamped = Math.max(0, Math.min(1, gain));
    this.defaultStrokeYGain = clamped;
    if (this.strokeGain && this.audioContext) {
      this.strokeGain.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
  }

  /**
   * Set the default X-axis gain for continuous stroke sound (0-1).
   */
  public setStrokeXGain(gain: number): void {
    const clamped = Math.max(0, Math.min(1, gain));
    this.defaultStrokeXGain = clamped;
    if (this.strokeGainX && this.audioContext) {
      this.strokeGainX.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
  }
}
