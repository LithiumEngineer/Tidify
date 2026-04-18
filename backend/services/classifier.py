from __future__ import annotations

import os
import uuid
import json
from pathlib import Path
from datetime import datetime, timezone

from services.file_utils import (
    get_file_metadata,
    move_to_trash,
    move_file,
    log_action,
)

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


SYSTEM_PROMPT = """You are a file organizer assistant. For each file in the list, decide what to do with it.

Rules:
- Installers (.dmg, .pkg) and disk images: suggest "delete" if the app is likely already installed
- Old downloads (> 30 days), duplicate filenames: suggest "delete"
- Documents (.pdf, .doc, .docx, .txt): suggest "move" to ~/Documents
- School/academic files: suggest "move" to ~/Desktop/School
- Images/photos: suggest "move" to ~/Pictures
- Code/projects: suggest "keep"
- Recently modified files (< 7 days): suggest "keep"
- Archives (.zip) containing installers: suggest "delete"
- If unsure, suggest "keep"

For each file, respond with a JSON object:
{
  "action": "delete" | "move" | "keep",
  "destination": "folder path if move, null otherwise",
  "reason": "brief explanation"
}

Respond with a JSON array of objects, one per file, in the same order as the input.
"""

BATCH_SIZE = 20


class ClassifierService:
    def __init__(self, directory: str):
        self.directory = os.path.expanduser(directory)
        self._files: list[dict] = []
        self._plan_items: list[dict] = []
        self._executed_actions: list[dict] = []

    async def scan_and_classify(self) -> None:
        self._scan_files()
        await self._classify_files()

    def _scan_files(self) -> None:
        entries = []
        try:
            for entry in os.scandir(self.directory):
                if entry.is_file() and not entry.name.startswith("."):
                    try:
                        meta = get_file_metadata(entry.path)
                        # Extract text from PDFs for better classification
                        if meta["extension"] == ".pdf" and fitz:
                            try:
                                doc = fitz.open(entry.path)
                                if doc.page_count > 0:
                                    text = doc[0].get_text()[:500]
                                    meta["preview_text"] = text
                                doc.close()
                            except Exception:
                                pass
                        entries.append(meta)
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error scanning {self.directory}: {e}")

        self._files = entries

    async def _classify_files(self) -> None:
        if not self._files:
            return

        api_key = os.environ.get("OPENAI_API_KEY")

        if api_key and OpenAI:
            await self._classify_with_llm(api_key)
        else:
            self._classify_with_rules()

    async def _classify_with_llm(self, api_key: str) -> None:
        client = OpenAI(api_key=api_key)

        for start in range(0, len(self._files), BATCH_SIZE):
            batch = self._files[start : start + BATCH_SIZE]
            file_descriptions = []
            for f in batch:
                desc = f"- {f['filename']} ({f['extension']}, {f['size']} bytes, modified {f['modifiedAt']})"
                if f.get("preview_text"):
                    desc += f"\n  PDF preview: {f['preview_text'][:200]}"
                file_descriptions.append(desc)

            user_msg = "Classify these files:\n\n" + "\n".join(file_descriptions)

            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                )

                content = response.choices[0].message.content
                results = json.loads(content)

                if isinstance(results, dict) and "files" in results:
                    results = results["files"]
                elif isinstance(results, dict) and "results" in results:
                    results = results["results"]

                for i, (file_meta, classification) in enumerate(zip(batch, results)):
                    self._plan_items.append({
                        "id": str(uuid.uuid4()),
                        "file": file_meta,
                        "action": classification.get("action", "keep"),
                        "destination": classification.get("destination"),
                        "reason": classification.get("reason", ""),
                        "approved": False,
                    })

            except Exception as e:
                print(f"LLM classification error: {e}")
                for file_meta in batch:
                    self._plan_items.append(self._rule_classify(file_meta))

    def _classify_with_rules(self) -> None:
        """Fallback rule-based classification when no LLM is available."""
        for file_meta in self._files:
            self._plan_items.append(self._rule_classify(file_meta))

    def _rule_classify(self, file_meta: dict) -> dict:
        ext = file_meta["extension"]
        name = file_meta["filename"].lower()
        size = file_meta["size"]
        modified = datetime.fromisoformat(file_meta["modifiedAt"])
        age_days = (datetime.now(timezone.utc) - modified).days

        action = "keep"
        destination = None
        reason = "No rule matched"

        if ext in {".dmg", ".pkg", ".iso"}:
            action = "delete"
            reason = f"Installer/disk image ({ext}), likely already installed"
        elif ext == ".pdf":
            action = "move"
            destination = str(Path.home() / "Documents")
            reason = "PDF document — moving to Documents"
        elif ext in {".doc", ".docx", ".txt", ".rtf", ".odt", ".pages"}:
            action = "move"
            destination = str(Path.home() / "Documents")
            reason = "Document file — moving to Documents"
        elif ext in {".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"}:
            action = "move"
            destination = str(Path.home() / "Pictures")
            reason = "Image file — moving to Pictures"
        elif ext in {".zip", ".tar", ".gz", ".rar", ".7z"}:
            if age_days > 30:
                action = "delete"
                reason = f"Old archive ({age_days} days old)"
            else:
                action = "keep"
                reason = "Recent archive — keeping"
        elif age_days > 90 and size < 10 * 1024 * 1024:
            action = "delete"
            reason = f"Old file ({age_days} days), small size"
        elif age_days < 7:
            action = "keep"
            reason = "Recently modified — keeping"

        return {
            "id": str(uuid.uuid4()),
            "file": file_meta,
            "action": action,
            "destination": destination,
            "reason": reason,
            "approved": False,
        }

    def get_plan(self) -> dict:
        delete_count = sum(1 for i in self._plan_items if i["action"] == "delete")
        move_count = sum(1 for i in self._plan_items if i["action"] == "move")
        keep_count = sum(1 for i in self._plan_items if i["action"] == "keep")
        reclaimable = sum(
            i["file"]["size"] for i in self._plan_items if i["action"] == "delete"
        )

        return {
            "items": self._plan_items,
            "totalFiles": len(self._plan_items),
            "deleteCount": delete_count,
            "moveCount": move_count,
            "keepCount": keep_count,
            "reclaimableBytes": reclaimable,
        }

    def execute(self, approved_ids: list[str]) -> dict:
        approved_set = set(approved_ids)
        executed_count = 0
        freed_bytes = 0
        batch_actions = []

        for item in self._plan_items:
            if item["id"] not in approved_set:
                continue

            try:
                if item["action"] == "delete":
                    move_to_trash(item["file"]["path"])
                    action_entry = {
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "action": "delete",
                        "sourcePath": item["file"]["path"],
                        "fileSize": item["file"]["size"],
                    }
                    freed_bytes += item["file"]["size"]
                elif item["action"] == "move" and item.get("destination"):
                    new_path = move_file(item["file"]["path"], item["destination"])
                    action_entry = {
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "action": "move",
                        "sourcePath": item["file"]["path"],
                        "destinationPath": new_path,
                        "fileSize": item["file"]["size"],
                    }
                else:
                    continue

                log_action(action_entry)
                batch_actions.append(action_entry)
                executed_count += 1
            except Exception as e:
                print(f"Failed to execute action on {item['file']['path']}: {e}")

        self._executed_actions = batch_actions
        return {"executedCount": executed_count, "freedBytes": freed_bytes}

    def undo(self) -> dict:
        undone = 0
        for action in reversed(self._executed_actions):
            try:
                if action["action"] == "move" and action.get("destinationPath"):
                    move_file(action["destinationPath"], str(Path(action["sourcePath"]).parent))
                    undone += 1
            except Exception as e:
                print(f"Failed to undo action: {e}")

        self._executed_actions.clear()
        return {"undoneCount": undone}
