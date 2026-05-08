This is a pnpm monorepo with two deployable services. Here's what you need for Render:

🖥️ API Server (artifacts/api-server)
CommandBuildpnpm install && pnpm --filter @workspace/api-server run buildStartnode --enable-source-maps artifacts/api-server/dist/index.mjs
