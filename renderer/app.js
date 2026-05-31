/**
 * 学霸帝 Zero-to-CAD — 前端逻辑
 */

const SERVER_URL = 'http://127.0.0.1:18765';

// 状态
const state = {
  images: new Array(8).fill(null),   // base64 encoded images
  imagePaths: new Array(8).fill(null),
  generatedCode: '',
  isGenerating: false,
  serverStatus: 'disconnected',
  loadingTimerInterval: null,
  loadingSeconds: 0,
};

// DOM 元素
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const elements = {};

function initElements() {
  elements.statusDot = $('#statusDot');
  elements.statusText = $('#statusText');
  elements.viewsGrid = $('#viewsGrid');
  elements.btnSelectImages = $('#btnSelectImages');
  elements.btnGenerate = $('#btnGenerate');
  elements.promptInput = $('#promptInput');
  elements.codePlaceholder = $('#codePlaceholder');
  elements.codeBlock = $('#codeBlock');
  elements.codeContent = $('#codeContent');
  elements.loadingOverlay = $('#loadingOverlay');
  elements.loadingTimerEl = $('#loadingTimer');
  elements.btnCopy = $('#btnCopy');
  elements.btnSave = $('#btnSave');
  elements.btnHelp = $('#btnHelp');
  elements.helpModal = $('#helpModal');
  elements.btnCloseHelp = $('#btnCloseHelp');
  elements.footerDevice = $('#footerDevice');
  elements.footerImages = $('#footerImages');
}

// ——— 初始化 ———
async function init() {
  initElements();
  bindEvents();
  checkServerStatus();
  setInterval(checkServerStatus, 5000);
}

function bindEvents() {
  elements.btnSelectImages.addEventListener('click', handleSelectImages);
  elements.btnGenerate.addEventListener('click', handleGenerate);
  elements.btnCopy.addEventListener('click', handleCopy);
  elements.btnSave.addEventListener('click', handleSave);
  elements.btnHelp.addEventListener('click', () => {
    elements.helpModal.style.display = '';
  });
  elements.btnCloseHelp.addEventListener('click', () => {
    elements.helpModal.style.display = 'none';
  });
  elements.helpModal.addEventListener('click', (e) => {
    if (e.target === elements.helpModal) {
      elements.helpModal.style.display = 'none';
    }
  });

  // 视图槽点击
  const slots = $$('.view-slot');
  slots.forEach((slot, idx) => {
    slot.addEventListener('click', (e) => {
      // 如果点击的是删除按钮，不触发槽位点击
      if (e.target.closest('.remove-btn')) return;
      handleSlotClick(idx);
    });
    // 拖拽
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        loadImageFileToSlot(files[0], idx);
      }
    });
  });
}

