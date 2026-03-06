import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, UserCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { registerApi } from '../services/api';
import { Sun, Moon } from 'lucide-react';
import './RegisterPage.css';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await registerApi(username, email, password, fullName);
            login(
                { id: data.user_id, username: data.username, role: data.role, email, full_name: fullName },
                data.access_token
            );
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Particle background */}
            <div className="acrosome-bg">
                {Array.from({ length: 30 }, (_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            width: `${4 + Math.random() * 6}px`,
                            height: `${4 + Math.random() * 6}px`,
                        }}
                    />
                ))}
            </div>

            {/* Theme toggle */}
            <button className="login-theme-toggle btn-icon btn-ghost" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="login-card glass-card animate-fade-in-up">
                <div className="login-header">
                    <Logo size="lg" />
                    <p className="login-tagline">Create your professional account</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="username">Username</label>
                        <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input
                                id="username"
                                type="text"
                                placeholder="drsharma"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                minLength={3}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="fullName">Full Name</label>
                        <div className="input-with-icon">
                            <UserCircle size={18} className="input-icon" />
                            <input
                                id="fullName"
                                type="text"
                                placeholder="Dr. Priya Sharma"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-with-icon">
                            <Mail size={18} className="input-icon" />
                            <input
                                id="email"
                                type="email"
                                placeholder="doctor@ivfclinic.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                id="password"
                                type={showPass ? 'text' : 'password'}
                                placeholder="Create a password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="pass-toggle"
                                onClick={() => setShowPass(!showPass)}
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner" />
                        ) : (
                            'Sign Up'
                        )}
                    </button>

                    <div className="register-link-container">
                        <span>Already have an account? </span>
                        <Link to="/login" className="register-link">Sign In</Link>
                    </div>
                </form>

                <p className="login-footer-text">
                    NexAcro Clinical AI Platform · v1.0
                </p>
            </div>
        </div>
    );
}
