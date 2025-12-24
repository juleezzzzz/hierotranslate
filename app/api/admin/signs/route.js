import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chamalo77850!';

// Check admin auth
function checkAuth(request) {
    const authHeader = request.headers.get('x-admin-password');
    return authHeader === ADMIN_PASSWORD;
}

// GET - List all signs or search
export async function GET(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const limit = parseInt(searchParams.get('limit')) || 100;
        const skip = parseInt(searchParams.get('skip')) || 0;

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non configurée' }, { status: 500 });
        }

        const db = client.db('hierotranslate');

        // Build query
        let query = {};
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { transliteration: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            query.code = { $regex: `^${category}`, $options: 'i' };
        }

        const signs = await db.collection('signs')
            .find(query)
            .sort({ code: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('signs').countDocuments(query);

        return NextResponse.json({
            success: true,
            signs: signs.map(s => ({ ...s, id: s._id.toString() })),
            total,
            hasMore: skip + signs.length < total
        });

    } catch (error) {
        console.error('Get signs error:', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}

// POST - Add new sign
export async function POST(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { code, character, transliteration, description, descriptif } = await request.json();

        if (!code) {
            return NextResponse.json({ success: false, error: 'Code Gardiner requis' }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non configurée' }, { status: 500 });
        }

        const db = client.db('hierotranslate');

        // Check if code already exists
        const existing = await db.collection('signs').findOne({ code: code.toUpperCase() });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 400 });
        }

        const newSign = {
            code: code.toUpperCase(),
            character: character || '',
            transliteration: transliteration || '',
            description: description || '',
            descriptif: descriptif || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('signs').insertOne(newSign);

        return NextResponse.json({
            success: true,
            sign: { ...newSign, id: result.insertedId.toString() }
        });

    } catch (error) {
        console.error('Add sign error:', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}

// PUT - Update sign
export async function PUT(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { id, code, character, transliteration, description, descriptif } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non configurée' }, { status: 500 });
        }

        const db = client.db('hierotranslate');

        const updateData = { updatedAt: new Date() };
        if (code !== undefined) updateData.code = code.toUpperCase();
        if (character !== undefined) updateData.character = character;
        if (transliteration !== undefined) updateData.transliteration = transliteration;
        if (description !== undefined) updateData.description = description;
        if (descriptif !== undefined) updateData.descriptif = descriptif;

        await db.collection('signs').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return NextResponse.json({ success: true, message: 'Signe mis à jour' });

    } catch (error) {
        console.error('Update sign error:', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}

// DELETE - Delete sign
export async function DELETE(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non configurée' }, { status: 500 });
        }

        const db = client.db('hierotranslate');
        await db.collection('signs').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true, message: 'Signe supprimé' });

    } catch (error) {
        console.error('Delete sign error:', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}
