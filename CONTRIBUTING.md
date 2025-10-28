# Contributing to CometPlatform Toolkit

Thank you for your interest in contributing to CometPlatform Toolkit! This document provides guidelines and information for contributors.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Check existing issues before creating a new one
- Provide detailed information including steps to reproduce bugs
- Include system information and relevant logs when applicable

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone git@github.com:your-username/CometPlatformToolkit.git
   cd CometPlatformToolkit
   ```

2. **Development Server**
   ```bash
   cd public
   python -m http.server 8000
   ```

3. **Testing**
   - Test all modules individually
   - Verify inter-module communication
   - Check logging and supervision functionality

### Development Guidelines

#### Security First
- **All operations must be sandboxed and logged**
- Use `logActivity()` for all significant operations
- Ensure no real system commands are executed
- Validate and sanitize all inputs

#### Agent-Friendly Design
- Provide both UI and programmatic interfaces
- Return structured data (JSON) for machine parsing
- Include operation status and error details
- Support batch operations where applicable

#### Modular Architecture
- Maintain independence between modules
- Use the event bus for inter-module communication
- Follow the established module structure
- Register capabilities and events properly

#### Documentation
- Update README.md for significant changes
- Document all public APIs and interfaces
- Include code examples and usage patterns
- Maintain architecture documentation

### Module Development

#### Structure
```
module-name/
├── module-name.html    # UI interface
├── module-name.js      # Core logic
├── module-name.css     # Styling (optional)
├── README.md           # Module documentation
├── tests/              # Unit and integration tests
└── manifest.json       # Module metadata
```

#### Module Lifecycle
1. **Initialize**: Module loads and registers with platform
2. **Ready**: Subscribes to relevant events
3. **Active**: Processes requests and emits events
4. **Cleanup**: Unsubscribes and releases resources

#### Registration Example
```javascript
Platform.registerModule({
  name: 'example-module',
  version: '1.0.0',
  capabilities: ['data.process', 'file.transform'],
  events: {
    listens: ['workflow.step', 'data.input'],
    emits: ['process.complete', 'error.handling']
  }
});
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards and guidelines
   - Add appropriate logging and error handling
   - Update documentation as needed
   - Test thoroughly

3. **Commit Guidelines**
   ```bash
   git commit -m "feat: add new module functionality"
   git commit -m "fix: resolve event bus communication issue"
   git commit -m "docs: update API documentation"
   ```

4. **Submit Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Include testing information
   - Request appropriate reviewers

### Testing

#### Manual Testing
- Test all affected modules individually
- Verify inter-module communication works
- Check logging and supervision output
- Test with simulated agent interactions

#### Integration Testing
- Ensure modules work together properly
- Verify event bus message routing
- Test error handling and recovery
- Validate security constraints

### Review Process

#### Code Review Checklist
- [ ] Security: All operations properly sandboxed
- [ ] Logging: Activities properly logged with `logActivity()`
- [ ] Architecture: Follows modular design principles
- [ ] Documentation: APIs and changes documented
- [ ] Testing: Adequate test coverage
- [ ] Performance: No significant performance degradation

#### Approval Requirements
- One approved review from maintainer
- All CI checks passing
- Documentation updated
- No unresolved conversations

### Release Process

#### Version Numbering
- Follow [Semantic Versioning](https://semver.org/)
- Major: Breaking changes or significant new features
- Minor: New features, backward compatible
- Patch: Bug fixes and small improvements

#### Release Checklist
- [ ] Update CHANGELOG.md
- [ ] Update version numbers
- [ ] Test all modules thoroughly
- [ ] Update documentation
- [ ] Create release notes
- [ ] Tag release in git

### Getting Help

- **Documentation**: Check [README.md](README.md) and [modules/README.md](modules/README.md)
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Architecture**: Review module documentation for design patterns

### Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributor graphs and statistics

Thank you for contributing to CometPlatform Toolkit! Your efforts help make AI agent development safer and more accessible.