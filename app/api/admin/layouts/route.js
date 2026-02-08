import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - Load all layouts
export async function GET() {
    try {
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, message: 'DB connection failed' });
        }
        const db = client.db('hierotranslate');
        const layouts = await db.collection('hieroglyph_layouts').find({}).toArray();

        return NextResponse.json({ success: true, layouts });
    } catch (error) {
        console.error('Error loading layouts:', error);
        return NextResponse.json({ success: false, message: 'Server error' });
    }
}

// POST - Save a new layout or update existing
export async function POST(request) {
    try {
        const body = await request.json();
        const { baseSign, positions } = body;

        if (!baseSign) {
            return NextResponse.json({ success: false, message: 'Base sign required' });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, message: 'DB connection failed' });
        }
        const db = client.db('hierotranslate');

        // Check if layout for this base sign already exists
        const existing = await db.collection('hieroglyph_layouts').findOne({ baseSign });

        if (existing) {
            // Update existing
            await db.collection('hieroglyph_layouts').updateOne(
                { baseSign },
                { $set: { positions, updatedAt: new Date() } }
            );
            return NextResponse.json({ success: true, message: 'Layout updated', id: existing._id });
        } else {
            // Create new
            const result = await db.collection('hieroglyph_layouts').insertOne({
                baseSign,
                positions,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return NextResponse.json({ success: true, message: 'Layout created', id: result.insertedId });
        }
    } catch (error) {
        console.error('Error saving layout:', error);
        return NextResponse.json({ success: false, message: 'Server error' });
    }
}

// DELETE - Remove a layout
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID required' });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: false, message: 'DB connection failed' });
        }
        const db = client.db('hierotranslate');

        await db.collection('hieroglyph_layouts').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true, message: 'Layout deleted' });
    } catch (error) {
        console.error('Error deleting layout:', error);
        return NextResponse.json({ success: false, message: 'Server error' });
    }
}
