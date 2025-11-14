import { useState, useCallback } from 'react';

export const useUISettings = () => {
  const [currentSettings, setCurrentSettings] = useState({
    cameraMode: 'firstPerson',
    movementSpeed: 1,
    lookSpeed: 1,
    flying: false
  });

  const initializeUISettings = useCallback((worldType) => {
    console.log('initializeUISettings called with worldType:', worldType);
    
    // Check if the world type supports UI settings
    if (!isWorldTypeSupported(worldType)) {
      console.log('World type not supported for UI settings:', worldType);
      return false;
    }
    
    // Add the UI Settings tab to the popup menu
    if (window.popupMenuAPI && typeof window.popupMenuAPI.addTab === 'function') {
      const tabId = window.popupMenuAPI.addTab('UI Settings', 'ui-settings.html', 0);
      console.log('UI Settings tab added to popup menu with ID:', tabId);
      return true;
    } else {
      console.warn('PopupMenu API not available, cannot add UI Settings tab');
      return false;
    }
  }, []);

  const isWorldTypeSupported = useCallback((worldType) => {
    // Define which world types support UI settings
    const supportedWorldTypes = ['mini-world', 'planet'];
    const supported = supportedWorldTypes.includes(worldType);
    console.log('isWorldTypeSupported called with worldType:', worldType, 'supported:', supported);
    return supported;
  }, []);

  const getSettings = useCallback(() => {
    return { ...currentSettings };
  }, [currentSettings]);

  const updateSettings = useCallback(() => {
    // Placeholder
  }, []);

  const initialize = useCallback(() => {
    console.log('UI Settings initialized');
  }, []);

  return {
    currentSettings,
    initializeUISettings,
    isWorldTypeSupported,
    getSettings,
    updateSettings,
    initialize
  };
};