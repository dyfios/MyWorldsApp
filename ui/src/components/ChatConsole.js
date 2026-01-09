/* global postWorldMessage */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatConsole.css';

const ChatConsole = ({
  toggleKey = '\\',
  historyKey = '|',
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

  // Handle opening input
  const handleOpenInput = useCallback(() => {
    setIsInputActive(true);
    if (onChatInputOpen) {
      onChatInputOpen();
    }
    postWorldMessage("CHAT_INPUT.OPENED()");
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
    postWorldMessage("CHAT_INPUT.CLOSED()");
  }, [onChatInputClose]);

  // Handle opening history
  const handleOpenHistory = useCallback(() => {
    setIsHistoryVisible(true);
    setIsInputActive(true);
    setShowTempPanel(false); // Hide temp panel when history is open
    if (onChatHistoryOpen) {
      onChatHistoryOpen();
    }
    postWorldMessage("CHAT_HISTORY.OPENED()");
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
    postWorldMessage("CHAT_HISTORY.CLOSED()");
  }, [onChatHistoryClose]);

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
  }, [addMessage, messages, isInputActive, isHistoryVisible, handleOpenInput, handleCloseInput, handleOpenHistory, handleCloseHistory]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle input with toggleKey (\)
      if (e.key === toggleKey) {
        e.preventDefault();
        
        if (isHistoryVisible) {
          // If history is visible, close everything
          handleCloseHistory();
        } else if (isInputActive) {
          handleCloseInput();
        } else {
          handleOpenInput();
        }
      }
      
      // Open history with historyKey (|)
      if (e.key === historyKey) {
        e.preventDefault();
        
        if (!isHistoryVisible) {
          handleOpenHistory();
        }
      }
    };

    const handleKeyEscape = (e) => {
      // ESC key to close
      if (e.key === 'Escape' && (isInputActive || isHistoryVisible)) {
        e.preventDefault();
        
        if (isHistoryVisible) {
          handleCloseHistory();
        } else {
          handleCloseInput();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyEscape);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyEscape);
    };
  }, [toggleKey, historyKey, isInputActive, isHistoryVisible, handleOpenInput, handleCloseInput, handleOpenHistory, handleCloseHistory]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      //addMessage(inputValue, 'User');
      if (inputValue.startsWith('/')) {
        // Command
        postWorldMessage(`CHAT_INPUT.COMMAND(${inputValue.slice(1)})`);
      } else {
        // Message
        postWorldMessage(`CHAT_INPUT.MESSAGE(${inputValue})`);
      }
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
              placeholder={`Type a message... (Press ${toggleKey} to close, ${historyKey} to open history)`}
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