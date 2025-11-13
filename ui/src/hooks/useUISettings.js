/**
 * UI Settings Hook - React hook for managing UI Settings functionality
 * Integrates with popup menu system and provides global API access
 */

import { useState, useEffect, useCallback } from 'react';

// Configuration
const UI_SETTINGS_CONFIG = {
    tabName: 'UI Settings',
    tabUrl: './ui-settings.html',
    position: 0, // Insert at beginning (before other tabs)
    autoLoad: true,
    supportedWorldTypes: ['mini-world', 'planet'] // Only add for these world types
};

export const useUISettings = () => {
    // Settings state management
    const [currentSettings, setCurrentSettings] = useState({
        cameraMode: 'firstPerson',
        movementSpeed: 1.0,
        lookSpeed: 1.0,
        flying: false
    });

    const [settingsChangeCallbacks, setSettingsChangeCallbacks] = useState([]);

    // Check if current world type supports UI settings
    const isWorldTypeSupported = useCallback((worldType = null) => {
        try {
            // Use provided world type or check for temporary world type first
            let currentWorldType = worldType || window.tempWorldType;
            
            if (!currentWorldType) {
                // Get world type from URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                currentWorldType = urlParams.get('worldType');
                
                // Also try to get from WebVerse World API if available
                if (typeof window.World !== 'undefined' && window.World.GetQueryParam) {
                    currentWorldType = window.World.GetQueryParam('worldType') || currentWorldType;
                }
            }
            
            console.log('Checking world type for UI Settings support:', currentWorldType);
            
            if (!currentWorldType) {
                console.log('No world type specified, UI Settings will not be added');
                return false;
            }
            
            const isSupported = UI_SETTINGS_CONFIG.supportedWorldTypes.includes(currentWorldType);
            console.log('World type', currentWorldType, 'is', isSupported ? 'supported' : 'not supported', 'for UI Settings');
            
            return isSupported;
        } catch (error) {
            console.error('Error checking world type:', error);
            return false;
        }
    }, []);

    // Add the UI Settings tab
    const addUISettingsTab = useCallback(() => {
        if (window.popupMenuAPI) {
            const tabId = window.popupMenuAPI.addTab(
                UI_SETTINGS_CONFIG.tabName, 
                UI_SETTINGS_CONFIG.tabUrl,
                UI_SETTINGS_CONFIG.position
            );

            console.log('UI Settings tab added with ID:', tabId);
            return tabId;
        } else {
            console.warn('PopupMenu API not available yet, retrying...');
            setTimeout(addUISettingsTab, 100);
        }
    }, []);

    // Handle messages from the UI Settings iframe
    const handleUISettingsMessage = useCallback(({ tabId, tabName, type, data }) => {
        if (tabName !== UI_SETTINGS_CONFIG.tabName) return;

        switch (type) {
            case 'iframe-ready':
                console.log('UI Settings iframe is ready');
                if (data && data.settings) {
                    setCurrentSettings({ ...data.settings });
                    notifySettingsChanged({ ...data.settings });
                }
                break;

            case 'settings-changed':
                console.log('UI Settings changed:', data);
                setCurrentSettings({ ...data });
                notifySettingsChanged({ ...data });
                
                // Apply settings to the world
                applySettingsToWorld({ ...data });
                break;

            case 'settings-response':
                console.log('Received settings response:', data);
                setCurrentSettings({ ...data });
                break;

            default:
                console.log('Unknown message type from UI Settings:', type, data);
        }
    }, []);

    // Apply settings to the WebVerse world
    const applySettingsToWorld = useCallback((settings) => {
        try {
            // Send settings to the main world via postWorldMessage
            if (typeof window.postWorldMessage === 'function') {
                window.postWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(settings)})`);
            }

            // You can also apply settings directly if WebVerse APIs are available
            // Example implementations:
            
            // Camera mode
            if (settings.cameraMode && window.playerController) {
                console.log('Applying camera mode:', settings.cameraMode);
            }

            // Movement speed
            if (settings.movementSpeed && window.playerController) {
                console.log('Applying movement speed:', settings.movementSpeed);
            }

            // Look speed
            if (settings.lookSpeed && window.playerController) {
                console.log('Applying look speed:', settings.lookSpeed);
            }

            // Flying mode
            if (settings.hasOwnProperty('flying') && window.playerController) {
                console.log('Applying flying mode:', settings.flying);
            }

        } catch (error) {
            console.error('Failed to apply UI settings to world:', error);
        }
    }, []);

    // Notify callbacks when settings change
    const notifySettingsChanged = useCallback((settings) => {
        settingsChangeCallbacks.forEach(callback => {
            try {
                callback(settings);
            } catch (error) {
                console.error('Error in settings change callback:', error);
            }
        });
    }, [settingsChangeCallbacks]);

    // Initialize UI Settings for a specific world type
    const initializeUISettings = useCallback((worldType) => {
        console.log('initializeUISettings called with worldType:', worldType);
        
        if (!worldType || !UI_SETTINGS_CONFIG.supportedWorldTypes.includes(worldType)) {
            console.log('UI Settings not initialized - world type not supported:', worldType);
            return false;
        }
        
        // Override the URL parameter check with the provided world type
        window.tempWorldType = worldType;
        
        // Initialize if popup menu is available
        if (window.popupMenuAPI) {
            window.popupMenuAPI.onTabMessage(handleUISettingsMessage);
            
            // Add the tab if auto-load is enabled
            if (UI_SETTINGS_CONFIG.autoLoad) {
                addUISettingsTab();
            }
            
            console.log('UI Settings integration initialized for world type:', worldType);
        } else {
            // Retry if popup menu API isn't ready yet
            setTimeout(() => initializeUISettings(worldType), 100);
        }
        
        // Clean up temp world type
        setTimeout(() => {
            delete window.tempWorldType;
        }, 1000);
        
        return true;
    }, [handleUISettingsMessage, addUISettingsTab]);

    // Initialize when popup menu API is available
    const initialize = useCallback(() => {
        // Check if world type supports UI settings
        if (!isWorldTypeSupported()) {
            console.log('UI Settings not initialized - world type not supported');
            return;
        }
        
        // Register message handler for UI Settings
        if (window.popupMenuAPI) {
            window.popupMenuAPI.onTabMessage(handleUISettingsMessage);
            
            // Add the tab if auto-load is enabled
            if (UI_SETTINGS_CONFIG.autoLoad) {
                addUISettingsTab();
            }
            
            console.log('UI Settings integration initialized');
        } else {
            // Retry if popup menu API isn't ready yet
            setTimeout(initialize, 100);
        }
    }, [isWorldTypeSupported, handleUISettingsMessage, addUISettingsTab]);

    // Public API methods
    const updateSettings = useCallback((newSettings) => {
        const updatedSettings = { ...currentSettings, ...newSettings };
        
        // Send update to iframe if it exists
        if (window.popupMenuAPI) {
            const tabs = window.popupMenuAPI.getTabs();
            const uiSettingsTab = tabs.find(tab => tab.name === UI_SETTINGS_CONFIG.tabName);
            
            if (uiSettingsTab) {
                window.popupMenuAPI.sendMessageToTab(uiSettingsTab.id, {
                    type: 'update-settings',
                    data: newSettings
                });
            }
        }
        
        setCurrentSettings(updatedSettings);
        notifySettingsChanged(updatedSettings);
        applySettingsToWorld(updatedSettings);
    }, [currentSettings, notifySettingsChanged, applySettingsToWorld]);

    const requestSettings = useCallback(() => {
        if (window.popupMenuAPI) {
            const tabs = window.popupMenuAPI.getTabs();
            const uiSettingsTab = tabs.find(tab => tab.name === UI_SETTINGS_CONFIG.tabName);
            
            if (uiSettingsTab) {
                window.popupMenuAPI.sendMessageToTab(uiSettingsTab.id, {
                    type: 'get-settings'
                });
            }
        }
    }, []);

    const onSettingsChange = useCallback((callback) => {
        setSettingsChangeCallbacks(prev => [...prev, callback]);
        return () => {
            setSettingsChangeCallbacks(prev => prev.filter(cb => cb !== callback));
        };
    }, []);

    const resetSettings = useCallback(() => {
        const defaultSettings = {
            cameraMode: 'firstPerson',
            movementSpeed: 1.0,
            lookSpeed: 1.0,
            flying: false
        };
        
        updateSettings(defaultSettings);
    }, [updateSettings]);

    return {
        currentSettings,
        initializeUISettings,
        isWorldTypeSupported,
        addUISettingsTab: () => {
            if (!isWorldTypeSupported()) {
                console.warn('Cannot add UI Settings tab - world type not supported');
                return false;
            }
            return addUISettingsTab();
        },
        getSettings: () => ({ ...currentSettings }),
        updateSettings,
        requestSettings,
        onSettingsChange,
        resetSettings,
        initialize
    };
};