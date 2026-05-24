// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * SyncManager — connection health monitoring and disconnect overlay tests
 *
 * Tests:
 *   - Fires onConnectionLost after maxRetries consecutive failures (post-connect)
 *   - Does NOT fire during initial handshake before session is ever established
 *   - Resets retry counter when session recovers
 *   - stopConnectionMonitor stops polling
 *   - Idempotent — does not fire onConnectionLost more than once
 *   - Does not poll when no session is configured
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncManager } from './SyncManager';

describe('SyncManager — connection health monitoring', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.stopConnectionMonitor();
  });

  /** Helper: simulate one successful poll so the monitor knows we connected */
  function connectOnce() {
    (globalThis as any).VOSSynchronization.IsSessionEstablished = vi.fn().mockReturnValue(true);
    (globalThis as any)._syncMonitorPoll();
  }

  it('calls onConnectionLost after maxRetries consecutive failures post-connect', () => {
    const onLost = vi.fn();
    syncManager.onConnectionLost = onLost;

    syncManager.startConnectionMonitor('test-session-id', { maxRetries: 3 });

    // Session connects successfully first
    connectOnce();

    // Now session drops
    (globalThis as any).VOSSynchronization.IsSessionEstablished = vi.fn().mockReturnValue(false);

    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();
    expect(onLost).not.toHaveBeenCalled();

    (globalThis as any)._syncMonitorPoll();
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it('does NOT count failures before session is ever established', () => {
    const onLost = vi.fn();
    syncManager.onConnectionLost = onLost;

    // Session never connects
    (globalThis as any).VOSSynchronization.IsSessionEstablished = vi.fn().mockReturnValue(false);

    syncManager.startConnectionMonitor('test-session-id', { maxRetries: 2 });

    // Poll many times — should never fire because we never connected
    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();

    expect(onLost).not.toHaveBeenCalled();
  });

  it('resets retry counter when session recovers', () => {
    const onLost = vi.fn();
    syncManager.onConnectionLost = onLost;

    syncManager.startConnectionMonitor('test-session-id', { maxRetries: 3 });

    // Connect first
    connectOnce();

    // 2 failures
    (globalThis as any).VOSSynchronization.IsSessionEstablished = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)   // recovers
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(false);

    (globalThis as any)._syncMonitorPoll(); // fail 1
    (globalThis as any)._syncMonitorPoll(); // fail 2
    (globalThis as any)._syncMonitorPoll(); // recovers — counter resets

    // 2 more failures — still under threshold
    (globalThis as any)._syncMonitorPoll();
    (globalThis as any)._syncMonitorPoll();
    expect(onLost).not.toHaveBeenCalled();

    // 3rd consecutive failure triggers
    (globalThis as any)._syncMonitorPoll();
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it('stopConnectionMonitor stops polling interval', () => {
    syncManager.startConnectionMonitor('test-session-id');

    syncManager.stopConnectionMonitor();

    expect((globalThis as any).Time.StopInterval).toHaveBeenCalled();
  });

  it('does not fire onConnectionLost more than once', () => {
    const onLost = vi.fn();
    syncManager.onConnectionLost = onLost;

    syncManager.startConnectionMonitor('test-session-id', { maxRetries: 2 });

    // Connect, then disconnect
    connectOnce();
    (globalThis as any).VOSSynchronization.IsSessionEstablished = vi.fn().mockReturnValue(false);

    // Capture the poll function before it gets cleaned up
    const poll = (globalThis as any)._syncMonitorPoll;

    poll();
    poll();
    expect(onLost).toHaveBeenCalledTimes(1);

    // After firing, additional polls are a no-op
    poll();
    poll();
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no session ID is provided', () => {
    const onLost = vi.fn();
    syncManager.onConnectionLost = onLost;

    syncManager.startConnectionMonitor('');

    // SetInterval should not have been called for monitor
    const monitorCalls = (globalThis as any).Time.SetInterval.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('_syncMonitorPoll')
    );
    expect(monitorCalls.length).toBe(0);
  });
});
