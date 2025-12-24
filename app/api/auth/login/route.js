import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../../../lib/auth';

export async function POST(request) {
    try {
        const { identifier, password } = await request.json();

        // Validation
        if (!identifier || !password) {
            return NextResponse.json(
                { success: false, error: 'Email/identifiant et mot de passe requis' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non configurée' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const users = db.collection('users');

        // Find user by email or username
        const user = await users.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
            ]
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Identifiant ou mot de passe incorrect' },
                { status: 401 }
            );
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Identifiant ou mot de passe incorrect' },
                { status: 401 }
            );
        }

        // Generate token
        const token = generateToken(user._id.toString(), user.email);

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                profilePicture: user.profilePicture,
                stats: user.stats || { searchCount: 0, topWord: null },
                favorites: user.favorites || []
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la connexion' },
            { status: 500 }
        );
    }
}
