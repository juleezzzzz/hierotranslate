'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [signs, setSigns] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSign, setEditingSign] = useState(null);
    const [message, setMessage] = useState('');

    // Mot de passe admin - à changer !
    const ADMIN_PASSWORD = 'Chamalo77850!';

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
            loadSigns();
        } else {
            setError('Mot de passe incorrect');
        }
    };

    const loadSigns = async () => {
        try {
            const res = await fetch('/gardiner_signs.json');
            const data = await res.json();
            setSigns(data);
        } catch (err) {
            console.error('Erreur chargement:', err);
        }
    };

    const handleEdit = (sign) => {
        setEditingSign({ ...sign });
    };

    const handleSave = async () => {
        if (!editingSign) return;

        // Mettre à jour le signe dans la liste locale
        const updatedSigns = signs.map(s =>
            s.code === editingSign.code ? editingSign : s
        );
        setSigns(updatedSigns);
        setEditingSign(null);
        setMessage('⚠️ Modification locale uniquement. Pour sauvegarder définitivement, téléchargez le fichier JSON et remplacez-le dans le projet.');

        setTimeout(() => setMessage(''), 5000);
    };

    const handleDownloadJSON = () => {
        const dataStr = JSON.stringify(signs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gardiner_signs.json';
        a.click();
    };

    const filteredSigns = signs.filter(s => {
        const search = searchTerm.toLowerCase();
        return s.code?.toLowerCase().includes(search) ||
            s.description?.toLowerCase().includes(search) ||
            s.transliteration?.toLowerCase().includes(search);
    });

    if (!isAuthenticated) {
        return (
            <div style={styles.loginContainer}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>🔐 Administration</h1>
                    <p style={styles.subtitle}>Hierotranslate - Zone sécurisée</p>

                    <form onSubmit={handleLogin} style={styles.form}>
                        <input
                            type="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                        />
                        {error && <p style={styles.error}>{error}</p>}
                        <button type="submit" style={styles.button}>
                            Se connecter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>🔧 Administration Gardiner</h1>
                <div style={styles.headerActions}>
                    <button onClick={handleDownloadJSON} style={styles.downloadBtn}>
                        📥 Télécharger JSON
                    </button>
                    <button onClick={() => setIsAuthenticated(false)} style={styles.logoutBtn}>
                        Déconnexion
                    </button>
                </div>
            </header>

            {message && <div style={styles.message}>{message}</div>}

            <div style={styles.searchBar}>
                <input
                    type="text"
                    placeholder="Rechercher un signe (code, description...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <span style={styles.count}>{filteredSigns.length} signes</span>
            </div>

            {editingSign && (
                <div style={styles.editModal}>
                    <div style={styles.editContent}>
                        <h2>Modifier {editingSign.code}</h2>
                        <div style={styles.signPreview}>{editingSign.sign}</div>

                        <label style={styles.label}>Code</label>
                        <input
                            value={editingSign.code || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, code: e.target.value })}
                            style={styles.editInput}
                            disabled
                        />

                        <label style={styles.label}>Signe</label>
                        <input
                            value={editingSign.sign || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, sign: e.target.value })}
                            style={styles.editInput}
                        />

                        <label style={styles.label}>Translittération</label>
                        <input
                            value={editingSign.transliteration || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, transliteration: e.target.value })}
                            style={styles.editInput}
                        />

                        <label style={styles.label}>Description</label>
                        <input
                            value={editingSign.description || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, description: e.target.value })}
                            style={styles.editInput}
                        />

                        <label style={styles.label}>Descriptif détaillé</label>
                        <textarea
                            value={editingSign.descriptif || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, descriptif: e.target.value })}
                            style={styles.editTextarea}
                        />

                        <div style={styles.editActions}>
                            <button onClick={() => setEditingSign(null)} style={styles.cancelBtn}>
                                Annuler
                            </button>
                            <button onClick={handleSave} style={styles.saveBtn}>
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.table}>
                <div style={styles.tableHeader}>
                    <span style={styles.colSign}>Signe</span>
                    <span style={styles.colCode}>Code</span>
                    <span style={styles.colTranslit}>Translit.</span>
                    <span style={styles.colDesc}>Description</span>
                    <span style={styles.colAction}>Action</span>
                </div>

                {filteredSigns.slice(0, 100).map((sign, i) => (
                    <div key={sign.code || i} style={styles.tableRow}>
                        <span style={styles.colSign}>{sign.sign}</span>
                        <span style={styles.colCode}>{sign.code}</span>
                        <span style={styles.colTranslit}>{sign.transliteration || '-'}</span>
                        <span style={styles.colDesc}>{sign.description || '-'}</span>
                        <span style={styles.colAction}>
                            <button onClick={() => handleEdit(sign)} style={styles.editBtn}>
                                ✏️
                            </button>
                        </span>
                    </div>
                ))}
            </div>

            {filteredSigns.length > 100 && (
                <p style={styles.moreInfo}>
                    Affichage limité à 100 signes. Utilisez la recherche pour trouver un signe spécifique.
                </p>
            )}
        </div>
    );
}

