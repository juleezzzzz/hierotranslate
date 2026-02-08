'use client';
import { useState, useEffect, useRef } from 'react';

export default function AdminLayoutsPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [layouts, setLayouts] = useState([]);
    const [currentLayout, setCurrentLayout] = useState(null);
    const [baseSign, setBaseSign] = useState('');
    const [signs, setSigns] = useState([]);
    const [newSign, setNewSign] = useState('');
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [message, setMessage] = useState('');
    const canvasRef = useRef(null);
    const [canvasSize] = useState({ width: 400, height: 300 });

    // Gardiner keyboard for quick sign selection
    const hieroglyphKeys = ['𓀀', '𓁐', '𓂋', '𓂧', '𓃀', '𓃭', '𓄿', '𓅓', '𓅱', '𓆑', '𓆓', '𓇋', '𓇳', '𓈖', '𓈙', '𓈎', '𓉐', '𓉔', '𓊃', '𓊪', '𓋴', '𓌸', '𓍯', '𓍿', '𓎛', '𓎟', '𓏏', '𓏤', '𓏥', '𓐍', '𓐙', '𓊹'];

    const handleLogin = () => {
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'admin123') {
            setIsAuthenticated(true);
            loadLayouts();
        } else {
            setMessage('Mot de passe incorrect');
        }
    };

    const loadLayouts = async () => {
        try {
            const res = await fetch('/api/admin/layouts');
            const data = await res.json();
            if (data.success) {
                setLayouts(data.layouts || []);
            }
        } catch (error) {
            console.error('Error loading layouts:', error);
        }
    };

    const addSign = () => {
        if (newSign && newSign.trim()) {
            setSigns([...signs, {
                char: newSign.trim(),
                x: canvasSize.width / 2,
                y: canvasSize.height / 2
            }]);
            setNewSign('');
        }
    };

    const handleMouseDown = (index, e) => {
        setDraggingIndex(index);
    };

    const handleMouseMove = (e) => {
        if (draggingIndex === null) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newSigns = [...signs];
        newSigns[draggingIndex] = { ...newSigns[draggingIndex], x, y };
        setSigns(newSigns);
    };

    const handleMouseUp = () => {
        setDraggingIndex(null);
    };

    const saveLayout = async () => {
        if (!baseSign) {
            setMessage('Veuillez sélectionner un signe de base');
            return;
        }

        // Convert pixel positions to relative em units
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        const scale = 100; // pixels per em

        const relativePositions = signs.map(s => ({
            sign: s.char,
            x: ((s.x - centerX) / scale).toFixed(2),
            y: ((s.y - centerY) / scale).toFixed(2)
        }));

        try {
            const res = await fetch('/api/admin/layouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseSign,
                    positions: relativePositions
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Layout sauvegardé !');
                loadLayouts();
            } else {
                setMessage('Erreur: ' + data.message);
            }
        } catch (error) {
            setMessage('Erreur lors de la sauvegarde');
        }
    };

    const loadLayout = (layout) => {
        setBaseSign(layout.baseSign);
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        const scale = 100;

        const pixelPositions = layout.positions.map(p => ({
            char: p.sign,
            x: centerX + parseFloat(p.x) * scale,
            y: centerY + parseFloat(p.y) * scale
        }));
        setSigns(pixelPositions);
        setCurrentLayout(layout);
    };

    const deleteLayout = async (id) => {
        if (!confirm('Supprimer ce layout ?')) return;
        try {
            const res = await fetch(`/api/admin/layouts?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMessage('Layout supprimé');
                loadLayouts();
            }
        } catch (error) {
            setMessage('Erreur lors de la suppression');
        }
    };

    const clearEditor = () => {
        setBaseSign('');
        setSigns([]);
        setCurrentLayout(null);
    };

    if (!isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.loginCard}>
                    <h1 style={styles.title}>🎨 Éditeur de Layouts</h1>
                    <input
                        type="password"
                        placeholder="Mot de passe admin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        style={styles.input}
                    />
                    <button onClick={handleLogin} style={styles.button}>Connexion</button>
                    {message && <p style={styles.error}>{message}</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>🎨 Éditeur de Position des Hiéroglyphes</h1>

            <div style={styles.mainLayout}>
                {/* Left Panel - Editor */}
                <div style={styles.editorPanel}>
                    <h2 style={styles.subtitle}>Éditeur</h2>

                    {/* Base Sign Selection */}
                    <div style={styles.section}>
                        <label style={styles.label}>Signe de base :</label>
                        <input
                            type="text"
                            value={baseSign}
                            onChange={(e) => setBaseSign(e.target.value)}
                            placeholder="Ex: 𓉔"
                            style={styles.inputSmall}
                        />
                        <div style={styles.keyboard}>
                            {hieroglyphKeys.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBaseSign(h)}
                                    style={{
                                        ...styles.keyboardKey,
                                        background: baseSign === h ? '#b8860b' : '#f5f0e6',
                                        color: baseSign === h ? 'white' : '#333'
                                    }}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Signs */}
                    <div style={styles.section}>
                        <label style={styles.label}>Ajouter un signe :</label>
                        <div style={styles.addRow}>
                            <input
                                type="text"
                                value={newSign}
                                onChange={(e) => setNewSign(e.target.value)}
                                placeholder="Ex: 𓈖"
                                style={styles.inputSmall}
                            />
                            <button onClick={addSign} style={styles.addButton}>+ Ajouter</button>
                        </div>
                        <div style={styles.keyboard}>
                            {hieroglyphKeys.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => setNewSign(h)}
                                    style={styles.keyboardKey}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Canvas */}
                    <div style={styles.section}>
                        <label style={styles.label}>Zone de positionnement (glissez les signes) :</label>
                        <div
                            ref={canvasRef}
                            style={styles.canvas}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* Center reference - Base Sign */}
                            {baseSign && (
                                <div style={styles.baseSignDisplay}>
                                    {baseSign}
                                </div>
                            )}

                            {/* Draggable signs */}
                            {signs.map((sign, index) => (
                                <div
                                    key={index}
                                    style={{
                                        ...styles.draggableSign,
                                        left: sign.x - 20,
                                        top: sign.y - 20,
                                        cursor: draggingIndex === index ? 'grabbing' : 'grab',
                                        background: draggingIndex === index ? '#ffe4b5' : '#fff8dc'
                                    }}
                                    onMouseDown={(e) => handleMouseDown(index, e)}
                                >
                                    {sign.char}
                                    <button
                                        style={styles.removeSign}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSigns(signs.filter((_, i) => i !== index));
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {/* Grid lines */}
                            <div style={styles.gridLineH}></div>
                            <div style={styles.gridLineV}></div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={styles.actions}>
                        <button onClick={saveLayout} style={styles.saveButton}>💾 Sauvegarder</button>
                        <button onClick={clearEditor} style={styles.clearButton}>🗑️ Effacer</button>
                    </div>

                    {message && <p style={styles.message}>{message}</p>}
                </div>

                {/* Right Panel - Saved Layouts */}
                <div style={styles.layoutsPanel}>
                    <h2 style={styles.subtitle}>Layouts sauvegardés</h2>
                    {layouts.length === 0 ? (
                        <p style={styles.emptyText}>Aucun layout sauvegardé</p>
                    ) : (
                        <div style={styles.layoutsList}>
                            {layouts.map((layout, i) => (
                                <div key={i} style={styles.layoutCard}>
                                    <div style={styles.layoutPreview}>
                                        <span style={styles.layoutBase}>{layout.baseSign}</span>
                                        <span style={styles.layoutChildren}>
                                            {layout.positions.map(p => p.sign).join(' ')}
                                        </span>
                                    </div>
                                    <div style={styles.layoutActions}>
                                        <button onClick={() => loadLayout(layout)} style={styles.loadButton}>Charger</button>
                                        <button onClick={() => deleteLayout(layout._id)} style={styles.deleteButton}>×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f0e6 0%, #e8dcc8 100%)',
        padding: '2rem',
        fontFamily: "'Source Sans 3', sans-serif"
    },
    loginCard: {
        maxWidth: '400px',
        margin: '100px auto',
        padding: '2rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center'
    },
    title: {
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '2rem',
        color: '#2c2416',
        marginBottom: '1.5rem',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: '1.2rem',
        color: '#4a3f2e',
        marginBottom: '1rem',
        borderBottom: '2px solid #b8860b',
        paddingBottom: '0.5rem'
    },
    input: {
        width: '100%',
        padding: '0.8rem',
        fontSize: '1rem',
        border: '1px solid #d4c9b5',
        borderRadius: '6px',
        marginBottom: '1rem'
    },
    inputSmall: {
        padding: '0.5rem',
        fontSize: '1.2rem',
        border: '1px solid #d4c9b5',
        borderRadius: '4px',
        width: '80px',
        textAlign: 'center'
    },
    button: {
        width: '100%',
        padding: '0.8rem',
        fontSize: '1rem',
        background: '#b8860b',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    error: { color: '#e74c3c', marginTop: '1rem' },
    mainLayout: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    editorPanel: {
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    layoutsPanel: {
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    section: {
        marginBottom: '1.5rem'
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '600',
        color: '#4a3f2e'
    },
    keyboard: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginTop: '0.5rem'
    },
    keyboardKey: {
        width: '36px',
        height: '36px',
        fontSize: '1.2rem',
        border: '1px solid #d4c9b5',
        borderRadius: '4px',
        background: '#f5f0e6',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem'
    },
    addButton: {
        padding: '0.5rem 1rem',
        background: '#27ae60',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    canvas: {
        width: '400px',
        height: '300px',
        border: '2px solid #d4c9b5',
        borderRadius: '8px',
        background: '#fffef9',
        position: 'relative',
        overflow: 'hidden'
    },
    baseSignDisplay: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '3rem',
        color: '#b8860b',
        pointerEvents: 'none',
        fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif"
    },
    draggableSign: {
        position: 'absolute',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        border: '2px solid #b8860b',
        borderRadius: '6px',
        userSelect: 'none',
        fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif"
    },
    removeSign: {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        width: '18px',
        height: '18px',
        fontSize: '12px',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: '1px',
        background: 'rgba(184, 134, 11, 0.3)',
        pointerEvents: 'none'
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '1px',
        background: 'rgba(184, 134, 11, 0.3)',
        pointerEvents: 'none'
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1rem'
    },
    saveButton: {
        flex: 1,
        padding: '0.8rem',
        fontSize: '1rem',
        background: '#b8860b',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    clearButton: {
        padding: '0.8rem 1.5rem',
        fontSize: '1rem',
        background: '#95a5a6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    message: {
        marginTop: '1rem',
        padding: '0.5rem',
        background: '#d4edda',
        color: '#155724',
        borderRadius: '4px',
        textAlign: 'center'
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic'
    },
    layoutsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    layoutCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.8rem',
        background: '#f8f5f0',
        borderRadius: '6px',
        border: '1px solid #e0d6c4'
    },
    layoutPreview: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    layoutBase: {
        fontSize: '1.5rem',
        fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif"
    },
    layoutChildren: {
        fontSize: '1.2rem',
        color: '#666',
        fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif"
    },
    layoutActions: {
        display: 'flex',
        gap: '0.5rem'
    },
    loadButton: {
        padding: '0.3rem 0.8rem',
        fontSize: '0.85rem',
        background: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    deleteButton: {
        width: '28px',
        height: '28px',
        fontSize: '1rem',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    }
};
