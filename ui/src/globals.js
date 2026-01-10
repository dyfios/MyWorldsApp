/**
 * Global WebVerse Runtime Functions
 * These functions are provided by the WebVerse runtime environment
 */

/**
 * Vuplex Polyfill for 2D WebView for WebGL
 * Due to cross-origin domain limitation, 2D WebView for WebGL is unable to automatically 
 * inject the window.vuplex JavaScript API. This polyfill adds support for message passing.
 */
class VuplexPolyfill {
  constructor() {
    this._listeners = {};
    window.addEventListener('message', this._handleWindowMessage.bind(this));
    console.log('[VuplexPolyfill] Initialized, listening for messages');
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
    const messageType = window.name ? `vuplex.postMessage-${window.name}` : 'vuplex.postMessage';
    
    console.log('[VuplexPolyfill] postMessage called');
    console.log('[VuplexPolyfill] - message:', messageString);
    console.log('[VuplexPolyfill] - window.name:', window.name || '(empty)');
    console.log('[VuplexPolyfill] - messageType:', messageType);
    console.log('[VuplexPolyfill] - parent === window:', parent === window);
    console.log('[VuplexPolyfill] - parent:', parent);
    
    try {
      parent.postMessage({
        type: messageType,
        message: messageString
      }, '*');
      console.log('[VuplexPolyfill] parent.postMessage sent successfully');
    } catch (error) {
      console.error('[VuplexPolyfill] parent.postMessage failed:', error);
    }
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
    console.log('[VuplexPolyfill] _handleWindowMessage received:', event.data);
    
    // Check if event.data.type starts with 'vuplex.postMessage' because that approach
    // is compatible both with old versions of 3D WebView where the type is 'vuplex.postMessage' and with new versions where
    // the type is 'vuplex.postMessage-{id}'. Notably this works even for versions v4.8 - v4.12, which have an issue where they
    // use the new 'vuplex.postMessage-{id}' format but don't yet set window.name attribute, so the polyfill is unable to know
    // the exact message type value.
    if (event.data && typeof event.data.type === 'string' && event.data.type.indexOf('vuplex.postMessage') === 0) {
      console.log('[VuplexPolyfill] Vuplex message detected, dispatching events');
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

// Initialize vuplex polyfill if not already present
if (!window.vuplex) {
  console.log('[globals.js] window.vuplex not found, creating VuplexPolyfill');
  window.vuplex = new VuplexPolyfill();
} else {
  console.log('[globals.js] window.vuplex already exists (native):', window.vuplex);
}

// Make sure postWorldMessage is available globally
if (typeof window !== 'undefined') {
  console.log('[globals.js] Setting up postWorldMessage');
  console.log('[globals.js] - existing postWorldMessage:', typeof window.postWorldMessage);
  
  // Store reference to any existing native postWorldMessage
  const nativePostWorldMessage = window.postWorldMessage;
  
  // Always override with our implementation that uses vuplex for WebGL
  console.log('[globals.js] Creating postWorldMessage using vuplex (overriding any native)');
  window.postWorldMessage = function(message) {
    console.log('[postWorldMessage] called with:', message);
    console.log('[postWorldMessage] - window.vuplex:', window.vuplex);
    console.log('[postWorldMessage] - vuplex.postMessage:', typeof window.vuplex?.postMessage);
    console.log('[postWorldMessage] - nativePostWorldMessage:', typeof nativePostWorldMessage);
    
    // Try vuplex first (for WebGL)
    if (window.vuplex && typeof window.vuplex.postMessage === 'function') {
      console.log('[postWorldMessage] Routing to vuplex.postMessage');
      window.vuplex.postMessage(message);
    } 
    // Fallback to native if vuplex didn't work
    else if (typeof nativePostWorldMessage === 'function') {
      console.log('[postWorldMessage] Routing to native postWorldMessage');
      nativePostWorldMessage(message);
    }
    else {
      console.warn('[postWorldMessage] No message handler available - cannot send message');
    }
  };
}