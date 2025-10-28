/**
 * REST API module for HTTP endpoints
 */

import { EntityPlacementData, Position } from '../types/config';
import { EntityData } from '../types/entity';

export class REST {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async sendTerrainDigRequest(position: Position, radius: number, depth: number): Promise<void> {
    await this.post('/terrain/dig', { position, radius, depth });
  }

  async sendTerrainBuildRequest(position: Position, radius: number, height: number): Promise<void> {
    await this.post('/terrain/build', { position, radius, height });
  }

  async sendPositionEntityRequest(entityId: string, position: Position, rotation?: any): Promise<void> {
    await this.post('/entity/position', { entityId, position, rotation });
  }

  async sendDeleteEntityRequest(entityId: string): Promise<void> {
    await this.delete(`/entity/${entityId}`);
  }

  async sendBiomeInfoRequest(position: Position): Promise<any> {
    return this.get('/biome/info', { position });
  }

  async sendTimeRequest(): Promise<any> {
    return this.get('/time');
  }

  async sendGetEntitiesRequest(): Promise<EntityData[]> {
    return this.get('/entities');
  }

  async sendRegionInfoRequest(regionId: string): Promise<any> {
    return this.get(`/region/${regionId}`);
  }

  async sendGetTerrainRequest(bounds: any): Promise<any> {
    return this.get('/terrain', { bounds });
  }

  async sendGetEntityInstancesRequest(): Promise<EntityData[]> {
    return this.get('/entity/instances');
  }

  async sendGetEntityTemplatesRequest(): Promise<any[]> {
    return this.get('/entity/templates');
  }

  async sendAddEntityInstanceRequest(data: EntityPlacementData): Promise<EntityData> {
    return this.post('/entity/instance', data);
  }

  private async get(endpoint: string, params?: any): Promise<any> {
    const url = new URL(this.baseUrl + endpoint, window.location.origin);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, JSON.stringify(params[key])));
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private async delete(endpoint: string): Promise<void> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}
