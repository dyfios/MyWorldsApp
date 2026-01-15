/* global postWorldMessage */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import './MobileControls.css';

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
    const normalizedY = position.y / stickRadius; // -1 to 1
    
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
        if (typeof postWorldMessage === 'function') {
          postWorldMessage(`MOBILE_CONTROL.KEY_UP(${currentRightStickKey.current})`);
        }
      }
      
      // Press new key if any
      if (newKey) {
        if (typeof postWorldMessage === 'function') {
          postWorldMessage(`MOBILE_CONTROL.KEY_DOWN(${newKey})`);
        }
      }
      
      currentRightStickKey.current = newKey;
    }
  }, []);

  // Left stick touch handlers
  const handleLeftStickTouchStart = useCallback((e) => {
    e.preventDefault();
    setLeftStickActive(true);
    const touch = e.touches[0];
    const position = calculateStickPosition(touch, leftStickRef.current);
    setLeftStickPosition(position);
    // Left stick is non-functional for now (WASD movement)
  }, [calculateStickPosition]);

  const handleLeftStickTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!leftStickActive) return;
    const touch = e.touches[0];
    const position = calculateStickPosition(touch, leftStickRef.current);
    setLeftStickPosition(position);
    // Left stick is non-functional for now
  }, [leftStickActive, calculateStickPosition]);

  const handleLeftStickTouchEnd = useCallback((e) => {
    e.preventDefault();
    setLeftStickActive(false);
    setLeftStickPosition({ x: 0, y: 0 });
  }, []);

  // Right stick touch handlers
  const handleRightStickTouchStart = useCallback((e) => {
    e.preventDefault();
    setRightStickActive(true);
    const touch = e.touches[0];
    const position = calculateStickPosition(touch, rightStickRef.current);
    setRightStickPosition(position);
    handleRightStickInput(position);
  }, [calculateStickPosition, handleRightStickInput]);

  const handleRightStickTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!rightStickActive) return;
    const touch = e.touches[0];
    const position = calculateStickPosition(touch, rightStickRef.current);
    setRightStickPosition(position);
    handleRightStickInput(position);
  }, [rightStickActive, calculateStickPosition, handleRightStickInput]);

  const handleRightStickTouchEnd = useCallback((e) => {
    e.preventDefault();
    setRightStickActive(false);
    setRightStickPosition({ x: 0, y: 0 });
    
    // Release any held key
    if (currentRightStickKey.current) {
      if (typeof postWorldMessage === 'function') {
        postWorldMessage(`MOBILE_CONTROL.KEY_UP(${currentRightStickKey.current})`);
      }
      currentRightStickKey.current = null;
    }
  }, []);

  // Chat button handlers (tap to toggle, hold for history)
  const handleChatTouchStart = useCallback((e) => {
    e.preventDefault();
    
    // Start long press timer for history
    chatLongPressTimer.current = setTimeout(() => {
      if (onChatLongPress) {
        onChatLongPress();
      }
      chatLongPressTimer.current = null;
    }, 500); // 500ms for long press
  }, [onChatLongPress]);

  const handleChatTouchEnd = useCallback((e) => {
    e.preventDefault();
    
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
        if (typeof postWorldMessage === 'function') {
          postWorldMessage(`MOBILE_CONTROL.KEY_UP(${currentRightStickKey.current})`);
        }
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
          onTouchStart={handleLeftStickTouchStart}
          onTouchMove={handleLeftStickTouchMove}
          onTouchEnd={handleLeftStickTouchEnd}
          onTouchCancel={handleLeftStickTouchEnd}
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
          onTouchStart={handleRightStickTouchStart}
          onTouchMove={handleRightStickTouchMove}
          onTouchEnd={handleRightStickTouchEnd}
          onTouchCancel={handleRightStickTouchEnd}
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
