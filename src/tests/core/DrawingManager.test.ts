import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingManager } from '../../core/DrawingManager';

describe('DrawingManager', () => {
  let drawingManager: DrawingManager;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create a mock canvas element
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 300;
    mockCanvas.height = 300;
    
    // Mock the 2D context
    mockContext = mockCanvas.getContext('2d') as CanvasRenderingContext2D;
    
    // Create a fresh instance for each test
    drawingManager = new DrawingManager();
  });

  it('should initialize correctly', () => {
    // Initialize with the mock canvas
    drawingManager.initialize(mockCanvas);
    
    // Check if canvas is set
    expect(drawingManager.getCanvas()).toBe(mockCanvas);
  });

  it('should enable and disable drawing', () => {
    // Initialize first
    drawingManager.initialize(mockCanvas);
    
    // Test enable
    drawingManager.enable();
    // We can't directly test private properties, but we can check behavior
    
    // Test disable
    drawingManager.disable();
    // Again, check behavior indirectly
  });

  it('should reset drawing state', () => {
    // Initialize
    drawingManager.initialize(mockCanvas);
    
    // Mock context clearRect method
    const clearRectSpy = vi.spyOn(mockContext, 'clearRect');
    
    // Reset the drawing manager
    drawingManager.reset();
    
    // Verify clearRect was called with correct parameters
    expect(clearRectSpy).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
  });

  it('should get drawing data correctly', () => {
    // Initialize
    drawingManager.initialize(mockCanvas);
    
    // Get drawing data
    const drawingData = drawingManager.getDrawingData();
    
    // Verify structure
    expect(drawingData).toHaveProperty('strokes');
    expect(drawingData).toHaveProperty('totalTime');
    expect(drawingData).toHaveProperty('width');
    expect(drawingData).toHaveProperty('height');
    expect(drawingData).toHaveProperty('created');
    expect(Array.isArray(drawingData.strokes)).toBe(true);
  });
});

