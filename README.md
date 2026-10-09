# Myport

A recruiter-first portfolio served by a small Rust application. `/` and `/work` are server-rendered with Axum and Askama; GitHub repository metadata refreshes in the background and never blocks a page request. `/play` is optional: its Rust/WebAssembly scene is loaded only after a visitor asks to enter.

## Build and run

Requirements: Rustup with a stable Rust toolchain, the `wasm32-unknown-unknown` target, and `wasm-bindgen-cli` **0.2.129**. On Windows, use a functioning MSVC or GNU native linker for the Rust server.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build.ps1
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
```

The server listens on `127.0.0.1:3100` by default. Set `MYPORT_BIND` to change the address or `MYPORT_ASSETS` to serve assets from another directory. The build checks required route/playground assets before the server starts.

Build objects default to `%LOCALAPPDATA%\myport-rust\build` to keep the Windows GNU linker away from this Thai-named OneDrive path. If `%LOCALAPPDATA%` itself contains non-ASCII characters, set `CARGO_TARGET_DIR` to an ASCII-only path before running both scripts; relative values resolve from the project root.

The small `public/play/bootstrap.js` file is browser glue for the user-triggered WASM import and recovery message; scene rendering, movement, chapter state and persistence are Rust. Session compatibility uses `ohaki-garden-session-v2`, `ohaki-garden-stories-v1`, and `ohaki-garden-preferences-v1`.

Static filenames are stable, so bump their version query value in the route templates and playground bootstrap when shipping changed CSS, bootstrap, or WebAssembly assets.

## Project layout

- `crates/server`: Axum routes, Askama templates, security headers, static assets and stale-tolerant public GitHub snapshot.
- `crates/play`: Rust game model and browser renderer, compiled to WebAssembly.
- `public`: self-hosted CSS, fonts, imagery and generated WASM bindings.
- `legacy-next`: preserved Next.js source and configuration from before the Rust runtime migration; it is not part of the current build or server.

The Myport case study links to the current Rust source and labels the pinned Next.js commit as historical evidence. A local build does not imply measured production performance.
