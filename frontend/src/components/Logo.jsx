import logoImg from '../assets/logo.png';
import './Logo.css';

export default function Logo({ size = 'md', showText = true }) {
    const sizes = {
        sm: { img: 32, text: '1.1rem' },
        md: { img: 44, text: '1.5rem' },
        lg: { img: 64, text: '2.2rem' },
        xl: { img: 80, text: '2.8rem' },
    };
    const s = sizes[size] || sizes.md;

    return (
        <div className="logo-container" style={{ gap: s.img * 0.25 }}>
            <img
                src={logoImg}
                alt="NexAcro"
                className="logo-icon animate-float"
                style={{ width: s.img, height: s.img }}
            />
            {showText && (
                <span className="logo-text" style={{ fontSize: s.text }}>
                    <span className="logo-n">N</span>
                    <span className="logo-rest">ex</span>
                    <span className="logo-a">A</span>
                    <span className="logo-rest">cro</span>
                </span>
            )}
        </div>
    );
}
