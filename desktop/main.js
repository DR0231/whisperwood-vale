const { app, BrowserWindow, protocol, ipcMain, Menu, net, session, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

if (!app.requestSingleInstanceLock()) app.exit(0);
else {
  app.setPath("userData", path.join(app.getPath("appData"), "Whisperwood Vale"));

  let win = null;
  let saved = false;
  let saving = false;
  const waiters = [];

  app.on("second-instance", () => {
    if (win && !win.isDestroyed()) {
      win.restore();
      win.focus();
    }
  });

  protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  }]);

  const devMode = process.argv.includes("--vale-dev");
  ipcMain.on("vale:dev", (e) => { e.returnValue = devMode; });
  ipcMain.on("vale:fullscreen", () => {
    if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
  });

  function requestSave(done) {
    if (saved) { done(); return; }
    waiters.push(done);
    if (saving) return;
    saving = true;
    const flush = () => {
      try { session.defaultSession.flushStorageData(); } catch (e) { /* storage optional */ }
    };
    const settle = () => {
      flush();
      saved = true;
      waiters.splice(0).forEach((fn) => fn());
    };
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
      settle();
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      settle();
    };
    const timer = setTimeout(finish, 1500);
    ipcMain.once("vale:save-done", () => {
      clearTimeout(timer);
      finish();
    });
    try { win.webContents.send("vale:save-request"); } catch (e) { finish(); }
  }

  function createWindow() {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      show: false,
      useContentSize: true,
      width: 1280,
      height: 720,
      minWidth: 1280,
      minHeight: 720,
      backgroundColor: "#0b140e",
      title: "Whisperwood Vale",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    let f11Down = false;
    win.webContents.on("before-input-event", (event, input) => {
      const f11 = input.key === "F11" || input.code === "F11";
      if (!f11) return;
      if (input.type === "keyDown") {
        if (input.isAutoRepeat) { event.preventDefault(); return; }
        f11Down = true;
        if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
        event.preventDefault();
      } else if (input.type === "keyUp") {
        if (!f11Down && win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
        f11Down = false;
        event.preventDefault();
      }
    });

    win.on("closed", () => { win = null; saved = true; });
    win.loadURL("app://vale/play.html");
    win.webContents.on("will-navigate", (e, url) => {
      let stay = false;
      try {
        const u = new URL(url);
        stay = u.protocol === "app:" && u.host === "vale";
      } catch (err) { stay = false; }
      if (!stay) e.preventDefault();
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    win.on("close", (e) => {
      if (saved) return;
      e.preventDefault();
      requestSave(() => { if (win && !win.isDestroyed()) win.close(); });
    });
    win.on("session-end", () => { requestSave(() => {}); });

    const area = screen.getPrimaryDisplay().workArea;
    const bounds = win.getBounds();
    if (bounds.width > area.width || bounds.height > area.height) win.setFullScreen(true);
    win.show();
  }

  app.on("before-quit", (e) => {
    if (saved) return;
    e.preventDefault();
    requestSave(() => app.quit());
  });

  app.on("window-all-closed", () => { app.quit(); });

  app.whenReady().then(() => {
    session.defaultSession.on("will-download", (e, item) => {
      item.setSaveDialogOptions({
        title: "Download save",
        defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
      });
    });
    const root = path.join(__dirname, "game");
    protocol.handle("app", (request) => {
      let url;
      try { url = new URL(request.url); } catch (e) {
        return new Response("not found", { status: 404 });
      }
      if (url.host !== "vale") return new Response("not found", { status: 404 });
      let pathname = decodeURIComponent(url.pathname || "/");
      if (pathname === "/" || pathname === "") pathname = "/play.html";
      const rel = pathname.replace(/^[/\\]+/, "");
      const file = path.resolve(root, rel);
      const outside = path.relative(root, file);
      if (outside.startsWith("..") || path.isAbsolute(outside)) {
        return new Response("forbidden", { status: 403 });
      }
      if (!fs.existsSync(file)) {
        console.warn("missing", rel);
        return new Response("not found", { status: 404 });
      }
      return net.fetch(pathToFileURL(file).href);
    });
    createWindow();
    setInterval(() => {
      try { session.defaultSession.flushStorageData(); } catch (e) { /* storage optional */ }
    }, 30000);
  });
}
