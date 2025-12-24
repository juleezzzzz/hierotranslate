import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import clientPromise from '../../../lib/mongodb';

// Charger les données Gardiner depuis le fichier JSON
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

// Charger les données depuis MongoDB
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

// Vérifie si une translittération est valide (pas juste un code Gardiner comme A1, B2, etc.)
function hasValidTransliteration(sign) {
    const translit = sign.transliteration || '';

    // Si pas de translittération, exclure
    if (!translit || translit.trim() === '') {
        return false;
    }

    // Exclure si c'est juste un code Gardiner (lettre(s) + chiffre(s))
    // Exemples à exclure: A1, A2, Aa1, B12, C3A, etc.
    const gardinerCodePattern = /^[A-Za-z]{1,2}\d+[A-Za-z]?$/;
    if (gardinerCodePattern.test(translit.trim())) {
        return false;
    }

    return true;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase().trim() || '';

    if (!term) {
        return NextResponse.json({ success: false, message: 'Terme de recherche manquant.' }, { status: 400 });
    }

    try {
        // Charger depuis les deux sources
        const jsonSigns = loadGardinerData();
        const mongoSigns = await loadMongoData();

        // Priorité: MongoDB d'abord (pour les ajouts manuels), puis JSON
        const allSigns = [...mongoSigns, ...jsonSigns];

        // Filtrer pour garder seulement les signes avec translittération valide
        const validSigns = allSigns.filter(s => hasValidTransliteration(s));

        // Recherche par translittération exacte
        let result = validSigns.find(s =>
            s.transliteration?.toLowerCase() === term
        );

        // Si pas trouvé, recherche par description (contient le terme)
        if (!result) {
            result = validSigns.find(s =>
                s.description?.toLowerCase().includes(term)
            );
        }

        if (result) {
            return NextResponse.json({
                success: true,
                data: {
                    translitteration: result.transliteration,
                    hieroglyphes: result.sign || result.character,
                    francais: result.description || '',
                    notes: result.descriptif || result.notes || ''
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
