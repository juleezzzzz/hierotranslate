import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db('hierotranslate');

        // Simple GET to fetch pending proposals
        // In a real app, you'd want to verify admin auth here
        const proposals = await db.collection('proposals')
            .find({ status: 'pending' })
            .sort({ submittedAt: -1 })
            .toArray();

        return NextResponse.json({ success: true, data: proposals });
    } catch (error) {
        console.error('Error fetching proposals:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    // Rate limiting
    const rateCheck = checkRateLimit(request, 'proposal');
    if (!rateCheck.success) {
        return rateLimitResponse(rateCheck);
    }

    try {
        const body = await request.json();
        const { hieroglyphs, transliteration, french, notes } = body;

        if (!hieroglyphs && !transliteration && !french) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('hierotranslate');

        const newProposal = {
            hieroglyphs,
            transliteration,
            french,
            notes,
            status: 'pending',
            submittedAt: new Date()
        };

        await db.collection('proposals').insertOne(newProposal);

        return NextResponse.json({ success: true, message: 'Proposal submitted' });
    } catch (error) {
        console.error('Error submitting proposal:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, action, data } = body; // action: 'accept' | 'reject'

        if (!id || !action) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('hierotranslate');
        const { ObjectId } = await import('mongodb');

        if (action === 'accept') {
            // Add to dictionary
            // 'data' should contain the final cleaned up entry
            if (!data) {
                return NextResponse.json({ success: false, error: 'Missing data for acceptance' }, { status: 400 });
            }

            await db.collection('signs').insertOne(data);

            // Mark proposal as accepted
            await db.collection('proposals').updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'accepted' } }
            );
        } else if (action === 'reject') {
            await db.collection('proposals').updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'rejected' } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating proposal:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
