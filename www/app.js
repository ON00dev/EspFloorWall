// Verificar se o arquivo está sendo carregado
console.log('app.js carregado com sucesso!')

// Global variables
let products = []
let linhas = []
let calculatorItems = []
let editingProductId = null
let editingLinhaId = null

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log('DOMContentLoaded disparado')
  initializeApp()
  setupEventListeners()
  loadData()
})

function initializeApp() {
  // Set up tab navigation
  const navTabs = document.querySelectorAll(".nav-tab")
  const tabContents = document.querySelectorAll(".tab-content")

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab

      // Update active tab
      navTabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")

      // Update active content
      tabContents.forEach((content) => {
        content.classList.remove("active")
        if (content.id === `${targetTab}-tab`) {
          content.classList.add("active")
        }
      })

      // Refresh content based on active tab
      if (targetTab === "produtos") {
        renderProducts()
      } else if (targetTab === "linhas") {
        renderLinhas()
      } else if (targetTab === "calculadora") {
        updateCalculatorProducts()
      }
    })
  })
  
  // Mostrar o caminho dos arquivos de dados
  //showDataFilePath()
}

function setupEventListeners() {
  // Product modal events
  document.getElementById("add-product-btn").addEventListener("click", openProductModal)
  document.getElementById("close-modal").addEventListener("click", closeProductModal)
  document.getElementById("cancel-product").addEventListener("click", closeProductModal)
  document.getElementById("product-form").addEventListener("submit", saveProduct)

  // Linha modal events
  document.getElementById("add-linha-btn").addEventListener("click", openLinhaModal)
  document.getElementById("close-linha-modal").addEventListener("click", closeLinhaModal)
  document.getElementById("cancel-linha").addEventListener("click", closeLinhaModal)
  document.getElementById("linha-form").addEventListener("submit", saveLinha)

  // Search and filter events
  document.getElementById("search-products").addEventListener("input", filterProducts)
  document.getElementById("filter-linha").addEventListener("change", filterProducts)

  // Calculator events
  document.getElementById("add-to-calc").addEventListener("click", addToCalculator)
  document.getElementById("calc-product").addEventListener("change", updateCalculatorUnit)

  // Price calculation events
  document.getElementById("product-cost").addEventListener("input", calculateSalePrice)
  document.getElementById("product-ipi").addEventListener("input", calculateSalePrice)
  document.getElementById("product-profit").addEventListener("input", calculateSalePrice)
  
  // Detectar edição manual do preço de venda
  document.getElementById("product-sale-price").addEventListener("input", function() {
    this.dataset.userEdited = "true"
  })

  // Image upload event
  document.getElementById("product-image").addEventListener("change", handleImageUpload)

  // Close modal when clicking outside
  document.getElementById("product-modal").addEventListener("click", (e) => {
    if (e.target.id === "product-modal") {
      closeProductModal()
    }
  })

  document.getElementById("linha-modal").addEventListener("click", (e) => {
    if (e.target.id === "linha-modal") {
      closeLinhaModal()
    }
  })
}

// Importar módulos do Electron
const { ipcRenderer } = require('electron')

// Função para mostrar o caminho dos arquivos de dados
async function showDataFilePath() {
  try {
    const dataPath = await ipcRenderer.invoke('get-data-path')
    console.log('Caminho dos arquivos de dados:', dataPath)
    
    // Adicionar informação na interface
    const infoElement = document.createElement('div')
    infoElement.className = 'data-path-info'
    infoElement.innerHTML = `<small>Dados salvos em: ${dataPath}</small>`
    
    const footer = document.querySelector('footer') || document.body
    footer.appendChild(infoElement)
  } catch (error) {
    console.error('Erro ao obter caminho dos dados:', error)
  }
}

