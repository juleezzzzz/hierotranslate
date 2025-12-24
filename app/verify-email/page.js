'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('Vérification en cours...');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token de vérification manquant');
            return;
        }

        fetch(`/api/auth/verify-email?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus('success');
                    setMessage('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Erreur lors de la vérification');
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('Erreur de connexion au serveur');
            });
    }, [searchParams]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                background: 'white',
                padding: '60px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '500px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                    {status === 'verifying' && '⏳'}
                    {status === 'success' && '✅'}
                    {status === 'error' && '❌'}
                </div>

                <h1 style={{
                    color: '#1e3a5f',
                    marginBottom: '20px',
                    fontSize: '28px'
                }}>
                    {status === 'verifying' && 'Vérification...'}
                    {status === 'success' && 'Email vérifié !'}
                    {status === 'error' && 'Erreur'}
                </h1>

                <p style={{
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    marginBottom: '30px'
                }}>
                    {message}
                </p>

                {status === 'success' && (
                    <a
                        href="/"
                        style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)',
                            color: '#1e3a5f',
                            padding: '15px 40px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        Accéder à Hierotranslate
                    </a>
                )}

                {status === 'error' && (
                    <a
                        href="/"
                        style={{
                            display: 'inline-block',
                            background: '#eee',
                            color: '#333',
                            padding: '15px 40px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        Retour à l'accueil
                    </a>
                )}
            </div>
        </div>
    );
}
