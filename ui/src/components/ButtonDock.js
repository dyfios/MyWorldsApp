import React, { useState, useEffect, useRef } from 'react';
import './ButtonDock.css';
import DockButton from './DockButton';

const ButtonDock = ({ 
  buttons, 
  selectedButtonId, 
  onSelectButton, 
  onReorderButtons,
  onSelectByNumber,
  onSelectPrevious,
  onSelectNext,
  isChatActive = false
}) => {
  const [hoveredButton, setHoveredButton] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const longPressTimerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keyboard if chat is active
      if (isChatActive) {
        return;
      }

      // Number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        const number = parseInt(e.key, 10);
        onSelectByNumber(number);
      }
      // Arrow keys
      else if (e.key === 'ArrowLeft') {
        onSelectPrevious();
      }
      else if (e.key === 'ArrowRight') {
        onSelectNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectByNumber, onSelectPrevious, onSelectNext, isChatActive]);

  // Mouse move tracking for drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current && draggedIndex !== null) {
        setDragPosition({ x: e.clientX, y: e.clientY });
        
        // Find which button we're hovering over
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const buttonElement = elements.find(el => el.hasAttribute('data-button-index'));
        
        if (buttonElement) {
          const index = parseInt(buttonElement.getAttribute('data-button-index'), 10);
          if (index !== draggedIndex) {
            setDragOverIndex(index);
          }
        }
      }
    };

    const handleTouchMoveGlobal = (e) => {
      if (isDraggingRef.current && draggedIndex !== null && e.touches.length > 0) {
        const touch = e.touches[0];
        setDragPosition({ x: touch.clientX, y: touch.clientY });
        
        // Find which button we're hovering over
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const buttonElement = elements.find(el => el.hasAttribute('data-button-index'));
        
        if (buttonElement) {
          const index = parseInt(buttonElement.getAttribute('data-button-index'), 10);
          if (index !== draggedIndex) {
            setDragOverIndex(index);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current && draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
        onReorderButtons(draggedIndex, dragOverIndex);
      }
      
      // Reset drag state
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragPosition({ x: 0, y: 0 });
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggedIndex, dragOverIndex, onReorderButtons]);

  const handleMouseDown = (index, e) => {
    // Start long-press timer
    longPressTimerRef.current = setTimeout(() => {
      setDraggedIndex(index);
      isDraggingRef.current = true;
      setDragPosition({ x: e.clientX, y: e.clientY });
    }, 500); // 500ms for long press
  };

  const handleMouseUpLocal = () => {
    // Clear long-press timer if not yet dragging
    if (longPressTimerRef.current && !isDraggingRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseEnter = (index) => {
    if (isDraggingRef.current && draggedIndex !== null) {
      setDragOverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    // Clear long-press timer if mouse leaves before timeout
    if (longPressTimerRef.current && !isDraggingRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Touch events for mobile
  const handleTouchStart = (index, e) => {
    longPressTimerRef.current = setTimeout(() => {
      setDraggedIndex(index);
      isDraggingRef.current = true;
      const touch = e.touches[0];
      setDragPosition({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    // Touch end is now handled by the global mouseup listener
  };

  const handleTouchMove = (e) => {
    if (isDraggingRef.current && draggedIndex !== null) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const buttonElement = element?.closest('[data-button-index]');
      
      if (buttonElement) {
        const index = parseInt(buttonElement.getAttribute('data-button-index'), 10);
        setDragOverIndex(index);
      }
    }
  };

  const draggedButton = draggedIndex !== null ? buttons[draggedIndex] : null;

  return (
    <>
      <div className="button-dock-container">
        <div className="button-dock">
          {buttons.map((button, index) => {
            const isSelected = button.id === selectedButtonId;
            const isHovered = hoveredButton === button.id;
            const isDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <DockButton
                key={button.id}
                button={button}
                index={index}
                isSelected={isSelected}
                isHovered={isHovered}
                isDragged={isDragged}
                isDragOver={isDragOver}
                dragPosition={dragPosition}
                onHover={() => setHoveredButton(button.id)}
                onLeave={() => setHoveredButton(null)}
                onClick={() => onSelectButton(button.id)}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUpLocal}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              />
            );
          })}
        </div>
        
        {(hoveredButton || selectedButtonId) && (
          <div className="button-name-display">
            {buttons.find(btn => btn.id === (hoveredButton || selectedButtonId))?.name}
          </div>
        )}
      </div>

      {/* Dragged button floating element */}
      {draggedButton && isDraggingRef.current && dragPosition.x !== 0 && (
        <div
          className="dragged-button-ghost"
          style={{
            position: 'fixed',
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            pointerEvents: 'none'
          }}
        >
          <button className="dock-button dragged">
            <div className="button-content">
              {draggedButton.thumbnail && (
                typeof draggedButton.thumbnail === 'string' && draggedButton.thumbnail.startsWith('http') ? (
                  <img src={draggedButton.thumbnail} alt={draggedButton.name} className="button-thumbnail" />
                ) : (
                  <span className="button-emoji">{draggedButton.thumbnail}</span>
                )
              )}
            </div>
          </button>
        </div>
      )}
    </>
  );
};

export default ButtonDock;