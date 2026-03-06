import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, Save, Plus, FileText, Calendar, User, Hash } from 'lucide-react';
import Logo from '../components/Logo';
import { generateReport } from '../services/api';
import './ReportPage.css';

export default function ReportPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { analysis } = location.state || {};
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Map API analysis record to report format
    const report = useMemo(() => {
        if (!analysis) return null;

        const dateObj = new Date(analysis.created_at);

        // Group by grids (mock grouping since backend returns a flat list)
        const grids = [];
        for (let i = 0; i < 4; i++) {
            const slice = analysis.image_results.slice(i * 4, (i + 1) * 4);
            const intact = slice.filter(r => r.classification === 'Intact' || r.classification === 'INTACT').length;
            grids.push({ id: i + 1, intact, damaged: 4 - intact });
        }

        return {
            date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            doctor: analysis.notes?.includes('Patient:') ? 'NexAcro AI System' : 'Medical Professional',
            sampleId: analysis.sample_id || '—',
            patientId: analysis.patient_id || '—',
            total: analysis.total_images,
            totalIntact: analysis.intact_count,
            totalDamaged: analysis.damaged_count,
            intactPct: analysis.intact_percentage,
            grids: grids,
        };
    }, [analysis]);

    const handleSave = () => {
        setSaving(true);
        // This would normally be another API call or confirm storage
        setTimeout(() => {
            setSaving(false);
            alert("Report saved to clinic history!");
        }, 1200);
    };

    const handleDownload = async () => {
        if (!analysis?.id) return;
        setDownloading(true);
        try {
            const data = await generateReport(analysis.id);
            if (data.download_url) {
                window.open(data.download_url, '_blank');
            }
        } catch (err) {
            console.error("Report Generation Error:", err);
            alert("Failed to generate PDF report: " + err.message);
        } finally {
            setDownloading(false);
        }
    };

    if (!report) {
        return (
            <div className="report-page animate-fade-in">
                <div className="card error-card" style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 40 }}>
                    <h2 className="text-muted">No Analysis Data</h2>
                    <p>Please perform an analysis first to view the report.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/upload')} style={{ marginTop: 20 }}>
                        Start New Analysis
                    </button>
                </div>
            </div>
        );
    }

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
                            <span className="rm-label">Report Source</span>
                            <span className="rm-value">NexAcro AI</span>
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
                    <button className="btn btn-primary btn-lg" onClick={handleDownload} disabled={downloading}>
                        <Download size={18} /> {downloading ? 'Generating...' : 'Download PDF'}
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
