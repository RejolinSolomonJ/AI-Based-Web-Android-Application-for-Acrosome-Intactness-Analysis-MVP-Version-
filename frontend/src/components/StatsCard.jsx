import './StatsCard.css';

export default function StatsCard({ icon: Icon, label, value, sub, color = 'blue', delay = 0 }) {
    return (
        <div
            className={`stats-card glass-card stats-${color}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="stats-icon-wrap">
                {Icon && <Icon size={22} />}
            </div>
            <div className="stats-info">
                <span className="stats-value">{value}</span>
                <span className="stats-label">{label}</span>
                {sub && <span className="stats-sub">{sub}</span>}
            </div>
        </div>
    );
}
