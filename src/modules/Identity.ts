/**
 * Identity Module for WebVerse Authentication
 * 
 * This module handles user authentication for both WebVerse variants:
 * 
 * 1. **WebVerse Full (Native)**: Uses an HTML entity to display an OAuth login page.
 *    - Opens: https://search-dev.worldhub.me/login.html?client=full
 *    - User authenticates via Google OAuth
 *    - Login page calls postWorldMessage with auth token
 *    - Token is extracted and stored for MQTT/API authentication
 * 
 * 2. **WebVerse Lite (WebGL)**: Uses session cookie-based token generation.
 *    - Calls WorldHub ID API: POST /auth/generate-app-token
 *    - Session cookie is automatically included
 *    - Returns app token for MQTT/API authentication
 */

/**
 * WebVerse client types
 * - 'full': Full WebVerse client (Native) - uses OAuth HTML panel
 * - 'lite': WebVerse Lite (WebGL) - uses session cookie authentication
 */
export type WebVerseClientType = 'full' | 'lite';

/**
 * Interface for login context data
 */
interface LoginContext {
    loginCanvas?: any; // BaseEntity type from WebVerse
    userID?: string;
    userTag?: string;
    token?: string;
    tokenExpiration?: string;
}

/**
 * Interface for top-level MyWorlds context
 */
interface MyWorldsTopLevelContext {
    userID?: string;
    userTag?: string;
    token?: string;
    tokenExpiration?: string;
}

/**
 * Interface for WebGL auth API response
 */
interface AuthTokenResponse {
    success: boolean;
    token?: string;
    userId?: string;
    username?: string;
    error?: string;
}

/**
 * Auth error callback type
 */
export type AuthErrorCallback = (error: string, canRetry: boolean) => void;

/**
 * Identity management class for WebVerse authentication
 * Supports both Native (OAuth HTML panel) and WebGL (session cookie) flows
 */
export class Identity {
  private readonly MW_TOP_LEVEL_CONTEXT_KEY = "MW_TOP_LEVEL_CONTEXT";
  private readonly LOGIN_CANVAS_ID_KEY = "LOGIN-CANVAS-ID";
  private readonly LOGIN_PANEL_ID_KEY = "LOGIN-PANEL-ID";

  // API endpoints
  private readonly AUTH_API_URL = 'https://id-dev.worldhub.me';
  private readonly NATIVE_LOGIN_URL = 'https://search-dev.worldhub.me/login.html';

  private loginCallbackFunction?: () => void;
  private authErrorCallback?: AuthErrorCallback;
  private clientType: WebVerseClientType = 'lite';

  constructor() {
    this.loginCallbackFunction = undefined;
    this.authErrorCallback = undefined;
    this.detectClientTypeFromQueryParams();
    this.setupGlobalCallbacks();
  }

  /**
   * Detect client type from URL query parameters
   * Looks for ?client=full or ?client=lite
   * Defaults to lite if not specified
   */
  private detectClientTypeFromQueryParams(): void {
    try {
      // Check if World API is available
      if (typeof World === 'undefined' || typeof World.GetQueryParam !== 'function') {
        Logging.Log('🔐 Identity: World.GetQueryParam not available, defaulting to lite');
        this.clientType = 'lite';
        return;
      }

      const clientParam = World.GetQueryParam('client');
      Logging.Log('🔐 Identity: Raw client query param value: ' + (clientParam === null ? 'null' : `"${clientParam}"`));
      
      if (clientParam) {
        if (clientParam === 'full' || clientParam === 'lite') {
          this.clientType = clientParam as WebVerseClientType;
          Logging.Log(`🔐 Identity: Client type detected from query param: ${this.clientType}`);
        } else {
          Logging.LogWarning(`⚠️ Identity: Unknown client type '${clientParam}', defaulting to lite`);
          this.clientType = 'lite';
        }
      } else {
        Logging.Log('🔐 Identity: No client type in query params, defaulting to lite');
        this.clientType = 'lite';
      }
    } catch (error: any) {
      Logging.LogWarning('⚠️ Identity: Failed to read client query param: ' + (error.message || error));
      this.clientType = 'lite';
    }
    
    Logging.Log(`🔐 Identity: Final client type set to: ${this.clientType}`);
  }

