import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

function loadGardinerData() {
    const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

export async function GET(request) {
    // Rate limiting
    const rateCheck = checkRateLimit(request, 'signs');
    if (!rateCheck.success) {
        return rateLimitResponse(rateCheck);
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        const signs = loadGardinerData();

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSigns = signs.slice(startIndex, endIndex);

        const formattedSigns = paginatedSigns.map(s => ({
            translitteration: s.transliteration || s.code,
            hieroglyphes: s.sign,
            francais: s.description || '',
            notes: s.descriptif || ''
        }));

        return NextResponse.json({
            success: true,
            data: formattedSigns,
            pagination: {
                page,
                limit,
                total: signs.length,
                totalPages: Math.ceil(signs.length / limit),
                hasMore: endIndex < signs.length
            }
        }, {
            headers: {
                'X-RateLimit-Remaining': String(rateCheck.remaining)
            }
        });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: false, data: [] });
    }
}
