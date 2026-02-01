import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { sendPasswordResetEmail } from '../../../../lib/email';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email requis' },
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
        const user = await db.collection('users').findOne({
            email: email.toLowerCase()
        });

        // Toujours retourner succès pour éviter l'énumération d'emails
        if (!user) {
            return NextResponse.json({
                success: true,
                message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'
            });
        }

        // Générer un token sécurisé
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

        // Sauvegarder le token hashé en base
        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: {
                    passwordResetToken: resetTokenHash,
                    passwordResetExpiry: resetTokenExpiry
                }
            }
        );

        // Envoyer l'email
        const emailResult = await sendPasswordResetEmail(
            user.email,
            user.username,
            resetToken
        );

        if (!emailResult.success) {
            console.error('Failed to send password reset email:', emailResult.error);
        }

        return NextResponse.json({
            success: true,
            message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
