import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import clientPromise from '../../../lib/mongodb';

// Charger les données Gardiner depuis le fichier JSON
function loadGardinerData() {
    try {
        const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur chargement JSON:', error);
        return [];
    }
}

// Charger les données depuis MongoDB
async function loadMongoData() {
    try {
        const client = await clientPromise;
        if (!client) return [];

        const db = client.db('hierotranslate');
        const signs = await db.collection('signs').find({}).toArray();
        return signs;
    } catch (error) {
        console.error('Erreur chargement MongoDB:', error);
        return [];
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase().trim() || '';

    if (!term) {
        return NextResponse.json({ success: false, message: 'Terme de recherche manquant.' }, { status: 400 });
    }

    try {
        // Charger depuis les deux sources
        const jsonSigns = loadGardinerData();
        const mongoSigns = await loadMongoData();

        // Priorité: MongoDB d'abord (pour les ajouts manuels), puis JSON
        const allSigns = [...mongoSigns, ...jsonSigns];

        // Recherche par translittération exacte
        let result = allSigns.find(s =>
            (s.transliteration?.toLowerCase() === term) ||
            (s.code?.toLowerCase() === term)
        );

        // Si pas trouvé, recherche par description (contient le terme)
        if (!result) {
            result = allSigns.find(s =>
                s.description?.toLowerCase().includes(term)
            );
        }

        if (result) {
            return NextResponse.json({
                success: true,
                data: {
                    translitteration: result.transliteration || result.code,
                    hieroglyphes: result.sign || result.character,
                    francais: result.description || '',
                    notes: result.descriptif || result.notes || ''
                }
            });
        } else {
            return NextResponse.json({ success: false, message: 'Aucune traduction trouvée.' });
        }
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
    }
}
