/// <reference types="@types/offscreencanvas" />

// @ts-ignore
import { sharedTexture, nativeImage } from "electron";
import { ipcRenderer, contextBridge } from "electron/renderer";
import { crashReporter } from "electron";

export function logWithTime(message: string, ...optionalParams: any[]) {
    const date = new Date();
    const timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;
    // console.log(`[${timestamp}] ${message}`, ...optionalParams);
}

contextBridge.exposeInMainWorld("textures", {
    onSharedTexture: (cb: (id: string, idx: number, imported: Electron.SharedTextureImported) => Promise<void>) => {
        console.log("[preload] registering shared texture receiver");
        sharedTexture.setSharedTextureReceiver(async (receivedSharedTextureData, ...args: any[]) => {
            const idx = typeof args[0] === "number" ? args[0] : -1;
            console.log("[preload] shared texture received", { idx });
            await cb("", idx, receivedSharedTextureData.importedSharedTexture);
        });
    },
}); 

setInterval(() => {
    (globalThis as any).gc?.();
}, 500)