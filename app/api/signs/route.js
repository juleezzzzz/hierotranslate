import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function loadGardinerData() {
    const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

export async function GET() {
    try {
        const signs = loadGardinerData();

        const formattedSigns = signs.map(s => ({
            translitteration: s.transliteration || s.code,
            hieroglyphes: s.sign,
            francais: s.description || '',
            notes: s.descriptif || ''
        }));

        return NextResponse.json({ success: true, data: formattedSigns });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: false, data: [] });
    }
}
