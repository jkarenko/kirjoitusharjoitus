import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../services/StorageManager';
import { Exercise } from '../../types/Exercise';

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockStorage: { [key: string]: string } = {};
  let mockExercise: Exercise;

  beforeEach(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(key => mockStorage[key]),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = value.toString();
      }),
      removeItem: vi.fn(key => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
      length: 0,
      key: vi.fn(() => ''),
    };

    storageManager = new StorageManager();

    mockExercise = {
      id: '1',
      name: 'Test Exercise',
      createdAt: new Date(),
      adultDrawing: {
        strokes: [],
        totalTime: 0,
        width: 300,
        height: 300,
        created: Date.now(),
      },
      attempts: [],
      highestScore: null,
    };
  });

  it('should initialize correctly', async () => {
    await storageManager.initialize();
    expect(storageManager).toBeDefined();
  });

  it('should save and load exercises', async () => {
    await storageManager.initialize();
    await storageManager.saveExercise(mockExercise);

    const exercises = storageManager.getExercises();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].id).toBe(mockExercise.id);
  });

  it('should update existing exercise', async () => {
    await storageManager.initialize();
    await storageManager.saveExercise(mockExercise);

    const updatedExercise = {
      ...mockExercise,
      name: 'Updated Exercise',
    };

    await storageManager.updateExercise(updatedExercise);
    const exercises = storageManager.getExercises();
    expect(exercises[0].name).toBe('Updated Exercise');
  });

  it('should delete exercise', async () => {
    await storageManager.initialize();
    await storageManager.saveExercise(mockExercise);
    await storageManager.deleteExercise(mockExercise.id);

    const exercises = storageManager.getExercises();
    expect(exercises).toHaveLength(0);
  });

  it('should handle exercise result saving', async () => {
    await storageManager.initialize();
    await storageManager.saveExercise(mockExercise);

    const scoreResult = {
      totalScore: 85,
      categories: {
        accuracy: 4,
        strokes: 4,
        timing: 5,
        overall: 4,
      },
      feedback: 'Great job!',
      timestamp: Date.now(),
    };

    await storageManager.saveExerciseResult(mockExercise, scoreResult);
    const exercise = storageManager.getExerciseById(mockExercise.id);

    expect(exercise?.highestScore).toBeDefined();
    expect(exercise?.highestScore?.totalScore).toBe(85);
  });

  it('should handle errors when saving exercise', async () => {
    await storageManager.initialize();

    // Mock localStorage to throw error
    global.localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage full');
    });

    await expect(storageManager.saveExercise(mockExercise)).rejects.toThrow(
      'Failed to save exercise'
    );
  });

  it('should handle nonexistent exercise updates', async () => {
    await storageManager.initialize();

    const nonexistentExercise = {
      ...mockExercise,
      id: 'nonexistent',
    };

    await expect(storageManager.updateExercise(nonexistentExercise)).rejects.toThrow(
      'Exercise with ID nonexistent not found'
    );
  });

  it('should handle exercise result saving for nonexistent exercise', async () => {
    await storageManager.initialize();

    // Clear storage - no exercises
    mockStorage = {};

    const scoreResult = {
      totalScore: 85,
      categories: {
        accuracy: 4,
        strokes: 4,
        timing: 5,
        overall: 4,
      },
      feedback: 'Great job!',
      timestamp: Date.now(),
    };

    await expect(storageManager.saveExerciseResult(mockExercise, scoreResult)).rejects.toThrow(
      'Exercise with ID 1 not found'
    );
  });

  it('should handle settings save and load', async () => {
    await storageManager.initialize();

    const settings = {
      volume: 0.5,
      muted: false,
      username: 'Test User',
    };

    await storageManager.saveSettings(settings);
    const loadedSettings = storageManager.getSettings();

    expect(loadedSettings.volume).toBe(settings.volume);
    expect(loadedSettings.muted).toBe(settings.muted);
    expect(loadedSettings.username).toBe(settings.username);
  });
});
