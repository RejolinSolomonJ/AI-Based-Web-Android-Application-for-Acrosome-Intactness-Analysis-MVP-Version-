import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Zap, Grid3X3, ArrowRight, User, Hash, Calendar, FileText } from 'lucide-react';
import './UploadPage.css';

export default function UploadPage() {
    const navigate = useNavigate();

    const [patientDetails, setPatientDetails] = useState({
        patientName: '',
        patientId: '',
        sampleId: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [grids, setGrids] = useState({
        1: [],
        2: [],
        3: [],
        4: []
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPatientDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleFiles = (gridId, files) => {
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter(f =>
            ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'].includes(f.type)
        );

        setGrids(prev => {
            const currentFiles = prev[gridId];
            const slotsLeft = 4 - currentFiles.length;
            const filesToAdd = validFiles.slice(0, slotsLeft);

            if (filesToAdd.length === 0) return prev;

            const newGridFiles = [...currentFiles];

            filesToAdd.forEach(file => {
                const fileObj = {
                    file,
                    preview: URL.createObjectURL(file),
                    name: file.name,
                    id: Math.random().toString(36).substr(2, 9)
                };
                newGridFiles.push(fileObj);
            });

            return { ...prev, [gridId]: newGridFiles };
        });

        // Reset file input
        const input = document.getElementById(`fileInput-${gridId}`);
        if (input) input.value = '';
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
    const isReady = isDetailsComplete && totalImages > 0; // Allow partial start but encourage 16

    const handleAnalyze = () => {
        if (isReady) {
            navigate('/processing');
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
                    {totalImages === 16 ? <Zap size={18} /> : <ArrowRight size={18} />}
                    {totalImages === 16 ? 'Start Full Analysis' : `Start Partial (${totalImages}/16)`}
                </button>
            </div>

            {/* Patient Details Form */}
            <div className="patient-details-card glass-card">
                <h3><User size={18} className="text-accent" /> Patient & Sample Details</h3>
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

                    return (
                        <div key={gridId} className="grid-upload-box glass-card animate-fade-in-up" style={{ animationDelay: `${gridId * 100}ms` }}>
                            <div className="gu-header">
                                <Grid3X3 size={18} className="text-accent" />
                                <h3>Grid {gridId} Images ({gridImages.length}/4)</h3>
                            </div>

                            <div
                                className={`gu-zone ${gridImages.length > 0 ? 'has-images' : ''}`}
                                onClick={() => !isFull && document.getElementById(`fileInput-${gridId}`).click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (!isFull && e.dataTransfer.files) {
                                        handleFiles(gridId, e.dataTransfer.files);
                                    }
                                }}
                            >
                                {gridImages.length > 0 ? (
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
                                        <span className="gu-hint">Expected: 1 image per acrosome (4 total)</span>
                                    </div>
                                )}

                                <input
                                    id={`fileInput-${gridId}`}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleFiles(gridId, e.target.files)}
                                    disabled={isFull}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
