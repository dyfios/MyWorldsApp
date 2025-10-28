/**
 * Environment Modifier - Handles environmental changes and effects
 */

import { Position } from '../types/config';

export interface EnvironmentSettings {
  timeOfDay: number; // 0-24 hours
  weatherType: 'clear' | 'rain' | 'snow' | 'fog';
  windSpeed: number;
  windDirection: number;
  temperature: number;
}

export class EnvironmentModifier {
  private settings: EnvironmentSettings;

  constructor() {
    this.settings = {
      timeOfDay: 12, // noon
      weatherType: 'clear',
      windSpeed: 0,
      windDirection: 0,
      temperature: 20
    };
  }

  /**
   * Get current environment settings
   */
  getSettings(): EnvironmentSettings {
    return { ...this.settings };
  }

  /**
   * Set time of day
   */
  setTimeOfDay(hours: number): void {
    this.settings.timeOfDay = hours % 24;
    console.log(`Time of day set to ${this.settings.timeOfDay}`);
  }

  /**
   * Set weather type
   */
  setWeather(weatherType: EnvironmentSettings['weatherType']): void {
    this.settings.weatherType = weatherType;
    console.log(`Weather set to ${weatherType}`);
  }

  /**
   * Set wind conditions
   */
  setWind(speed: number, direction: number): void {
    this.settings.windSpeed = speed;
    this.settings.windDirection = direction;
    console.log(`Wind set to ${speed} m/s at ${direction} degrees`);
  }

  /**
   * Set temperature
   */
  setTemperature(celsius: number): void {
    this.settings.temperature = celsius;
    console.log(`Temperature set to ${celsius}°C`);
  }

  /**
   * Apply environment effects at a position
   */
  applyEnvironmentEffects(position: Position): void {
    // Logic to apply weather effects, time-based lighting, etc.
    console.log('Applying environment effects at position:', position);
  }

  /**
   * Update environment state
   */
  update(deltaTime: number): void {
    // Update time progression, weather transitions, etc.
    // For now, just advance time slightly
    this.settings.timeOfDay += deltaTime / 3600; // Advance time (assuming deltaTime is in seconds)
    if (this.settings.timeOfDay >= 24) {
      this.settings.timeOfDay -= 24;
    }
  }
}
