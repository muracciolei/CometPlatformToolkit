# CometPlatform Toolkit

[![Latest Release](https://img.shields.io/github/v/release/muracciolei/CometPlatformToolkit?label=Latest%20Release&color=blue)](https://github.com/muracciolei/CometPlatformToolkit/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Web-green.svg)](https://github.com/muracciolei/CometPlatformToolkit)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A modular web development platform designed for AI agent automation, workflow orchestration, and collaborative development.**

## 🚀 Quick Start

### Running the Platform

1. **Clone the repository**
   ```bash
   git clone git@github.com:muracciolei/CometPlatformToolkit.git
   cd CometPlatformToolkit
   ```

2. **Start the development server**
   ```bash
   cd public
   python -m http.server 8000
   ```

3. **Open in browser**
   - Visit: `http://localhost:8000`
   - Access individual modules at: `http://localhost:8000/../modules/[module-name]/`

## 📋 Overview

CometPlatform is a **modular web development platform** specifically designed for **AI agent automation**, workflow orchestration, and collaborative development. The architecture is optimized for programmatic access by AI agents, with human-friendly interfaces as secondary functionality.

### Core Philosophy

- **Agent-First Design**: All modules optimized for programmatic access and automation by AI agents
- **Modularity**: Each component functions independently or as part of larger workflow pipelines
- **Extensibility**: Plugin architecture allows custom capabilities without core modifications
- **Security**: Comprehensive sandboxing and logging for safe operations

## 🏗️ Architecture

### Implemented Modules

| Module | Purpose | Status | Key Features |
|--------|---------|--------|--------------|
| **AI Supervisor** | Monitor and guide AI agent behavior | ✅ Complete | Policy enforcement, temporal awareness, auto-approval |
| **API Tester** | Interactive API testing and validation | ✅ Complete | Multi-method requests, domain whitelist, response inspection |
| **Code Editor** | In-browser code editing with syntax support | ✅ Complete | File management, syntax highlighting, sandboxed operations |
| **File Manager** | File system operations and project management | ✅ Complete | Tree navigation, CRUD operations, integration hooks |
| **Terminal** | Command-line interface (simulated) | ✅ Complete | Safe command simulation, history, activity logging |
| **Event Bus** | Unified messaging across modules | ✅ Complete | Pub/sub pattern, middlewares, event history |
| **Plugin Manager** | Dynamic plugin loading and lifecycle | ✅ Complete | Plugin registration, hooks system, lifecycle management |
| **Agent Memory** | Persistent context and knowledge management | ✅ Complete | Session management, memory storage, search capabilities |
| **Workflow Orchestrator** | Coordinate multi-step agent workflows | 🚧 Planned | Task pipelines, state persistence, error recovery |

## 🔒 Security Features

- **Comprehensive Sandboxing**: All file operations restricted to `comet-platform/` directory
- **Safe Terminal**: Simulated commands only, no real system operations
- **API Whitelist**: Only approved domains allowed for external requests
- **Complete Logging**: All activities logged via `logActivity()` for transparency
- **AI Supervision**: Real-time monitoring of all agent actions with configurable policies

## 🔧 Module Communication

### Inter-Module Protocol
```javascript
{
  "event": "module.action",
  "source": "api-tester",
  "target": "workflow-orchestrator", 
  "payload": { /* action-specific data */ },
  "timestamp": "2025-10-28T23:18:00Z",
  "correlation_id": "uuid-v4"
}
```

### Module Registration
```javascript
Platform.registerModule({
  name: 'api-tester',
  version: '1.2.0',
  capabilities: ['http.request', 'http.mock'],
  events: {
    listens: ['workflow.step', 'file.save'],
    emits: ['request.complete', 'error.network']
  }
});
```

## 📁 Project Structure

```
comet-platform/
├── roadmap.md                    # Project roadmap and development phases
├── public/
│   ├── index.html               # Main entry point
│   └── main.js                  # Report integration and export handling
└── modules/                     # Functional modules
    ├── README.md               # Architecture documentation
    ├── ai-supervisor/          # AI agent supervision and policy enforcement
    ├── api-tester/             # API testing with security controls
    ├── code-editor/            # Sandboxed code editing
    ├── event-bus/              # Inter-module communication
    ├── file-manager/           # Safe file system operations
    ├── plugin-manager/         # Dynamic plugin management
    ├── terminal/               # Simulated terminal environment
    ├── agent-memory/           # Agent context and memory management
    └── workflow-orchestrator/   # Multi-step workflow coordination
```

## 🎯 Use Cases

### For AI Agents
- **Automated Workflows**: Chain multiple operations across modules
- **Safe Exploration**: Sandboxed environment for learning and experimentation
- **Context Persistence**: Memory system for maintaining state across sessions
- **API Integration**: Controlled external service access

### For Developers
- **Rapid Prototyping**: Modular components for quick development
- **Agent Testing**: Safe environment for AI agent development
- **Workflow Design**: Visual and programmatic workflow creation
- **Plugin Development**: Extensible architecture for custom capabilities

## 🔄 Development Workflow

### Agent Integration
```javascript
// Record agent action for supervision
window.CometSupervisor.recordEvent('my-module', 'performAction', {
  action: 'data-processing',
  parameters: { input: 'sample data' }
});

// Store agent memory
agentMemory.store('learned-pattern', {
  pattern: 'api-response-structure',
  confidence: 0.95
});

// Execute API request safely
const result = await APITester.sendRequest(
  'https://api.example.com/data',
  'GET',
  '{"Authorization": "Bearer token"}',
  null
);
```

### Module Development
1. Create module directory in `/modules/`
2. Implement required interface (init, capabilities, events)
3. Register with event bus for communication
4. Add to platform registration system
5. Update documentation

## 📖 Documentation

- **[Architecture Guide](modules/README.md)**: Detailed module architecture and development guidelines
- **[Roadmap](roadmap.md)**: Development phases and planned features
- **[Module APIs](modules/)**: Individual module documentation and APIs

## 🚀 Deployment

### Local Development
```bash
cd public
python -m http.server 8000
```

### Production Deployment
- **Static Hosting**: Deploy `/public` directory to any static host
- **Docker**: Container support for isolated deployments
- **Cloud**: Serverless deployment with optional backend services

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Review the [architecture documentation](modules/README.md)
2. Check existing issues or create a new one
3. Fork the repository and create a feature branch
4. Implement changes with appropriate logging and safety measures
5. Submit a pull request with detailed description

### Development Guidelines
- **Security First**: All operations must be sandboxed and logged
- **Agent-Friendly**: Provide both UI and programmatic interfaces
- **Modular Design**: Maintain independence between modules
- **Comprehensive Logging**: Use `logActivity()` for all significant operations

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/muracciolei/CometPlatformToolkit/issues)
- **Discussions**: [Architecture questions and design decisions](https://github.com/muracciolei/CometPlatformToolkit/discussions)
- **Documentation**: [Comprehensive guides and API references](modules/README.md)

## 🏷️ Latest Release

**[📦 Download Latest Release](https://github.com/muracciolei/CometPlatformToolkit/releases/latest)**

---

**Built for agents, designed for humans, optimized for workflows.**

*CometPlatform Toolkit - Empowering AI agents with safe, modular, and extensible development environments.*