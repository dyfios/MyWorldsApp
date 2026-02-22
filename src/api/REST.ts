/**
 * REST API module for HTTP endpoints
 */

import { EntityPlacementData, Position } from '../types/config';
import { EntityData } from '../types/entity';

export class REST {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    Logging.Log('🔧 REST constructor called with baseUrl: ' + baseUrl);
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

  sendTerrainDigRequest(terrainIndex: Vector2Int, hitPoint: Vector3, digLayer: number, brushSize: number,
    userId: string, userToken: string, onComplete: string): void {
    this.get('/modifyterrain', {
      'regionX': terrainIndex.x,
      'regionY': terrainIndex.y,
      'x': hitPoint.x,
      'y': hitPoint.y,
      'z': hitPoint.z,
      'operation': 'dig',
      'brushType': 'roundedCube',
      'layer': digLayer,
      'brushSize': brushSize,
      'userId': userId,
      'userToken': userToken
    }, onComplete);
  }

  sendTerrainBuildRequest(terrainIndex: Vector2Int, hitPoint: Vector3, buildLayer: number, brushSize: number,
    userId: string, userToken: string, onComplete: string): void{
    this.get('/modifyterrain', {
      'regionX': terrainIndex.x,
      'regionY': terrainIndex.y,
      'x': hitPoint.x,
      'y': hitPoint.y,
      'z': hitPoint.z,
      'operation': 'build',
      'brushType': 'roundedCube',
      'layer': buildLayer,
      'brushSize': brushSize,
      'userId': userId,
      'userToken': userToken
    }, onComplete);
  }

  sendPositionEntityRequest(worldId: string, entityId: string, variantId: string,
    instanceId: string, position: Vector3, rotation: Quaternion, userId: string,
    userToken: string, onComplete: string): void {
    this.post(`/world/${worldId}/create-entity-instance`, {
      'world-id': worldId,
      'entity-data': {
        'entity_id': entityId,
        'variant_id': variantId,
        'instanceid': String(instanceId),
        'pos_x': Number(position.x) || 0,
        'pos_y': Number(position.y) || 0,
        'pos_z': Number(position.z) || 0,
        'rot_x': Number(rotation.x) || 0,
        'rot_y': Number(rotation.y) || 0,
        'rot_z': Number(rotation.z) || 0,
        'rot_w': Number(rotation.w) || 0,
        'scl_x': 1,
        'scl_y': 1,
        'scl_z': 1
      },
      'user-id': userId,
      'user-token': userToken
    }, "application/json", onComplete);
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
    this.post(`/api/world/${worldId}/list-entity-instances`, {
      'world-id': worldId,
      'user-id': userId,
      'user-token': userToken
    }, "application/json", onComplete);
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
    this.post(`/api/world/${worldId}/list-entity-templates`, {
      'world-id': worldId,
      'user-id': userId,
      'user-token': userToken
    }, "application/json", onComplete);
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
    return this.post('/entity/instance', data, "application/json", "");
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

  private async post(endpoint: string, data: any,
    dataType: string, onComplete: string): Promise<any> {
    const url = this.baseUrl + endpoint;
    
    Logging.Log('🌐 REST POST request to: ' + url + ' with data: ' + JSON.stringify(data));

    HTTPNetworking.Post(url, JSON.stringify(data), dataType, onComplete);
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