// Data persistence functions
async function saveData() {
  try {
    // Salvar produtos em arquivo JSON
    const productResult = await ipcRenderer.invoke('save-products', products)
    if (!productResult.success) {
      console.error('Erro ao salvar produtos:', productResult.error)
    }
    
    // Salvar linhas em arquivo JSON
    const linhasResult = await ipcRenderer.invoke('save-linhas', linhas)
    if (!linhasResult.success) {
      console.error('Erro ao salvar linhas:', linhasResult.error)
    }
    
    console.log('Dados salvos com sucesso em arquivos JSON')
  } catch (error) {
    console.error('Erro ao salvar dados:', error)
    
    // Fallback para localStorage em caso de erro
    localStorage.setItem("espacofloor_products", JSON.stringify(products))
    localStorage.setItem("espacofloor_linhas", JSON.stringify(linhas))
    console.log('Dados salvos no localStorage como fallback')
  }
}

async function loadData() {
  try {
    // Carregar produtos do arquivo JSON
    const productResult = await ipcRenderer.invoke('load-products')
    if (productResult.success && productResult.data) {
      products = productResult.data
      console.log('Produtos carregados do arquivo JSON')
    } else if (productResult.error) {
      console.error('Erro ao carregar produtos:', productResult.error)
    }
    
    // Carregar linhas do arquivo JSON
    const linhasResult = await ipcRenderer.invoke('load-linhas')
    if (linhasResult.success && linhasResult.data) {
      linhas = linhasResult.data
      console.log('Linhas carregadas do arquivo JSON')
    } else if (linhasResult.error) {
      console.error('Erro ao carregar linhas:', linhasResult.error)
    }
    
    // Fallback para localStorage se não houver dados nos arquivos JSON
    if (products.length === 0) {
      const savedProducts = localStorage.getItem("espacofloor_products")
      if (savedProducts) {
        products = JSON.parse(savedProducts)
        console.log('Produtos carregados do localStorage (fallback)')
      }
    }
    
    if (linhas.length === 0) {
      const savedLinhas = localStorage.getItem("espacofloor_linhas")
      if (savedLinhas) {
        linhas = JSON.parse(savedLinhas)
        console.log('Linhas carregadas do localStorage (fallback)')
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
    
    // Fallback completo para localStorage
    const savedProducts = localStorage.getItem("espacofloor_products")
    const savedLinhas = localStorage.getItem("espacofloor_linhas")

    if (savedProducts) {
      products = JSON.parse(savedProducts)
    }

    if (savedLinhas) {
      linhas = JSON.parse(savedLinhas)
    }
    
    console.log('Dados carregados do localStorage devido a erro')
  }
  
  renderProducts()
  renderLinhas()
  updateLinhaSelects()
  updateCalculatorProducts()
}

// Product functions
function openProductModal(productIdOrEvent = null) {
  // Se for um evento, não usar o ID
  const productId = typeof productIdOrEvent === 'object' ? null : productIdOrEvent
  
  editingProductId = productId
  const modal = document.getElementById("product-modal")
  const form = document.getElementById("product-form")
  const title = document.getElementById("modal-title")

  if (productId) {
    const product = products.find((p) => p.id === productId)
    if (product) {
      title.textContent = "Editar Produto"
      fillProductForm(product)
    } else {
      console.error(`Produto com ID ${productId} não encontrado`)
      title.textContent = "Adicionar Produto"
      form.reset()
      resetImagePreview()
      calculateSalePrice()
    }
  } else {
    title.textContent = "Adicionar Produto"
    form.reset()
    resetImagePreview()
    
    // Resetar o flag de edição manual para um novo produto
    document.getElementById("product-sale-price").dataset.userEdited = "false"
    
    calculateSalePrice()
  }

  modal.classList.add("active")
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("active")
  editingProductId = null
}

function fillProductForm(product) {
  document.getElementById("product-name").value = product.name
  document.getElementById("product-unit").value = product.unit
  document.getElementById("product-linha").value = product.linha || ""
  document.getElementById("product-info").value = product.info || ""
  document.getElementById("product-cost").value = product.cost
  document.getElementById("product-ipi").value = product.ipi
  document.getElementById("product-profit").value = product.profit
  
  // Resetar o flag de edição manual
  const salePriceField = document.getElementById("product-sale-price")
  salePriceField.dataset.userEdited = "false"
  
  // Usar o preço de venda salvo ou calcular um novo
  salePriceField.value = product.salePrice || calculateSalePriceValue(product.cost, product.ipi, product.profit).toFixed(2)

  if (product.image) {
    showImagePreview(product.image)
  } else {
    resetImagePreview()
  }
}

function saveProduct(e) {
  e.preventDefault()
  console.log('Salvando produto...')

  const formData = {
    name: document.getElementById("product-name").value,
    unit: document.getElementById("product-unit").value,
    linha: document.getElementById("product-linha").value,
    info: document.getElementById("product-info").value,
    cost: Number.parseFloat(document.getElementById("product-cost").value) || 0,
    ipi: Number.parseFloat(document.getElementById("product-ipi").value) || 0,
    profit: Number.parseFloat(document.getElementById("product-profit").value) || 0,
    image: document.getElementById("image-preview").querySelector("img")?.src || null,
  }

  // Validar campos obrigatórios
  if (!formData.name || !formData.unit) {
    alert('Nome e unidade são campos obrigatórios!');
    return;
  }

  // Usar o preço de venda inserido pelo usuário ou calcular se não for fornecido
  const userSalePrice = Number.parseFloat(document.getElementById("product-sale-price").value);
  if (userSalePrice && userSalePrice > 0) {
    formData.salePrice = userSalePrice;
  } else {
    formData.salePrice = calculateSalePriceValue(formData.cost, formData.ipi, formData.profit);
  }
  console.log('Dados do formulário:', formData)

  if (editingProductId) {
    console.log('Editando produto existente:', editingProductId)
    const index = products.findIndex((p) => p.id === editingProductId)
    if (index !== -1) {
      products[index] = { ...products[index], ...formData }
    } else {
      console.error('Produto não encontrado para edição')
      return
    }
  } else {
    console.log('Criando novo produto')
    const newProduct = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
    }
    products.push(newProduct)
    console.log('Novo produto adicionado:', newProduct)
  }

  saveData()
  renderProducts()
  updateCalculatorProducts()
  closeProductModal()
}

function deleteProduct(productId) {
  if (confirm("Tem certeza que deseja excluir este produto?")) {
    products = products.filter((p) => p.id !== productId)
    saveData()
    renderProducts()
    updateCalculatorProducts()
  }
}

function calculateSalePrice() {
  const cost = Number.parseFloat(document.getElementById("product-cost").value) || 0
  const ipi = Number.parseFloat(document.getElementById("product-ipi").value) || 0
  const profit = Number.parseFloat(document.getElementById("product-profit").value) || 0
  
  // Verificar se o usuário já editou manualmente o preço de venda
  const salePriceField = document.getElementById("product-sale-price")
  const userEditedPrice = salePriceField.dataset.userEdited === "true"
  
  // Se o usuário não editou manualmente, calcular e preencher automaticamente
  if (!userEditedPrice) {
    const salePrice = calculateSalePriceValue(cost, ipi, profit)
    salePriceField.value = salePrice.toFixed(2)
  }
}

function calculateSalePriceValue(cost, ipi, profit) {
  const totalCost = cost + ipi
  return totalCost * (1 + profit / 100)
}

function renderProducts() {
  const grid = document.getElementById("products-grid")
  const searchTerm = document.getElementById("search-products").value.toLowerCase()
  const selectedLinha = document.getElementById("filter-linha").value

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      (product.info && product.info.toLowerCase().includes(searchTerm))
    const matchesLinha = !selectedLinha || product.linha === selectedLinha
    return matchesSearch && matchesLinha
  })

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-box-open"></i>
                <h3>Nenhum produto encontrado</h3>
                <p>Adicione produtos ao seu catálogo para começar</p>
            </div>
        `
    return
  }

  grid.innerHTML = filteredProducts
    .map(
      (product) => `
        <div class="product-card">
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<i class="fas fa-image"></i>'}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p><strong>Unidade:</strong> ${product.unit}</p>
                ${product.linha ? `<p><strong>Linha:</strong> ${product.linha}</p>` : ""}
                ${product.info ? `<p><strong>Info:</strong> ${product.info}</p>` : ""}
            </div>
            <div class="product-price">
                <div class="cost">
                    Custo: ${formatCurrency(product.cost + product.ipi)}
                </div>
                <div class="sale">
                    ${formatCurrency(product.salePrice)}
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-secondary" onclick="openProductModal('${product.id}')">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                    Excluir
                </button>
            </div>
        </div>
    `,
    )
    .join("")
}

function filterProducts() {
  renderProducts()
}

// Linha functions
function openLinhaModal(linhaIdOrEvent = null) {
  // Se for um evento, não usar o ID
  const linhaId = typeof linhaIdOrEvent === 'object' ? null : linhaIdOrEvent
  
  editingLinhaId = linhaId
  const modal = document.getElementById("linha-modal")
  const form = document.getElementById("linha-form")

  if (linhaId) {
    const linha = linhas.find((l) => l.id === linhaId)
    if (linha) {
      document.getElementById("linha-name").value = linha.name
      document.getElementById("linha-description").value = linha.description || ""
    } else {
      console.error(`Linha com ID ${linhaId} não encontrada`)
      form.reset()
    }
  } else {
    form.reset()
  }

  modal.classList.add("active")
}

function closeLinhaModal() {
  document.getElementById("linha-modal").classList.remove("active")
  editingLinhaId = null
}

function saveLinha(e) {
  e.preventDefault()
  console.log('Salvando linha...')

  const formData = {
    name: document.getElementById("linha-name").value,
    description: document.getElementById("linha-description").value,
  }

  // Validar campos obrigatórios
  if (!formData.name) {
    alert('Nome da linha é obrigatório!');
    return;
  }

  console.log('Dados do formulário da linha:', formData)

  if (editingLinhaId) {
    console.log('Editando linha existente:', editingLinhaId)
    const index = linhas.findIndex((l) => l.id === editingLinhaId)
    if (index !== -1) {
      linhas[index] = { ...linhas[index], ...formData }
    } else {
      console.error('Linha não encontrada para edição')
      return
    }
  } else {
    console.log('Criando nova linha')
    const newLinha = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
    }
    linhas.push(newLinha)
    console.log('Nova linha adicionada:', newLinha)
  }

  saveData()
  renderLinhas()
  updateLinhaSelects()
  closeLinhaModal()
}

function deleteLinha(linhaId) {
  if (confirm("Tem certeza que deseja excluir esta linha? Os produtos desta linha não serão excluídos.")) {
    linhas = linhas.filter((l) => l.id !== linhaId)
    saveData()
    renderLinhas()
    updateLinhaSelects()
  }
}

function renderLinhas() {
  const grid = document.getElementById("linhas-grid")

  if (linhas.length === 0) {
    grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-layer-group"></i>
                <h3>Nenhuma linha cadastrada</h3>
                <p>Crie linhas de produtos para organizar seu catálogo</p>
            </div>
        `
    return
  }

  grid.innerHTML = linhas
    .map((linha) => {
      const productsInLinha = products.filter((p) => p.linha === linha.name).length

      return `
            <div class="linha-card">
                <h3>${linha.name}</h3>
                ${linha.description ? `<p>${linha.description}</p>` : ""}
                <div class="linha-products">
                    <i class="fas fa-box"></i>
                    ${productsInLinha} produto${productsInLinha !== 1 ? "s" : ""}
                </div>
                <div class="product-actions">
                    <button class="btn btn-secondary" onclick="openLinhaModal('${linha.id}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteLinha('${linha.id}')">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `
    })
    .join("")
}

