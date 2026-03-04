import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Save, Plus, FileText, Calendar, User, Hash } from 'lucide-react';
import Logo from '../components/Logo';
import './ReportPage.css';

function generateReportData() {
    const grids = [];
    let totalIntact = 0;
    for (let g = 0; g < 4; g++) {
        const intact = Math.floor(Math.random() * 3) + 1;
        totalIntact += intact;
        grids.push({ id: g + 1, intact, damaged: 4 - intact });
    }
    return {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        doctor: 'Dr. Priya Sharma',
        sampleId: 'SMP-2048',
        patientId: 'PT-001',
        total: 16,
        totalIntact,
        totalDamaged: 16 - totalIntact,
        intactPct: Math.round((totalIntact / 16) * 100),
        grids,
    };
}

export default function ReportPage() {
    const navigate = useNavigate();
    const report = useMemo(() => generateReportData(), []);
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 1500);
    };

    return (
        <div className="report-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>Diagnostic Report</h1>
                    <p className="text-muted text-sm">Professional medical report for this analysis</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
                        <Plus size={16} /> New Analysis
                    </button>
                </div>
            </div>

            <div className="report-container card animate-fade-in-up">
                {/* Report Header */}
                <div className="report-header">
                    <div className="report-logo">
                        <Logo size="md" />
                    </div>
                    <h2>AI Diagnostic Report</h2>
                    <p className="report-subtitle">Acrosome Intactness Analysis</p>
                </div>

                {/* Report Meta */}
                <div className="report-meta">
                    <div className="rm-item">
                        <Calendar size={16} />
                        <div>
                            <span className="rm-label">Date & Time</span>
                            <span className="rm-value">{report.date} · {report.time}</span>
                        </div>
                    </div>
                    <div className="rm-item">
                        <User size={16} />
                        <div>
                            <span className="rm-label">Doctor</span>
                            <span className="rm-value">{report.doctor}</span>
                        </div>
                    </div>
                    <div className="rm-item">
                        <Hash size={16} />
                        <div>
                            <span className="rm-label">Sample ID</span>
                            <span className="rm-value">{report.sampleId}</span>
                        </div>
                    </div>
                    <div className="rm-item">
                        <FileText size={16} />
                        <div>
                            <span className="rm-label">Patient ID</span>
                            <span className="rm-value">{report.patientId}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="report-section">
                    <h3>Analysis Summary</h3>
                    <div className="report-summary-grid">
                        <div className="rs-card">
                            <span className="rs-num">{report.total}</span>
                            <span className="rs-txt">Total Acrosomes</span>
                        </div>
                        <div className="rs-card success">
                            <span className="rs-num">{report.totalIntact}</span>
                            <span className="rs-txt">Intact</span>
                        </div>
                        <div className="rs-card error">
                            <span className="rs-num">{report.totalDamaged}</span>
                            <span className="rs-txt">Damaged</span>
                        </div>
                        <div className="rs-card highlight">
                            <span className="rs-num">{report.intactPct}%</span>
                            <span className="rs-txt">Intact Percentage</span>
                        </div>
                    </div>
                </div>

                {/* Grid-wise Table */}
                <div className="report-section">
                    <h3>Grid-wise Results</h3>
                    <table className="data-table report-table">
                        <thead>
                            <tr>
                                <th>Grid</th>
                                <th>Total</th>
                                <th>Intact</th>
                                <th>Damaged</th>
                                <th>Intact %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.grids.map(g => (
                                <tr key={g.id}>
                                    <td><strong>Grid {g.id}</strong></td>
                                    <td>4</td>
                                    <td><span className="text-success">{g.intact}</span></td>
                                    <td><span className="text-error">{g.damaged}</span></td>
                                    <td>{Math.round((g.intact / 4) * 100)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Actions */}
                <div className="report-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => alert('PDF download simulated!')}>
                        <Download size={18} /> Download PDF
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={handleSave} disabled={saving}>
                        <Save size={18} /> {saving ? 'Saving...' : 'Save to Records'}
                    </button>
                </div>

                {/* Footer */}
                <div className="report-footer">
                    <p>This report was generated by NexAcro AI Clinical Platform.</p>
                    <p>Results should be verified by a qualified medical professional before clinical decision-making.</p>
                </div>
            </div>
        </div>
    );
}
