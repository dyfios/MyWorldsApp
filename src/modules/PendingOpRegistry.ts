/**
 * PendingOpRegistry — tracks in-flight server-bound mutations so they can
 * be optimistically applied to the local view and rolled back on rejection
 * or timeout.
 *
 * WebVerse constraints accommodated:
 *   - HTTPNetworking.Fetch/Post accept a single onFinished callback.
 *     The registered callback inspects the response and dispatches
 *     commit (success) or fail (rollback).
 *   - Time.SetTimeout is not cancellable. The timeout body calls a
 *     per-op timeout-check global; once an op has resolved that check
 *     becomes a no-op.
 */

interface PendingOp {
  id: string;
  rollback: () => void;
  description: string;
}

interface RegisterResult {
  id: string;
  /** Pass this name as the onFinished callback for the HTTPNetworking call. */
  onFinishedName: string;
}

const DEFAULT_TIMEOUT_MS = 8000;

export class PendingOpRegistry {
  private ops = new Map<string, PendingOp>();
  private toastFn: ((message: string, severity: 'error' | 'info') => void) | null = null;

  /**
   * Inject a toast handler. UIManager wires this during init so the registry
   * does not have to import UIManager (avoids a circular dep risk).
   */
  setToastHandler(fn: (message: string, severity: 'error' | 'info') => void): void {
    this.toastFn = fn;
  }

  register(op: { rollback: () => void; description: string }, timeoutMs: number = DEFAULT_TIMEOUT_MS): RegisterResult {
    const uuid = UUID.NewUUID().ToString();
    const id = uuid !== null ? uuid : 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

    this.ops.set(id, { id, rollback: op.rollback, description: op.description });

    const onFinishedName = `onPendingOpFinished_${id}`;
    const onTimeoutName = `onPendingOpTimeout_${id}`;

    (globalThis as any)[onFinishedName] = (response: any) => {
      this.handleResponse(id, response);
    };

    (globalThis as any)[onTimeoutName] = () => {
      this.timeoutCheck(id);
    };

    // Time.SetTimeout takes a string of logic. The body invokes the per-op
    // timeout-check global; if the op has already resolved this is a no-op.
    Time.SetTimeout(`globalThis.${onTimeoutName} && globalThis.${onTimeoutName}();`, timeoutMs);

    Logging.Log(`📝 PendingOp registered: ${id} (${op.description})`);
    return { id, onFinishedName };
  }

  /**
   * Inspect the HTTPNetworking response and route to commit or fail.
   * Response shapes seen in this codebase:
   *   - null / undefined                                  → failure
   *   - object with .status >= 400                         → failure
   *   - JSON string with `{ "accepted": false, ... }`      → failure
   *   - JSON string with `{ "accepted": true, ... }`       → success
   *   - anything else                                     → success (assumed)
   */
  private handleResponse(id: string, response: any): void {
    if (!this.ops.has(id)) {
      // Already resolved (e.g. timeout fired first). Drop the response.
      return;
    }

    if (response === null || response === undefined) {
      this.fail(id, 'empty response');
      return;
    }

    if (typeof response === 'object') {
      const status = (response as any).status;
      if (typeof status === 'number' && status >= 400) {
        this.fail(id, `HTTP ${status}`);
        return;
      }
      if ((response as any).accepted === false) {
        this.fail(id, (response as any).response || 'rejected');
        return;
      }
    }

    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        if (parsed && parsed.accepted === false) {
          this.fail(id, parsed.response || 'rejected');
          return;
        }
      } catch (_e) {
        // Non-JSON string responses are treated as success.
      }
    }

    this.commit(id);
  }

  commit(id: string): void {
    const op = this.ops.get(id);
    if (!op) return;
    this.cleanup(id);
    Logging.Log(`✅ PendingOp committed: ${id} (${op.description})`);
  }

  fail(id: string, reason: string): void {
    const op = this.ops.get(id);
    if (!op) return;
    this.cleanup(id);
    Logging.LogWarning(`↩️ PendingOp rolled back: ${id} (${op.description}) — ${reason}`);
    try {
      op.rollback();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logging.LogError(`❌ Rollback handler threw for ${id}: ${msg}`);
    }
    if (this.toastFn) {
      this.toastFn(`Couldn't ${op.description} — ${reason}`, 'error');
    }
  }

  /**
   * Called by the SetTimeout body. No-op if the op has already resolved.
   */
  timeoutCheck(id: string): void {
    if (!this.ops.has(id)) return;
    this.fail(id, 'timeout');
  }

  /**
   * Fail every pending op. Called from ClientContext disposal so partially
   * applied visuals get reverted before teardown.
   */
  dispose(): void {
    const ids = Array.from(this.ops.keys());
    for (const id of ids) {
      this.fail(id, 'client disposing');
    }
  }

  private cleanup(id: string): void {
    this.ops.delete(id);
    delete (globalThis as any)[`onPendingOpFinished_${id}`];
    delete (globalThis as any)[`onPendingOpTimeout_${id}`];
  }
}
