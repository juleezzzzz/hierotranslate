import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chamalo77850!';

export async function GET(request) {
    try {
        // Check admin password
        const authHeader = request.headers.get('x-admin-password');
        if (authHeader !== ADMIN_PASSWORD) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
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
        const users = await db.collection('users')
            .find({})
            .project({ password: 0, verificationToken: 0 })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            users: users.map(user => ({
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                stats: user.stats || { searchCount: 0 },
                favoritesCount: user.favorites?.length || 0
            })),
            count: users.length
        });

    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        // Check admin password
        const authHeader = request.headers.get('x-admin-password');
        if (authHeader !== ADMIN_PASSWORD) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'ID utilisateur requis' },
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
        const { ObjectId } = await import('mongodb');

        const result = await db.collection('users').deleteOne({
            _id: new ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Utilisateur supprimé'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
