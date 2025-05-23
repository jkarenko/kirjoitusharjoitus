/**
 * UIManager class
 * Handles the game's user interface and state management
 */

import { EventEmitter } from '../utils/EventEmitter';
import { ViewType, Exercise, DrawingData, ScoreResult, ConstraintBoxSize } from '../types/Exercise';
import { AnimationController } from '../utils/AnimationController';
import { ExampleDrawingAnimator } from '../utils/ExampleDrawingAnimator';

/**
 * Game UI state
 */
interface GameState {
  currentView: ViewType;
  currentAttempt: number;
  isTransitioning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

/**
 * UI configuration for responsive layout
 */
interface UIConfiguration {
  isMobile: boolean;
  isLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  historyHeight: number;
  constraintBoxSize: ConstraintBoxSize;
}

/**
 * Animation state
 */
interface AnimationState {
  exampleAnimationInProgress: boolean;
  attemptAnimationInProgress: boolean;
  scoreAnimationInProgress: boolean;
}

/**
 * View components container
 */
interface ViewComponents {
  container: HTMLElement | null;
  views: Map<ViewType, HTMLElement>;
  drawingCanvas: HTMLCanvasElement | null;
  constraintBox: HTMLElement | null;
  historyDisplay: HTMLElement | null;
  buttons: Map<string, HTMLButtonElement>;
}

export class UIManager extends EventEmitter {
  // State
  private state: GameState = {
    currentView: 'welcome',
    currentAttempt: 0,
    isTransitioning: false,
    isLoading: false,
    hasError: false,
    errorMessage: '',
  };

  // Configuration
  private config: UIConfiguration = {
    isMobile: false,
    isLandscape: false,
    viewportWidth: 0,
    viewportHeight: 0,
    pixelRatio: 1,
    historyHeight: 120,
    constraintBoxSize: { width: 300, height: 300 },
  };

  // Animation state
  private animation: AnimationState = {
    exampleAnimationInProgress: false,
    attemptAnimationInProgress: false,
    scoreAnimationInProgress: false,
  };

  // UI Components
  private components: ViewComponents = {
    container: null,
    views: new Map(),
    drawingCanvas: null,
    constraintBox: null,
    historyDisplay: null,
    buttons: new Map(),
  };

  // History of drawing attempts
  private historyItems: HTMLElement[] = [];

  private exampleAnimationController: AnimationController | null = null;
  private exampleAnimator: ExampleDrawingAnimator | null = null;

  /**
   * Initialize the UI manager
   * @param container - Container element for the game
   */
  public initialize(container: HTMLElement): void {
    console.log('UIManager: initialize - starting');
    this.components.container = container;

    // Create view elements
    console.log('UIManager: initialize - creating view elements');
    this.createViewElements();
    console.log('UIManager: initialize - created views:', Array.from(this.components.views.keys()));

    // Set up event listeners
    this.setupEventListeners();

    // Configure for current device
    this.updateConfiguration();

    // Reset currentView so that showView('welcome') will always execute
    (this.state as GameState).currentView = 'welcome' as ViewType;
    this.showView('welcome');
    console.log('UIManager: initialize - forcibly hiding exercise-list view');
    const listView = this.components.views.get('exercise-list');
    if (listView) {
      listView.style.display = 'none';
      listView.classList.remove('active');
    }

    // Emit initialized event
    this.emit('ui-initialized');
  }

  /**
   * Create view elements for each game view
   */
  private createViewElements(): void {
    console.log('UIManager: createViewElements - started');
    if (!this.components.container) {
      return;
    }

    // Clear container
    this.components.container.innerHTML = '';

    // Create views
    console.log('UIManager: createViewElements - creating welcome view');
    this.createWelcomeView();
    console.log('UIManager: createViewElements - creating attempt view');
    this.createAttemptView();
    console.log('UIManager: createViewElements - creating create-exercise view');
    this.createCreateExerciseView();
    console.log('UIManager: createViewElements - creating score view');
    this.createScoreView();
    console.log('UIManager: createViewElements - creating exercise-list view');
    this.createExerciseListView();

    // Append views to container
    this.components.views.forEach(view => {
      this.components.container?.appendChild(view);
    });
    console.log('UIManager: createViewElements - appended all views');
  }

  /**
   * Create welcome view
   */
  private createWelcomeView(): void {
    const view = document.createElement('div');
    view.className = 'view welcome-view';
    view.innerHTML = `
      <div class="welcome-content">
        <h1>Handwriting Exercise</h1>
        <p>Practice your handwriting skills</p>
        <div class="button-container">
          <button class="btn btn-primary" id="btn-create-template">Create New Template</button>
          <button class="btn btn-secondary" id="btn-load-template">Load Saved Template</button>
        </div>
      </div>
    `;

    this.components.views.set('welcome', view);

    // Add button references
    const createButton = view.querySelector('#btn-create-template') as HTMLButtonElement;
    const loadButton = view.querySelector('#btn-load-template') as HTMLButtonElement;

    if (createButton) {
      this.components.buttons.set('create-template', createButton);
      createButton.addEventListener('click', () => {
        this.emit('create-template-clicked');
      });
    }

    if (loadButton) {
      this.components.buttons.set('load-template', loadButton);
      loadButton.addEventListener('click', () => {
        this.emit('load-template-clicked');
      });
    }
  }

  /**
   * Create attempt view for drawing practice
   */
  private createAttemptView(): void {
    const view = document.createElement('div');
    view.className = 'view attempt-view';
    view.innerHTML = `
      <div class="history-display"></div>
      <div class="drawing-area">
        <div class="example-display">
          <div class="example-container"></div>
        </div>
        <div class="constraint-box"></div>
        <canvas class="drawing-canvas"></canvas>
      </div>
      <div class="controls">
        <button class="btn btn-done" id="btn-done">Done</button>
      </div>
      <div class="attempt-info">
        <div class="attempt-counter">Attempt <span id="current-attempt">1</span>/5</div>
      </div>
    `;

    this.components.views.set('attempt', view);

    // Store references to important elements
    this.components.historyDisplay = view.querySelector('.history-display');
    this.components.drawingCanvas = view.querySelector('.drawing-canvas');
    this.components.constraintBox = view.querySelector('.constraint-box');

    // Add button references
    const doneButton = view.querySelector('#btn-done') as HTMLButtonElement;
    if (doneButton) {
      this.components.buttons.set('done', doneButton);
      doneButton.addEventListener('click', () => {
        this.emit('done-button-clicked');
      });
    }
  }

  /**
   * Create exercise creation view
   */
  private createCreateExerciseView(): void {
    const view = document.createElement('div');
    view.className = 'view create-exercise-view';
    view.innerHTML = `
      <div class="create-exercise-content">
        <h2>Create New Exercise</h2>
        <p>Draw an example for the child to practice</p>
        <div class="drawing-container">
          <canvas class="drawing-canvas"></canvas>
        </div>
        <div class="exercise-form">
          <div class="form-group">
            <label for="exercise-name">Exercise Name:</label>
            <input type="text" id="exercise-name" placeholder="Enter a name for this exercise">
          </div>
        </div>
        <div class="controls">
          <button class="btn btn-secondary" id="btn-cancel-exercise">Cancel</button>
          <button class="btn btn-primary" id="btn-save-exercise">Save Exercise</button>
        </div>
      </div>
    `;

    this.components.views.set('create-exercise', view);

    // Add button references
    const cancelButton = view.querySelector('#btn-cancel-exercise') as HTMLButtonElement;
    const saveButton = view.querySelector('#btn-save-exercise') as HTMLButtonElement;

    if (cancelButton) {
      this.components.buttons.set('cancel-exercise', cancelButton);
      cancelButton.addEventListener('click', () => {
        this.emit('cancel-exercise-clicked');
      });
    }

    if (saveButton) {
      this.components.buttons.set('save-exercise', saveButton);
      saveButton.addEventListener('click', () => {
        const nameInput = view.querySelector('#exercise-name') as HTMLInputElement;
        const name = nameInput?.value.trim() || 'Untitled Exercise';
        this.emit('save-exercise-clicked', { name });
      });
    }
  }

  /**
   * Create score view
   */
  private createScoreView(): void {
    const view = document.createElement('div');
    view.className = 'view score-view';
    view.innerHTML = `
      <div class="score-content">
        <h2>Great Job!</h2>
        <div class="score-display">
          <div class="total-score">
            <span class="score-number">0</span>/100
          </div>
          <div class="feedback-message">
            Well done! Keep practicing!
          </div>
          <div class="star-ratings">
            <div class="rating-category">
              <div class="category-name">Accuracy</div>
              <div class="stars accuracy-stars"></div>
            </div>
            <div class="rating-category">
              <div class="category-name">Strokes</div>
              <div class="stars strokes-stars"></div>
            </div>
            <div class="rating-category">
              <div class="category-name">Timing</div>
              <div class="stars timing-stars"></div>
            </div>
            <div class="rating-category">
              <div class="category-name">Overall</div>
              <div class="stars overall-stars"></div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button class="btn btn-secondary" id="btn-try-again">Try Again</button>
          <button class="btn btn-primary" id="btn-back-to-menu">Back to Menu</button>
        </div>
      </div>
    `;

    this.components.views.set('score', view);

    // Add button references
    const tryAgainButton = view.querySelector('#btn-try-again') as HTMLButtonElement;
    const menuButton = view.querySelector('#btn-back-to-menu') as HTMLButtonElement;

    if (tryAgainButton) {
      this.components.buttons.set('try-again', tryAgainButton);
      tryAgainButton.addEventListener('click', () => {
        this.emit('try-again-clicked');
      });
    }

    if (menuButton) {
      this.components.buttons.set('back-to-menu', menuButton);
      menuButton.addEventListener('click', () => {
        this.emit('back-to-menu-clicked');
      });
    }
  }

  /**
   * Create exercise list view
   */
  private createExerciseListView(): void {
    const view = document.createElement('div');
    view.className = 'view exercise-list-view';
    view.style.display = 'none';
    view.innerHTML = `
      <h2>Load Saved Template</h2>
      <div class="controls">
        <button class="btn btn-secondary" id="btn-back">Cancel</button>
      </div>
      <div class="exercise-list">
        <!-- Exercise items will be inserted dynamically -->
      </div>
    `;

    this.components.views.set('exercise-list', view);

    // Add button references
    const backButton = view.querySelector('#btn-back') as HTMLButtonElement;

    if (backButton) {
      this.components.buttons.set('back', backButton);
      backButton.addEventListener('click', () => {
        this.emit('back-clicked');
      });
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Device orientation change
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.updateConfiguration();
    this.updateLayout();
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    setTimeout(() => {
      this.updateConfiguration();
      this.updateLayout();
    }, 300); // Slight delay to ensure dimensions are updated
  }

  /**
   * Update configuration based on current window/device
   */
  private updateConfiguration(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.config.viewportWidth = width;
    this.config.viewportHeight = height;
    this.config.isLandscape = width > height;
    this.config.isMobile = width < 768;
    this.config.pixelRatio = window.devicePixelRatio || 1;
    this.config.historyHeight = this.config.isMobile ? 100 : 120;

    // Update constraint box size based on viewport
    const minDimension = Math.min(width, height);
    const baseSize = minDimension * 0.6; // 60% of smaller dimension

    this.config.constraintBoxSize = {
      width: baseSize,
      height: baseSize,
    };
  }

  /**
   * Update layout based on current configuration
   */
  private updateLayout(): void {
    // Update drawing canvas dimensions
    this.updateCanvasDimensions();

    // Update constraint box size
    this.updateConstraintBoxSize();

    // Update history display
    this.updateHistoryDisplay();
  }

  /**
   * Update canvas dimensions to match device pixel ratio
   */
  private updateCanvasDimensions(): void {
    if (!this.components.drawingCanvas) {
      return;
    }

    const canvas = this.components.drawingCanvas;
    const container = canvas.parentElement;

    if (!container) {
      return;
    }

    // Get container dimensions
    const rect = container.getBoundingClientRect();

    // Set canvas dimensions with pixel ratio adjustment
    canvas.width = rect.width * this.config.pixelRatio;
    canvas.height = rect.height * this.config.pixelRatio;

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  /**
   * Update constraint box size based on current attempt
   */
  private updateConstraintBoxSize(): void {
    if (!this.components.constraintBox) {
      return;
    }

    const box = this.components.constraintBox;

    // Set size based on configuration and current attempt
    const size = this.calculateConstraintBoxSize(this.state.currentAttempt);

    box.style.width = `${size.width}px`;
    box.style.height = `${size.height}px`;

    // Center the box in the drawing area
    const drawingArea = box.parentElement;
    if (drawingArea) {
      const areaRect = drawingArea.getBoundingClientRect();
      box.style.left = `${(areaRect.width - size.width) / 2}px`;
      box.style.top = `${(areaRect.height - size.height) / 2}px`;
    }
  }

  /**
   * Update history display area
   */
  private updateHistoryDisplay(): void {
    if (!this.components.historyDisplay) {
      return;
    }

    // Set height based on configuration
    this.components.historyDisplay.style.height = `${this.config.historyHeight}px`;
  }

  /**
   * Show a specific view
   * @param viewType - Type of view to show
   */
  public showView(viewType: ViewType): void {
    console.log(`UIManager: showView called with viewType='${viewType}'`);
    // Don't change views during transition
    if (this.state.isTransitioning) {
      return;
    }

    // Get view element
    const view = this.components.views.get(viewType);

    if (!view) {
      console.error(`View not found: ${viewType}`);
      return;
    }

    // If it's already the current view, do nothing
    // if (this.state.currentView === viewType) return;

    // Hide all views
    this.components.views.forEach((v, type) => {
      if (type !== viewType) {
        v.style.display = 'none';
        v.classList.remove('active');
      }
    });

    // Show the selected view
    view.style.display = 'flex';

    // Trigger reflow to ensure transitions work
    void view.offsetWidth;

    // Add active class for transitions
    view.classList.add('active');

    // Update state
    this.state.currentView = viewType;

    // If showing attempt view, update attempt counter
    if (viewType === 'attempt') {
      const attemptCounter = document.getElementById('current-attempt');
      if (attemptCounter) {
        attemptCounter.textContent = this.state.currentAttempt.toString();
      }
    }

    // Emit view changed event
    this.emit('view-changed', viewType);
  }

  /**
   * Transition to a view with animation
   * @param viewType - Type of view to transition to
   */
  public transitionToView(viewType: ViewType): void {
    if (this.state.isTransitioning) {
      return;
    }

    this.state.isTransitioning = true;

    // Get current and next view elements
    const currentView = this.components.views.get(this.state.currentView);
    const nextView = this.components.views.get(viewType);

    if (!currentView || !nextView) {
      console.error('Cannot transition: view not found');
      this.state.isTransitioning = false;
      return;
    }

    // Prepare next view
    nextView.style.display = 'flex';
    nextView.style.opacity = '0';
    nextView.style.transform = 'translateY(20px)';

    // Trigger reflow
    void nextView.offsetWidth;

    // Animate current view out
    currentView.style.opacity = '0';
    currentView.style.transform = 'translateY(-20px)';

    // Animate next view in
    nextView.style.opacity = '1';
    nextView.style.transform = 'translateY(0)';

    // After animation completes
    setTimeout(() => {
      // Hide current view
      currentView.style.display = 'none';
      currentView.classList.remove('active');

      // Reset transforms
      currentView.style.transform = '';
      currentView.style.opacity = '';

      // Mark next view as active
      nextView.classList.add('active');

      // Update state
      this.state.currentView = viewType;
      this.state.isTransitioning = false;

      // If showing attempt view, update attempt counter
      if (viewType === 'attempt') {
        const attemptCounter = document.getElementById('current-attempt');
        if (attemptCounter) {
          attemptCounter.textContent = this.state.currentAttempt.toString();
        }
      }

      // Emit view changed event
      this.emit('view-changed', viewType);
    }, 500); // Match the CSS transition duration
  }

  /**
   * Set up attempt view for current attempt
   * @param attemptNumber - Current attempt number (1-5)
   * @param boxSize - Size of constraint box
   */
  public setupAttemptView(attemptNumber: number, boxSize: ConstraintBoxSize): void {
    // Update state
    this.state.currentAttempt = attemptNumber;

    // Update constraint box size
    this.config.constraintBoxSize = boxSize;
    this.updateConstraintBoxSize();

    // Update attempt counter
    const attemptCounter = document.getElementById('current-attempt');
    if (attemptCounter) {
      attemptCounter.textContent = attemptNumber.toString();
    }

    // Update canvas dimensions
    this.updateCanvasDimensions();
  }

  /**
   * Show example drawing with animation
   * @param drawing - Drawing data to display
   */
  public showExampleDrawing(drawing: DrawingData): void {
    // Update configuration to reset base constraint box size
    this.updateConfiguration();
    // Reset any previous scaling/shrinking animations and state
    this.cleanupAnimations();
    // Clear any inline transforms on the constraint box
    if (this.components.constraintBox) {
      this.components.constraintBox.style.transform = '';
    }
    if (this.animation.exampleAnimationInProgress) {
      return;
    }
    this.animation.exampleAnimationInProgress = true;

    // Use constraint box as container for example
    const box = this.components.constraintBox;
    const history = this.components.historyDisplay;
    if (!box || !history) {
      this.animation.exampleAnimationInProgress = false;
      return;
    }

    // Position and size constraint box as first-attempt dimensions
    const baseBox = this.config.constraintBoxSize;
    box.style.width = `${baseBox.width}px`;
    box.style.height = `${baseBox.height}px`;
    const drawingArea = box.parentElement;
    if (drawingArea) {
      const areaRect = drawingArea.getBoundingClientRect();
      box.style.left = `${(areaRect.width - baseBox.width) / 2}px`;
      box.style.top = `${(areaRect.height - baseBox.height) / 2}px`;
    }

    // Clear any existing content
    box.innerHTML = '';

    // Create canvas inside the constraint box
    const canvas = document.createElement('canvas');
    canvas.className = 'example-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    box.appendChild(canvas);

    // Setup high-DPI dimensions
    const rect = box.getBoundingClientRect();
    const { pixelRatio } = this.config;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;

    const context = canvas.getContext('2d');
    if (!context) {
      this.animation.exampleAnimationInProgress = false;
      return;
    }
    context.scale(pixelRatio, pixelRatio);

    // Compute drawing bounds
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    drawing.strokes.forEach(stroke => {
      stroke.points.forEach(pt => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      });
    });
    const originalWidth = maxX - minX;
    const originalHeight = maxY - minY;
    if (originalWidth === 0 || originalHeight === 0) {
      this.animation.exampleAnimationInProgress = false;
      return;
    }

    // Determine scale & offset
    const canvasW = rect.width;
    const canvasH = rect.height;
    const scale = Math.min((canvasW / originalWidth) * 0.8, (canvasH / originalHeight) * 0.8);
    const offsetX = (canvasW - originalWidth * scale) / 2;
    const offsetY = (canvasH - originalHeight * scale) / 2;

    // Transform all points in drawing for scaled/centered animation
    const transformedDrawing = {
      ...drawing,
      strokes: drawing.strokes.map(stroke => ({
        ...stroke,
        points: stroke.points.map(pt => ({
          x: offsetX + (pt.x - minX) * scale,
          y: offsetY + (pt.y - minY) * scale,
          timestamp: pt.timestamp,
          ...(pt.pressure !== undefined ? { pressure: pt.pressure } : {}),
        })),
      })),
    };

    // Setup animator and controller
    if (this.exampleAnimationController) {
      this.exampleAnimationController.stop();
    }
    this.exampleAnimationController = new AnimationController();
    this.exampleAnimator = new ExampleDrawingAnimator({
      ctx: context,
      emitter: this,
      controller: this.exampleAnimationController,
      pointIntervalMs: 20,
      strokePauseMs: 200,
    });

    // Animate using the new animator
    this.exampleAnimator.play(transformedDrawing).then(() => {
      canvas.classList.add('animate-to-corner');
      // Center shrink so it stays fully inside the constraint box
      canvas.style.transformOrigin = 'center center';
      canvas.style.transform = 'scale(0.25)';
      // After shrink animation, remove canvas and add thumbnail to history
      setTimeout(() => {
        // Remove the example canvas so it no longer sits in the constraint box
        if (canvas.parentElement === box) {
          box.removeChild(canvas);
        }

        const exampleItem = document.createElement('div');
        exampleItem.className = 'history-item example-item';
        const historyCanvas = document.createElement('canvas');
        const histRect = history.getBoundingClientRect();
        const thumbSize = histRect.height * 0.7;
        this.renderDrawingToCanvas(drawing, historyCanvas, thumbSize, thumbSize, pixelRatio);
        exampleItem.appendChild(historyCanvas);
        const label = document.createElement('div');
        label.className = 'history-label';
        label.textContent = 'Example';
        exampleItem.appendChild(label);
        history.appendChild(exampleItem);
        this.animation.exampleAnimationInProgress = false;
        this.emit('example-animation-complete');
      }, 1000);
    });
  }

  /**
   * Helper to render drawing data to a canvas at any size
   */
  private renderDrawingToCanvas(
    drawing: DrawingData,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    pixelRatio: number
  ): void {
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any transforms
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(pixelRatio, pixelRatio);

    // Find bounding box
    let minX = Number.MAX_VALUE,
      maxX = Number.MIN_VALUE,
      minY = Number.MAX_VALUE,
      maxY = Number.MIN_VALUE;
    for (const stroke of drawing.strokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    const originalWidth = maxX - minX;
    const originalHeight = maxY - minY;
    if (originalWidth === 0 || originalHeight === 0) {
      return;
    }
    const scale = Math.min((width / originalWidth) * 0.8, (height / originalHeight) * 0.8);
    const offsetX = (width - originalWidth * scale) / 2;
    const offsetY = (height - originalHeight * scale) / 2;
    for (const stroke of drawing.strokes) {
      if (stroke.points.length < 2) {
        continue;
      }
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const firstPoint = stroke.points[0];
      ctx.moveTo(offsetX + (firstPoint.x - minX) * scale, offsetY + (firstPoint.y - minY) * scale);
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(offsetX + (point.x - minX) * scale, offsetY + (point.y - minY) * scale);
      }
      ctx.stroke();
    }
  }

  /**
   * Animate drawing to history and shrink it
   * @param attemptNumber - Attempt number
   * @param drawing - Drawing data for the attempt
   */
  public animateDrawingToHistory(attemptNumber: number, drawing: DrawingData): void {
    if (this.animation.attemptAnimationInProgress) {
      return;
    }

    this.animation.attemptAnimationInProgress = true;

    // Take a snapshot of the current canvas
    if (!this.components.drawingCanvas) {
      this.animation.attemptAnimationInProgress = false;
      return;
    }

    // Create a clone of the canvas
    const originalCanvas = this.components.drawingCanvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    tempCanvas.style.width = originalCanvas.style.width;
    tempCanvas.style.height = originalCanvas.style.height;
    tempCanvas.style.position = 'absolute';
    tempCanvas.style.top = '0';
    tempCanvas.style.left = '0';
    tempCanvas.style.zIndex = '10';

    // Get context and copy content
    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) {
      this.animation.attemptAnimationInProgress = false;
      return;
    }

    tempContext.drawImage(originalCanvas, 0, 0);

    // Get drawing area
    const drawingArea = originalCanvas.parentElement;
    if (!drawingArea) {
      this.animation.attemptAnimationInProgress = false;
      return;
    }

    // Add canvas to drawing area
    drawingArea.appendChild(tempCanvas);

    // Animate to history
    setTimeout(() => {
      // Add animation class
      tempCanvas.classList.add('animate-to-history');

      // Get history display and drawing area rectangles
      const historyRect = this.components.historyDisplay!.getBoundingClientRect();
      const drawingRect = drawingArea.getBoundingClientRect();
      const drawingAreaRect = drawingArea.getBoundingClientRect();

      // Determine thumbnail dimensions (70% of history height)
      const thumbWidth = historyRect.height * 0.7;
      const thumbHeight = historyRect.height * 0.7;

      // Calculate scale to fit drawing into thumbnail
      const scaleX = thumbWidth / drawingRect.width;
      const scaleY = thumbHeight / drawingRect.height;
      const scale = Math.min(scaleX, scaleY);

      // Compute horizontal offset in history display for this item
      const itemIndex = this.historyItems.length;
      const gap = 10; // same as margin-right
      const xInHistory = itemIndex * (thumbWidth + gap);

      // Calculate translation offsets relative to drawing area container
      const offsetX =
        historyRect.left -
        drawingAreaRect.left +
        xInHistory +
        (thumbWidth - drawingRect.width * scale) / 2;
      const offsetY =
        historyRect.top -
        drawingAreaRect.top +
        (historyRect.height - drawingRect.height * scale) / 2;

      // Apply shrink-and-move animation
      tempCanvas.style.transition = 'transform 0.8s ease-in-out';
      tempCanvas.style.transformOrigin = 'top left';
      tempCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

      // After animation completes
      setTimeout(() => {
        // Create history item
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item attempt-item';

        // Create smaller canvas for history
        const historyCanvas = document.createElement('canvas');
        this.renderDrawingToCanvas(
          drawing,
          historyCanvas,
          thumbWidth,
          thumbHeight,
          this.config.pixelRatio
        );
        historyItem.appendChild(historyCanvas);

        // Add attempt number label
        const label = document.createElement('div');
        label.className = 'history-label';
        label.textContent = `Attempt ${attemptNumber}`;
        historyItem.appendChild(label);

        // Add to history display
        if (this.components.historyDisplay) {
          this.components.historyDisplay.appendChild(historyItem);
          this.historyItems.push(historyItem);
        }

        // Remove temporary canvas
        drawingArea.removeChild(tempCanvas);

        // Clear original canvas
        const originalContext = originalCanvas.getContext('2d');
        if (originalContext) {
          originalContext.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        }

        // Complete animation
        this.animation.attemptAnimationInProgress = false;
        this.emit('attempt-animation-complete', attemptNumber);
      }, 1000); // Animation duration
    }, 100); // Short delay before starting animation
  }

