## Shared Texture Pipeline (Producer -> Consumer)

This project uses Electron shared textures from an offscreen renderer and consumes them in the visible renderer via WebGPU (with WebGL fallback).

### Producer (main process)

- File: `src/main.ts`
- Offscreen sources are created with shared texture enabled (`offscreen.useSharedTexture = true`).
- The producer frame arrives in `osr.webContents.on("paint", ...)` as `event.texture`.
- That native texture is wrapped with `sharedTexture.importSharedTexture(...)`.
- The imported texture is transferred to the visible renderer with `sharedTexture.sendSharedTexture(...)`.

In short: Chromium offscreen rendering produces the texture; `main.ts` packages and sends it.

### Bridge (preload)

- File: `src/preload.ts`
- `sharedTexture.setSharedTextureReceiver(...)` receives payloads sent from main.
- `contextBridge.exposeInMainWorld("textures", { onSharedTexture(...) })` forwards the imported shared texture to renderer code.

### Consumer (renderer)

- Primary consumer file: `src/renderer-webgpu.ts`
- Entry point in page: `index.html` loads `dist/renderer-webgpu.js`
- Renderer callback receives `Electron.SharedTextureImported`.
- `imported.getVideoFrame()` converts the shared texture handle to a `VideoFrame`.
- `device.importExternalTexture({ source: frame })` converts it to `GPUExternalTexture`.
- Render loop samples that external texture and draws into a 4x4 grid.

Fallback path:

- `src/renderer-webgl.ts` receives the same shared texture event.
- It also calls `imported.getVideoFrame()`, then uploads via `gl.texImage2D(...)`, and draws with WebGL.

## Diagram: End-to-End Data Flow

```mermaid
flowchart LR
	A["Offscreen BrowserWindow<br/>offscreen.useSharedTexture=true"] -->|paint event| B["event.texture"]
	B --> C["sharedTexture.importSharedTexture()<br/>src/main.ts"]
	C --> D["sharedTexture.sendSharedTexture()<br/>to visible frame"]
	D --> E["preload: setSharedTextureReceiver()"]
	E --> F["window.textures.onSharedTexture()"]

	F --> G["WebGPU path<br/>renderer-webgpu.ts"]
	G --> H["imported.getVideoFrame()"]
	H --> I["device.importExternalTexture()"]
	I --> J["renderPass.draw() grid"]

	F --> K["WebGL fallback<br/>renderer-webgl.ts"]
	K --> L["imported.getVideoFrame()"]
	L --> M["gl.texImage2D()"]
	M --> N["gl.drawArrays() grid"]
```

## Diagram: Single Frame Lifecycle

```mermaid
sequenceDiagram
	participant OSR as Offscreen WebContents
	participant Main as Main Process
	participant Preload as Preload Bridge
	participant Renderer as Renderer (WebGPU/WebGL)

	OSR->>Main: paint(event.texture)
	Main->>Main: importSharedTexture(textureInfo)
	Main->>Renderer: sendSharedTexture(importedSharedTexture, idx)
	Renderer->>Preload: onSharedTexture callback registration
	Preload->>Renderer: importedSharedTexture delivery
	Renderer->>Renderer: imported.getVideoFrame()
	Renderer->>Renderer: importExternalTexture() OR texImage2D()
	Renderer->>Renderer: draw frame cell
	Renderer->>Main: release callbacks complete
```
