# FIFA 26 Live CLI - NPM Publishing Guide

This guide explains how to package the `fifa-ts` CLI app, publish it to npm, and how end-users can seamlessly download and run it.

## 1. Prerequisites for Publishing

Before publishing, ensure your `package.json` is correctly configured for an npm CLI package.

Your `package.json` should have the following key properties:
```json
{
  "name": "fifa-26-live-cli",         // Choose a unique name for npm
  "version": "1.0.0",                 // Semantic versioning (update before each publish)
  "description": "A live terminal dashboard for the FIFA 2026 World Cup",
  "main": "dist/cli.js",
  "bin": {
    "fifa-26": "dist/cli.js"          // The command users will type in their terminal
  },
  "files": [
    "dist"                            // Ensures only the compiled output is published
  ],
  "keywords": ["fifa", "cli", "football", "world-cup"],
  "author": "Your Name",
  "license": "MIT"
}
```

## 2. Preparing the Package

1. **Build the source code:**
   Ensure your TypeScript code is compiled to JavaScript in the `dist` directory.
   ```bash
   npm run build
   ```

2. **Add Shebang to `cli.tsx` (If not already present):**
   The entry point (`source/cli.tsx`) must have a shebang at the very top so the OS knows to execute it with Node.js.
   ```typescript
   #!/usr/bin/env node
   ```

3. **Log into npm:**
   If you don't have an npm account, create one at [npmjs.com](https://www.npmjs.com/). Then, login via your terminal:
   ```bash
   npm login
   ```

4. **Test locally (Optional but recommended):**
   You can simulate installing your package globally on your own machine.
   ```bash
   npm link
   # Now type the bin command to see if it works
   fifa-26
   ```

## 3. Publishing to npm

Once you are logged in and the code is built, run the publish command:
```bash
npm publish
```

*Note: If the package name is taken, you might need to change the `"name"` in `package.json` (e.g. `@yourusername/fifa-26-live-cli`).*

---

## 4. How Users Will Install and Run It

Once published, using the CLI becomes extremely easy for anyone with Node.js installed.

### Option A: Run directly via `npx` (No installation required)
Users don't even need to install the package. They can run the CLI instantly using `npx`:
```bash
npx fifa-26-live-cli
```
*`npx` downloads the package temporarily, runs it, and cleans it up.*

### Option B: Install Globally
If users want to have the command available on their system permanently:
```bash
npm install -g fifa-26-live-cli
```
After installation, they can just type the command from anywhere in their terminal:
```bash
fifa-26
```

### Proxy Server Configuration (For Users)
Since the app relies on a backend proxy (or API), users can configure the CLI by setting an environment variable or editing the config before running:
```bash
export PROXY_BASE_URL=http://your-production-server.com/v1
fifa-26
```
*(If you want to bake the production proxy URL into the app, you can change the default `activeProxyUrl` in `api.ts` before compiling and publishing).*
