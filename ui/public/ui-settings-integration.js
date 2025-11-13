/**
 * UI Settings Tab Integration
 * Automatically adds the UI Settings tab to the popup menu for mini-world and planet types
 * 
 * CONDITIONAL LOADING:
 * - Only loads for worldType = 'mini-world' or 'planet'
 * - Can be initialized manually via window.initializeUISettings(worldType)
 * - Main application calls this during world type initialization
 */

(function() {
    'use strict';

    // Configuration
    const UI_SETTINGS_CONFIG = {
        tabName: 'UI Settings',
        tabUrl: './ui-settings.html',
        position: 0, // Insert at beginning (before other tabs)
        autoLoad: true,
        supportedWorldTypes: ['mini-world', 'planet'] // Only add for these world types
    };

    // Settings state management
    let currentSettings = {
        cameraMode: 'firstPerson',
        movementSpeed: 1.0,
        lookSpeed: 1.0,
        flying: false
    };

    // Callback for when settings change
    let settingsChangeCallbacks = [];

    // Check if current world type supports UI settings
    function isWorldTypeSupported() {
        try {
            // Check for temporary world type first (set by initializeUISettings)
            if (window.tempWorldType) {
                return UI_SETTINGS_CONFIG.supportedWorldTypes.includes(window.tempWorldType);
            }
            
            // Get world type from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const worldType = urlParams.get('worldType');
            
            // Also try to get from WebVerse World API if available
            let worldTypeFromAPI = null;
            if (typeof World !== 'undefined' && World.GetQueryParam) {
                worldTypeFromAPI = World.GetQueryParam('worldType');
            }
            
            const currentWorldType = worldTypeFromAPI || worldType;
            
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
    }

    // Add the UI Settings tab
    function addUISettingsTab() {
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
    }

    // Handle messages from the UI Settings iframe
    function handleUISettingsMessage({ tabId, tabName, type, data }) {
        if (tabName !== UI_SETTINGS_CONFIG.tabName) return;

        switch (type) {
            case 'iframe-ready':
                console.log('UI Settings iframe is ready');
                if (data && data.settings) {
                    currentSettings = { ...data.settings };
                    notifySettingsChanged(currentSettings);
                }
                break;

            case 'settings-changed':
                console.log('UI Settings changed:', data);
                currentSettings = { ...data };
                notifySettingsChanged(currentSettings);
                
                // Apply settings to the world
                applySettingsToWorld(currentSettings);
                break;

            case 'settings-response':
                console.log('Received settings response:', data);
                currentSettings = { ...data };
                break;

            default:
                console.log('Unknown message type from UI Settings:', type, data);
        }
    }

    // Apply settings to the WebVerse world
    function applySettingsToWorld(settings) {
        try {
            // Send settings to the main world via postWorldMessage
            if (typeof postWorldMessage === 'function') {
                postWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(settings)})`);
            }

            // You can also apply settings directly if WebVerse APIs are available
            // Example implementations:
            
            // Camera mode
            if (settings.cameraMode && window.playerController) {
                // This would depend on your PlayerController implementation
                console.log('Applying camera mode:', settings.cameraMode);
            }

            // Movement speed
            if (settings.movementSpeed && window.playerController) {
                // This would depend on your PlayerController implementation
                console.log('Applying movement speed:', settings.movementSpeed);
            }

            // Look speed
            if (settings.lookSpeed && window.playerController) {
                // This would depend on your PlayerController implementation
                console.log('Applying look speed:', settings.lookSpeed);
            }

            // Flying mode
            if (settings.hasOwnProperty('flying') && window.playerController) {
                // This would depend on your PlayerController implementation
                console.log('Applying flying mode:', settings.flying);
            }

        } catch (error) {
            console.error('Failed to apply UI settings to world:', error);
        }
    }

    // Notify callbacks when settings change
    function notifySettingsChanged(settings) {
        settingsChangeCallbacks.forEach(callback => {
            try {
                callback(settings);
            } catch (error) {
                console.error('Error in settings change callback:', error);
            }
        });
    }

    // Public API for other scripts to interact with UI settings
    window.UISettingsAPI = {
        // Check if world type is supported
        isWorldTypeSupported: () => isWorldTypeSupported(),
        
        // Manually add UI Settings tab (if supported)
        addTab: () => {
            if (!isWorldTypeSupported()) {
                console.warn('Cannot add UI Settings tab - world type not supported');
                return false;
            }
            return addUISettingsTab();
        },

        // Get current settings
        getSettings: () => ({ ...currentSettings }),

        // Update settings programmatically
        updateSettings: (newSettings) => {
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
            
            currentSettings = updatedSettings;
            notifySettingsChanged(currentSettings);
            applySettingsToWorld(currentSettings);
        },

        // Request current settings from iframe
        requestSettings: () => {
            if (window.popupMenuAPI) {
                const tabs = window.popupMenuAPI.getTabs();
                const uiSettingsTab = tabs.find(tab => tab.name === UI_SETTINGS_CONFIG.tabName);
                
                if (uiSettingsTab) {
                    window.popupMenuAPI.sendMessageToTab(uiSettingsTab.id, {
                        type: 'get-settings'
                    });
                }
            }
        },

        // Subscribe to settings changes
        onSettingsChange: (callback) => {
            settingsChangeCallbacks.push(callback);
            return () => {
                const index = settingsChangeCallbacks.indexOf(callback);
                if (index > -1) {
                    settingsChangeCallbacks.splice(index, 1);
                }
            };
        },

        // Reset settings to defaults
        resetSettings: () => {
            const defaultSettings = {
                cameraMode: 'firstPerson',
                movementSpeed: 1.0,
                lookSpeed: 1.0,
                flying: false
            };
            
            UISettingsAPI.updateSettings(defaultSettings);
        }
    };

    // Initialize when popup menu API is available
    function initialize() {
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
            
            // Mark as initialized
            if (window.UISettingsAPI) {
                window.UISettingsAPI._initialized = true;
            }
        } else {
            // Retry if popup menu API isn't ready yet
            setTimeout(initialize, 100);
        }
    }

    // Global function that can be called from main application
    window.initializeUISettings = function(worldType) {
        console.log('initializeUISettings called with worldType:', worldType);
        
        if (!worldType || !UI_SETTINGS_CONFIG.supportedWorldTypes.includes(worldType)) {
            console.log('UI Settings not initialized - world type not supported:', worldType);
            return false;
        }
        
        // Override the URL parameter check with the provided world type
        const originalIsSupported = isWorldTypeSupported;
        window.tempWorldType = worldType;
        
        // Temporarily override the function
        isWorldTypeSupported = () => UI_SETTINGS_CONFIG.supportedWorldTypes.includes(worldType);
        
        // Initialize if not already done
        if (!window.UISettingsAPI._initialized) {
            initialize();
            window.UISettingsAPI._initialized = true;
        } else {
            // If already initialized but tab wasn't added, add it now
            if (window.popupMenuAPI && UI_SETTINGS_CONFIG.autoLoad) {
                addUISettingsTab();
            }
        }
        
        // Restore original function
        isWorldTypeSupported = originalIsSupported;
        delete window.tempWorldType;
        
        return true;
    };

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Example usage and testing (only show if world type is supported)
    if (isWorldTypeSupported()) {
        console.log('UI Settings API loaded. Usage examples:');
        console.log('- UISettingsAPI.getSettings() - Get current settings');
        console.log('- UISettingsAPI.updateSettings({movementSpeed: 1.5}) - Update settings');
        console.log('- UISettingsAPI.onSettingsChange(callback) - Listen for changes');
        console.log('- UISettingsAPI.resetSettings() - Reset to defaults');
    } else {
        console.log('UI Settings API not loaded - world type not supported');
    }

})();