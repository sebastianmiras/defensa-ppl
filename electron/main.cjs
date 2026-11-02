const { app, BrowserWindow, Menu, protocol, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const WEB_ROOT = path.resolve(__dirname, "..");
const APP_URL = "atlas://app/index.html";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".pdf", "application/pdf"]
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "atlas",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function localPath(requestUrl) {
  const url = new URL(requestUrl);
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const resolved = path.resolve(WEB_ROOT, relative);
  const insideRoot = resolved === WEB_ROOT || resolved.startsWith(`${WEB_ROOT}${path.sep}`);
  return insideRoot ? resolved : null;
}

async function serveLocalFile(request) {
  const filePath = localPath(request.url);
  if (!filePath) return new Response("Acceso denegado", { status: 403 });

  try {
    const body = await fs.readFile(filePath);
    const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error.code === "ENOENT") return new Response("Archivo no encontrado", { status: 404 });
    return new Response("No se pudo leer el archivo", { status: 500 });
  }
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#efeee9",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("atlas://")) {
      event.preventDefault();
      openExternal(url);
    }
  });
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });

  window.loadURL(APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId("es.sebastianmiras.programadocente");
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    await protocol.handle("atlas", serveLocalFile);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => app.quit());
}
