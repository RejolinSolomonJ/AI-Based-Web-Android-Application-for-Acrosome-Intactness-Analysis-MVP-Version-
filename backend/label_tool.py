"""
Image Labeling Tool for Acrosome Intactness Dataset.

This tool provides a web interface to:
  1. Convert HEIC images to JPG
  2. De-duplicate images
  3. Label each image as "intact" or "damaged"
  4. Organize labeled images into a dataset folder for training

Usage:
  python label_tool.py --source "C:/Users/Rejolin Solomon J/Downloads/Thesis"

Then open http://localhost:5555 in your browser.
"""

import os
import sys
import json
import shutil
import hashlib
import argparse
from pathlib import Path
from flask import Flask, render_template_string, jsonify, request, send_file

# ─── Configuration ──────────────────────────────────────────────────────────
SOURCE_DIR = None
WORK_DIR = None      # Where de-duped & converted images go
DATASET_DIR = None   # Final dataset: intact/ + damaged/
LABELS_FILE = None   # Persistent label storage

app = Flask(__name__)

# ─── Utility functions ──────────────────────────────────────────────────────

def file_hash(path, chunk_size=8192):
    """Compute MD5 hash of a file for de-duplication."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def convert_heic_to_jpg(heic_path, output_path):
    """Convert a HEIC image to JPG format."""
    try:
        from PIL import Image
        import pillow_heif
        pillow_heif.register_heif_opener()
        img = Image.open(heic_path)
        img = img.convert("RGB")
        img.save(output_path, "JPEG", quality=95)
        return True
    except Exception as e:
        print(f"  [WARN] Failed to convert {heic_path}: {e}")
        return False


def prepare_images(source_dir, work_dir):
    """
    De-duplicate and convert all images from source_dir into work_dir.
    Returns list of prepared image filenames.
    """
    os.makedirs(work_dir, exist_ok=True)

    source = Path(source_dir)
    all_files = list(source.iterdir())

    # Separate by extension
    jpg_files = [f for f in all_files if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp')]
    heic_files = [f for f in all_files if f.suffix.lower() == '.heic']

    print(f"\n[INFO] Found {len(jpg_files)} JPG/PNG files and {len(heic_files)} HEIC files")

    # ── De-duplicate JPGs ────────────────────────────────────────
    print("[INFO] De-duplicating JPG files...")
    seen_hashes = set()
    copied_count = 0
    skipped_count = 0

    for f in sorted(jpg_files):
        h = file_hash(f)
        if h not in seen_hashes:
            seen_hashes.add(h)
            # Use a clean name (remove duplicate markers)
            clean_name = f.name
            dest = Path(work_dir) / clean_name
            # Avoid overwriting
            if not dest.exists():
                shutil.copy2(f, dest)
                copied_count += 1
        else:
            skipped_count += 1

    print(f"  Copied: {copied_count}, Skipped duplicates: {skipped_count}")

    # ── Convert HEIC files ───────────────────────────────────────
    print(f"[INFO] Converting {len(heic_files)} HEIC files to JPG...")
    converted = 0
    for f in sorted(heic_files):
        out_name = f.stem + ".jpg"
        out_path = Path(work_dir) / out_name
        if not out_path.exists():
            if convert_heic_to_jpg(str(f), str(out_path)):
                converted += 1
                h = file_hash(out_path)
                if h in seen_hashes:
                    os.remove(out_path)
                    skipped_count += 1
                else:
                    seen_hashes.add(h)

    print(f"  Converted: {converted}")

    # Final list
    images = sorted([f.name for f in Path(work_dir).iterdir()
                     if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp')])
    print(f"\n[OK] Total unique images ready for labeling: {len(images)}")
    return images


def load_labels():
    """Load existing labels from disk."""
    if os.path.exists(LABELS_FILE):
        with open(LABELS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_labels(labels):
    """Save labels to disk."""
    with open(LABELS_FILE, "w") as f:
        json.dump(labels, f, indent=2)


# ─── HTML Template ──────────────────────────────────────────────────────────

TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acrosome Labeling Tool</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0e1a;
            --bg-secondary: #111827;
            --bg-card: #1a2035;
            --accent-green: #10b981;
            --accent-green-hover: #34d399;
            --accent-red: #ef4444;
            --accent-red-hover: #f87171;
            --accent-blue: #3b82f6;
            --accent-purple: #8b5cf6;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border: #1e293b;
            --shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Animated background */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: 
                radial-gradient(ellipse at 20% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 60%),
                radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 60%);
            pointer-events: none;
            z-index: 0;
        }

        .container {
            position: relative;
            z-index: 1;
            max-width: 1000px;
            margin: 0 auto;
            padding: 24px;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 28px;
        }

        .header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 6px;
        }

        .header p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        /* Progress bar */
        .progress-section {
            background: var(--bg-card);
            border-radius: 14px;
            padding: 18px 22px;
            margin-bottom: 22px;
            border: 1px solid var(--border);
        }

        .progress-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .progress-stats .stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            font-weight: 500;
        }

        .stat .dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            display: inline-block;
        }

        .dot.green { background: var(--accent-green); box-shadow: 0 0 8px rgba(16,185,129,0.5); }
        .dot.red { background: var(--accent-red); box-shadow: 0 0 8px rgba(239,68,68,0.5); }
        .dot.blue { background: var(--accent-blue); box-shadow: 0 0 8px rgba(59,130,246,0.5); }
        .dot.gray { background: #475569; }

        .progress-bar {
            height: 8px;
            background: #1e293b;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
        }

        .progress-bar .fill-intact {
            background: linear-gradient(90deg, #059669, #10b981);
            transition: width 0.4s ease;
        }

        .progress-bar .fill-damaged {
            background: linear-gradient(90deg, #dc2626, #ef4444);
            transition: width 0.4s ease;
        }

        /* Image viewer */
        .image-card {
            background: var(--bg-card);
            border-radius: 18px;
            border: 1px solid var(--border);
            overflow: hidden;
            box-shadow: var(--shadow);
            margin-bottom: 22px;
        }

        .image-header {
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            background: rgba(255,255,255,0.02);
        }

        .image-counter {
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--accent-blue);
        }

        .image-name {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-family: monospace;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .image-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 16px;
            min-height: 400px;
            background: #0d1117;
        }

        .image-container img {
            max-width: 100%;
            max-height: 500px;
            border-radius: 8px;
            object-fit: contain;
            transition: transform 0.3s ease;
            cursor: zoom-in;
        }

        .image-container img.zoomed {
            transform: scale(1.8);
            cursor: zoom-out;
        }

        /* Action buttons */
        .actions {
            display: flex;
            gap: 14px;
            padding: 18px 20px;
            border-top: 1px solid var(--border);
            background: rgba(255,255,255,0.02);
        }

        .btn {
            flex: 1;
            padding: 16px 20px;
            border: none;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn-intact {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            box-shadow: 0 4px 20px rgba(16,185,129,0.3);
        }

        .btn-intact:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(16,185,129,0.5);
        }

        .btn-damaged {
            background: linear-gradient(135deg, #dc2626, #ef4444);
            color: white;
            box-shadow: 0 4px 20px rgba(239,68,68,0.3);
        }

        .btn-damaged:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(239,68,68,0.5);
        }

        .btn-skip {
            flex: 0.4;
            background: var(--bg-secondary);
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }

        .btn-skip:hover {
            background: #1e293b;
            color: var(--text-primary);
        }

        .btn:active { transform: scale(0.97); }

        /* Navigation */
        .nav-row {
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
        }

        .btn-nav {
            padding: 10px 18px;
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-secondary);
            border-radius: 10px;
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-nav:hover {
            border-color: var(--accent-blue);
            color: var(--text-primary);
        }

        .btn-finish {
            margin-left: auto;
            background: linear-gradient(135deg, #7c3aed, #8b5cf6);
            color: white;
            border: none;
            box-shadow: 0 4px 20px rgba(139,92,246,0.3);
        }

        .btn-finish:hover {
            box-shadow: 0 8px 30px rgba(139,92,246,0.5);
        }

        .btn-finish:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Keyboard hint */
        .keyboard-hint {
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.78rem;
            margin-bottom: 18px;
        }

        .keyboard-hint kbd {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 2px 8px;
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            color: var(--text-primary);
        }

        /* Done screen */
        .done-screen {
            text-align: center;
            padding: 60px 20px;
            display: none;
        }

        .done-screen.active { display: block; }

        .done-screen h2 {
            font-size: 2rem;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #10b981, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .done-screen p {
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        /* Responsive */
        @media (max-width: 600px) {
            .actions { flex-direction: column; }
            .btn-skip { flex: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 Acrosome Labeling Tool</h1>
            <p>Classify each sperm image as <strong>Intact</strong> or <strong>Damaged</strong></p>
        </div>

        <div class="progress-section">
            <div class="progress-stats">
                <span class="stat"><span class="dot green"></span> Intact: <strong id="intact-count">0</strong></span>
                <span class="stat"><span class="dot red"></span> Damaged: <strong id="damaged-count">0</strong></span>
                <span class="stat"><span class="dot gray"></span> Remaining: <strong id="remaining-count">0</strong></span>
                <span class="stat"><span class="dot blue"></span> Total: <strong id="total-count">0</strong></span>
            </div>
            <div class="progress-bar">
                <div class="fill-intact" id="intact-bar" style="width: 0%"></div>
                <div class="fill-damaged" id="damaged-bar" style="width: 0%"></div>
            </div>
        </div>

        <div class="keyboard-hint">
            Keyboard shortcuts: <kbd>←</kbd> Intact &nbsp; <kbd>→</kbd> Damaged &nbsp; <kbd>S</kbd> Skip &nbsp; <kbd>Z</kbd> Undo &nbsp; <kbd>Space</kbd> Zoom
        </div>

        <div id="labeling-view">
            <div class="image-card">
                <div class="image-header">
                    <span class="image-counter" id="image-counter">1 / 0</span>
                    <span class="image-name" id="image-name">loading...</span>
                </div>
                <div class="image-container">
                    <img id="current-image" src="" alt="Acrosome image" onclick="toggleZoom()">
                </div>
                <div class="actions">
                    <button class="btn btn-intact" onclick="labelImage('intact')" id="btn-intact">
                        ✅ Intact
                    </button>
                    <button class="btn btn-skip" onclick="skipImage()">
                        Skip
                    </button>
                    <button class="btn btn-damaged" onclick="labelImage('damaged')" id="btn-damaged">
                        ❌ Damaged
                    </button>
                </div>
            </div>

            <div class="nav-row">
                <button class="btn-nav" onclick="prevImage()">← Previous</button>
                <button class="btn-nav" onclick="goToNextUnlabeled()">Next Unlabeled →</button>
                <button class="btn-nav btn-finish" id="btn-finish" onclick="finishLabeling()">
                    🚀 Finish & Build Dataset
                </button>
            </div>
        </div>

        <div class="done-screen" id="done-screen">
            <h2>✅ Dataset Created!</h2>
            <p id="done-summary"></p>
            <p style="margin-top: 20px; color: #10b981; font-weight: 600;" id="done-path"></p>
            <p style="margin-top: 10px; color: var(--text-secondary); font-size: 0.85rem;">
                You can now close this page and run the training script.
            </p>
        </div>
    </div>

    <script>
        let images = [];
        let labels = {};
        let currentIndex = 0;

        async function init() {
            const resp = await fetch('/api/status');
            const data = await resp.json();
            images = data.images;
            labels = data.labels;
            updateUI();
        }

        function updateUI() {
            const intactCount = Object.values(labels).filter(l => l === 'intact').length;
            const damagedCount = Object.values(labels).filter(l => l === 'damaged').length;
            const labeled = intactCount + damagedCount;
            const total = images.length;

            document.getElementById('intact-count').textContent = intactCount;
            document.getElementById('damaged-count').textContent = damagedCount;
            document.getElementById('remaining-count').textContent = total - labeled;
            document.getElementById('total-count').textContent = total;

            const intactPct = total > 0 ? (intactCount / total * 100) : 0;
            const damagedPct = total > 0 ? (damagedCount / total * 100) : 0;
            document.getElementById('intact-bar').style.width = intactPct + '%';
            document.getElementById('damaged-bar').style.width = damagedPct + '%';

            if (images.length > 0) {
                const img = images[currentIndex];
                document.getElementById('current-image').src = '/api/image/' + encodeURIComponent(img);
                document.getElementById('image-counter').textContent = `${currentIndex + 1} / ${total}`;
                document.getElementById('image-name').textContent = img;

                // Highlight if already labeled
                const label = labels[img];
                document.getElementById('btn-intact').style.outline = label === 'intact' ? '3px solid #34d399' : 'none';
                document.getElementById('btn-damaged').style.outline = label === 'damaged' ? '3px solid #f87171' : 'none';
            }

            document.getElementById('btn-finish').disabled = labeled < 10;
        }

        async function labelImage(label) {
            const img = images[currentIndex];
            labels[img] = label;

            await fetch('/api/label', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: img, label: label })
            });

            // Auto-advance to next unlabeled
            goToNextUnlabeled();
        }

        function skipImage() {
            if (currentIndex < images.length - 1) {
                currentIndex++;
                updateUI();
            }
        }

        function prevImage() {
            if (currentIndex > 0) {
                currentIndex--;
                updateUI();
            }
        }

        function goToNextUnlabeled() {
            // Find next unlabeled image after current
            for (let i = currentIndex + 1; i < images.length; i++) {
                if (!labels[images[i]]) {
                    currentIndex = i;
                    updateUI();
                    return;
                }
            }
            // Wrap around
            for (let i = 0; i < currentIndex; i++) {
                if (!labels[images[i]]) {
                    currentIndex = i;
                    updateUI();
                    return;
                }
            }
            // All labeled - stay at current
            if (currentIndex < images.length - 1) {
                currentIndex++;
            }
            updateUI();
        }

        function toggleZoom() {
            document.getElementById('current-image').classList.toggle('zoomed');
        }

        async function finishLabeling() {
            const labeled = Object.keys(labels).length;
            if (labeled < 10) {
                alert('Please label at least 10 images before building the dataset.');
                return;
            }

            if (!confirm(`Build dataset with ${labeled} labeled images?`)) return;

            document.getElementById('btn-finish').textContent = '⏳ Building...';
            document.getElementById('btn-finish').disabled = true;

            const resp = await fetch('/api/build_dataset', { method: 'POST' });
            const result = await resp.json();

            if (result.success) {
                document.getElementById('labeling-view').style.display = 'none';
                document.getElementById('done-screen').classList.add('active');
                document.getElementById('done-summary').textContent =
                    `${result.intact_count} intact + ${result.damaged_count} damaged = ${result.total} images`;
                document.getElementById('done-path').textContent = `Dataset saved to: ${result.dataset_path}`;
            } else {
                alert('Error: ' + result.error);
                document.getElementById('btn-finish').textContent = '🚀 Finish & Build Dataset';
                document.getElementById('btn-finish').disabled = false;
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch(e.key) {
                case 'ArrowLeft':  e.preventDefault(); labelImage('intact'); break;
                case 'ArrowRight': e.preventDefault(); labelImage('damaged'); break;
                case 's': case 'S': skipImage(); break;
                case 'z': case 'Z': prevImage(); break;
                case ' ': e.preventDefault(); toggleZoom(); break;
            }
        });

        init();
    </script>
</body>
</html>
"""


