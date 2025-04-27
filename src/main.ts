/**
 * Handwriting Exercise Game
 * Main entry point for the application
 */

import { GameManager } from './core/GameManager';
import { DrawingManager } from './core/DrawingManager';
import { ScoreManager } from './core/ScoreManager';
import { StorageManager } from './services/StorageManager';
import { AudioManager } from './services/AudioManager';
import { UIManager } from './services/UIManager';

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  console.log('Initializing handwriting exercise game...');

  try {
    // Show loading screen
    showLoadingScreen();

    // Get container element
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
      throw new Error('Game container element not found');
    }

    // Initialize managers
    const storageManager = new StorageManager();
    const audioManager = new AudioManager();
    const drawingManager = new DrawingManager();
    const scoreManager = new ScoreManager();
    const uiManager = new UIManager();

    // Initialize storage first to load any saved data
    await storageManager.initialize();
    console.log('Storage manager initialized');

    // Initialize UI
    uiManager.initialize(gameContainer);
    console.log('UI manager initialized');

    // Initialize drawing
    drawingManager.initialize();
    console.log('Drawing manager initialized');

    // Initialize scoring
    scoreManager.initialize();
    console.log('Score manager initialized');

    // Initialize audio manager
    await audioManager.initialize();
    console.log('Audio manager initialized');

    // Setup tablet-specific behaviors
    setupTabletBehavior();

    // Instantiate GameManager and wire up all game flows through a single coordinator
    const gameManager = new GameManager({
      storageManager,
      audioManager,
      uiManager,
      drawingManager,
      scoreManager,
      container: gameContainer,
    });
    await gameManager.initialize();
    console.log('Game manager initialized');

    // Hide loading screen and show welcome view (UIManager does this by default)
    hideLoadingScreen();
    console.log('Main: init complete, explicitly showing welcome view');
    gameManager.showWelcomeScreen();
    console.log('Main: welcome view should now be visible and on top');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showErrorScreen(error);
  }
}

/**
 * Show loading screen
 */
function showLoadingScreen(): void {
  console.log('Main: showLoadingScreen');
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
  }
}

/**
 * Hide loading screen with fade-out animation
 */
function hideLoadingScreen(): void {
  console.log('Main: hideLoadingScreen');
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');

    // Remove after animation
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      console.log('Main: loading screen hidden, welcome view should be visible');
    }, 500);
  }
}

/**
 * Set up tablet-specific behaviors
 */
function setupTabletBehavior(): void {
  // Prevent default touch behaviors on canvas
  document.addEventListener(
    'touchstart',
    event => {
      if (event.target instanceof HTMLCanvasElement) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent scrolling when touching the canvas
  document.addEventListener(
    'touchmove',
    event => {
      if (event.target instanceof HTMLCanvasElement) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent context menu on long-press
  document.addEventListener('contextmenu', event => {
    event.preventDefault();
    return false;
  });

  // Handle visibility changes (app going to background)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause game or mute audio when app goes to background
      console.log('App went to background');
    } else {
      // Resume game when app comes back to foreground
      console.log('App came to foreground');
    }
  });
}

/**
 * Show error screen when initialization fails
 */
function showErrorScreen(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

  const container = document.getElementById('app');
  if (!container) return;

  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }

  // Create error screen
  const errorScreen = document.createElement('div');
  errorScreen.className = 'error-screen';
  errorScreen.innerHTML = `
    <div class="error-content">
      <h2>Oops! Something went wrong</h2>
      <p>${errorMessage}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
    </div>
  `;

  container.appendChild(errorScreen);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
