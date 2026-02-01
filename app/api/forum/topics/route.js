import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// GET - Liste tous les sujets (public)
export async function GET(request) {
    try {
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non configurée' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const topics = await db.collection('forum_topics')
            .find({})
            .sort({ lastReplyAt: -1, createdAt: -1 })
            .limit(50)
            .toArray();

        return NextResponse.json({
            success: true,
            topics: topics.map(t => ({
                id: t._id.toString(),
                title: t.title,
                content: t.content.substring(0, 150) + (t.content.length > 150 ? '...' : ''),
                authorName: t.authorName,
                authorPicture: t.authorPicture,
                createdAt: t.createdAt,
                repliesCount: t.repliesCount || 0,
                likesCount: t.likesCount || 0,
                lastReplyAt: t.lastReplyAt
            }))
        });

    } catch (error) {
        console.error('Get topics error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// POST - Créer un nouveau sujet (authentifié)
export async function POST(request) {
    try {
        // Vérifier l'authentification
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Connexion requise pour poster' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Session expirée, veuillez vous reconnecter' },
                { status: 401 }
            );
        }

        const { title, content } = await request.json();

        // Validation
        if (!title || title.trim().length < 3) {
            return NextResponse.json(
                { success: false, error: 'Le titre doit contenir au moins 3 caractères' },
                { status: 400 }
            );
        }

        if (!content || content.trim().length < 10) {
            return NextResponse.json(
                { success: false, error: 'Le contenu doit contenir au moins 10 caractères' },
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

        // Récupérer les infos de l'utilisateur
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(decoded.userId) },
            { projection: { username: 1, profilePicture: 1 } }
        );

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        const now = new Date();
        const newTopic = {
            title: title.trim(),
            content: content.trim(),
            authorId: new ObjectId(decoded.userId),
            authorName: user.username,
            authorPicture: user.profilePicture || null,
            createdAt: now,
            lastReplyAt: now,
            repliesCount: 0,
            likesCount: 0
        };

        const result = await db.collection('forum_topics').insertOne(newTopic);

        return NextResponse.json({
            success: true,
            message: 'Sujet créé avec succès',
            topic: {
                id: result.insertedId.toString(),
                ...newTopic,
                authorId: undefined
            }
        });

    } catch (error) {
        console.error('Create topic error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la création du sujet' },
            { status: 500 }
        );
    }
}
