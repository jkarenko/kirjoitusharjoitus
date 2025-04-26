/**
 * EventEmitter
 * A simple event system for component communication
 */

// Define event mapping interface for type safety
export interface EventMap {
  [event: string]: unknown[];
}

// Type for event callback based on event name and arguments
export type EventCallback<T extends EventMap, K extends keyof T> = (...args: T[K]) => void;

export class EventEmitter<T extends EventMap = Record<string, unknown[]>> {
  private events: Map<keyof T, Array<EventCallback<T, keyof T>>> = new Map();

  /**
   * Register an event listener
   * @param event - Event name
   * @param callback - Callback function to execute when event is emitted
   */
  public on<K extends keyof T>(event: K, callback: EventCallback<T, K>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.push(callback as EventCallback<T, keyof T>);
    }
  }

  /**
   * Remove an event listener
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  public off<K extends keyof T>(event: K, callback: EventCallback<T, K>): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback as EventCallback<T, keyof T>);
      if (index !== -1) {
        callbacks.splice(index, 1);
        
        // Clean up empty arrays
        if (callbacks.length === 0) {
          this.events.delete(event);
        }
      }
    }
  }

  /**
   * Emit an event with optional arguments
   * @param event - Event name
   * @param args - Arguments to pass to event listeners
   */
  public emit<K extends keyof T>(event: K, ...args: T[K]): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      // Create a copy to avoid issues if callbacks are added/removed during emission
      const callbacksCopy = [...callbacks];
      callbacksCopy.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  public removeAllListeners(): void {
    this.events.clear();
  }
}

