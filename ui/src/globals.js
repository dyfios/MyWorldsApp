/**
 * Global WebVerse Runtime Functions
 * 
 * The Vuplex polyfill and postWorldMessage are set up in index.html
 * (which runs before this bundle loads).
 * 
 * This file provides a fallback in case index.html setup didn't run.
 */

// Ensure postWorldMessage exists (should already be set up by index.html)
if (typeof window.postWorldMessage !== 'function') {
  console.warn('[globals.js] postWorldMessage not found - index.html may not have loaded correctly');
  window.postWorldMessage = function(message) {
    console.warn('[postWorldMessage fallback] Message not sent:', message);
  };
}