/**
 * ScoreManager class
 * Handles the scoring system for comparing drawings
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  DrawingData,
  StrokeData,
  Point,
  ScoreResult,
  ScoreCategories,
  ConstraintBoxSize,
} from '../types/Exercise';

export class ScoreManager extends EventEmitter {
  // Constants for scoring
  private readonly MAX_SCORE = 100;

  // Weights for different scoring categories
  private readonly WEIGHTS = {
    accuracy: 0.5, // 50% of total score
    strokes: 0.25, // 25% of total score
    timing: 0.25, // 25% of total score
  };

  // Feedback templates
  private readonly FEEDBACK = {
    excellent: [
      'Excellent work! Your drawing is spot on!',
      'Amazing job! Your handwriting is fantastic!',
      "Perfect! You've mastered this drawing!",
    ],
    veryGood: [
      'Very good! Your drawing looks great!',
      'Impressive work! Keep practicing!',
      "Great job! You're getting better each time!",
    ],
    good: [
      "Good job! You're making progress!",
      'Nice work! Keep practicing!',
      "Well done! You're improving!",
    ],
    fair: [
      'Nice try! Keep practicing!',
      'Good effort! Try to follow the example more closely!',
      'Keep going! Practice makes perfect!',
    ],
    needsWork: [
      "Keep practicing! You'll get better each time!",
      'Good start! Try to follow the example more carefully!',
      "Don't give up! Every practice helps you improve!",
    ],
  };

  /**
   * Initialize the score manager
   */
  public initialize(): void {
    // No initialization needed for now
  }

  /**
   * Calculate scores for a completed exercise
   * @param example - The adult's example drawing
   * @param attempts - The child's attempt drawings (typically 5)
   * @param constraintBoxes - Optional array of constraint boxes for each attempt
   * @returns Score result with stars and feedback
   */
  public calculateScore(
    example: DrawingData,
    attempts: DrawingData[],
    constraintBoxes?: ConstraintBoxSize[]
  ): ScoreResult {
    // We'll focus on the final attempt for the primary score
    const finalAttempt = attempts[attempts.length - 1];

    if (!finalAttempt) {
      throw new Error('No attempts provided for scoring');
    }

    // 1. Calculate accuracy score (path similarity)
    const accuracyScore = this.calculateAccuracyScore(
      example,
      finalAttempt,
      constraintBoxes?.[attempts.length - 1]
    );
    console.log('accuracyScore', accuracyScore);

    // 2. Calculate strokes score (number and length of strokes)
    const strokesScore = this.calculateStrokesScore(example, finalAttempt);
    console.log('strokesScore', strokesScore);

    // 3. Calculate timing score (rhythm and pace of drawing)
    const timingScore = this.calculateTimingScore(example, finalAttempt);
    console.log('timingScore', timingScore);

    // 4. Calculate overall score
    const overallScore = Math.round(
      (accuracyScore * this.WEIGHTS.accuracy +
        strokesScore * this.WEIGHTS.strokes +
        timingScore * this.WEIGHTS.timing) *
        this.MAX_SCORE
    );
    console.log('overallScore', overallScore);

    // 5. Convert normalized scores (0-1) to star ratings (1-5)
    const categories: ScoreCategories = {
      accuracy: this.normalizedScoreToStars(accuracyScore),
      strokes: this.normalizedScoreToStars(strokesScore),
      timing: this.normalizedScoreToStars(timingScore),
      overall: this.normalizedScoreToStars(overallScore / this.MAX_SCORE),
    };
    console.log('categories', categories);

    // 6. Generate feedback based on overall score
    const feedback = this.generateFeedback(overallScore);
    console.log('feedback', feedback);

    // Create and return the complete score result
    const scoreResult: ScoreResult = {
      totalScore: overallScore,
      categories,
      feedback,
      timestamp: Date.now(),
    };
    console.log('scoreResult', scoreResult);

    // Emit score calculated event
    this.emit('score-calculated', scoreResult);

    return scoreResult;
  }

  /**
   * Calculate accuracy score based on path similarity
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @param constraintBox - Optional constraint box size
   * @returns Normalized score (0-1)
   */
  private calculateAccuracyScore(
    example: DrawingData,
    attempt: DrawingData,
    constraintBox?: ConstraintBoxSize
  ): number {
    // First, normalize both drawings to same scale for comparison
    const normalizedExample = this.normalizeDrawing(example);
    const normalizedAttempt = this.normalizeDrawing(attempt);

    // Prepare for scoring
    let pathSimilarityScore = 0;
    let constraintAdherenceScore = 1; // Default to perfect if no constraint box

    // Calculate path similarity using Hausdorff distance
    pathSimilarityScore = this.calculatePathSimilarity(normalizedExample, normalizedAttempt);

    // If constraint box provided, check if strokes stayed inside
    if (constraintBox) {
      constraintAdherenceScore = this.calculateConstraintAdherence(attempt, constraintBox);
    }

    // Combine path similarity (75%) and constraint adherence (25%)
    return pathSimilarityScore * 0.75 + constraintAdherenceScore * 0.25;
  }

  /**
   * Calculate strokes score based on number and pattern of strokes
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @returns Normalized score (0-1)
   */
  private calculateStrokesScore(example: DrawingData, attempt: DrawingData): number {
    // Compare stroke counts
    const exampleStrokeCount = example.strokes.length;
    const attemptStrokeCount = attempt.strokes.length;

    // Calculate stroke count similarity (how close the counts are)
    const countDifference = Math.abs(exampleStrokeCount - attemptStrokeCount);
    const maxStrokes = Math.max(exampleStrokeCount, attemptStrokeCount);
    const strokeCountScore = maxStrokes > 0 ? Math.max(0, 1 - countDifference / maxStrokes) : 1;

    // Compare stroke lengths
    const strokeLengthScore = this.compareStrokeLengths(example, attempt);

    // Combine stroke count (50%) and stroke length (50%) scores
    return strokeCountScore * 0.5 + strokeLengthScore * 0.5;
  }

  /**
   * Calculate timing score based on rhythm and pace
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @returns Normalized score (0-1)
   */
  private calculateTimingScore(example: DrawingData, attempt: DrawingData): number {
    // Compare total drawing time
    const timingRatioScore = this.compareTimingRatio(example, attempt);

    // Compare stroke timing patterns
    const strokeTimingScore = this.compareStrokeTimingPatterns(example, attempt);

    // Combine total time (40%) and stroke timing (60%) scores
    return timingRatioScore * 0.4 + strokeTimingScore * 0.6;
  }

  /**
   * Calculate path similarity between two drawings
   * @param example - Normalized example drawing
   * @param attempt - Normalized attempt drawing
   * @returns Similarity score (0-1)
   */
  private calculatePathSimilarity(example: DrawingData, attempt: DrawingData): number {
    // If either drawing has no strokes, return 0
    if (example.strokes.length === 0 || attempt.strokes.length === 0) {
      return 0;
    }

    // We'll use a simplified version of the Hausdorff distance
    // Get all points from both drawings
    const examplePoints = this.getAllPoints(example);
    const attemptPoints = this.getAllPoints(attempt);

    if (examplePoints.length === 0 || attemptPoints.length === 0) {
      return 0;
    }

    // Calculate average minimum distance from attempt to example
    let totalDistance = 0;

    for (const attemptPoint of attemptPoints) {
      // Find minimum distance to any example point
      let minDistance = Number.MAX_VALUE;

      for (const examplePoint of examplePoints) {
        const distance = this.calculateDistance(attemptPoint, examplePoint);
        minDistance = Math.min(minDistance, distance);
      }

      totalDistance += minDistance;
    }

    // Average minimum distance
    const avgDistance = totalDistance / attemptPoints.length;

    // Convert to similarity score (0-1)
    // The smaller the distance, the higher the similarity
    // Using an exponential decay function to convert distance to similarity
    return Math.exp(-avgDistance * 5);
  }

  /**
   * Calculate if strokes stay within constraint box
   * @param attempt - Attempt drawing
   * @param constraintBox - Constraint box size
   * @returns Adherence score (0-1)
   */
  private calculateConstraintAdherence(
    attempt: DrawingData,
    constraintBox: ConstraintBoxSize
  ): number {
    // Count points outside constraint box
    let totalPoints = 0;
    let pointsOutside = 0;

    // Center of the canvas (assuming constraint box is centered)
    const centerX = attempt.width / 2;
    const centerY = attempt.height / 2;

    // Boundaries of constraint box
    const leftBound = centerX - constraintBox.width / 2;
    const rightBound = centerX + constraintBox.width / 2;
    const topBound = centerY - constraintBox.height / 2;
    const bottomBound = centerY + constraintBox.height / 2;

    // Check each point in each stroke
    for (const stroke of attempt.strokes) {
      for (const point of stroke.points) {
        totalPoints++;

        // Check if point is outside constraint box
        if (
          point.x < leftBound ||
          point.x > rightBound ||
          point.y < topBound ||
          point.y > bottomBound
        ) {
          pointsOutside++;
        }
      }
    }

    // Calculate adherence score (1 - percentage of points outside)
    return totalPoints > 0 ? 1 - pointsOutside / totalPoints : 1;
  }

  /**
   * Compare the length patterns of strokes
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @returns Similarity score (0-1)
   */
  private compareStrokeLengths(example: DrawingData, attempt: DrawingData): number {
    // If either drawing has no strokes, return 0
    if (example.strokes.length === 0 || attempt.strokes.length === 0) {
      return 0;
    }

    // Calculate relative lengths of strokes in each drawing
    const exampleLengths = this.calculateRelativeStrokeLengths(example);
    const attemptLengths = this.calculateRelativeStrokeLengths(attempt);

    // Compare stroke length patterns
    // We'll use the minimum length of the two arrays
    const minLength = Math.min(exampleLengths.length, attemptLengths.length);

    if (minLength === 0) {
      return 0;
    }

    let totalDifference = 0;

    // Compare each stroke's relative length
    for (let i = 0; i < minLength; i++) {
      const lengthDifference = Math.abs(exampleLengths[i] - attemptLengths[i]);
      totalDifference += lengthDifference;
    }

    // Add penalty for different number of strokes
    const countDifference = Math.abs(exampleLengths.length - attemptLengths.length);
    totalDifference += countDifference * 0.1; // Small penalty for each extra/missing stroke

    // Calculate similarity score (0-1)
    // The smaller the total difference, the higher the similarity
    return Math.max(0, 1 - totalDifference / minLength);
  }

  /**
   * Compare the total drawing time ratio
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @returns Similarity score (0-1)
   */
  private compareTimingRatio(example: DrawingData, attempt: DrawingData): number {
    // If either drawing has no total time, return 0.5 (neutral score)
    if (example.totalTime <= 0 || attempt.totalTime <= 0) {
      return 0.5;
    }

    // Calculate ratio of attempt time to example time
    const timeRatio = attempt.totalTime / example.totalTime;

    // Ideal ratio is 1.0 (same time)
    // Score decreases as ratio moves away from 1.0 in either direction
    // Use a bell curve to score the ratio
    return Math.exp(-Math.pow(Math.log(timeRatio), 2));
  }

  /**
   * Compare timing patterns between strokes
   * @param example - Example drawing
   * @param attempt - Attempt drawing
   * @returns Similarity score (0-1)
   */
  private compareStrokeTimingPatterns(example: DrawingData, attempt: DrawingData): number {
    // If either drawing has too few strokes, return neutral score
    if (example.strokes.length < 2 || attempt.strokes.length < 2) {
      return 0.5;
    }

    // Calculate relative stroke durations
    const exampleDurations = this.calculateRelativeStrokeDurations(example);
    const attemptDurations = this.calculateRelativeStrokeDurations(attempt);

    // Compare duration patterns
    const minLength = Math.min(exampleDurations.length, attemptDurations.length);

    if (minLength < 2) {
      return 0.5;
    }

    let totalDifference = 0;

    // Compare each stroke's relative duration
    for (let i = 0; i < minLength; i++) {
      const durationDifference = Math.abs(exampleDurations[i] - attemptDurations[i]);
      totalDifference += durationDifference;
    }

    // Calculate similarity score (0-1)
    return Math.max(0, 1 - totalDifference / minLength);
  }

  /**
   * Calculate relative stroke lengths as proportions of total length
   * @param drawing - Drawing data
   * @returns Array of relative lengths (0-1)
   */
  private calculateRelativeStrokeLengths(drawing: DrawingData): number[] {
    const lengths: number[] = [];
    let totalLength = 0;

    // Calculate length of each stroke
    for (const stroke of drawing.strokes) {
      let strokeLength = 0;

      // Calculate length by summing distances between consecutive points
      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        strokeLength += this.calculateDistance(p1, p2);
      }

      lengths.push(strokeLength);
      totalLength += strokeLength;
    }

    // Calculate relative lengths (as proportion of total length)
    return lengths.map(length => (totalLength > 0 ? length / totalLength : 0));
  }

  /**
   * Calculate relative stroke durations as proportions of total time
   * @param drawing - Drawing data
   * @returns Array of relative durations (0-1)
   */
  private calculateRelativeStrokeDurations(drawing: DrawingData): number[] {
    const durations: number[] = [];
    let totalDuration = 0;

    // Calculate duration of each stroke
    for (const stroke of drawing.strokes) {
      const duration = stroke.endTime - stroke.startTime;
      durations.push(duration);
      totalDuration += duration;
    }

    // Calculate relative durations (as proportion of total time)
    return durations.map(duration => (totalDuration > 0 ? duration / totalDuration : 0));
  }

  /**
   * Normalize drawing to common scale for comparison
   * @param drawing - Drawing data to normalize
   * @returns Normalized drawing data
   */
  private normalizeDrawing(drawing: DrawingData): DrawingData {
    // If drawing is empty, return a copy as is
    if (drawing.strokes.length === 0) {
      return {
        strokes: [],
        totalTime: drawing.totalTime,
        width: drawing.width,
        height: drawing.height,
        created: drawing.created,
      };
    }

    // Find bounding box of the drawing
    let minX = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;

    for (const stroke of drawing.strokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }

    // Calculate dimensions and scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = width > 0 && height > 0 ? Math.min(1 / width, 1 / height) : 1;

    // Create normalized strokes
    const normalizedStrokes: StrokeData[] = drawing.strokes.map(stroke => {
      // Create normalized points
      const normalizedPoints: Point[] = stroke.points.map(point => {
        return {
          x: (point.x - minX) * scale,
          y: (point.y - minY) * scale,
          timestamp: point.timestamp,
          pressure: point.pressure,
        };
      });

      // Return normalized stroke
      return {
        id: stroke.id,
        points: normalizedPoints,
        startTime: stroke.startTime,
        endTime: stroke.endTime,
        color: stroke.color,
        width: stroke.width,
      };
    });

    // Return normalized drawing
    return {
      strokes: normalizedStrokes,
      totalTime: drawing.totalTime,
      width: 1, // Normalized to 0-1 range
      height: height / width, // Maintain aspect ratio
      created: drawing.created,
    };
  }

  /**
   * Get all points from a drawing as a flat array
   * @param drawing - Drawing data
   * @returns Array of all points
   */
  private getAllPoints(drawing: DrawingData): Point[] {
    const points: Point[] = [];

    for (const stroke of drawing.strokes) {
      points.push(...stroke.points);
    }

    return points;
  }

  /**
   * Calculate Euclidean distance between two points
   * @param p1 - First point
   * @param p2 - Second point
   * @returns Distance between points
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Convert normalized score (0-1) to star rating (1-5)
   * @param score - Normalized score (0-1)
   * @returns Star rating (1-5)
   */
  private normalizedScoreToStars(score: number): number {
    // Ensure score is in range 0-1
    const normalizedScore = Math.max(0, Math.min(1, score));

    // Convert to star rating (1-5)
    // Scale of 0-1 to 1-5: (score * 4) + 1
    return Math.round(normalizedScore * 4 + 1);
  }

  /**
   * Generate feedback message based on score
   * @param score - Score out of 100
   * @returns Feedback message
   */
  private generateFeedback(score: number): string {
    // Select feedback template based on score
    let feedbackCategory: keyof typeof this.FEEDBACK;

    if (score >= 90) {
      feedbackCategory = 'excellent';
    } else if (score >= 75) {
      feedbackCategory = 'veryGood';
    } else if (score >= 60) {
      feedbackCategory = 'good';
    } else if (score >= 40) {
      feedbackCategory = 'fair';
    } else {
      feedbackCategory = 'needsWork';
    }

    // Choose random feedback from selected category
    const feedbackOptions = this.FEEDBACK[feedbackCategory];
    const randomIndex = Math.floor(Math.random() * feedbackOptions.length);

    return feedbackOptions[randomIndex];
  }
}
