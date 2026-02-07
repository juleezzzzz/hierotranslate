import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chamalo77850!';

export const dynamic = 'force-dynamic';

// Helper check
function checkAuth(request) {
    const authHeader = request.headers.get('x-admin-password');
    return authHeader === ADMIN_PASSWORD;
}

// GET - List all signs (optionally filter)
export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db('hierotranslate');
        const collection = db.collection('gardiner_signs');

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');

        let query = {};
        if (search) {
            query = {
                $or: [
                    { code: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        } else if (category) {
            // Filter by prefix
            if (category === 'Aa') {
                query = { code: { $regex: '^Aa' } };
            } else {
                query = { code: { $regex: `^${category}[0-9]` } };
            }
        }

        const limit = search || category ? 500 : 1200;

        const signs = await collection.find(query).sort({ code: 1 }).limit(limit).toArray();

        // Convert _id to id
        const cleanSigns = signs.map(s => ({ ...s, id: s._id.toString() }));

        return NextResponse.json({ success: true, signs: cleanSigns });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erreur DB' }, { status: 500 });
    }
}

// POST - Add new
export async function POST(request) {
    if (!checkAuth(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const client = await clientPromise;

        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non connectée (Mode local sans identifiants)' }, { status: 503 });
        }

        const db = client.db('hierotranslate');

        // Duplicate check removed - allows multiple entries with same transliteration
        // This is intentional: same word can be written with different hieroglyphs

        const newSign = {
            code: body.code,
            sign: body.sign || '',
            description: body.description || '',
            transliteration: body.transliteration || '',
            descriptif: body.descriptif || ''
        };

        const res = await db.collection('gardiner_signs').insertOne(newSign);

        return NextResponse.json({ success: true, sign: { ...newSign, id: res.insertedId.toString() } });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erreur création' }, { status: 500 });
    }
}

// PUT - Update
export async function PUT(request) {
    if (!checkAuth(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, ...updateFields } = body;

        if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non connectée (Mode local sans identifiants)' }, { status: 503 });
        }

        const db = client.db('hierotranslate');

        // Remove _id from update fields if present
        delete updateFields._id;

        await db.collection('gardiner_signs').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        return NextResponse.json({ success: true, message: 'Mis à jour' });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erreur mise à jour' }, { status: 500 });
    }
}

// DELETE - Remove
export async function DELETE(request) {
    if (!checkAuth(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await request.json();
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, error: 'Base de données non connectée (Mode local sans identifiants)' }, { status: 503 });
        }

        const db = client.db('hierotranslate');

        await db.collection('gardiner_signs').deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erreur suppression' }, { status: 500 });
    }
}
