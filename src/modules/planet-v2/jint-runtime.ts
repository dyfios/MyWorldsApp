// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * JINT runtime helpers for planet-v2.
 *
 * Centralizes everything WebVerse's Jint sandbox does differently from a
 * standard JS host (browser / Node):
 *
 *   - `setTimeout` / `clearTimeout` are missing → polyfilled here.
 *   - `Date.now` is missing → use `new Date().getTime()`. Not polyfilled
 *     (planet-v2 doesn't currently need it; if it does, add here).
 *   - `Time.SetTimeout` takes **milliseconds**. `Time.SetInterval` takes
 *     **seconds**. Different units, same `Time` namespace. Verified against
 *     `JavascriptHandler.cs` (`millisecondsRemaining: int`) and
 *     `TimeHandler.cs` (`currentElapsed += UnityEngine.Time.deltaTime`).
 *   - Async-style APIs (MQTT, HTTPNetworking, terrain onLoaded) take BARE
 *     GLOBAL FUNCTION NAMES; the C# wrapper invokes them via
 *     `timeHandler.CallAsynchronously(name, [args])`. We use the
 *     `globalCallbacks` registry below to allocate unique names per
 *     pending operation and clean up on completion.
 *   - JINT's microtask scheduler does NOT reliably resume awaiters that
 *     suspend on callback-resolved Promises. planet-v2's hot path is
 *     callback-only; this file does not provide Promise wrappers.
 *
 * Idempotent: only patches what's missing. Node-side test environments
 * keep their native primitives.
 */

import type { LoggingApi, TimeApi } from './webverse-types.js';

/** Typed accessor for the runtime globals this module touches. */
interface RuntimeGlobals {
  setTimeout?: (cb: () => void, ms?: number) => number;
  clearTimeout?: (id: number | undefined | null) => void;
  Time?: TimeApi;
  Logging?: LoggingApi;
  UUID?: { NewUUID(): { ToString(): string } };
}

const g = globalThis as unknown as RuntimeGlobals & Record<string, unknown>;

/* ──────────────────────────── setTimeout polyfill ────────────────────── */

/**
 * Polyfill `setTimeout` / `clearTimeout` on top of WebVerse's
 * `Time.SetTimeout` (which takes a string-of-logic and **milliseconds**).
 * `Time.SetTimeout` returns boolean (no cancel handle), so we wrap with a
 * cancellation-flag pattern: each timer is identified by an integer id;
 * `clearTimeout(id)` flips a flag the deferred callback checks before firing.
 *
 * Imported / called once, guarded against double-install.
 */
let polyfilledSetTimeout = false;
export function installSetTimeoutPolyfill(): void {
  if (polyfilledSetTimeout) return;
  polyfilledSetTimeout = true;

  if (typeof g.setTimeout === 'function') return; // native already present (Node tests)

  const Time = g.Time;
  if (!Time || typeof Time.SetTimeout !== 'function') {
    g.Logging?.LogWarning?.(
      'planet-v2/jint-runtime: cannot polyfill setTimeout — neither setTimeout nor Time.SetTimeout is available',
    );
    return;
  }

  let nextId = 1;
  const cancellations = new Map<number, { cancelled: boolean }>();

  g.setTimeout = (cb: () => void, ms?: number): number => {
    const id = nextId++;
    const slot = { cancelled: false };
    cancellations.set(id, slot);
    const cbName = `__pv2_setTimeout_${id}`;
    g[cbName] = (): void => {
      delete g[cbName];
      if (slot.cancelled) return;
      cancellations.delete(id);
      try {
        cb();
      } catch (e) {
        g.Logging?.LogError?.(
          `planet-v2/setTimeout callback threw: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    };
    // Time.SetTimeout takes MILLISECONDS — pass ms straight through.
    Time.SetTimeout(`${cbName}();`, ms ?? 0);
    return id;
  };

  g.clearTimeout = (id: number | undefined | null): void => {
    if (id == null) return;
    const slot = cancellations.get(id);
    if (slot) {
      slot.cancelled = true;
      cancellations.delete(id);
    }
  };
}

/* ──────────────────────────── Global callback registry ───────────────── */

/**
 * WebVerse's MQTT / HTTPNetworking / terrain APIs invoke callbacks by
 * looking up a bare global function name. Two pending operations sharing
 * a name will clobber each other, so we allocate unique names per call site.
 *
 * `callbackPrefix(tag)` returns a UUID-suffixed prefix. The caller registers
 * named functions via `registerCallback(prefix, suffix, fn)` and unregisters
 * with `unregisterCallbacks(prefix, suffixes)` on completion or disposal.
 *
 * UUID is preferred over Math.random for cross-instance uniqueness; falls
 * back to a counter if UUID isn't available (test environments).
 */
let counterFallback = 0;
export function callbackPrefix(tag: string): string {
  const uuid = g.UUID?.NewUUID?.();
  const id = uuid ? uuid.ToString().replace(/-/g, '') : String(++counterFallback);
  // Identifier-safe tag — strip everything except [a-zA-Z0-9_].
  const safeTag = tag.replace(/[^a-zA-Z0-9_]/g, '_');
  return `__pv2_${safeTag}_${id}_`;
}

export function registerCallback(prefix: string, suffix: string, fn: (...args: never[]) => void): string {
  const name = `${prefix}${suffix}`;
  g[name] = fn;
  return name;
}

export function unregisterCallbacks(prefix: string, suffixes: string[]): void {
  for (const s of suffixes) {
    delete g[`${prefix}${s}`];
  }
}

/* ──────────────────────────── Safe logging ───────────────────────────── */

/**
 * Logging helpers that no-op cleanly when WebVerse's `Logging` global is
 * absent (test environments, Node). Always call through these — direct
 * `Logging.Log(...)` references throw `Logging is not defined` in tests.
 */
export function logInfo(message: string): void {
  try {
    g.Logging?.Log?.(message);
  } catch (_e) {
    /* swallow — best-effort */
  }
}

export function logWarn(message: string): void {
  try {
    g.Logging?.LogWarning?.(message);
  } catch (_e) {
    /* swallow */
  }
}

export function logError(message: string): void {
  try {
    g.Logging?.LogError?.(message);
  } catch (_e) {
    /* swallow */
  }
}
