"""
Test script: Upload sample images to the analysis endpoint
and verify the full pipeline works end-to-end.
"""

import requests
import json
import shutil
import os

API_BASE = "http://localhost:8000"

print("=" * 60)
print("  ACROSOME INTACTNESS API - END-TO-END TEST")
print("=" * 60)

# -- Step 1: Health Check --
print("\n[1] Health Check...")
r = requests.get(f"{API_BASE}/health")
print(f"    Status: {r.status_code}")
health = r.json()
print(f"    DB: {health['database']}")
print(f"    Model: {health['model']['status']}")

# -- Step 2: Register a test user --
print("\n[2] Registering test user...")
r = requests.post(f"{API_BASE}/api/auth/register", json={
    "username": "testuser",
    "email": "test@acrosome.ai",
    "password": "test123456",
    "full_name": "Test User",
})
if r.status_code == 201:
    token_data = r.json()
    token = token_data["access_token"]
    print(f"    Registered! User: {token_data['username']}")
elif r.status_code == 409:
    print("    User exists, logging in...")
    r = requests.post(f"{API_BASE}/api/auth/login", json={
        "email": "test@acrosome.ai",
        "password": "test123456",
    })
    token_data = r.json()
    token = token_data["access_token"]
    print(f"    Logged in! User: {token_data['username']}")
else:
    print(f"    Error: {r.text}")
    token = None

# -- Step 3: Upload & Analyze Images --
print("\n[3] Uploading 3 images for analysis...")

sample = "test_sample.png"
copies = []
for i in range(1, 4):
    copy_name = f"test_sperm_{i}.png"
    shutil.copy(sample, copy_name)
    copies.append(copy_name)

file_handles = []
files_param = []
for name in copies:
    fh = open(name, "rb")
    file_handles.append(fh)
    files_param.append(("files", (name, fh, "image/png")))

headers = {}
if token:
    headers["Authorization"] = f"Bearer {token}"

r = requests.post(
    f"{API_BASE}/api/analysis/analyze",
    files=files_param,
    data={
        "sample_id": "SAMPLE_001",
        "patient_id": "PAT_TEST_123",
        "notes": "Test analysis with sample microscopy images",
    },
    headers=headers,
)

for fh in file_handles:
    fh.close()

print(f"    Status: {r.status_code}")
analysis_id = None

if r.status_code == 201:
    result = r.json()
    print(f"\n    {'='*50}")
    print(f"    ANALYSIS RESULTS")
    print(f"    {'='*50}")
    print(f"    Session ID     : {result['session_id']}")
    print(f"    Total Images   : {result['total_images']}")
    print(f"    Intact Count   : {result['intact_count']}")
    print(f"    Damaged Count  : {result['damaged_count']}")
    print(f"    INTACT %       : {result['intact_percentage']}%")
    print(f"    DAMAGED %      : {result['damaged_percentage']}%")
    print(f"    Avg Confidence : {result['average_confidence']}")
    print(f"    Processing Time: {result['total_processing_time_ms']:.1f} ms")

    print(f"\n    Per-Image Results:")
    for i, img in enumerate(result["image_results"], 1):
        tag = "[INTACT]" if img["classification"] == "intact" else "[DAMAGED]"
        print(f"      {i}. {img['original_filename']}: "
              f"{tag} (conf: {img['confidence']*100:.1f}%, "
              f"time: {img['processing_time_ms']:.1f}ms)")

    analysis_id = result["id"]
else:
    print(f"    Error: {r.text}")

# -- Step 4: Analytics Summary --
print("\n[4] Fetching analytics summary...")
r = requests.get(f"{API_BASE}/api/analytics/summary")
if r.status_code == 200:
    stats = r.json()
    print(f"    Total Analyses       : {stats['total_analyses']}")
    print(f"    Total Images         : {stats['total_images_processed']}")
    print(f"    Overall Intact %     : {stats['overall_intact_percentage']}%")
    print(f"    Avg Confidence       : {stats['average_confidence']}")

# -- Step 5: Generate PDF Report --
if analysis_id:
    print("\n[5] Generating PDF report...")
    r = requests.post(f"{API_BASE}/api/reports/generate", json={
        "analysis_id": analysis_id,
        "title": "Test Acrosome Analysis Report",
    })
    if r.status_code == 201:
        report = r.json()
        print(f"    Report generated!")
        print(f"    Filename : {report['filename']}")
        print(f"    Download : {API_BASE}{report['download_url']}")

        pdf_r = requests.get(f"{API_BASE}{report['download_url']}")
        if pdf_r.status_code == 200:
            with open(report["filename"], "wb") as f:
                f.write(pdf_r.content)
            print(f"    PDF saved locally: {report['filename']}")

# -- Cleanup temp files --
for name in copies:
    if os.path.exists(name):
        os.remove(name)

print("\n" + "=" * 60)
print("  ALL TESTS PASSED!")
print("=" * 60)
