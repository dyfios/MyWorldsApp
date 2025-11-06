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
      sendMessageToTab
    };
  }, [addTab, removeTab, reorderTabs, getTabs, setActiveTab, openMenu, closeMenu, toggleMenu, isOpen, activeTabId, onTabMessage, offTabMessage, sendMessageToTab]);

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
              <div className="settings-section">
                <h3>Menu Tabs</h3>
                <div className="settings-tabs-list">
                  {tabs.filter(tab => tab.type !== 'settings').map((tab, index) => (
                    <div key={tab.id} className="settings-tab-item">
                      <span className="settings-tab-name">{tab.name}</span>
                      <span className="settings-tab-url">{tab.url}</span>
                      <button
                        className="settings-tab-remove"
                        onClick={() => removeTab(tab.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {tabs.filter(tab => tab.type !== 'settings').length === 0 && (
                    <p className="settings-no-tabs">No tabs yet. Use the API to add tabs.</p>
                  )}
                </div>
              </div>
              
              <div className="settings-section">
                <h3>API Usage</h3>
                <div className="settings-code">
                  <code>window.popupMenuAPI.addTab('My Tab', 'https://example.com');</code>
                  <code>window.popupMenuAPI.removeTab(tabId);</code>
                  <code>window.popupMenuAPI.setActiveTab(tabId);</code>
                </div>
              </div>

              <div className="settings-section">
                <h3>Messaging API</h3>
                <p className="settings-help">Iframes can send messages to the main page:</p>
                <div className="settings-code">
                  <code>{'// In iframe:'}</code>
                  <code>{'window.parent.postMessage({'}</code>
                  <code>{'  source: "myworlds-iframe-tab",'}</code>
                  <code>{'  tabId: "YOUR_TAB_ID",'}</code>
                  <code>{'  type: "custom-event",'}</code>
                  <code>{'  data: { key: "value" }'}</code>
                  <code>{'}, "*");'}</code>
                </div>
                <p className="settings-help">Main page can listen for messages:</p>
                <div className="settings-code">
                  <code>{'window.popupMenuAPI.onTabMessage((msg) => {'}</code>
                  <code>{'  console.log(msg.tabName, msg.type, msg.data);'}</code>
                  <code>{'});'}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupMenu;