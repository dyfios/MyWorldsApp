// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Polyfills for the WebVerse JINT JavaScript runtime.
 *
 * JINT exposes only what WebVerse's APIs declare — no `setTimeout`,
 * `clearTimeout`, `Date.now`, etc. This file detects missing globals at
 * load time and patches them on top of WebVerse's `Time.SetTimeout`
 * primitive (which takes a string-of-logic and seconds, with no cancel
 * handle of its own).
 *
 * Idempotent: only patches what's missing. In Node test environments the
 * native setTimeout is present so this file is effectively a no-op.
 *
 * Import this once at app startup BEFORE any module that uses these
 * globals (myworld.ts top, ahead of planet/* imports).
 */

interface WebVerseTime {
  SetTimeout(logic: string, seconds: number): boolean;
}

interface SetTimeoutShim {
  (cb: () => void, ms?: number): number;
}

interface ClearTimeoutShim {
  (id: number | undefined | null): void;
}

const g = globalThis as Record<string, unknown>;

if (typeof g.setTimeout !== 'function') {
  const Time = g.Time as WebVerseTime | undefined;
  if (!Time || typeof Time.SetTimeout !== 'function') {
    // Nothing to polyfill against — log once and bail. Callers that hit a
    // timeout codepath will see Errors; that's preferable to silently
    // dropping timer registrations.
    const logging = g.Logging as { LogWarning?: (m: string) => void } | undefined;
    logging?.LogWarning?.('runtime-polyfills: neither setTimeout nor Time.SetTimeout is available');
  } else {
    // Session nonce — random per JS-context-load so stale Time.SetTimeout
    // payloads from a previous MyWorldsApp session can't collide with new
    // globals after a page refresh. WebVerse's Time queue persists timer
    // strings across page reloads; without a nonce, an old timer firing
    // `__mw_setTimeout_2()` would either error (no global yet) or — worse
    // — invoke a freshly-allocated id=2 callback meant for unrelated work.
    const sessionNonce = Math.floor(Math.random() * 0x7fffffff).toString(36);
    let nextId = 1;
    const cancellations = new Map<number, { cancelled: boolean }>();

    const shimSetTimeout: SetTimeoutShim = (cb, ms) => {
      const id = nextId++;
      const slot = { cancelled: false };
      cancellations.set(id, slot);
      const cbName = `__mw_setTimeout_${sessionNonce}_${id}`;
      g[cbName] = (): void => {
        delete g[cbName];
        if (slot.cancelled) return;
        cancellations.delete(id);
        try {
          cb();
        } catch (e) {
          const logging = g.Logging as { LogError?: (m: string) => void } | undefined;
          logging?.LogError?.('setTimeout callback threw: ' + (e instanceof Error ? e.message : String(e)));
        }
      };
      // Time.SetTimeout takes MILLISECONDS (per ExecutionTask.millisecondsRemaining
      // in WebVerse-Runtime/.../JavascriptHandler.cs). The d.ts is unit-agnostic
      // so this was originally divided-by-1000 — that bug fired every timeout
      // ~1000× too early and made MqttChunkSource look unreachable.
      Time.SetTimeout(`${cbName}();`, ms ?? 0);
      return id;
    };

    const shimClearTimeout: ClearTimeoutShim = (id) => {
      if (id == null) return;
      const slot = cancellations.get(id);
      if (slot) {
        slot.cancelled = true;
        cancellations.delete(id);
      }
    };

    g.setTimeout = shimSetTimeout;
    g.clearTimeout = shimClearTimeout;
  }
}
