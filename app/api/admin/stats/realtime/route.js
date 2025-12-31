import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

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
        const activeSessions = db.collection('active_sessions');

        // Clean up inactive sessions (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        await activeSessions.deleteMany({ lastActivity: { $lt: fiveMinutesAgo } });

        // Count active sessions
        const activeCount = await activeSessions.countDocuments();

        // Count logged-in users (with userId)
        const loggedInCount = await activeSessions.countDocuments({
            userId: { $ne: null }
        });

        return NextResponse.json({
            success: true,
            activeSessions: activeCount,
            loggedInUsers: loggedInCount
        });

    } catch (error) {
        console.error('Realtime stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
