'use client';

import { useState, useEffect } from 'react';

export default function AdminProposalsPage() {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    // Data state
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Editing state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        // Check session or local auth
        const savedAuth = sessionStorage.getItem('admin_proposals_auth');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            fetchProposals();
        }
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        // Hardcoded check for now, matching other admin pages logic ideally
        // In real app, verify against API or env var
        if (password === 'thot2024') { // Using same secret as known from other pages if typical
            sessionStorage.setItem('admin_proposals_auth', 'true');
            setIsAuthenticated(true);
            fetchProposals();
        } else {
            alert('Mot de passe incorrect');
        }
    };

    const fetchProposals = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proposals');
            const data = await res.json();
            if (data.success) {
                setProposals(data.data);
            } else {
                setError('Failed to fetch data');
            }
        } catch (err) {
            setError('Network error');
        }
        setLoading(false);
    };

    const handleAction = async (id, action, data = null) => {
        if (!confirm(`Are you sure you want to ${action} this proposal?`)) return;

        try {
            const res = await fetch('/api/proposals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action, data })
            });
            const resData = await res.json();

            if (resData.success) {
                // Refresh list
                fetchProposals();
                if (editingId === id) setEditingId(null);
            } else {
                alert('Error: ' + resData.error);
            }
        } catch (err) {
            alert('Error executing action');
        }
    };

    const startEdit = (proposal) => {
        setEditingId(proposal._id);
        setEditForm({ ...proposal });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveAndAccept = () => {
        // Prepare dictionary entry format
        const entry = {
            sign: editForm.hieroglyphs, // Mapping to 'sign' as expected by dictionary
            transliteration: editForm.transliteration,
            description: editForm.french, // Mapping to 'description'
            // Add other fields if necessary
        };

        handleAction(editingId, 'accept', entry);
    };

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
                <h1>Admin Propositions</h1>
                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Secret Thot"
                        style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none' }}>
                        Entrer
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Gestion des Propositions ({proposals.length})</h1>
                <button onClick={() => { sessionStorage.removeItem('admin_proposals_auth'); setIsAuthenticated(false); }}
                    style={{ padding: '5px 10px' }}>Logout</button>
            </div>

            {loading && <p>Chargement...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {proposals.length === 0 && !loading && (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    Aucune proposition en attente.
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>
                {proposals.map(p => (
                    <div key={p._id} style={{
                        border: '1px solid #ddd',
                        padding: '20px',
                        borderRadius: '8px',
                        background: editingId === p._id ? '#fffbf0' : 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}>
                        {editingId === p._id ? (
                            // EDIT MODE
                            <div style={{ display: 'grid', gap: '10px' }}>
                                <h3>Édition avant validation</h3>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', color: '#666' }}>Hiéroglyphes</label>
                                    <input
                                        type="text"
                                        value={editForm.hieroglyphs || ''}
                                        onChange={e => setEditForm({ ...editForm, hieroglyphs: e.target.value })}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', color: '#666' }}>Translittération</label>
                                    <input
                                        type="text"
                                        value={editForm.transliteration || ''}
                                        onChange={e => setEditForm({ ...editForm, transliteration: e.target.value })}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', color: '#666' }}>Français</label>
                                    <input
                                        type="text"
                                        value={editForm.french || ''}
                                        onChange={e => setEditForm({ ...editForm, french: e.target.value })}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                    <button onClick={saveAndAccept} style={{ flex: 1, background: '#4caf50', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        ✅ Valider et Ajouter
                                    </button>
                                    <button onClick={cancelEdit} style={{ background: '#ddd', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '2em', fontFamily: 'serif' }}>{p.hieroglyphs}</span>
                                        <span style={{ fontWeight: 'bold' }}>{p.transliteration}</span>
                                    </div>
                                    <div style={{ fontSize: '1.2em', color: '#333' }}>{p.french}</div>
                                    {p.notes && <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>Note: {p.notes}</div>}
                                    <div style={{ fontSize: '0.8em', color: '#999', marginTop: '10px' }}>
                                        Soumis le {new Date(p.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button onClick={() => startEdit(p)} style={{ padding: '8px 15px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        ✏️ Éditer / Vérifier
                                    </button>
                                    <button onClick={() => handleAction(p._id, 'reject')} style={{ padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        🗑️ Rejeter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
