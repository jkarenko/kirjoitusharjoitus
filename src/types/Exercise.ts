/**
 * Types for the drawing exercise game
 */

/**
 * Point representing a position in a drawing
 */
export interface Point {
  x: number;
  y: number;
  timestamp: number; // Timestamp when point was recorded (ms)
  pressure?: number; // Pressure (if available on device)
}

/**
 * Data for a single stroke (continuous line)
 */
export interface StrokeData {
  id: number; // Unique ID for the stroke
  points: Point[]; // Points that make up the stroke
  startTime: number; // When the stroke started
  endTime: number; // When the stroke ended
  color: string; // Stroke color
  width: number; // Stroke width
}

/**
 * Complete drawing data with all strokes
 */
export interface DrawingData {
  strokes: StrokeData[];
  totalTime: number; // Total drawing time in ms
  width: number; // Canvas width when drawing was created
  height: number; // Canvas height when drawing was created
  created: number; // Timestamp when drawing was created
}

/**
 * Score categories for the exercise
 */
export interface ScoreCategories {
  accuracy: number; // 1-5 stars
  strokes: number; // 1-5 stars
  timing: number; // 1-5 stars
  overall: number; // 1-5 stars
}

/**
 * Complete score result for an exercise
 */
export interface ScoreResult {
  totalScore: number; // Overall score out of 100
  categories: ScoreCategories; // Star ratings by category
  feedback: string; // Feedback message
  timestamp: number; // When the score was calculated
}

/**
 * Exercise data structure
 */
export interface Exercise {
  id: string; // Unique identifier
  name: string; // Exercise name
  createdAt: Date; // When the exercise was created
  adultDrawing: DrawingData; // The example drawing created by adult
  attempts: DrawingData[]; // Child's attempts (max 5)
  highestScore: ScoreResult | null; // The highest score achieved
}

/**
 * View types for the UI manager
 */
export type ViewType = 'welcome' | 'attempt' | 'create-exercise' | 'score' | 'exercise-list';

/**
 * Constraint box size for drawing attempts
 */
export interface ConstraintBoxSize {
  width: number;
  height: number;
}

