import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Charger les données Gardiner
function loadGardinerData() {
    const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase().trim() || '';

    if (!term) {
        return NextResponse.json({ success: false, message: 'Terme de recherche manquant.' }, { status: 400 });
    }

    try {
        const signs = loadGardinerData();

        // Recherche par translittération exacte
        let result = signs.find(s =>
            s.transliteration?.toLowerCase() === term
        );

        // Si pas trouvé, recherche par description (contient le terme)
        if (!result) {
            result = signs.find(s =>
                s.description?.toLowerCase().includes(term)
            );
        }

        if (result) {
            return NextResponse.json({
                success: true,
                data: {
                    translitteration: result.transliteration || result.code,
                    hieroglyphes: result.sign,
                    francais: result.description || '',
                    notes: result.descriptif || ''
                }
            });
        } else {
            return NextResponse.json({ success: false, message: 'Aucune traduction trouvée.' });
        }
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
    }
}
