"""
Quick analysis script - Analyze a single image using the trained model.
Usage: python analyze_image.py <image_path>
"""
import os
import sys
import json
import numpy as np

# Set up path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def analyze(image_path):
    print("=" * 60)
    print("ACROSOME INTACTNESS ANALYSIS")
    print("=" * 60)
    print(f"  Image: {image_path}")
    print("=" * 60)

    # Verify file exists
    if not os.path.exists(image_path):
        print(f"[ERROR] File not found: {image_path}")
        return

    # Load the image bytes
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"\n[1/3] Loading model...")
    from app.ml.predict import predict_single, get_model_info

    model_info = get_model_info()
    print(f"  Model status: {model_info['status']}")
    if model_info['status'] == 'loaded':
        print(f"  Model path  : {model_info['model_path']}")
        print(f"  Parameters  : {model_info.get('total_params', 'N/A'):,}")

    print(f"\n[2/3] Running inference...")
    result = predict_single(image_bytes)

    print(f"\n[3/3] RESULTS:")
    print("-" * 40)
    print(f"  Classification : {result['classification'].upper()}")
    print(f"  Confidence     : {result['confidence'] * 100:.1f}%")
    print(f"  Intact prob    : {result['intact_probability'] * 100:.1f}%")
    print(f"  Damaged prob   : {result['damaged_probability'] * 100:.1f}%")
    print(f"  Processing time: {result['processing_time_ms']:.1f} ms")
    print("-" * 40)

    if result['classification'] == 'intact':
        print("\n  >> The acrosome appears INTACT")
        print(f"     The model is {result['confidence'] * 100:.1f}% confident")
    else:
        print("\n  >> The acrosome appears DAMAGED")
        print(f"     The model is {result['confidence'] * 100:.1f}% confident")

    print("\n" + "=" * 60)
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_image.py <image_path>")
        print("Example: python analyze_image.py test_sample.png")
        sys.exit(1)

    analyze(sys.argv[1])
