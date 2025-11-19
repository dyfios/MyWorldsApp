/* global postWorldMessage */
import React, { useState, useCallback } from 'react';
import './App.css';
import ButtonDock from './components/ButtonDock';
import ChatConsole from './components/ChatConsole';
import PopupMenu from './components/PopupMenu';
import { useUISettings } from './hooks/useUISettings';

function App() {
  const [buttons, setButtons] = useState([]);
  
  // Configuration: Maximum number of buttons in dock (configurable limit)
  const [maxDockButtons, setMaxDockButtons] = useState(10);

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
    
    setButtons(prev => {
      const updatedButtons = [...prev, newButton];
      
      // If we exceed the maximum number of buttons, remove the first button
      if (updatedButtons.length > maxDockButtons) {
        const removedButton = updatedButtons.shift(); // Remove first button
        console.log(`ButtonDock: Removed oldest button "${removedButton.name}" due to dock limit (${maxDockButtons})`);
        
        // If the removed button was selected, clear selection
        if (selectedButtonId === removedButton.id) {
          setSelectedButtonId(null);
          if (typeof postWorldMessage === 'function') {
            postWorldMessage(`BUTTON.UNSELECTED(NONE)`);
          }
        }
      }
      
      console.log(`ButtonDock: Added button "${name}". Dock now has ${updatedButtons.length}/${maxDockButtons} buttons`);
      return updatedButtons;
    });
    
    return newButton.id;
  }, [maxDockButtons, selectedButtonId]);

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
    console.log('ButtonDock: selectButton called with buttonId:', buttonId);
    setSelectedButtonId(buttonId);
    console.log('Button selected:', buttonId);
    
    // Find the button and invoke its onClick if it exists
    const button = buttons.find(btn => btn.id === buttonId);
    console.log('ButtonDock: Button found:', button ? button.name : 'none', 'onClick:', button ? button.onClick : 'none');
    
    if (button && button.onClick) {
      // Call postWorldMessage if it exists
      if (typeof window.postWorldMessage === 'function') {
        console.log('ButtonDock: Executing onClick via postWorldMessage:', button.onClick);
        window.postWorldMessage(button.onClick);
        console.log('ButtonDock: postWorldMessage called successfully');
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
    const button = buttons[prevIndex];
    
    console.log('ButtonDock: selectPrevious called, button:', button.name);
    setSelectedButtonId(button.id);
    postWorldMessage(`BUTTON.SELECTED(${button.name})`);
    
    // Execute the button's onClick action
    if (button.onClick) {
      console.log('ButtonDock: Executing onClick via selectPrevious:', button.onClick);
      if (typeof postWorldMessage === 'function') {
        postWorldMessage(button.onClick);
        console.log('ButtonDock: onClick executed via postWorldMessage');
      } else {
        console.warn('postWorldMessage is not defined');
      }
    }
  }, [buttons, selectedButtonId]);

  // API: Select next button
  const selectNext = useCallback(() => {
    if (buttons.length === 0) return;
    
    const currentIndex = buttons.findIndex(btn => btn.id === selectedButtonId);
    const nextIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
    const button = buttons[nextIndex];
    
    console.log('ButtonDock: selectNext called, button:', button.name);
    setSelectedButtonId(button.id);
    postWorldMessage(`BUTTON.SELECTED(${button.name})`);
    
    // Execute the button's onClick action
    if (button.onClick) {
      console.log('ButtonDock: Executing onClick via selectNext:', button.onClick);
      if (typeof postWorldMessage === 'function') {
        postWorldMessage(button.onClick);
        console.log('ButtonDock: onClick executed via postWorldMessage');
      } else {
        console.warn('postWorldMessage is not defined');
      }
    }
  }, [buttons, selectedButtonId]);

  // API: Select by number key
  const selectByNumber = useCallback((number) => {
    if (number > 0 && number <= buttons.length) {
      const button = buttons[number - 1];
      console.log('ButtonDock: selectByNumber called with number:', number, 'button:', button.name);
      
      setSelectedButtonId(button.id);
      postWorldMessage(`BUTTON.SELECTED(${button.name})`);
      
      // Execute the button's onClick action, just like selectButton does
      if (button.onClick) {
        console.log('ButtonDock: Executing onClick via selectByNumber:', button.onClick);
        if (typeof postWorldMessage === 'function') {
          postWorldMessage(button.onClick);
          console.log('ButtonDock: onClick executed via postWorldMessage');
        } else {
          console.warn('postWorldMessage is not defined');
        }
      }
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
      getSelectedButton: () => selectedButtonId,
      // Configuration APIs
      getMaxButtons: () => maxDockButtons,
      setMaxButtons: (newMax) => {
        if (newMax > 0 && newMax <= 50) { // Reasonable limits
          setMaxDockButtons(newMax);
          console.log(`ButtonDock: Maximum buttons set to ${newMax}`);
          
          // If current buttons exceed new limit, remove excess buttons from the beginning
          setButtons(prev => {
            if (prev.length > newMax) {
              const excess = prev.length - newMax;
              const removed = prev.slice(0, excess);
              const remaining = prev.slice(excess);
              
              console.log(`ButtonDock: Removed ${excess} buttons due to new limit: ${removed.map(b => b.name).join(', ')}`);
              
              // If selected button was removed, clear selection
              if (removed.some(btn => btn.id === selectedButtonId)) {
                setSelectedButtonId(null);
                if (typeof postWorldMessage === 'function') {
                  postWorldMessage(`BUTTON.UNSELECTED(NONE)`);
                }
              }
              
              return remaining;
            }
            return prev;
          });
          
          return true;
        } else {
          console.warn(`ButtonDock: Invalid max buttons value: ${newMax}. Must be between 1 and 50.`);
          return false;
        }
      },
      getCurrentButtonCount: () => buttons.length,
      getDockStatus: () => ({
        current: buttons.length,
        max: maxDockButtons,
        isFull: buttons.length >= maxDockButtons
      })
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
  }, [addButton, removeButton, reorderButtons, selectButton, selectPrevious, selectNext, selectByNumber, buttons, selectedButtonId, maxDockButtons, uiSettings]);

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

  // Double-tap space key to toggle flying mode
  React.useEffect(() => {
    let lastSpacePress = 0;
    const doubleTapThreshold = 300; // milliseconds

    const handleKeyDown = (event) => {
      // Only handle space key when chat is not active
      if ((event.code === 'Space' || event.key === ' ') && !isChatActive) {
        // Don't prevent default here as it might interfere with other functionality
        
        const now = Date.now();
        const timeSinceLastPress = now - lastSpacePress;
        
        if (timeSinceLastPress < doubleTapThreshold) {
          // Double-tap detected - toggle flying via UI Settings
          console.log('Double-tap space detected - toggling flying via UI Settings');
          
          if (uiSettings && typeof uiSettings.toggleFlying === 'function') {
            uiSettings.toggleFlying();
          } else {
            console.warn('UI Settings flying toggle not available');
          }
          
          lastSpacePress = 0; // Reset to prevent triple-tap issues
        } else {
          // First tap or too much time passed
          lastSpacePress = now;
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatActive, uiSettings]);

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