function updateLinhaSelects() {
  const selects = [document.getElementById("product-linha"), document.getElementById("filter-linha")]

  selects.forEach((select) => {
    const currentValue = select.value
    const isFilter = select.id === "filter-linha"

    select.innerHTML = isFilter
      ? '<option value="">Todas as linhas</option>'
      : '<option value="">Selecione uma linha</option>'

    linhas.forEach((linha) => {
      const option = document.createElement("option")
      option.value = linha.name
      option.textContent = linha.name
      select.appendChild(option)
    })

    select.value = currentValue
  })
}

// Calculator functions
function updateCalculatorProducts() {
  const select = document.getElementById("calc-product")
  const currentValue = select.value

  select.innerHTML = '<option value="">Selecione um produto</option>'

  products.forEach((product) => {
    const option = document.createElement("option")
    option.value = product.id
    option.textContent = `${product.name} - ${formatCurrency(product.salePrice)}/${product.unit}`
    select.appendChild(option)
  })

  select.value = currentValue
}

function updateCalculatorUnit() {
  const select = document.getElementById("calc-product")
  const unitSpan = document.getElementById("calc-unit")

  if (select.value) {
    const product = products.find((p) => p.id === select.value)
    unitSpan.textContent = product.unit
  } else {
    unitSpan.textContent = ""
  }
}

