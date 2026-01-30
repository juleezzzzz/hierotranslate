'use client';

import { useState, useEffect } from 'react';

export default function AdminGardinerPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [signs, setSigns] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSign, setEditingSign] = useState(null);
    const [message, setMessage] = useState('');
    const [scrollPosition, setScrollPosition] = useState(0);

    const ADMIN_PASSWORD = 'Chamalo77850!';

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
            localStorage.setItem('adminPassword', password);
            loadSigns();
        } else {
            setError('Mot de passe incorrect');
        }
    };

    const loadSigns = async () => {
        try {
            // Fetch from API instead of local JSON
            // We ask for a large limit to get all signs, or we could handle pagination
            // For now, let's assume we want to load them all or search. 
            // The API returns { success: true, signs: [...] }
            const res = await fetch('/api/admin/gardiner');
            const data = await res.json();

            if (data.success) {
                setSigns(data.signs);
            } else {
                setError('Erreur chargement signes: ' + data.error);
                // Fallback to local JSON if DB fails (optional, but good for dev)
                console.log('Falling back to local JSON...');
                try {
                    const localRes = await fetch('/gardiner_signs.json');
                    const localData = await localRes.json();
                    setSigns(localData);
                    setError('Mode hors ligne (fichier local utilisé)');
                } catch (e) {
                    console.error('Local fallback failed', e);
                }
            }
        } catch (err) {
            console.error('Erreur chargement:', err);
            setError('Erreur connexion serveur');
        }
    };

    useEffect(() => {
        const savedPwd = localStorage.getItem('adminPassword');
        if (savedPwd === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            loadSigns();
            setPassword(savedPwd); // Restore password for API calls
        }
    }, []);

    const handleEdit = (sign) => {
        // Sauvegarder la position de scroll avant d'ouvrir le modal
        setScrollPosition(window.scrollY);
        setEditingSign({ ...sign });
    };

    const handleSave = async () => {
        if (!editingSign) return;

        try {
            // Determine if it's an update (has _id/id) or new
            // The API handles _id vs id. Our component uses 'editingSign'.
            const method = editingSign.id || editingSign._id ? 'PUT' : 'POST';

            const res = await fetch('/api/admin/gardiner', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password || localStorage.getItem('adminPassword')
                },
                body: JSON.stringify({
                    id: editingSign.id || editingSign._id, // Needed for PUT
                    ...editingSign
                })
            });

            const data = await res.json();

            if (data.success) {
                // Update local list
                const updatedSigns = signs.map(s =>
                    (s.code === editingSign.code) ? { ...editingSign, ...data.sign } : s
                );

                // If it was a new sign (not in map), add it
                if (!signs.find(s => s.code === editingSign.code)) {
                    updatedSigns.push({ ...editingSign, ...data.sign });
                }

                setSigns(updatedSigns);
                setEditingSign(null);
                setMessage('✅ Modification enregistrée dans la base de données !');

                // Restaurer la position de scroll après fermeture du modal
                setTimeout(() => {
                    window.scrollTo(0, scrollPosition);
                }, 50);

                setTimeout(() => setMessage(''), 3000);
            } else if (res.status === 503) {
                // Mode hors ligne
                const updatedSigns = signs.map(s =>
                    (s.code === editingSign.code) ? editingSign : s
                );
                if (!signs.find(s => s.code === editingSign.code)) {
                    updatedSigns.push(editingSign);
                }
                setSigns(updatedSigns);
                setEditingSign(null);
                setMessage('⚠️ Mode hors ligne : Modification enregistrée LOCALEMENT. Téléchargez le JSON pour sauvegarder.');

                setTimeout(() => {
                    window.scrollTo(0, scrollPosition);
                }, 50);
                setTimeout(() => setMessage(''), 5000);
            } else {
                setError(data.error || 'Erreur sauvegarde');
            }
        } catch (err) {
            setError('Erreur serveur lors de la sauvegarde');
            console.error(err);
        }
    };

    const handleDelete = async (sign) => {
        if (!confirm(`Supprimer définitivement ${sign.code} ?`)) return;

        try {
            const res = await fetch('/api/admin/gardiner', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password || localStorage.getItem('adminPassword')
                },
                body: JSON.stringify({ id: sign.id || sign._id })
            });
            const data = await res.json();
            if (data.success) {
                setSigns(signs.filter(s => s.code !== sign.code));
                setMessage('✅ Signe supprimé');
                setTimeout(() => setMessage(''), 3000);
            } else if (res.status === 503) {
                setSigns(signs.filter(s => s.code !== sign.code));
                setMessage('⚠️ Mode hors ligne : Signe supprimé LOCALEMENT.');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur suppression');
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm(`⚠️ ATTENTION : Vous allez écraser la base de données LIVE avec le contenu de "${file.name}".\n\nCette action est irréversible. Êtes-vous sûr ?`)) {
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const signsData = JSON.parse(event.target.result);

                if (!Array.isArray(signsData) || signsData.length === 0) {
                    alert('Erreur : Le fichier doit contenir un tableau de signes valide.');
                    return;
                }

                setMessage('⏳ Importation en cours... (Cela peut prendre quelques secondes)');

                const res = await fetch('/api/admin/gardiner/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': password || localStorage.getItem('adminPassword')
                    },
                    body: JSON.stringify({
                        force: true,
                        signs: signsData
                    })
                });

                const data = await res.json();

                if (data.success) {
                    setMessage(`✅ ${data.message} La page va se recharger.`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    setError('Erreur import : ' + data.error);
                }
            } catch (err) {
                console.error(err);
                setError('Erreur : Fichier JSON invalide');
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const handleDownloadJSON = () => {
        const dataStr = JSON.stringify(signs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gardiner_signs_backup.json';
        a.click();
    };

    // Ordre des catégories Gardiner (Aa en dernier)
    const categoryOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Aa'];

    // Fonction pour extraire la catégorie et le numéro d'un code Gardiner
    const parseGardinerCode = (code) => {
        if (!code) return { category: 'ZZ', num: 9999, suffix: '' };
        const match = code.match(/^([A-Za-z]+)(\d+)([A-Za-z]?)$/);
        if (match) {
            return {
                category: match[1].toUpperCase() === 'AA' ? 'Aa' : match[1].toUpperCase(),
                num: parseInt(match[2], 10),
                suffix: match[3] || ''
            };
        }
        return { category: 'ZZ', num: 9999, suffix: '' };
    };

    // Trier les signes selon l'ordre Gardiner
    const sortedSigns = [...signs].sort((a, b) => {
        const codeA = parseGardinerCode(a.code);
        const codeB = parseGardinerCode(b.code);

        // Comparer par catégorie d'abord
        const catIndexA = categoryOrder.indexOf(codeA.category);
        const catIndexB = categoryOrder.indexOf(codeB.category);
        const catA = catIndexA === -1 ? 999 : catIndexA;
        const catB = catIndexB === -1 ? 999 : catIndexB;

        if (catA !== catB) return catA - catB;

        // Puis par numéro
        if (codeA.num !== codeB.num) return codeA.num - codeB.num;

        // Puis par suffixe alphabétique
        return codeA.suffix.localeCompare(codeB.suffix);
    });

    const filteredSigns = sortedSigns.filter(s => {
        const search = searchTerm.toLowerCase();
        return s.code?.toLowerCase().includes(search) ||
            s.description?.toLowerCase().includes(search) ||
            s.transliteration?.toLowerCase().includes(search) ||
            s.sign?.includes(search);
    });

    if (!isAuthenticated) {
        return (
            <div style={styles.loginContainer}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>🔐 Administration Gardiner</h1>
                    <p style={styles.subtitle}>Modifier la liste des signes Gardiner</p>

                    <form onSubmit={handleLogin} style={styles.form}>
                        <input
                            type="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            autoFocus
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
                <h1>📜 Base de Données Gardiner (Live)</h1>
                <div style={styles.headerActions}>
                    <a href="/admin-signs" style={styles.linkBtn}>📝 Admin Dictionnaire</a>
                    <button onClick={handleDownloadJSON} style={styles.downloadBtn}>
                        📥 Backup JSON
                    </button>
                    <button onClick={handleDownloadJSON} style={styles.downloadBtn}>
                        📥 Backup JSON
                    </button>
                    <button onClick={() => document.getElementById('importFile').click()} style={{ ...styles.downloadBtn, background: '#e67e22', marginLeft: '10px' }}>
                        📤 Importer Fichier (Live)
                    </button>
                    <input
                        type="file"
                        id="importFile"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportFile}
                    />
                    <button onClick={() => { localStorage.removeItem('adminPassword'); setIsAuthenticated(false); }} style={styles.logoutBtn}>
                        Déconnexion
                    </button>
                </div>
            </header>

            {message && <div style={styles.message}>{message}</div>}
            {error && <div style={{ ...styles.message, background: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }}>{error}</div>}

            <div style={styles.infoBox}>
                <p><strong>📌 Instructions :</strong></p>
                <ul>
                    <li>Recherchez un signe par code (A1, B2...), description ou translittération</li>
                    <li>Cliquez sur ✏️ pour modifier un signe</li>
                    <li>Les modifications sont locales - téléchargez le JSON pour les sauvegarder</li>
                    <li>Remplacez ensuite <code>public/gardiner_signs.json</code> dans le projet</li>
                </ul>
            </div>

            <div style={styles.searchBar}>
                <input
                    type="text"
                    placeholder="🔍 Rechercher un signe (code, description, translittération...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <span style={styles.count}>{filteredSigns.length} / {signs.length} signes</span>
            </div>

            {editingSign && (
                <div style={styles.editModal}>
                    <div style={styles.editContent}>
                        <h2>Modifier {editingSign.code}</h2>
                        <div style={styles.signPreview}>{editingSign.sign}</div>

                        <label style={styles.label}>Code Gardiner</label>
                        <input
                            value={editingSign.code || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, code: e.target.value })}
                            style={styles.editInput}
                            disabled
                        />

                        <label style={styles.label}>Signe (Unicode)</label>
                        <input
                            value={editingSign.sign || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, sign: e.target.value })}
                            style={{ ...styles.editInput, fontFamily: 'Noto Sans Egyptian Hieroglyphs', fontSize: '24px' }}
                        />

                        <label style={styles.label}>Translittération</label>
                        <input
                            value={editingSign.transliteration || ''}
                            onChange={(e) => setEditingSign({ ...editingSign, transliteration: e.target.value })}
                            style={styles.editInput}
                            placeholder="ex: nfr, pr, ḥtp"
                        />

                        <label style={styles.label}>Description (français)</label>
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
                                💾 Sauvegarder
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

                {filteredSigns.map((sign, i) => (
                    <div key={sign.code || i} id={`sign-${sign.code}`} style={styles.tableRow}>
                        <span style={styles.colSign}>{sign.sign}</span>
                        <span style={styles.colCode}>{sign.code}</span>
                        <span style={{ ...styles.colTranslit, color: sign.transliteration ? '#27ae60' : '#e74c3c' }}>
                            {sign.transliteration || '—'}
                        </span>
                        <span style={styles.colDesc}>{sign.description || '—'}</span>
                        <span style={styles.colAction}>
                            <button onClick={() => handleEdit(sign)} style={styles.editBtn}>
                                ✏️
                            </button>
                            <button onClick={() => handleDelete(sign)} style={{ ...styles.editBtn, background: '#e74c3c', marginLeft: '5px' }}>
                                🗑️
                            </button>
                        </span>
                    </div>
                ))}
            </div>



            <footer style={styles.footer}>
                <a href="/" style={styles.footerLink}>← Retour au traducteur</a>
            </footer>
        </div>
    );
}

