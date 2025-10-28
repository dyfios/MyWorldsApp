/**
 * Process Query Parameters utility
 */

export interface QueryParams {
  worldUri?: string;
  debug?: boolean;
  userId?: string;
  sessionId?: string;
  [key: string]: string | boolean | undefined;
}

export class ProcessQueryParams {
  private params: QueryParams = {};

  /**
   * Parse query parameters from URL
   */
  parse(): QueryParams {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.params = {};
    
    urlParams.forEach((value, key) => {
      // Convert boolean strings
      if (value.toLowerCase() === 'true') {
        this.params[key] = true;
      } else if (value.toLowerCase() === 'false') {
        this.params[key] = false;
      } else {
        this.params[key] = value;
      }
    });

    console.log('Parsed query parameters:', this.params);
    return this.params;
  }

  /**
   * Get a specific parameter
   */
  get(key: string): string | boolean | undefined {
    return this.params[key];
  }

  /**
   * Get all parameters
   */
  getAll(): QueryParams {
    return { ...this.params };
  }

  /**
   * Check if a parameter exists
   */
  has(key: string): boolean {
    return key in this.params;
  }
}
