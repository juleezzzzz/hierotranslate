import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb'; // Update path if needed
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

export async function GET(request) {
    // Rate limiting
    const rateCheck = checkRateLimit(request, 'signs');
    if (!rateCheck.success) {
        return rateLimitResponse(rateCheck);
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        const client = await clientPromise;
        if (!client) {
            throw new Error("Database connection undefined");
        }
        const db = client.db('hierotranslate');
        const collection = db.collection('gardiner_signs');

        const skip = (page - 1) * limit;

        // Fetch paginated
        const signs = await collection.find({})
            .sort({ code: 1 }) // Or whatever sort order
            .skip(skip)
            .limit(limit)
            .toArray();

        // Count total
        const total = await collection.countDocuments({});

        const formattedSigns = signs.map(s => ({
            translitteration: s.transliteration || s.code,
            hieroglyphes: s.sign,
            francais: s.description || '',
            notes: s.descriptif || ''
        }));

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: formattedSigns,
            pagination: {
                page,
                limit,
                total: total,
                totalPages: totalPages,
                hasMore: page < totalPages
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