const styles = {
    loginContainer: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
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
        fontSize: '1.8rem',
        marginBottom: '0.5rem',
        color: '#2c3e50',
    },
    subtitle: {
        color: '#666',
        marginBottom: '2rem',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    input: { padding: '1rem', fontSize: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px', outline: 'none' },
    button: { padding: '1rem', fontSize: '1rem', fontWeight: '600', background: '#c9a227', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    error: { color: '#e74c3c', margin: '0' },
    container: { padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', background: '#2c3e50', color: 'white', padding: '1.5rem', borderRadius: '12px' },
    headerActions: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
    linkBtn: { padding: '0.75rem 1.5rem', background: '#9b59b6', color: 'white', border: 'none', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' },
    downloadBtn: { padding: '0.75rem 1.5rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    logoutBtn: { padding: '0.75rem 1.5rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    message: { padding: '1rem', background: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', marginBottom: '1rem', color: '#155724' },
    infoBox: { padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
    searchBar: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' },
    searchInput: { flex: 1, padding: '0.75rem 1rem', fontSize: '1rem', border: '2px solid #ddd', borderRadius: '8px' },
    count: { color: '#666', whiteSpace: 'nowrap' },
    table: { background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
    tableHeader: { display: 'grid', gridTemplateColumns: '80px 100px 120px 1fr 80px', padding: '1rem', background: '#2c3e50', color: 'white', fontWeight: '600' },
    tableRow: { display: 'grid', gridTemplateColumns: '80px 100px 120px 1fr 80px', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', alignItems: 'center' },
    colSign: { fontFamily: 'Noto Sans Egyptian Hieroglyphs', fontSize: '1.5rem' },
    colCode: { fontWeight: 'bold' },
    colTranslit: { fontFamily: 'Gentium Plus, serif' },
    colDesc: { fontSize: '0.9rem', color: '#555' },
    colAction: {},
    editBtn: { padding: '0.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
    editModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    editContent: { background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' },
    signPreview: { fontSize: '4rem', textAlign: 'center', padding: '1rem', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    label: { display: 'block', marginTop: '1rem', marginBottom: '0.25rem', fontWeight: '600', color: '#555' },
    editInput: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' },
    editTextarea: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '6px', minHeight: '100px', boxSizing: 'border-box' },
    editActions: { display: 'flex', gap: '1rem', marginTop: '1.5rem' },
    cancelBtn: { flex: 1, padding: '0.75rem', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    saveBtn: { flex: 1, padding: '0.75rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    moreInfo: { textAlign: 'center', color: '#888', padding: '1rem' },
    footer: { textAlign: 'center', padding: '2rem' },
    footerLink: { color: '#2c3e50', textDecoration: 'none' },
};
