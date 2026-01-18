/**
 * Global WebVerse Runtime Functions
 * These functions are provided by the WebVerse runtime environment
 */

/**
 * Vuplex Polyfill for cross-origin iframes in WebGL
 * From: https://developer.vuplex.com/webview/2d-webview-for-webgl
 */
class VuplexPolyfill {
  constructor() {
    this._listeners = {};
    window.addEventListener('message', this._handleWindowMessage.bind(this));
  }

  addEventListener(eventName, listener) {
    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }
    if (this._listeners[eventName].indexOf(listener) === -1) {
      this._listeners[eventName].push(listener);
    }
  }

  removeEventListener(eventName, listener) {
    if (!this._listeners[eventName]) {
      return;
    }
    const index = this._listeners[eventName].indexOf(listener);
    if (index !== -1) {
      this._listeners[eventName].splice(index, 1);
    }
  }

  postMessage(message) {
    // Don't pass a string to JSON.stringify() because it adds extra quotes.
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    parent.postMessage({
      // Use the new 'vuplex.postMessage-{id}' format for newer versions of 2D WebView that populate the iframe's name attribute and fallback to 'vuplex.postMessage' for older versions.
      type: window.name ? `vuplex.postMessage-${window.name}` : 'vuplex.postMessage',
      message: messageString
    }, '*')
  }

  _emit(eventName, ...args) {
    if (!this._listeners[eventName]) {
      return;
    }
    for (const listener of this._listeners[eventName]) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`An error occurred while invoking the '${eventName}' event handler.`, error);
      }
    }
  }

  _handleWindowMessage(event) {
    // Check if event.data.type starts with 'vuplex.postMessage' because that approach
    // is compatible both with old versions of 3D WebView where the type is 'vuplex.postMessage' and with new versions where
    // the type is 'vuplex.postMessage-{id}'. Notably this works even for versions v4.8 - v4.12, which have an issue where they
    // use the new 'vuplex.postMessage-{id}' format but don't yet set window.name attribute, so the polyfill is unable to know
    // the exact message type value.
    if (event.data && typeof event.data.type === 'string' && event.data.type.indexOf('vuplex.postMessage') === 0) {
      // Dispatch the new window vuplexmessage event added in v4.11.
      const value = event.data.message;
      const vuplexMessageEvent = new Event('vuplexmessage');
      vuplexMessageEvent.value = value;
      vuplexMessageEvent.data = value;
      window.dispatchEvent(vuplexMessageEvent);
      // Dispatch the older window.vuplex message event.
      this._emit('message', { value, data: value });
    }
  };
}

// Store our polyfill instance in case we need it
const vuplexPolyfill = new VuplexPolyfill();

// Only use the polyfill if real vuplex isn't available (WebGL cross-origin mode)
// In native mode, the real window.vuplex will be provided by Vuplex WebView
if (!window.vuplex) {
  console.log('[globals.js] Real vuplex not found at init, using polyfill for WebGL cross-origin');
  window.vuplex = vuplexPolyfill;
} else {
  console.log('[globals.js] Real vuplex found, using native Vuplex WebView');
}

// Make sure postWorldMessage is available globally
// This always checks the CURRENT window.vuplex in case it was set after page load
if (typeof window !== 'undefined') {
  window.postWorldMessage = function(message) {
    console.log('[postWorldMessage] Called with:', message);
    console.log('[postWorldMessage] window.vuplex:', window.vuplex);
    console.log('[postWorldMessage] window.vuplex === polyfill:', window.vuplex === vuplexPolyfill);
    
    if (window.vuplex && typeof window.vuplex.postMessage === 'function') {
      console.log('[postWorldMessage] Calling vuplex.postMessage');
      window.vuplex.postMessage(message);
    } else {
      console.warn('[postWorldMessage] vuplex.postMessage not available');
    }
  };
}