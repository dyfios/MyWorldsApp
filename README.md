# MyWorldsApp

A modular TypeScript client for spatial interaction, entity placement, world rendering, and real-time synchronization.

## 📖 Documentation

- **[Design Document](docs/design.md)** - Complete architectural overview with PlantUML diagrams
- **[Implementation Guide](IMPLEMENTATION.md)** - TypeScript implementation details and usage

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Clean build artifacts
npm run clean
```

## 🏗️ Architecture

This project implements a comprehensive client architecture with:

- **Modular Design**: Separate modules for identity, configuration, entities, rendering, etc.
- **Multiple Renderers**: Support for different spatial scales (surface, globe, orbital, galactic)
- **Real-time Sync**: Publish/subscribe synchronization across clients
- **Entity System**: Support for mesh, automobile, and airplane entities
- **Script Engine**: Execute entity behaviors and interactions
- **REST API**: HTTP endpoints for terrain and entity operations

## 📦 Key Components

- `ClientContext` - Central container for all modules
- `Identity` - User authentication and login
- `ConfigurationModule` - Load world, entity, and terrain configs
- `EntityManager` - Create and manage entities
- `WorldRendererFactory` - Multiple renderer implementations
- `SyncManager` - Real-time synchronization
- `REST` - API client for server communication

## 📄 License

See [LICENSE](LICENSE) for details.
