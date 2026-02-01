import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// POST - Ajouter une réponse à un sujet
export async function POST(request) {
    try {
        // Vérifier l'authentification
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Connexion requise pour répondre' },
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

        const { topicId, content } = await request.json();

        // Validation
        if (!topicId || !ObjectId.isValid(topicId)) {
            return NextResponse.json(
                { success: false, error: 'ID de sujet invalide' },
                { status: 400 }
            );
        }

        if (!content || content.trim().length < 2) {
            return NextResponse.json(
                { success: false, error: 'La réponse doit contenir au moins 2 caractères' },
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

        // Vérifier que le sujet existe
        const topic = await db.collection('forum_topics').findOne(
            { _id: new ObjectId(topicId) }
        );

        if (!topic) {
            return NextResponse.json(
                { success: false, error: 'Sujet non trouvé' },
                { status: 404 }
            );
        }

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
        const newReply = {
            topicId: new ObjectId(topicId),
            content: content.trim(),
            authorId: new ObjectId(decoded.userId),
            authorName: user.username,
            authorPicture: user.profilePicture || null,
            createdAt: now
        };

        const result = await db.collection('forum_replies').insertOne(newReply);

        // Mettre à jour le compteur de réponses et la date de dernière réponse
        await db.collection('forum_topics').updateOne(
            { _id: new ObjectId(topicId) },
            {
                $inc: { repliesCount: 1 },
                $set: { lastReplyAt: now }
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Réponse ajoutée',
            reply: {
                id: result.insertedId.toString(),
                content: newReply.content,
                authorName: newReply.authorName,
                authorPicture: newReply.authorPicture,
                createdAt: newReply.createdAt
            }
        });

    } catch (error) {
        console.error('Create reply error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de l\'ajout de la réponse' },
            { status: 500 }
        );
    }
}
