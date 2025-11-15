/* global postWorldMessage */
import React, { useState, useCallback } from 'react';
import './App.css';
import ButtonDock from './components/ButtonDock';
import ChatConsole from './components/ChatConsole';
import PopupMenu from './components/PopupMenu';
import { useUISettings } from './hooks/useUISettings';

function App() {
  const [buttons, setButtons] = useState([]);

  const [selectedButtonId, setSelectedButtonId] = useState(null);
  const [isChatActive, setIsChatActive] = useState(false);

  // Initialize UI Settings hook
  const uiSettings = useUISettings();

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

  // Expose APIs globally for demonstration
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

    // Expose UI Settings API globally
    window.UISettingsAPI = {
      isWorldTypeSupported: uiSettings.isWorldTypeSupported,
      getSettings: uiSettings.getSettings,
      updateSettings: uiSettings.updateSettings,
      initialize: uiSettings.initialize
    };

    // Expose Tools API globally
    window.ToolsAPI = {
      addTool: uiSettings.addTool,
      removeTool: uiSettings.removeTool,
      clearTools: uiSettings.clearTools
    };

    // Expose initializeUISettings directly to window for WebVerse access
    window.initializeUISettings = uiSettings.initializeUISettings;
  }, [addButton, removeButton, reorderButtons, selectButton, selectPrevious, selectNext, selectByNumber, buttons, selectedButtonId, uiSettings]);

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

  // Add a welcome message when the app loads
  React.useEffect(() => {
    setTimeout(() => {
      if (window.chatConsoleAPI) {
        window.chatConsoleAPI.addMessage('Press \\ to toggle chat, | to open history', 'System');
      }
    }, 1000);

    // Initialize UI Settings
    setTimeout(() => {
      uiSettings.initialize();
    }, 500);
  }, [uiSettings]);

  // Register handler for UI Settings messages
  React.useEffect(() => {
    let handlerId = null;
    
    const registerHandler = () => {
      if (window.popupMenuAPI && window.popupMenuAPI.onTabMessage) {
        handlerId = window.popupMenuAPI.onTabMessage((message) => {
          console.log('Tab message received:', message);
          
          // Handle UI Settings specific messages
          if (message.tabName === 'UI Settings') {
            switch (message.type) {
              case 'settings-changed':
                console.log('UI Settings changed:', message.data);
                // Send settings changes to the world via postWorldMessage
                if (typeof postWorldMessage === 'function') {
                  postWorldMessage(`UI_SETTINGS.APPLY(${JSON.stringify(message.data)})`);
                } else {
                  console.warn('postWorldMessage not available');
                }
                break;
              
              case 'iframe-ready':
                console.log('UI Settings iframe is ready');
                break;
              
              default:
                console.log('Unknown UI Settings message type:', message.type);
            }
          }
          
          // Handle Tools specific messages
          else if (message.tabName === 'Tools') {
            switch (message.type) {
              case 'tool-clicked':
                console.log('Tool clicked:', message.data);
                // Send tool click event to the world via postWorldMessage
                if (typeof postWorldMessage === 'function' && message.data.onClick) {
                  postWorldMessage(message.data.onClick);
                } else {
                  console.warn('postWorldMessage not available or no onClick defined');
                }
                break;
              
              case 'iframe-ready':
                console.log('Tools iframe is ready');
                break;
              
              default:
                console.log('Unknown Tools message type:', message.type);
            }
          }
        });
        console.log('Tab message handler registered with ID:', handlerId);
      }
    };

    // Try to register immediately, or wait a bit if popupMenuAPI isn't ready yet
    if (window.popupMenuAPI) {
      registerHandler();
    } else {
      const timeout = setTimeout(registerHandler, 1000);
      return () => clearTimeout(timeout);
    }

    // Cleanup function to unregister the handler
    return () => {
      if (handlerId && window.popupMenuAPI && window.popupMenuAPI.offTabMessage) {
        window.popupMenuAPI.offTabMessage(handlerId);
        console.log('UI Settings message handler unregistered');
      }
    };
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