import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function loadGardinerData() {
    const filePath = path.join(process.cwd(), 'public', 'gardiner_signs.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

export async function GET() {
    try {
        const signs = loadGardinerData();
        return NextResponse.json({ success: true, count: signs.length });
    } catch (error) {
        console.error('Erreur:', error);
        return NextResponse.json({ success: true, count: 0 });
    }
}
