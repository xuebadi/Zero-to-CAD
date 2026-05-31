const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function getPythonPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return 'python3';
  }
  return path.join(process.resourcesPath, 'python', 'bin', 'python3');
}

function getServerScriptPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, 'python', 'server.py');
  }
  return path.join(process.resourcesPath, 'python', 'server.py');
}

function startPythonServer() {
  const pythonPath = getPythonPath();
  const serverScript = getServerScriptPath();

  console.log(`Starting Python server: ${pythonPath} ${serverScript}`);

  pythonProcess = spawn(pythonPath, [serverScript], {
    env: {
      ...process.env,
      PYTHONPATH: path.dirname(serverScript),
      PYTHONUNBUFFERED: '1',
      HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com',
    },
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python server exited with code ${code}`);
    pythonProcess = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: '学霸帝 Zero-to-CAD',
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 允许加载本地图片 file://
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startPythonServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
});

// IPC handlers
ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    title: '选择渲染视图图片',
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择输出目录',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('save-code', async (event, code, filename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || 'cad_model.py',
    filters: [{ name: 'Python', extensions: ['py'] }],
    title: '保存 CadQuery 代码',
  });
  if (result.canceled) return null;
  const fs = require('fs');
  fs.writeFileSync(result.filePath, code, 'utf-8');
  return result.filePath;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 读取本地图片文件并返回 base64
ipcMain.handle('read-image-base64', async (event, filePath) => {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
});
