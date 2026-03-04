import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts';
import { Microscope, ImagePlus, TrendingUp, Activity, Plus } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { getAnalyticsSummary, getDetailedAnalytics, listAnalyses } from '../services/mockApi';
import './DashboardPage.css';

const PIE_COLORS = ['#7BC68F', '#E88B8B'];

export default function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [dailyStats, setDailyStats] = useState([]);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function load() {
            try {
                const [sum, detailed, list] = await Promise.all([
                    getAnalyticsSummary(),
                    getDetailedAnalytics(14),
                    listAnalyses(1, 5),
                ]);
                setSummary(sum);
                setDailyStats(detailed.daily_stats);
                setRecent(list.analyses);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    const pieData = [
        { name: 'Intact', value: summary.overall_intact_percentage },
        { name: 'Damaged', value: summary.overall_damaged_percentage },
    ];

    return (
        <div className="dashboard-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="text-muted text-sm">Overview of your analysis pipeline</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                    <Plus size={18} />
                    New Analysis
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-4 gap-4 stats-grid">
                <StatsCard
                    icon={Microscope}
                    label="Total Samples Analyzed"
                    value={summary.total_analyses.toLocaleString()}
                    sub={`${summary.analyses_today} today`}
                    color="blue"
                    delay={0}
                />
                <StatsCard
                    icon={ImagePlus}
                    label="Total Acrosomes Processed"
                    value={summary.total_images_processed.toLocaleString()}
                    sub={`${summary.analyses_this_week} this week`}
                    color="purple"
                    delay={100}
                />
                <StatsCard
                    icon={TrendingUp}
                    label="Average Intact %"
                    value={`${summary.overall_intact_percentage}%`}
                    color="green"
                    delay={200}
                />
                <StatsCard
                    icon={Activity}
                    label="AI Confidence"
                    value={`${(summary.average_confidence * 100).toFixed(1)}%`}
                    color="blue"
                    delay={300}
                />
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <div className="card chart-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <h3>Intact vs Damaged</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={100}
                                paddingAngle={4}
                                dataKey="value"
                                animationDuration={1200}
                                animationBegin={300}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={index} fill={PIE_COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: PIE_COLORS[0] }}></span>
                            Intact ({summary.overall_intact_percentage}%)
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: PIE_COLORS[1] }}></span>
                            Damaged ({summary.overall_damaged_percentage}%)
                        </div>
                    </div>
                </div>

                <div className="card chart-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <h3>Trend Over Time</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dailyStats}>
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6EA8FE" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6EA8FE" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                tickFormatter={d => d.slice(5)}
                            />
                            <YAxis
                                domain={[40, 100]}
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                tickFormatter={v => `${v}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem'
                                }}
                                formatter={(v) => [`${v}%`, 'Intact']}
                            />
                            <Area
                                type="monotone"
                                dataKey="avg_intact_percentage"
                                stroke="#6EA8FE"
                                strokeWidth={2.5}
                                fill="url(#areaGradient)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="card recent-card animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <h3>Recent Reports</h3>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Sample ID</th>
                                <th>Intact %</th>
                                <th>Confidence</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map(r => (
                                <tr key={r.id} onClick={() => navigate(`/classification`)}>
                                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                    <td><span className="sample-id">{r.sample_id || '—'}</span></td>
                                    <td>{r.intact_percentage}%</td>
                                    <td>{(r.average_confidence * 100).toFixed(1)}%</td>
                                    <td>
                                        <span className={`badge ${r.intact_percentage >= 70 ? 'badge-success' : 'badge-error'}`}>
                                            {r.intact_percentage >= 70 ? 'Good' : 'Low'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
