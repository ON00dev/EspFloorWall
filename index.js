const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

// Diretório para armazenar os arquivos JSON
const dataDir = path.join(app.getPath('userData'), 'data')
const productsFile = path.join(dataDir, 'products.json')
const linhasFile = path.join(dataDir, 'linhas.json')

// Garantir que o diretório de dados exista
function ensureDataDirExists() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log(`Diretório de dados criado: ${dataDir}`)
  }
}

// Salvar dados em arquivo JSON
function saveJsonToFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    console.error(`Erro ao salvar arquivo ${filePath}:`, error)
    return { success: false, error: error.message }
  }
}

// Carregar dados de arquivo JSON
function loadJsonFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: true, data: [] }
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return { success: true, data }
  } catch (error) {
    console.error(`Erro ao carregar arquivo ${filePath}:`, error)
    return { success: false, error: error.message, data: [] }
  }
}

const createWindow = () => {
  // Garantir que o diretório de dados exista
  ensureDataDirExists()
  
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    webPreferences: {
      // segurança básica
      nodeIntegration: false,         // NUNCA habilitar para conteúdo remoto
      contextIsolation: true,        // isola contexto do preload do site
      sandbox: true,                 // força sandbox do renderer quando possível
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true
    }
  })

  win.loadFile('www/app.html')
  //win.webContents.openDevTools() // Abrir DevTools para depuração

  // quando o conteúdo estiver pronto, maximiza e mostra
  win.once('ready-to-show', () => {
    win.maximize()
    win.show()
  })
}

// Configurar manipuladores de IPC
function setupIpcHandlers() {
  // Salvar produtos
  ipcMain.handle('save-products', async (event, productsData) => {
    return saveJsonToFile(productsFile, productsData)
  })

  // Carregar produtos
  ipcMain.handle('load-products', async () => {
    return loadJsonFromFile(productsFile)
  })

  // Salvar linhas
  ipcMain.handle('save-linhas', async (event, linhasData) => {
    return saveJsonToFile(linhasFile, linhasData)
  })

  // Carregar linhas
  ipcMain.handle('load-linhas', async () => {
    return loadJsonFromFile(linhasFile)
  })
  
  // Obter caminho dos arquivos de dados
  ipcMain.handle('get-data-path', async () => {
    return dataDir
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})