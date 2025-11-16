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
    console.log('sendMessageToTab called with: ' + JSON.stringify({ tabId, messageType: message.type }));
    console.log('Available tabs: ' + JSON.stringify(tabs.map(t => ({ id: t.id, name: t.name, type: t.type }))));
    
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.type !== 'iframe') {
      console.warn('Cannot send message: tab not found or not an iframe ' + JSON.stringify({ tabId, tab }));
      return false;
    }

    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`);
    console.log('sendMessageToTab debug: ' + JSON.stringify({ 
      tabId, 
      iframe: !!iframe, 
      contentWindow: iframe ? !!iframe.contentWindow : false,
      readyState: iframe ? iframe.readyState : 'no-iframe',
      src: iframe ? iframe.src : 'no-iframe'
    }));
    
    if (iframe) {
      // Try multiple approaches to send the message
      if (iframe.contentWindow) {
        try {
          // If message already has the correct structure, send it directly
          if (message.type && message.data) {
            iframe.contentWindow.postMessage({
              source: 'myworlds-popup-menu',
              type: message.type,
              data: message.data
            }, '*');
          } else {
            // Fallback for other message types
            iframe.contentWindow.postMessage({
              source: 'myworlds-popup-menu',
              type: 'message',
              data: message
            }, '*');
          }
          console.log('Message sent successfully via contentWindow');
          return true;
        } catch (error) {
          console.warn('Error sending message via contentWindow:', error);
        }
      }
      
      // Fallback: wait for iframe to load if it's not ready
      if (!iframe.contentWindow || iframe.readyState !== 'complete') {
        console.log('Iframe not ready, waiting for load...');
        
        const sendWhenReady = () => {
          try {
            // If message already has the correct structure, send it directly
            if (message.type && message.data) {
              iframe.contentWindow.postMessage({
                source: 'myworlds-popup-menu',
                type: message.type,
                data: message.data
              }, '*');
            } else {
              // Fallback for other message types
              iframe.contentWindow.postMessage({
                source: 'myworlds-popup-menu',
                type: 'message',
                data: message
              }, '*');
            }
            console.log('Message sent successfully after load');
            return true;
          } catch (error) {
            console.warn('Error sending message after load:', error);
            return false;
          }
        };
        
        // If iframe has a contentWindow but document might not be ready
        if (iframe.contentWindow) {
          setTimeout(sendWhenReady, 100);
          return true;
        }
        
        // If no contentWindow, wait for iframe load event
        iframe.addEventListener('load', sendWhenReady, { once: true });
        return true;
      }
    } else {
      console.warn('Iframe not found in DOM for tabId:', tabId);
      console.log('All iframes in DOM: ' + JSON.stringify(Array.from(document.querySelectorAll('iframe')).map(iframe => ({
        dataTabId: iframe.getAttribute('data-tab-id'),
        src: iframe.src,
        title: iframe.title
      }))));
      
      // Retry after a short delay to allow React to render the iframe
      setTimeout(() => {
        console.log('Retrying sendMessageToTab after render delay...');
        const retryIframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`);
        if (retryIframe && retryIframe.contentWindow) {
          try {
            // If message already has the correct structure, send it directly
            if (message.type && message.data) {
              retryIframe.contentWindow.postMessage({
                source: 'myworlds-popup-menu',
                type: message.type,
                data: message.data
              }, '*');
            } else {
              // Fallback for other message types
              retryIframe.contentWindow.postMessage({
                source: 'myworlds-popup-menu',
                type: 'message',
                data: message
              }, '*');
            }
            console.log('Message sent successfully on retry');
          } catch (error) {
            console.warn('Error sending message on retry:', error);
          }
        } else {
          console.warn('Retry failed - iframe still not found or ready');
        }
      }, 500);
      
      return true; // Return true since we're attempting a retry
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

  // Debug: Log when tabs change
  useEffect(() => {
    console.log('PopupMenu tabs changed: ' + JSON.stringify(tabs.map(t => ({ id: t.id, name: t.name, type: t.type }))));
    
    // Also log if popup menu is open
    console.log('PopupMenu isOpen: ' + isOpen);
    
    // Check if iframes exist in DOM after tabs change
    setTimeout(() => {
      const allIframes = Array.from(document.querySelectorAll('iframe'));
      console.log('All iframes in DOM after tabs update: ' + JSON.stringify(allIframes.map(iframe => ({
        dataTabId: iframe.getAttribute('data-tab-id'),
        src: iframe.src,
        title: iframe.title,
        display: iframe.style.display
      }))));
    }, 10);
  }, [tabs, isOpen]);

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
      sendMessageToTab: (tabId, msg) => sendMessageToTab(tabId, msg),
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

  return (
    <div className="popup-menu-overlay" 
         onClick={isOpen ? closeMenu : undefined}
         style={{
           display: isOpen ? 'flex' : 'block',
           position: isOpen ? 'fixed' : 'absolute',
           left: isOpen ? '0' : '-9999px',
           top: isOpen ? '0' : '-9999px',
           right: isOpen ? '0' : 'auto',
           bottom: isOpen ? '0' : 'auto',
           width: isOpen ? '100%' : '100px',
           height: isOpen ? '100%' : '100px',
           backgroundColor: isOpen ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
           alignItems: isOpen ? 'center' : 'flex-start',
           justifyContent: isOpen ? 'center' : 'flex-start',
           zIndex: isOpen ? 1000 : -1
         }}>
      <div 
        className="popup-menu-container" 
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isOpen ? '90%' : '100px',
          height: isOpen ? '80%' : '100px',
          maxWidth: isOpen ? '1200px' : '100px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        <div className="popup-menu-header" style={{ display: isOpen ? 'flex' : 'none' }}>
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
          {/* All iframes - always rendered */}
          {tabs.filter(tab => tab.type === 'iframe').map(tab => (
            <iframe
              key={tab.id}
              data-tab-id={tab.id}
              src={tab.url}
              className="popup-menu-iframe"
              title={tab.name}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              style={{ 
                display: activeTab && activeTab.id === tab.id && isOpen ? 'block' : 'none',
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          ))}

          {/* Settings content */}
          {activeTab && activeTab.type === 'settings' && isOpen && (
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