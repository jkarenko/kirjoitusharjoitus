/**
 * DrawingManager class
 * Manages drawing operations on the canvas
 */

import { EventEmitter } from '../utils/EventEmitter';
import { StrokeData, DrawingData } from '../types/Exercise';

export class DrawingManager extends EventEmitter {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private isDrawing: boolean = false;
  private isEnabled: boolean = false;
  private currentStroke: StrokeData | null = null;
  private strokes: StrokeData[] = [];
  private strokeCounter: number = 0;
  private startTime: number = 0;
  private endTime: number = 0;
  private strokeColor: string = '#000000';
  private strokeWidth: number = 3;
  
  /**
   * Initialize the drawing manager and canvas
   * @param canvasElement - Optional canvas element to use instead of creating one
   */
  public initialize(canvasElement?: HTMLCanvasElement): void {
    if (canvasElement) {
      this.canvas = canvasElement;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.classList.add('drawing-canvas');
    }
    
    this.context = this.canvas.getContext('2d');
    
    if (!this.context) {
      throw new Error('Could not get canvas context');
    }
    
    this.setupEventListeners();
    this.reset();
  }
  
  /**
   * Set up event listeners for touch/mouse events
   */
  private setupEventListeners(): void {
    if (!this.canvas) {
      return;
    }
    
    // Touch events for mobile/tablet
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Mouse events for desktop
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }
  
  /**
   * Reset the drawing manager
   */
  public reset(): void {
    this.strokes = [];
    this.strokeCounter = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.isDrawing = false;
    this.currentStroke = null;
    
    if (this.canvas && this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  /**
   * Enable drawing
   */
  public enable(): void {
    this.isEnabled = true;
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'auto';
    }
  }
  
  /**
   * Disable drawing
   */
  public disable(): void {
    this.isEnabled = false;
    this.isDrawing = false;
    this.currentStroke = null;
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'none';
    }
  }
  
  /**
   * Set stroke color
   * @param color - CSS color string
   */
  public setStrokeColor(color: string): void {
    this.strokeColor = color;
  }
  
  /**
   * Set stroke width
   * @param width - Width in pixels
   */
  public setStrokeWidth(width: number): void {
    this.strokeWidth = width;
  }
  
  /**
   * Handle touch start event
   * @param event - Touch event
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    this.startStroke(touch.clientX, touch.clientY, touch.force);
  }
  
  /**
   * Handle touch move event
   * @param event - Touch event
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled || !this.isDrawing) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    this.continueStroke(touch.clientX, touch.clientY, touch.force);
  }
  
  /**
   * Handle touch end event
   * @param event - Touch event
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    this.endStroke();
  }
  
  /**
   * Handle mouse down event
   * @param event - Mouse event
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    this.startStroke(event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse move event
   * @param event - Mouse event
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isEnabled || !this.isDrawing) return;
    
    event.preventDefault();
    this.continueStroke(event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse up event
   * @param event - Mouse event
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    this.endStroke();
  }
  
  /**
   * Start a new stroke
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param pressure - Optional pressure value
   */
  private startStroke(x: number, y: number, pressure: number = 1): void {
    if (!this.canvas || !this.context) return;
    
    // Get canvas-relative coordinates
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const now = Date.now();
    
    // If this is the first stroke, record start time
    if (this.strokes.length === 0) {
      this.startTime = now;
    }
    
    this.isDrawing = true;
    
    // Create a new stroke
    this.currentStroke = {
      id: this.strokeCounter++,
      points: [{
        x: canvasX,
        y: canvasY,
        timestamp: now,
        pressure: pressure
      }],
      startTime: now,
      endTime: now,
      color: this.strokeColor,
      width: this.strokeWidth
    };
    
    // Setup drawing style
    this.context.lineWidth = this.strokeWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.strokeStyle = this.strokeColor;
    this.context.beginPath();
    this.context.moveTo(canvasX, canvasY);
    
    // Emit stroke start event
    this.emit('stroke-started', this.currentStroke);
  }
  
  /**
   * Continue the current stroke
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param pressure - Optional pressure value
   */
  private continueStroke(x: number, y: number, pressure: number = 1): void {
    if (!this.canvas || !this.context || !this.currentStroke) return;
    
    // Get canvas-relative coordinates
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const now = Date.now();
    
    // Add point to the current stroke
    this.currentStroke.points.push({
      x: canvasX,
      y: canvasY,
      timestamp: now,
      pressure: pressure
    });
    
    // Draw line to the new point
    this.context.lineTo(canvasX, canvasY);
    this.context.stroke();
    this.context.beginPath();
    this.context.moveTo(canvasX, canvasY);
    
    // Emit point added event
    this.emit('point-added', {
      x: canvasX, 
      y: canvasY, 
      timestamp: now, 
      pressure
    });
  }
  
  /**
   * End the current stroke
   */
  private endStroke(): void {
    if (!this.currentStroke) return;
    
    const now = Date.now();
    this.currentStroke.endTime = now;
    this.endTime = now;
    
    // Add the completed stroke to the strokes array
    this.strokes.push(this.currentStroke);
    
    this.isDrawing = false;
    this.currentStroke = null;
    
    // Emit stroke completed event
    this.emit('stroke-completed', this.strokes[this.strokes.length - 1]);
  }
  
  /**
   * Set the canvas element for drawing
   * @param canvas - Canvas element
   */
  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.setupEventListeners();
  }
  
  /**
   * Get the current canvas element
   */
  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
  
  /**
   * Get drawing data
   */
  public getDrawingData(): DrawingData {
    return {
      strokes: [...this.strokes],
      totalTime: this.endTime - this.startTime,
      width: this.canvas?.width || 0,
      height: this.canvas?.height || 0,
      created: Date.now()
    };
  }
}
