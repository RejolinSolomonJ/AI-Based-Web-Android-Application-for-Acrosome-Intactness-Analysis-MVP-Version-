import { useState, useEffect } from 'react';
import { Search, Filter, FileText } from 'lucide-react';
import { listAnalyses } from '../services/api';
import './HistoryPage.css';

export default function HistoryPage() {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [pctRange, setPctRange] = useState('all');

    useEffect(() => {
        async function load() {
            try {
                const data = await listAnalyses(1, 20);
                setAnalyses(data.analyses);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filtered = analyses.filter(a => {
        if (search && !a.sample_id?.toLowerCase().includes(search.toLowerCase()) &&
            !a.session_id?.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateFilter && !a.created_at.startsWith(dateFilter)) return false;
        if (pctRange === 'high' && a.intact_percentage < 75) return false;
        if (pctRange === 'medium' && (a.intact_percentage < 50 || a.intact_percentage >= 75)) return false;
        if (pctRange === 'low' && a.intact_percentage >= 50) return false;
        return true;
    });

    return (
        <div className="history-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>Analysis History</h1>
                    <p className="text-muted text-sm">View and search all past analysis records</p>
                </div>
            </div>

            {/* Filters */}
            <div className="history-filters card">
                <div className="hf-search">
                    <Search size={18} className="hf-icon" />
                    <input
                        type="text"
                        placeholder="Search by Sample ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="hf-group">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="hf-date"
                    />
                    <select
                        value={pctRange}
                        onChange={e => setPctRange(e.target.value)}
                        className="hf-select"
                    >
                        <option value="all">All Ranges</option>
                        <option value="high">≥ 75% Intact</option>
                        <option value="medium">50–74% Intact</option>
                        <option value="low">&lt; 50% Intact</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card history-table-card">
                {loading ? (
                    <div className="page-loader"><div className="spinner" /></div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Sample ID</th>
                                    <th>Images</th>
                                    <th>Intact %</th>
                                    <th>Confidence</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((a, idx) => (
                                        <tr key={a.id} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                                            <td>{new Date(a.created_at).toLocaleDateString()}</td>
                                            <td><span className="sample-id">{a.sample_id || '—'}</span></td>
                                            <td>{a.total_images}</td>
                                            <td>
                                                <div className="pct-bar-wrap">
                                                    <div className="pct-bar" style={{ width: `${a.intact_percentage}%` }} />
                                                    <span>{a.intact_percentage}%</span>
                                                </div>
                                            </td>
                                            <td>{(a.average_confidence * 100).toFixed(1)}%</td>
                                            <td>
                                                <span className={`badge ${a.intact_percentage >= 75 ? 'badge-success' : a.intact_percentage >= 50 ? 'badge-info' : 'badge-error'}`}>
                                                    {a.intact_percentage >= 75 ? 'Good' : a.intact_percentage >= 50 ? 'Fair' : 'Low'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm">
                                                    <FileText size={14} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="history-count text-sm text-muted">
                Showing {filtered.length} of {analyses.length} records
            </div>
        </div>
    );
}
