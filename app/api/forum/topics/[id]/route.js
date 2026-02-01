import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import { verifyToken } from '../../../../../lib/auth';
import { ObjectId } from 'mongodb';

// GET - Récupérer un sujet avec ses réponses
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de sujet invalide' },
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

        // Récupérer le sujet
        const topic = await db.collection('forum_topics').findOne(
            { _id: new ObjectId(id) }
        );

        if (!topic) {
            return NextResponse.json(
                { success: false, error: 'Sujet non trouvé' },
                { status: 404 }
            );
        }

        // Récupérer les réponses
        const replies = await db.collection('forum_replies')
            .find({ topicId: new ObjectId(id) })
            .sort({ createdAt: 1 })
            .toArray();

        return NextResponse.json({
            success: true,
            topic: {
                id: topic._id.toString(),
                title: topic.title,
                content: topic.content,
                authorId: topic.authorId.toString(),
                authorName: topic.authorName,
                authorPicture: topic.authorPicture,
                createdAt: topic.createdAt,
                repliesCount: topic.repliesCount || 0
            },
            replies: replies.map(r => ({
                id: r._id.toString(),
                content: r.content,
                authorId: r.authorId.toString(),
                authorName: r.authorName,
                authorPicture: r.authorPicture,
                createdAt: r.createdAt
            }))
        });

    } catch (error) {
        console.error('Get topic error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer un sujet (auteur uniquement)
export async function DELETE(request, { params }) {
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

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de sujet invalide' },
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

        // Vérifier que l'utilisateur est l'auteur
        const topic = await db.collection('forum_topics').findOne(
            { _id: new ObjectId(id) }
        );

        if (!topic) {
            return NextResponse.json(
                { success: false, error: 'Sujet non trouvé' },
                { status: 404 }
            );
        }

        if (topic.authorId.toString() !== decoded.userId) {
            return NextResponse.json(
                { success: false, error: 'Vous ne pouvez supprimer que vos propres sujets' },
                { status: 403 }
            );
        }

        // Supprimer les réponses associées
        await db.collection('forum_replies').deleteMany({ topicId: new ObjectId(id) });

        // Supprimer le sujet
        await db.collection('forum_topics').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({
            success: true,
            message: 'Sujet supprimé avec succès'
        });

    } catch (error) {
        console.error('Delete topic error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la suppression' },
            { status: 500 }
        );
    }
}
