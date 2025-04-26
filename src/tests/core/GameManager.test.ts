import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameManager } from '../../core/GameManager';
import { StorageManager } from '../../services/StorageManager';
import { AudioManager } from '../../services/AudioManager';
import { UIManager } from '../../services/UIManager';
import { DrawingManager } from '../../core/DrawingManager';
import { ScoreManager } from '../../core/ScoreManager';

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockStorageManager: StorageManager;
  let mockAudioManager: AudioManager;
  let mockUIManager: UIManager;
  let mockDrawingManager: DrawingManager;
  let mockScoreManager: ScoreManager;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    mockStorageManager = new StorageManager();
    mockAudioManager = new AudioManager();
    mockUIManager = new UIManager();
    mockDrawingManager = new DrawingManager();
    mockScoreManager = new ScoreManager();

    // Mock initialize methods
    vi.spyOn(mockStorageManager, 'initialize').mockResolvedValue();
    vi.spyOn(mockAudioManager, 'initialize').mockResolvedValue();
    vi.spyOn(mockUIManager, 'initialize').mockImplementation(() => {});
    vi.spyOn(mockDrawingManager, 'initialize').mockImplementation(() => {});
    vi.spyOn(mockScoreManager, 'initialize').mockImplementation(() => {});

    // Mock UI methods
    vi.spyOn(mockUIManager, 'showView').mockImplementation(() => {});
    (vi.spyOn(mockUIManager, 'on') as any).mockImplementation(() => {});
    vi.spyOn(mockAudioManager, 'playWelcomeSound').mockImplementation(() => {});

    gameManager = new GameManager({
      storageManager: mockStorageManager,
      audioManager: mockAudioManager,
      uiManager: mockUIManager,
      drawingManager: mockDrawingManager,
      scoreManager: mockScoreManager,
      container,
    });
  });

  it('should initialize correctly', async () => {
    await gameManager.initialize();
    expect(mockStorageManager.initialize).toHaveBeenCalled();
    expect(mockAudioManager.initialize).toHaveBeenCalled();
    expect(mockUIManager.initialize).toHaveBeenCalled();
  });

  it('should show welcome screen', () => {
    gameManager.showWelcomeScreen();
    expect(mockUIManager.showView).toHaveBeenCalledWith('welcome');
    expect(mockAudioManager.playWelcomeSound).toHaveBeenCalled();
  });

  it('should handle create exercise flow', async () => {
    // Mock event handlers
    const createHandler = vi.fn();
    (mockUIManager.on as any).mockImplementation((event: string, handler: Function) => {
      if (event === 'create-exercise-clicked') {
        createHandler.mockImplementation(handler as any);
      }
      return mockUIManager;
    });

    // Mock drawing manager
    vi.spyOn(mockDrawingManager, 'reset').mockImplementation(() => {});
    vi.spyOn(mockDrawingManager, 'enable').mockImplementation(() => {});

    await gameManager.initialize();
    createHandler();

    expect(mockUIManager.showView).toHaveBeenCalledWith('create-exercise');
  });

  it('should handle attempt completion', async () => {
    const doneHandler = vi.fn();
    (mockUIManager.on as any).mockImplementation((event: string, handler: Function) => {
      if (event === 'done-button-clicked') {
        doneHandler.mockImplementation(handler as any);
      }
      return mockUIManager;
    });

    // Mock methods
    vi.spyOn(mockDrawingManager, 'disable').mockImplementation(() => {});
    vi.spyOn(mockDrawingManager, 'getDrawingData').mockReturnValue({
      strokes: [],
      totalTime: 0,
      width: 300,
      height: 300,
      created: Date.now(),
    });
    vi.spyOn(mockAudioManager, 'playAttemptCompleteSound').mockImplementation(() => {});
    vi.spyOn(mockUIManager, 'animateDrawingToHistory').mockImplementation(() => {});

    // Set up mock state
    (gameManager as any).state = {
      currentExercise: {
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
      },
      currentAttempt: 1,
      isPlaying: true,
      isCreatingExercise: false,
    };

    await gameManager.initialize();

    // Call the mock handler directly
    (gameManager as any).handleDoneButtonClicked();

    expect(mockDrawingManager.disable).toHaveBeenCalled();
    expect(mockDrawingManager.getDrawingData).toHaveBeenCalled();
    expect(mockAudioManager.playAttemptCompleteSound).toHaveBeenCalled();
  });

  it('should handle score display', async () => {
    const mockScore = {
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

    // Mock required methods
    vi.spyOn(mockScoreManager, 'calculateScore').mockReturnValue(mockScore);
    vi.spyOn(mockStorageManager, 'saveExerciseResult').mockResolvedValue();
    vi.spyOn(mockUIManager, 'showScoreScreen').mockImplementation(() => {});
    vi.spyOn(mockAudioManager, 'playFanfareSound').mockImplementation(() => {});

    // Set up mock state
    (gameManager as any).state = {
      currentExercise: {
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
      },
      currentAttempt: 5,
      isPlaying: true,
      isCreatingExercise: false,
    };

    // Call private method
    (gameManager as any).showScoreScreen();

    expect(mockUIManager.showScoreScreen).toHaveBeenCalledWith(mockScore);
    expect(mockAudioManager.playFanfareSound).toHaveBeenCalled();
  });

  it('should handle back to menu from create exercise', async () => {
    // Set up state
    (gameManager as any).state = {
      currentExercise: null,
      currentAttempt: 0,
      isPlaying: false,
      isCreatingExercise: true,
    };

    // Mock cleanup methods
    vi.spyOn(mockUIManager, 'cleanupAnimations').mockImplementation(() => {});
    vi.spyOn(mockUIManager, 'resetHistoryDisplay').mockImplementation(() => {});

    // Call handler
    (gameManager as any).handleBackToMenu();

    expect(mockUIManager.showView).toHaveBeenCalledWith('welcome');
    expect(mockUIManager.cleanupAnimations).toHaveBeenCalled();
    expect(mockUIManager.resetHistoryDisplay).toHaveBeenCalled();
    expect((gameManager as any).state.isCreatingExercise).toBe(false);
  });

  it('should handle try again with current exercise', async () => {
    const mockExercise = {
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

    // Set up state with mock exercise
    (gameManager as any).state = {
      currentExercise: mockExercise,
      currentAttempt: 5,
      isPlaying: true,
      isCreatingExercise: false,
    };

    // Mock required methods
    vi.spyOn(mockUIManager, 'resetHistoryDisplay').mockImplementation(() => {});
    vi.spyOn(mockUIManager, 'showExampleDrawing').mockImplementation(() => {});
    vi.spyOn(mockUIManager, 'on').mockImplementation(() => mockUIManager);
    vi.spyOn(mockUIManager, 'off').mockImplementation(() => mockUIManager);

    // Call handler
    (gameManager as any).handleTryAgain();

    expect(mockUIManager.resetHistoryDisplay).toHaveBeenCalled();
    expect(mockUIManager.showExampleDrawing).toHaveBeenCalledWith(mockExercise.adultDrawing);
    expect((gameManager as any).state.currentAttempt).toBe(0);
  });

  it('should handle save exercise errors', async () => {
    // Mock storage error
    vi.spyOn(mockDrawingManager, 'getDrawingData').mockReturnValue({
      strokes: [],
      totalTime: 0,
      width: 300,
      height: 300,
      created: Date.now(),
    });
    vi.spyOn(mockStorageManager, 'saveExercise').mockRejectedValue(new Error('Storage error'));
    vi.spyOn(mockUIManager, 'showError').mockImplementation(() => {});

    // Call handler
    await (gameManager as any).handleSaveExercise({ name: 'Test Exercise' });

    expect(mockUIManager.showError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save exercise')
    );
  });
});
