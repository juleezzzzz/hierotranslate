import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// Get user favorites
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
            { projection: { favorites: 1 } }
        );

        return NextResponse.json({
            success: true,
            favorites: user?.favorites || []
        });

    } catch (error) {
        console.error('Get favorites error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// Add or remove favorite
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

        const { transliteration, action } = await request.json();

        if (!transliteration) {
            return NextResponse.json(
                { success: false, error: 'Translittération requise' },
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

        if (action === 'remove') {
            await users.updateOne(
                { _id: new ObjectId(decoded.userId) },
                {
                    $pull: { favorites: { transliteration } },
                    $set: { updatedAt: new Date() }
                }
            );
        } else {
            // Add favorite (avoid duplicates)
            const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
            const exists = user?.favorites?.some(f => f.transliteration === transliteration);

            if (!exists) {
                await users.updateOne(
                    { _id: new ObjectId(decoded.userId) },
                    {
                        $push: {
                            favorites: {
                                transliteration,
                                addedAt: new Date()
                            }
                        },
                        $set: { updatedAt: new Date() }
                    }
                );
            }
        }

        const updatedUser = await users.findOne(
            { _id: new ObjectId(decoded.userId) },
            { projection: { favorites: 1 } }
        );

        return NextResponse.json({
            success: true,
            favorites: updatedUser?.favorites || []
        });

    } catch (error) {
        console.error('Update favorites error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
