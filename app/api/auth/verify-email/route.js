import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyVerificationToken } from '../../../../lib/auth';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token de vérification manquant' },
                { status: 400 }
            );
        }

        // Verify token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide ou expiré' },
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
        const users = db.collection('users');

        // Find and update user
        const result = await users.updateOne(
            { email: decoded.email, verificationToken: token },
            {
                $set: {
                    emailVerified: true,
                    updatedAt: new Date()
                },
                $unset: { verificationToken: '' }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé ou déjà vérifié' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Email vérifié avec succès !'
        });

    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la vérification' },
            { status: 500 }
        );
    }
}
