import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse, sanitizeSearchTerm } from '../../../lib/rate-limit';
import { verifyToken } from '../../../lib/auth';
import { ObjectId } from 'mongodb';

// Configuration
const DAILY_SEARCH_LIMIT = 15;

// Normaliser le texte : enlever les accents et mettre en minuscules
function normalizeText(text) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .toLowerCase();
}

// Vérifie si une translittération est valide
function hasValidTransliteration(sign) {
    const translit = sign.transliteration || '';
    if (!translit || translit.trim() === '') return false;
    // Exclure si c'est juste un code Gardiner (lettre(s) + chiffre(s))
    const gardinerCodePattern = /^[A-Za-z]{1,2}\d+[A-Za-z]?$/;
    if (gardinerCodePattern.test(translit.trim())) return false;
    return true;
}

// Check if it's a new day (reset should happen)
function shouldResetDaily(lastReset) {
    if (!lastReset) return true;
    const now = new Date();
    const last = new Date(lastReset);
    return now.toDateString() !== last.toDateString();
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

    // Normaliser le terme de recherche (sans accents, minuscules)
    const normalizedTerm = normalizeText(term);

    try {
        const client = await clientPromise;
        if (!client) throw new Error('DB connection failed');
        const db = client.db('hierotranslate');

        // Check user authentication and search limits
        let userId = null;
        let isPremium = false;
        let dailySearchCount = 0;
        let remainingSearches = DAILY_SEARCH_LIMIT;
        let isLimited = false;

        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);
            if (decoded) {
                userId = decoded.userId;

                // Get user's premium status and search count
                const user = await db.collection('users').findOne(
                    { _id: new ObjectId(userId) },
                    { projection: { isPremium: 1, premiumExpiresAt: 1, dailySearchCount: 1, lastSearchReset: 1 } }
                );

                if (user) {
                    // Check if premium is still valid
                    isPremium = user.isPremium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

                    // Check if we need to reset daily count
                    if (shouldResetDaily(user.lastSearchReset)) {
                        await db.collection('users').updateOne(
                            { _id: new ObjectId(userId) },
                            { $set: { dailySearchCount: 0, lastSearchReset: new Date() } }
                        );
                        dailySearchCount = 0;
                    } else {
                        dailySearchCount = user.dailySearchCount || 0;
                    }

                    remainingSearches = isPremium ? -1 : Math.max(0, DAILY_SEARCH_LIMIT - dailySearchCount);

                    // Check if user has reached limit (non-premium only)
                    if (!isPremium && dailySearchCount >= DAILY_SEARCH_LIMIT) {
                        isLimited = true;
                        return NextResponse.json({
                            success: false,
                            limited: true,
                            message: 'Limite de recherches atteinte',
                            remainingSearches: 0,
                            dailyLimit: DAILY_SEARCH_LIMIT,
                            isPremium: false
                        }, { status: 429 });
                    }
                }
            }
        }

        // Charger tous les signes du dictionnaire pour filtrer avec normalisation
        const dictionarySigns = await db.collection('signs').find({}).limit(1000).toArray();

        // Filtrer avec normalisation (insensible aux accents et à la casse)
        const matchingSigns = dictionarySigns.filter(s => {
            const normalizedTranslit = normalizeText(s.transliteration);
            const normalizedDesc = normalizeText(s.description);
            return normalizedTranslit.includes(normalizedTerm) || normalizedDesc.includes(normalizedTerm);
        });

        const validSigns = matchingSigns.filter(s => hasValidTransliteration(s));

        // Recherche par translittération exacte (normalisée)
        let result = validSigns.find(s =>
            normalizeText(s.transliteration) === normalizedTerm
        );

        // Si pas trouvé, recherche par description (normalisée)
        if (!result) {
            result = validSigns.find(s =>
                normalizeText(s.description).includes(normalizedTerm)
            );
        }

        // Increment search count for logged-in users (only on successful search)
        if (userId && result) {
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                {
                    $inc: { dailySearchCount: 1, 'stats.searchCount': 1 },
                    $set: { updatedAt: new Date() }
                }
            );
            remainingSearches = isPremium ? -1 : Math.max(0, remainingSearches - 1);
        }

        if (result) {
            return NextResponse.json({
                success: true,
                data: {
                    translitteration: result.transliteration,
                    hieroglyphes: result.sign || result.character,
                    francais: result.description || '',
                    notes: result.descriptif || result.notes || ''
                },
                // Premium info
                remainingSearches,
                dailyLimit: DAILY_SEARCH_LIMIT,
                isPremium
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Aucune traduction trouvée.',
                remainingSearches,
                dailyLimit: DAILY_SEARCH_LIMIT,
                isPremium
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
    }
}