  /**
   * Display score results
   * @param score - Score result to display
   */
  public showScoreScreen(score: ScoreResult): void {
    // Switch to score view
    this.showView('score');

    // Update score display elements
    const scoreView = this.components.views.get('score');
    if (!scoreView) {
      return;
    }

    // Update total score
    const scoreNumber = scoreView.querySelector('.score-number');
    if (scoreNumber) {
      scoreNumber.textContent = score.totalScore.toString();
    }

    // Update feedback message
    const feedbackMessage = scoreView.querySelector('.feedback-message');
    if (feedbackMessage) {
      feedbackMessage.textContent = score.feedback;
    }

    // Clear existing stars
    const starContainers = scoreView.querySelectorAll('.stars');
    starContainers.forEach(container => {
      container.innerHTML = '';
    });

    // Animate stars with a delay between categories
    setTimeout(() => {
      this.displayStars('.accuracy-stars', score.categories.accuracy);

      setTimeout(() => {
        this.displayStars('.strokes-stars', score.categories.strokes);

        setTimeout(() => {
          this.displayStars('.timing-stars', score.categories.timing);

          setTimeout(() => {
            this.displayStars('.overall-stars', score.categories.overall);
          }, 300);
        }, 300);
      }, 300);
    }, 500);
  }
  /**
   * Handle exercise selection from the list
   * @param exercise - Selected exercise
   */
  private handleExerciseSelection(exercise: Exercise): void {
    // Emit event for exercise selection
    this.emit('exercise-selected', exercise);
  }

