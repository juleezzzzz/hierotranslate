import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import path from 'path';
import fs from 'fs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chamalo77850!';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('x-admin-password');
        if (authHeader !== ADMIN_PASSWORD) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db('hierotranslate');
        const collection = db.collection('gardiner_signs');

        const { force, signs } = await request.json().catch(() => ({}));

        // Check if already populated
        const count = await collection.countDocuments();
        if (count > 0) {
            if (!force) {
                return NextResponse.json({ success: false, error: 'La collection est déjà initialisée (' + count + ' signes). Utilisez le mode forcé pour écraser.' });
            }
            // Force mode: clear collection
            await collection.deleteMany({});
        }

        let signsArray = [];

        if (signs && Array.isArray(signs)) {
            // Direct import from payload
            signsArray = signs;
        } else {
            // Read JSON file from server (legacy/fallback)
            const jsonPath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
            const fileContent = fs.readFileSync(jsonPath, 'utf8');
            const parsed = JSON.parse(fileContent);

            if (Array.isArray(parsed)) {
                signsArray = parsed;
            } else {
                signsArray = Object.keys(parsed).map(key => ({
                    id: key,
                    ...parsed[key],
                    code: parsed[key].code || key
                }));
            }
        }

        if (signsArray.length === 0) {
            return NextResponse.json({ success: false, error: 'Données vides ou mal formatées' });
        }

        const result = await collection.insertMany(signsArray);

        return NextResponse.json({
            success: true,
            message: `${result.insertedCount} signes importés avec succès.`,
            count: result.insertedCount
        });

    } catch (error) {
        console.error('Init Gardiner Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
