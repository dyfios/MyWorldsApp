/* global postWorldMessage */
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import './MobileControls.css';

/**
 * Send a message to the world/WebVerse runtime
 * Uses both postWorldMessage and direct parent.postMessage for WebGL compatibility
 */
function sendWorldMessage(msg) {
  if (typeof postWorldMessage === 'function') {
    try { postWorldMessage(msg); } catch (e) { console.error('[MobileControls] postWorldMessage error:', e); }
  }
  if (window.parent && window.parent !== window) {
    const messageType = window.name ? 'vuplex.postMessage-' + window.name : 'vuplex.postMessage';
    try { window.parent.postMessage({ type: messageType, message: msg }, '*'); } catch (e) { console.error('[MobileControls] parent.postMessage error:', e); }
  }
}

const MobileControls = ({
  onMenuClick,
  onChatClick,
  onChatLongPress,
  visible = true,
  isFlying = false
}) => {
  // Debug: Log isFlying prop changes
  useEffect(() => {
    console.log('[MobileControls] isFlying prop changed to:', isFlying);
  }, [isFlying]);

  // Left stick state (WASD - currently non-functional)
  const [leftStickPosition, setLeftStickPosition] = useState({ x: 0, y: 0 });
  const [leftStickActive, setLeftStickActive] = useState(false);
  
  // Right stick state (vertical flight control when flying)
  const [rightStickPosition, setRightStickPosition] = useState({ x: 0, y: 0 });
  const [rightStickActive, setRightStickActive] = useState(false);
  
  const leftStickRef = useRef(null);
  const rightStickRef = useRef(null);
  const chatLongPressTimer = useRef(null);
  const chatButtonRef = useRef(null);
  
  // Track active state in refs for event handlers (refs don't cause re-renders in handlers)
  const leftStickActiveRef = useRef(false);
  const rightStickActiveRef = useRef(false);
  
  // Track isFlying in a ref so event handlers have current value
  const isFlyingRef = useRef(isFlying);
  useEffect(() => {
    isFlyingRef.current = isFlying;
  }, [isFlying]);

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

  // Send vertical flight speed based on stick Y position (flying mode)
  // Track which key is currently being "pressed" by right stick
  const currentRightStickKey = useRef(null);
  
  const handleFlyingStickInput = useCallback((position) => {
    const threshold = 15; // Minimum movement to trigger action
    
    // Determine which key should be pressed based on Y position
    let newKey = null;
    if (position.y < -threshold) {
      // Stick pushed up - Shift (fly up)
      newKey = 'shift';
    } else if (position.y > threshold) {
      // Stick pushed down - Space (descend)
      newKey = 'space';
    }
    
    // Only send events if the key changed
    if (newKey !== currentRightStickKey.current) {
      // Release previous key if any
      if (currentRightStickKey.current) {
        sendWorldMessage(`MOBILE_KEY.UP(${currentRightStickKey.current})`);
      }
      
      // Press new key if any
      if (newKey) {
        sendWorldMessage(`MOBILE_KEY.DOWN(${newKey})`);
      }
      
      currentRightStickKey.current = newKey;
    }
  }, []);

  // Handle jump button press (non-flying mode)
  const handleJumpPress = useCallback(() => {
    sendWorldMessage('MOBILE_KEY.DOWN(space)');
  }, []);

  const handleJumpRelease = useCallback(() => {
    sendWorldMessage('MOBILE_KEY.UP(space)');
  }, []);

  // Track last sent movement values to avoid spamming
  const lastMovement = useRef({ x: 0, y: 0 });

  // Handle left stick input - send movement vector based on position
  const handleLeftStickInput = useCallback((position) => {
    // Normalize position to -1 to 1 range
    // X: positive = right (D), negative = left (A)
    // Y: negative = forward (W), positive = backward (S)
    // For SetMovement: x = left/right, y = forward/backward
    const moveX = position.x / stickRadius; // -1 (left) to 1 (right)
    const moveY = -(position.y / stickRadius); // -1 (backward) to 1 (forward), inverted because screen Y is inverted
    
    // Round to 2 decimal places
    const roundedX = Math.round(moveX * 100) / 100;
    const roundedY = Math.round(moveY * 100) / 100;
    
    // Only send if changed significantly
    if (Math.abs(roundedX - lastMovement.current.x) > 0.05 || 
        Math.abs(roundedY - lastMovement.current.y) > 0.05) {
      lastMovement.current = { x: roundedX, y: roundedY };
      sendWorldMessage(`MOBILE_MOVE(${roundedX},${roundedY})`);
    }
  }, []);

  // Release left stick movement (send zero)
  const releaseLeftStickMovement = useCallback(() => {
    if (lastMovement.current.x !== 0 || lastMovement.current.y !== 0) {
      lastMovement.current = { x: 0, y: 0 };
      sendWorldMessage('MOBILE_MOVE(0,0)');
    }
  }, []);

  // Release flight key
  const releaseFlightKey = useCallback(() => {
    if (currentRightStickKey.current) {
      sendWorldMessage(`MOBILE_KEY.UP(${currentRightStickKey.current})`);
      currentRightStickKey.current = null;
    }
  }, []);

  // Attach LEFT stick touch event listeners (always present)
  useEffect(() => {
    const leftStick = leftStickRef.current;
    
    if (!leftStick) return;

    // Left stick handlers (WASD movement)
    const handleLeftTouchStart = (e) => {
      e.preventDefault();
      leftStickActiveRef.current = true;
      setLeftStickActive(true);
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, leftStick);
      setLeftStickPosition(position);
      handleLeftStickInput(position);
    };

    const handleLeftTouchMove = (e) => {
      e.preventDefault();
      if (!leftStickActiveRef.current) return;
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, leftStick);
      setLeftStickPosition(position);
      handleLeftStickInput(position);
    };

    const handleLeftTouchEnd = (e) => {
      e.preventDefault();
      leftStickActiveRef.current = false;
      setLeftStickActive(false);
      setLeftStickPosition({ x: 0, y: 0 });
      releaseLeftStickMovement();
    };

    // Add event listeners with passive: false
    leftStick.addEventListener('touchstart', handleLeftTouchStart, { passive: false });
    leftStick.addEventListener('touchmove', handleLeftTouchMove, { passive: false });
    leftStick.addEventListener('touchend', handleLeftTouchEnd, { passive: false });
    leftStick.addEventListener('touchcancel', handleLeftTouchEnd, { passive: false });

    return () => {
      leftStick.removeEventListener('touchstart', handleLeftTouchStart);
      leftStick.removeEventListener('touchmove', handleLeftTouchMove);
      leftStick.removeEventListener('touchend', handleLeftTouchEnd);
      leftStick.removeEventListener('touchcancel', handleLeftTouchEnd);
    };
  }, [calculateStickPosition, handleLeftStickInput, releaseLeftStickMovement]);

  // Attach RIGHT stick touch event listeners (only when flying)
  // Use useLayoutEffect to ensure DOM element exists before attaching handlers
  useLayoutEffect(() => {
    const rightStick = rightStickRef.current;
    
    // Right stick only exists when flying
    if (!rightStick || !isFlying) return;
    
    console.log('[MobileControls] Attaching right stick handlers, isFlying:', isFlying);

    // Right stick handlers (vertical flight control)
    const handleRightTouchStart = (e) => {
      e.preventDefault();
      rightStickActiveRef.current = true;
      setRightStickActive(true);
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, rightStick);
      setRightStickPosition(position);
      handleFlyingStickInput(position);
    };

    const handleRightTouchMove = (e) => {
      e.preventDefault();
      if (!rightStickActiveRef.current) return;
      const touch = e.touches[0];
      const position = calculateStickPosition(touch, rightStick);
      setRightStickPosition(position);
      handleFlyingStickInput(position);
    };

    const handleRightTouchEnd = (e) => {
      e.preventDefault();
      rightStickActiveRef.current = false;
      setRightStickActive(false);
      setRightStickPosition({ x: 0, y: 0 });
      
      // Release flight key when stick released
      releaseFlightKey();
    };

    rightStick.addEventListener('touchstart', handleRightTouchStart, { passive: false });
    rightStick.addEventListener('touchmove', handleRightTouchMove, { passive: false });
    rightStick.addEventListener('touchend', handleRightTouchEnd, { passive: false });
    rightStick.addEventListener('touchcancel', handleRightTouchEnd, { passive: false });

    return () => {
      rightStick.removeEventListener('touchstart', handleRightTouchStart);
      rightStick.removeEventListener('touchmove', handleRightTouchMove);
      rightStick.removeEventListener('touchend', handleRightTouchEnd);
      rightStick.removeEventListener('touchcancel', handleRightTouchEnd);
    };
  }, [isFlying, calculateStickPosition, handleFlyingStickInput, releaseFlightKey]);

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
      // Release all controls
      releaseLeftStickMovement();
      releaseFlightKey();
    };
  }, [releaseLeftStickMovement, releaseFlightKey]);

  if (!visible) return null;

  return (
    <div className="mobile-controls">
      {/* Analog sticks row - above the dock */}
      <div className="analog-sticks-row">
        {/* Left analog stick (WASD movement) */}
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

        {/* Right side: Show stick when flying, jump button when not */}
        {isFlying ? (
          /* Right analog stick (vertical flight control) */
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
        ) : (
          /* Jump button (when not flying) */
          <button
            className="mobile-action-button jump-button"
            onTouchStart={handleJumpPress}
            onTouchEnd={handleJumpRelease}
            onTouchCancel={handleJumpRelease}
            aria-label="Jump"
          >
            <span className="button-icon">⬆</span>
          </button>
        )}
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
