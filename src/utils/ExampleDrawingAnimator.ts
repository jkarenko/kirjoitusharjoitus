import { AnimationController } from './AnimationController';
import { DrawingData, StrokeData } from '../types/Exercise';
import { EventEmitter } from './EventEmitter';

export interface ExampleDrawingAnimatorOptions {
  ctx: CanvasRenderingContext2D;
  emitter: EventEmitter;
  controller: AnimationController;
  pointIntervalMs?: number; // default: 20
  strokePauseMs?: number; // default: 200
}

export class ExampleDrawingAnimator {
  private ctx: CanvasRenderingContext2D;
  private emitter: EventEmitter;
  private controller: AnimationController;
  private pointIntervalMs: number;
  private strokePauseMs: number;
  private _currentTaskHandle: string | null = null;

  public get currentTaskHandle(): string | null {
    return this._currentTaskHandle;
  }
  public set currentTaskHandle(value: string | null) {
    this._currentTaskHandle = value;
  }

  constructor(options: ExampleDrawingAnimatorOptions) {
    this.ctx = options.ctx;
    this.emitter = options.emitter;
    this.controller = options.controller;
    this.pointIntervalMs = options.pointIntervalMs ?? 20;
    this.strokePauseMs = options.strokePauseMs ?? 200;
  }

  public async play(drawing: DrawingData): Promise<void> {
    if (!drawing.strokes.length) {
      throw new Error('No strokes to animate');
    }
    for (let s = 0; s < drawing.strokes.length; s++) {
      const stroke = drawing.strokes[s];
      await this.animateStroke(stroke);
      if (s < drawing.strokes.length - 1) {
        await this.pause(this.strokePauseMs);
      }
    }
  }

  private animateStroke(stroke: StrokeData): Promise<void> {
    return new Promise(resolve => {
      if (stroke.points.length < 2) {
        this.emitter.emit('stroke-started', stroke);
        this.emitter.emit('stroke-completed', stroke);
        resolve();
        return;
      }
      let i = 0;
      let elapsed = 0;
      this.ctx.beginPath();
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      const [first, ...rest] = stroke.points;
      this.ctx.moveTo(first.x, first.y);
      this.emitter.emit('stroke-started', stroke);
      const step = (dt: number): boolean => {
        elapsed += dt;
        while (elapsed >= this.pointIntervalMs && i < rest.length) {
          const pt = rest[i];
          this.ctx.lineTo(pt.x, pt.y);
          this.ctx.stroke();
          this.emitter.emit('point-added', pt);
          i++;
          elapsed -= this.pointIntervalMs;
        }
        if (i >= rest.length) {
          this.emitter.emit('stroke-completed', stroke);
          resolve();
          return true; // done
        }
        return false; // not done
      };
      this.currentTaskHandle = this.controller.schedule(step);
    });
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => {
      let elapsed = 0;
      const step = (dt: number): boolean => {
        elapsed += dt;
        if (elapsed >= ms) {
          resolve();
          return true;
        }
        return false;
      };
      this.currentTaskHandle = this.controller.schedule(step);
    });
  }
}
