import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Check, Loader2, Upload, Settings, Grid3X3, ScanSearch
} from 'lucide-react';
import './ProcessingPage.css';

const STEPS = [
    { id: 1, icon: Upload, label: 'Uploading Images' },
    { id: 2, icon: Settings, label: 'Preprocessing & Validation' },
    { id: 3, icon: Grid3X3, label: 'Splitting into Grids' },
    { id: 4, icon: ScanSearch, label: 'Running AI Classification' },
];

export default function ProcessingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { grids, patientDetails } = location.state || {};

    const [currentStep, setCurrentStep] = useState(0);

    // Guard – must have data
    useEffect(() => {
        if (!grids || !patientDetails) {
            navigate('/upload');
        }
    }, [grids, patientDetails, navigate]);

    // 4-step animation: one step every 750ms → done in 3 seconds
    useEffect(() => {
        if (currentStep < STEPS.length) {
            const t = setTimeout(() => setCurrentStep(s => s + 1), 750);
            return () => clearTimeout(t);
        }
    }, [currentStep]);

    // After animation finishes, navigate to report with grids + patientDetails
    useEffect(() => {
        if (currentStep >= STEPS.length) {
            const t = setTimeout(() => {
                navigate('/report', {
                    state: { grids, patientDetails, analyzing: true }
                });
            }, 400);
            return () => clearTimeout(t);
        }
    }, [currentStep, navigate, grids, patientDetails]);

    const done = currentStep >= STEPS.length;

    return (
        <div className="processing-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>AI Processing</h1>
                    <p className="text-muted text-sm">Preparing your analysis…</p>
                </div>
            </div>

            <div className="processing-layout">
                {/* Stepper */}
                <div className="stepper-section glass-card">
                    <div className="stepper">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            const isDone = i < currentStep;
                            const isCurrent = i === currentStep && !done;
                            return (
                                <div key={step.id} className={`step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                    <div className="step-indicator">
                                        <div className="step-circle">
                                            {isDone ? <Check size={16} /> :
                                                isCurrent ? <Loader2 size={16} className="animate-spin" /> :
                                                    <Icon size={16} />}
                                        </div>
                                        {i < STEPS.length - 1 && <div className="step-line" />}
                                    </div>
                                    <div className="step-content">
                                        <span className="step-label">{step.label}</span>
                                        {isDone && <span className="step-status badge badge-success">Complete</span>}
                                        {isCurrent && <span className="step-status badge badge-info">Processing…</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center visual */}
                <div className="processing-visual glass-card">
                    {!done ? (
                        <div className="nucleus-container">
                            <div className="nucleus-ring ring-1" />
                            <div className="nucleus-ring ring-2" />
                            <div className="nucleus-ring ring-3" />
                            <div className="nucleus-core">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                            <p className="processing-text">{STEPS[currentStep]?.label || 'Finishing…'}</p>
                            <p className="processing-progress">{currentStep}/{STEPS.length} steps</p>
                        </div>
                    ) : (
                        <div className="complete-container animate-fade-in-up">
                            <div className="complete-icon"><Check size={48} /></div>
                            <h2>Ready!</h2>
                            <p className="text-muted">Loading your report…</p>
                            <Loader2 size={22} className="animate-spin" style={{ marginTop: 12, color: 'var(--accent)' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
