import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function loadGardinerData() {
    const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase().trim() || '';

    try {
        const signs = loadGardinerData();

        // Filtrer les signes qui correspondent
        const results = signs.filter(s => {
            const translit = (s.transliteration || '').toLowerCase();
            const desc = (s.description || '').toLowerCase();
            return translit.startsWith(term) || desc.includes(term);
        }).slice(0, 10); // Limiter à 10 résultats

        const suggestions = results.map(s => ({
            translitteration: s.transliteration || s.code,
            hieroglyphes: s.sign,
            francais: s.description || ''
        }));

        return NextResponse.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}
