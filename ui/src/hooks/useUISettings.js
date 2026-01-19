/* global postWorldMessage */
import { useState, useCallback } from 'react';

/**
 * Send a message to the world/WebVerse runtime
 * Uses both postWorldMessage and direct parent.postMessage for WebGL compatibility
 */
function sendWorldMessage(msg) {
  if (typeof postWorldMessage === 'function') {
    try { postWorldMessage(msg); } catch (e) { console.error('[useUISettings] postWorldMessage error:', e); }
  }
  if (window.parent && window.parent !== window) {
    const messageType = window.name ? 'vuplex.postMessage-' + window.name : 'vuplex.postMessage';
    try { window.parent.postMessage({ type: messageType, message: msg }, '*'); } catch (e) { console.error('[useUISettings] parent.postMessage error:', e); }
  }
}

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

  // Flying toggle function for double-tap space
  const toggleFlying = useCallback(() => {
    // Use functional update to get current state reliably
    setCurrentSettings(prev => {
      console.log('toggleFlying called - current flying state:', prev.flying);
      
      const newFlyingState = !prev.flying;
      const newSettings = { ...prev, flying: newFlyingState };
      
      // Send message to UI Settings iframe if it exists
      if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
        const uiSettingsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'UI Settings');
        if (uiSettingsTabs.length > 0) {
          window.popupMenuAPI.sendMessageToTab(uiSettingsTabs[0].id, {
            type: 'update-settings',
            data: { flying: newFlyingState }
          });
          console.log('Flying state update sent to UI Settings tab');
        }
      }
      
      // Send flying state change to the world via sendWorldMessage (with WebGL fallback)
      sendWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(newSettings)})`);
      console.log('Flying toggle sent to world:', newFlyingState);
      
      console.log('Flying toggled to:', newFlyingState);
      return newSettings;
    });
  }, []);

  return {
    currentSettings,
    setCurrentSettings, // Expose so App.js can update from iframe messages
    initializeUISettings,
    isWorldTypeSupported,
    getSettings,
    updateSettings,
    initialize,
    // Tools API
    addTool,
    removeTool,
    clearTools,
    // Flying toggle
    toggleFlying
  };
};