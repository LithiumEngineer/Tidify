from __future__ import annotations

import os
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import onnxruntime as ort

MODEL_DIR = Path.home() / ".tidify" / "models"
MODEL_PATH = MODEL_DIR / "mobilenetv3_small.onnx"
MODEL_URL = "https://huggingface.co/EclipseAidge/mobilenet_v3/resolve/main/MobileNet-v3-Small.onnx?download=true"

INPUT_SIZE = 224
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class EmbeddingService:
    def __init__(self):
        self._session: ort.InferenceSession | None = None

    def ensure_model(self, on_progress=None) -> bool:
        if MODEL_PATH.exists():
            return True

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        if on_progress:
            on_progress("Downloading similarity model (~10 MB)...")

        try:
            urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
            return True
        except Exception as e:
            print(f"Failed to download model: {e}")
            return False

    def load(self) -> None:
        if self._session is not None:
            return
        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 2
        opts.intra_op_num_threads = 4
        self._session = ort.InferenceSession(
            str(MODEL_PATH),
            sess_options=opts,
            providers=["CoreMLExecutionProvider", "CPUExecutionProvider"],
        )

    @staticmethod
    def _autocrop(img: Image.Image) -> Image.Image:
        """Trim uniform borders (whitespace, black bars, etc.) from the image."""
        arr = np.array(img)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)

        # Detect edges to find content region
        edges = cv2.Canny(gray, 30, 100)
        coords = cv2.findNonZero(edges)
        if coords is None:
            return img

        x, y, w, h = cv2.boundingRect(coords)
        # Only crop if the content is meaningfully smaller than the image
        img_h, img_w = gray.shape
        if w < img_w * 0.5 or h < img_h * 0.5:
            return img

        # Add a small margin
        margin = 5
        x = max(0, x - margin)
        y = max(0, y - margin)
        w = min(img_w - x, w + 2 * margin)
        h = min(img_h - y, h + 2 * margin)

        return img.crop((x, y, x + w, y + h))

    def _preprocess(self, img: Image.Image) -> np.ndarray:
        img = self._autocrop(img.convert("RGB"))
        img = img.resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
        # HWC -> NCHW
        arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
        return arr

    def embed(self, img: Image.Image) -> np.ndarray:
        if self._session is None:
            raise RuntimeError("Model not loaded — call load() first")

        tensor = self._preprocess(img)
        input_name = self._session.get_inputs()[0].name

        # Run the full model — output is class logits (1000-dim)
        # but the internal features encode visual similarity
        outputs = self._session.run(None, {input_name: tensor})
        vec = outputs[0].flatten().astype(np.float32)

        # L2 normalize so dot product = cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def embed_batch(self, images: list[Image.Image]) -> np.ndarray:
        vectors = [self.embed(img) for img in images]
        return np.stack(vectors)


# Singleton — model is loaded once and reused across scans
_instance: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _instance
    if _instance is None:
        _instance = EmbeddingService()
    return _instance
