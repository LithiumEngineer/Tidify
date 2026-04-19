"""Test the embedding-based dedup on edge cases hashing can't handle."""

import os
import sys
import time

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "test_images_v2")
os.makedirs(OUT, exist_ok=True)


# Create base image
def make_photo(color, text, size=(800, 600)):
    img = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    draw.text((size[0] // 4, size[1] // 3), text, fill="white")
    draw.ellipse([100, 100, 300, 300], fill=(255, 200, 0))
    draw.rectangle([400, 200, 700, 500], fill=(0, 150, 255))
    return img


# Case 1: same image with whitespace added at top
base = make_photo((30, 80, 140), "Original Photo")
base.save(os.path.join(OUT, "original.jpg"), quality=95)

with_whitespace = Image.new("RGB", (800, 750), (255, 255, 255))
with_whitespace.paste(base, (0, 150))
with_whitespace.save(os.path.join(OUT, "with_whitespace_top.jpg"), quality=95)

# Case 2: same image cropped slightly
cropped = base.crop((50, 30, 750, 570))
cropped = cropped.resize((800, 600))
cropped.save(os.path.join(OUT, "cropped.jpg"), quality=95)

# Case 3: different size
base.resize((400, 300)).save(os.path.join(OUT, "half_size.jpg"), quality=85)

# Case 4: completely different image (should NOT match)
different = make_photo((200, 30, 30), "Totally Different")
draw = ImageDraw.Draw(different)
draw.polygon([(400, 50), (600, 300), (200, 300)], fill=(0, 255, 100))
different.save(os.path.join(OUT, "different.jpg"), quality=95)

print(f"Created {len(os.listdir(OUT))} test images in {OUT}")

# Now test the dedup
sys.path.insert(0, os.path.dirname(__file__))
from services.dedup import DedupService

print("\nRunning embedding-based dedup (sensitivity=90)...")
svc = DedupService(OUT, sensitivity=90)
svc.start()

while not svc.done:
    p = svc.get_progress()
    print(f"  [{p['phase']}] {p['message']}")
    time.sleep(1)

groups = svc.get_groups()
print(f"\nResults: {len(groups)} group(s)")
for g in groups:
    print(f"  Group ({len(g['photos'])} photos, best=#{g['bestIndex']}):")
    for i, p in enumerate(g["photos"]):
        marker = " <-- KEEP" if i == g["bestIndex"] else ""
        print(f"    [{i}] {p['filename']:30s} {p['width']}x{p['height']}{marker}")
