import React, { useState, useEffect } from 'react';
import './Crosshair.css';

const Crosshair = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.crosshairAPI = {
      show: () => setIsVisible(true),
      hide: () => setIsVisible(false),
      isVisible: () => isVisible,
    };

    return () => {
      if (window.crosshairAPI) {
        delete window.crosshairAPI;
      }
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="crosshair">
      <div className="crosshair-h" />
      <div className="crosshair-v" />
    </div>
  );
};

export default Crosshair;
