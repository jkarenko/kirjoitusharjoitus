// AnimationController: schedules animation tasks using requestAnimationFrame
export type AnimationTask = {
  callback: (dt: number) => boolean; // return true when done
};

export class AnimationController {
  private tasks: Map<string, AnimationTask> = new Map();
  private running = false;
  private lastTimestamp = 0;
  private rafId: number | null = null;
  private idCounter = 0;

  public schedule(callback: (dt: number) => boolean): string {
    const id = `task_${this.idCounter++}`;
    this.tasks.set(id, { callback });
    this.start();
    return id;
  }

  public cancel(handle: string): void {
    this.tasks.delete(handle);
    if (this.tasks.size === 0) {
      this.stop();
    }
  }

  public start(): void {
    if (!this.running) {
      this.running = true;
      this.lastTimestamp = performance.now();
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) {
      return;
    }
    const dt = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    // Copy tasks to avoid mutation during iteration
    for (const [id, task] of Array.from(this.tasks.entries())) {
      const done = task.callback(dt);
      if (done) {
        this.tasks.delete(id);
      }
    }
    if (this.tasks.size > 0) {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.stop();
    }
  };
}
