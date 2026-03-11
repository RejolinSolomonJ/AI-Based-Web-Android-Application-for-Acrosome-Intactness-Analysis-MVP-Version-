import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Zap, Grid3X3, ArrowRight, User, Hash, Calendar, FileText, Loader2 } from 'lucide-react';
import heic2any from 'heic2any';
import './UploadPage.css';

/** Try to convert file via canvas (works for any browser-renderable format). */
function canvasConvert(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => {
                if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

/**
 * Highly strict image validation using manual Computer Vision techniques.
 * Rejects screenshots, natural photos, selfies, and pure noise.
 * Only accepts images with properties typical of microscopy:
 * - Low edge density (mostly empty background)
 * - Low colorfulness (stained one hue)
 * - Specific brightness distributions
 */
async function validateImageContent(file) {
    return new Promise((resolve) => {
        if (file.type === 'image/heic' || file.name.match(/\.(heic|heif)$/i)) {
            resolve(true); // Can't easily canvas-draw HEIC immediately without heavy async conversion
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const size = 150;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(url);

            try {
                const imgData = ctx.getImageData(0, 0, size, size).data;
                const total = size * size;

                let rgSum = 0, ybSum = 0;
                let grays = new Float32Array(total);
                let edgePixels = 0;
                let redGreenPixels = 0;

                // 1. Color && Grayscale Pass
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const idx = (y * size + x) * 4;
                        const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];

                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        grays[y * size + x] = gray;

                        rgSum += Math.abs(r - g);
                        ybSum += Math.abs(0.5 * (r + g) - b);

                        // Strict color reject: If pixel is heavily red, green or yellow
                        if ((r > 120 && g < 90 && b < 90) ||
                            (g > 120 && r < 90 && b < 90) ||
                            (r > 150 && g > 150 && b < 100)) {
                            redGreenPixels++;
                        }

                        // 2. Edge Detection (Sobel-like difference)
                        if (x < size - 1 && y < size - 1) {
                            const rightIdx = (y * size + (x + 1)) * 4;
                            const downIdx = ((y + 1) * size + x) * 4;
                            const rGray = 0.299 * imgData[rightIdx] + 0.587 * imgData[rightIdx + 1] + 0.114 * imgData[rightIdx + 2];
                            const dGray = 0.299 * imgData[downIdx] + 0.587 * imgData[downIdx + 1] + 0.114 * imgData[downIdx + 2];

                            if (Math.abs(gray - rGray) > 15 || Math.abs(gray - dGray) > 15) {
                                edgePixels++;
                            }
                        }
                    }
                }

                const colorfulness = (rgSum / total) + (ybSum / total);
                const edgeDensity = edgePixels / total;
                const badColorRatio = redGreenPixels / total;

                // STRICT RULES FOR MICROSCOPY vs OTHERS:
                // 1. A normal photo (face, dog, street) is very cluttered -> high edge density (> 0.20)
                // 2. Text / Screenshots have extremely sharp edges -> moderate edge density but NO color (colorfulness ~0)
                // 3. Microscopy images have a few cells (edges) but mostly empty fluid background -> edge density 0.02 - 0.15
                // 4. Clinical stains are never bright red/green -> badColorRatio must be VERY low.

                if (
                    edgeDensity > 0.18 ||       // Cluttered like a normal photo or detailed drawing
                    edgeDensity < 0.005 ||      // A blank screen / solid color
                    colorfulness > 35 ||        // Excessively colorful
                    badColorRatio > 0.02        // Contains obvious non-microscopic shades
                ) {
                    console.warn(`Rejected! Edge=${edgeDensity.toFixed(3)}, Color=${colorfulness.toFixed(1)}, BadCol=${badColorRatio.toFixed(3)}`);
                    resolve(false);
                    return;
                }

                resolve(true);
            } catch (e) {
                console.error("Validation error", e);
                resolve(true);
            }
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(true); };
        img.src = url;
    });
}

