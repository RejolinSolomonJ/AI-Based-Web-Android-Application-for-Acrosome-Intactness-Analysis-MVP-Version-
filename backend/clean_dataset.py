"""Clean dataset by removing corrupt/unreadable images."""
import os
from pathlib import Path
from PIL import Image

DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")

def clean():
    removed = 0
    checked = 0

    for class_dir in ["intact", "damaged"]:
        folder = Path(DATASET_DIR) / class_dir
        if not folder.exists():
            continue

        for img_path in sorted(folder.iterdir()):
            if not img_path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp'):
                continue
            checked += 1
            try:
                with Image.open(img_path) as img:
                    img.verify()
                # Second pass - actually load pixels
                with Image.open(img_path) as img:
                    img.load()
            except Exception as e:
                print(f"  [REMOVE] {class_dir}/{img_path.name} - {e}")
                os.remove(img_path)
                removed += 1

    print(f"\nChecked {checked} images, removed {removed} corrupt files.")

    # Count remaining
    for class_dir in ["intact", "damaged"]:
        folder = Path(DATASET_DIR) / class_dir
        count = len(list(folder.glob("*"))) if folder.exists() else 0
        print(f"  {class_dir}: {count}")

if __name__ == "__main__":
    clean()
