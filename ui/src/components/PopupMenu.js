/* global postWorldMessage */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PopupMenu.css';

const PopupMenu = ({
  toggleKey = '`',
  onOpen,
  onClose,
  onMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabs, setTabs] = useState([
    { id: 'settings', name: 'Settings', type: 'settings' }
  ]);
  const [activeTabId, setActiveTabId] = useState('settings');
  const [quality, setQuality] = useState('Med');
  const [renderDistance, setRenderDistance] = useState('Near');
  const [versionInfo, setVersionInfo] = useState('Version 1.0.0');
  const menuRef = useRef(null);
  const messageHandlersRef = useRef({});

  // API: Add a tab
  const addTab = useCallback((name, url, position = null) => {
    const newTab = {
      id: `tab-${Date.now()}`,
      name,
      url,
      type: 'iframe'
    };
    
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.type !== 'settings');
      const settingsTab = prev.find(tab => tab.type === 'settings');
      
      if (position !== null && position >= 0 && position < filtered.length) {
        filtered.splice(position, 0, newTab);
      } else {
        filtered.push(newTab);
      }
      
      return [...filtered, settingsTab];
    });
    
    return newTab.id;
  }, []);

  // API: Remove a tab
  const removeTab = useCallback((tabId) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId || tab.type === 'settings');
      
      // If we removed the active tab, switch to first tab
      if (tabId === activeTabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      }
      
      return filtered;
    });
  }, [activeTabId]);

  // API: Reorder tabs
  const reorderTabs = useCallback((fromIndex, toIndex) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.type !== 'settings');
      const settingsTab = prev.find(tab => tab.type === 'settings');
      
      const [removed] = filtered.splice(fromIndex, 1);
      filtered.splice(toIndex, 0, removed);
      
      return [...filtered, settingsTab];
    });
  }, []);

  // API: Get all tabs
  const getTabs = useCallback(() => {
    return tabs.filter(tab => tab.type !== 'settings');
  }, [tabs]);

  // API: Set active tab
  const setActiveTab = useCallback((tabId) => {
    if (tabs.find(tab => tab.id === tabId)) {
      setActiveTabId(tabId);
    }
  }, [tabs]);

  // API: Register message handler
  const onTabMessage = useCallback((handler) => {
    const handlerId = `handler-${Date.now()}`;
    messageHandlersRef.current[handlerId] = handler;
    return handlerId;
  }, []);

  // API: Unregister message handler
  const offTabMessage = useCallback((handlerId) => {
    delete messageHandlersRef.current[handlerId];
  }, []);

  // API: Send message to active iframe
  const sendMessageToTab = useCallback((tabId, message) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.type !== 'iframe') {
      console.warn('Cannot send message: tab not found or not an iframe');
      return false;
    }

    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        source: 'myworlds-popup-menu',
        type: 'message',
        data: message
      }, '*');
      return true;
    }
    return false;
  }, [tabs]);

  // Open menu
  const openMenu = useCallback(() => {
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
    postWorldMessage("POPUP_MENU.OPENED()");
  }, [onOpen]);

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
    postWorldMessage("POPUP_MENU.CLOSED()");
  }, [onClose]);

  // Toggle menu
  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  // Handle messages from iframes
  useEffect(() => {
    const handleMessage = (event) => {
      // Check if message is from an iframe tab
      if (event.data && event.data.source === 'myworlds-iframe-tab') {
        const { tabId, type, data } = event.data;
        
        console.log('Message from iframe:', { tabId, type, data });

        // Find the tab
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) {
          console.warn('Message from unknown tab:', tabId);
          return;
        }

        // Call registered handlers
        Object.values(messageHandlersRef.current).forEach(handler => {
          try {
            handler({ tabId, tabName: tab.name, type, data });
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });

        // Call the onMessage prop if provided
        if (onMessage) {
          onMessage({ tabId, tabName: tab.name, type, data });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tabs, onMessage]);

  // Expose API globally
  useEffect(() => {
    window.popupMenuAPI = {
      addTab,
      removeTab,
      reorderTabs,
      getTabs,
      setActiveTab,
      openMenu,
      closeMenu,
      toggleMenu,
      isOpen: () => isOpen,
      getActiveTab: () => activeTabId,
      onTabMessage,
      offTabMessage,
      sendMessageToTab,
      // Settings APIs
      setQuality: (value) => {
        if (['Low', 'Med', 'High'].includes(value)) {
          setQuality(value);
        }
      },
      getQuality: () => quality,
      setRenderDistance: (value) => {
        if (['Close', 'Near', 'Far'].includes(value)) {
          setRenderDistance(value);
        }
      },
      getRenderDistance: () => renderDistance,
      setVersionInfo: (text) => setVersionInfo(text),
      getVersionInfo: () => versionInfo
    };
  }, [addTab, removeTab, reorderTabs, getTabs, setActiveTab, openMenu, closeMenu, toggleMenu, isOpen, activeTabId, onTabMessage, offTabMessage, sendMessageToTab, quality, renderDistance, versionInfo]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === toggleKey) {
        e.preventDefault();
        console.log('Popup menu toggle key pressed');
        toggleMenu();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleKey, isOpen, toggleMenu, closeMenu]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="popup-menu-overlay" onClick={closeMenu}>
      <div 
        className="popup-menu-container" 
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-menu-header">
          <div className="popup-menu-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`popup-menu-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
          <button 
            className="popup-menu-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="popup-menu-content">
          {activeTab && activeTab.type === 'iframe' && (
            <iframe
              key={activeTab.id}
              data-tab-id={activeTab.id}
              src={activeTab.url}
              className="popup-menu-iframe"
              title={activeTab.name}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          )}
          
          {activeTab && activeTab.type === 'settings' && (
            <div className="popup-menu-settings">
              <h2>Settings</h2>
              
              {/* Quality Setting */}
              <div className="settings-section">
                <h3>Quality</h3>
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="quality"
                      value="Low"
                      checked={quality === 'Low'}
                      onChange={(e) => setQuality(e.target.value)}
                    />
                    <span>Low</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="quality"
                      value="Med"
                      checked={quality === 'Med'}
                      onChange={(e) => setQuality(e.target.value)}
                    />
                    <span>Med</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="quality"
                      value="High"
                      checked={quality === 'High'}
                      onChange={(e) => setQuality(e.target.value)}
                    />
                    <span>High</span>
                  </label>
                </div>
              </div>

              {/* Render Distance Setting */}
              <div className="settings-section">
                <h3>Render Distance</h3>
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="renderDistance"
                      value="Close"
                      checked={renderDistance === 'Close'}
                      onChange={(e) => setRenderDistance(e.target.value)}
                    />
                    <span>Close</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="renderDistance"
                      value="Near"
                      checked={renderDistance === 'Near'}
                      onChange={(e) => setRenderDistance(e.target.value)}
                    />
                    <span>Near</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="renderDistance"
                      value="Far"
                      checked={renderDistance === 'Far'}
                      onChange={(e) => setRenderDistance(e.target.value)}
                    />
                    <span>Far</span>
                  </label>
                </div>
              </div>

              {/* Version Info */}
              <div className="settings-section settings-version">
                <div className="settings-version-text">{versionInfo}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupMenu;