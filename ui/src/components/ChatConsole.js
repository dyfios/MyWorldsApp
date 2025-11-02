import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatConsole.css';

const ChatConsole = ({
  toggleKey = '\\',
  onChatInputOpen,
  onChatInputClose,
  onChatHistoryOpen,
  onChatHistoryClose,
  tempMessageCount = 5,
  tempPanelTimeout = 5000
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [showTempPanel, setShowTempPanel] = useState(false);
  
  const lastKeyPressRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressThresholdRef = useRef(500); // ms for long press detection
  const isLongPressRef = useRef(false); // Track if it was a long press
  const tempPanelTimerRef = useRef(null);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageIdCounterRef = useRef(0);

  // API: Add a message to chat
  const addMessage = useCallback((text, sender = 'System', timestamp = new Date()) => {
    messageIdCounterRef.current += 1;
    const newMessage = {
      id: `${Date.now()}-${messageIdCounterRef.current}`,
      text,
      sender,
      timestamp
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Show temp panel if history isn't visible
    if (!isHistoryVisible) {
      setShowTempPanel(true);
      
      // Clear existing timer
      if (tempPanelTimerRef.current) {
        clearTimeout(tempPanelTimerRef.current);
      }
      
      // Set new timer to hide temp panel
      tempPanelTimerRef.current = setTimeout(() => {
        setShowTempPanel(false);
      }, tempPanelTimeout);
    }
    
    return newMessage.id;
  }, [isHistoryVisible, tempPanelTimeout]);

  // Expose API globally
  useEffect(() => {
    window.chatConsoleAPI = {
      addMessage,
      getMessages: () => messages,
      clearMessages: () => setMessages([]),
      openInput: () => handleOpenInput(),
      closeInput: () => handleCloseInput(),
      openHistory: () => handleOpenHistory(),
      closeHistory: () => handleCloseHistory(),
      isInputActive: () => isInputActive,
      isHistoryVisible: () => isHistoryVisible
    };
  }, [addMessage, messages, isInputActive, isHistoryVisible]);

  // Handle opening input
  const handleOpenInput = useCallback(() => {
    setIsInputActive(true);
    if (onChatInputOpen) {
      onChatInputOpen();
    }
    // Focus input after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  }, [onChatInputOpen]);

  // Handle closing input
  const handleCloseInput = useCallback(() => {
    setIsInputActive(false);
    setInputValue('');
    if (onChatInputClose) {
      onChatInputClose();
    }
  }, [onChatInputClose]);

  // Handle opening history
  const handleOpenHistory = useCallback(() => {
    setIsHistoryVisible(true);
    setIsInputActive(true);
    setShowTempPanel(false); // Hide temp panel when history is open
    if (onChatHistoryOpen) {
      onChatHistoryOpen();
    }
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, [onChatHistoryOpen]);

  // Handle closing history
  const handleCloseHistory = useCallback(() => {
    setIsHistoryVisible(false);
    setIsInputActive(false);
    setInputValue('');
    if (onChatHistoryClose) {
      onChatHistoryClose();
    }
  }, [onChatHistoryClose]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('Key pressed:', e.key, 'toggleKey:', toggleKey);
      
      // Check if it's the toggle key
      if (e.key === toggleKey && !e.repeat) { // Ignore key repeat events
        e.preventDefault();
        console.log('Toggle key matched!');
        
        // If not already holding, start long press timer
        if (!longPressTimerRef.current) {
          console.log('Starting long press timer');
          longPressTimerRef.current = setTimeout(() => {
            // Long press: open history
            console.log('Long press triggered!');
            isLongPressRef.current = true; // Mark as long press
            longPressTimerRef.current = null; // Clear the timer reference
            if (!isHistoryVisible) {
              console.log('Opening history (long press)');
              handleOpenHistory();
            }
          }, longPressThresholdRef.current);
        }
      }
    };

    const handleKeyUp = (e) => {
      // Check if it's the toggle key being released
      if (e.key === toggleKey) {
        e.preventDefault();
        
        console.log('Key released. Timer active:', !!longPressTimerRef.current, 'Was long press:', isLongPressRef.current);
        
        // If long press already triggered, don't do anything
        if (isLongPressRef.current) {
          console.log('Long press completed, keeping history open');
          isLongPressRef.current = false; // Reset for next time
          return;
        }
        
        // If timer is still active, it was a short press
        if (longPressTimerRef.current) {
          console.log('Clearing timer - was short press');
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          
          // Short press: toggle input
          if (isHistoryVisible) {
            // If history is visible, close everything
            console.log('Closing history (short press)');
            handleCloseHistory();
          } else if (isInputActive) {
            console.log('Closing input (short press)');
            handleCloseInput();
          } else {
            console.log('Opening input (short press)');
            handleOpenInput();
          }
        }
        
        // Reset flags for next press (only if it wasn't handled above)
        longPressTimerRef.current = null;
        isLongPressRef.current = false;
      }
    };

    const handleKeyEscape = (e) => {
      // ESC key to close
      if (e.key === 'Escape' && (isInputActive || isHistoryVisible)) {
        e.preventDefault();
        
        // Clear any pending long press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        
        isLongPressRef.current = false;
        
        if (isHistoryVisible) {
          handleCloseHistory();
        } else {
          handleCloseInput();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyEscape);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyEscape);
      
      // Cleanup timer on unmount
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [toggleKey, isInputActive, isHistoryVisible, handleOpenInput, handleCloseInput, handleOpenHistory, handleCloseHistory]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addMessage(inputValue, 'User');
      setInputValue('');
      
      // Keep input active after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isHistoryVisible && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHistoryVisible]);

  // Get last N messages for temp panel
  const tempMessages = messages.slice(-tempMessageCount);

  return (
    <>
      {/* Temporary message panel */}
      {showTempPanel && !isHistoryVisible && messages.length > 0 && (
        <div className="chat-temp-panel">
          {tempMessages.map((msg) => (
            <div key={msg.id} className="chat-temp-message">
              <span className="chat-temp-sender">{msg.sender}:</span>
              <span className="chat-temp-text">{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chat history panel */}
      {isHistoryVisible && (
        <div className="chat-history-panel">
          <div className="chat-history-header">
            <h3>Chat History</h3>
            <button 
              className="chat-close-button"
              onClick={handleCloseHistory}
              aria-label="Close chat history"
            >
              ✕
            </button>
          </div>
          <div className="chat-history-messages">
            {messages.length === 0 ? (
              <div className="chat-no-messages">No messages yet</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="chat-message">
                  <div className="chat-message-header">
                    <span className="chat-message-sender">{msg.sender}</span>
                    <span className="chat-message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="chat-message-text">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Chat input */}
      {isInputActive && (
        <div className="chat-input-container">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type a message... (Press ${toggleKey} to close, hold ${toggleKey} for history)`}
              autoComplete="off"
            />
            <button type="submit" className="chat-send-button">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatConsole;