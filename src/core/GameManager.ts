/**
 * GameManager class
 * Central coordinator for the handwriting exercise game
 */

import { DrawingManager } from './DrawingManager';
import { ScoreManager } from './ScoreManager';
import { StorageManager } from '../services/StorageManager';
import { AudioManager } from '../services/AudioManager';
import { UIManager } from '../services/UIManager';
import { Exercise, ConstraintBoxSize, ScoreResult } from '../types/Exercise';

/**
 * GameManager options
 */
interface GameManagerOptions {
  storageManager: StorageManager;
  audioManager: AudioManager;
  uiManager: UIManager;
  drawingManager: DrawingManager;
  scoreManager: ScoreManager;
  container: HTMLElement;
}

/**
 * Game state
 */
interface GameState {
  currentExercise: Exercise | null;
  currentAttempt: number;
  isPlaying: boolean;
  isCreatingExercise: boolean;
}

export class GameManager {
  // Core managers
  private storageManager: StorageManager;
  private audioManager: AudioManager;
  private uiManager: UIManager;
  private drawingManager: DrawingManager;
  private scoreManager: ScoreManager;

  // Game state
  private state: GameState = {
    currentExercise: null,
    currentAttempt: 0,
    isPlaying: false,
    isCreatingExercise: false,
  };

  // Constants
  private readonly MAX_ATTEMPTS = 5;

  /**
   * Create a new GameManager
   * @param options - Options for initializing the game manager
   */
  constructor(options: GameManagerOptions) {
    this.storageManager = options.storageManager;
    this.audioManager = options.audioManager;
    this.uiManager = options.uiManager;
    this.drawingManager = options.drawingManager;
    this.scoreManager = options.scoreManager;

    // Bind methods to maintain context
    this.handleCreateExercise = this.handleCreateExercise.bind(this);
    this.handleLoadExercise = this.handleLoadExercise.bind(this);
    this.handleExerciseSelected = this.handleExerciseSelected.bind(this);
    this.handleSaveExercise = this.handleSaveExercise.bind(this);
    this.handleCancelExercise = this.handleCancelExercise.bind(this);
    this.handleDoneButtonClicked = this.handleDoneButtonClicked.bind(this);
    this.handleAttemptAnimationComplete = this.handleAttemptAnimationComplete.bind(this);
    this.handleBackToMenu = this.handleBackToMenu.bind(this);
    this.handleTryAgain = this.handleTryAgain.bind(this);
    this.startNextAttempt = this.startNextAttempt.bind(this);
  }

  /**
   * Initialize the game manager
   */
  public async initialize(): Promise<void> {
    console.log('Initializing game manager...');

    // Set up event listeners
    this.setupEventListeners();

    // Set up drawing canvas
    this.setupDrawingCanvas();

    return Promise.resolve();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // UI Manager events
    this.uiManager.on('create-template-clicked', this.handleCreateExercise);
    this.uiManager.on('load-template-clicked', this.handleLoadExercise);
    this.uiManager.on('exercise-selected', (exercise: unknown) =>
      this.handleExerciseSelected(exercise as Exercise)
    );
    this.uiManager.on('save-exercise-clicked', (data: unknown) =>
      this.handleSaveExercise(data as { name: string })
    );
    this.uiManager.on('cancel-exercise-clicked', this.handleCancelExercise);
    this.uiManager.on('done-button-clicked', this.handleDoneButtonClicked);
    this.uiManager.on('attempt-animation-complete', (attemptNumber: unknown) =>
      this.handleAttemptAnimationComplete(attemptNumber as number)
    );
    this.uiManager.on('back-to-menu-clicked', this.handleBackToMenu);
    this.uiManager.on('try-again-clicked', this.handleTryAgain);
    this.uiManager.on('back-clicked', this.handleBackToMenu);
    this.uiManager.on('star-added', (starCount: unknown) => {
      this.audioManager.playStarSound(starCount as number);
    });

    // Drawing Manager events
    this.drawingManager.on('stroke-completed', () => {
      this.audioManager.playStrokeSound();
    });
  }

  /**
   * Setup drawing canvas
   */
  private setupDrawingCanvas(): void {
    // Set initial canvas for drawing manager
    const canvas = document.querySelector('.drawing-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.drawingManager.setCanvas(canvas);
    }
  }

