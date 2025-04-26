import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '../../utils/EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it('should register and trigger event listeners', () => {
    const mockCallback = vi.fn();
    emitter.on('test-event', mockCallback);
    
    emitter.emit('test-event', 'test-data');
    expect(mockCallback).toHaveBeenCalledWith('test-data');
  });

  it('should allow multiple listeners for same event', () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();
    
    emitter.on('test-event', mockCallback1);
    emitter.on('test-event', mockCallback2);
    
    emitter.emit('test-event', 'test-data');
    
    expect(mockCallback1).toHaveBeenCalledWith('test-data');
    expect(mockCallback2).toHaveBeenCalledWith('test-data');
  });

  it('should remove specific event listener', () => {
    const mockCallback = vi.fn();
    emitter.on('test-event', mockCallback);
    emitter.off('test-event', mockCallback);
    
    emitter.emit('test-event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle multiple arguments in emit', () => {
    const mockCallback = vi.fn();
    emitter.on('test-event', mockCallback);
    
    emitter.emit('test-event', 'arg1', 'arg2', 123);
    expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should handle errors in event callbacks', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockCallback = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    emitter.on('test-event', mockCallback);
    emitter.emit('test-event');
    
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should remove all listeners', () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();
    
    emitter.on('event1', mockCallback1);
    emitter.on('event2', mockCallback2);
    
    emitter.removeAllListeners();
    
    emitter.emit('event1');
    emitter.emit('event2');
    
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).not.toHaveBeenCalled();
  });

  it('should handle non-existent event emission', () => {
    // Should not throw error
    expect(() => emitter.emit('non-existent')).not.toThrow();
  });

  it('should handle removing non-existent listener', () => {
    const mockCallback = vi.fn();
    // Should not throw error
    expect(() => emitter.off('non-existent', mockCallback)).not.toThrow();
  });
});

