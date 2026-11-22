# Pin the React version for eslint-plugin-react

`eslint.config.mjs` sets `settings.react.version` explicitly, because eslint-plugin-react's `"detect"` mode calls `context.getFilename()`, which ESLint 10 removed. Bump the pin along with React, and drop it once eslint-plugin-react supports ESLint 10's API.