# ─── API Routes ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(TEMPLATE)


@app.route("/api/status")
def api_status():
    images = sorted([f.name for f in Path(WORK_DIR).iterdir()
                     if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp')])
    labels = load_labels()
    return jsonify({"images": images, "labels": labels})


@app.route("/api/image/<path:filename>")
def api_image(filename):
    filepath = Path(WORK_DIR) / filename
    if filepath.exists():
        return send_file(str(filepath))
    return "Not found", 404


@app.route("/api/label", methods=["POST"])
def api_label():
    data = request.json
    labels = load_labels()
    labels[data["image"]] = data["label"]
    save_labels(labels)
    return jsonify({"ok": True})


@app.route("/api/build_dataset", methods=["POST"])
def api_build_dataset():
    """Organize labeled images into dataset/intact/ and dataset/damaged/ folders."""
    try:
        labels = load_labels()

        intact_dir = Path(DATASET_DIR) / "intact"
        damaged_dir = Path(DATASET_DIR) / "damaged"
        os.makedirs(intact_dir, exist_ok=True)
        os.makedirs(damaged_dir, exist_ok=True)

        intact_count = 0
        damaged_count = 0

        for image_name, label in labels.items():
            src = Path(WORK_DIR) / image_name
            if not src.exists():
                continue

            if label == "intact":
                shutil.copy2(src, intact_dir / image_name)
                intact_count += 1
            elif label == "damaged":
                shutil.copy2(src, damaged_dir / image_name)
                damaged_count += 1

        return jsonify({
            "success": True,
            "intact_count": intact_count,
            "damaged_count": damaged_count,
            "total": intact_count + damaged_count,
            "dataset_path": str(DATASET_DIR),
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ─── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Acrosome Image Labeling Tool")
    parser.add_argument("--source", type=str, required=True,
                        help="Path to folder with mixed images")
    parser.add_argument("--port", type=int, default=5555)
    args = parser.parse_args()

    SOURCE_DIR = args.source
    WORK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_prep")
    DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
    LABELS_FILE = os.path.join(WORK_DIR, "_labels.json")

    print("=" * 60)
    print("ACROSOME IMAGE LABELING TOOL")
    print("=" * 60)
    print(f"  Source folder : {SOURCE_DIR}")
    print(f"  Working dir   : {WORK_DIR}")
    print(f"  Dataset dir   : {DATASET_DIR}")
    print("=" * 60)

    # Step 1: Prepare images
    print("\n[STEP 1] Preparing images (de-duplicate + convert HEIC)...")
    images = prepare_images(SOURCE_DIR, WORK_DIR)

    if not images:
        print("[ERROR] No images found. Check your source folder.")
        sys.exit(1)

    # Step 2: Launch web UI
    print(f"\n[STEP 2] Starting labeling server...")
    print(f"\n  >>> Open your browser at: http://localhost:{args.port}")
    print(f"  >>> Label images as 'intact' or 'damaged'")
    print(f"  >>> When done, click 'Finish & Build Dataset'\n")

    app.run(host="0.0.0.0", port=args.port, debug=False)
