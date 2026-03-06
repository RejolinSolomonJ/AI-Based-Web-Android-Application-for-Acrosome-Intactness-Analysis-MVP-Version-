import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Check, Loader2, Upload, Settings, Grid3X3, ScanSearch, Crop,
    Layers, Hash, Percent, ImagePlus, FileText, ArrowRight, AlertCircle
} from 'lucide-react';
import { getPipelineSteps, analyzeImages } from '../services/api';
import CircularProgress from '../components/CircularProgress';
import './ProcessingPage.css';

const stepIcons = {
    upload: Upload, settings: Settings, grid: Grid3X3, scan: ScanSearch,
    crop: Crop, layers: Layers, hash: Hash, percent: Percent,
    image: ImagePlus, 'file-text': FileText,
};

export default function ProcessingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { grids, patientDetails } = location.state || {};

    const [currentStep, setCurrentStep] = useState(0);
    const [activeTab, setActiveTab] = useState('pipeline');
    const [apiResult, setApiResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const steps = getPipelineSteps();

    // ── Call API on Mount ──
    useEffect(() => {
        if (!grids || !patientDetails) {
            setError("No data provided for analysis. Please go back to Upload page.");
            setLoading(false);
            return;
        }

        async function performAnalysis() {
            try {
                // Flatten all files from grids
                const filesToUpload = Object.values(grids).flat().map(item => item.file);

                const result = await analyzeImages(
                    filesToUpload,
                    patientDetails.sampleId,
                    patientDetails.patientId,
                    `Patient: ${patientDetails.patientName}`
                );

                setApiResult(result);
            } catch (err) {
                console.error("Analysis Error:", err);
                setError(err.message || "An unexpected error occurred during analysis.");
            } finally {
                setLoading(false);
            }
        }

        performAnalysis();
    }, [grids, patientDetails]);

    // ── Pipeline Animation ──
    useEffect(() => {
        if (activeTab !== 'pipeline') return;

        // Advance steps every 1s, but wait at the last step for API if not done
        if (currentStep < steps.length - 1) {
            const timer = setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
            return () => clearTimeout(timer);
        } else if (currentStep === steps.length - 1 && apiResult) {
            // Finish when API is done
            const timer = setTimeout(() => setCurrentStep(steps.length), 500);
            return () => clearTimeout(timer);
        }
    }, [currentStep, steps.length, activeTab, apiResult]);

    const pipelineDone = currentStep >= steps.length;

    // Map API result to the format expected by the UI
    const results = useMemo(() => {
        if (!apiResult) return null;

        // Group image results into 4 grids (assuming we uploaded 16 images)
        const gridsData = [];
        for (let i = 0; i < 4; i++) {
            const gridId = i + 1;
            const slice = apiResult.image_results.slice(i * 4, (i + 1) * 4);
            gridsData.push({
                id: gridId,
                acrosomes: slice.map((r, idx) => ({
                    id: `A${i * 4 + idx + 1}`,
                    isIntact: r.classification === 'Intact' || r.classification === 'INTACT',
                    confidence: r.confidence
                })),
                intactCount: slice.filter(r => r.classification === 'Intact' || r.classification === 'INTACT').length
            });
        }

        return {
            grids: gridsData,
            totalIntact: apiResult.intact_count,
            total: apiResult.total_images,
            intactPct: apiResult.intact_percentage
        };
    }, [apiResult]);

    if (error) {
        return (
            <div className="processing-page animate-fade-in">
                <div className="card error-card animate-pulse" style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 40 }}>
                    <AlertCircle size={48} className="text-error" style={{ marginBottom: 20 }} />
                    <h2 className="text-error">Analysis Error</h2>
                    <p>{error}</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/upload')} style={{ marginTop: 20 }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="processing-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>AI Processing</h1>
                    <p className="text-muted text-sm">Pipeline, grid visualization &amp; classification results</p>
                </div>
                <button className="btn btn-primary" disabled={!pipelineDone} onClick={() => navigate('/report', { state: { analysis: apiResult } })}>
                    View Report <ArrowRight size={16} />
                </button>
            </div>

            {/* ── Tab Bar ── */}
            <div className="proc-tabs card">
                <button
                    className={`proc-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pipeline')}
                >
                    <Cpu size={16} /> Pipeline
                    {pipelineDone && <Check size={14} className="tab-check" />}
                </button>
                <button
                    className={`proc-tab ${activeTab === 'grid' ? 'active' : ''}`}
                    disabled={!apiResult}
                    onClick={() => setActiveTab('grid')}
                >
                    <Grid3X3 size={16} /> Grid Split
                </button>
                <button
                    className={`proc-tab ${activeTab === 'classification' ? 'active' : ''}`}
                    disabled={!apiResult}
                    onClick={() => setActiveTab('classification')}
                >
                    <Layers size={16} /> Classification
                </button>
            </div>

            {/* ═══════════════════════════════════════
          TAB 1 — PIPELINE
         ═══════════════════════════════════════ */}
            {activeTab === 'pipeline' && (
                <div className="tab-content animate-fade-in">
                    <div className="processing-layout">
                        {/* Stepper */}
                        <div className="stepper-section glass-card">
                            <div className="stepper">
                                {steps.map((step, i) => {
                                    const StepIcon = stepIcons[step.icon] || Settings;
                                    const isDone = i < currentStep;
                                    const isCurrent = i === currentStep && !pipelineDone;
                                    return (
                                        <div key={step.id} className={`step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                            <div className="step-indicator">
                                                <div className="step-circle">
                                                    {isDone ? <Check size={16} /> : isCurrent ? <Loader2 size={16} className="animate-spin" /> : <StepIcon size={16} />}
                                                </div>
                                                {i < steps.length - 1 && <div className="step-line" />}
                                            </div>
                                            <div className="step-content">
                                                <span className="step-label">{step.label}</span>
                                                {isDone && <span className="step-status badge badge-success">Complete</span>}
                                                {isCurrent && <span className="step-status badge badge-info">Processing...</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Center visualization */}
                        <div className="processing-visual glass-card">
                            {!pipelineDone ? (
                                <div className="nucleus-container">
                                    <div className="nucleus-ring ring-1" />
                                    <div className="nucleus-ring ring-2" />
                                    <div className="nucleus-ring ring-3" />
                                    <div className="nucleus-core">
                                        <Loader2 size={32} className="animate-spin" />
                                    </div>
                                    <p className="processing-text">{steps[currentStep]?.label || 'Finishing...'}</p>
                                    <p className="processing-progress">{currentStep}/{steps.length} steps</p>
                                </div>
                            ) : (
                                <div className="complete-container animate-fade-in-up">
                                    <div className="complete-icon"><Check size={48} /></div>
                                    <h2>Analysis Complete</h2>
                                    <p className="text-muted">All pipeline steps completed successfully</p>
                                    <button className="btn btn-primary" onClick={() => setActiveTab('grid')} style={{ marginTop: 20 }}>
                                        View Grid Split →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════
          TAB 2 — GRID SPLIT
         ═══════════════════════════════════════ */}
            {activeTab === 'grid' && results && (
                <div className="tab-content animate-fade-in">
                    <div className="grid-split-layout">
                        {/* Original Image Placeholder */}
                        <div className="card original-image-card">
                            <h3>Microscope Sample View</h3>
                            <div className="original-image-placeholder">
                                <div className="image-grid-overlay">
                                    <div className="grid-line-h" />
                                    <div className="grid-line-v" />
                                    <span className="grid-label gl-1">G1</span>
                                    <span className="grid-label gl-2">G2</span>
                                    <span className="grid-label gl-3">G3</span>
                                    <span className="grid-label gl-4">G4</span>
                                </div>
                                <div className="microscope-visual">
                                    {Array.from({ length: 16 }, (_, i) => (
                                        <div key={i} className="micro-cell" style={{ animationDelay: `${i * 100}ms` }}>
                                            <div className="acrosome-dot" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 4 Grid Cards */}
                        <div className="grid-cards">
                            {results.grids.map((grid, idx) => (
                                <div key={grid.id} className="glass-card grid-card animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
                                    <div className="grid-card-header">
                                        <div className="grid-card-icon"><Grid3X3 size={20} /></div>
                                        <h3>Grid {grid.id}</h3>
                                        <span className="badge badge-info">4 Images</span>
                                    </div>
                                    <div className="grid-card-body">
                                        <div className="acrosome-placeholders">
                                            {grid.acrosomes.map(a => (
                                                <div key={a.id} className={`acrosome-placeholder ${a.isIntact ? 'intact' : 'damaged'}`}>
                                                    <span className="ap-label">{a.id}</span>
                                                    <span className={`ap-status ${a.isIntact ? 'text-success' : 'text-error'}`}>
                                                        {a.isIntact ? 'Intact' : 'Damaged'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button className="btn btn-primary" onClick={() => setActiveTab('classification')}>
                            View Classification →
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════
          TAB 3 — CLASSIFICATION
         ═══════════════════════════════════════ */}
            {activeTab === 'classification' && results && (
                <div className="tab-content animate-fade-in">
                    <div className="classification-layout">
                        {/* Summary Card */}
                        <div className="glass-card summary-card animate-fade-in-up">
                            <CircularProgress value={results.intactPct} size={200} label="Intact" />
                            <div className="summary-stats">
                                <div className="summary-row">
                                    <span className="summary-label">Total Acrosomes</span>
                                    <span className="summary-value">{results.total}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Intact</span>
                                    <span className="summary-value text-success">{results.totalIntact}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Damaged</span>
                                    <span className="summary-value text-error">{results.total - results.totalIntact}</span>
                                </div>
                                <div className="summary-row highlight">
                                    <span className="summary-label">Intact Percentage</span>
                                    <span className="summary-value">{results.intactPct}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid-wise Breakdown */}
                        <div className="grid-breakdown">
                            <h3>Grid-wise Breakdown</h3>
                            <div className="breakdown-cards">
                                {results.grids.map((grid, idx) => (
                                    <div key={grid.id} className="card breakdown-card animate-fade-in-up" style={{ animationDelay: `${idx * 120}ms` }}>
                                        <div className="bc-header">
                                            <h4>Grid {grid.id}</h4>
                                            <span className={`badge ${grid.intactCount >= 3 ? 'badge-success' : grid.intactCount >= 2 ? 'badge-info' : 'badge-error'}`}>
                                                {grid.intactCount}/4 Intact
                                            </span>
                                        </div>
                                        <div className="bc-bar">
                                            <div className="bc-bar-fill" style={{ width: `${(grid.intactCount / 4) * 100}%` }} />
                                        </div>
                                        <div className="bc-acrosomes">
                                            {grid.acrosomes.map(a => (
                                                <div key={a.id} className={`bc-acrosome ${a.isIntact ? 'intact' : 'damaged'}`}>
                                                    <span className="bc-id">{a.id}</span>
                                                    <span className="bc-conf">{(a.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Cpu(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
            <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" />
            <path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
        </svg>
    );
}
