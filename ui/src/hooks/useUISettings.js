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
    return true;
  }, []);

  const isWorldTypeSupported = useCallback(() => {
    return true;
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