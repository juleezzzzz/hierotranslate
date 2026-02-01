import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { success: false, error: 'Token et mot de passe requis' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non configurée' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');

        // Hash du token reçu pour comparaison
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Trouver l'utilisateur avec ce token (non expiré)
        const user = await db.collection('users').findOne({
            passwordResetToken: tokenHash,
            passwordResetExpiry: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Lien invalide ou expiré. Veuillez refaire une demande.' },
                { status: 400 }
            );
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // Mettre à jour le mot de passe et supprimer le token
        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: {
                    passwordResetToken: '',
                    passwordResetExpiry: ''
                }
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès !'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
