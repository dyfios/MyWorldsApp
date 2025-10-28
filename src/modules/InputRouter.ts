/**
 * Input Router - Routes input events to appropriate handlers
 */

export type InputEventType = 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'wheel';

export interface InputEvent {
  type: InputEventType;
  data: any;
  timestamp: number;
}

export class InputRouter {
  private handlers: Map<InputEventType, ((event: InputEvent) => void)[]> = new Map();

  /**
   * Initialize input listeners
   */
  initialize(): void {
    this.setupEventListeners();
    console.log('InputRouter initialized');
  }

  /**
   * Register an input handler
   */
  on(eventType: InputEventType, handler: (event: InputEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister an input handler
   */
  off(eventType: InputEventType, handler: (event: InputEvent) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Dispatch an input event
   */
  private dispatch(event: InputEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  /**
   * Set up DOM event listeners
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.dispatch({
        type: 'keydown',
        data: { key: e.key, code: e.code },
        timestamp: Date.now()
      });
    });

    document.addEventListener('keyup', (e) => {
      this.dispatch({
        type: 'keyup',
        data: { key: e.key, code: e.code },
        timestamp: Date.now()
      });
    });

    document.addEventListener('mousedown', (e) => {
      this.dispatch({
        type: 'mousedown',
        data: { x: e.clientX, y: e.clientY, button: e.button },
        timestamp: Date.now()
      });
    });

    document.addEventListener('mouseup', (e) => {
      this.dispatch({
        type: 'mouseup',
        data: { x: e.clientX, y: e.clientY, button: e.button },
        timestamp: Date.now()
      });
    });

    document.addEventListener('mousemove', (e) => {
      this.dispatch({
        type: 'mousemove',
        data: { x: e.clientX, y: e.clientY },
        timestamp: Date.now()
      });
    });

    document.addEventListener('wheel', (e) => {
      this.dispatch({
        type: 'wheel',
        data: { deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ },
        timestamp: Date.now()
      });
    });
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    this.handlers.clear();
  }
}
