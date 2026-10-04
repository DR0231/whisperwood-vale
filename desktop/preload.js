const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("valeDesktop", {
  devMode: ipcRenderer.sendSync("vale:dev"),
  onSaveRequest(fn) {
    ipcRenderer.on("vale:save-request", () => {
      try { fn(); } catch (e) {}
      ipcRenderer.send("vale:save-done");
    });
  },
});
