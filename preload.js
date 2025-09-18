// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveProducts: (data) => ipcRenderer.invoke('save-products', data),
  loadProducts: () => ipcRenderer.invoke('load-products'),
  saveLinhas: (data) => ipcRenderer.invoke('save-linhas', data),
  loadLinhas: () => ipcRenderer.invoke('load-linhas'),
  getDataPath: () => ipcRenderer.invoke('get-data-path')
})
