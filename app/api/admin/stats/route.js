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

        // Get user stats
        const totalUsers = await db.collection('users').countDocuments();
        const verifiedUsers = await db.collection('users').countDocuments({ emailVerified: true });

        // Get recent users
        const recentUsers = await db.collection('users')
            .find({})
            .project({ username: 1, createdAt: 1 })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();

        // Get total searches
        const searchStats = await db.collection('users').aggregate([
            { $group: { _id: null, totalSearches: { $sum: '$stats.searchCount' } } }
        ]).toArray();

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                verifiedUsers,
                unverifiedUsers: totalUsers - verifiedUsers,
                totalSearches: searchStats[0]?.totalSearches || 0,
                recentUsers: recentUsers.map(u => ({
                    username: u.username,
                    createdAt: u.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
