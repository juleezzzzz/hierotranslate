import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chamalo77850!';

// Import signs from JSON file to MongoDB
export async function POST(request) {
    try {
        const authHeader = request.headers.get('x-admin-password');
        if (authHeader !== ADMIN_PASSWORD) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { signs } = await request.json();

        if (!signs || !Array.isArray(signs)) {
            return NextResponse.json({ success: false, error: 'Tableau de signes requis' }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non configurée' }, { status: 500 });
        }

        const db = client.db('hierotranslate');

        // Clear existing signs
        await db.collection('signs').deleteMany({});

        // Insert new signs
        const signDocs = signs.map(s => ({
            code: s.code || '',
            character: s.character || '',
            transliteration: s.transliteration || '',
            description: s.description || '',
            descriptif: s.descriptif || '',
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        const result = await db.collection('signs').insertMany(signDocs);

        return NextResponse.json({
            success: true,
            message: `${result.insertedCount} signes importés avec succès`,
            count: result.insertedCount
        });

    } catch (error) {
        console.error('Import signs error:', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}
