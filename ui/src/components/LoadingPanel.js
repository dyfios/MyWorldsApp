import React, { useState, useEffect } from 'react';
import './LoadingPanel.css';

const LoadingPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('Loading...');

  // API: Show loading panel
  const showLoading = (loadingMessage = 'Loading...') => {console.log("z");
    setMessage(loadingMessage);
    setIsVisible(true);
  };

  // API: Hide loading panel
  const hideLoading = () => {console.log("y");
    setIsVisible(false);
  };

  // API: Update loading message
  const updateMessage = (newMessage) => {
    setMessage(newMessage);
  };

  // Expose API globally
  useEffect(() => {
    window.loadingPanelAPI = {
      show: showLoading,
      hide: hideLoading,
      updateMessage,
      isVisible: () => isVisible,
      getMessage: () => message
    };

    // Cleanup function
    return () => {
      if (window.loadingPanelAPI) {
        delete window.loadingPanelAPI;
      }
    };
  }, [isVisible, message]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="loading-panel-overlay">
      <div className="loading-panel-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );
};

export default LoadingPanel;