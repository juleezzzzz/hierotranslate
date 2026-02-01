'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('form'); // form, loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Lien invalide. Veuillez refaire une demande de réinitialisation.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            setMessage('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (data.success) {
                setStatus('success');
                setMessage('Mot de passe réinitialisé avec succès !');
            } else {
                setStatus('error');
                setMessage(data.error || 'Erreur lors de la réinitialisation');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Erreur de connexion au serveur');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '400px',
                width: '100%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                <h1 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '1.8rem',
                    textAlign: 'center',
                    marginBottom: '10px',
                    color: '#1e3a5f'
                }}>
                    🔐 Nouveau mot de passe
                </h1>

                <p style={{
                    textAlign: 'center',
                    color: '#666',
                    marginBottom: '30px'
                }}>
                    Hierotranslate
                </p>

                {status === 'success' ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        background: '#d4edda',
                        borderRadius: '8px',
                        color: '#155724'
                    }}>
                        <p style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</p>
                        <p>{message}</p>
                        <a href="/" style={{
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '12px 24px',
                            background: '#1e3a5f',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px'
                        }}>
                            Retour à l'accueil
                        </a>
                    </div>
                ) : status === 'error' && !token ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        background: '#f8d7da',
                        borderRadius: '8px',
                        color: '#721c24'
                    }}>
                        <p style={{ fontSize: '2rem', marginBottom: '10px' }}>❌</p>
                        <p>{message}</p>
                        <a href="/" style={{
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '12px 24px',
                            background: '#1e3a5f',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px'
                        }}>
                            Retour à l'accueil
                        </a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#333'
                            }}>
                                Nouveau mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#333'
                            }}>
                                Confirmer le mot de passe
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {message && status === 'error' && (
                            <p style={{
                                color: '#dc3545',
                                marginBottom: '15px',
                                fontSize: '0.9rem'
                            }}>
                                {message}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: status === 'loading' ? '#ccc' : 'linear-gradient(135deg, #c9a227, #d4af37)',
                                color: '#1e3a5f',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: status === 'loading' ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {status === 'loading' ? 'Enregistrement...' : 'Réinitialiser'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)'
            }}>
                <p style={{ color: 'white' }}>Chargement...</p>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
