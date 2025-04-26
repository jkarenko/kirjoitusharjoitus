import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '../../services/AudioManager';

describe('AudioManager', () => {
  let audioManager: AudioManager;
  
  beforeEach(() => {
    // Mock Web Audio API
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        type: 'sine',
        frequency: { value: 0 },
        onended: null,
        disconnect: vi.fn()
      })),
      createGain: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        gain: { 
          value: 0,
          linearRampToValueAtTime: vi.fn(),
          setValueAtTime: vi.fn()
        },
        disconnect: vi.fn()
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    }));
    
    audioManager = new AudioManager();
  });

  it('should initialize correctly', async () => {
    await audioManager.initialize();
    expect(audioManager).toBeDefined();
  });

  it('should set volume correctly', async () => {
    await audioManager.initialize();
    audioManager.setVolume(0.5);
    // If no errors are thrown, the test passes
  });

  it('should set muted state correctly', async () => {
    await audioManager.initialize();
    audioManager.setMuted(true);
    audioManager.setMuted(false);
    // If no errors are thrown, the test passes
  });

  it('should play sounds without errors', async () => {
    await audioManager.initialize();
    audioManager.playStrokeSound();
    audioManager.playAttemptStartSound();
    audioManager.playAttemptCompleteSound();
    audioManager.playFanfareSound();
    audioManager.playWelcomeSound();
    audioManager.playStarSound(3);
    // If no errors are thrown, the test passes
  });

  it('should clean up resources properly', async () => {
    await audioManager.initialize();
    audioManager.cleanup();
    // If no errors are thrown, the test passes
  });
});

