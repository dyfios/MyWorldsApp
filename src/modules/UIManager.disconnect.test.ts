// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * UIManager — disconnect overlay tests
 *
 * Tests:
 *   - showDisconnectOverlay creates a screen canvas + HTML overlay
 *   - HTML entity loads the disconnect page
 *   - Overlay blocks interaction (screen canvas is visible)
 *   - Second call is a no-op (idempotent)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIManager } from './UIManager';

describe('UIManager — disconnect overlay', () => {
  let uiManager: UIManager;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any)._entityRegistry.clear();
    uiManager = new UIManager('lite');
  });

  it('creates a screen canvas and HTML entity for the overlay', () => {
    uiManager.showDisconnectOverlay();

    // CanvasEntity.Create should have been called
    expect((globalThis as any).CanvasEntity.Create).toHaveBeenCalled();

    // HTMLEntity.Create should have been called
    expect((globalThis as any).HTMLEntity.Create).toHaveBeenCalled();
  });

  it('loads disconnect HTML content into the overlay', () => {
    uiManager.showDisconnectOverlay();

    // Find the HTMLEntity that was created
    const htmlCreateCall = (globalThis as any).HTMLEntity.Create.mock.calls[
      (globalThis as any).HTMLEntity.Create.mock.calls.length - 1
    ];
    const htmlEntityId = htmlCreateCall[3]; // id parameter
    const htmlEntity = (globalThis as any)._entityRegistry.get(htmlEntityId);

    expect(htmlEntity).toBeTruthy();
    expect(htmlEntity.LoadHTML).toHaveBeenCalled();

    // The HTML should contain a reload message
    const htmlContent = htmlEntity.LoadHTML.mock.calls[0][0];
    expect(htmlContent).toContain('reload');
  });

  it('is idempotent — second call does not create additional entities', () => {
    uiManager.showDisconnectOverlay();
    const firstCallCount = (globalThis as any).CanvasEntity.Create.mock.calls.length;

    uiManager.showDisconnectOverlay();
    expect((globalThis as any).CanvasEntity.Create.mock.calls.length).toBe(firstCallCount);
  });

  it('makes the canvas a screen canvas for full-screen coverage', () => {
    uiManager.showDisconnectOverlay();

    const canvasCreateCall = (globalThis as any).CanvasEntity.Create.mock.calls[
      (globalThis as any).CanvasEntity.Create.mock.calls.length - 1
    ];
    const canvasId = canvasCreateCall[5]; // id parameter
    const canvasEntity = (globalThis as any)._entityRegistry.get(canvasId);

    expect(canvasEntity).toBeTruthy();
    expect(canvasEntity.MakeScreenCanvas).toHaveBeenCalled();
    expect(canvasEntity.SetVisibility).toHaveBeenCalledWith(true);
  });
});
