/* global postWorldMessage */
import React, { useState, useCallback } from 'react';
import './App.css';
import ButtonDock from './components/ButtonDock';
import ChatConsole from './components/ChatConsole';
import PopupMenu from './components/PopupMenu';

// UI Settings initialization - ensure it's always available
const initializeUISettingsIntegration = () => {
  // Configuration
  const UI_SETTINGS_CONFIG = {
    tabName: 'UI Settings',
    tabUrl: './ui-settings.html',
    position: 0,
    autoLoad: true,
    supportedWorldTypes: ['mini-world', 'planet']
  };

  // Settings state management
  let currentSettings = {
    cameraMode: 'firstPerson',
    movementSpeed: 1.0,
    lookSpeed: 1.0,
    flying: false
  };

  let settingsChangeCallbacks = [];

  // Check if current world type supports UI settings
  const isWorldTypeSupported = () => {
    try {
      if (window.tempWorldType) {
        return UI_SETTINGS_CONFIG.supportedWorldTypes.includes(window.tempWorldType);
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const worldType = urlParams.get('worldType');
      
      let worldTypeFromAPI = null;
      if (typeof World !== 'undefined' && World.GetQueryParam) {
        worldTypeFromAPI = World.GetQueryParam('worldType');
      }
      
      const currentWorldType = worldTypeFromAPI || worldType;
      
      if (!currentWorldType) {
        return false;
      }
      
      return UI_SETTINGS_CONFIG.supportedWorldTypes.includes(currentWorldType);
    } catch (error) {
      console.error('Error checking world type:', error);
      return false;
    }
  };

  // Add the UI Settings tab
  const addUISettingsTab = () => {
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
  };

  // Handle messages from the UI Settings iframe
  const handleUISettingsMessage = ({ tabId, tabName, type, data }) => {
    if (tabName !== UI_SETTINGS_CONFIG.tabName) return;

    switch (type) {
      case 'iframe-ready':
        console.log('UI Settings iframe is ready');
        if (data && data.settings) {
          currentSettings = { ...data.settings };
        }
        break;

      case 'settings-changed':
        console.log('UI Settings changed:', data);
        currentSettings = { ...data };
        
        // Apply settings to the world
        if (typeof postWorldMessage === 'function') {
          postWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(currentSettings)})`);
        }
        break;

      default:
        console.log('Unknown message type from UI Settings:', type, data);
    }
  };

  // Initialize function
  const initialize = () => {
    if (!isWorldTypeSupported()) {
      console.log('UI Settings not initialized - world type not supported');
      return;
    }
    
    if (window.popupMenuAPI) {
      window.popupMenuAPI.onTabMessage(handleUISettingsMessage);
      
      if (UI_SETTINGS_CONFIG.autoLoad) {
        addUISettingsTab();
      }
      
      console.log('UI Settings integration initialized');
      window.UISettingsAPI._initialized = true;
    } else {
      setTimeout(initialize, 100);
    }
  };

  // Create UISettingsAPI
  window.UISettingsAPI = {
    isWorldTypeSupported: () => isWorldTypeSupported(),
    _initialized: false,
    
    initializeForWorldType: (worldType) => {
      console.log('UISettingsAPI.initializeForWorldType called with:', worldType);
      
      if (!worldType || !UI_SETTINGS_CONFIG.supportedWorldTypes.includes(worldType)) {
        console.log('UI Settings not initialized - world type not supported:', worldType);
        return false;
      }
      
      window.tempWorldType = worldType;
      
      try {
        if (!window.UISettingsAPI._initialized) {
          initialize();
          window.UISettingsAPI._initialized = true;
        } else {
          if (window.popupMenuAPI && UI_SETTINGS_CONFIG.autoLoad) {
            addUISettingsTab();
          }
        }
        
        console.log('UI Settings initialized successfully for world type:', worldType);
        return true;
      } catch (error) {
        console.error('Error initializing UI Settings:', error);
        return false;
      } finally {
        delete window.tempWorldType;
      }
    },

    getSettings: () => ({ ...currentSettings }),
    
    updateSettings: (newSettings) => {
      currentSettings = { ...currentSettings, ...newSettings };
      if (typeof postWorldMessage === 'function') {
        postWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(currentSettings)})`);
      }
    }
  };

  // Global function that can be called from main application
  window.initializeUISettings = function(worldType) {
    console.log('initializeUISettings called with worldType:', worldType);
    
    if (!window.UISettingsAPI) {
      console.log('UISettings API not yet loaded, retrying in 100ms...');
      setTimeout(() => window.initializeUISettings(worldType), 100);
      return false;
    }
    
    try {
      const result = window.UISettingsAPI.initializeForWorldType(worldType);
      console.log('UI Settings initialization result:', result);
      return result;
    } catch (error) {
      console.error('Error calling UISettingsAPI.initializeForWorldType:', error);
      return false;
    }
  };

  console.log('UI Settings integration loaded in App.js. initializeUISettings function available:', typeof window.initializeUISettings);
};

