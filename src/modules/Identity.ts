/**
 * Identity Module for WebVerse HTML Panel Login
 * 
 * This module handles user authentication using WebVerse HTML panels
 * to display login interfaces and process authentication responses.
 */

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
 * Identity management class for WebVerse HTML panel authentication
 */
export class Identity {
  private readonly MW_TOP_LEVEL_CONTEXT_KEY = "MW_TOP_LEVEL_CONTEXT";
  private readonly LOGIN_CANVAS_ID_KEY = "LOGIN-CANVAS-ID";
  private readonly LOGIN_PANEL_ID_KEY = "LOGIN-PANEL-ID";

  private loginCallbackFunction?: () => void;

  constructor() {
    this.loginCallbackFunction = undefined;
    this.setupGlobalCallbacks();
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

    // Define global callback for handling user login messages
    (globalThis as any).handleUserLoginMessage = (msg: string) => {
      this.handleUserLoginMessage(msg);
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
        loginPanel.LoadFromURL('https://id.worldhub.me:35526/login');
      }
      
      Logging.Log('✓ Login panel setup completed');
      
    } catch (error: any) {
      Logging.LogError('❌ Error in finishLoginPanelSetup: ' + (error.message || error));
    }
  }

  handleUserLoginMessage(msg: string): void {
    Logging.Log('🎯 Identity: handleUserLoginMessage invoked with: ' + msg);
    try {
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
      
      let mwTopLevelContext = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
      if (!mwTopLevelContext) {
        mwTopLevelContext = {};
      }
      
      mwTopLevelContext.userID = msgParams[0];
      mwTopLevelContext.userTag = msgParams[1];
      mwTopLevelContext.token = msgParams[2];
      mwTopLevelContext.tokenExpiration = msgParams[3];
      
      Context.DefineContext('MW_TOP_LEVEL_CONTEXT', mwTopLevelContext);
      
      const loginCanvasId = WorldStorage.GetItem('LOGIN-CANVAS-ID');
      if (loginCanvasId) {
        const loginCanvas = Entity.Get(loginCanvasId);
        if (loginCanvas) {
          loginCanvas.SetInteractionState(InteractionState.Hidden);
        }
      }
      
      Logging.Log('User login completed successfully');
      Logging.Log('User ID: ' + mwTopLevelContext.userID);
      Logging.Log('User Tag: ' + mwTopLevelContext.userTag);
      
      // Execute login callback if provided
      if (this.loginCallbackFunction) {
          this.loginCallbackFunction();
      }
      
      // Trigger entity templates request after successful login
      Logging.Log('🔄 Triggering entity templates request after successful login...');
      if (typeof (globalThis as any).triggerEntityTemplatesAfterLogin === 'function') {
        (globalThis as any).triggerEntityTemplatesAfterLogin();
      } else if ((globalThis as any).pendingEntityTemplateRequest && 
                 typeof (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates === 'function') {
        Logging.Log('🔄 Executing pending entity templates request directly...');
        (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates();
        (globalThis as any).pendingEntityTemplateRequest = null;
      } else {
        Logging.Log('⚠️ No entity template loading mechanism found - templates may need to be requested manually');
      }

      // Trigger world manifest loading for planet renderer after successful login
      Logging.Log('🔄 Triggering world manifest loading after successful login...');
      if ((globalThis as any).pendingWorldManifestRequest && 
          typeof (globalThis as any).pendingWorldManifestRequest.loadWorldManifest === 'function') {
        Logging.Log('🔄 Executing pending world manifest request for planet renderer...');
        (globalThis as any).pendingWorldManifestRequest.loadWorldManifest();
        (globalThis as any).pendingWorldManifestRequest = null;
      } else {
        Logging.Log('⚠️ No pending world manifest request found - may not be using planet renderer');
      }

      // Start the main UI and render loop after login and world loading setup is complete
      Logging.Log('🔄 Starting main UI and render loop after login...');
      if (typeof (globalThis as any).startRenderLoop === 'function') {
        (globalThis as any).startRenderLoop();
      } else {
        Logging.LogError('❌ startRenderLoop function not available');
      }
      
    } catch (error: any) {
      Logging.LogError('❌ Error in handleUserLoginMessage: ' + (error.message || error));
    }
  }

  /**
   * Start the user login process by creating a login canvas
   */
  public startUserLogin(onLoggedIn: () => void): void {
      Logging.Log("Starting User Login...");

      this.loginCallbackFunction = onLoggedIn;

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