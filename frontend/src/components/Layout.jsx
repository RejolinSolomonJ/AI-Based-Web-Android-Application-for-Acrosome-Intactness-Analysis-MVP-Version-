import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div className="layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="layout-main">
                <header className="top-bar">
                    <button className="menu-btn btn-icon btn-ghost" onClick={() => setSidebarOpen(true)}>
                        <Menu size={22} />
                    </button>
                    <div className="top-bar-right">
                        <div className="user-info">
                            <div className="user-avatar">
                                {(user?.full_name || user?.username || 'D')[0].toUpperCase()}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user?.full_name || user?.username || 'Doctor'}</span>
                                <span className="user-role">{user?.role || 'doctor'}</span>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="content">
                    <Outlet />
                </main>
            </div>

            {/* Acrosome particle background */}
            <div className="acrosome-bg">
                {Array.from({ length: 20 }, (_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
