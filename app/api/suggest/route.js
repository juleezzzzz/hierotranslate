import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import clientPromise from '../../../lib/mongodb';

function loadGardinerData() {
    try {
        const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur chargement JSON:', error);
        return [];
    }
}

async function loadMongoData() {
    try {
        const client = await clientPromise;
        if (!client) return [];

        const db = client.db('hierotranslate');
        const signs = await db.collection('signs').find({}).toArray();
        return signs;
    } catch (error) {
        console.error('Erreur chargement MongoDB:', error);
        return [];
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase().trim() || '';

    try {
        // Charger depuis les deux sources
        const jsonSigns = loadGardinerData();
        const mongoSigns = await loadMongoData();

        // Combiner les deux sources (MongoDB en premier pour priorité)
        const allSigns = [...mongoSigns, ...jsonSigns];

        // Filtrer les signes qui correspondent
        const results = allSigns.filter(s => {
            const translit = (s.transliteration || s.code || '').toLowerCase();
            const desc = (s.description || '').toLowerCase();
            return translit.startsWith(term) || desc.includes(term);
        }).slice(0, 10); // Limiter à 10 résultats

        const suggestions = results.map(s => ({
            translitteration: s.transliteration || s.code,
            hieroglyphes: s.sign || s.character,
            francais: s.description || ''
        }));

        return NextResponse.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}