// ——— 服务器状态 ———
async function checkServerStatus() {
  try {
    const resp = await fetch(`${SERVER_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    if (data.loaded) {
      setServerStatus('connected', '模型就绪');
      elements.footerDevice.textContent = data.device === 'cpu' ? 'CPU 模式' : data.device.toUpperCase();
    } else {
      setServerStatus('loading', '模型加载中...');
    }
  } catch (e) {
    setServerStatus('error', '服务器未连接');
  }
}

function setServerStatus(status, text) {
  state.serverStatus = status;
  elements.statusDot.className = `status-dot ${status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'loading'}`;
  elements.statusText.textContent = text;
  updateGenerateButton();
}

// ——— 图片选择 ———
async function handleSelectImages() {
  const paths = await window.electronAPI.selectImages();
  if (!paths || paths.length === 0) return;

  let slotIdx = 0;
  for (const filePath of paths) {
    // 找到第一个空槽
    while (slotIdx < 8 && state.images[slotIdx] !== null) {
      slotIdx++;
    }
    if (slotIdx >= 8) break;
    await loadImageFromPath(filePath, slotIdx);
  }
}

function handleSlotClick(idx) {
  if (state.images[idx] !== null) {
    removeImage(idx);
  } else {
    triggerFileSelect(idx);
  }
}

async function triggerFileSelect(idx) {
  const paths = await window.electronAPI.selectImages();
  if (!paths || paths.length === 0) return;
  await loadImageFromPath(paths[0], idx);
}

function removeImage(idx) {
  state.images[idx] = null;
  state.imagePaths[idx] = null;
  renderSlot(idx);
  updateImageCount();
  updateGenerateButton();
}

async function loadImageFromPath(filePath, idx) {
  try {
    // 通过 IPC 从主进程读取文件
    const base64 = await window.electronAPI.readImageBase64(filePath);
    state.images[idx] = base64;
    state.imagePaths[idx] = filePath;
    renderSlot(idx);
    updateImageCount();
    updateGenerateButton();
  } catch (e) {
    console.error('Failed to load image:', e);
  }
}

function loadImageFileToSlot(file, idx) {
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    state.images[idx] = base64;
    state.imagePaths[idx] = file.name;
    renderSlot(idx);
    updateImageCount();
    updateGenerateButton();
  };
  reader.readAsDataURL(file);
}

function renderSlot(idx) {
  const slot = document.querySelector(`.view-slot[data-index="${idx}"]`);
  const labels = ['正面 1', '正面 2', '正面 3', '正面 4', '背面 1', '背面 2', '背面 3', '背面 4'];

  if (state.images[idx] !== null) {
    slot.className = 'view-slot filled';
    slot.innerHTML = `
      <img src="data:image/png;base64,${state.images[idx]}" alt="${labels[idx]}">
      <button class="remove-btn" data-remove="${idx}">&times;</button>
    `;
    slot.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeImage(idx);
    });
  } else {
    slot.className = 'view-slot empty';
    slot.innerHTML = `
      <div class="slot-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>${labels[idx]}</span>
      </div>
    `;
  }
}

function updateImageCount() {
  const count = state.images.filter(Boolean).length;
  elements.footerImages.textContent = `${count} 张图片`;
}

function updateGenerateButton() {
  const hasImages = state.images.some(Boolean);
  const isReady = state.serverStatus === 'connected';
  elements.btnGenerate.disabled = !hasImages || !isReady || state.isGenerating;
}

// ——— 生成 CAD ———
async function handleGenerate() {
  if (state.isGenerating) return;

  const images = state.images.filter(Boolean);
  if (images.length === 0) return;

  state.isGenerating = true;
  updateGenerateButton();
  showLoading();

  const prompt = elements.promptInput.value.trim() || '生成这个形状的CadQuery代码。';

  try {
    const resp = await fetch(`${SERVER_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, prompt }),
    });

    const data = await resp.json();

    if (data.error) {
      showError(data.error);
    } else if (data.success) {
      state.generatedCode = data.code;
      showCode(data.code);
    }
  } catch (e) {
    showError(`请求失败: ${e.message}`);
  } finally {
    state.isGenerating = false;
    hideLoading();
    updateGenerateButton();
  }
}

function showLoading() {
  elements.loadingOverlay.style.display = '';
  state.loadingSeconds = 0;
  elements.loadingTimerEl.textContent = '0s';
  state.loadingTimerInterval = setInterval(() => {
    state.loadingSeconds++;
    const m = Math.floor(state.loadingSeconds / 60);
    const s = state.loadingSeconds % 60;
    elements.loadingTimerEl.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
  }, 1000);
}

function hideLoading() {
  elements.loadingOverlay.style.display = 'none';
  if (state.loadingTimerInterval) {
    clearInterval(state.loadingTimerInterval);
    state.loadingTimerInterval = null;
  }
}

function showCode(code) {
  elements.codePlaceholder.style.display = 'none';
  elements.codeBlock.style.display = '';
  elements.codeContent.textContent = code;
  highlightCode();
}

function showError(msg) {
  elements.codePlaceholder.style.display = 'none';
  elements.codeBlock.style.display = '';
  elements.codeContent.innerHTML = `<span style="color: var(--danger);">❌ ${escapeHtml(msg)}</span>`;
}

function highlightCode() {
  let code = elements.codeContent.textContent;
  code = escapeHtml(code);
  code = code.replace(/\b(import|from|def|class|return|if|else|elif|for|in|while|try|except|with|as|not|and|or|True|False|None|pass|raise)\b/g, '<span class="kw">$1</span>');
  code = code.replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="str">$1</span>');
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  code = code.replace(/(#.*)$/gm, '<span class="cmt">$1</span>');
  code = code.replace(/(\w+)\(/g, '<span class="fn">$1</span>(');
  elements.codeContent.innerHTML = code;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ——— 复制/保存 ———
async function handleCopy() {
  if (!state.generatedCode) return;
  try {
    await navigator.clipboard.writeText(state.generatedCode);
    showToast('已复制到剪贴板');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = state.generatedCode;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已复制到剪贴板');
  }
}

async function handleSave() {
  if (!state.generatedCode) return;
  const savedPath = await window.electronAPI.saveCode(state.generatedCode, 'cad_model.py');
  if (savedPath) {
    showToast(`已保存到 ${savedPath}`);
  }
}

// ——— Toast ———
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 20px;
    background: var(--accent);
    color: #000;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
    z-index: 200;
    animation: fadeIn 0.2s ease-out;
    box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 启动
document.addEventListener('DOMContentLoaded', init);
