/* global postWorldMessage */
import React, { useState, useCallback } from 'react';
import './App.css';
import ButtonDock from './components/ButtonDock';
import ChatConsole from './components/ChatConsole';
import PopupMenu from './components/PopupMenu';

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