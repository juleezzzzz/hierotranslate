'use client';

import { useState, useEffect } from 'react';

export default function AdminSignsPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [signs, setSigns] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [editingSign, setEditingSign] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSign, setNewSign] = useState({ code: '', character: '', transliteration: '', description: '', descriptif: '' });

    const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Aa'];

    const getPassword = () => password || localStorage.getItem('adminPassword');

    const authenticate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/signs?limit=1', {
                headers: { 'x-admin-password': password }
            });
            const data = await res.json();

            if (data.success) {
                setIsAuthenticated(true);
                localStorage.setItem('adminPassword', password);
                loadSigns();
            } else {
                setError('Mot de passe incorrect');
            }
        } catch (err) {
            setError('Erreur de connexion');
        }
        setLoading(false);
    };

    const loadSigns = async (searchQuery = search, cat = category) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set('search', searchQuery);
            if (cat) params.set('category', cat);
            params.set('limit', '100');

            const res = await fetch(`/api/admin/signs?${params}`, {
                headers: { 'x-admin-password': getPassword() }
            });
            const data = await res.json();
            if (data.success) {
                setSigns(data.signs);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Error loading signs:', err);
        }
        setLoading(false);
    };

    const addSign = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/signs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify(newSign)
            });
            const data = await res.json();

            if (data.success) {
                setMessage('Signe ajouté avec succès');
                setNewSign({ code: '', character: '', transliteration: '', description: '', descriptif: '' });
                setShowAddForm(false);
                loadSigns();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur lors de l\'ajout');
        }
    };

    const updateSign = async (sign) => {
        try {
            const res = await fetch('/api/admin/signs', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify(sign)
            });
            const data = await res.json();

            if (data.success) {
                setMessage('Signe mis à jour');
                setEditingSign(null);
                loadSigns();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur lors de la mise à jour');
        }
    };

    const deleteSign = async (id, code) => {
        if (!confirm(`Supprimer le signe ${code} ?`)) return;

        try {
            const res = await fetch('/api/admin/signs', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();

            if (data.success) {
                setMessage(`Signe ${code} supprimé`);
                loadSigns();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur lors de la suppression');
        }
    };

    const importFromJSON = async () => {
        try {
            const res = await fetch('/gardiner_signs.json');
            const jsonSigns = await res.json();

            if (!confirm(`Importer ${jsonSigns.length} signes depuis le fichier JSON ? Cela remplacera tous les signes existants.`)) return;

            setLoading(true);
            const importRes = await fetch('/api/admin/signs/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify({ signs: jsonSigns })
            });
            const data = await importRes.json();

            if (data.success) {
                setMessage(data.message);
                loadSigns();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur lors de l\'import');
        }
        setLoading(false);
    };

    useEffect(() => {
        const savedPwd = localStorage.getItem('adminPassword');
        if (savedPwd) {
            setPassword(savedPwd);
            fetch('/api/admin/signs?limit=1', { headers: { 'x-admin-password': savedPwd } })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setIsAuthenticated(true);
                        loadSigns();
                    }
                });
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.loginCard}>
                    <h1 style={styles.title}>🔐 Admin Hiéroglyphes</h1>
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
                    <h1 style={styles.title}>𓀀 Admin Hiéroglyphes ({total} signes)</h1>
                    <div>
                        <button onClick={importFromJSON} style={styles.importBtn}>📥 Importer JSON</button>
                        <button onClick={() => { localStorage.removeItem('adminPassword'); setIsAuthenticated(false); }} style={styles.logoutBtn}>Déconnexion</button>
                    </div>
                </header>

                {message && <div style={styles.successMsg}>{message}</div>}
                {error && <div style={styles.errorMsg}>{error}</div>}

                {/* Search and Filter */}
                <div style={styles.filters}>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (code, translittération, description)..."
                        style={{ ...styles.input, flex: 1 }}
                    />
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
                        <option value="">Toutes catégories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => loadSigns()} style={styles.searchBtn}>🔍 Rechercher</button>
                    <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>➕ Ajouter</button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div style={styles.addForm}>
                        <h3>Ajouter un signe</h3>
                        <form onSubmit={addSign} style={styles.formGrid}>
                            <input value={newSign.code} onChange={(e) => setNewSign({ ...newSign, code: e.target.value })} placeholder="Code (ex: A1)" style={styles.input} required />
                            <input value={newSign.character} onChange={(e) => setNewSign({ ...newSign, character: e.target.value })} placeholder="Caractère (ex: 𓀀)" style={{ ...styles.input, fontSize: '24px' }} />
                            <input value={newSign.transliteration} onChange={(e) => setNewSign({ ...newSign, transliteration: e.target.value })} placeholder="Translittération" style={styles.input} />
                            <input value={newSign.description} onChange={(e) => setNewSign({ ...newSign, description: e.target.value })} placeholder="Description" style={styles.input} />
                            <textarea value={newSign.descriptif} onChange={(e) => setNewSign({ ...newSign, descriptif: e.target.value })} placeholder="Descriptif détaillé" style={{ ...styles.input, gridColumn: '1 / -1' }} rows={3} />
                            <button type="submit" style={{ ...styles.button, gridColumn: '1 / -1' }}>Ajouter le signe</button>
                        </form>
                    </div>
                )}

                {/* Signs Table */}
                <div style={styles.tableContainer}>
                    {loading ? (
                        <p style={styles.loading}>Chargement...</p>
                    ) : signs.length === 0 ? (
                        <p style={styles.empty}>Aucun signe trouvé. Utilisez "Importer JSON" pour charger les signes Gardiner.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Signe</th>
                                    <th style={styles.th}>Code</th>
                                    <th style={styles.th}>Translittération</th>
                                    <th style={styles.th}>Description</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signs.map(sign => (
                                    <tr key={sign.id} style={styles.tr}>
                                        {editingSign?.id === sign.id ? (
                                            <>
                                                <td style={styles.td}>
                                                    <input value={editingSign.character} onChange={(e) => setEditingSign({ ...editingSign, character: e.target.value })} style={{ ...styles.inputSmall, fontSize: '24px', width: '60px' }} />
                                                </td>
                                                <td style={styles.td}>
                                                    <input value={editingSign.code} onChange={(e) => setEditingSign({ ...editingSign, code: e.target.value })} style={styles.inputSmall} />
                                                </td>
                                                <td style={styles.td}>
                                                    <input value={editingSign.transliteration} onChange={(e) => setEditingSign({ ...editingSign, transliteration: e.target.value })} style={styles.inputSmall} />
                                                </td>
                                                <td style={styles.td}>
                                                    <input value={editingSign.description} onChange={(e) => setEditingSign({ ...editingSign, description: e.target.value })} style={{ ...styles.inputSmall, width: '200px' }} />
                                                </td>
                                                <td style={styles.td}>
                                                    <button onClick={() => updateSign(editingSign)} style={styles.saveBtn}>💾</button>
                                                    <button onClick={() => setEditingSign(null)} style={styles.cancelBtn}>✖</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ ...styles.td, fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' }}>{sign.character}</td>
                                                <td style={{ ...styles.td, fontWeight: 'bold' }}>{sign.code}</td>
                                                <td style={styles.td}>{sign.transliteration}</td>
                                                <td style={styles.td}>{sign.description?.substring(0, 50)}{sign.description?.length > 50 ? '...' : ''}</td>
                                                <td style={styles.td}>
                                                    <button onClick={() => setEditingSign({ ...sign })} style={styles.editBtn}>✏️</button>
                                                    <button onClick={() => deleteSign(sign.id, sign.code)} style={styles.deleteBtn}>🗑️</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <footer style={styles.footer}>
                    <a href="/admin-hierotranslate-secret" style={styles.link}>← Admin Utilisateurs</a>
                    <span style={{ margin: '0 20px' }}>|</span>
                    <a href="/" style={styles.link}>← Retour au site</a>
                </footer>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
    loginCard: { maxWidth: '400px', margin: '100px auto', background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    dashboard: { maxWidth: '1400px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #eee', flexWrap: 'wrap', gap: '10px' },
    title: { color: '#1e3a5f', margin: 0, fontSize: '24px' },
    input: { padding: '12px', fontSize: '14px', border: '2px solid #ddd', borderRadius: '8px', boxSizing: 'border-box', width: '100%', marginBottom: '10px' },
    inputSmall: { padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' },
    select: { padding: '12px', fontSize: '14px', border: '2px solid #ddd', borderRadius: '8px', background: 'white', minWidth: '150px' },
    button: { padding: '12px 20px', fontSize: '14px', background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)', color: '#1e3a5f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    filters: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    searchBtn: { padding: '12px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    addBtn: { padding: '12px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    importBtn: { padding: '10px 20px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' },
    logoutBtn: { padding: '10px 20px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    addForm: { background: '#f9f9f9', padding: '20px', borderRadius: '12px', marginBottom: '20px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { background: '#1e3a5f', color: 'white', padding: '12px 15px', textAlign: 'left' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '12px 15px', verticalAlign: 'middle' },
    editBtn: { background: '#2196F3', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    saveBtn: { background: '#4CAF50', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    cancelBtn: { background: '#888', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' },
    deleteBtn: { background: '#ff4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' },
    error: { color: '#ff4444', marginBottom: '15px' },
    errorMsg: { background: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
    successMsg: { background: '#e8f5e9', color: '#2e7d32', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
    loading: { textAlign: 'center', padding: '40px', color: '#888' },
    empty: { textAlign: 'center', padding: '40px', color: '#888', background: '#f9f9f9', borderRadius: '8px' },
    footer: { textAlign: 'center', paddingTop: '20px', marginTop: '20px', borderTop: '1px solid #eee' },
    link: { color: '#1e3a5f', textDecoration: 'none' }
};
