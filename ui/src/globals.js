/**
 * Global WebVerse Runtime Functions
 * These functions are provided by the WebVerse runtime environment
 */

// Make sure postWorldMessage is available globally
if (typeof window !== 'undefined') {
  // In browser environment - provide fallback if not available in WebVerse runtime
  window.postWorldMessage = window.postWorldMessage || function(message) {
    console.warn('postWorldMessage not available - running outside WebVerse runtime');
  };
}