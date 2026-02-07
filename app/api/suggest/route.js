import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse, sanitizeSearchTerm } from '../../../lib/rate-limit';

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

    try {
        const client = await clientPromise;
        if (!client) return NextResponse.json({ success: true, data: [] });
        const db = client.db('hierotranslate');

        // Charger depuis les deux sources MONGODB
        // 1. Dictionnaire (signs)
        const dictionarySigns = await db.collection('signs').find({
            $or: [
                { transliteration: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } }
            ]
        }).limit(20).toArray();

        // 2. Gardiner (gardiner_signs)
        // Attention: gardiner_signs can be huge, we rely on DB query regex
        const gardinerSigns = await db.collection('gardiner_signs').find({
            $or: [
                { transliteration: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } }
            ]
        }).limit(20).toArray();

        // Combiner (Dictionnaire en priorité)
        const allSigns = [...dictionarySigns, ...gardinerSigns];

        // Filtrer et formatter
        // Note: Regex Mongo match already filtered by term, but we double check logic if needed
        // and apply valid translit filter
        const results = allSigns.filter(s => hasValidTransliteration(s));

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
