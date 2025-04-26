import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIManager } from '../../services/UIManager';
import { ViewType } from '../../types/Exercise';

// Type for accessing private members in tests
interface UIManagerPrivate {
  state: {
    currentAttempt: number;
    currentView: ViewType;
    isTransitioning: boolean;
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string;
  };
  components: {
    container: HTMLElement | null;
    views: Map<ViewType, HTMLElement>;
    drawingCanvas: HTMLCanvasElement | null;
    constraintBox: HTMLElement | null;
    historyDisplay: HTMLElement | null;
    buttons: Map<string, HTMLButtonElement>;
  };
}

describe('UIManager', () => {
  let uiManager: UIManager;
  let container: HTMLElement;

  beforeEach(() => {
    // Reset the document body
    document.body.innerHTML = '';

    // Create container element
    container = document.createElement('div');
    container.id = 'game-container';
    document.body.appendChild(container);

    // Initialize UI manager
    uiManager = new UIManager();
  });

  it('should initialize correctly', () => {
    uiManager.initialize(container);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should show different views', () => {
    uiManager.initialize(container);

    // Mock view elements to avoid full DOM creation
    const welcomeView = document.createElement('div');
    welcomeView.className = 'view welcome-view';
    
    const attemptView = document.createElement('div');
    attemptView.className = 'view attempt-view';

    // Add to container
    container.appendChild(welcomeView);
    container.appendChild(attemptView);

    // Add to views map using proper type casting
    (uiManager as unknown as UIManagerPrivate).components.views.set('welcome', welcomeView);
    (uiManager as unknown as UIManagerPrivate).components.views.set('attempt', attemptView);

    // Test view switching
    uiManager.showView('welcome');
    expect(welcomeView.style.display).not.toBe('none');

    uiManager.showView('attempt');
    expect(attemptView.style.display).not.toBe('none');
    expect(welcomeView.style.display).toBe('none');
  });

  it('should handle events correctly', () => {
    const eventSpy = vi.fn();
    uiManager.on('test-event', eventSpy);
    uiManager.emit('test-event', 'test-data');

    expect(eventSpy).toHaveBeenCalledWith('test-data');
  });

  it('should set up attempt view correctly', () => {
    // Create constraint box element
    const constraintBox = document.createElement('div');
    constraintBox.className = 'constraint-box';
    container.appendChild(constraintBox);

    // Create attempt counter element
    const attemptCounter = document.createElement('span');
    attemptCounter.id = 'current-attempt';

    // Set constraint box in components
    (uiManager as unknown as UIManagerPrivate).components.constraintBox = constraintBox;

    // Test setup attempt view
    const boxSize = { width: 200, height: 200 };
    uiManager.setupAttemptView(2, boxSize);

    expect((uiManager as unknown as UIManagerPrivate).state.currentAttempt).toBe(2);
  });
});
