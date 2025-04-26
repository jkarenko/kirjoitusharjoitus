/**
 * EventEmitter
 * A simple event system for component communication
 */

export type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Register an event listener
   * @param event - Event name
   * @param callback - Callback function to execute when event is emitted
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.push(callback);
    }
  }

  /**
   * Remove an event listener
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  public off(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
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
  public emit(event: string, ...args: any[]): void {
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
          console.error(`Error in event handler for ${event}:`, error);
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

