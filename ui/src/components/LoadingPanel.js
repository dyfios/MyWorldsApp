import React, { useState, useEffect } from 'react';
import './LoadingPanel.css';

const LoadingPanel = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState('Loading...');

  // API: Show loading panel
  const showLoading = (loadingMessage = 'Loading...') => {
    setMessage(loadingMessage);
    setIsVisible(true);
  };

  // API: Hide loading panel
  const hideLoading = () => {
    console.log('[LoadingPanel] hideLoading() called');
    console.trace('[LoadingPanel] hide caller');
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

  console.log('[LoadingPanel] render: isVisible=' + isVisible);
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