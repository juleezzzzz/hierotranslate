// Rate Limiting Middleware pour Vercel Edge
// Utilise un Map en mémoire (se réinitialise au cold start mais efficace contre le scraping)

const rateLimitMap = new Map();

/**
 * Configuration des limites par type de route
 */
const RATE_LIMITS = {
    search: { windowMs: 60 * 1000, max: 15 },      // 15 req/min pour recherche
    signs: { windowMs: 60 * 1000, max: 30 },       // 30 req/min pour liste signes
    login: { windowMs: 10 * 60 * 1000, max: 50 },  // 50 tentatives/10 min (augmenté pour dev)
    default: { windowMs: 60 * 1000, max: 60 }      // 60 req/min par défaut
};

/**
 * Nettoie les entrées expirées (appelé périodiquement)
 */
function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}

/**
 * Extrait l'IP du client depuis les headers de la requête
 */
function getClientIP(request) {
    // Vercel utilise x-forwarded-for ou x-real-ip
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Vérifie si la requête dépasse la limite de taux
 * @param {Request} request - La requête entrante
 * @param {string} type - Type de limite ('search', 'signs', 'login', 'default')
 * @returns {{ success: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(request, type = 'default') {
    const config = RATE_LIMITS[type] || RATE_LIMITS.default;
    const ip = getClientIP(request);
    const key = `${type}:${ip}`;
    const now = Date.now();

    // Nettoyage périodique (1 chance sur 100)
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    let data = rateLimitMap.get(key);

    // Nouvelle entrée ou fenêtre expirée
    if (!data || now > data.resetTime) {
        data = {
            count: 1,
            resetTime: now + config.windowMs
        };
        rateLimitMap.set(key, data);
        return { success: true, remaining: config.max - 1, resetTime: data.resetTime };
    }

    // Incrémenter le compteur
    data.count++;

    // Vérifier la limite
    if (data.count > config.max) {
        return {
            success: false,
            remaining: 0,
            resetTime: data.resetTime,
            retryAfter: Math.ceil((data.resetTime - now) / 1000)
        };
    }

    return { success: true, remaining: config.max - data.count, resetTime: data.resetTime };
}

/**
 * Crée une réponse d'erreur rate limit
 */
export function rateLimitResponse(result) {
    return new Response(JSON.stringify({
        success: false,
        error: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: result.retryAfter
    }), {
        status: 429,
        headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetTime)
        }
    });
}

/**
 * Valide et assainit un terme de recherche
 */
export function sanitizeSearchTerm(term) {
    if (!term || typeof term !== 'string') return '';

    // Limiter la longueur
    let sanitized = term.slice(0, 50);

    // Supprimer caractères potentiellement dangereux pour les regex
    // Note: on garde le point (.) car il est utilisé dans les translittérations égyptiennes (ex: ḥȝ.t)
    sanitized = sanitized.replace(/[*+?^${}()|[\]\\]/g, '');

    return sanitized.trim().toLowerCase();
}

/**
 * Échappe les caractères spéciaux pour utilisation sûre dans les regex
 */
export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