function addToCalculator() {
  const productId = document.getElementById("calc-product").value
  const quantity = Number.parseFloat(document.getElementById("calc-quantity").value)

  if (!productId || !quantity || quantity <= 0) {
    alert("Selecione um produto e informe uma quantidade válida")
    return
  }

  const product = products.find((p) => p.id === productId)
  const total = product.salePrice * quantity

  const item = {
    id: Date.now().toString(),
    productId,
    productName: product.name,
    unit: product.unit,
    unitPrice: product.salePrice,
    quantity,
    total,
  }

  calculatorItems.push(item)
  renderCalculatorItems()
  updateCalculatorTotal()

  // Reset form
  document.getElementById("calc-quantity").value = ""
}

function removeFromCalculator(itemId) {
  calculatorItems = calculatorItems.filter((item) => item.id !== itemId)
  renderCalculatorItems()
  updateCalculatorTotal()
}

function renderCalculatorItems() {
  const container = document.getElementById("calc-items")

  if (calculatorItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #718096;">Nenhum item adicionado</p>'
    return
  }

  container.innerHTML = calculatorItems
    .map(
      (item) => `
        <div class="calc-item">
            <div>
                <strong>${item.productName}</strong><br>
                <small>${item.quantity} ${item.unit} × ${formatCurrency(item.unitPrice)}</small>
            </div>
            <div style="text-align: right;">
                <strong>${formatCurrency(item.total)}</strong><br>
                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="removeFromCalculator('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `,
    )
    .join("")
}

function updateCalculatorTotal() {
  const total = calculatorItems.reduce((sum, item) => sum + item.total, 0)
  document.getElementById("calc-total-value").textContent = formatCurrency(total).replace("R$ ", "")
}

// Image handling
function handleImageUpload(e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      showImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }
}

function showImagePreview(src) {
  const preview = document.getElementById("image-preview")
  preview.innerHTML = `<img src="${src}" alt="Preview">`
}

function resetImagePreview() {
  const preview = document.getElementById("image-preview")
  preview.innerHTML = `
        <i class="fas fa-image"></i>
        <span>Clique para selecionar uma imagem</span>
    `
}

// Utility functions
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Make functions globally available
window.openProductModal = openProductModal
window.deleteProduct = deleteProduct
window.openLinhaModal = openLinhaModal
window.deleteLinha = deleteLinha
window.removeFromCalculator = removeFromCalculator
