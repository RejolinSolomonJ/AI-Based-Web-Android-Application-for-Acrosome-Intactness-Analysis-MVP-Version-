import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Check, Loader2, Upload, Settings, Grid3X3, ScanSearch, Crop,
    Layers, Hash, Percent, ImagePlus, FileText, ArrowRight
} from 'lucide-react';
import { getPipelineSteps } from '../services/mockApi';
import CircularProgress from '../components/CircularProgress';
import './ProcessingPage.css';

const stepIcons = {
    upload: Upload, settings: Settings, grid: Grid3X3, scan: ScanSearch,
    crop: Crop, layers: Layers, hash: Hash, percent: Percent,
    image: ImagePlus, 'file-text': FileText,
};

/* ── Generate mock classification data ── */
function generateResults() {
    const grids = [];
    let totalIntact = 0;
    for (let g = 0; g < 4; g++) {
        const acrosomes = [];
        for (let a = 0; a < 4; a++) {
            const isIntact = Math.random() > 0.28;
            if (isIntact) totalIntact++;
            acrosomes.push({
                id: `A${g * 4 + a + 1}`,
                isIntact,
                confidence: Math.round((0.82 + Math.random() * 0.17) * 100) / 100,
            });
        }
        grids.push({ id: g + 1, acrosomes, intactCount: acrosomes.filter(a => a.isIntact).length });
    }
    return { grids, totalIntact, total: 16, intactPct: Math.round((totalIntact / 16) * 100) };
}

/* ── Grid data ── */
const gridMeta = [
    { id: 1, label: 'Grid 1', confidence: 0.94 },
    { id: 2, label: 'Grid 2', confidence: 0.91 },
    { id: 3, label: 'Grid 3', confidence: 0.88 },
    { id: 4, label: 'Grid 4', confidence: 0.96 },
];

export default function ProcessingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [activeTab, setActiveTab] = useState('pipeline');
    const steps = getPipelineSteps();
    const navigate = useNavigate();
    const results = useMemo(() => generateResults(), []);

    /* Auto-advance pipeline steps */
    useEffect(() => {
        if (activeTab !== 'pipeline') return;
        if (currentStep < steps.length) {
            const timer = setTimeout(() => setCurrentStep(prev => prev + 1), 1200);
            return () => clearTimeout(timer);
        }
    }, [currentStep, steps.length, activeTab]);

    const pipelineDone = currentStep >= steps.length;

    return (
        <div className="processing-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>AI Processing</h1>
                    <p className="text-muted text-sm">Pipeline, grid visualization &amp; classification results</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/report')}>
                    Generate Report <ArrowRight size={16} />
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
                    onClick={() => setActiveTab('grid')}
                >
                    <Grid3X3 size={16} /> Grid Split
                </button>
                <button
                    className={`proc-tab ${activeTab === 'classification' ? 'active' : ''}`}
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
                                    <p className="text-muted">All 10 pipeline steps completed</p>
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
            {activeTab === 'grid' && (
                <div className="tab-content animate-fade-in">
                    <div className="grid-split-layout">
                        {/* Original Image */}
                        <div className="card original-image-card">
                            <h3>Original Microscope Image</h3>
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
                            {gridMeta.map((grid, idx) => {
                                const gridAcrosomes = results.grids[idx]?.acrosomes || [];
                                return (
                                    <div key={grid.id} className="glass-card grid-card animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
                                        <div className="grid-card-header">
                                            <div className="grid-card-icon"><Grid3X3 size={20} /></div>
                                            <h3>{grid.label}</h3>
                                            <span className="badge badge-info">{(grid.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="grid-card-body">
                                            <div className="acrosome-placeholders">
                                                {gridAcrosomes.map(a => (
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
                                );
                            })}
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
            {activeTab === 'classification' && (
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

/* Inline Cpu icon since not imported at top level via lucide */
function Cpu(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
            <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" />
            <path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
        </svg>
    );
}
