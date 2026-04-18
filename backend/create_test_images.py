"""Generate test duplicate images for dedup testing."""
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "test_images")
os.makedirs(OUT, exist_ok=True)


def make_base(color, text, size=(800, 600)):
    img = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    draw.text((size[0] // 3, size[1] // 2), text, fill="white")
    return img


# Group 1: same photo at different sizes/quality
base1 = make_base((30, 100, 200), "Beach Sunset", (1600, 1200))
base1.save(os.path.join(OUT, "beach_original.jpg"), quality=95)
base1.resize((800, 600)).save(os.path.join(OUT, "beach_small.jpg"), quality=85)
base1.resize((400, 300)).save(os.path.join(OUT, "beach_tiny.jpg"), quality=60)
base1.save(os.path.join(OUT, "beach_lowquality.jpg"), quality=20)

# Group 2: same photo with slight modifications
base2 = make_base((200, 50, 50), "Mountain View", (1200, 900))
base2.save(os.path.join(OUT, "mountain_original.jpg"), quality=95)
base2.save(os.path.join(OUT, "mountain_copy.jpg"), quality=95)
base2.filter(ImageFilter.BLUR).save(os.path.join(OUT, "mountain_blurry.jpg"), quality=90)
base2.convert("L").convert("RGB").save(os.path.join(OUT, "mountain_grayscale.jpg"), quality=90)

# Group 3: another distinct image
base3 = make_base((50, 180, 50), "City Night", (1000, 750))
base3.save(os.path.join(OUT, "city_original.jpg"), quality=95)
base3.resize((500, 375)).save(os.path.join(OUT, "city_half.jpg"), quality=80)

# Unique images (should NOT be grouped)
make_base((255, 200, 0), "Unique Yellow", (600, 400)).save(
    os.path.join(OUT, "unique_yellow.jpg"), quality=90
)
make_base((128, 0, 255), "Unique Purple", (600, 400)).save(
    os.path.join(OUT, "unique_purple.jpg"), quality=90
)

print(f"Created {len(os.listdir(OUT))} test images in {OUT}")
