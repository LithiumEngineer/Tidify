import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from send2trash import send2trash

ACTION_LOG_DIR = Path.home() / ".tidify"
ACTION_LOG_FILE = ACTION_LOG_DIR / "actions.log"

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff",
    ".tif",
    ".webp",
    ".heic",
    ".heif",
    ".avif",
    ".raw",
    ".cr2",
    ".nef",
    ".arw",
    ".dng",
    ".svg",
}


def is_image(path: str) -> bool:
    return Path(path).suffix.lower() in IMAGE_EXTENSIONS


def get_file_metadata(path: str) -> dict:
    p = Path(path)
    stat = p.stat()
    return {
        "path": str(p),
        "filename": p.name,
        "extension": p.suffix.lower(),
        "size": stat.st_size,
        "createdAt": datetime.fromtimestamp(stat.st_birthtime, tz=timezone.utc).isoformat(),
        "modifiedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "mimeType": _guess_mime(p.suffix.lower()),
    }


def _guess_mime(ext: str) -> str:
    mime_map = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip": "application/zip",
        ".dmg": "application/x-apple-diskimage",
        ".pkg": "application/x-newton-compatible-pkg",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".mp3": "audio/mpeg",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".html": "text/html",
        ".py": "text/x-python",
        ".js": "application/javascript",
    }
    return mime_map.get(ext, "application/octet-stream")


def move_to_trash(path: str) -> None:
    send2trash(path)


def move_file(src: str, dest_dir: str) -> str:
    dest_path = Path(dest_dir)
    dest_path.mkdir(parents=True, exist_ok=True)
    target = dest_path / Path(src).name

    if target.exists():
        stem = target.stem
        suffix = target.suffix
        counter = 1
        while target.exists():
            target = dest_path / f"{stem} ({counter}){suffix}"
            counter += 1

    shutil.move(src, str(target))
    return str(target)


def log_action(action: dict) -> None:
    ACTION_LOG_DIR.mkdir(parents=True, exist_ok=True)
    with open(ACTION_LOG_FILE, "a") as f:
        f.write(json.dumps(action) + "\n")


def read_action_log() -> list[dict]:
    if not ACTION_LOG_FILE.exists():
        return []
    with open(ACTION_LOG_FILE) as f:
        return [json.loads(line) for line in f if line.strip()]
