import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../../core/ScoreManager';
import { DrawingData } from '../../types/Exercise';

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;
  let mockExampleDrawing: DrawingData;
  let mockAttemptDrawing: DrawingData;

  beforeEach(() => {
    scoreManager = new ScoreManager();
    
    // Setup mock drawings for testing
    mockExampleDrawing = {
      strokes: [
        {
          id: 1,
          points: [{ x: 0, y: 0, timestamp: 0 }, { x: 100, y: 100, timestamp: 100 }],
          startTime: 0,
          endTime: 100,
          color: '#000000',
          width: 2
        }
      ],
      totalTime: 100,
      width: 300,
      height: 300,
      created: Date.now()
    };
    
    mockAttemptDrawing = {
      // Similar structure but with slightly different values
      strokes: [
        {
          id: 1,
          points: [{ x: 0, y: 0, timestamp: 0 }, { x: 95, y: 95, timestamp: 90 }],
          startTime: 0,
          endTime: 90,
          color: '#000000',
          width: 2
        }
      ],
      totalTime: 90,
      width: 300,
      height: 300,
      created: Date.now()
    };
  });

  it('should initialize correctly', () => {
    scoreManager.initialize();
    expect(scoreManager).toBeDefined();
  });

  it('should calculate score correctly', () => {
    scoreManager.initialize();
    const score = scoreManager.calculateScore(mockExampleDrawing, [mockAttemptDrawing]);
    
    expect(score.totalScore).toBeGreaterThanOrEqual(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
    expect(score.categories.accuracy).toBeGreaterThanOrEqual(1);
    expect(score.categories.accuracy).toBeLessThanOrEqual(5);
    expect(score.categories.strokes).toBeGreaterThanOrEqual(1);
    expect(score.categories.strokes).toBeLessThanOrEqual(5);
    expect(score.categories.timing).toBeGreaterThanOrEqual(1);
    expect(score.categories.timing).toBeLessThanOrEqual(5);
    expect(score.categories.overall).toBeGreaterThanOrEqual(1);
    expect(score.categories.overall).toBeLessThanOrEqual(5);
    expect(score.feedback).toBeDefined();
    expect(typeof score.feedback).toBe('string');
  });
});

