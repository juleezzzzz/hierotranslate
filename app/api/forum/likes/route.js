import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../../../../lib/auth';

// POST - Liker/unliker un sujet
export async function POST(request) {
    try {
        // Vérifier l'authentification
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Authentification requise' },
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

        const { topicId } = await request.json();

        if (!topicId || !ObjectId.isValid(topicId)) {
            return NextResponse.json(
                { success: false, error: 'ID de sujet invalide' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non disponible' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const userId = new ObjectId(decoded.userId);
        const topicObjId = new ObjectId(topicId);

        // Vérifier si le sujet existe
        const topic = await db.collection('forum_topics').findOne({ _id: topicObjId });
        if (!topic) {
            return NextResponse.json(
                { success: false, error: 'Sujet non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier si l'utilisateur a déjà liké
        const existingLike = await db.collection('forum_likes').findOne({
            topicId: topicObjId,
            userId: userId
        });

        let liked = false;
        let likesCount = topic.likesCount || 0;

        if (existingLike) {
            // Unlike - supprimer le like
            await db.collection('forum_likes').deleteOne({
                topicId: topicObjId,
                userId: userId
            });
            likesCount = Math.max(0, likesCount - 1);
            liked = false;
        } else {
            // Like - ajouter le like
            await db.collection('forum_likes').insertOne({
                topicId: topicObjId,
                userId: userId,
                createdAt: new Date()
            });
            likesCount = likesCount + 1;
            liked = true;
        }

        // Mettre à jour le compteur de likes du sujet
        await db.collection('forum_topics').updateOne(
            { _id: topicObjId },
            { $set: { likesCount: likesCount } }
        );

        return NextResponse.json({
            success: true,
            liked: liked,
            likesCount: likesCount
        });

    } catch (error) {
        console.error('Forum like error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// GET - Vérifier si l'utilisateur a liké un sujet
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const topicId = searchParams.get('topicId');

        if (!topicId || !ObjectId.isValid(topicId)) {
            return NextResponse.json(
                { success: false, error: 'ID de sujet invalide' },
                { status: 400 }
            );
        }

        // Vérifier l'authentification (optionnel)
        const authHeader = request.headers.get('authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);
            if (decoded) {
                userId = new ObjectId(decoded.userId);
            }
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non disponible' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const topicObjId = new ObjectId(topicId);

        // Récupérer le sujet pour le nombre de likes
        const topic = await db.collection('forum_topics').findOne({ _id: topicObjId });
        if (!topic) {
            return NextResponse.json(
                { success: false, error: 'Sujet non trouvé' },
                { status: 404 }
            );
        }

        let liked = false;
        if (userId) {
            const existingLike = await db.collection('forum_likes').findOne({
                topicId: topicObjId,
                userId: userId
            });
            liked = !!existingLike;
        }

        return NextResponse.json({
            success: true,
            liked: liked,
            likesCount: topic.likesCount || 0
        });

    } catch (error) {
        console.error('Forum like check error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
