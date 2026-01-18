/* global postWorldMessage */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import './MobileControls.css';

// Helper function that mirrors App.js behavior - sends via postWorldMessage AND parent.postMessage fallback
const sendWorldMessage = (msg) => {
  console.log('[MobileControls] sendWorldMessage:', msg);
  
  // First, call the standard postWorldMessage
  if (typeof postWorldMessage === 'function') {
    try {
      postWorldMessage(msg);
      console.log('[MobileControls] postWorldMessage returned successfully');
    } catch (error) {
      console.error('[MobileControls] postWorldMessage threw error:', error);
    }
  }
  
  // Also try direct parent.postMessage as fallback for WebGL cross-origin
  if (window.parent && window.parent !== window) {
    const messageType = window.vuplex?._postMessageType || 'vuplex.postMessage';
    console.log('[MobileControls] Also sending via parent.postMessage with type:', messageType);
    try {
      window.parent.postMessage({
        type: messageType,
        message: msg
      }, '*');
      console.log('[MobileControls] parent.postMessage sent successfully');
    } catch (error) {
      console.error('[MobileControls] parent.postMessage failed:', error);
    }
  }
};

const MobileControls = ({
  onMenuClick,
  onChatClick,
  onChatLongPress,
  visible = true
}) => {
  // Left stick state (WASD - currently non-functional)
  const [leftStickPosition, setLeftStickPosition] = useState({ x: 0, y: 0 });
  const [leftStickActive, setLeftStickActive] = useState(false);
  
  // Right stick state (Shift/Space for flying)
  const [rightStickPosition, setRightStickPosition] = useState({ x: 0, y: 0 });
  const [rightStickActive, setRightStickActive] = useState(false);
  
  const leftStickRef = useRef(null);
  const rightStickRef = useRef(null);
  const chatLongPressTimer = useRef(null);
  const chatButtonRef = useRef(null);
  
  // Track which key is currently being "pressed" by the right stick
  const currentRightStickKey = useRef(null);
  
  // Track active state in refs for event handlers (refs don't cause re-renders in handlers)
  const leftStickActiveRef = useRef(false);
  const rightStickActiveRef = useRef(false);

  const stickRadius = 40; // Maximum movement radius in pixels

  // Calculate stick position relative to center
  const calculateStickPosition = useCallback((touch, stickElement) => {
    if (!stickElement) return { x: 0, y: 0 };
    
    const rect = stickElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // Clamp to radius
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > stickRadius) {
      deltaX = (deltaX / distance) * stickRadius;
      deltaY = (deltaY / distance) * stickRadius;
    }
    
    return { x: deltaX, y: deltaY };
  }, []);

  // Send key events for right stick (flying controls)
  const handleRightStickInput = useCallback((position) => {
    const threshold = 15; // Minimum movement to trigger action
    
    // Determine which key should be pressed based on Y position
    let newKey = null;
    if (position.y < -threshold) {
      // Stick pushed up - Shift (fly up)
      newKey = 'shift';
    } else if (position.y > threshold) {
      // Stick pushed down - Space (descend/jump)
      newKey = 'space';
    }
    
    // Only send events if the key changed
    if (newKey !== currentRightStickKey.current) {
      console.log('Right stick key change:', currentRightStickKey.current, '->', newKey);
      // Release previous key if any
      if (currentRightStickKey.current) {
        console.log('Right stick releasing key:', currentRightStickKey.current);
        const msg = `MOBILE_KEY.UP(${currentRightStickKey.current})`;
        sendWorldMessage(msg);
      }
      
      // Press new key if any
      if (newKey) {
        const msg = `MOBILE_KEY.DOWN(${newKey})`;
        sendWorldMessage(msg);
      }
      
      currentRightStickKey.current = newKey;
    }
  }, []);

  // Attach touch event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const leftStick = leftStickRef.current;
    const rightStick = rightStickRef.current;
    
    if (!leftStick || !rightStick) return;

    // Left stick handlers
    const handleLeftTouchStart = (e) => {
      e.preventDefault();
      leftStickActiveRef.current = true;
      setLeftStickActive(true);
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, leftStick);
      setLeftStickPosition(position);
    };

    const handleLeftTouchMove = (e) => {
      e.preventDefault();
      if (!leftStickActiveRef.current) return;
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, leftStick);
      setLeftStickPosition(position);
    };

    const handleLeftTouchEnd = (e) => {
      e.preventDefault();
      leftStickActiveRef.current = false;
      setLeftStickActive(false);
      setLeftStickPosition({ x: 0, y: 0 });
    };

    // Right stick handlers
    const handleRightTouchStart = (e) => {
      e.preventDefault();
      rightStickActiveRef.current = true;
      setRightStickActive(true);
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, rightStick);
      setRightStickPosition(position);
      handleRightStickInput(position);
    };

    const handleRightTouchMove = (e) => {
      e.preventDefault();
      if (!rightStickActiveRef.current) return;
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, rightStick);
      setRightStickPosition(position);
      handleRightStickInput(position);
    };

    const handleRightTouchEnd = (e) => {
      e.preventDefault();
      rightStickActiveRef.current = false;
      setRightStickActive(false);
      setRightStickPosition({ x: 0, y: 0 });
      
      // Release any held key
      if (currentRightStickKey.current) {
        const msg = `MOBILE_KEY.UP(${currentRightStickKey.current})`;
        sendWorldMessage(msg);
        currentRightStickKey.current = null;
      }
    };

    // Add event listeners with passive: false
    leftStick.addEventListener('touchstart', handleLeftTouchStart, { passive: false });
    leftStick.addEventListener('touchmove', handleLeftTouchMove, { passive: false });
    leftStick.addEventListener('touchend', handleLeftTouchEnd, { passive: false });
    leftStick.addEventListener('touchcancel', handleLeftTouchEnd, { passive: false });

    rightStick.addEventListener('touchstart', handleRightTouchStart, { passive: false });
    rightStick.addEventListener('touchmove', handleRightTouchMove, { passive: false });
    rightStick.addEventListener('touchend', handleRightTouchEnd, { passive: false });
    rightStick.addEventListener('touchcancel', handleRightTouchEnd, { passive: false });

    return () => {
      leftStick.removeEventListener('touchstart', handleLeftTouchStart);
      leftStick.removeEventListener('touchmove', handleLeftTouchMove);
      leftStick.removeEventListener('touchend', handleLeftTouchEnd);
      leftStick.removeEventListener('touchcancel', handleLeftTouchEnd);

      rightStick.removeEventListener('touchstart', handleRightTouchStart);
      rightStick.removeEventListener('touchmove', handleRightTouchMove);
      rightStick.removeEventListener('touchend', handleRightTouchEnd);
      rightStick.removeEventListener('touchcancel', handleRightTouchEnd);
    };
  }, [calculateStickPosition, handleRightStickInput]);

  // Chat button handlers (tap to toggle, hold for history)
  const handleChatTouchStart = useCallback((e) => {
    // Start long press timer for history
    chatLongPressTimer.current = setTimeout(() => {
      if (onChatLongPress) {
        onChatLongPress();
      }
      chatLongPressTimer.current = null;
    }, 500); // 500ms for long press
  }, [onChatLongPress]);

  const handleChatTouchEnd = useCallback((e) => {
    // If timer still exists, it was a short press (tap)
    if (chatLongPressTimer.current) {
      clearTimeout(chatLongPressTimer.current);
      chatLongPressTimer.current = null;
      
      if (onChatClick) {
        onChatClick();
      }
    }
  }, [onChatClick]);

  const handleChatTouchCancel = useCallback(() => {
    if (chatLongPressTimer.current) {
      clearTimeout(chatLongPressTimer.current);
      chatLongPressTimer.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatLongPressTimer.current) {
        clearTimeout(chatLongPressTimer.current);
      }
      // Release any held keys
      if (currentRightStickKey.current) {
        sendWorldMessage(`MOBILE_KEY.UP(${currentRightStickKey.current})`);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="mobile-controls">
      {/* Analog sticks row - above the dock */}
      <div className="analog-sticks-row">
        {/* Left analog stick (WASD - non-functional for now) */}
        <div 
          className={`analog-stick left-stick ${leftStickActive ? 'active' : ''}`}
          ref={leftStickRef}
        >
          <div className="stick-base">
            <div 
              className="stick-knob"
              style={{
                transform: `translate(${leftStickPosition.x}px, ${leftStickPosition.y}px)`
              }}
            />
          </div>
        </div>

        {/* Right analog stick (Shift/Space for flying) */}
        <div 
          className={`analog-stick right-stick ${rightStickActive ? 'active' : ''}`}
          ref={rightStickRef}
        >
          <div className="stick-base">
            <div 
              className="stick-knob"
              style={{
                transform: `translate(${rightStickPosition.x}px, ${rightStickPosition.y}px)`
              }}
            />
            {/* Direction indicators */}
            <div className="stick-indicator up">↑</div>
            <div className="stick-indicator down">↓</div>
          </div>
        </div>
      </div>

      {/* Bottom controls row - same level as dock */}
      <div className="bottom-controls-row">
        {/* Menu button (left of dock) */}
        <button 
          className="mobile-action-button menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span className="button-icon">☰</span>
        </button>

        {/* Spacer for dock */}
        <div className="dock-spacer" />

        {/* Chat button (right of dock) */}
        <button 
          className="mobile-action-button chat-button"
          ref={chatButtonRef}
          onTouchStart={handleChatTouchStart}
          onTouchEnd={handleChatTouchEnd}
          onTouchCancel={handleChatTouchCancel}
          aria-label="Toggle chat"
        >
          <span className="button-icon">💬</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
