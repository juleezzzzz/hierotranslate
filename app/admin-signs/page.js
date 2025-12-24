'use client';

import { useState, useEffect } from 'react';

export default function AdminSignsPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [signs, setSigns] = useState([]);
    const [translations, setTranslations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Composer state
    const [composerGroups, setComposerGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        transliteration: '',
        hieroglyphs: '',
        french: '',
        notes: ''
    });

    // Edit state
    const [editingId, setEditingId] = useState(null);

    // Category filter
    const [activeCategory, setActiveCategory] = useState('A');
    const categories = ['A', 'Aa', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // Keyboard focus state
    const [keyboardActive, setKeyboardActive] = useState(false);

    // Keyboard mapping - tu peux personnaliser ces touches!
    // Format: { 'touche clavier': 'hiéroglyphe' }
    const keyboardMap = {
        'a': '𓋹', // ankh - vie
        '-': '𓏺', // Z1 - trait vertical (déterminatif)
        'z': '𓏤', // Z2 - trait horizontal
        'e': '𓏭', // triple trait
        'r': '𓇋', // i - roseau
        't': '𓏏', // t - pain
        'y': '𓇌', // y - double roseau
        'u': '𓅱', // w - caille
        'i': '𓇳', // soleil
        'o': '𓂋', // r - bouche  
        'p': '𓉐', // pr - maison
        'q': '𓈎', // k - corbeille
        's': '𓋴', // s - tissu
        'd': '𓂧', // d - main
        'f': '𓆑', // f - vipère
        'g': '𓎼', // g - jarre
        'h': '𓉔', // h - cour
        'j': '𓆓', // dj - serpent
        'k': '𓎡', // k - corbeille
        'l': '𓃭', // l - lion
        'm': '𓅓', // m - chouette
        'n': '𓈖', // n - eau
        'b': '𓃀', // b - jambe
        'v': '𓆭', // plante
        'c': '𓍿', // tch
        'w': '𓅱', // w - caille
        'x': '𓄡', // kh
        ' ': '𓐠', // espace = séparateur
        '1': '𓏺', // Z1
        '2': '𓏻', // Z2
        '3': '𓏼', // Z3
    };

    const ADMIN_PASSWORD = 'Chamalo77850!';

    const getPassword = () => password || localStorage.getItem('adminPassword');

    const authenticate = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            localStorage.setItem('adminPassword', password);
            loadSigns();
            loadTranslations();
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
            console.error('Erreur chargement signes:', err);
        }
    };

    const loadTranslations = async () => {
        try {
            const res = await fetch('/api/admin/signs?limit=500', {
                headers: { 'x-admin-password': getPassword() }
            });
            const data = await res.json();
            if (data.success) {
                setTranslations(data.signs || []);
            }
        } catch (err) {
            console.error('Erreur chargement traductions:', err);
        }
    };

    // Composer functions
    const addToComposer = (sign) => {
        const newGroup = {
            id: Date.now(),
            signs: [sign.sign || sign.character],
            code: sign.code
        };
        setComposerGroups([...composerGroups, newGroup]);
        updateHieroglyphsField([...composerGroups, newGroup]);
    };

    const toggleGroupSelection = (groupId) => {
        if (selectedGroups.includes(groupId)) {
            setSelectedGroups(selectedGroups.filter(id => id !== groupId));
        } else {
            setSelectedGroups([...selectedGroups, groupId]);
        }
    };

    const stackSelected = () => {
        if (selectedGroups.length < 2) {
            setMessage('Sélectionnez au moins 2 groupes pour empiler');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const selectedGroupsData = composerGroups.filter(g => selectedGroups.includes(g.id));
        const remainingGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));

        const allSigns = selectedGroupsData.flatMap(g => g.signs);
        const stackedGroup = {
            id: Date.now(),
            signs: allSigns,
            stacked: true,
            codes: selectedGroupsData.map(g => g.code).join(':')
        };

        const firstIndex = composerGroups.findIndex(g => selectedGroups.includes(g.id));
        remainingGroups.splice(firstIndex, 0, stackedGroup);

        setComposerGroups(remainingGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(remainingGroups);
    };

    const unstackSelected = () => {
        if (selectedGroups.length !== 1) return;

        const group = composerGroups.find(g => g.id === selectedGroups[0]);
        if (!group || !group.stacked) return;

        const newGroups = group.signs.map((sign, i) => ({
            id: Date.now() + i,
            signs: [sign],
            code: group.codes?.split(':')[i] || ''
        }));

        const index = composerGroups.findIndex(g => g.id === group.id);
        const updatedGroups = [...composerGroups];
        updatedGroups.splice(index, 1, ...newGroups);

        setComposerGroups(updatedGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(updatedGroups);
    };

    const deleteSelected = () => {
        const updatedGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));
        setComposerGroups(updatedGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(updatedGroups);
    };

    const clearComposer = () => {
        setComposerGroups([]);
        setSelectedGroups([]);
        setFormData({ ...formData, hieroglyphs: '' });
    };

    const updateHieroglyphsField = (groups) => {
        const hieroglyphs = groups.map(g => g.signs.join('')).join('');
        setFormData(prev => ({ ...prev, hieroglyphs }));
    };

    const getComposerPreview = () => {
        return composerGroups.map(g => g.signs.join('')).join('');
    };

    // Keyboard handler for hieroglyph input
    const handleKeyboardInput = (e) => {
        const key = e.key.toLowerCase();

        // Check if key is mapped to a hieroglyph
        if (keyboardMap[key]) {
            e.preventDefault();
            const hieroglyph = keyboardMap[key];

            // Add the hieroglyph to composer
            const newGroup = {
                id: Date.now(),
                signs: [hieroglyph],
                code: `KEY-${key.toUpperCase()}`
            };
            const newGroups = [...composerGroups, newGroup];
            setComposerGroups(newGroups);
            updateHieroglyphsField(newGroups);
        }

        // Backspace removes last group
        if (e.key === 'Backspace' && composerGroups.length > 0) {
            e.preventDefault();
            const newGroups = composerGroups.slice(0, -1);
            setComposerGroups(newGroups);
            updateHieroglyphsField(newGroups);
        }
    };

    // Quick add Z1 stroke
    const addZ1Stroke = () => {
        const newGroup = {
            id: Date.now(),
            signs: ['𓏺'],
            code: 'Z1'
        };
        const newGroups = [...composerGroups, newGroup];
        setComposerGroups(newGroups);
        updateHieroglyphsField(newGroups);
    };

    // Form functions
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.transliteration || !formData.hieroglyphs) {
            setError('Translittération et hiéroglyphes requis');
            return;
        }

        try {
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId
                ? { id: editingId, ...formData, code: formData.transliteration.toUpperCase() }
                : { ...formData, code: formData.transliteration.toUpperCase(), character: formData.hieroglyphs, description: formData.french };

            const res = await fetch('/api/admin/signs', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.success) {
                setMessage(editingId ? 'Traduction mise à jour !' : 'Traduction ajoutée !');
                setFormData({ transliteration: '', hieroglyphs: '', french: '', notes: '' });
                setComposerGroups([]);
                setSelectedGroups([]);
                setEditingId(null);
                loadTranslations();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur serveur');
        }
    };

    const editTranslation = (trans) => {
        setEditingId(trans.id);
        setFormData({
            transliteration: trans.transliteration || trans.code || '',
            hieroglyphs: trans.character || '',
            french: trans.description || '',
            notes: trans.descriptif || ''
        });
        setMessage(`Modification de "${trans.transliteration || trans.code}"`);
    };

    const deleteTranslation = async (id, name) => {
        if (!confirm(`Supprimer "${name}" ?`)) return;

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
                setMessage('Traduction supprimée');
                loadTranslations();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setError('Erreur suppression');
        }
    };

    const filteredSigns = signs.filter(s => {
        const code = (s.code || '').toUpperCase();
        if (activeCategory === 'Aa') {
            return code.startsWith('AA');
        }
        return code.startsWith(activeCategory) && !code.startsWith('AA');
    });

    useEffect(() => {
        const savedPwd = localStorage.getItem('adminPassword');
        if (savedPwd && savedPwd === ADMIN_PASSWORD) {
            setPassword(savedPwd);
            setIsAuthenticated(true);
            loadSigns();
            loadTranslations();
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div style={styles.loginContainer}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>🔐 Administration du Dictionnaire</h1>
                    <form onSubmit={authenticate} style={styles.form}>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe admin" style={styles.input} autoFocus />
                        {error && <p style={styles.error}>{error}</p>}
                        <button type="submit" style={styles.button}>Accéder</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>Administration du Dictionnaire Hiéroglyphique</h1>
                <div>
                    <a href="/" style={styles.backLink}>← Retour au Traducteur</a>
                    <button onClick={() => { localStorage.removeItem('adminPassword'); setIsAuthenticated(false); }} style={styles.logoutBtn}>Déconnexion</button>
                </div>
            </header>

            {message && <div style={styles.successMsg}>{message}</div>}
            {error && <div style={styles.errorMsg}>{error}</div>}

            {/* Form Section */}
            <section style={styles.section}>
                <h2>{editingId ? '✏️ Modifier la Traduction' : '➕ Ajouter une Nouvelle Traduction'}</h2>

                {/* Visual Composer */}
                <div style={styles.composerSection}>
                    <h3>🎨 Compositeur Visuel de Hiéroglyphes</h3>

                    <div style={styles.composerLayout}>
                        {/* Composer Area */}
                        <div style={styles.composerLeft}>
                            <p style={styles.composerLabel}>Zone de composition (cliquez pour sélectionner, puis empiler)</p>
                            <div style={styles.composerArea}>
                                {composerGroups.length === 0 ? (
                                    <span style={styles.placeholder}>Cliquez sur un signe à droite pour l'ajouter...</span>
                                ) : (
                                    composerGroups.map(group => (
                                        <div
                                            key={group.id}
                                            onClick={() => toggleGroupSelection(group.id)}
                                            style={{
                                                ...styles.composerGroup,
                                                ...(selectedGroups.includes(group.id) ? styles.selectedGroup : {}),
                                                ...(group.stacked ? styles.stackedGroup : {})
                                            }}
                                        >
                                            {group.stacked ? (
                                                <div style={styles.stackedSigns}>
                                                    {group.signs.map((s, i) => <div key={i} style={styles.stackedSign}>{s}</div>)}
                                                </div>
                                            ) : (
                                                <span style={styles.composerSign}>{group.signs[0]}</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Keyboard Input Zone */}
                            <div style={styles.keyboardSection}>
                                <p style={styles.keyboardLabel}>⌨️ Zone de saisie clavier (cliquez ici et tapez)</p>
                                <input
                                    type="text"
                                    onKeyDown={handleKeyboardInput}
                                    onFocus={() => setKeyboardActive(true)}
                                    onBlur={() => setKeyboardActive(false)}
                                    placeholder="Cliquez ici et tapez sur votre clavier..."
                                    style={{
                                        ...styles.keyboardInput,
                                        ...(keyboardActive ? styles.keyboardInputActive : {})
                                    }}
                                    readOnly
                                />
                                <p style={styles.keyboardHint}>
                                    <strong>Raccourcis :</strong> a=𓏺(Z1) | m=𓅓 | n=𓈖 | p=𓉐 | t=𓏏 | i=𓇳 | Backspace=effacer
                                </p>
                            </div>

                            <div style={styles.composerControls}>
                                <button onClick={addZ1Stroke} style={styles.ctrlBtnZ1}>𓏺 Ajouter Z1</button>
                                <button onClick={stackSelected} style={styles.ctrlBtn} disabled={selectedGroups.length < 2}>⬆️ Empiler</button>
                                <button onClick={unstackSelected} style={styles.ctrlBtn} disabled={selectedGroups.length !== 1}>↔️ Désempiler</button>
                                <button onClick={deleteSelected} style={styles.ctrlBtnDanger} disabled={selectedGroups.length === 0}>🗑️ Supprimer</button>
                                <button onClick={clearComposer} style={styles.ctrlBtnWarning}>🔄 Tout effacer</button>
                            </div>

                            <div style={styles.preview}>
                                <strong>Prévisualisation :</strong>
                                <span style={styles.previewText}>{getComposerPreview() || '—'}</span>
                            </div>
                        </div>

                        {/* Sign Picker */}
                        <div style={styles.composerRight}>
                            <p style={styles.composerLabel}>Sélecteur de signes Gardiner</p>

                            <div style={styles.categoryTabs}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={activeCategory === cat ? styles.activeTab : styles.tab}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div style={styles.signGrid}>
                                {filteredSigns.slice(0, 100).map((sign, i) => (
                                    <div
                                        key={sign.code || i}
                                        onClick={() => addToComposer(sign)}
                                        style={styles.signItem}
                                        title={sign.description}
                                    >
                                        <span style={styles.signChar}>{sign.sign || sign.character}</span>
                                        <span style={styles.signCode}>{sign.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} style={styles.formGrid}>
                    <div style={styles.formGroup}>
                        <label>Translittération (ex: nfr, ḥtp, sꜣ)</label>
                        <input
                            type="text"
                            value={formData.transliteration}
                            onChange={(e) => setFormData({ ...formData, transliteration: e.target.value })}
                            style={styles.input}
                            placeholder="nfr"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label>Hiéroglyphes</label>
                        <input
                            type="text"
                            value={formData.hieroglyphs}
                            onChange={(e) => setFormData({ ...formData, hieroglyphs: e.target.value })}
                            style={{ ...styles.input, fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' }}
                            placeholder="𓄤"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label>Traduction Française</label>
                        <input
                            type="text"
                            value={formData.french}
                            onChange={(e) => setFormData({ ...formData, french: e.target.value })}
                            style={styles.input}
                            placeholder="beau, bon, parfait"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label>Notes / Code Gardiner (Optionnel)</label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            style={styles.input}
                            placeholder="F35"
                        />
                    </div>

                    <button type="submit" style={styles.submitBtn}>
                        {editingId ? '💾 Mettre à jour' : '➕ Enregistrer la Traduction'}
                    </button>

                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setFormData({ transliteration: '', hieroglyphs: '', french: '', notes: '' }); }} style={styles.cancelBtn}>
                            Annuler
                        </button>
                    )}
                </form>
            </section>

            {/* Translations List */}
            <section style={styles.section}>
                <h2>📚 Traductions Actuelles ({translations.length})</h2>

                {translations.length === 0 ? (
                    <p style={styles.empty}>Le dictionnaire est vide. Ajoutez des traductions ci-dessus.</p>
                ) : (
                    <div style={styles.translationsList}>
                        {translations.slice(0, 50).map(trans => (
                            <div key={trans.id} style={styles.translationItem}>
                                <span style={styles.transHiero}>{trans.character}</span>
                                <span style={styles.transCode}>{trans.transliteration || trans.code}</span>
                                <span style={styles.transDesc}>{trans.description || '—'}</span>
                                <div style={styles.transActions}>
                                    <button onClick={() => editTranslation(trans)} style={styles.editBtn}>✏️</button>
                                    <button onClick={() => deleteTranslation(trans.id, trans.transliteration || trans.code)} style={styles.deleteBtn}>🗑️</button>
                                </div>
                            </div>
                        ))}
                        {translations.length > 50 && <p style={styles.moreInfo}>Affichage limité à 50 traductions...</p>}
                    </div>
                )}
            </section>

            <footer style={styles.footer}>
                <a href="/admin-hierotranslate-secret" style={styles.link}>👥 Admin Utilisateurs</a>
            </footer>
        </div>
    );
}

const styles = {
    loginContainer: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' },
    loginBox: { background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    container: { padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e3a5f', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    title: { color: '#1e3a5f', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', width: '100%', boxSizing: 'border-box' },
    button: { padding: '15px', fontSize: '16px', background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)', color: '#1e3a5f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    backLink: { color: 'white', textDecoration: 'none', marginRight: '20px' },
    logoutBtn: { padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    section: { background: 'white', padding: '25px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
    composerSection: { marginBottom: '25px' },
    composerLayout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    composerLeft: {},
    composerRight: {},
    composerLabel: { fontWeight: 'bold', marginBottom: '10px', color: '#555' },
    composerArea: { minHeight: '100px', border: '2px dashed #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#fafafa' },
    placeholder: { color: '#999', fontStyle: 'italic' },
    composerGroup: { padding: '10px', border: '2px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: 'white', transition: 'all 0.2s' },
    selectedGroup: { borderColor: '#9b59b6', background: '#f3e5f5' },
    stackedGroup: { background: '#e3f2fd' },
    composerSign: { fontSize: '32px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    stackedSigns: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    stackedSign: { fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', lineHeight: 1 },
    composerControls: { display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' },
    ctrlBtn: { padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnDanger: { padding: '8px 15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnWarning: { padding: '8px 15px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnZ1: { padding: '8px 15px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Noto Sans Egyptian Hieroglyphs', fontSize: '16px' },
    keyboardSection: { marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', border: '2px solid #4CAF50' },
    keyboardLabel: { fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' },
    keyboardInput: { width: '100%', padding: '15px', fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', border: '2px solid #4CAF50', borderRadius: '8px', background: 'white', textAlign: 'center', cursor: 'text', caretColor: 'transparent' },
    keyboardInputActive: { borderColor: '#2e7d32', boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)', background: '#f1f8e9' },
    keyboardHint: { fontSize: '12px', color: '#555', marginTop: '10px', fontFamily: 'monospace' },
    preview: { marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' },
    previewText: { fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', marginLeft: '15px' },
    categoryTabs: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' },
    tab: { padding: '8px 12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    activeTab: { padding: '8px 12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    signGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: '#fafafa', borderRadius: '8px' },
    signItem: { padding: '8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
    signChar: { display: 'block', fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    signCode: { display: 'block', fontSize: '10px', color: '#888' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    submitBtn: { padding: '15px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', gridColumn: '1 / -1' },
    cancelBtn: { padding: '15px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', gridColumn: '1 / -1' },
    translationsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    translationItem: { display: 'grid', gridTemplateColumns: '80px 150px 1fr 80px', alignItems: 'center', padding: '15px', background: '#fafafa', borderRadius: '8px', gap: '15px' },
    transHiero: { fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    transCode: { fontWeight: 'bold', fontFamily: 'Gentium Plus, serif' },
    transDesc: { color: '#555' },
    transActions: { display: 'flex', gap: '5px' },
    editBtn: { padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    deleteBtn: { padding: '8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: '#e74c3c' },
    errorMsg: { background: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    successMsg: { background: '#e8f5e9', color: '#2e7d32', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    empty: { textAlign: 'center', color: '#888', padding: '40px' },
    moreInfo: { textAlign: 'center', color: '#888', padding: '10px' },
    footer: { textAlign: 'center', padding: '20px' },
    link: { color: '#1e3a5f', textDecoration: 'none' }
};
