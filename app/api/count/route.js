import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db('hierotranslate');

        // Compter les signes dans la collection 'signs' (ajoutés manuellement)
        const signsCount = await db.collection('signs').countDocuments({});

        return NextResponse.json({ success: true, count: signsCount });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: true, count: 0 });
    }
}
