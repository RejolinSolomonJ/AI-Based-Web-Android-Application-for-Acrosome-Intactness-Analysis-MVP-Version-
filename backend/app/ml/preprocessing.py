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

TARGET_SIZE = (settings.IMAGE_SIZE, settings.IMAGE_SIZE)


def _is_heic(data: bytes) -> bool:
    """Detect HEIC/HEIF by checking the ftyp box in the file header."""
    # HEIC files have 'ftyp' at offset 4 and 'heic'/'heif'/'mif1'/'msf1' at offset 8
    if len(data) < 12:
        return False
    ftyp_marker = data[4:8]
    brand = data[8:12]
    return ftyp_marker == b'ftyp' and brand in (b'heic', b'heix', b'heif', b'hevx', b'mif1', b'msf1')


def _heic_bytes_to_jpeg(data: bytes) -> bytes:
    """Convert HEIC/HEIF bytes to JPEG bytes using pillow-heif."""
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()
    except Exception as e:
        raise ValueError(f"Failed to convert HEIC image: {e}")


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load an image from raw bytes into a BGR numpy array.
    Automatically converts HEIC/HEIF to JPEG if needed."""
    # Auto-convert HEIC before passing to OpenCV (which doesn't support HEIC)
    if _is_heic(image_bytes):
        image_bytes = _heic_bytes_to_jpeg(image_bytes)

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        # Fallback: try PIL for formats OpenCV struggles with
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception:
            raise ValueError("Could not decode image from bytes.")
    return image



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
    Validate that an uploaded file is an acceptable image.

    Returns:
        (is_valid, error_message)
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed = settings.allowed_extensions_list

    print(f"[VALIDATE] file='{filename}' ext='{ext}' allowed={allowed}")

    if ext not in allowed:
        msg = f"File type '.{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        print(f"[VALIDATE] REJECTED: {msg}")
        return False, msg

    if file_size > settings.MAX_FILE_SIZE:
        max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
        msg = f"File size exceeds {max_mb:.0f} MB limit."
        print(f"[VALIDATE] REJECTED: {msg}")
        return False, msg

    print(f"[VALIDATE] ACCEPTED: {filename}")
    return True, ""
