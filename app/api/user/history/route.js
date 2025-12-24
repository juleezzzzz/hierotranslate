import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// Get user search history
export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide' },
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
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(decoded.userId) },
            { projection: { searchHistory: 1, stats: 1 } }
        );

        return NextResponse.json({
            success: true,
            history: user?.searchHistory || [],
            stats: user?.stats || { searchCount: 0, topWord: null }
        });

    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// Add to search history
export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide' },
                { status: 401 }
            );
        }

        const { query, transliteration, hieroglyphs, french } = await request.json();

        if (!query) {
            return NextResponse.json(
                { success: false, error: 'Requête manquante' },
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

        const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

        // Update search history (limit to last 50)
        let history = user?.searchHistory || [];
        history = history.filter(h => h.query !== query); // Remove duplicates
        history.unshift({
            query,
            transliteration,
            hieroglyphs,
            french,
            searchedAt: new Date()
        });
        history = history.slice(0, 50); // Keep last 50

        // Update stats
        const stats = user?.stats || { searchCount: 0, topWord: null, wordCounts: {} };
        stats.searchCount = (stats.searchCount || 0) + 1;

        // Track word frequency
        stats.wordCounts = stats.wordCounts || {};
        stats.wordCounts[query] = (stats.wordCounts[query] || 0) + 1;

        // Find top word
        let maxCount = 0;
        for (const [word, count] of Object.entries(stats.wordCounts)) {
            if (count > maxCount) {
                maxCount = count;
                stats.topWord = word;
            }
        }

        await users.updateOne(
            { _id: new ObjectId(decoded.userId) },
            {
                $set: {
                    searchHistory: history,
                    stats,
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            stats: {
                searchCount: stats.searchCount,
                topWord: stats.topWord
            }
        });

    } catch (error) {
        console.error('Add history error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// Clear history
export async function DELETE(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide' },
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
        await db.collection('users').updateOne(
            { _id: new ObjectId(decoded.userId) },
            {
                $set: {
                    searchHistory: [],
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Historique effacé'
        });

    } catch (error) {
        console.error('Clear history error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
