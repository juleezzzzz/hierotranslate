import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse, sanitizeSearchTerm } from '../../../lib/rate-limit';

// Vérifie si une translittération est valide
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

    if (!term) {
        return NextResponse.json({ success: false, message: 'Terme de recherche manquant.' }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        if (!client) throw new Error('DB connection failed');
        const db = client.db('hierotranslate');

        // Note: For translation we usually want EXACT match first

        // 1. Dictionnaire (signs)
        // We fetch exact matches and partial matches
        const dictionarySigns = await db.collection('signs').find({
            $or: [
                { transliteration: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } }
            ]
        }).toArray();

        // 2. Gardiner (gardiner_signs)
        const gardinerSigns = await db.collection('gardiner_signs').find({
            $or: [
                { transliteration: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } }
            ]
        }).toArray();

        // Priorité: MongoDB d'abord (pour les ajouts manuels), puis JSON
        // (now both are MongoDB, but Dictionnaire overrides Gardiner)
        const allSigns = [...dictionarySigns, ...gardinerSigns];

        // Filtrer pour garder seulement les signes avec translittération valide
        // (Unless the user really searched for something weird, but let's stick to old logic)
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