const styles = {
    loginContainer: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    },
    loginBox: {
        background: '#ffffff',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%',
    },
    title: {
        fontSize: '2rem',
        marginBottom: '0.5rem',
        color: '#1a1a2e',
    },
    subtitle: {
        color: '#666',
        marginBottom: '2rem',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    input: {
        padding: '1rem',
        fontSize: '1rem',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        outline: 'none',
    },
    button: {
        padding: '1rem',
        fontSize: '1rem',
        fontWeight: '600',
        background: '#c9a227',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    error: {
        color: '#e74c3c',
        margin: '0',
    },
    container: {
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    headerActions: {
        display: 'flex',
        gap: '1rem',
    },
    downloadBtn: {
        padding: '0.75rem 1.5rem',
        background: '#27ae60',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
    },
    logoutBtn: {
        padding: '0.75rem 1.5rem',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    message: {
        padding: '1rem',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    searchBar: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    searchInput: {
        flex: 1,
        padding: '0.75rem',
        fontSize: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
    },
    count: {
        color: '#666',
    },
    table: {
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '80px 100px 120px 1fr 80px',
        padding: '1rem',
        background: '#2b2b2b',
        color: 'white',
        fontWeight: '600',
    },
    tableRow: {
        display: 'grid',
        gridTemplateColumns: '80px 100px 120px 1fr 80px',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #eee',
        alignItems: 'center',
    },
    colSign: { fontFamily: 'Noto Sans Egyptian Hieroglyphs', fontSize: '1.5rem' },
    colCode: {},
    colTranslit: { fontFamily: 'Gentium Plus, serif' },
    colDesc: { fontSize: '0.9rem', color: '#555' },
    colAction: {},
    editBtn: {
        padding: '0.5rem',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.2rem',
    },
    editModal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    editContent: {
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    signPreview: {
        fontSize: '4rem',
        textAlign: 'center',
        padding: '1rem',
        fontFamily: 'Noto Sans Egyptian Hieroglyphs',
    },
    label: {
        display: 'block',
        marginTop: '1rem',
        marginBottom: '0.25rem',
        fontWeight: '600',
        color: '#555',
    },
    editInput: {
        width: '100%',
        padding: '0.75rem',
        fontSize: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        boxSizing: 'border-box',
    },
    editTextarea: {
        width: '100%',
        padding: '0.75rem',
        fontSize: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        minHeight: '100px',
        boxSizing: 'border-box',
    },
    editActions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
    },
    cancelBtn: {
        flex: 1,
        padding: '0.75rem',
        background: '#eee',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    saveBtn: {
        flex: 1,
        padding: '0.75rem',
        background: '#c9a227',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
    },
    moreInfo: {
        textAlign: 'center',
        color: '#888',
        padding: '1rem',
    },
};