  /**
   * Clean up any ongoing animations
   */
  public cleanupAnimations(): void {
    // Reset animation flags
    this.animation.exampleAnimationInProgress = false;
    this.animation.attemptAnimationInProgress = false;
    this.animation.scoreAnimationInProgress = false;

    // Remove any temporary animation elements
    if (this.components.container) {
      const tempElements = this.components.container.querySelectorAll(
        '.animate-to-corner, .animate-to-history'
      );
      tempElements.forEach(element => {
        if (element.parentElement) {
          element.parentElement.removeChild(element);
        }
      });
    }
  }

  /**
   * Reset the history display
   */
  public resetHistoryDisplay(): void {
    if (!this.components.historyDisplay) {
      return;
    }

    // Clear the history display
    this.components.historyDisplay.innerHTML = '';

    // Reset history items array
    this.historyItems = [];
  }

  /**
   * Update the attempt counter
   * @param attemptNumber - Current attempt number
   */
  public updateAttemptCounter(attemptNumber: number): void {
    // Update state
    this.state.currentAttempt = attemptNumber;

    // Update DOM element
    const attemptCounter = document.getElementById('current-attempt');
    if (attemptCounter) {
      attemptCounter.textContent = attemptNumber.toString();
    }
  }

  /**
   * Display a confirmation message when exercise is saved
   */
  public showExerciseSavedConfirmation(): void {
    if (!this.components.container) {
      return;
    }

    // Create confirmation overlay
    const confirmationOverlay = document.createElement('div');
    confirmationOverlay.className = 'confirmation-overlay';
    confirmationOverlay.innerHTML = `
      <div class="confirmation-content">
        <div class="confirmation-icon">✓</div>
        <div class="confirmation-message">Exercise Saved!</div>
      </div>
    `;

    // Add to container
    this.components.container.appendChild(confirmationOverlay);

    // Force reflow for animation
    void confirmationOverlay.offsetWidth;

    // Show with fade in
    confirmationOverlay.style.opacity = '1';

    // Remove after animation
    setTimeout(() => {
      confirmationOverlay.style.opacity = '0';

      setTimeout(() => {
        if (confirmationOverlay.parentElement) {
          confirmationOverlay.parentElement.removeChild(confirmationOverlay);
        }
      }, 300);
    }, 1500);
  }

