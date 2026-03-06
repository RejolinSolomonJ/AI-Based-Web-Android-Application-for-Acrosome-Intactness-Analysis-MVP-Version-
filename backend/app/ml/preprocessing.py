"""
Image preprocessing pipeline for acrosome microscopic images.

Handles:
  - Image loading & validation
  - Resizing to model input size (224×224)
  - Color-space normalization
  - Contrast enhancement (CLAHE) for microscopy
  - Noise reduction
  - Batch preprocessing
"""

import io
from typing import Union

import cv2
import numpy as np
from PIL import Image

from app.config import settings

# Register pillow-heif at import time so PIL can open HEIC files everywhere
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    print("[INFO] pillow-heif registered successfully")
except Exception as _heif_err:
    print(f"[WARN] pillow-heif not available: {_heif_err}")

TARGET_SIZE = (settings.IMAGE_SIZE, settings.IMAGE_SIZE)


def _is_heic(data: bytes) -> bool:
    """Detect HEIC/HEIF by checking the ftyp box in the file header."""
    if len(data) < 12:
        return False
    ftyp_marker = data[4:8]
    brand = data[8:12]
    return ftyp_marker == b'ftyp' and brand in (b'heic', b'heix', b'heif', b'hevx', b'mif1', b'msf1')


def _heic_bytes_to_jpeg(data: bytes) -> bytes:
    """Convert HEIC/HEIF bytes to JPEG bytes using pillow-heif."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Load an image from raw bytes into a BGR numpy array.
    Uses a 4-stage fallback strategy to handle HEIC, WebP and other exotic formats.
    """
    original_bytes = image_bytes

    # Stage 1 – HEIC magic-byte detection → convert to JPEG first
    if _is_heic(image_bytes):
        try:
            image_bytes = _heic_bytes_to_jpeg(image_bytes)
        except Exception as e:
            print(f"[WARN] HEIC→JPEG conversion failed ({e}), falling back to PIL direct open")
            image_bytes = original_bytes  # restore for next stages

    # Stage 2 – OpenCV direct decode (fast path for JPEG/PNG/BMP)
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            return img
    except Exception:
        pass

    # Stage 3 – PIL with pillow-heif registered (handles HEIC, WebP, TIFF, etc.)
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"[WARN] PIL decode failed: {e}")

    # Stage 4 – PIL on original bytes (last resort for unconverted HEIC)
    try:
        pil_img = Image.open(io.BytesIO(original_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Could not decode image from bytes (all methods failed): {e}")




def load_image_from_path(image_path: str) -> np.ndarray:
    """Load an image from a file path into a BGR numpy array."""
    image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Could not load image from: {image_path}")
    return image


def enhance_microscopy_image(image: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    to enhance contrast in microscopic images.
    This is critical for acrosome visibility under the microscope.
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    # Apply CLAHE to the L (lightness) channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)

    # Merge channels back
    enhanced_lab = cv2.merge([l_enhanced, a_channel, b_channel])
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    return enhanced_bgr


def denoise_image(image: np.ndarray) -> np.ndarray:
    """Apply Gaussian blur for mild noise reduction."""
    return cv2.GaussianBlur(image, (3, 3), 0)


def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize pixel values to [0, 1] range for model input."""
    return image.astype(np.float32) / 255.0


def resize_image(image: np.ndarray, target_size: tuple = TARGET_SIZE) -> np.ndarray:
    """Resize image maintaining aspect-safe resize (center crop after resize)."""
    h, w = image.shape[:2]
    target_h, target_w = target_size

    # Calculate scale to cover the target area
    scale = max(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # Center crop
    start_x = (new_w - target_w) // 2
    start_y = (new_h - target_h) // 2
    cropped = resized[start_y:start_y + target_h, start_x:start_x + target_w]

    return cropped


def preprocess_single_image(
    image: np.ndarray,
    enhance: bool = True,
    denoise: bool = True,
) -> np.ndarray:
    """
    Full preprocessing pipeline for a single microscopy image.

    Steps:
      1. Resize to 224×224 (center crop)
      2. Denoise (optional)
      3. CLAHE enhancement (optional)
      4. BGR → RGB conversion
      5. Normalize to [0, 1]

    Returns:
        np.ndarray of shape (224, 224, 3) with float32 values in [0, 1]
    """
    # Step 1: Resize
    image = resize_image(image, TARGET_SIZE)

    # Step 2: Denoise
    if denoise:
        image = denoise_image(image)

    # Step 3: CLAHE enhancement for microscopy contrast
    if enhance:
        image = enhance_microscopy_image(image)

    # Step 4: BGR → RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Step 5: Normalize
    image = normalize_image(image)

    return image


def preprocess_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load from bytes and preprocess for model inference."""
    raw = load_image_from_bytes(image_bytes)
    return preprocess_single_image(raw)


def preprocess_from_path(image_path: str) -> np.ndarray:
    """Load from file path and preprocess for model inference."""
    raw = load_image_from_path(image_path)
    return preprocess_single_image(raw)


def preprocess_batch(images: list[np.ndarray]) -> np.ndarray:
    """
    Preprocess a batch of raw images for bulk inference.

    Args:
        images: List of BGR numpy arrays

    Returns:
        np.ndarray of shape (N, 224, 224, 3)
    """
    processed = [preprocess_single_image(img) for img in images]
    return np.array(processed, dtype=np.float32)


def validate_image_file(filename: str, file_size: int) -> tuple[bool, str]:
    """
    Validate uploaded file — accepts any extension, only rejects oversized files.
    Actual image decoding handles format validation downstream.
    """
    if file_size == 0:
        return False, "Empty file."
    if file_size > settings.MAX_FILE_SIZE:
        max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
        return False, f"File size exceeds {max_mb:.0f} MB limit."
    return True, ""

