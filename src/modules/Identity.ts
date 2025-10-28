/**
 * Identity module - Handles user login and authentication
 */

export class Identity {
  private loginCanvas?: HTMLCanvasElement;
  private loginPanel?: HTMLElement;
  private onLoginSuccessCallback?: () => void;

  /**
   * Start the user login process
   */
  StartLogin(onSuccess?: () => void): void {
    this.onLoginSuccessCallback = onSuccess;
    this.setupLoginCanvas();
    this.setupLoginPanel();
  }

  /**
   * Finish setting up the login canvas
   */
  private FinishLoginCanvasSetup(): void {
    if (!this.loginCanvas) {
      this.loginCanvas = document.createElement('canvas');
      this.loginCanvas.id = 'login-canvas';
      this.loginCanvas.width = 800;
      this.loginCanvas.height = 600;
      document.body.appendChild(this.loginCanvas);
    }
  }

  /**
   * Handle user login message from the HTML panel
   */
  private HandleUserLoginMessage(msg: string): void {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'login_success') {
        this.completeLogin();
      }
    } catch (error) {
      console.error('Failed to parse login message:', error);
    }
  }

  /**
   * Set up the login canvas
   */
  private setupLoginCanvas(): void {
    this.FinishLoginCanvasSetup();
  }

  /**
   * Set up the HTML login panel
   */
  private setupLoginPanel(): void {
    this.loginPanel = document.createElement('div');
    this.loginPanel.id = 'user-login-panel';
    this.loginPanel.innerHTML = `
      <div class="login-form">
        <h2>Login to MyWorlds</h2>
        <input type="text" id="username" placeholder="Username" />
        <input type="password" id="password" placeholder="Password" />
        <button id="login-btn">Login</button>
      </div>
    `;
    
    document.body.appendChild(this.loginPanel);

    // Add event listener for login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.HandleUserLoginMessage(JSON.stringify({ type: 'login_success' }));
      });
    }
  }

  /**
   * Complete the login process
   */
  private completeLogin(): void {
    // Hide login UI
    if (this.loginPanel) {
      this.loginPanel.style.display = 'none';
    }
    if (this.loginCanvas) {
      this.loginCanvas.style.display = 'none';
    }

    // Update context (MW_TOP_LEVEL_CONTEXT would be updated here)
    
    // Trigger success callback
    if (this.onLoginSuccessCallback) {
      this.onLoginSuccessCallback();
    }
  }
}
