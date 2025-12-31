import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import { randomUUID } from 'crypto';

export async function POST(request) {
    try {
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ success: true }); // Silently succeed if no DB
        }

        const db = client.db('hierotranslate');
        const activeSessions = db.collection('active_sessions');

        // Get or generate session ID from cookie
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => c.trim().split('='))
        );

        let sessionId = cookies['session_id'];

        // If no session ID, we'll generate one in the response
        if (!sessionId) {
            sessionId = randomUUID();
        }

        // Get user ID from authorization header if logged in
        let userId = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = await import('jsonwebtoken');
                const token = authHeader.substring(7);
                const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'hierotranslate-secret-key-change-in-production');
                userId = decoded.userId;
            } catch {
                // Invalid token, continue without userId
            }
        }

        // Update or insert session
        await activeSessions.updateOne(
            { sessionId },
            {
                $set: {
                    sessionId,
                    userId,
                    lastActivity: new Date(),
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            },
            { upsert: true }
        );

        // Create response with session cookie
        const response = NextResponse.json({ success: true });

        // Set session cookie if new
        if (!cookies['session_id']) {
            response.cookies.set('session_id', sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365 // 1 year
            });
        }

        return response;

    } catch (error) {
        console.error('Session ping error:', error);
        return NextResponse.json({ success: true }); // Silently succeed on error
    }
}
