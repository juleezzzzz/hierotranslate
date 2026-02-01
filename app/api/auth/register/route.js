import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken, generateVerificationToken } from '../../../../lib/auth';
import { sendVerificationEmail } from '../../../../lib/email';

export async function POST(request) {
    try {
        const { username, email, password } = await request.json();

        // Validation
        if (!username || !email || !password) {
            return NextResponse.json(
                { success: false, error: 'Tous les champs sont requis' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
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

        // Check if user already exists
        const existingUser = await users.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return NextResponse.json(
                    { success: false, error: 'Cet email est déjà utilisé' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, error: 'Cet identifiant est déjà utilisé' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification token
        const verificationToken = generateVerificationToken(email.toLowerCase());

        // Assign random default avatar
        const defaultAvatars = [
            '/avatars/avatar_1.png',
            '/avatars/avatar_2.png',
            '/avatars/avatar_3.png',
            '/avatars/avatar_4.png',
            '/avatars/avatar_5.png'
        ];
        const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

        // Create user
        const newUser = {
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            emailVerified: false,
            verificationToken,
            profilePicture: randomAvatar,
            favorites: [],
            searchHistory: [],
            stats: {
                searchCount: 0,
                topWord: null,
                quizScores: {}
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await users.insertOne(newUser);

        // Send verification email
        const emailResult = await sendVerificationEmail(email, username, verificationToken);

        // Generate auth token
        const token = generateToken(result.insertedId.toString(), email.toLowerCase());

        return NextResponse.json({
            success: true,
            message: 'Compte créé avec succès ! Vérifiez votre email.',
            emailSent: emailResult.success,
            token,
            user: {
                id: result.insertedId.toString(),
                username,
                email: email.toLowerCase(),
                emailVerified: false,
                profilePicture: randomAvatar,
                stats: newUser.stats
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la création du compte' },
            { status: 500 }
        );
    }
}
