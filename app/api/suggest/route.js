import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse, sanitizeSearchTerm } from '../../../lib/rate-limit';

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
    // Rate limiting
    const rateCheck = checkRateLimit(request, 'search');
    if (!rateCheck.success) {
        return rateLimitResponse(rateCheck);
    }

    const { searchParams } = new URL(request.url);
    const term = sanitizeSearchTerm(searchParams.get('term') || '');

    // Vérifier que le terme n'est pas vide
    if (!term) {
        return NextResponse.json({ success: true, data: [] });
    }

    try {
        // Charger depuis les deux sources
        const jsonSigns = loadGardinerData();
        const mongoSigns = await loadMongoData();

        // Combiner les deux sources (MongoDB en premier pour priorité)
        const allSigns = [...mongoSigns, ...jsonSigns];

        // Filtrer: 
        // 1. Doit avoir une translittération valide (pas juste code Gardiner)
        // 2. Doit correspondre au terme de recherche
        const results = allSigns.filter(s => {
            // D'abord vérifier si a une translittération valide
            if (!hasValidTransliteration(s)) {
                return false;
            }

            const translit = (s.transliteration || '').toLowerCase();
            const desc = (s.description || '').toLowerCase();
            return translit.startsWith(term) || desc.includes(term);
        }).slice(0, 10); // Limiter à 10 résultats

        const suggestions = results.map(s => ({
            translitteration: s.transliteration,
            hieroglyphes: s.sign || s.character,
            francais: s.description || ''
        }));

        return NextResponse.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}