  /**
   * Display stars for a category with animation
   * @param selector - CSS selector for star container
   * @param starCount - Number of stars (1-5)
   */
  private displayStars(selector: string, starCount: number): void {
    const container = document.querySelector(selector) as HTMLElement;
    if (!container) {
      return;
    }

    // Clamp star count to valid range
    const validStarCount = Math.max(1, Math.min(5, starCount));

    // Create stars
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('div');
      star.className = i < validStarCount ? 'star star-filled' : 'star star-empty';

      // Add with delay for animation
      setTimeout(() => {
        container.appendChild(star);

        // Trigger animation after a small delay
        setTimeout(() => {
          star.classList.add('star-animated');

          // Emit event for audio feedback
          if (i < validStarCount) {
            this.emit('star-added', i + 1);
          }
        }, 50);
      }, i * 150);
    }
  }

  /**
   * Calculate constraint box size based on attempt number
   * @param attemptNumber - Current attempt number (1-5)
   * @returns Constraint box size
   */
  private calculateConstraintBoxSize(attemptNumber: number): ConstraintBoxSize {
    // Base size from configuration
    const baseSize = this.config.constraintBoxSize;

    // Reduce size with each attempt
    // Start with 100% of base size and reduce by 15% for each attempt
    const scaleFactor = Math.max(0.4, 1 - (attemptNumber - 1) * 0.15);

    return {
      width: baseSize.width * scaleFactor,
      height: baseSize.height * scaleFactor,
    };
  }