function App() {
  const [buttons, setButtons] = useState([]);

  const [selectedButtonId, setSelectedButtonId] = useState(null);
  const [isChatActive, setIsChatActive] = useState(false);

  // API: Add a button
  const addButton = useCallback((name, thumbnail, onClick = null) => {
    const newButton = {
      id: Date.now(),
      name,
      thumbnail,
      onClick
    };
    setButtons(prev => [...prev, newButton]);
    return newButton.id;
  }, []);

  // API: Remove a button
  const removeButton = useCallback((buttonId) => {
    setButtons(prev => prev.filter(btn => btn.id !== buttonId));
    if (selectedButtonId === buttonId) {
      setSelectedButtonId(null);
      postWorldMessage(`BUTTON.UNSELECTED(NONE)`);
    }
  }, [selectedButtonId]);

  // API: Reorder buttons
  const reorderButtons = useCallback((fromIndex, toIndex) => {
    setButtons(prev => {
      const newButtons = [...prev];
      const [removed] = newButtons.splice(fromIndex, 1);
      newButtons.splice(toIndex, 0, removed);
      return newButtons;
    });
  }, []);

  // API: Select button
  const selectButton = useCallback((buttonId) => {
    setSelectedButtonId(buttonId);
    console.log('Button selected:', buttonId);
    
    // Find the button and invoke its onClick if it exists
    const button = buttons.find(btn => btn.id === buttonId);
    if (button && button.onClick) {
      // Call postWorldMessage if it exists
      if (typeof window.postWorldMessage === 'function') {
        window.postWorldMessage(button.onClick);
      } else {
        console.warn('postWorldMessage is not defined');
      }
    }
  }, [buttons]);

  // API: Select previous button
  const selectPrevious = useCallback(() => {
    if (buttons.length === 0) return;
    
    const currentIndex = buttons.findIndex(btn => btn.id === selectedButtonId);
    const prevIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
    setSelectedButtonId(buttons[prevIndex].id);
    postWorldMessage(`BUTTON.SELECTED(${buttons[prevIndex].name})`);
  }, [buttons, selectedButtonId]);

  // API: Select next button
  const selectNext = useCallback(() => {
    if (buttons.length === 0) return;
    
    const currentIndex = buttons.findIndex(btn => btn.id === selectedButtonId);
    const nextIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
    setSelectedButtonId(buttons[nextIndex].id);
    postWorldMessage(`BUTTON.SELECTED(${buttons[nextIndex].name})`);
  }, [buttons, selectedButtonId]);

  // API: Select by number key
  const selectByNumber = useCallback((number) => {
    if (number > 0 && number <= buttons.length) {
      setSelectedButtonId(buttons[number - 1].id);
      postWorldMessage(`BUTTON.SELECTED(${buttons[number - 1].name})`);
    }
  }, [buttons]);

  // Expose APIs globally
  React.useEffect(() => {
    window.buttonDockAPI = {
      addButton,
      removeButton,
      reorderButtons,
      selectButton,
      selectPrevious,
      selectNext,
      selectByNumber,
      getButtons: () => buttons,
      getSelectedButton: () => selectedButtonId
    };
  }, [addButton, removeButton, reorderButtons, selectButton, selectPrevious, selectNext, selectByNumber, buttons, selectedButtonId]);

  // Chat event handlers
  const handleChatInputOpen = useCallback(() => {
    setIsChatActive(true);
    // Close popup menu when chat opens
    if (window.popupMenuAPI && window.popupMenuAPI.isOpen()) {
      window.popupMenuAPI.closeMenu();
    }
    console.log('Chat input opened');
  }, []);

  const handleChatInputClose = useCallback(() => {
    setIsChatActive(false);
    // Close popup menu when chat input closes
    if (window.popupMenuAPI && window.popupMenuAPI.isOpen()) {
      window.popupMenuAPI.closeMenu();
    }
    console.log('Chat input closed');
  }, []);

  const handleChatHistoryOpen = useCallback(() => {
    setIsChatActive(true);
    // Close popup menu when chat history opens
    if (window.popupMenuAPI && window.popupMenuAPI.isOpen()) {
      window.popupMenuAPI.closeMenu();
    }
    console.log('Chat history opened');
  }, []);

  // Popup menu event handlers
  const handlePopupMenuOpen = useCallback(() => {
    // Close chat when popup menu opens
    if (window.chatConsoleAPI) {
      if (window.chatConsoleAPI.isHistoryVisible()) {
        window.chatConsoleAPI.closeHistory();
      }
      if (window.chatConsoleAPI.isInputActive()) {
        window.chatConsoleAPI.closeInput();
      }
    }
    console.log('Popup menu opened');
  }, []);

  const handlePopupMenuClose = useCallback(() => {
    // Close chat when popup menu closes
    if (window.chatConsoleAPI) {
      if (window.chatConsoleAPI.isHistoryVisible()) {
        window.chatConsoleAPI.closeHistory();
      }
      if (window.chatConsoleAPI.isInputActive()) {
        window.chatConsoleAPI.closeInput();
      }
    }
    console.log('Popup menu closed');
  }, []);

  const handleChatHistoryClose = useCallback(() => {
    setIsChatActive(false);
    // Close popup menu when chat history closes
    if (window.popupMenuAPI && window.popupMenuAPI.isOpen()) {
      window.popupMenuAPI.closeMenu();
    }
    console.log('Chat history closed');
  }, []);

  // Initialize UI Settings integration when component mounts
  React.useEffect(() => {
    console.log('App component mounted, initializing UI Settings integration...');
    initializeUISettingsIntegration();
  }, []);

  // Add a welcome message when the app loads
  React.useEffect(() => {
    setTimeout(() => {
      if (window.chatConsoleAPI) {
        window.chatConsoleAPI.addMessage('Press \\ to toggle chat, | to open history', 'System');
      }
    }, 1000);
  }, []);

  return (
    <div className="App">
      <ButtonDock
        buttons={buttons}
        selectedButtonId={selectedButtonId}
        onSelectButton={selectButton}
        onReorderButtons={reorderButtons}
        onSelectByNumber={selectByNumber}
        onSelectPrevious={selectPrevious}
        onSelectNext={selectNext}
        isChatActive={isChatActive}
      />

      <ChatConsole
        toggleKey="\"
        onChatInputOpen={handleChatInputOpen}
        onChatInputClose={handleChatInputClose}
        onChatHistoryOpen={handleChatHistoryOpen}
        onChatHistoryClose={handleChatHistoryClose}
        tempMessageCount={5}
        tempPanelTimeout={5000}
      />

      <PopupMenu
        toggleKey="`"
        onOpen={handlePopupMenuOpen}
        onClose={handlePopupMenuClose}
      />
    </div>
  );
}

export default App;