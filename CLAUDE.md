# CLAUDE.md - Byggbot Project Guide

## Build & Development Commands
- Development: `npm run dev` (webpack + electron)
- Build all: `npm run build` (automatisk patch-versjon økning)
- Platform builds: `npm run build-mac`, `npm run build-win`
- Version bumping: `npm run version:patch`, `npm run version:minor`, `npm run version:major`, `npm run version:auto`
- Test DB connection: `npm run test-db`
- Test Azure connection: `npm run test-azure`
- Find circular dependencies: `npm run find-circular`
- Clean build: `npm run clean`
- Webpack build only: `npm run webpack-build`
- Verify Mac signing: `npm run verify-mac-signing`

## Code Style Guidelines
- **Components**: React functional components with hooks
- **State Management**: React hooks (useState, useEffect, useContext)
- **Formatting**: 2-space indentation, line length < 100 chars
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Imports**: React/libraries first, then local components, grouped by type
- **Language**: Norwegian for user-facing strings
- **Error handling**: Try/catch for async, electron-log for Node context
- **Architecture**: Electron application with React frontend, PostgreSQL backend
- **IPC Pattern**: Main process handlers in `/src/electron/ipc/`, services in `/src/electron/services/`
- **Security**: Follow Electron security best practices with preload scripts and contextIsolation
- **File Organization**: Components in feature folders, shared components in Layout/