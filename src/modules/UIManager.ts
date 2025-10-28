/**
 * UI Manager - Manages UI elements and edit toolbar
 */

export interface UIUpdateData {
  type: string;
  payload?: any;
}

export class UIManager {
  private editToolbar?: HTMLElement;
  private isInitialized: boolean = false;

  /**
   * Initialize edit toolbar
   */
  initializeEditToolbar(): void {
    if (this.isInitialized) {
      return;
    }

    this.createEditToolbar();
    this.isInitialized = true;
    console.log('Edit toolbar initialized');
  }

  /**
   * Create edit toolbar UI
   */
  private createEditToolbar(): void {
    this.editToolbar = document.createElement('div');
    this.editToolbar.id = 'edit-toolbar';
    this.editToolbar.className = 'toolbar';
    
    this.editToolbar.innerHTML = `
      <button id="tool-select" class="tool-btn">Select</button>
      <button id="tool-move" class="tool-btn">Move</button>
      <button id="tool-rotate" class="tool-btn">Rotate</button>
      <button id="tool-scale" class="tool-btn">Scale</button>
      <button id="tool-delete" class="tool-btn">Delete</button>
      <button id="tool-terrain-dig" class="tool-btn">Dig</button>
      <button id="tool-terrain-build" class="tool-btn">Build</button>
    `;

    document.body.appendChild(this.editToolbar);
    this.attachToolbarEventListeners();
  }

  /**
   * Attach event listeners to toolbar buttons
   */
  private attachToolbarEventListeners(): void {
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.handleToolSelection(target.id);
      });
    });
  }

  /**
   * Handle tool selection
   */
  private handleToolSelection(toolId: string): void {
    console.log(`Tool selected: ${toolId}`);
    
    // Remove active class from all buttons
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(btn => btn.classList.remove('active'));

    // Add active class to selected button
    const selectedBtn = document.getElementById(toolId);
    selectedBtn?.classList.add('active');
  }

  /**
   * Trigger UI updates from sync
   */
  triggerUIUpdates(data: UIUpdateData): void {
    console.log('UI updates triggered:', data);
    // Update UI elements based on sync data
  }

  /**
   * Show/hide edit toolbar
   */
  toggleEditToolbar(visible: boolean): void {
    if (this.editToolbar) {
      this.editToolbar.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Clean up UI elements
   */
  dispose(): void {
    if (this.editToolbar) {
      this.editToolbar.remove();
      this.editToolbar = undefined;
    }
    this.isInitialized = false;
  }
}
