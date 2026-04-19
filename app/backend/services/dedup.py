from __future__ import annotations

import base64
import os
import threading
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import cv2
import faiss
import numpy as np
from PIL import Image

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

from services.embeddings import get_embedding_service
from services.file_utils import is_image, log_action, move_to_trash

THUMBNAIL_SIZE = (200, 200)

# sensitivity 0 (loose) → low cosine threshold (more matches)
# sensitivity 100 (strict) → high cosine threshold (only near-identical)
COSINE_MIN = 0.82  # loosest (sensitivity 0)
COSINE_MAX = 0.99  # strictest (sensitivity 100)


def _sensitivity_to_cosine(sensitivity: int) -> float:
    s = max(0, min(100, sensitivity))
    return COSINE_MIN + (s / 100) * (COSINE_MAX - COSINE_MIN)


class DedupService:
    def __init__(self, directory: str, sensitivity: int = 90):
        self.directory = directory
        self._cosine_threshold = _sensitivity_to_cosine(sensitivity)
        self._image_paths: list[str] = []
        self._embeddings: np.ndarray | None = None
        self._raw_groups: dict[int, list[int]] = {}
        self._groups: list[dict] = []
        self._lock = threading.Lock()
        self._progress: dict = {
            "phase": "pending",
            "current": 0,
            "total": 0,
            "message": "Waiting...",
        }
        self.done = False

    def start(self) -> None:
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def _run(self) -> None:
        try:
            emb_service = get_embedding_service()

            self._set_progress("scanning", 0, 0, "Downloading model if needed...")
            if not emb_service.ensure_model(
                on_progress=lambda msg: self._set_progress("scanning", 0, 0, msg)
            ):
                self._set_progress("done", 0, 0, "Failed to download similarity model")
                return

            self._set_progress("scanning", 0, 0, "Loading model...")
            emb_service.load()

            self._scan()
            if not self._image_paths:
                self._set_progress("done", 0, 0, "No images found")
                return

            self._compute_embeddings(emb_service)
            self._build_index_and_group()
            self._rank_groups()
            self._set_progress("done", len(self._image_paths), len(self._image_paths), "Complete")
        except Exception as e:
            print(f"Dedup error: {e}")
            import traceback

            traceback.print_exc()
            self._set_progress("done", 0, 0, f"Error: {e}")
        finally:
            self.done = True

    def get_progress(self) -> dict:
        with self._lock:
            return dict(self._progress)

    def _set_progress(self, phase: str, current: int, total: int, message: str) -> None:
        with self._lock:
            self._progress = {
                "phase": phase,
                "current": current,
                "total": total,
                "message": message,
            }

    def _scan(self) -> None:
        self._set_progress("scanning", 0, 0, "Scanning directory...")
        paths = []
        for root, _, files in os.walk(self.directory):
            for fname in files:
                if fname.startswith("."):
                    continue
                fpath = os.path.join(root, fname)
                if is_image(fpath):
                    paths.append(fpath)
        self._image_paths = paths
        self._set_progress("scanning", len(paths), len(paths), f"Found {len(paths)} images")

    def _compute_embeddings(self, emb_service) -> None:
        total = len(self._image_paths)
        vectors = []
        failed = 0

        for i, path in enumerate(self._image_paths):
            try:
                img = Image.open(path).convert("RGB")
                vec = emb_service.embed(img)
                vectors.append(vec)
            except Exception as e:
                print(f"Failed to embed {Path(path).name}: {e}")
                vectors.append(
                    np.zeros_like(vectors[0]) if vectors else np.zeros(1000, dtype=np.float32)
                )
                failed += 1

            if i % 20 == 0 or i == total - 1:
                self._set_progress("embedding", i + 1, total, f"Embedded {i + 1}/{total}")

        if failed > 0:
            print(f"Warning: {failed}/{total} images failed to embed")

        self._embeddings = np.stack(vectors).astype(np.float32)

    def _build_index_and_group(self) -> None:
        n = self._embeddings.shape[0]
        dim = self._embeddings.shape[1]
        self._set_progress("grouping", 0, n, "Finding similar images...")

        # Inner product on L2-normalized vectors = cosine similarity
        index = faiss.IndexFlatIP(dim)
        index.add(self._embeddings)

        parent = list(range(n))

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(a: int, b: int) -> None:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb

        # Query in batches for efficiency
        batch_size = 100
        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            batch = self._embeddings[start:end]

            # Search for top-k neighbors (k capped at 50 or n)
            k = min(50, n)
            similarities, indices = index.search(batch, k)

            for local_i in range(end - start):
                global_i = start + local_i
                for j in range(k):
                    neighbor = int(indices[local_i, j])
                    sim = float(similarities[local_i, j])
                    if neighbor != global_i and sim >= self._cosine_threshold:
                        union(global_i, neighbor)

            self._set_progress("grouping", end, n, f"Compared {end}/{n}")

        group_map: dict[int, list[int]] = defaultdict(list)
        for i in range(n):
            group_map[find(i)].append(i)

        self._raw_groups = {k: v for k, v in group_map.items() if len(v) > 1}
        self._set_progress("grouping", n, n, f"Found {len(self._raw_groups)} duplicate groups")

    @staticmethod
    def _compute_sharpness(path: str) -> float:
        try:
            gray = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if gray is None:
                return 0.0
            return float(cv2.Laplacian(gray, cv2.CV_64F).var())
        except Exception:
            return 0.0

    @staticmethod
    def _has_exif(img: Image.Image) -> bool:
        try:
            exif = img.getexif()
            return len(exif) > 5
        except Exception:
            return False

    def _rank_groups(self) -> None:
        groups = []
        total_groups = len(self._raw_groups)

        for idx, group_indices in enumerate(self._raw_groups.values()):
            photos = []
            best_score = -1.0
            best_idx = 0

            for local_idx, global_idx in enumerate(group_indices):
                path = self._image_paths[global_idx]
                try:
                    img = Image.open(path).convert("RGB")
                    width, height = img.size
                    file_size = os.path.getsize(path)
                    sharpness = self._compute_sharpness(path)
                    has_exif = self._has_exif(img)

                    resolution = width * height
                    score = (
                        (resolution / 1_000_000) * 40
                        + sharpness * 0.1
                        + (file_size / 1_000_000) * 5
                        + (20 if has_exif else 0)
                    )

                    if score > best_score:
                        best_score = score
                        best_idx = local_idx

                    thumbnail = self._make_thumbnail(img)

                    photos.append(
                        {
                            "path": path,
                            "filename": Path(path).name,
                            "width": width,
                            "height": height,
                            "fileSize": file_size,
                            "format": img.format or Path(path).suffix,
                            "sharpness": round(sharpness, 2),
                            "hash": "",
                            "thumbnailUrl": thumbnail,
                        }
                    )
                except Exception:
                    photos.append(
                        {
                            "path": path,
                            "filename": Path(path).name,
                            "width": 0,
                            "height": 0,
                            "fileSize": 0,
                            "format": "unknown",
                            "sharpness": 0,
                            "hash": "",
                            "thumbnailUrl": "",
                        }
                    )

            # Move best photo to the front
            if best_idx != 0:
                photos[0], photos[best_idx] = photos[best_idx], photos[0]

            groups.append(
                {
                    "id": str(uuid.uuid4()),
                    "photos": photos,
                    "bestIndex": 0,
                }
            )

            if (idx + 1) % 10 == 0 or idx == total_groups - 1:
                self._set_progress(
                    "ranking", idx + 1, total_groups, f"Ranked {idx + 1}/{total_groups} groups"
                )

        self._groups = groups

    @staticmethod
    def _make_thumbnail(img: Image.Image) -> str:
        thumb = img.copy()
        thumb.thumbnail(THUMBNAIL_SIZE)
        buf = BytesIO()
        thumb.save(buf, format="JPEG", quality=75)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/jpeg;base64,{b64}"

    def get_groups(self) -> list[dict]:
        return self._groups

    def execute_cleanup(self, paths_to_delete: list[str]) -> dict:
        deleted_count = 0
        freed_bytes = 0

        all_photos = {p["path"]: p for g in self._groups for p in g["photos"]}
        for path in paths_to_delete:
            photo = all_photos.get(path)
            if not photo:
                continue
            try:
                move_to_trash(path)
                log_action(
                    {
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "action": "delete",
                        "sourcePath": path,
                        "fileSize": photo["fileSize"],
                    }
                )
                deleted_count += 1
                freed_bytes += photo["fileSize"]
            except Exception as e:
                print(f"Failed to trash {path}: {e}")

        return {"deletedCount": deleted_count, "freedBytes": freed_bytes}
