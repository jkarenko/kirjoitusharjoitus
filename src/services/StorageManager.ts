/**
 * StorageManager class
 * Handles browser storage for exercises, scores, and settings
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Exercise, ScoreResult, DrawingData } from '../types/Exercise';

// Storage keys
const STORAGE_KEYS = {
  EXERCISES: 'handwriting_exercises',
  SETTINGS: 'handwriting_settings',
  THUMBNAILS: 'handwriting_thumbnails'
};

// Settings interface
interface AppSettings {
  volume: number;
  muted: boolean;
  lastExerciseId?: string;
  username?: string;
}

// Thumbnail storage interface
interface ThumbnailStorage {
  [exerciseId: string]: string; // exercise ID -> data URL
}

export class StorageManager extends EventEmitter {
  private exercises: Exercise[] = [];
  private settings: AppSettings = {
    volume: 0.5,
    muted: false
  };
  private thumbnails: ThumbnailStorage = {};
  private initialized: boolean = false;
  
  /**
   * Initialize the storage manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    
    try {
      // Load exercises
      await this.loadExercises();
      
      // Load settings
      await this.loadSettings();
      
      // Load thumbnails
      await this.loadThumbnails();
      
      this.initialized = true;
      this.emit('storage-initialized');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Load exercises from localStorage
   */
  private async loadExercises(): Promise<void> {
    try {
      const exercisesJson = localStorage.getItem(STORAGE_KEYS.EXERCISES);
      
      if (exercisesJson) {
        const exercisesData = JSON.parse(exercisesJson);
        
        // Convert stored dates back to Date objects
        this.exercises = exercisesData.map((exercise: any) => ({
          ...exercise,
          createdAt: new Date(exercise.createdAt)
        }));
        
        this.emit('exercises-loaded', this.exercises);
      } else {
        this.exercises = [];
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load exercises:', error);
      this.exercises = [];
      return Promise.reject(error);
    }
  }
  
  /**
   * Load settings from localStorage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      if (settingsJson) {
        this.settings = JSON.parse(settingsJson);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load settings:', error);
      return Promise.resolve();
    }
  }
  
  /**
   * Load thumbnails from localStorage
   */
  private async loadThumbnails(): Promise<void> {
    try {
      const thumbnailsJson = localStorage.getItem(STORAGE_KEYS.THUMBNAILS);
      
      if (thumbnailsJson) {
        this.thumbnails = JSON.parse(thumbnailsJson);
      } else {
        this.thumbnails = {};
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load thumbnails:', error);
      this.thumbnails = {};
      return Promise.resolve();
    }
  }
  
  /**
   * Get all exercises
   * @returns Array of exercises
   */
  public getExercises(): Exercise[] {
    return [...this.exercises].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  
  /**
   * Get a specific exercise by ID
   * @param id - Exercise ID
   * @returns Exercise or undefined if not found
   */
  public getExerciseById(id: string): Exercise | undefined {
    return this.exercises.find(exercise => exercise.id === id);
  }
  
  /**
   * Save a new exercise
   * @param exercise - Exercise to save
   * @returns Promise that resolves when save is complete
   */
  public async saveExercise(exercise: Exercise): Promise<void> {
    try {
      // Add to exercises array
      this.exercises.push(exercise);
      
      // Save to localStorage
      await this.persistExercises();
      
      // Generate and save thumbnail
      await this.generateAndSaveThumbnail(exercise);
      
      // Emit event
      this.emit('exercise-saved', exercise);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save exercise:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Update an existing exercise
   * @param updatedExercise - Updated exercise data
   * @returns Promise that resolves when update is complete
   */
  public async updateExercise(updatedExercise: Exercise): Promise<void> {
    try {
      // Find exercise index
      const index = this.exercises.findIndex(e => e.id === updatedExercise.id);
      
      if (index === -1) {
        throw new Error(`Exercise with ID ${updatedExercise.id} not found`);
      }
      
      // Update exercise
      this.exercises[index] = updatedExercise;
      
      // Save to localStorage
      await this.persistExercises();
      
      // Update thumbnail if adult drawing changed
      if (updatedExercise.adultDrawing) {
        await this.generateAndSaveThumbnail(updatedExercise);
      }
      
      // Emit event
      this.emit('exercise-updated', updatedExercise);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to update exercise:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Delete an exercise
   * @param id - ID of exercise to delete
   * @returns Promise that resolves when deletion is complete
   */
  public async deleteExercise(id: string): Promise<void> {
    try {
      // Find exercise index
      const index = this.exercises.findIndex(e => e.id === id);
      
      if (index === -1) {
        throw new Error(`Exercise with ID ${id} not found`);
      }
      
      // Remove exercise
      const deletedExercise = this.exercises.splice(index, 1)[0];
      
      // Save to localStorage
      await this.persistExercises();
      
      // Delete thumbnail
      delete this.thumbnails[id];
      await this.persistThumbnails();
      
      // Emit event
      this.emit('exercise-deleted', deletedExercise);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Save exercise result (score)
   * @param exercise - Exercise with attempts
   * @param score - Score result
   * @returns Promise that resolves when save is complete
   */
  public async saveExerciseResult(exercise: Exercise, score: ScoreResult): Promise<void> {
    try {
      // Find exercise
      const existingExercise = this.getExerciseById(exercise.id);
      
      if (!existingExercise) {
        throw new Error(`Exercise with ID ${exercise.id} not found`);
      }
      
      // Check if this is a new high score
      const isHighScore = !existingExercise.highestScore || 
                          score.totalScore > existingExercise.highestScore.totalScore;
      
      // Update exercise with attempts and potentially new high score
      const updatedExercise: Exercise = {
        ...existingExercise,
        attempts: exercise.attempts,
        highestScore: isHighScore ? score : existingExercise.highestScore
      };
      
      // Save updated exercise
      await this.updateExercise(updatedExercise);
      
      // Emit event
      this.emit('exercise-result-saved', { exercise: updatedExercise, score, isHighScore });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save exercise result:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Generate and save thumbnail for an exercise
   * @param exercise - Exercise to generate thumbnail for
   * @returns Promise that resolves when thumbnail is saved
   */
  private async generateAndSaveThumbnail(exercise: Exercise): Promise<void> {
    try {
      // Generate thumbnail
      const thumbnailDataUrl = await this.generateThumbnail(exercise.adultDrawing);
      
      // Save thumbnail
      this.thumbnails[exercise.id] = thumbnailDataUrl;
      
      // Persist thumbnails
      await this.persistThumbnails();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to generate and save thumbnail:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Generate a thumbnail from drawing data
   * @param drawingData - Drawing data to generate thumbnail from
   * @returns Promise that resolves with thumbnail data URL
   */
  private async generateThumbnail(drawingData: DrawingData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a small canvas for the thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        // Clear canvas
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // If no strokes, return blank thumbnail
        if (drawingData.strokes.length === 0) {
          resolve(canvas.toDataURL('image/png'));
          return;
        }
        
        // Find bounding box of original drawing
        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        
        for (const stroke of drawingData.strokes) {
          for (const point of stroke.points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
        }
        
        // Calculate scale and offset to fit in thumbnail
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        // Prevent division by zero
        if (originalWidth === 0 || originalHeight === 0) {
          resolve(canvas.toDataURL('image/png'));
          return;
        }
        
        // Calculate scale to fit in thumbnail with padding
        const padding = 10;
        const availableWidth = canvas.width - (padding * 2);
        const availableHeight = canvas.height - (padding * 2);
        const scale = Math.min(
          availableWidth / originalWidth,
          availableHeight / originalHeight
        );
        
        // Calculate centering offset
        const offsetX = padding + (availableWidth - (originalWidth * scale)) / 2;
        const offsetY = padding + (availableHeight - (originalHeight * scale)) / 2;
        
        // Draw each stroke
        for (const stroke of drawingData.strokes) {
          if (stroke.points.length < 2) continue;
          
          context.beginPath();
          context.strokeStyle = stroke.color;
          context.lineWidth = Math.max(1, stroke.width * scale * 0.5);
          context.lineCap = 'round';
          context.lineJoin = 'round';
          
          // First point
          const firstPoint = stroke.points[0];
          const scaledX1 = offsetX + (firstPoint.x - minX) * scale;
          const scaledY1 = offsetY + (firstPoint.y - minY) * scale;
          context.moveTo(scaledX1, scaledY1);
          
          // Rest of the points
          for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            const scaledX = offsetX + (point.x - minX) * scale;
            const scaledY = offsetY + (point.y - minY) * scale;
            context.lineTo(scaledX, scaledY);
          }
          
          context.stroke();
        }
        
        // Convert canvas to data URL
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Get thumbnail for an exercise
   * @param exerciseId - Exercise ID
   * @returns Thumbnail data URL or undefined if not found
   */
  public getThumbnail(exerciseId: string): string | undefined {
    return this.thumbnails[exerciseId];
  }
  
  /**
   * Save settings
   * @param settings - Settings to save
   * @returns Promise that resolves when save is complete
   */
  public async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      // Update settings
      this.settings = { ...this.settings, ...settings };
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      
      // Emit event
      this.emit('settings-saved', this.settings);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save settings:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get current settings
   * @returns Current settings
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }
  
  /**
   * Persist exercises to localStorage
   */
  private async persistExercises(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(this.exercises));
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to persist exercises:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Persist thumbnails to localStorage
   */
  private async persistThumbnails(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.THUMBNAILS, JSON.stringify(this.thumbnails));
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to persist thumbnails:', error);
      return Promise.reject(error);
    }
