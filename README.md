# 学霸帝 Zero-to-CAD

> AI 驱动的 CAD 代码生成器 — 上传多视图图片，自动生成 CadQuery Python 代码

![macOS](https://img.shields.io/badge/platform-macOS-blue) ![License](https://img.shields.io/badge/license-Apache--2.0-green) ![Model](https://img.shields.io/badge/model-Qwen3--VL--2B-orange)

## 简介

**学霸帝 Zero-to-CAD** 是一个本地运行的桌面应用，基于 Autodesk AI Lab 的 [Zero-to-CAD](https://arxiv.org/abs/2604.24479) 项目，使用微调后的 Qwen3-VL-2B 视觉语言模型，从多视图渲染图片自动生成可执行的 CadQuery Python 代码。

### 核心能力

- 🖼️ **多视图输入**：支持最多8张渲染视图（4正面 + 4背面）
- 🤖 **AI 生成**：基于 Qwen3-VL-2B 微调模型，自动生成 CadQuery 代码
- ⚡ **本地推理**：所有计算在本地完成，无需联网
- 💾 **代码导出**：一键复制或保存生成的 Python 代码
- 🎨 **深空工业 UI**：专业级暗色主题，青绿点缀

### 性能基准

| 基准 | 成功率 | Mean IoU |
|------|--------|----------|
| Zero-to-CAD 测试集 | 82.1% | 0.747 |
| ABC (域外) | 61.0% | 0.377 |

## 系统要求

- **macOS** 12.0+ (Intel / Apple Silicon)
- **内存**：16GB+（推荐 32GB）
- **磁盘**：10GB+ 可用空间（模型约 4.2GB）
- **网络**：首次运行需要下载模型

### 设备支持

| 设备 | 速度 | 说明 |
|------|------|------|
| Apple Silicon (MPS) | ⚡⚡⚡ | 推荐方式 |
| NVIDIA GPU (CUDA) | ⚡⚡⚡ | 推荐方式 |
| CPU | ⚠️ | 可用但较慢（约30-60秒/次） |

## 安装与运行

### 1. 从 DMG 安装

下载 `学霸帝-Zero-to-CAD-1.0.0.dmg`，双击打开，将应用拖入 Applications 文件夹。

### 2. 从源码构建

```bash
# 克隆项目
git clone <repo-url>
cd xuabad-zero-to-cad

# 运行构建脚本
chmod +x build.sh
./build.sh

# 开发模式运行
npm start

# 打包 DMG
npm run dist
```

### 3. 安装 Python 依赖

```bash
pip3 install -r python/requirements.txt
```

### 4. 模型下载

首次启动时，模型会自动从 HuggingFace 下载：

```
ADSKAILab/Zero-To-CAD-Qwen3-VL-2B
```

如果网络不佳，可以使用镜像：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

## 使用方法

1. 启动应用，等待模型加载完成（状态指示灯变绿）
2. 点击「上传图片」，选择3D形状的多视图渲染图片
3. 可选修改提示词
4. 点击「生成 CAD」按钮
5. AI 将自动生成 CadQuery Python 代码
6. 复制或保存代码，使用 CadQuery 执行

### 执行生成的代码

```bash
# 安装 CadQuery
pip install cadquery

# 执行生成的代码
python cad_model.py
```

## 技术架构

```
┌─────────────────────────────────────┐
│         Electron 前端 (UI)          │
│  ┌──────────┐   ┌───────────────┐  │
│  │ 视图输入  │   │  代码输出      │  │
│  │ (8 槽位) │→→→│  (高亮显示)    │  │
│  └──────────┘   └───────────────┘  │
│         │                           │
│    IPC (HTTP)                       │
│         ↓                           │
│  ┌──────────────────────────────┐   │
│  │   Python 推理服务器 (18765)   │   │
│  │  Qwen3-VL-2B + Transformers  │   │
│  │  Auto detect: MPS/CUDA/CPU   │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 致谢

- **模型**：[ADSKAILab/Zero-To-CAD-Qwen3-VL-2B](https://huggingface.co/ADSKAILab/Zero-To-CAD-Qwen3-VL-2B) by Autodesk AI Lab
- **论文**：[Zero-to-CAD: Agentic Synthesis of Interpretable CAD Programs at Million-Scale Without Real Data](https://arxiv.org/abs/2604.24479)
- **基础模型**：[Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) by Alibaba Cloud
- **数据集**：[Zero-To-CAD-1m](https://huggingface.co/datasets/ADSKAILab/Zero-To-CAD-1m)

## 许可证

Apache-2.0