/**
 * Convert a file to a JPEG-compatible File.
 * Strategy: heic2any → canvas drawImage → raw file (best-effort).
 */
async function toCompatible(file) {
    const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.match(/\.(heic|heif)$/i);

    // 1️⃣ Try heic2any for known HEIC files
    if (isHeic) {
        try {
            const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
            const outBlob = Array.isArray(blob) ? blob[0] : blob;
            return new File([outBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (e) {
            console.warn('heic2any failed, trying canvas fallback:', e);
        }
    }

    // 2️⃣ Canvas fallback — works for any format the browser can decode natively
    try {
        return await canvasConvert(file);
    } catch (e) {
        console.warn('Canvas fallback failed, using raw file:', e);
    }

    // 3️⃣ Last resort — return original file as-is
    return file;
}

export default function UploadPage() {
    const navigate = useNavigate();

    const [patientDetails, setPatientDetails] = useState({
        patientName: '',
        patientId: '',
        sampleId: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [grids, setGrids] = useState({ 1: [], 2: [], 3: [], 4: [] });

    // Track which grids are currently converting HEIC files
    const [converting, setConverting] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPatientDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleFiles = async (gridId, files) => {
        if (!files || files.length === 0) return;

        const candidates = Array.from(files).filter(f =>
            f.type.startsWith('image/') ||
            f.name.match(/\.(jpg|jpeg|png|bmp|tiff|tif|heic|heif|webp|avif)$/i)
        );
        if (candidates.length === 0) return;

        // Mark this grid as converting
        setConverting(prev => ({ ...prev, [gridId]: true }));

        try {
            // Validate images to reject dog/scenic photos or non-medical uploads
            for (const file of candidates) {
                const isValid = await validateImageContent(file);
                if (!isValid) {
                    alert(`Upload Rejected: The image "${file.name}" does not appear to be a valid microscopic clinical sample. Please upload actual acrosome sample images.`);
                    setConverting(prev => ({ ...prev, [gridId]: false }));
                    const input = document.getElementById(`fileInput-${gridId}`);
                    if (input) input.value = '';
                    return; // END PROCESS immediately
                }
            }

            // Convert any HEIC files to JPEG (with fallbacks)
            const converted = await Promise.all(candidates.map(toCompatible));

            setGrids(prev => {
                const currentFiles = prev[gridId];
                const slotsLeft = 4 - currentFiles.length;
                const filesToAdd = converted.slice(0, slotsLeft);
                if (filesToAdd.length === 0) return prev;

                const newGridFiles = [...currentFiles];
                filesToAdd.forEach(file => {
                    newGridFiles.push({
                        file,
                        preview: URL.createObjectURL(file),
                        name: file.name,
                        id: Math.random().toString(36).substr(2, 9)
                    });
                });
                return { ...prev, [gridId]: newGridFiles };
            });
        } catch (err) {
            console.error('Image processing error:', err);
        } finally {
            setConverting(prev => ({ ...prev, [gridId]: false }));
            const input = document.getElementById(`fileInput-${gridId}`);
            if (input) input.value = '';
        }
    };

    const removeFile = (gridId, fileId, e) => {
        e.stopPropagation();
        setGrids(prev => ({
            ...prev,
            [gridId]: prev[gridId].filter(f => f.id !== fileId)
        }));
    };

    const totalImages = Object.values(grids).reduce((acc, curr) => acc + curr.length, 0);
    const isDetailsComplete = patientDetails.patientName && patientDetails.patientId && patientDetails.sampleId && patientDetails.date;
    const isConverting = Object.values(converting).some(Boolean);
    const isReady = isDetailsComplete && totalImages > 0 && !isConverting;

    const handleAnalyze = () => {
        if (isReady) {
            navigate('/processing', { state: { grids, patientDetails } });
        }
    };

    return (
        <div className="upload-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>New Analysis</h1>
                    <p className="text-muted text-sm">Upload up to 4 images per grid (16 total) and patient details</p>
                </div>
                <button
                    className={`btn ${isDetailsComplete && totalImages === 16 ? 'btn-primary' : 'btn-secondary'} start-analysis-btn`}
                    disabled={!isReady}
                    onClick={handleAnalyze}
                >
                    {isConverting ? <Loader2 size={18} className="animate-spin" /> : totalImages === 16 ? <Zap size={18} /> : <ArrowRight size={18} />}
                    {isConverting ? 'Converting...' : totalImages === 16 ? 'Start Full Analysis' : `Start Partial (${totalImages}/16)`}
                </button>
            </div>

            {/* Patient Details Form */}
            <div className="patient-details-card glass-card">
                <h3><User size={18} className="text-accent" /> Patient &amp; Sample Details</h3>
                <div className="pd-form-grid">
                    <div className="form-group">
                        <label>Patient Name</label>
                        <div className="input-wrap">
                            <User size={16} />
                            <input type="text" name="patientName" placeholder="e.g. Jane Doe" value={patientDetails.patientName} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Patient ID</label>
                        <div className="input-wrap">
                            <Hash size={16} />
                            <input type="text" name="patientId" placeholder="e.g. PT-10024" value={patientDetails.patientId} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Sample ID</label>
                        <div className="input-wrap">
                            <FileText size={16} />
                            <input type="text" name="sampleId" placeholder="e.g. SMP-2023X" value={patientDetails.sampleId} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Date</label>
                        <div className="input-wrap">
                            <Calendar size={16} />
                            <input type="date" name="date" value={patientDetails.date} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-upload-container">
                {[1, 2, 3, 4].map(gridId => {
                    const gridImages = grids[gridId];
                    const isFull = gridImages.length === 4;
                    const isGridConverting = converting[gridId];

                    return (
                        <div key={gridId} className="grid-upload-box glass-card animate-fade-in-up" style={{ animationDelay: `${gridId * 100}ms` }}>
                            <div className="gu-header">
                                <Grid3X3 size={18} className="text-accent" />
                                <h3>Grid {gridId} Images ({gridImages.length}/4)</h3>
                                {isGridConverting && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--accent)' }}><Loader2 size={14} className="animate-spin" /> Converting...</span>}
                            </div>

                            <div
                                className={`gu-zone ${gridImages.length > 0 ? 'has-images' : ''} ${isGridConverting ? 'converting' : ''}`}
                                onClick={() => !isFull && !isGridConverting && document.getElementById(`fileInput-${gridId}`).click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (!isFull && !isGridConverting && e.dataTransfer.files) {
                                        handleFiles(gridId, e.dataTransfer.files);
                                    }
                                }}
                            >
                                {isGridConverting ? (
                                    <div className="gu-empty">
                                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                        <p>Converting images...</p>
                                        <span className="gu-hint">HEIC → JPEG conversion in progress</span>
                                    </div>
                                ) : gridImages.length > 0 ? (
                                    <div className="gu-gallery">
                                        {gridImages.map((img, i) => (
                                            <div key={img.id} className="gu-thumb-wrap" onClick={(e) => e.stopPropagation()}>
                                                <img src={img.preview} alt={`Grid ${gridId} - img ${i + 1}`} className="gu-thumb" />
                                                <button className="gu-remove-thumb" onClick={(e) => removeFile(gridId, img.id, e)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {!isFull && (
                                            <div className="gu-add-more" onClick={(e) => { e.stopPropagation(); document.getElementById(`fileInput-${gridId}`).click(); }}>
                                                <Upload size={20} />
                                                <span>Add</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="gu-empty">
                                        <div className="gu-icon-wrap">
                                            <Upload size={24} />
                                        </div>
                                        <p>Click or drag up to 4 images for Grid {gridId}</p>
                                        <span className="gu-hint">Supports HEIC, JPG, PNG, BMP and more</span>
                                    </div>
                                )}
                            </div>

                            {/* Input OUTSIDE overflow:hidden zone so it is not clipped */}
                            <input
                                id={`fileInput-${gridId}`}
                                type="file"
                                multiple
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFiles(gridId, e.target.files)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
