import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';

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

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '24h';

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non configurée' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const users = db.collection('users');
        const loginEvents = db.collection('login_events');

        // Calculate start date based on period
        const now = new Date();
        let startDate;
        let groupFormat;

        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
        }

        // Total users
        const totalUsers = await users.countDocuments();

        // New users in period
        const newUsersPeriod = await users.countDocuments({
            createdAt: { $gte: startDate }
        });

        // Logins in period
        const loginsPeriod = await loginEvents.countDocuments({
            loggedAt: { $gte: startDate }
        });

        // Users chart data
        const usersChart = await users.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: groupFormat,
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Logins chart data
        const loginsGroupFormat = groupFormat.$dateToString
            ? { $dateToString: { ...groupFormat.$dateToString, date: '$loggedAt' } }
            : groupFormat;

        const loginsChart = await loginEvents.aggregate([
            { $match: { loggedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: loginsGroupFormat,
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        return NextResponse.json({
            success: true,
            totalUsers,
            newUsersPeriod,
            loginsPeriod,
            usersChart: usersChart.map(d => ({ period: d._id, count: d.count })),
            loginsChart: loginsChart.map(d => ({ period: d._id, count: d.count })),
            period
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
