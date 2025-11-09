import React from 'react';
import './DockButton.css';

const DockButton = ({
  button,
  index,
  isSelected,
  isHovered,
  isDragged,
  isDragOver,
  dragPosition,
  onHover,
  onLeave,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  onTouchMove
}) => {
  // Calculate font size based on text length for non-URL thumbnails
  const getFontSize = (thumbnail) => {
    if (!thumbnail || thumbnail.startsWith('http')) {
      return '2rem'; // Default for images
    }
    
    const length = thumbnail.length;
    if (length <= 2) return '2rem';      // Emoji or 1-2 chars
    if (length <= 4) return '1.2rem';    // 3-4 chars
    if (length <= 6) return '0.9rem';    // 5-6 chars
    if (length <= 8) return '0.75rem';   // 7-8 chars
    return '0.6rem';                      // 9+ chars
  };

  const handleMouseDown = (e) => {
    onMouseDown(index, e);
  };

  const handleTouchStart = (e) => {
    onTouchStart(index, e);
  };

  const handleClick = (e) => {
    // Only trigger click if we're not in the middle of a drag
    if (!isDragged) {
      onClick();
    }
  };

  return (
    <div
      className={`dock-button-wrapper ${isDragOver ? 'drag-over' : ''}`}
      data-button-index={index}
      onMouseEnter={() => onMouseEnter(index)}
    >
      <button
        className={`dock-button ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${isDragged ? 'dragged' : ''}`}
        onMouseEnter={onHover}
        onMouseLeave={() => {
          onLeave();
          onMouseLeave();
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        aria-label={button.name}
      >
        <div className="button-content">
          {button.thumbnail && (
            typeof button.thumbnail === 'string' && button.thumbnail.startsWith('http') ? (
              <img src={button.thumbnail} alt={button.name} className="button-thumbnail" />
            ) : (
              <span 
                className="button-emoji"
                style={{ fontSize: getFontSize(button.thumbnail) }}
              >
                {button.thumbnail}
              </span>
            )
          )}
        </div>
        
        {isSelected && (
          <>
            <div className="selection-ring"></div>
            <div className="selection-glow"></div>
          </>
        )}
      </button>
    </div>
  );
};

export default DockButton;