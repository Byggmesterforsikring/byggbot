---
description: Provides general context about the project stack, migration goals, environment setup, and coding style. Apply this rule broadly across the source code.
patterns:
  - src/**  # Apply to all files within the src directory
---

# Project Context & Rules

## Technology Stack

- **UI Framework:** Primarily Shadcn UI built on React and Tailwind CSS.
- **Build/Environment:** React application running within Electron. Uses Webpack.
- **Styling:** Tailwind CSS is the primary styling method. Uses CSS variables defined in `@src/styles/tailwind.css`.
- **Language:** Mainly JavaScript (ES6+) and potentially TypeScript in some parts. Current focus is often on `.js` or `.jsx` files.

## Migration Goal

- The project is migrating **from** Material UI (MUI) **to** Shadcn UI.
- This migration is happening iteratively. Expect to see both MUI and Shadcn components coexisting temporarily.
- Be mindful of potential style conflicts between MUI's global styles and Tailwind/Shadcn during this transition.

## Environment Variables

- **Critical:** The project uses separate `.env` (development) and `.env.production` (production) files.
- **DO NOT** propose changes that merge, modify, or simplify the loading logic for these environment files (handled in `@webpack.config.js` and potentially `@src/electron/main.js`).
- Authentication logic (MSAL) might also differ between environments.

## Database

- **Type:** PostgreSQL
- **Hosting:** Azure
- **Usage:** Shared between development and production environments.

## General Coding Style

- Follow standard React best practices.
- Ensure code is clean, readable, and maintainable.
- Add necessary imports when adding new code or components.
- Use functional components and hooks where appropriate.
