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
    
    let success = true;
    
    // Add tabs to the popup menu
    if (window.popupMenuAPI && typeof window.popupMenuAPI.addTab === 'function') {
      // Add the UI Settings tab first
      const uiSettingsTabId = window.popupMenuAPI.addTab('UI Settings', 'ui-settings.html');
      console.log('UI Settings tab added to popup menu with ID:', uiSettingsTabId);
      console.log('Added tab URL: ui-settings.html');
      
      // Add the Tools tab with a small delay and without specifying position
      setTimeout(() => {
        const toolsTabId = window.popupMenuAPI.addTab('Tools', 'tools.html');
        console.log('Tools tab added to popup menu with ID:', toolsTabId);
        console.log('Added tab URL: tools.html');
        
        // Debug: Check all tabs
        const allTabs = window.popupMenuAPI.getTabs();
        console.log('All tabs after adding:', allTabs.map(tab => ({ name: tab.name, url: tab.url })));
      }, 100);
    } else {
      console.warn('PopupMenu API not available, cannot add tabs');
      success = false;
    }
    
    return success;
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

  // Tools API functions
  const addTool = useCallback((name, thumbnail, onClick) => {
    console.log('addTool called:', { name, thumbnail, onClick });
    
    // Send message to the Tools iframe if it exists
    if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
      const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
      if (toolsTabs.length > 0) {
        const success = window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
          type: 'add-tool',
          data: { name, thumbnail, onClick }
        });
        if (success) {
          console.log('Tool add message sent successfully');
          return true;
        }
      }
    }
    console.warn('Could not send tool add message - Tools tab not found or API not available');
    return false;
  }, []);

  const removeTool = useCallback((toolId) => {
    console.log('removeTool called with ID:', toolId);
    
    // Send message to the Tools iframe if it exists
    if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
      const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
      if (toolsTabs.length > 0) {
        const success = window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
          type: 'remove-tool',
          data: { toolId }
        });
        if (success) {
          console.log('Tool remove message sent successfully');
          return true;
        }
      }
    }
    console.warn('Could not send tool remove message - Tools tab not found or API not available');
    return false;
  }, []);

  const clearTools = useCallback(() => {
    console.log('clearTools called');
    
    // Send message to the Tools iframe if it exists
    if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
      const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
      if (toolsTabs.length > 0) {
        const success = window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
          type: 'clear-tools',
          data: {}
        });
        if (success) {
          console.log('Clear tools message sent successfully');
          return true;
        }
      }
    }
    console.warn('Could not send clear tools message - Tools tab not found or API not available');
    return false;
  }, []);

  return {
    currentSettings,
    initializeUISettings,
    isWorldTypeSupported,
    getSettings,
    updateSettings,
    initialize,
    // Tools API
    addTool,
    removeTool,
    clearTools
  };
};