  /**
   * Set loading state
   * @param message - Optional loading message
   */
  public setLoading(message: string = 'Loading...'): void {
    if (!this.components.container) {
      return;
    }

    // Don't add multiple loading overlays
    this.clearLoading();

    // Update state
    this.state.isLoading = true;

    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">${message}</div>
    `;

    // Add to container
    this.components.container.appendChild(loadingOverlay);

    // Force reflow for animation
    void loadingOverlay.offsetWidth;

    // Show with fade in
    (loadingOverlay as HTMLElement).style.opacity = '1';
  }

  /**
   * Clear loading state
   */
  public clearLoading(): void {
    if (!this.components.container) {
      return;
    }

    // Update state
    this.state.isLoading = false;

    // Find existing loading overlay
    const loadingOverlay = this.components.container.querySelector('.loading-overlay');
    if (!loadingOverlay) {
      return;
    }

    // Fade out
    (loadingOverlay as HTMLElement).style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      if (loadingOverlay.parentElement) {
        loadingOverlay.parentElement.removeChild(loadingOverlay);
      }
    }, 300);
  }

  /**
   * Show error message
   * @param message - Error message
   */
  public showError(message: string): void {
    if (!this.components.container) {
      return;
    }

    // Update state
    this.state.hasError = true;
    this.state.errorMessage = message;

    // Create error overlay if it doesn't exist
    let errorOverlay = this.components.container.querySelector('.error-overlay');

    if (!errorOverlay) {
      errorOverlay = document.createElement('div');
      errorOverlay.className = 'error-overlay';

      // Create error content
      errorOverlay.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          <button class="btn btn-primary error-button">OK</button>
        </div>
      `;

      // Add event listener for OK button
      const okButton = errorOverlay.querySelector('.error-button');
      if (okButton) {
        okButton.addEventListener('click', () => {
          this.clearError();
        });
      }

      // Add to container
      this.components.container.appendChild(errorOverlay);

      // Force reflow for animation
      void (errorOverlay as HTMLElement).offsetWidth;

      // Show with fade in
      (errorOverlay as HTMLElement).style.opacity = '1';
    } else {
      // Update existing error message
      const errorMessage = errorOverlay.querySelector('.error-message');
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }

