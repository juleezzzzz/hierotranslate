'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

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
                setStats(data.stats);
                localStorage.setItem('adminPassword', password);
                loadUsers();
            } else {
                setError('Mot de passe incorrect');
            }
        } catch (err) {
            setError('Erreur de connexion');
        }
        setLoading(false);
    };

    const loadUsers = async () => {
        const pwd = password || localStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'x-admin-password': pwd }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (err) {
            console.error('Error loading users:', err);
        }
    };

    const loadStats = async () => {
        const pwd = password || localStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-password': pwd }
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const deleteUser = async (userId, username) => {
        if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;

        const pwd = password || localStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': pwd
                },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();

            if (data.success) {
                setMessage(`Utilisateur "${username}" supprimé`);
                loadUsers();
                loadStats();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur lors de la suppression');
        }
    };

    const deleteAllUsers = async () => {
        if (!confirm('⚠️ ATTENTION: Supprimer TOUS les utilisateurs ? Cette action est irréversible !')) return;
        if (!confirm('Êtes-vous vraiment sûr ? Tous les comptes seront supprimés !')) return;

        for (const user of users) {
            await deleteUser(user.id, user.username);
        }
        setMessage('Tous les utilisateurs ont été supprimés');
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
                        setStats(data.stats);
                        setPassword(savedPwd);
                        loadUsers();
                    }
                });
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.loginCard}>
                    <h1 style={styles.title}>🔐 Admin Hierotranslate</h1>
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
        <div style={styles.container}>
            <div style={styles.dashboard}>
                <header style={styles.header}>
                    <h1 style={styles.title}>📊 Admin Hierotranslate</h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('adminPassword');
                            setIsAuthenticated(false);
                        }}
                        style={styles.logoutBtn}
                    >
                        Déconnexion
                    </button>
                </header>

                {message && <div style={styles.successMsg}>{message}</div>}
                {error && <div style={styles.errorMsg}>{error}</div>}

                {/* Stats Cards */}
                {stats && (
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <span style={styles.statValue}>{stats.totalUsers}</span>
                            <span style={styles.statLabel}>Utilisateurs</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statValue}>{stats.verifiedUsers}</span>
                            <span style={styles.statLabel}>Email vérifié</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statValue}>{stats.unverifiedUsers}</span>
                            <span style={styles.statLabel}>Non vérifié</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statValue}>{stats.totalSearches}</span>
                            <span style={styles.statLabel}>Recherches</span>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>👥 Utilisateurs ({users.length})</h2>
                        <div>
                            <button onClick={loadUsers} style={styles.refreshBtn}>🔄 Rafraîchir</button>
                            {users.length > 0 && (
                                <button onClick={deleteAllUsers} style={styles.dangerBtn}>🗑️ Supprimer tout</button>
                            )}
                        </div>
                    </div>

                    {users.length === 0 ? (
                        <p style={styles.emptyMsg}>Aucun utilisateur</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Utilisateur</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Vérifié</th>
                                    <th style={styles.th}>Recherches</th>
                                    <th style={styles.th}>Favoris</th>
                                    <th style={styles.th}>Inscrit le</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={styles.tr}>
                                        <td style={styles.td}><strong>{user.username}</strong></td>
                                        <td style={styles.td}>{user.email}</td>
                                        <td style={styles.td}>{user.emailVerified ? '✅' : '❌'}</td>
                                        <td style={styles.td}>{user.stats?.searchCount || 0}</td>
                                        <td style={styles.td}>{user.favoritesCount}</td>
                                        <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => deleteUser(user.id, user.username)}
                                                style={styles.deleteBtn}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent Activity */}
                {stats?.recentUsers?.length > 0 && (
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>🕐 Dernières inscriptions</h2>
                        <ul style={styles.list}>
                            {stats.recentUsers.map((user, i) => (
                                <li key={i} style={styles.listItem}>
                                    <strong>{user.username}</strong> - {new Date(user.createdAt).toLocaleString('fr-FR')}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <footer style={styles.footer}>
                    <a href="/" style={styles.backLink}>← Retour au site</a>
                </footer>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    loginCard: {
        maxWidth: '400px',
        margin: '100px auto',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    dashboard: {
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #eee'
    },
    title: {
        color: '#1e3a5f',
        margin: 0,
        fontSize: '28px'
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
        background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)',
        color: '#1e3a5f',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    logoutBtn: {
        padding: '10px 20px',
        background: '#eee',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    statCard: {
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        padding: '25px',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'white'
    },
    statValue: {
        display: 'block',
        fontSize: '36px',
        fontWeight: 'bold'
    },
    statLabel: {
        fontSize: '14px',
        opacity: 0.8
    },
    section: {
        marginBottom: '30px'
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    sectionTitle: {
        color: '#1e3a5f',
        margin: 0
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
    },
    th: {
        background: '#f5f5f5',
        padding: '12px 15px',
        textAlign: 'left',
        borderBottom: '2px solid #ddd',
        color: '#1e3a5f'
    },
    tr: {
        borderBottom: '1px solid #eee'
    },
    td: {
        padding: '12px 15px'
    },
    deleteBtn: {
        background: '#ff4444',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    refreshBtn: {
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '6px',
        cursor: 'pointer',
        marginRight: '10px'
    },
    dangerBtn: {
        background: '#ff4444',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    error: {
        color: '#ff4444',
        marginBottom: '15px'
    },
    errorMsg: {
        background: '#ffebee',
        color: '#c62828',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    successMsg: {
        background: '#e8f5e9',
        color: '#2e7d32',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    emptyMsg: {
        textAlign: 'center',
        color: '#888',
        padding: '40px'
    },
    list: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    listItem: {
        padding: '10px 0',
        borderBottom: '1px solid #eee'
    },
    footer: {
        textAlign: 'center',
        paddingTop: '20px',
        marginTop: '20px',
        borderTop: '1px solid #eee'
    },
    backLink: {
        color: '#1e3a5f',
        textDecoration: 'none'
    }
};
