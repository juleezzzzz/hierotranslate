import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Get user profile
export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide' },
                { status: 401 }
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
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(decoded.userId) },
            { projection: { password: 0, verificationToken: 0 } }
        );

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
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
        console.error('Get profile error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// Update user profile
export async function PUT(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Token invalide' },
                { status: 401 }
            );
        }

        const { username, email, currentPassword, newPassword, profilePicture } = await request.json();

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Base de données non configurée' },
                { status: 500 }
            );
        }

        const db = client.db('hierotranslate');
        const users = db.collection('users');

        const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        const updateData = { updatedAt: new Date() };

        // Update username
        if (username && username !== user.username) {
            const existingUser = await users.findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') },
                _id: { $ne: user._id }
            });
            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Cet identifiant est déjà utilisé' },
                    { status: 400 }
                );
            }
            updateData.username = username;
        }

        // Update email
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await users.findOne({
                email: email.toLowerCase(),
                _id: { $ne: user._id }
            });
            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Cet email est déjà utilisé' },
                    { status: 400 }
                );
            }
            updateData.email = email.toLowerCase();
            updateData.emailVerified = false; // Re-verify new email
        }

        // Update password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { success: false, error: 'Mot de passe actuel requis' },
                    { status: 400 }
                );
            }
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json(
                    { success: false, error: 'Mot de passe actuel incorrect' },
                    { status: 400 }
                );
            }
            if (newPassword.length < 6) {
                return NextResponse.json(
                    { success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
                    { status: 400 }
                );
            }
            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        // Update profile picture
        if (profilePicture !== undefined) {
            updateData.profilePicture = profilePicture;
        }

        await users.updateOne(
            { _id: new ObjectId(decoded.userId) },
            { $set: updateData }
        );

        const updatedUser = await users.findOne(
            { _id: new ObjectId(decoded.userId) },
            { projection: { password: 0, verificationToken: 0 } }
        );

        return NextResponse.json({
            success: true,
            message: 'Profil mis à jour',
            user: {
                id: updatedUser._id.toString(),
                username: updatedUser.username,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
                profilePicture: updatedUser.profilePicture,
                stats: updatedUser.stats || { searchCount: 0, topWord: null }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la mise à jour' },
            { status: 500 }
        );
    }
}
