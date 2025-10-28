# 🌐 MyWorlds TypeScript Client Architecture

This document provides a full architectural overview of the MyWorlds TypeScript client. It combines structured Markdown with PlantUML diagrams to guide implementation by developers and AI agents. The client is modular, extensible, and designed for spatial interaction, entity placement, world rendering, and real-time synchronization.

---

## 📦 Entrypoint: `myworld` Script

The `myworld` script orchestrates the client startup sequence:

1. Parse query parameters  
2. Trigger login via Identity module  
3. Initialize all core modules into `ClientContext`  
4. Load world configuration  
5. Connect to synchronization sessions  
6. Instantiate and load world renderers  
7. Activate UI editing tools  

### 🧭 Initialization Sequence

```plantuml
@startuml
actor Browser
participant myworld
participant Identity
participant ClientContext
participant Config
participant Sync
participant WorldRendering
participant UI

Browser -> myworld: launch()
myworld -> myworld: ProcessQueryParams()
myworld -> Identity: StartUserLogin()
Identity -> myworld: OnLoginSuccess()
myworld -> ClientContext: InitializeModules()
myworld -> Config: LoadWorldConfig(worldUri)
Config -> myworld: return WorldConfig
myworld -> Sync: ConnectToSynchronizers()
Sync -> myworld: OnSyncComplete()
myworld -> WorldRendering: CreateAndLoadRenderers(worldConfig)
WorldRendering -> myworld: OnWorldsLoaded()
myworld -> UI: InitializeEditToolbar()
@enduml
```

---

## 🧩 Component Dependencies

```plantuml
@startuml
package "myworld Client" {
  [myworld]
  [ProcessQueryParams]
  [Identity]
  [ClientContext]
  [Config]
  [API.REST]
  [EntityManager]
  [InputRouter]
  [PlayerController]
  [ScriptEngine]
  [SyncManager]
  [UIManager]
  [WorldRendererFactory]
  [EnvironmentModifier]
}

myworld --> ProcessQueryParams
myworld --> Identity
myworld --> ClientContext
myworld --> Config
myworld --> SyncManager
myworld --> UIManager
myworld --> WorldRendererFactory

ClientContext --> API.REST
ClientContext --> Config
ClientContext --> Identity
ClientContext --> EntityManager
ClientContext --> InputRouter
ClientContext --> PlayerController
ClientContext --> ScriptEngine
ClientContext --> SyncManager
ClientContext --> UIManager
ClientContext --> WorldRendererFactory
ClientContext --> EnvironmentModifier
@enduml
```

---

## 🧠 ClientContext & Core Modules

```plantuml
@startuml
class ClientContext {
  +modules: Modules
}

class Modules {
  +api: REST
  +config: ConfigurationModule
  +identity: Identity
  +entity: EntityManager
  +input: InputRouter
  +player: PlayerController
  +script: ScriptEngine
  +sync: SyncManager
  +ui: UIManager
  +worldRendering: WorldRendererFactory
  +environmentModifier: EnvironmentModifier
}

ClientContext *-- Modules
Modules o-- REST
Modules o-- ConfigurationModule
Modules o-- Identity
Modules o-- EntityManager
Modules o-- InputRouter
Modules o-- PlayerController
Modules o-- ScriptEngine
Modules o-- SyncManager
Modules o-- UIManager
Modules o-- WorldRendererFactory
Modules o-- EnvironmentModifier
@enduml
```

---

## 🔐 Identity Module

Handles login via canvas and HTML overlay.

```plantuml
@startuml
package modules.Identity {
  class Identity {
    +StartLogin(): void
    -FinishLoginCanvasSetup(): void
    -HandleUserLoginMessage(msg: string): void
  }

  class CanvasEntity
  class HTMLEntity
  class Context

  Identity --> CanvasEntity : create(loginCanvas)
  Identity --> HTMLEntity : create(UserLoginPanel)
  HTMLEntity --> Identity : onMessage(msg)
  Identity --> Context : update(MW_TOP_LEVEL_CONTEXT)
}
@enduml
```

---

## 🌍 Configuration Module

Loads and applies world, entity, and terrain configuration.

```plantuml
@startuml
package modules.Config {
  class ConfigurationModule {
    +loadWorldConfig(): Promise<WorldConfig>
    +getEntityVariantById(entityId, variantId): VariantConfig|null
    -fetchJson<T>(url): Promise<T>
    -validateWorldConfig(cfg)
    -validateEntitiesConfig(cfg)
    -applyEntitiesConfig()
    -validateTerrainConfig(cfg)
    -applyTerrainConfig()
    -normalizeUrl(path)
  }

  class WorldConfig
  class EntityConfig
  class VariantConfig
  class OrientationConfig
  class TerrainConfig
  class TerrainLayerConfig

  ConfigurationModule ..> WorldConfig
  WorldConfig o-- EntityConfig
  EntityConfig o-- VariantConfig
  VariantConfig o-- OrientationConfig
  WorldConfig o-- TerrainConfig
  TerrainConfig o-- TerrainLayerConfig
}
@enduml
```

