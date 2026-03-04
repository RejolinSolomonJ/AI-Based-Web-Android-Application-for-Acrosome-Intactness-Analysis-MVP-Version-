import './CircularProgress.css';

export default function CircularProgress({ value, size = 180, strokeWidth = 14, label }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    const getColor = () => {
        if (value >= 75) return 'var(--success)';
        if (value >= 50) return 'var(--warning)';
        return 'var(--error)';
    };

    return (
        <div className="circular-progress" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor={getColor()} />
                    </linearGradient>
                </defs>
                <circle
                    className="cp-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <circle
                    className="cp-progress"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    stroke="url(#progressGradient)"
                />
            </svg>
            <div className="cp-center">
                <span className="cp-value">{value}%</span>
                {label && <span className="cp-label">{label}</span>}
            </div>
        </div>
    );
}