    // Emit error event
    this.emit('error-shown', message);
  }

  /**
   * Clear error message
   */
  public clearError(): void {
    if (!this.components.container) {
      return;
    }

    // Update state
    this.state.hasError = false;
    this.state.errorMessage = '';

    // Find existing error overlay
    const errorOverlay = this.components.container.querySelector('.error-overlay');
    if (!errorOverlay) {
      return;
    }

    // Fade out
    (errorOverlay as HTMLElement).style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      if (errorOverlay.parentElement) {
        errorOverlay.parentElement.removeChild(errorOverlay);
      }
    }, 300);

    // Emit error cleared event
    this.emit('error-cleared');
  }

  /**
   * Update exercise list
   * @param exercises - Available exercises
   * @param thumbnails - Map of exercise ID to thumbnail URL
   */
  public updateExerciseList(
    exercises: Exercise[],
    thumbnails: { [exerciseId: string]: string }
  ): void {
    console.log(`UIManager: updateExerciseList with ${exercises.length} templates`);
    // Get the exercise list container
    const exerciseListView = this.components.views.get('exercise-list');
    if (!exerciseListView) {
      return;
    }

    const exerciseList = exerciseListView.querySelector('.exercise-list');
    if (!exerciseList) {
      return;
    }

    // Clear existing items
    exerciseList.innerHTML = '';

    if (exercises.length === 0) {
      // Show no exercises message
      const noExercises = document.createElement('div');
      noExercises.className = 'no-exercises-message';
      noExercises.textContent = 'No templates found. Create a new template first.';
      exerciseList.appendChild(noExercises);
      return;
    }

    // Create exercise items
    exercises.forEach(exercise => {
      const exerciseItem = document.createElement('div');
      exerciseItem.className = 'exercise-item';
      exerciseItem.dataset.id = exercise.id;

      // Create thumbnail container
      const thumbnailContainer = document.createElement('div');
      thumbnailContainer.className = 'exercise-thumbnail';

      // Add thumbnail if available
      if (thumbnails[exercise.id]) {
        const img = document.createElement('img');
        img.src = thumbnails[exercise.id];
        img.alt = exercise.name;
        thumbnailContainer.appendChild(img);
      } else {
        // Default placeholder
        thumbnailContainer.innerHTML = '<div class="thumbnail-placeholder">?</div>';
      }

      // Create exercise details
      const details = document.createElement('div');
      details.className = 'exercise-details';

      // Exercise name
      const name = document.createElement('div');
      name.className = 'exercise-name';
      name.textContent = exercise.name;
      details.appendChild(name);

      // Exercise date
      const date = document.createElement('div');
      date.className = 'exercise-date';
      date.textContent = exercise.createdAt.toLocaleDateString();
      details.appendChild(date);

      // High score if available
      if (exercise.highestScore) {
        const score = document.createElement('div');
        score.className = 'exercise-score';

        // Create star container
        const stars = document.createElement('div');
        stars.className = 'exercise-stars';

        // Add stars based on overall rating
        const starCount = exercise.highestScore.categories.overall;
        for (let i = 0; i < 5; i++) {
          const star = document.createElement('span');
          star.className = i < starCount ? 'star-mini star-filled' : 'star-mini star-empty';
          stars.appendChild(star);
        }

        score.appendChild(stars);
        details.appendChild(score);
      }

      // Assemble exercise item
      exerciseItem.appendChild(thumbnailContainer);
      exerciseItem.appendChild(details);

      // Add click handler
      exerciseItem.addEventListener('click', () => {
        this.handleExerciseSelection(exercise);
      });

      // Add to list
      exerciseList.appendChild(exerciseItem);
    });
  }
}
