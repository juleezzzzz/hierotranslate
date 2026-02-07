import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse, sanitizeSearchTerm } from '../../../lib/rate-limit';

// Normaliser le texte : enlever les accents et mettre en minuscules
function normalizeText(text) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .toLowerCase();
}

// Verification Helper
function hasValidTransliteration(sign) {
    const translit = sign.transliteration || '';
    if (!translit || translit.trim() === '') return false;
    // Exclure si c'est juste un code Gardiner (lettre(s) + chiffre(s))
    const gardinerCodePattern = /^[A-Za-z]{1,2}\d+[A-Za-z]?$/;
    if (gardinerCodePattern.test(translit.trim())) return false;
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

    // Normaliser le terme de recherche (sans accents, minuscules)
    const normalizedTerm = normalizeText(term);

    try {
        const client = await clientPromise;
        if (!client) return NextResponse.json({ success: true, data: [] });
        const db = client.db('hierotranslate');

        // Charger tous les signes du dictionnaire
        // On charge plus de résultats pour filtrer après normalisation
        const dictionarySigns = await db.collection('signs').find({}).limit(500).toArray();

        // Filtrer avec normalisation (insensible aux accents et à la casse)
        const matchingSigns = dictionarySigns.filter(s => {
            const normalizedTranslit = normalizeText(s.transliteration);
            const normalizedDesc = normalizeText(s.description);
            return normalizedTranslit.includes(normalizedTerm) || normalizedDesc.includes(normalizedTerm);
        });

        // Filtrer et formatter
        const results = matchingSigns.filter(s => hasValidTransliteration(s));

        // Remove duplicates if any (based on translit + sign + description)
        // This allows entries with same transliteration but different meanings to appear
        const seen = new Set();
        const uniqueResults = [];
        for (const s of results) {
            const key = `${s.transliteration}-${s.sign || s.character}-${s.description || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(s);
            }
        }

        const suggestions = uniqueResults.slice(0, 10).map(s => ({
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
