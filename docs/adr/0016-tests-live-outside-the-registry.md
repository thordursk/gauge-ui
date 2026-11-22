# Tests live outside the registry

Unit tests run on Vitest with jsdom and Testing Library (`npm test`, config in `vitest.config.mts`). They live in `tests/`, mirroring the source tree (`tests/gauge/` for `components/gauge/`), not next to the files they cover. `components/gauge/` is copied into users' projects as a registry item (ADR 0003), so it holds only what ships. `registry.json` lists its files one by one, so a colocated test wouldn't ship either way. But the folder is also what people read when they install it, and test files and test-only imports don't belong there.

- **No `@vitejs/plugin-react`.** Its current release needs Vite 8 peers that clash with shadcn's Babel 7. Vitest's own transform compiles TSX using `jsx: "react-jsx"` from `tsconfig.json`, which is all the tests need. Path aliases come from `resolve.tsconfigPaths`.
- **Changes to the gauge primitives come with tests.** The primitives are a public API that other projects copy, so a PR that changes their behaviour or props adds tests for it in `tests/gauge/`, and notes any API change in its description.
