"""Build dataset from labels and start training."""
import os
import json
import shutil
from pathlib import Path

WORK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_prep")
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
LABELS_FILE = os.path.join(WORK_DIR, "_labels.json")

def build():
    with open(LABELS_FILE, "r") as f:
        labels = json.load(f)

    intact_dir = Path(DATASET_DIR) / "intact"
    damaged_dir = Path(DATASET_DIR) / "damaged"
    os.makedirs(intact_dir, exist_ok=True)
    os.makedirs(damaged_dir, exist_ok=True)

    intact_count = 0
    damaged_count = 0

    for image_name, label in labels.items():
        src = Path(WORK_DIR) / image_name
        if not src.exists():
            print(f"  [SKIP] {image_name} not found")
            continue

        if label == "intact":
            shutil.copy2(src, intact_dir / image_name)
            intact_count += 1
        elif label == "damaged":
            shutil.copy2(src, damaged_dir / image_name)
            damaged_count += 1

    print(f"\nDataset built successfully!")
    print(f"  Intact:  {intact_count}")
    print(f"  Damaged: {damaged_count}")
    print(f"  Total:   {intact_count + damaged_count}")
    print(f"  Path:    {DATASET_DIR}")

if __name__ == "__main__":
    build()