  /**
   * Set the client type for authentication
   * @param clientType The WebVerse client type ('webverse-native' or 'webverse-webgl')
   */
  public setClientType(clientType: WebVerseClientType): void {
    this.clientType = clientType;
    Logging.Log(`🔐 Identity: Client type set to ${clientType}`);
  }

  /**
   * Get the current client type
   */
  public getClientType(): WebVerseClientType {
    return this.clientType;
  }

  /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for finishing login canvas setup
    (globalThis as any).finishLoginCanvasSetup = () => {
      this.finishLoginCanvasSetup();
    };

    // Define global callback for finishing login panel setup
    (globalThis as any).finishLoginPanelSetup = () => {
      this.finishLoginPanelSetup();
    };

    // Define global callback for handling user login messages (Native OAuth flow)
    (globalThis as any).handleUserLoginMessage = (msg: string) => {
      this.handleUserLoginMessage(msg);
    };

    // Define global callback for WebGL auth token response
    (globalThis as any).onAuthTokenResponse = (response: string) => {
      this.onAuthTokenResponse(response);
    };

    // Define global callback for WebGL auth token error
    (globalThis as any).onAuthTokenError = (error: string) => {
      this.onAuthTokenError(error);
    };

    // Define global debug function to inspect auth state
    (globalThis as any).debugAuthState = () => {
      this.debugAuthState();
    };
  }

  finishLoginCanvasSetup(): void {
    Logging.Log('🎯 Identity: finishLoginCanvasSetup callback invoked');
    try {
      const loginPanelId = UUID.NewUUID().ToString();
      if (!loginPanelId) {
        Logging.LogError('Failed to generate login panel ID');
        return;
      }
      
      WorldStorage.SetItem('LOGIN-PANEL-ID', loginPanelId);
      
      const loginCanvasId = WorldStorage.GetItem('LOGIN-CANVAS-ID');
      if (!loginCanvasId) {
        Logging.LogError('Login canvas ID not found in storage');
        return;
      }
      
      const loginCanvas = Entity.Get(loginCanvasId) as CanvasEntity;
      if (!loginCanvas) {
        Logging.LogError('Login canvas entity not found');
        return;
      }
      
      loginCanvas.SetInteractionState(InteractionState.Static);
      
      if (typeof loginCanvas.MakeScreenCanvas === 'function') {
        loginCanvas.MakeScreenCanvas();
      }
      
      HTMLEntity.Create(
        loginCanvas,
        new Vector2(0, 0),
        new Vector2(1, 1),
        loginPanelId,
        'UserLoginPanel',
        'handleUserLoginMessage',
        'finishLoginPanelSetup'
      );

      Logging.Log('✓ Login canvas setup completed');
      
    } catch (error: any) {
      Logging.LogError('❌ Error in finishLoginCanvasSetup: ' + (error.message || error));
    }
  }

  finishLoginPanelSetup(): void {
    Logging.Log('🎯 Identity: finishLoginPanelSetup callback invoked');
    try {
      const loginPanelId = WorldStorage.GetItem('LOGIN-PANEL-ID');
      if (!loginPanelId) {
        Logging.LogError('Login panel ID not found in storage');
        return;
      }
      
      const loginPanel = Entity.Get(loginPanelId) as HTMLEntity;
      if (!loginPanel) {
        Logging.Log('Login Panel not found. Cannot finish setup.');
        return;
      }
      
      loginPanel.SetInteractionState(InteractionState.Static);
      
      if (typeof loginPanel.LoadFromURL === 'function') {
        // Load the Native OAuth login page with client parameter
        const loginUrl = `${this.NATIVE_LOGIN_URL}?client=full`;
        Logging.Log(`🔐 Identity: Loading Native OAuth login page: ${loginUrl}`);
        loginPanel.LoadFromURL(loginUrl);
      }
      
      Logging.Log('✓ Login panel setup completed');
      
    } catch (error: any) {
      Logging.LogError('❌ Error in finishLoginPanelSetup: ' + (error.message || error));
    }
  }

  handleUserLoginMessage(msg: string): void {
    Logging.Log('🎯 Identity: handleUserLoginMessage invoked with: ' + msg);
    try {
      // Try to parse as JSON first (new Native OAuth format)
      // Format: {"type": "auth_complete", "token": "xxx"}
      if (msg.startsWith('{')) {
        try {
          const authData = JSON.parse(msg);
          if (authData.type === 'auth_complete' && authData.token) {
            Logging.Log('🔐 Identity: Received Native OAuth auth_complete message');
            this.handleNativeAuthComplete(authData.token, authData.userId, authData.username);
            return;
          }
        } catch (parseError) {
          // Not valid JSON, fall through to legacy format check
          Logging.Log('🔐 Identity: Message is not JSON, checking legacy format');
        }
      }

      // Legacy format: WHID.AUTH.COMPLETE(userID,userTag,token,expiration)
      if (!msg.startsWith('WHID.AUTH.COMPLETE')) {
        return;
      }
      
      const startIndex = msg.indexOf('(');
      const endIndex = msg.indexOf(')');
      
      if (startIndex === -1 || endIndex === -1) {
        Logging.LogError('HandleUserLoginMessage: Invalid Authentication Complete message received.');
        return;
      }
      
      const rawMsgParams = msg.substring(startIndex + 1, endIndex);
      if (!rawMsgParams) {
        Logging.LogError('HandleUserLoginMessage: Invalid Authentication Complete message received.');
        return;
      }
      
      const msgParams = rawMsgParams.split(',');
      if (msgParams.length !== 4) {
        Logging.LogError('HandleUserLoginMessage: Invalid Authentication Complete message received.');
        return;
      }
      
      // Store authentication data using the common handler
      this.storeAuthenticationData(msgParams[0], msgParams[1], msgParams[2], msgParams[3]);
      this.onLoginSuccess();
      
    } catch (error: any) {
      Logging.LogError('❌ Error in handleUserLoginMessage: ' + (error.message || error));
    }
  }

  /**
   * Handle Native OAuth auth_complete message
   */
  private handleNativeAuthComplete(token: string, userId?: string, username?: string): void {
    Logging.Log('🔐 Identity: Processing Native OAuth authentication');
    
    // For Native OAuth, we may not have all user details immediately
    // The token is the primary authentication credential
    const userID = userId || 'native-user';
    const userTag = username || 'Native User';
    
    this.storeAuthenticationData(userID, userTag, token, '');
    this.onLoginSuccess();
  }

  /**
   * Handle WebGL session-based auth token response
   */
  private onAuthTokenResponse(response: any): void {
    Logging.Log('🎯 Identity: onAuthTokenResponse callback invoked');
    
    try {
      Logging.Log('🎯 Identity: Response type: ' + typeof response);
      
      // Handle null/undefined response
      if (response === null || response === undefined) {
        Logging.Log('ℹ️ Identity: Empty response received (likely 401/not authenticated)');
        this.handleGuestMode('No session - not authenticated');
        return;
      }
      
      Logging.Log('🎯 Identity: Response keys: ' + (typeof response === 'object' ? Object.keys(response).join(', ') : 'N/A'));
      
      // Check for HTTP error status
      if (response.status && response.status >= 400) {
        Logging.Log('ℹ️ Identity: HTTP error status: ' + response.status + ' ' + (response.statusText || ''));
        this.handleGuestMode('HTTP ' + response.status + ' - not authenticated');
        return;
      }
      
      // Response may be an object with 'body' property or a raw string
      let responseBody: string;
      if (response && typeof response === 'object' && response.body) {
        responseBody = response.body;
        Logging.Log('🎯 Identity: Using response.body');
      } else if (typeof response === 'string') {
        responseBody = response;
        Logging.Log('🎯 Identity: Using response as string');
      } else {
        responseBody = JSON.stringify(response);
        Logging.Log('🎯 Identity: Stringified response object');
      }
      
      // Handle empty body
      if (!responseBody || responseBody === '{}' || responseBody === 'null') {
        Logging.Log('ℹ️ Identity: Empty response body - not authenticated');
        this.handleGuestMode('Empty response - not authenticated');
        return;
      }
      
      Logging.Log('🎯 Identity: Response body: ' + responseBody);
      
      const data: AuthTokenResponse = JSON.parse(responseBody);
      Logging.Log('🎯 Identity: Parsed data: ' + JSON.stringify(data));
      
      if (data.success && data.token) {
        Logging.Log('✅ Identity: Lite auth successful for user: ' + (data.username || 'unknown'));
        
        const userID = data.userId || '';
        const userTag = data.username || '';
        const token = data.token;
        
        this.storeAuthenticationData(userID, userTag, token, '');
        this.onLoginSuccess();
      } else {
        const errorMsg = data.error || 'No token received';
        Logging.Log('ℹ️ Identity: User not authenticated - ' + errorMsg);
        this.handleGuestMode(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = 'Failed to parse auth response: ' + (error.message || error);
      Logging.LogError('❌ Identity: ' + errorMsg);
      
      try {
        Logging.LogError('❌ Identity: Raw response was: ' + JSON.stringify(response));
      } catch (e) {
        Logging.LogError('❌ Identity: Could not stringify response');
      }
      
      this.handleGuestMode(errorMsg);
    }
  }

  /**
   * Handle guest mode - continue without authentication
   */
  private handleGuestMode(reason: string): void {
    Logging.Log('👤 Identity: Continuing as guest - ' + reason);
    
    // Notify about guest mode (not an error, just informational)
    if (this.authErrorCallback) {
      this.authErrorCallback('Guest mode: ' + reason, true);
    }
    
    // Continue - invoke callback
    if (this.loginCallbackFunction) {
      this.loginCallbackFunction();
    }
  }

  /**
   * Handle WebGL auth token request error
   */
  private onAuthTokenError(error: string): void {
    const errorMsg = 'Authentication request failed: ' + error;
    Logging.LogWarning('⚠️ Identity: ' + errorMsg);
    
    // Notify user about the error
    this.notifyAuthError(errorMsg, true);
    
    Logging.Log('ℹ️ Identity: Continuing as guest');
    // Continue as guest on error
    if (this.loginCallbackFunction) {
      this.loginCallbackFunction();
    }
  }

  /**
   * Notify about authentication error
   * @param message Error message to display
   * @param canRetry Whether the user can retry authentication
   */
  private notifyAuthError(message: string, canRetry: boolean): void {
    Logging.LogWarning('🔐 Identity: Auth notification - ' + message);
    
    // Call custom error callback if provided
    if (this.authErrorCallback) {
      this.authErrorCallback(message, canRetry);
    }
    
    // Also send to UI via global message handler if available
    if (typeof (globalThis as any).handleToolbarMessage === 'function') {
      const notification = JSON.stringify({
        type: 'auth_notification',
        message: message,
        canRetry: canRetry,
        isError: true
      });
      (globalThis as any).handleToolbarMessage('AUTH.NOTIFICATION(' + notification + ')');
    }
  }

  /**
   * Set a custom error callback for auth failures
   * @param callback Function to call when auth fails
   */
  public setAuthErrorCallback(callback: AuthErrorCallback): void {
    this.authErrorCallback = callback;
  }

  /**
   * Store authentication data in context
   */
  private storeAuthenticationData(userID: string, userTag: string, token: string, tokenExpiration: string): void {
    let mwTopLevelContext = Context.GetContext('MW_TOP_LEVEL_CONTEXT') as MyWorldsTopLevelContext;
    if (!mwTopLevelContext) {
      mwTopLevelContext = {};
    }
    
    mwTopLevelContext.userID = userID;
    mwTopLevelContext.userTag = userTag;
    mwTopLevelContext.token = token;
    mwTopLevelContext.tokenExpiration = tokenExpiration;
    
    Context.DefineContext('MW_TOP_LEVEL_CONTEXT', mwTopLevelContext);
    
    Logging.Log('✅ Identity: Authentication data stored');
    Logging.Log('   User ID: ' + userID);
    Logging.Log('   User Tag: ' + userTag);
  }

  /**
   * Common login success handler
   */
  private onLoginSuccess(): void {
    // Hide login canvas if visible
    const loginCanvasId = WorldStorage.GetItem('LOGIN-CANVAS-ID');
    if (loginCanvasId) {
      const loginCanvas = Entity.Get(loginCanvasId);
      if (loginCanvas) {
        loginCanvas.SetInteractionState(InteractionState.Hidden);
      }
    }
    
    Logging.Log('🎉 Identity: User login completed successfully');
    
    // Show main UI after login
    Logging.Log('🔄 Identity: Showing main UI after login...');
    (globalThis as any).enableEditToolbar();
    
    // Invoke callback if provided
    if (this.loginCallbackFunction) {
      this.loginCallbackFunction();
    }
  }

  /**
   * Start the user login process
   * Uses different flows based on client type:
   * - full: Creates HTML panel with OAuth login page
   * - lite: Attempts session-based token generation, falls back to guest mode
   */
  public startUserLogin(onLoggedIn: () => void): void {
      Logging.Log(`🔐 Identity: startUserLogin called`);
      Logging.Log(`🔐 Identity: Current client type is: ${this.clientType}`);

      this.loginCallbackFunction = onLoggedIn;

      if (this.clientType === 'full') {
        Logging.Log('🔐 Identity: Using FULL (Native OAuth) login flow');
        this.startNativeOAuthLogin();
      } else {
        Logging.Log('🔐 Identity: Using LITE (session-based) login flow');
        this.startWebGLSessionAuth();
      }
  }

  /**
   * Start Native OAuth login flow
   * Creates an HTML panel that loads the OAuth login page
   */
  private startNativeOAuthLogin(): void {
      Logging.Log("🔐 Identity: Starting Native OAuth login flow...");

      const loginContext: LoginContext = {};
      const loginCanvasId = UUID.NewUUID().ToString();
      
      if (!loginCanvasId) {
          Logging.LogError("Failed to generate login canvas ID");
          return;
      }

      WorldStorage.SetItem(this.LOGIN_CANVAS_ID_KEY, loginCanvasId);

      // Create login canvas
      loginContext.loginCanvas = CanvasEntity.Create(
          undefined, // parent
          Vector3.zero, // position
          Quaternion.identity, // rotation
          Vector3.one, // scale
          false, // isVisible
          loginCanvasId,
          "LoginCanvas",
          "finishLoginCanvasSetup" // callback when creation is complete
      );
  }

  /**
   * Start WebGL session-based authentication
   * Attempts to get an app token using the shared session cookie
   * Falls back to guest mode if not authenticated
   */
  private startWebGLSessionAuth(): void {
      Logging.Log("🔐 Identity: Starting Lite session-based authentication...");

      const tokenEndpoint = `${this.AUTH_API_URL}/auth/generate-app-token`;
      const requestBody = JSON.stringify({ client: 'lite' });

      Logging.Log(`🌐 Identity: POST ${tokenEndpoint}`);
      Logging.Log(`🌐 Identity: Request body: ${requestBody}`);

      // Use HTTPNetworking.Fetch with credentials to ensure cookies are sent
      try {
        const fetchOptions = {
          method: 'POST',
          body: requestBody,
          credentials: 'include',  // Important: send cookies cross-origin
          headers: ['Content-Type: application/json'],
          mode: 'cors'
        };
        
        Logging.Log('🌐 Identity: Using Fetch with credentials: include');
        
        HTTPNetworking.Fetch(
          tokenEndpoint,
          fetchOptions as any,
          'onAuthTokenResponse'
        );
        
        Logging.Log('🌐 Identity: HTTPNetworking.Fetch called successfully');
      } catch (error: any) {
        Logging.LogError('❌ Identity: HTTPNetworking.Fetch failed: ' + (error.message || error));
        // Continue as guest on error
        if (this.loginCallbackFunction) {
          this.loginCallbackFunction();
        }
      }
  }

  /**
   * Initialize authentication on startup
   * This is the main entry point for authentication that should be called
   * when WebVerse starts up.
   * 
   * @param clientType The WebVerse client type
   * @param onComplete Callback when auth initialization is complete (success or guest mode)
   */
  public initializeAuth(clientType: WebVerseClientType, onComplete: () => void): void {
      Logging.Log(`🔐 Identity: Initializing authentication for ${clientType}...`);
      
      this.setClientType(clientType);
      
      // Check if already logged in
      if (this.isLoggedIn()) {
        Logging.Log('✅ Identity: Already authenticated');
        onComplete();
        return;
      }

      // Start the appropriate auth flow
      this.startUserLogin(onComplete);
  }

  /**
   * Get the current user's authentication data
   * @returns The user's authentication data or null if not logged in
   */
  public getCurrentUser(): MyWorldsTopLevelContext | null {
      return Context.GetContext(this.MW_TOP_LEVEL_CONTEXT_KEY) as MyWorldsTopLevelContext || null;
  }

  /**
   * Check if the user is currently logged in
   * @returns True if the user is logged in, false otherwise
   */
  public isLoggedIn(): boolean {
      const user = this.getCurrentUser();
      return !!(user && user.userID && user.token);
  }

  /**
   * Get the user's ID
   * @returns The user's ID or null if not logged in
   */
  public getUserId(): string | null {
      const user = this.getCurrentUser();
      return user?.userID || null;
  }

  /**
   * Get the user's authentication token
   * @returns The user's token or null if not logged in
   */
  public getUserToken(): string | null {
      const user = this.getCurrentUser();
      return user?.token || null;
  }

  /**
   * Log out the current user
   */
  public logout(): void {
      // Clear the context
      Context.DefineContext(this.MW_TOP_LEVEL_CONTEXT_KEY, {});
      
      // Clear storage items
      WorldStorage.SetItem(this.LOGIN_CANVAS_ID_KEY, "");
      WorldStorage.SetItem(this.LOGIN_PANEL_ID_KEY, "");
      
      Logging.Log("User logged out");
  }

  /**
   * Debug method to inspect current authentication state
   * Call from console: globalThis.debugAuthState()
   */
  public debugAuthState(): void {
      Logging.Log('=== 🔐 Identity Debug State ===');
      Logging.Log('Client Type: ' + this.clientType);
      Logging.Log('Is Logged In: ' + this.isLoggedIn());
      
      const user = this.getCurrentUser();
      if (user) {
        Logging.Log('User ID: ' + (user.userID || 'not set'));
        Logging.Log('User Tag: ' + (user.userTag || 'not set'));
        Logging.Log('Token: ' + (user.token ? user.token.substring(0, 20) + '...' : 'not set'));
        Logging.Log('Token Expiration: ' + (user.tokenExpiration || 'not set'));
      } else {
        Logging.Log('No user context found');
      }
      Logging.Log('===============================');
  }



  /**
   * Public method to start login (maintains compatibility)
   */
  public StartLogin(onSuccess?: () => void): void {
      this.startUserLogin(onSuccess || (() => {}));
      // Note: onSuccess callback will be handled through the WebVerse message system
      if (onSuccess) {
          Logging.Log("Login success callback provided but will be handled through WebVerse messaging");
      }
  }

  /**
   * Check if login is required and start it if needed
   * @returns True if login is required, false if already logged in
   */
  public ensureLogin(onSuccess?: () => void): boolean {
      if (this.isLoggedIn()) {
          return false; // Already logged in
      }
      
      Logging.Log("🔐 Identity: User authentication required - starting login process");
      this.startUserLogin(onSuccess || (() => {}));
      return true; // Login was started
  }
}