---

## 🧱 Entity Module

Manages entity creation, placement, and terrain alignment.

```plantuml
@startuml
package modules.Entity {
  class EntityModule {
    +entityPlacement: EntityPlacement
    +MW_Entity_LoadEntity(...)
    +MW_Entity_SnapEntityToTerrain(entity)
    +MW_Entity_FinishLoadingPlacingEntity(entity)
    +MW_Entity_FinishLoadingPlacedEntity(entity)
  }

  class EntityPlacement
  class MeshEntity
  class AutomobileEntity
  class AirplaneEntity
  class WorldStorage
  class MW_Script

  EntityModule --> EntityPlacement
  EntityModule --> MeshEntity
  EntityModule --> AutomobileEntity
  EntityModule --> AirplaneEntity
  EntityModule --> WorldStorage
  EntityModule --> MW_Script
}
@enduml
```

### Entity Loading Flow

```plantuml
@startuml
actor User
participant EntityModule
participant WorldStorage
participant MeshEntity
participant AutomobileEntity
participant AirplaneEntity
participant MW_Script
participant Terrain

User -> EntityModule: MW_Entity_LoadEntity(...)
EntityModule -> WorldStorage: store placement metadata

alt type = mesh
  EntityModule -> MeshEntity: Create(...)
  MeshEntity -> EntityModule: MW_Entity_FinishLoadingPlacingEntity()
else type = automobile
  EntityModule -> AutomobileEntity: Create(...)
  AutomobileEntity -> EntityModule: MW_Entity_FinishLoadingPlacingEntity()
else type = airplane
  EntityModule -> AirplaneEntity: Create(...)
  AirplaneEntity -> EntityModule: MW_Entity_FinishLoadingPlacingEntity()
end

EntityModule -> WorldStorage: retrieve placement metadata
EntityModule -> Terrain: SnapEntityToTerrain()
EntityModule -> MW_Script: AddScriptEntity()
MW_Script -> MW_Script: RunOnCreateScript()
MW_Script -> MW_Script: AddIntervalScripts()
@enduml
```

---

## 🌐 World Rendering Subsystem

Supports multiple renderers for different spatial scales.

```plantuml
@startuml
package modules.WorldRendering {
  abstract class WorldRendering
  class StaticSurfaceRenderer
  class TiledSurfaceRenderer
  class GlobeRenderer
  class AtmosphereRenderer
  class OrbitalRenderer
  class StellarSystemRenderer
  class GalacticRenderer
  class SunController

  WorldRendering <|-- StaticSurfaceRenderer
  WorldRendering <|-- TiledSurfaceRenderer
  WorldRendering <|-- GlobeRenderer
  WorldRendering <|-- AtmosphereRenderer
  WorldRendering <|-- OrbitalRenderer
  WorldRendering <|-- StellarSystemRenderer
  WorldRendering <|-- GalacticRenderer
  WorldRendering <|-- SunController
}
@enduml
```

---

## 🔁 Synchronization Flow

Handles real-time updates across clients.

```plantuml
@startuml
actor RemoteClient
participant WorldSync
participant SyncMsgHandler
participant EntityManager
participant PlayerController
participant UIManager
participant WorldRendererFactory

RemoteClient -> WorldSync: publish(diff)
WorldSync -> SyncMsgHandler: notify(diff)
SyncMsgHandler -> EntityManager: applyEntityUpdates()
SyncMsgHandler -> PlayerController: applyPlayerState()
SyncMsgHandler -> UIManager: triggerUIUpdates()
SyncMsgHandler -> WorldRendererFactory: scheduleFrameUpdate()
@enduml
```

---

## 🌐 REST API Component

Provides HTTP endpoints for terrain, entities, and metadata.

```plantuml
@startuml
package API {
  class REST {
    +sendTerrainDigRequest(...)
    +sendTerrainBuildRequest(...)
    +sendPositionEntityRequest(...)
    +sendDeleteEntityRequest(...)
    +sendBiomeInfoRequest(...)
    +sendTimeRequest(...)
    +sendGetEntitiesRequest(...)
    +sendRegionInfoRequest(...)
    +sendGetTerrainRequest(...)
    +sendGetEntityInstancesRequest(...)
    +sendGetEntityTemplatesRequest(...)
    +sendAddEntityInstanceRequest(...)
  }
}
@enduml
```
