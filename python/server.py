#!/usr/bin/env python3
"""学霸帝 Zero-to-CAD - Python推理服务器"""

import os
import sys
import json
import base64
import io
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# 模型全局变量
model = None
processor = None
device = None

def load_model():
    """加载Zero-To-CAD模型"""
    global model, processor, device
    
    import torch
    from transformers import Qwen3VLForConditionalGeneration, AutoProcessor
    
    # 检测设备
    if torch.backends.mps.is_available():
        device = "mps"
        dtype = torch.float16
        print(f"[服务器] 检测到 Apple Metal，使用 MPS 加速")
    elif torch.cuda.is_available():
        device = "cuda"
        dtype = torch.bfloat16
        print(f"[服务器] 检测到 CUDA GPU，使用 GPU 加速")
    else:
        device = "cpu"
        dtype = torch.float32
        print(f"[服务器] 使用 CPU 推理（速度较慢）")
    
    model_name = os.environ.get("MODEL_PATH", "ADSKAILab/Zero-To-CAD-Qwen3-VL-2B")
    print(f"[服务器] 正在加载模型: {model_name}")
    print(f"[服务器] 设备: {device}, 数据类型: {dtype}")
    
    processor = AutoProcessor.from_pretrained(model_name)
    model = Qwen3VLForConditionalGeneration.from_pretrained(
        model_name,
        torch_dtype=dtype,
        device_map=device if device != "cpu" else None,
    )
    if device == "cpu":
        model = model.to("cpu")
    
    model.eval()
    print(f"[服务器] 模型加载完成！")


class CADRequestHandler(BaseHTTPRequestHandler):
    """处理CAD生成请求"""
    
    def do_POST(self):
        if self.path == '/api/generate':
            self.handle_generate()
        elif self.path == '/api/status':
            self.handle_status()
        else:
            self.send_error(404)
    
    def do_GET(self):
        if self.path == '/api/status':
            self.handle_status()
        else:
            self.send_error(404)
    
    def handle_status(self):
        status = {
            "loaded": model is not None,
            "device": device or "未加载",
            "model": "ADSKAILab/Zero-To-CAD-Qwen3-VL-2B",
        }
        self.send_json(status)
    
    def handle_generate(self):
        try:
            if model is None:
                self.send_json({"error": "模型尚未加载，请稍候..."}, 503)
                return
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            images_b64 = data.get("images", [])
            prompt = data.get("prompt", "生成这个形状的CadQuery代码。")
            
            if not images_b64:
                self.send_json({"error": "请至少提供一张图片"}, 400)
                return
            
            import torch
            from PIL import Image
            
            # 解码图片
            views = []
            for img_b64 in images_b64:
                img_bytes = base64.b64decode(img_b64)
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                views.append(img)
            
            print(f"[服务器] 收到 {len(views)} 张图片，开始推理...")
            
            # 构建消息
            system_msg = {
                "role": "system",
                "content": "你是一个CAD代码助手。给定3D形状的多个渲染视图，生成干净、结构良好的CadQuery Python代码来准确重现几何形状。"
            }
            
            user_content = []
            for view in views:
                user_content.append({"type": "image", "image": view})
            user_content.append({"type": "text", "text": prompt})
            
            user_msg = {"role": "user", "content": user_content}
            
            messages = [system_msg, user_msg]
            
            # 处理输入
            text_input = processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            
            from transformers import AutoProcessor
            image_inputs = []
            for view in views:
                image_inputs.append(view)
            
            inputs = processor(
                text=[text_input],
                images=image_inputs,
                padding=True,
                return_tensors="pt",
            ).to(model.device)
            
            # 生成
            with torch.no_grad():
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=4096,
                    do_sample=False,
                    temperature=1.0,
                    top_p=0.9,
                )
            
            # 解码输出
            generated_ids = output_ids[0][inputs.input_ids.shape[1]:]
            generated_text = processor.tokenizer.decode(
                generated_ids, skip_special_tokens=True
            )
            
            print(f"[服务器] 推理完成，生成 {len(generated_text)} 字符")
            
            self.send_json({
                "code": generated_text,
                "success": True,
            })
            
        except Exception as e:
            error_msg = traceback.format_exc()
            print(f"[服务器] 错误: {error_msg}")
            self.send_json({"error": str(e), "traceback": error_msg}, 500)
    
    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args):
        print(f"[HTTP] {format % args}")


def main():
    port = int(os.environ.get("CAD_SERVER_PORT", 18765))
    
    # 尝试加载模型
    try:
        load_model()
    except Exception as e:
        print(f"[服务器] 模型加载失败: {e}")
        print(f"[服务器] 服务器仍将运行，但推理功能不可用")
        traceback.print_exc()
    
    server = HTTPServer(('127.0.0.1', port), CADRequestHandler)
    print(f"[服务器] 🚀 学霸帝 Zero-to-CAD 服务器启动于 http://127.0.0.1:{port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[服务器] 正在关闭...")
        server.server_close()


if __name__ == "__main__":
    main()
