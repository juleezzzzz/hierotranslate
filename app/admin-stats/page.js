'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

export default function AdminStatsPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Stats state
    const [realtimeStats, setRealtimeStats] = useState({ activeSessions: 0, loggedInUsers: 0 });
    const [dashboardStats, setDashboardStats] = useState(null);
    const [currentPeriod, setCurrentPeriod] = useState('24h');

    // Chart refs
    const usersChartRef = useRef(null);
    const loginsChartRef = useRef(null);
    const usersChartInstance = useRef(null);
    const loginsChartInstance = useRef(null);
    const [chartJsLoaded, setChartJsLoaded] = useState(false);

    const authenticate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-password': password }
            });
            const data = await res.json();

            if (data.success) {
                setIsAuthenticated(true);
                localStorage.setItem('adminPassword', password);
                fetchDashboardStats();
                fetchRealtimeStats();
            } else {
                setError('Mot de passe incorrect');
            }
        } catch (err) {
            setError('Erreur de connexion');
        }
        setLoading(false);
    };

    const fetchRealtimeStats = async () => {
        const pwd = password || localStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/admin/stats/realtime', {
                headers: { 'x-admin-password': pwd }
            });
            const data = await res.json();
            if (data.success) {
                setRealtimeStats({
                    activeSessions: data.activeSessions,
                    loggedInUsers: data.loggedInUsers
                });
            }
        } catch (err) {
            console.error('Error fetching realtime stats:', err);
        }
    };

    const fetchDashboardStats = async (period = currentPeriod) => {
        const pwd = password || localStorage.getItem('adminPassword');
        try {
            const res = await fetch(`/api/admin/stats/dashboard?period=${period}`, {
                headers: { 'x-admin-password': pwd }
            });
            const data = await res.json();
            if (data.success) {
                setDashboardStats(data);
                if (chartJsLoaded) {
                    updateCharts(data);
                }
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        }
    };

    const updateCharts = (data) => {
        if (typeof Chart === 'undefined') return;

        const formatLabel = (period) => {
            if (!period) return '';
            if (period.includes(':')) {
                const hour = period.split(' ')[1]?.split(':')[0];
                return hour + 'h';
            }
            if (period.length === 10) {
                const parts = period.split('-');
                return parts[2] + '/' + parts[1];
            }
            if (period.length === 7) {
                const parts = period.split('-');
                const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                return months[parseInt(parts[1]) - 1];
            }
            return period;
        };

        // Destroy existing charts
        if (usersChartInstance.current) {
            usersChartInstance.current.destroy();
        }
        if (loginsChartInstance.current) {
            loginsChartInstance.current.destroy();
        }

        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                elements: { line: { tension: 0.4 } }
            }
        };

        // Users chart
        if (usersChartRef.current) {
            usersChartInstance.current = new Chart(usersChartRef.current, {
                ...chartConfig,
                data: {
                    labels: data.usersChart.map(d => formatLabel(d.period)),
                    datasets: [{
                        label: 'Nouveaux comptes',
                        data: data.usersChart.map(d => d.count),
                        borderColor: '#8e44ad',
                        backgroundColor: 'rgba(142, 68, 173, 0.1)',
                        fill: true,
                        pointBackgroundColor: '#8e44ad',
                        pointRadius: 4
                    }]
                }
            });
        }

        // Logins chart
        if (loginsChartRef.current) {
            loginsChartInstance.current = new Chart(loginsChartRef.current, {
                ...chartConfig,
                data: {
                    labels: data.loginsChart.map(d => formatLabel(d.period)),
                    datasets: [{
                        label: 'Connexions',
                        data: data.loginsChart.map(d => d.count),
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        fill: true,
                        pointBackgroundColor: '#f39c12',
                        pointRadius: 4
                    }]
                }
            });
        }
    };

    const handlePeriodChange = (period) => {
        setCurrentPeriod(period);
        fetchDashboardStats(period);
    };

    useEffect(() => {
        const savedPwd = localStorage.getItem('adminPassword');
        if (savedPwd) {
            setPassword(savedPwd);
            fetch('/api/admin/stats', { headers: { 'x-admin-password': savedPwd } })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setIsAuthenticated(true);
                        fetchDashboardStats();
                        fetchRealtimeStats();
                    }
                });
        }
    }, []);

    // Update charts when Chart.js loads
    useEffect(() => {
        if (chartJsLoaded && dashboardStats) {
            updateCharts(dashboardStats);
        }
    }, [chartJsLoaded, dashboardStats]);

    // Refresh realtime stats every 5 seconds
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(fetchRealtimeStats, 5000);
        return () => clearInterval(interval);
    }, [isAuthenticated, password]);

    if (!isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.loginCard}>
                    <h1 style={styles.title}>📊 Statistiques Admin</h1>
                    <form onSubmit={authenticate}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe admin"
                            style={styles.input}
                            autoFocus
                        />
                        {error && <p style={styles.error}>{error}</p>}
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Connexion...' : 'Accéder'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/npm/chart.js"
                onLoad={() => setChartJsLoaded(true)}
            />
            <div style={styles.container}>
                <div style={styles.dashboard}>
                    {/* Header */}
                    <header style={styles.header}>
                        <h1 style={styles.titleMain}>📊 Statistiques du Site</h1>
                        <nav style={styles.nav}>
                            <a href="/admin-hierotranslate-secret" style={styles.navLink}>👥 Utilisateurs</a>
                            <a href="/admin-gardiner" style={styles.navLink}>𓀀 Gardiner</a>
                            <a href="/" style={styles.navLink}>🏠 Accueil</a>
                        </nav>
                    </header>

                    {/* Stats Cards */}
                    <div style={styles.statsGrid}>
                        <div style={{ ...styles.statCard, ...styles.realtimeCard }}>
                            <div style={styles.icon}>👥</div>
                            <div style={styles.value}>{realtimeStats.activeSessions}</div>
                            <div style={styles.label}>Visiteurs en ligne</div>
                            <div style={styles.subValue}>dont {realtimeStats.loggedInUsers} connectés</div>
                            <div style={styles.liveIndicator}>
                                <span style={styles.liveDot}></span>
                                Temps réel
                            </div>
                        </div>

                        <div style={{ ...styles.statCard, ...styles.usersCard }}>
                            <div style={styles.icon}>📝</div>
                            <div style={styles.value}>{dashboardStats?.totalUsers || '-'}</div>
                            <div style={styles.label}>Comptes créés</div>
                            <div style={styles.subValue}>+{dashboardStats?.newUsersPeriod || 0} sur la période</div>
                        </div>

                        <div style={{ ...styles.statCard, ...styles.loginsCard }}>
                            <div style={styles.icon}>🔐</div>
                            <div style={styles.value}>{dashboardStats?.loginsPeriod || '-'}</div>
                            <div style={styles.label}>Connexions</div>
                            <div style={styles.subValue}>sur la période sélectionnée</div>
                        </div>
                    </div>

                    {/* Period Filter */}
                    <div style={styles.filterSection}>
                        <h3 style={styles.filterTitle}>📅 Période d'analyse</h3>
                        <div style={styles.periodButtons}>
                            {[
                                { key: '24h', label: 'Dernières 24h' },
                                { key: '7d', label: '7 derniers jours' },
                                { key: 'month', label: 'Ce mois-ci' },
                                { key: 'year', label: 'Cette année' }
                            ].map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => handlePeriodChange(p.key)}
                                    style={{
                                        ...styles.periodBtn,
                                        ...(currentPeriod === p.key ? styles.periodBtnActive : {})
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Charts */}
                    <div style={styles.chartsGrid}>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>📈 Nouveaux comptes créés</h3>
                            <div style={styles.chartContainer}>
                                <canvas ref={usersChartRef}></canvas>
                            </div>
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>🔑 Historique des connexions</h3>
                            <div style={styles.chartContainer}>
                                <canvas ref={loginsChartRef}></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '30px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    loginCard: {
        maxWidth: '400px',
        margin: '100px auto',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    dashboard: {
        maxWidth: '1400px',
        margin: '0 auto'
    },
    header: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '25px 35px',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        flexWrap: 'wrap',
        gap: '20px'
    },
    title: {
        color: '#1e3a5f',
        margin: 0,
        fontSize: '24px',
        textAlign: 'center'
    },
    titleMain: {
        color: '#2c3e50',
        margin: 0,
        fontSize: '28px'
    },
    nav: {
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
    },
    navLink: {
        padding: '10px 20px',
        background: '#8e44ad',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: '500',
        transition: 'all 0.3s'
    },
    input: {
        width: '100%',
        padding: '15px',
        fontSize: '16px',
        border: '2px solid #ddd',
        borderRadius: '8px',
        marginBottom: '15px',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '15px',
        fontSize: '16px',
        background: 'linear-gradient(135deg, #8e44ad 0%, #a569bd 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    error: {
        color: '#e74c3c',
        marginBottom: '15px',
        textAlign: 'center'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
    },
    statCard: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '4px solid'
    },
    realtimeCard: {
        borderTopColor: '#27ae60'
    },
    usersCard: {
        borderTopColor: '#8e44ad'
    },
    loginsCard: {
        borderTopColor: '#f39c12'
    },
    icon: {
        fontSize: '40px',
        marginBottom: '15px'
    },
    value: {
        fontSize: '48px',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '8px'
    },
    label: {
        fontSize: '16px',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    subValue: {
        fontSize: '14px',
        color: '#888',
        marginTop: '10px'
    },
    liveIndicator: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(39, 174, 96, 0.1)',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#27ae60',
        marginTop: '10px'
    },
    liveDot: {
        width: '8px',
        height: '8px',
        background: '#27ae60',
        borderRadius: '50%',
        animation: 'pulse 1.5s infinite'
    },
    filterSection: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '20px 30px',
        marginBottom: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
    },
    filterTitle: {
        color: '#2c3e50',
        marginBottom: '15px',
        marginTop: 0,
        fontSize: '18px'
    },
    periodButtons: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
    },
    periodBtn: {
        padding: '12px 28px',
        border: '2px solid #8e44ad',
        background: 'transparent',
        color: '#8e44ad',
        borderRadius: '30px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s'
    },
    periodBtnActive: {
        background: '#8e44ad',
        color: 'white'
    },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '30px'
    },
    chartCard: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
    },
    chartTitle: {
        color: '#2c3e50',
        marginBottom: '25px',
        marginTop: 0,
        fontSize: '20px'
    },
    chartContainer: {
        position: 'relative',
        height: '300px'
    }
};
