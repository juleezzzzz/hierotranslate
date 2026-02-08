'use client';

import { useState, useEffect } from 'react';

export default function AdminSignsPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [signs, setSigns] = useState([]);
    const [translations, setTranslations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Composer state
    const [composerGroups, setComposerGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        transliteration: '',
        hieroglyphs: '',
        french: '',
        notes: ''
    });

    // Edit state
    const [editingId, setEditingId] = useState(null);

    // Category filter
    const [activeCategory, setActiveCategory] = useState('A');
    const categories = ['A', 'Aa', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // Keyboard focus state
    const [keyboardActive, setKeyboardActive] = useState(false);

    // Drag and drop state
    const [draggedSign, setDraggedSign] = useState(null); // Signe en cours de glissement
    const [draggedGroupId, setDraggedGroupId] = useState(null); // Groupe en cours de réorganisation
    const [dropTargetIndex, setDropTargetIndex] = useState(null); // Index cible pour le dépôt

    // Visual positioning mode state
    const [positioningMode, setPositioningMode] = useState(false);
    const [positionedSigns, setPositionedSigns] = useState([]);
    const [draggingPositionIndex, setDraggingPositionIndex] = useState(null);

    // Interactive preview drag state
    const [draggingPreviewIndex, setDraggingPreviewIndex] = useState(null);

    // Keyboard mapping - tu peux personnaliser ces touches!
    // Format: { 'touche clavier': 'hiéroglyphe' }
    // Pour les lettres avec majuscules: minuscule = signe habituel, majuscule = signe alternatif
    const keyboardMap = {
        'a': '𓋹', // ankh - vie (minuscule)
        'A': '𓄿', // G1 - vautour égyptien (majuscule) - translittération: ȝ
        '-': '𓏺', // Z1 - trait vertical (déterminatif)
        'z': '𓏤', // Z2 - trait horizontal
        'e': '𓏭', // triple trait
        'r': '𓇳', // soleil (anciennement i)
        't': '𓏏', // t - pain
        'y': '𓇌', // y - double roseau
        'u': '𓅱', // w - caille
        'i': '𓇋', // i - roseau (anciennement r)
        'o': '𓂋', // r - bouche  
        'p': '𓉐', // pr - maison
        'q': '𓈎', // k - corbeille
        's': '𓋴', // s - tissu
        'd': '𓂧', // d - main
        'f': '𓆑', // f - vipère
        'g': '𓎼', // g - jarre
        'h': '𓉔', // h - cour
        'j': '𓆓', // dj - serpent
        'k': '𓎡', // k - corbeille
        'l': '𓃭', // l - lion
        'm': '𓅓', // m - chouette
        'n': '𓈖', // n - eau
        'b': '𓃀', // b - jambe
        'v': '𓆭', // plante
        'c': '𓍿', // tch
        'w': '𓅱', // w - caille
        'x': '𓄡', // kh
        ' ': ' ', // espace = espace normal
        '1': '𓏺', // Z1
        '2': '𓏻', // Z2
        '3': '𓏼', // Z3
    };

    const ADMIN_PASSWORD = 'Chamalo77850!';

    const getPassword = () => password || localStorage.getItem('adminPassword');

    const authenticate = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            localStorage.setItem('adminPassword', password);
            loadSigns();
            loadTranslations();
        } else {
            setError('Mot de passe incorrect');
        }
    };

    const loadSigns = async () => {
        try {
            // Fetch from API with category filter
            const res = await fetch(`/api/admin/gardiner?category=${activeCategory}`);
            const data = await res.json();
            if (data.success) {
                setSigns(data.signs);
            }
        } catch (err) {
            console.error('Erreur chargement signes:', err);
        }
    };

    const loadTranslations = async () => {
        try {
            const res = await fetch('/api/admin/signs?limit=500', {
                headers: { 'x-admin-password': getPassword() }
            });
            const data = await res.json();
            if (data.success) {
                setTranslations(data.signs || []);
            }
        } catch (err) {
            console.error('Erreur chargement traductions:', err);
        }
    };

    // Composer functions
    const addToComposer = (sign) => {
        const newGroup = {
            id: Date.now(),
            signs: [sign.sign || sign.character],
            code: sign.code
        };
        setComposerGroups([...composerGroups, newGroup]);
        updateHieroglyphsField([...composerGroups, newGroup]);
    };

    const toggleGroupSelection = (groupId) => {
        if (selectedGroups.includes(groupId)) {
            setSelectedGroups(selectedGroups.filter(id => id !== groupId));
        } else {
            setSelectedGroups([...selectedGroups, groupId]);
        }
    };

    const stackSelected = () => {
        if (selectedGroups.length < 2) {
            setMessage('Sélectionnez au moins 2 groupes pour empiler');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const selectedGroupsData = composerGroups.filter(g => selectedGroups.includes(g.id));
        const remainingGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));

        const allSigns = selectedGroupsData.flatMap(g => g.signs);
        const stackedGroup = {
            id: Date.now(),
            signs: allSigns,
            stacked: true,
            codes: selectedGroupsData.map(g => g.code).join(':')
        };

        const firstIndex = composerGroups.findIndex(g => selectedGroups.includes(g.id));
        remainingGroups.splice(firstIndex, 0, stackedGroup);

        setComposerGroups(remainingGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(remainingGroups);
    };

    // Groupement horizontal: signes côte à côte comme une seule unité
    const groupHorizontalSelected = () => {
        if (selectedGroups.length < 2) {
            setMessage('Sélectionnez au moins 2 groupes pour grouper horizontalement');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const selectedGroupsData = composerGroups.filter(g => selectedGroups.includes(g.id));
        const remainingGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));

        const allSigns = selectedGroupsData.flatMap(g => g.signs);
        const horizontalGroup = {
            id: Date.now(),
            signs: allSigns,
            horizontal: true, // layout horizontal groupé
            codes: selectedGroupsData.map(g => g.code).join(':')
        };

        const firstIndex = composerGroups.findIndex(g => selectedGroups.includes(g.id));
        remainingGroups.splice(firstIndex, 0, horizontalGroup);

        setComposerGroups(remainingGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(remainingGroups);
    };

    // Pyramide: 1 signe en haut, 2 signes en bas côte à côte
    const pyramidSelected = () => {
        if (selectedGroups.length !== 3) {
            setMessage('Sélectionnez exactement 3 groupes pour créer une pyramide (1 haut + 2 bas)');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const selectedGroupsData = composerGroups.filter(g => selectedGroups.includes(g.id));
        const remainingGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));

        // Le premier sélectionné va en haut, les 2 autres en bas
        const allSigns = selectedGroupsData.flatMap(g => g.signs);
        const pyramidGroup = {
            id: Date.now(),
            signs: allSigns,
            pyramid: true, // layout pyramide
            codes: selectedGroupsData.map(g => g.code).join(':')
        };

        const firstIndex = composerGroups.findIndex(g => selectedGroups.includes(g.id));
        remainingGroups.splice(firstIndex, 0, pyramidGroup);

        setComposerGroups(remainingGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(remainingGroups);
    };

    const unstackSelected = () => {
        if (selectedGroups.length !== 1) return;

        const group = composerGroups.find(g => g.id === selectedGroups[0]);
        if (!group || !group.stacked) return;

        const newGroups = group.signs.map((sign, i) => ({
            id: Date.now() + i,
            signs: [sign],
            code: group.codes?.split(':')[i] || ''
        }));

        const index = composerGroups.findIndex(g => g.id === group.id);
        const updatedGroups = [...composerGroups];
        updatedGroups.splice(index, 1, ...newGroups);

        setComposerGroups(updatedGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(updatedGroups);
    };

    const deleteSelected = () => {
        const updatedGroups = composerGroups.filter(g => !selectedGroups.includes(g.id));
        setComposerGroups(updatedGroups);
        setSelectedGroups([]);
        updateHieroglyphsField(updatedGroups);
    };

    const clearComposer = () => {
        setComposerGroups([]);
        setSelectedGroups([]);
        setFormData({ ...formData, hieroglyphs: '' });
    };

    // === DRAG AND DROP HANDLERS ===

    // Quand on commence à glisser un signe du picker
    const handleSignDragStart = (sign, code, e) => {
        setDraggedSign({ sign, code });
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', sign);
    };

    // Quand on commence à glisser un groupe pour le réorganiser
    const handleGroupDragStart = (groupId, e) => {
        setDraggedGroupId(groupId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', groupId.toString());
    };

    // Quand on survole la zone de composition
    const handleDragOver = (e, index = null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = draggedGroupId ? 'move' : 'copy';
        if (index !== null) {
            setDropTargetIndex(index);
        }
    };

    // Quand on quitte la zone de dépôt
    const handleDragLeave = () => {
        setDropTargetIndex(null);
    };

    // Quand on dépose un signe ou groupe
    const handleDrop = (e, targetIndex = null) => {
        e.preventDefault();

        // Cas 1: On dépose un nouveau signe depuis le picker
        if (draggedSign) {
            const newGroup = {
                id: Date.now(),
                signs: [draggedSign.sign],
                code: draggedSign.code
            };

            let updatedGroups;
            if (targetIndex !== null && targetIndex < composerGroups.length) {
                // Insérer à la position spécifiée
                updatedGroups = [...composerGroups];
                updatedGroups.splice(targetIndex, 0, newGroup);
            } else {
                // Ajouter à la fin
                updatedGroups = [...composerGroups, newGroup];
            }

            setComposerGroups(updatedGroups);
            updateHieroglyphsField(updatedGroups);
        }

        // Cas 2: On réorganise un groupe existant
        if (draggedGroupId && targetIndex !== null) {
            const currentIndex = composerGroups.findIndex(g => g.id === draggedGroupId);
            if (currentIndex !== -1 && currentIndex !== targetIndex) {
                const updatedGroups = [...composerGroups];
                const [movedGroup] = updatedGroups.splice(currentIndex, 1);
                const adjustedIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
                updatedGroups.splice(adjustedIndex, 0, movedGroup);

                setComposerGroups(updatedGroups);
                updateHieroglyphsField(updatedGroups);
            }
        }

        // Nettoyer l'état de glissement
        setDraggedSign(null);
        setDraggedGroupId(null);
        setDropTargetIndex(null);
    };

    // Fin du glissement (nettoyage)
    const handleDragEnd = () => {
        setDraggedSign(null);
        setDraggedGroupId(null);
        setDropTargetIndex(null);
    };

    // ============ VISUAL POSITIONING FUNCTIONS ============

    // Ouvrir l'éditeur de positionnement avec les signes actuels
    const openPositioningMode = () => {
        // Extraire tous les signes du compositeur
        const allSigns = [];
        const canvasWidth = 400;
        const canvasHeight = 300;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        composerGroups.forEach((group, groupIndex) => {
            group.signs.forEach((sign, signIndex) => {
                // Positionner initialement en grille
                const offsetX = (groupIndex - composerGroups.length / 2) * 50;
                const offsetY = signIndex * 40;
                allSigns.push({
                    char: sign.replace(/\(\([^)]+\)\)/g, ''), // Enlever les paramètres
                    x: centerX + offsetX,
                    y: centerY + offsetY,
                    groupId: group.id,
                    signIndex
                });
            });
        });

        setPositionedSigns(allSigns);
        setPositioningMode(true);
    };

    // Glissement dans le canvas de positionnement
    const handlePositionMouseDown = (index, e) => {
        e.preventDefault();
        setDraggingPositionIndex(index);
    };

    const handlePositionMouseMove = (e) => {
        if (draggingPositionIndex === null) return;

        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(30, Math.min(rect.width - 30, e.clientX - rect.left));
        const y = Math.max(30, Math.min(rect.height - 30, e.clientY - rect.top));

        const newSigns = [...positionedSigns];
        newSigns[draggingPositionIndex] = { ...newSigns[draggingPositionIndex], x, y };
        setPositionedSigns(newSigns);
    };

    const handlePositionMouseUp = () => {
        setDraggingPositionIndex(null);
    };

    // Appliquer les positions et fermer
    const applyPositions = () => {
        // Convertir les positions en paramètres de style
        const canvasWidth = 400;
        const canvasHeight = 300;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const scale = 100; // pixels per em

        // Créer une chaîne de positionnement personnalisée
        // Format: char((x=offset,y=offset)) - virgule comme séparateur
        const positionStr = positionedSigns.map(s => {
            const xOffset = ((s.x - centerX) / scale).toFixed(2);
            const yOffset = ((s.y - centerY) / scale).toFixed(2);
            return `${s.char}((x=${xOffset},y=${yOffset}))`;
        }).join('');

        // Mettre à jour le champ hieroglyphs avec les positions
        setFormData(prev => ({ ...prev, hieroglyphs: positionStr }));
        setPositioningMode(false);
        setMessage('Positions appliquées ! Vérifiez le champ "Hiéroglyphes" et sauvegardez.');
    };

    const cancelPositioning = () => {
        setPositioningMode(false);
        setPositionedSigns([]);
    };

    // ============ INTERACTIVE PREVIEW DRAG FUNCTIONS ============

    const handlePreviewMouseDown = (index, e) => {
        e.preventDefault();
        setDraggingPreviewIndex(index);
    };

    const handlePreviewMouseMove = (e) => {
        if (draggingPreviewIndex === null) return;

        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const x = Math.max(10, Math.min(rect.width - 50, e.clientX - rect.left));
        const y = Math.max(10, Math.min(rect.height - 50, e.clientY - rect.top));

        setComposerGroups(prev => prev.map((group, i) =>
            i === draggingPreviewIndex
                ? { ...group, posX: x, posY: y }
                : group
        ));
    };

    const handlePreviewMouseUp = () => {
        setDraggingPreviewIndex(null);
    };

    const applyPreviewPositions = () => {
        // Convertir les positions en paramètres CSS relatifs
        const baseX = 50;
        const baseY = 60;
        const scale = 50; // pixels per em

        const positionStr = composerGroups.map(group => {
            const x = group.posX ?? baseX;
            const y = group.posY ?? baseY;
            const xOffset = ((x - baseX) / scale).toFixed(2);
            const yOffset = ((y - baseY) / scale).toFixed(2);
            const chars = group.signs.map(s => s.replace(/\(\([^)]+\)\)/g, '')).join('');
            return `${chars}((x=${xOffset},y=${yOffset}))`;
        }).join('');

        setFormData(prev => ({ ...prev, hieroglyphs: positionStr }));
        setMessage('Positions appliquées ! Sauvegardez maintenant.');
    };

    const resetPreviewPositions = () => {
        setComposerGroups(prev => prev.map((group, i) => ({
            ...group,
            posX: 50 + i * 60,
            posY: 60
        })));
        setMessage('Positions réinitialisées');
    };

    const updateHieroglyphsField = (groups) => {
        // Générer les représentations de chaque groupe
        const groupRepresentations = groups.map(g => {
            // Pyramide: utiliser le marqueur ⌂ (1 signe en haut, 2 en bas côte à côte)
            if (g.pyramid && g.signs.length >= 2) {
                return { text: g.signs[0] + '⌂' + g.signs.slice(1).join(''), isComplex: true };
            }
            // Empilement vertical: utiliser le marqueur | entre les signes
            if (g.stacked && g.signs.length >= 2) {
                return { text: g.signs.join('|'), isComplex: true };
            }
            // Groupement horizontal: signes côte à côte sans séparateur mais comme groupe
            if (g.horizontal && g.signs.length >= 2) {
                return { text: g.signs.join(''), isComplex: true };
            }
            // Signes normaux: retourner tel quel (côte à côte)
            return { text: g.signs.join(''), isComplex: false };
        });

        // Joindre les groupes avec un espace si un groupe complexe (stacked/pyramid) est adjacent à un autre groupe
        let hieroglyphs = '';
        for (let i = 0; i < groupRepresentations.length; i++) {
            hieroglyphs += groupRepresentations[i].text;
            // Ajouter un espace si le groupe actuel ou le suivant est complexe
            if (i < groupRepresentations.length - 1) {
                const currentIsComplex = groupRepresentations[i].isComplex;
                const nextIsComplex = groupRepresentations[i + 1].isComplex;
                if (currentIsComplex || nextIsComplex) {
                    hieroglyphs += ' ';
                }
            }
        }
        setFormData(prev => ({ ...prev, hieroglyphs }));
    };

    const getComposerPreview = () => {
        const groupRepresentations = composerGroups.map(g => {
            if (g.pyramid && g.signs.length >= 2) {
                return { text: g.signs[0] + '⌂' + g.signs.slice(1).join(''), isComplex: true };
            }
            if (g.stacked && g.signs.length >= 2) {
                return { text: g.signs.join('|'), isComplex: true };
            }
            if (g.horizontal && g.signs.length >= 2) {
                return { text: g.signs.join(''), isComplex: true };
            }
            return { text: g.signs.join(''), isComplex: false };
        });

        let result = '';
        for (let i = 0; i < groupRepresentations.length; i++) {
            result += groupRepresentations[i].text;
            if (i < groupRepresentations.length - 1) {
                const currentIsComplex = groupRepresentations[i].isComplex;
                const nextIsComplex = groupRepresentations[i + 1].isComplex;
                if (currentIsComplex || nextIsComplex) {
                    result += ' ';
                }
            }
        }
        return result;
    };

    // Keyboard handler for hieroglyph input
    // Supporte les claviers AZERTY et QWERTY en utilisant e.key
    const handleKeyboardInput = (e) => {
        const key = e.key; // Le caractère réel tapé (prend en compte la disposition AZERTY)

        // Vérifier si la touche exacte (avec casse) est mappée
        // D'abord essayer la touche exacte, puis la minuscule
        let mappedKey = null;

        if (keyboardMap[key] !== undefined) {
            // La touche exacte est mappée (ex: 'A' majuscule)
            mappedKey = key;
        } else if (keyboardMap[key.toLowerCase()] !== undefined) {
            // Sinon essayer la minuscule
            mappedKey = key.toLowerCase();
        }

        if (mappedKey && keyboardMap[mappedKey]) {
            e.preventDefault();
            const hieroglyph = keyboardMap[mappedKey];

            // Add the hieroglyph to composer
            const newGroup = {
                id: Date.now(),
                signs: [hieroglyph],
                code: `KEY-${mappedKey.toUpperCase()}`
            };
            const newGroups = [...composerGroups, newGroup];
            setComposerGroups(newGroups);
            updateHieroglyphsField(newGroups);
        }

        // Backspace removes last group
        if (e.key === 'Backspace' && composerGroups.length > 0) {
            e.preventDefault();
            const newGroups = composerGroups.slice(0, -1);
            setComposerGroups(newGroups);
            updateHieroglyphsField(newGroups);
        }
    };

    // Quick add Z1 stroke
    const addZ1Stroke = () => {
        const newGroup = {
            id: Date.now(),
            signs: ['𓏺'],
            code: 'Z1'
        };
        const newGroups = [...composerGroups, newGroup];
        setComposerGroups(newGroups);
        updateHieroglyphsField(newGroups);
    };

    // === CUSTOMIZATION HELPERS ===
    const cleanSign = (str) => str ? str.replace(/\(\(.*?\)\)/g, '') : '';

    const parseSignParams = (str) => {
        const params = { s: 1, x: 0, y: 0 };
        if (!str || !str.includes('((')) return params;

        const match = str.match(/\(\((.*?)\)\)/);
        if (!match) return params;

        const parts = match[1].split(',');
        parts.forEach(p => {
            const [k, v] = p.split('=');
            if (k && v) params[k.trim()] = parseFloat(v);
        });
        return params;
    };

    const updateSignParams = (str, newParams) => {
        const rawSign = cleanSign(str);
        // Filtre les params par défaut (s=1, x=0, y=0) pour ne pas polluer si inutile
        const activeParams = [];
        if (newParams.s !== 1) activeParams.push(`s=${newParams.s}`);
        if (newParams.x !== 0) activeParams.push(`x=${newParams.x}`);
        if (newParams.y !== 0) activeParams.push(`y=${newParams.y}`);

        if (activeParams.length === 0) return rawSign;
        return `${rawSign}((${activeParams.join(',')}))`;
    };

    // State pour la personnalisation
    const [activeSignIdx, setActiveSignIdx] = useState(0);

    const handleCustomizationChange = (param, value) => {
        if (selectedGroups.length !== 1) return;

        const groupId = selectedGroups[0];
        const groupIndex = composerGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const group = composerGroups[groupIndex];
        const currentSign = group.signs[activeSignIdx];
        if (!currentSign) return;

        const currentParams = parseSignParams(currentSign);
        const newParams = { ...currentParams, [param]: parseFloat(value) };

        const newSignStr = updateSignParams(currentSign, newParams);
        const newSigns = [...group.signs];
        newSigns[activeSignIdx] = newSignStr;

        const newGroups = [...composerGroups];
        newGroups[groupIndex] = { ...group, signs: newSigns };

        setComposerGroups(newGroups);
        updateHieroglyphsField(newGroups);
    };

    // Form functions
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.transliteration || !formData.hieroglyphs) {
            setError('Translittération et hiéroglyphes requis');
            return;
        }

        try {
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId
                ? {
                    id: editingId,
                    code: formData.transliteration.toUpperCase(),
                    transliteration: formData.transliteration,
                    character: formData.hieroglyphs,
                    description: formData.french,
                    descriptif: formData.notes
                }
                : { ...formData, code: formData.transliteration.toUpperCase(), character: formData.hieroglyphs, description: formData.french };

            const res = await fetch('/api/admin/signs', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.success) {
                setMessage(editingId ? 'Traduction mise à jour !' : 'Traduction ajoutée !');
                setFormData({ transliteration: '', hieroglyphs: '', french: '', notes: '' });
                setComposerGroups([]);
                setSelectedGroups([]);
                setEditingId(null);
                loadTranslations();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur serveur');
        }
    };

    const editTranslation = (trans) => {
        setEditingId(trans.id);
        setFormData({
            transliteration: trans.transliteration || trans.code || '',
            hieroglyphs: trans.character || '',
            french: trans.description || '',
            notes: trans.descriptif || ''
        });

        // Charger les hiéroglyphes dans le compositeur
        const hieroglyphStr = trans.character || '';
        if (hieroglyphStr) {
            const groups = [];
            // Extraire tous les hiéroglyphes Unicode (U+13000-U+1342F)
            const allChars = Array.from(hieroglyphStr);
            allChars.forEach(char => {
                if (char.match(/[\u{13000}-\u{1342F}]/u)) {
                    groups.push({
                        id: Date.now() + Math.random(),
                        signs: [char]
                    });
                }
            });
            setComposerGroups(groups);
            setSelectedGroups([]);
        } else {
            setComposerGroups([]);
        }

        setMessage(`Modification de "${trans.transliteration || trans.code}" - Signes chargés dans le compositeur`);
    };

    const deleteTranslation = async (id, name) => {
        if (!confirm(`Supprimer "${name}" ?`)) return;

        try {
            const res = await fetch('/api/admin/signs', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': getPassword()
                },
                body: JSON.stringify({ id })
            });

            const data = await res.json();
            if (data.success) {
                setMessage('Traduction supprimée');
                loadTranslations();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setError('Erreur suppression');
        }
    };

    // Reload signs when category changes
    useEffect(() => {
        if (isAuthenticated) {
            loadSigns();
        }
    }, [activeCategory]);

    const filteredSigns = signs;

    useEffect(() => {
        const savedPwd = localStorage.getItem('adminPassword');
        if (savedPwd && savedPwd === ADMIN_PASSWORD) {
            setPassword(savedPwd);
            setIsAuthenticated(true);
            loadSigns();
            loadTranslations();
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div style={styles.loginContainer}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>🔐 Administration du Dictionnaire</h1>
                    <form onSubmit={authenticate} style={styles.form}>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe admin" style={styles.input} autoFocus />
                        {error && <p style={styles.error}>{error}</p>}
                        <button type="submit" style={styles.button}>Accéder</button>
                    </form>
                </div>
            </div>
        );
    }

    // Récupérer les infos du groupe sélectionné pour le panneau custom
    const selectedGroupData = selectedGroups.length === 1
        ? composerGroups.find(g => g.id === selectedGroups[0])
        : null;

    const currentSignParams = selectedGroupData && selectedGroupData.signs[activeSignIdx]
        ? parseSignParams(selectedGroupData.signs[activeSignIdx])
        : { s: 1, x: 0, y: 0 };


    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>Administration du Dictionnaire Hiéroglyphique</h1>
                <div>
                    <a href="/" style={styles.backLink}>← Retour au Traducteur</a>
                    <button onClick={() => { localStorage.removeItem('adminPassword'); setIsAuthenticated(false); }} style={styles.logoutBtn}>Déconnexion</button>
                </div>
            </header>

            {message && <div style={styles.successMsg}>{message}</div>}
            {error && <div style={styles.errorMsg}>{error}</div>}

            {/* Form Section */}
            <section style={styles.section}>
                <h2>{editingId ? '✏️ Modifier la Traduction' : '➕ Ajouter une Nouvelle Traduction'}</h2>

                {/* Visual Composer */}
                <div style={styles.composerSection}>
                    <h3>🎨 Compositeur Visuel de Hiéroglyphes</h3>

                    <div style={styles.composerLayout}>
                        {/* Composer Area */}
                        <div style={styles.composerLeft}>
                            <p style={styles.composerLabel}>Zone de composition (glissez-déposez ou cliquez pour sélectionner)</p>
                            <div
                                style={{
                                    ...styles.composerArea,
                                    ...(draggedSign || draggedGroupId ? styles.composerAreaDragOver : {})
                                }}
                                onDragOver={(e) => handleDragOver(e, composerGroups.length)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, composerGroups.length)}
                            >
                                {composerGroups.length === 0 ? (
                                    <span style={styles.placeholder}>
                                        {draggedSign ? '📥 Déposez ici...' : 'Glissez un signe ici ou cliquez à droite'}
                                    </span>
                                ) : (
                                    composerGroups.map((group, index) => (
                                        <div key={group.id} style={styles.groupWrapper}>
                                            {/* Zone de dépôt AVANT ce groupe */}
                                            <div
                                                style={{
                                                    ...styles.dropIndicator,
                                                    ...(dropTargetIndex === index ? styles.dropIndicatorActive : {})
                                                }}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDrop={(e) => handleDrop(e, index)}
                                            />

                                            {/* Le groupe lui-même */}
                                            <div
                                                draggable
                                                onDragStart={(e) => handleGroupDragStart(group.id, e)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => { toggleGroupSelection(group.id); setActiveSignIdx(0); }}
                                                style={{
                                                    ...styles.composerGroup,
                                                    ...(selectedGroups.includes(group.id) ? styles.selectedGroup : {}),
                                                    ...(group.stacked ? styles.stackedGroup : {}),
                                                    ...(group.pyramid ? styles.pyramidGroup : {}),
                                                    ...(group.horizontal ? styles.horizontalGroup : {}),
                                                    ...(draggedGroupId === group.id ? styles.draggingGroup : {}),
                                                    cursor: 'grab'
                                                }}
                                            >
                                                {group.pyramid ? (
                                                    <div style={styles.pyramidLayout}>
                                                        <div style={styles.pyramidTop}>{cleanSign(group.signs[0])}</div>
                                                        <div style={styles.pyramidBottom}>
                                                            <span style={styles.pyramidBottomSign}>{cleanSign(group.signs[1])}</span>
                                                            <span style={styles.pyramidBottomSign}>{cleanSign(group.signs[2])}</span>
                                                        </div>
                                                    </div>
                                                ) : group.stacked ? (
                                                    <div style={styles.stackedSigns}>
                                                        {group.signs.map((s, i) => <div key={i} style={styles.stackedSign}>{cleanSign(s)}</div>)}
                                                    </div>
                                                ) : group.horizontal ? (
                                                    <div style={styles.horizontalSigns}>
                                                        {group.signs.map((s, i) => <span key={i} style={styles.horizontalSign}>{cleanSign(s)}</span>)}
                                                    </div>
                                                ) : (
                                                    <span style={styles.composerSign}>{cleanSign(group.signs[0])}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Keyboard Input Zone */}
                            <div style={styles.keyboardSection}>
                                <p style={styles.keyboardLabel}>⌨️ Zone de saisie clavier (cliquez ici et tapez)</p>
                                <input
                                    type="text"
                                    onKeyDown={handleKeyboardInput}
                                    onFocus={() => setKeyboardActive(true)}
                                    onBlur={() => setKeyboardActive(false)}
                                    placeholder="Cliquez ici et tapez sur votre clavier..."
                                    style={{
                                        ...styles.keyboardInput,
                                        ...(keyboardActive ? styles.keyboardInputActive : {})
                                    }}
                                    readOnly
                                />
                                <p style={styles.keyboardHint}>
                                    <strong>Raccourcis :</strong> a=𓋹(ankh) | A=𓄿(vautour) | m=𓅓 | n=𓈖 | p=𓉐 | t=𓏏 | Backspace=effacer
                                </p>
                            </div>

                            <div style={styles.composerControls}>
                                <button onClick={addZ1Stroke} style={styles.ctrlBtnZ1}>𓏺 Ajouter Z1</button>
                                <button onClick={stackSelected} style={styles.ctrlBtn} disabled={selectedGroups.length < 2}>⬆️ Empiler</button>
                                <button onClick={groupHorizontalSelected} style={styles.ctrlBtnHorizontal} disabled={selectedGroups.length < 2}>↔️ Grouper</button>
                                <button onClick={pyramidSelected} style={styles.ctrlBtnPyramid} disabled={selectedGroups.length !== 3}>🔺 Pyramide</button>
                                <button onClick={unstackSelected} style={styles.ctrlBtn} disabled={selectedGroups.length !== 1}>🔓 Dégrouper</button>
                                <button onClick={openPositioningMode} style={styles.ctrlBtnPosition} disabled={composerGroups.length === 0}>📐 Positionner</button>
                                <button onClick={deleteSelected} style={styles.ctrlBtnDanger} disabled={selectedGroups.length === 0}>🗑️ Supprimer</button>
                                <button onClick={clearComposer} style={styles.ctrlBtnWarning}>🔄 Tout effacer</button>
                            </div>


                            <div style={styles.preview}>
                                <strong>Prévisualisation interactive (cliquez et déplacez les signes) :</strong>
                                <div
                                    style={styles.interactivePreview}
                                    onMouseMove={handlePreviewMouseMove}
                                    onMouseUp={handlePreviewMouseUp}
                                    onMouseLeave={handlePreviewMouseUp}
                                >
                                    {composerGroups.map((group, gi) => (
                                        <div
                                            key={group.id}
                                            style={{
                                                position: 'absolute',
                                                left: group.posX ?? (50 + gi * 60),
                                                top: group.posY ?? 60,
                                                cursor: draggingPreviewIndex === gi ? 'grabbing' : 'grab',
                                                fontSize: '3rem',
                                                fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif",
                                                color: '#2c1810',
                                                userSelect: 'none',
                                                background: draggingPreviewIndex === gi ? 'rgba(255, 228, 181, 0.6)' : 'transparent',
                                                borderRadius: '8px',
                                                padding: '5px',
                                                transition: draggingPreviewIndex === gi ? 'none' : 'background 0.15s'
                                            }}
                                            onMouseDown={(e) => handlePreviewMouseDown(gi, e)}
                                        >
                                            {group.signs.map((s, si) => (
                                                <span key={si}>{cleanSign(s)}</span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div style={styles.previewButtons}>
                                    <button onClick={applyPreviewPositions} style={styles.applyPreviewBtn}>
                                        ✅ Appliquer les positions
                                    </button>
                                    <button onClick={resetPreviewPositions} style={styles.resetPreviewBtn}>
                                        🔄 Réinitialiser
                                    </button>
                                </div>
                            </div>

                            {/* Visual Keyboard */}
                            <div style={styles.keyboardVisual}>
                                <p style={styles.keyboardTitle}>⌨️ Clavier Hiéroglyphique (AZERTY MacBook)</p>
                                <div style={styles.keyboardContainer}>
                                    {/* Row 1: Numbers */}
                                    <div style={styles.keyboardRow}>
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'].map(k => (
                                            <div key={k} style={styles.keyBox}>
                                                <span style={styles.keyLabel}>{k}</span>
                                                <span style={styles.keyHiero}>{keyboardMap[k] || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Row 2: AZERTY top row */}
                                    <div style={styles.keyboardRow}>
                                        {['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(k => (
                                            <div key={k} style={k === 'a' ? { ...styles.keyBox, ...styles.keyBoxSpecial } : styles.keyBox}>
                                                <span style={styles.keyLabel}>{k.toUpperCase()}</span>
                                                {k === 'a' ? (
                                                    <span style={styles.keyHieroDual}>
                                                        <span title="minuscule">{keyboardMap['a']}</span>
                                                        <span style={styles.keyHieroAlt} title="majuscule">{keyboardMap['A']}</span>
                                                    </span>
                                                ) : (
                                                    <span style={styles.keyHiero}>{keyboardMap[k] || ''}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Row 3: AZERTY middle row */}
                                    <div style={styles.keyboardRow}>
                                        {['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'].map(k => (
                                            <div key={k} style={styles.keyBox}>
                                                <span style={styles.keyLabel}>{k.toUpperCase()}</span>
                                                <span style={styles.keyHiero}>{keyboardMap[k] || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Row 4: AZERTY bottom row */}
                                    <div style={styles.keyboardRow}>
                                        {['w', 'x', 'c', 'v', 'b', 'n'].map(k => (
                                            <div key={k} style={styles.keyBox}>
                                                <span style={styles.keyLabel}>{k.toUpperCase()}</span>
                                                <span style={styles.keyHiero}>{keyboardMap[k] || ''}</span>
                                            </div>
                                        ))}
                                        <div style={{ ...styles.keyBox, width: '80px' }}>
                                            <span style={styles.keyLabel}>ESPACE</span>
                                            <span style={styles.keyHiero}>{keyboardMap[' '] || ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sign Picker */}
                        <div style={styles.composerRight}>

                            {/* CUSTOMIZATION PANEL */}
                            {selectedGroupData && (
                                <div style={{ marginBottom: '20px', padding: '0', background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                    <div style={{ padding: '15px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white', borderBottom: '1px solid #eee' }}>
                                        <h4 style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>🛠 Studio de Design</span>
                                            <span style={{ fontSize: '0.8em', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                                                {selectedGroupData.stacked ? 'Empilement' : selectedGroupData.pyramid ? 'Pyramide' : 'Signe Simple'}
                                            </span>
                                        </h4>
                                    </div>

                                    <div style={{ padding: '15px' }}>
                                        {/* MACRO CONTROLS (GROUP SPACING) */}
                                        {(selectedGroupData.stacked || selectedGroupData.pyramid) && (
                                            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #eee' }}>
                                                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>
                                                    Espacement Global (Groupe)
                                                </p>

                                                {selectedGroupData.stacked && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center' }}>
                                                        <label style={{ fontSize: '13px', color: '#555' }}>↕️ Vertical</label>
                                                        <input
                                                            type="range" min="-0.5" max="0.5" step="0.05"
                                                            defaultValue="0"
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                // Appliquer à tous les signes sauf le premier (simule un gap)
                                                                if (selectedGroups.length !== 1) return;
                                                                const groupId = selectedGroups[0];
                                                                const groupIndex = composerGroups.findIndex(g => g.id === groupId);
                                                                if (groupIndex === -1) return;

                                                                const group = composerGroups[groupIndex];
                                                                const newSigns = group.signs.map((s, i) => {
                                                                    if (i === 0) return s; // Ne pas toucher le premier
                                                                    const params = parseSignParams(s);
                                                                    // On écrase Y pour le rendre relatif au slider (simplification UX)
                                                                    // Idéalement on ajouterait au delta, mais pour l'instant un set direct est plus clair
                                                                    // Valeur par défaut logic script.js est -0.1. 
                                                                    // Donc si slider = 0 -> y = -0.1. 
                                                                    // Slider -0.2 -> y = -0.3 (plus serré)
                                                                    const baseOffset = -0.1;
                                                                    params.y = parseFloat((baseOffset + val).toFixed(2));
                                                                    return updateSignParams(s, params);
                                                                });

                                                                const newGroups = [...composerGroups];
                                                                newGroups[groupIndex] = { ...group, signs: newSigns };
                                                                setComposerGroups(newGroups);
                                                                updateHieroglyphsField(newGroups);
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {selectedGroupData.pyramid && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center' }}>
                                                        <label style={{ fontSize: '13px', color: '#555' }}>↔️ Horizontal</label>
                                                        <input
                                                            type="range" min="-0.3" max="0.3" step="0.05"
                                                            defaultValue="0"
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                // Appliquer aux signes du bas (index 1 et 2)
                                                                if (selectedGroups.length !== 1) return;
                                                                const groupId = selectedGroups[0];
                                                                const groupIndex = composerGroups.findIndex(g => g.id === groupId);
                                                                if (groupIndex === -1) return;

                                                                const group = composerGroups[groupIndex];
                                                                const newSigns = group.signs.map((s, i) => {
                                                                    if (i === 0) return s; // Haut
                                                                    const params = parseSignParams(s);
                                                                    // Rapprocher : signe 1 (gauche) va à droite (+x), signe 2 (droite) va à gauche (-x)
                                                                    // Ou plus simple: réduire les marges latérales
                                                                    // Script.js utilise gap:0.2em. 
                                                                    // Si on veut réduire, on met margin-right négatif sur le 1er ? 
                                                                    // Essayons d'appliquer une marge X symétrique inverse.
                                                                    if (i === 1) params.x = val; // Vers droite
                                                                    if (i === 2) params.x = -val; // Vers gauche
                                                                    return updateSignParams(s, params);
                                                                });

                                                                const newGroups = [...composerGroups];
                                                                newGroups[groupIndex] = { ...group, signs: newSigns };
                                                                setComposerGroups(newGroups);
                                                                updateHieroglyphsField(newGroups);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* INDIVIDUAL CONTROLS */}
                                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>
                                            Ajustement Précis (Signe par signe)
                                        </p>

                                        {/* Selecteur de signe */}
                                        {selectedGroupData.signs.length > 1 && (
                                            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                                                {selectedGroupData.signs.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveSignIdx(i)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            border: activeSignIdx === i ? '2px solid #1e3a5f' : '1px solid #ddd',
                                                            background: activeSignIdx === i ? '#e3f2fd' : 'white',
                                                            color: activeSignIdx === i ? '#1e3a5f' : '#666',
                                                            cursor: 'pointer',
                                                            fontFamily: 'Noto Sans Egyptian Hieroglyphs',
                                                            fontSize: '20px',
                                                            borderRadius: '8px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {cleanSign(s)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Taille (Zoom)</label>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>{currentSignParams.s}x</span>
                                                </div>
                                                <input
                                                    type="range" min="0.5" max="3.0" step="0.1"
                                                    value={currentSignParams.s}
                                                    onChange={(e) => handleCustomizationChange('s', e.target.value)}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>↔️ Position X</label>
                                                        <span style={{ fontSize: '12px', color: '#666' }}>{currentSignParams.x}em</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-1" max="1" step="0.05"
                                                        value={currentSignParams.x}
                                                        onChange={(e) => handleCustomizationChange('x', e.target.value)}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>↕️ Position Y</label>
                                                        <span style={{ fontSize: '12px', color: '#666' }}>{currentSignParams.y}em</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-1" max="1" step="0.05"
                                                        value={currentSignParams.y}
                                                        onChange={(e) => handleCustomizationChange('y', e.target.value)}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p style={styles.composerLabel}>Sélecteur de signes Gardiner</p>

                            <div style={styles.categoryTabs}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={activeCategory === cat ? styles.activeTab : styles.tab}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div style={styles.signGrid}>
                                {filteredSigns.slice(0, 100).map((sign, i) => (
                                    <div
                                        key={sign.code || i}
                                        onClick={() => addToComposer(sign)}
                                        draggable
                                        onDragStart={(e) => handleSignDragStart(sign.sign || sign.character, sign.code, e)}
                                        onDragEnd={handleDragEnd}
                                        style={{ ...styles.signItem, cursor: 'grab' }}
                                        title={`${sign.description} - Glissez pour ajouter`}
                                    >
                                        <span style={styles.signChar}>{sign.sign || sign.character}</span>
                                        <span style={styles.signCode}>{sign.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} style={styles.formGrid}>
                    <div style={styles.formGroup}>
                        <label>Translittération (ex: nfr, ḥtp, sȝ)</label>
                        <input
                            type="text"
                            value={formData.transliteration}
                            onChange={(e) => setFormData({ ...formData, transliteration: e.target.value })}
                            style={styles.input}
                            placeholder="nfr"
                            id="translit-input"
                        />
                        {/* Clavier de translittération */}
                        <div style={styles.translitKeyboard}>
                            {['ȝ', 'j', 'y', 'ʿ', 'w', 'b', 'p', 'f', 'm', 'n', 'r', 'h', 'ḥ', 'ḫ', 'ẖ', 's', 'š', 'q', 'k', 'g', 't', 'ṯ', 'd', 'ḏ'].map(char => (
                                <button
                                    key={char}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, transliteration: formData.transliteration + char })}
                                    style={styles.translitKey}
                                >
                                    {char}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label>Hiéroglyphes</label>
                        <input
                            type="text"
                            value={formData.hieroglyphs}
                            onChange={(e) => setFormData({ ...formData, hieroglyphs: e.target.value })}
                            style={{ ...styles.input, fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' }}
                            placeholder="𓄤"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label>Traduction Française</label>
                        <input
                            type="text"
                            value={formData.french}
                            onChange={(e) => setFormData({ ...formData, french: e.target.value })}
                            style={styles.input}
                            placeholder="beau, bon, parfait"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label>Notes / Code Gardiner (Optionnel)</label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            style={styles.input}
                            placeholder="F35"
                        />
                    </div>

                    <button type="submit" style={styles.submitBtn}>
                        {editingId ? '💾 Mettre à jour' : '➕ Enregistrer la Traduction'}
                    </button>

                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setFormData({ transliteration: '', hieroglyphs: '', french: '', notes: '' }); }} style={styles.cancelBtn}>
                            Annuler
                        </button>
                    )}
                </form>
            </section>

            {/* Translations List */}
            <section style={styles.section}>
                <h2>📚 Traductions Actuelles ({translations.length})</h2>

                {translations.length === 0 ? (
                    <p style={styles.empty}>Le dictionnaire est vide. Ajoutez des traductions ci-dessus.</p>
                ) : (
                    <div style={styles.translationsList}>
                        {translations.slice(0, 50).map(trans => (
                            <div key={trans.id} style={styles.translationItem}>
                                <span style={styles.transHiero}>{trans.character}</span>
                                <span style={styles.transCode}>{trans.transliteration || trans.code}</span>
                                <span style={styles.transDesc}>{trans.description || '—'}</span>
                                <div style={styles.transActions}>
                                    <button onClick={() => editTranslation(trans)} style={styles.editBtn}>✏️</button>
                                    <button onClick={() => deleteTranslation(trans.id, trans.transliteration || trans.code)} style={styles.deleteBtn}>🗑️</button>
                                </div>
                            </div>
                        ))}
                        {translations.length > 50 && <p style={styles.moreInfo}>Affichage limité à 50 traductions...</p>}
                    </div>
                )}
            </section>

            <footer style={styles.footer}>
                <a href="/admin-hierotranslate-secret" style={styles.link}>👥 Admin Utilisateurs</a>
            </footer>

            {/* Visual Positioning Modal */}
            {positioningMode && (
                <div style={styles.modalOverlay}>
                    <div style={styles.positioningModal}>
                        <h2 style={styles.modalTitle}>📐 Positionnement Visuel des Hiéroglyphes</h2>
                        <p style={styles.modalSubtitle}>Glissez chaque signe pour le positionner précisément</p>

                        <div
                            style={styles.positioningCanvas}
                            onMouseMove={handlePositionMouseMove}
                            onMouseUp={handlePositionMouseUp}
                            onMouseLeave={handlePositionMouseUp}
                        >
                            {/* Grid lines */}
                            <div style={styles.canvasGridH}></div>
                            <div style={styles.canvasGridV}></div>

                            {/* Draggable signs */}
                            {positionedSigns.map((sign, index) => (
                                <div
                                    key={index}
                                    style={{
                                        position: 'absolute',
                                        left: sign.x - 30,
                                        top: sign.y - 35,
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '3.5rem',
                                        background: draggingPositionIndex === index ? 'rgba(255, 228, 181, 0.8)' : 'transparent',
                                        border: draggingPositionIndex === index ? '2px dashed #b8860b' : '2px dashed transparent',
                                        borderRadius: '8px',
                                        cursor: draggingPositionIndex === index ? 'grabbing' : 'grab',
                                        userSelect: 'none',
                                        fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif",
                                        color: '#2c1810',
                                        transition: 'border 0.15s, background 0.15s'
                                    }}
                                    onMouseDown={(e) => handlePositionMouseDown(index, e)}
                                >
                                    {sign.char}
                                </div>
                            ))}
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={applyPositions} style={styles.applyBtn}>✅ Appliquer</button>
                            <button onClick={cancelPositioning} style={styles.cancelModalBtn}>❌ Annuler</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    loginContainer: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' },
    loginBox: { background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    container: { padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e3a5f', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    title: { color: '#1e3a5f', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', width: '100%', boxSizing: 'border-box' },
    button: { padding: '15px', fontSize: '16px', background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)', color: '#1e3a5f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    backLink: { color: 'white', textDecoration: 'none', marginRight: '20px' },
    logoutBtn: { padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    section: { background: 'white', padding: '25px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
    composerSection: { marginBottom: '25px' },
    composerLayout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    composerLeft: {},
    composerRight: {},
    composerLabel: { fontWeight: 'bold', marginBottom: '10px', color: '#555' },
    composerArea: { minHeight: '100px', border: '2px dashed #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#fafafa', transition: 'all 0.2s' },
    composerAreaDragOver: { borderColor: '#27ae60', background: '#e8f5e9', borderStyle: 'solid' },
    placeholder: { color: '#999', fontStyle: 'italic' },
    groupWrapper: { display: 'flex', alignItems: 'center' },
    dropIndicator: { width: '4px', height: '50px', background: 'transparent', borderRadius: '2px', marginRight: '5px', transition: 'all 0.2s' },
    dropIndicatorActive: { background: '#27ae60', boxShadow: '0 0 10px rgba(39, 174, 96, 0.5)' },
    draggingGroup: { opacity: 0.5, transform: 'scale(0.95)' },
    composerGroup: { padding: '10px', border: '2px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: 'white', transition: 'all 0.2s' },
    selectedGroup: { borderColor: '#9b59b6', background: '#f3e5f5' },
    stackedGroup: { background: '#e3f2fd' },
    composerSign: { fontSize: '32px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    stackedSigns: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    stackedSign: { fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', lineHeight: 1 },
    composerControls: { display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' },
    ctrlBtn: { padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnDanger: { padding: '8px 15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnWarning: { padding: '8px 15px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnZ1: { padding: '8px 15px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Noto Sans Egyptian Hieroglyphs', fontSize: '16px' },
    ctrlBtnHorizontal: { padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    ctrlBtnPyramid: { padding: '8px 15px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    horizontalGroup: { background: '#e8f5e9', border: '2px solid #27ae60' },
    horizontalSigns: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2px' },
    horizontalSign: { fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    keyboardSection: { marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', border: '2px solid #4CAF50' },
    keyboardLabel: { fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' },
    keyboardInput: { width: '100%', padding: '15px', fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', border: '2px solid #4CAF50', borderRadius: '8px', background: 'white', textAlign: 'center', cursor: 'text', caretColor: 'transparent' },
    keyboardInputActive: { borderColor: '#2e7d32', boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)', background: '#f1f8e9' },
    keyboardHint: { fontSize: '12px', color: '#555', marginTop: '10px', fontFamily: 'monospace' },
    preview: { marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' },
    previewText: { fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', marginLeft: '15px' },
    categoryTabs: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' },
    tab: { padding: '8px 12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    activeTab: { padding: '8px 12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    signGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: '#fafafa', borderRadius: '8px' },
    signItem: { padding: '8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
    signChar: { display: 'block', fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    signCode: { display: 'block', fontSize: '10px', color: '#888' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    submitBtn: { padding: '15px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', gridColumn: '1 / -1' },
    cancelBtn: { padding: '15px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', gridColumn: '1 / -1' },
    translationsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    translationItem: { display: 'grid', gridTemplateColumns: '80px 150px 1fr 80px', alignItems: 'center', padding: '15px', background: '#fafafa', borderRadius: '8px', gap: '15px' },
    transHiero: { fontSize: '28px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    transCode: { fontWeight: 'bold', fontFamily: 'Gentium Plus, serif' },
    transDesc: { color: '#555' },
    transActions: { display: 'flex', gap: '5px' },
    editBtn: { padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    deleteBtn: { padding: '8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: '#e74c3c' },
    errorMsg: { background: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    successMsg: { background: '#e8f5e9', color: '#2e7d32', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    empty: { textAlign: 'center', color: '#888', padding: '40px' },
    moreInfo: { textAlign: 'center', color: '#888', padding: '10px' },
    footer: { textAlign: 'center', padding: '20px' },
    link: { color: '#1e3a5f', textDecoration: 'none' },
    keyboardVisual: { marginTop: '20px', padding: '15px', background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', borderRadius: '12px' },
    keyboardTitle: { color: 'white', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' },
    keyboardContainer: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' },
    keyboardRow: { display: 'flex', gap: '4px', justifyContent: 'center' },
    keyBox: { width: '45px', height: '50px', background: '#1a1a1a', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #444', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
    keyBoxSpecial: { width: '55px', background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f3d 100%)', border: '1px solid #9b59b6' },
    keyLabel: { color: '#888', fontSize: '10px', fontWeight: 'bold' },
    keyHiero: { color: 'white', fontSize: '18px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', marginTop: '2px' },
    keyHieroDual: { display: 'flex', gap: '4px', marginTop: '2px' },
    keyHieroAlt: { color: '#9b59b6', fontSize: '14px', fontFamily: 'Noto Sans Egyptian Hieroglyphs' },
    translitKeyboard: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px', padding: '10px', background: '#f0f4f8', borderRadius: '8px', border: '1px solid #ddd' },
    translitKey: { padding: '8px 12px', fontSize: '16px', fontFamily: 'Gentium Plus, serif', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '36px' },
    ctrlBtnPyramid: { padding: '8px 15px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    pyramidGroup: { background: '#fff3e0' },
    pyramidLayout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    pyramidTop: { fontSize: '24px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', lineHeight: 1 },
    pyramidBottom: { display: 'flex', gap: '2px' },
    pyramidBottomSign: { fontSize: '20px', fontFamily: 'Noto Sans Egyptian Hieroglyphs', lineHeight: 1 },

    // Visual Positioning Styles
    ctrlBtnPosition: { padding: '8px 15px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    positioningModal: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '700px', width: '95%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
    modalTitle: { margin: 0, marginBottom: '5px', color: '#2c3e50', textAlign: 'center' },
    modalSubtitle: { margin: 0, marginBottom: '20px', color: '#7f8c8d', textAlign: 'center', fontSize: '14px' },
    positioningCanvas: { width: '100%', height: '450px', background: '#fffef9', border: '2px solid #d4c9b5', borderRadius: '12px', position: 'relative', overflow: 'hidden' },
    canvasGridH: { position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'rgba(184, 134, 11, 0.3)', pointerEvents: 'none' },
    canvasGridV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(184, 134, 11, 0.3)', pointerEvents: 'none' },
    modalActions: { display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' },
    applyBtn: { padding: '12px 25px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
    cancelModalBtn: { padding: '12px 25px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },

    // Realistic Preview Styles (matching public site)
    realisticPreview: { display: 'inline-flex', alignItems: 'flex-end', gap: '0.3em', marginTop: '15px', padding: '20px', background: '#f5f0e6', borderRadius: '12px', minHeight: '80px', fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif", fontSize: '48px', lineHeight: 1 },
    realisticSingle: { display: 'inline-block' },
    realisticStacked: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' },
    realisticStackedSign: { display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75em', lineHeight: '0.9', textAlign: 'center' },
    realisticHorizontal: { display: 'inline-flex', alignItems: 'flex-end', gap: '0.05em' },
    realisticHorizontalSign: { display: 'inline-block', fontSize: '0.9em' },
    realisticPyramid: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' },
    realisticPyramidTop: { fontSize: '1em', lineHeight: 1 },
    realisticPyramidBottom: { display: 'inline-flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.1em', fontSize: '0.85em', lineHeight: 1, marginTop: '-0.1em' },
    realisticPyramidBottomSign: { display: 'inline-flex', alignItems: 'flex-end' },

    // Interactive Preview Styles
    interactivePreview: {
        position: 'relative',
        width: '100%',
        height: '180px',
        marginTop: '15px',
        padding: '20px',
        background: '#f5f0e6',
        borderRadius: '12px',
        border: '2px dashed #d4c9a0',
        overflow: 'hidden'
    },
    previewButtons: {
        display: 'flex',
        gap: '10px',
        marginTop: '10px',
        justifyContent: 'center'
    },
    applyPreviewBtn: {
        padding: '10px 20px',
        background: '#27ae60',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    resetPreviewBtn: {
        padding: '10px 20px',
        background: '#95a5a6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
    }
};
