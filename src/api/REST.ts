/**
 * REST API module for HTTP endpoints
 */

import { EntityPlacementData, Position, Rotation } from '../types/config';
import { EntityData } from '../types/entity';

export class REST {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private generateRequestId(): string {
    const uuid = UUID.NewUUID().ToString();
    if (uuid === null) {
      // Fallback using a simple counter
      return 'fallback_' + Math.random().toString(36).substr(2, 9);
    }
    return uuid;
  }

  async sendTerrainDigRequest(position: Position, radius: number, depth: number): Promise<void> {
    await this.post('/terrain/dig', { position, radius, depth }, "application/json");
  }

  async sendTerrainBuildRequest(position: Position, radius: number, height: number): Promise<void> {
    await this.post('/terrain/build', { position, radius, height }, "application/json");
  }

  async sendPositionEntityRequest(entityId: string, position: Position, rotation?: Rotation): Promise<void> {
    await this.post('/entity/position', { entityId, position, rotation }, "application/json");
  }

  async sendDeleteEntityRequest(entityId: string): Promise<void> {
    await this.delete(`/entity/${entityId}`);
  }

  sendBiomeInfoRequest(position: Position, onComplete: string): void {
    this.get('/biome/info', { position }, onComplete);
  }

  sendTimeRequest(onComplete: string): void {
    this.get('/gettime', undefined, onComplete);
  }

  sendGetEntitiesRequest(regionIdx: Vector2Int, userId: string, userToken: string, onComplete: string): void {
    this.get('/getentities', {
      'regionX': regionIdx.x,
      'regionY': regionIdx.y,
      'userId': userId,
      'userToken': userToken
    }, onComplete);
  }

  sendRegionInfoRequest(regionIdx: Vector2Int, userId: string, userToken: string, onComplete: string): void {
    this.get(`/getregioninfo`, {
      'regionX': regionIdx.x,
      'regionY': regionIdx.y,
      'userID': userId,
      'userToken': userToken
    }, onComplete);
  }

  sendGetTerrainRequest(regionIdx: Vector2Int, userID: string, userToken: string, onComplete: string): void {
    this.get('/getterrain', {
      'regionX': regionIdx.x,
      'regionY': regionIdx.y,
      'minX': 0,
      'minY': 0,
      'maxX': 512,
      'maxY': 512,
      'userID': userID,
      'userToken': userToken
    }, onComplete);
  }

  sendGetEntityInstancesRequest(worldId: string, userId: string, userToken: string, onComplete: string): void {
    this.get('/list-entity-instances', {
      'world-id': worldId,
      'user-id': userId,
      'user-token': userToken
    }, onComplete);
  }

  sendGetRegionInfoRequest(regionIdx: Vector2Int, userId: string, userToken: string, onComplete: string): void {
    this.get('/getregioninfo', {
      'regionX': regionIdx.x,
      'regionY': regionIdx.y,
      'userID': userId,
      'userToken': userToken
    }, onComplete);
  }

  sendGetEntityTemplatesRequest(worldId: string, userId: string, userToken: string, onComplete: string): void {
    this.get('/list-entity-templates', {
      'world-id': worldId,
      'user-id': userId,
      'user-token': userToken
    }, onComplete);
  }

  sendWorldManifestRequest(onComplete: string): void {
    this.get('/world.json', null, onComplete);
  }

  sendWorldEntitiesManifestRequest(onComplete: string): void {
    this.get('/entities.json', null, onComplete);
  }

  sendWorldTerrainManifestRequest(onComplete: string): void {
    this.get('/terrain.json', null, onComplete);
  }

  sendBiomeManifestRequest(onComplete: string): void {
    this.get('/getbiomeinfo', null, onComplete);
  }

  async sendAddEntityInstanceRequest(data: EntityPlacementData): Promise<EntityData> {
    return this.post('/entity/instance', data, "application/json");
  }

  private get(endpoint: string, params: any, onComplete: string): void {
    let url = this.baseUrl + endpoint;
    
    if (params) {
      const searchParams = new Array<string>();
      Object.keys(params).forEach(key => {
        searchParams.push(key + '=' + JSON.stringify(params[key]));
      });
      if (searchParams.length > 0) {
        url += '?' + searchParams.join('&');
      }
    }

    Logging.Log('🌐 REST GET request to: ' + url);
    
    HTTPNetworking.Fetch(url, onComplete);
  }

  private async post(endpoint: string, data: any, dataType: string): Promise<any> {
    const url = this.baseUrl + endpoint;
    
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const onComplete = `onHTTPPostComplete_${requestId}`;
      const onError = `onHTTPPostError_${requestId}`;

      HTTPNetworking.Post(url, data, dataType, onComplete);

      // Store callbacks globally for HTTPNetworking to call
      (globalThis as any)[onComplete] = (response: any) => {
        try {
          const data = JSON.parse(response.body);
          // Clean up callbacks
          delete (globalThis as any)[onComplete];
          delete (globalThis as any)[onError];
          resolve(data);
        } catch (error) {
          delete (globalThis as any)[onComplete];
          delete (globalThis as any)[onError];
          reject(new Error('Failed to parse response JSON'));
        }
      };

      (globalThis as any)[onError] = (error: any) => {
        delete (globalThis as any)[onComplete];
        delete (globalThis as any)[onError];
        reject(new Error(`HTTP error! ${error.message || 'Unknown error'}`));
      };
    });
  }

  private async delete(endpoint: string): Promise<void> {
    const url = this.baseUrl + endpoint;
    
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const onComplete = `onHTTPDeleteComplete_${requestId}`;
      const onError = `onHTTPDeleteError_${requestId}`;

      HTTPNetworking.Fetch(url, onComplete);

      // Store callbacks globally for HTTPNetworking to call
      (globalThis as any)[onComplete] = (_response: any) => {
        delete (globalThis as any)[onComplete];
        delete (globalThis as any)[onError];
        resolve();
      };

      (globalThis as any)[onError] = (error: any) => {
        delete (globalThis as any)[onComplete];
        delete (globalThis as any)[onError];
        reject(new Error(`HTTP error! ${error.message || 'Unknown error'}`));
      };
    });
  }
}
