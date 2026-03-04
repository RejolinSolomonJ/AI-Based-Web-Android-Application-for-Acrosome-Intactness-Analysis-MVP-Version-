import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Upload, Cpu, FileText,
    History, LogOut, Sun, Moon
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'New Analysis' },
    { to: '/processing', icon: Cpu, label: 'Processing' },
    { to: '/report', icon: FileText, label: 'Report' },
    { to: '/history', icon: History, label: 'History' },
];

export default function Sidebar({ isOpen, onClose }) {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <Logo size="md" />
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link theme-toggle" onClick={toggleTheme}>
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button className="sidebar-link logout-btn" onClick={logout}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
