import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hierotranslate-secret-key-change-in-production';

export function generateToken(userId, email) {
    return jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export function generateVerificationToken(email) {
    return jwt.sign(
        { email, purpose: 'email-verification' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

export function verifyVerificationToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== 'email-verification') {
            return null;
        }
        return decoded;
    } catch (error) {
        return null;
    }
}