  /**
   * Show the welcome screen
   */
  public showWelcomeScreen(): void {
    // Reset state
    this.state.currentExercise = null;
    this.state.currentAttempt = 0;
    this.state.isPlaying = false;
    this.state.isCreatingExercise = false;

    // Show welcome view
    this.uiManager.showView('welcome');

    // Play welcome sound
    this.audioManager.playWelcomeSound();
  }

  /**
   * Handle create exercise button click
   */
  private handleCreateExercise(): void {
    console.log('GameManager: handleCreateExercise - user requested to create new template');
    // Update state
    this.state.isCreatingExercise = true;

    // Switch to create exercise view
    this.uiManager.showView('create-exercise');

    // Reset drawing manager
    this.drawingManager.reset();

    // Get drawing canvas from the UI
    const canvas = document.querySelector(
      '.create-exercise-view .drawing-canvas'
    ) as HTMLCanvasElement;
    if (canvas) {
      // Ensure canvas is sized to its container for correct drawing resolution
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        this.drawingManager.setCanvas(canvas);
        this.drawingManager.enable();
      }
    }
  }

  /**
   * Handle load exercise button click
   */
  private handleLoadExercise(): void {
    console.log('GameManager: handleLoadExercise - fetching saved templates');
    // Get exercises from storage
    const exercises = this.storageManager.getExercises();
    console.log(
      `GameManager: handleLoadExercise - loaded ${exercises.length} templates`,
      exercises
    );

    // Get thumbnails
    const thumbnails: { [exerciseId: string]: string } = {};
    exercises.forEach(exercise => {
      const thumbnail = this.storageManager.getThumbnail(exercise.id);
      if (thumbnail) {
        thumbnails[exercise.id] = thumbnail;
      }
    });

    // Update exercise list in UI
    this.uiManager.updateExerciseList(exercises, thumbnails);

    // Show exercise list view
    this.uiManager.showView('exercise-list');
  }

  /**
   * Handle exercise selection
   * @param exercise - Selected exercise
   */
  public handleExerciseSelected(exercise: Exercise): void {
    console.log(
      `GameManager: handleExerciseSelected - starting game for template id=${exercise.id} name="${exercise.name}"`
    );
    // Update state
    this.state.currentExercise = exercise;
    this.state.currentAttempt = 0;
    this.state.isPlaying = true;

    // Reset history display
    this.uiManager.resetHistoryDisplay();

    // Show example drawing
    this.uiManager.showExampleDrawing(exercise.adultDrawing);

    // After animation, start first attempt
    this.uiManager.on('example-animation-complete', () => {
      this.startNextAttempt();
      // Remove this one-time listener
      this.uiManager.off('example-animation-complete', this.startNextAttempt);
    });

    // Switch to attempt view
    this.uiManager.showView('attempt');
  }

  /**
   * Start the next attempt
   */
  private startNextAttempt(): void {
    this.state.currentAttempt++;

    if (this.state.currentAttempt > this.MAX_ATTEMPTS) {
      this.showScoreScreen();
      return;
    }

    // Calculate constraint box size for current attempt
    const boxSize = this.calculateConstraintBoxSize(this.state.currentAttempt);

    // Set up attempt view
    this.uiManager.setupAttemptView(this.state.currentAttempt, boxSize);

    // Get drawing canvas from the UI
    const canvas = document.querySelector('.attempt-view .drawing-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.drawingManager.setCanvas(canvas);
      this.drawingManager.reset();
      this.drawingManager.enable();
    }

    // Play attempt start sound
    this.audioManager.playAttemptStartSound();
  }

  /**
   * Handle done button click
   */
  private handleDoneButtonClicked(): void {
    if (!this.state.currentExercise) return;

    // Disable drawing
    this.drawingManager.disable();

    // Get drawing data
    const drawingData = this.drawingManager.getDrawingData();

    // Save attempt
    if (
      this.state.currentExercise &&
      this.state.currentAttempt > 0 &&
      this.state.currentAttempt <= this.MAX_ATTEMPTS
    ) {
      // Ensure attempts array has enough slots
      while (this.state.currentExercise.attempts.length < this.state.currentAttempt) {
        this.state.currentExercise.attempts.push({
          strokes: [],
          totalTime: 0,
          width: 0,
          height: 0,
          created: Date.now(),
        });
      }

      // Save current attempt
      this.state.currentExercise.attempts[this.state.currentAttempt - 1] = drawingData;
    }

    // Play sound
    this.audioManager.playAttemptCompleteSound();

    // Animate drawing to history
    this.uiManager.animateDrawingToHistory(this.state.currentAttempt, drawingData);
  }

  /**
   * Handle attempt animation complete
   * @param attemptNumber - Completed attempt number
   */
  private handleAttemptAnimationComplete(attemptNumber: number): void {
    // Start next attempt or show score
    if (attemptNumber >= this.MAX_ATTEMPTS) {
      this.showScoreScreen();
    } else {
      this.startNextAttempt();
    }
  }

  /**
   * Show score screen after all attempts
   */
  private showScoreScreen(): void {
    if (!this.state.currentExercise) return;

    // Calculate score
    const score = this.scoreManager.calculateScore(
      this.state.currentExercise.adultDrawing,
      this.state.currentExercise.attempts
    );

    // Save score to exercise
    this.saveExerciseResult(this.state.currentExercise, score);

    // Show score screen
    this.uiManager.showScoreScreen(score);

    // Play fanfare sound
    this.audioManager.playFanfareSound();
  }

  /**
   * Save exercise result
   * @param exercise - Exercise with attempts
   * @param score - Score result
   */
  private async saveExerciseResult(exercise: Exercise, score: ScoreResult): Promise<void> {
    try {
      await this.storageManager.saveExerciseResult(exercise, score);
    } catch (error) {
      console.error('Failed to save exercise result:', error);
      this.uiManager.showError('Failed to save your score');
    }
  }

  /**
   * Handle save exercise button click
   * @param data - Exercise data with name
   */
  private handleSaveExercise(data: { name: string }): void {
    // Get drawing data
    const drawingData = this.drawingManager.getDrawingData();

    // Create new exercise
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: data.name,
      createdAt: new Date(),
      adultDrawing: drawingData,
      attempts: [],
      highestScore: null,
    };

    // Save exercise
    this.storageManager
      .saveExercise(exercise)
      .then(() => {
        // Show confirmation
        this.uiManager.showExerciseSavedConfirmation();

        // Back to welcome screen
        setTimeout(() => {
          this.state.isCreatingExercise = false;
          this.uiManager.showView('welcome');
        }, 1500);
      })
      .catch(error => {
        console.error('Failed to save exercise:', error);
        this.uiManager.showError('Failed to save exercise');
      });
  }

  /**
   * Handle cancel exercise button click
   */
  private handleCancelExercise(): void {
    // Update state
    this.state.isCreatingExercise = false;

    // Return to welcome screen
    this.uiManager.showView('welcome');
  }

  /**
   * Handle back to menu button click
   */
  private handleBackToMenu(): void {
    // Reset state
    this.state.currentExercise = null;
    this.state.currentAttempt = 0;
    this.state.isPlaying = false;
    this.state.isCreatingExercise = false;

    // Clean up UI
    this.uiManager.cleanupAnimations();
    this.uiManager.resetHistoryDisplay();

    // Return to welcome screen
    this.uiManager.showView('welcome');
  }

  /**
   * Handle try again button click
   */
  private handleTryAgain(): void {
    if (!this.state.currentExercise) return;

    // Keep the current exercise, reset attempt
    this.state.currentAttempt = 0;

    // Clean up UI
    this.uiManager.resetHistoryDisplay();

    // Show example drawing again
    this.uiManager.showExampleDrawing(this.state.currentExercise.adultDrawing);

    // After animation, start first attempt
    this.uiManager.on('example-animation-complete', () => {
      this.startNextAttempt();
      // Remove this one-time listener
      this.uiManager.off('example-animation-complete', this.startNextAttempt);
    });

    // Switch to attempt view
    this.uiManager.showView('attempt');
  }

  /**
   * Calculate constraint box size for a given attempt
   * @param attemptNumber - Current attempt number (1-5)
   * @returns Constraint box size
   */
  private calculateConstraintBoxSize(attemptNumber: number): ConstraintBoxSize {
    // Base size (adjust based on screen size)
    const baseSize = 300;

    // Scale factor reduces by 15% for each attempt (100%, 85%, 70%, 55%, 40%)
    const scaleFactor = Math.max(0.4, 1 - (attemptNumber - 1) * 0.15);

    return {
      width: baseSize * scaleFactor,
      height: baseSize * scaleFactor,
    };
  }

  /**
   * Start the game with a specific exercise (template)
   * @param exercise - Selected exercise
   */
  public startGameWithExercise(exercise: Exercise): void {
    this.handleExerciseSelected(exercise);
  }
}
