import React from 'react';
import './Crosshair.css';

/**
 * Crosshair component - displays a cross-style crosshair in the center of the screen
 * Used in first-person view mode
 * 
 * Props:
 * - visible: boolean - whether the crosshair should be visible
 * - hovering: boolean - whether hovering over an interactable entity (changes color to green)
 */
function Crosshair({ visible = false, hovering = false }) {
  if (!visible) {
    return null;
  }

  return (
    <div className={`crosshair ${hovering ? 'crosshair-hovering' : ''}`}>
      <div className="crosshair-horizontal"></div>
      <div className="crosshair-vertical"></div>
    </div>
  );
}

export default Crosshair;
