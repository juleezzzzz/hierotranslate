// === ENREGISTREMENT SERVICE WORKER (PWA) ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker enregistré:', registration.scope);
            })
            .catch((error) => {
                console.log('Erreur Service Worker:', error);
            });
    });
}

// === GESTION DU THÈME ===
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}



function updateThemeIcon(theme) {
    const iconBtn = document.getElementById('theme-btn');
    if (iconBtn) {
        // SVG Icon for Sun (Light Mode)
        const sunIcon = `<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`;

        // SVG Icon for Moon (Dark Mode)
        const moonIcon = `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

        iconBtn.innerHTML = theme === 'dark' ? moonIcon : sunIcon;
    }
}

// Initialiser le thème au chargement
initTheme();

// Listen for theme button click
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
}

// === SESSION HEARTBEAT (Suivi temps réel des visiteurs) ===
function startSessionHeartbeat() {
    // Ping immédiat au chargement
    pingSession();

    // Puis toutes les 30 secondes
    setInterval(pingSession, 30000);
}

function pingSession() {
    // Envoie un ping avec le token d'auth si connecté
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/session/ping', {
        method: 'POST',
        credentials: 'include',
        headers: headers
    }).catch(() => {
        // Ignorer les erreurs silencieusement
    });
}

// Démarrer le heartbeat
startSessionHeartbeat();

// === ONBOARDING SYSTÈME ===
const onboardingOverlay = document.getElementById('onboarding-overlay');

function checkFirstVisit() {
    const hasVisited = localStorage.getItem('hierotranslate_visited');
    if (!hasVisited) {
        showOnboarding();
    }
}

function showOnboarding() {
    if (onboardingOverlay) {
        onboardingOverlay.classList.remove('hidden');
        onboardingOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

function closeOnboarding() {
    if (onboardingOverlay) {
        onboardingOverlay.classList.remove('visible');
        onboardingOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        localStorage.setItem('hierotranslate_visited', 'true');
    }
}

// Close onboarding on outside click
if (onboardingOverlay) {
    onboardingOverlay.addEventListener('click', function (e) {
        if (e.target === onboardingOverlay) {
            closeOnboarding();
        }
    });
}

// === SCREEN READER ANNOUNCEMENTS ===
function announceToScreenReader(message) {
    const announcer = document.getElementById('sr-announcements');
    if (announcer) {
        announcer.textContent = message;
        setTimeout(() => { announcer.textContent = ''; }, 1000);
    }
}

// === SEARCH LOADER ===
function showSearchLoader() {
    const loader = document.getElementById('search-loader');
    if (loader) loader.classList.remove('hidden');
}

function hideSearchLoader() {
    const loader = document.getElementById('search-loader');
    if (loader) loader.classList.add('hidden');
}

// === SHARE URL ===
function shareResult() {
    const term = document.getElementById('main-input').value.trim();
    if (!term) return;

    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(term)}`;

    navigator.clipboard.writeText(url).then(() => {
        const btn = document.querySelector('.share-btn');
        if (btn) {
            btn.classList.add('copied');
            const textEl = btn.querySelector('.share-text');
            const originalText = textEl.textContent;
            textEl.textContent = 'Lien copié !';

            setTimeout(() => {
                btn.classList.remove('copied');
                textEl.textContent = originalText;
            }, 2000);
        }
        announceToScreenReader('Lien copié dans le presse-papiers');
    });
}

// Handle URL parameter on load
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        const mainInput = document.getElementById('main-input');
        if (mainInput) {
            mainInput.value = query;
            // Slight delay to ensure DOM is ready
            setTimeout(() => {
                performTranslation();
            }, 100);
        }
    }
}

// === WORD OF THE DAY ===
let wordOfDayData = null;

async function loadWordOfDay() {
    try {
        const response = await fetch('/api/suggest?term=');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            // Pick a random word based on today's date (consistent per day)
            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const index = seed % data.data.length;
            wordOfDayData = data.data[index];

            document.getElementById('wod-hiero').textContent = wordOfDayData.hieroglyphes || '';
            document.getElementById('wod-translit').textContent = wordOfDayData.translitteration || '';
            document.getElementById('wod-french').textContent = wordOfDayData.francais || '';
        }
    } catch (err) {
        console.error('Erreur chargement mot du jour:', err);
        // Hide word of day card on error
        const wodCard = document.getElementById('word-of-day');
        if (wodCard) wodCard.style.display = 'none';
    }
}

function searchWordOfDay() {
    if (wordOfDayData) {
        document.getElementById('main-input').value = wordOfDayData.translitteration;
        performTranslation();
    }
}

// === GARDINER VIEW & SORT ===
let gardinerViewMode = 'grid'; // 'grid' or 'table'
let gardinerSortBy = 'code'; // 'code', 'translit', 'description'

function setGardinerView(mode) {
    gardinerViewMode = mode;

    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.view-btn[onclick="setGardinerView('${mode}')"]`)?.classList.add('active');

    // Update container class
    const container = document.getElementById('gardiner-list-container');
    if (container) {
        if (mode === 'table') {
            container.classList.add('table-view');
        } else {
            container.classList.remove('table-view');
        }
    }
}

function sortGardinerSigns() {
    const select = document.getElementById('gardiner-sort');
    if (select) {
        gardinerSortBy = select.value;
        renderAllSigns();
    }
}

// === SECTION DÉCOUVERTE (LE SAVIEZ-VOUS) ===
const discoveryFacts = [
    { text: "Le signe du scarabée 𓆣 (kheper) signifie 'devenir' ou 'se transformer'.", sign: "𓆣" },
    { text: "Le hiéroglyphe 𓏤 (trait vertical) indique souvent que le signe précédent est un idéogramme.", sign: "𓏤" },
    { text: "Les hiéroglyphes peuvent se lire de gauche à droite ou de droite à gauche, selon le regard des êtres animés.", sign: "𓃰" },
    { text: "Le signe 𓋹 (ankh) est le symbole de la 'vie'.", sign: "𓋹" },
    { text: "Le signe 𓄤 (nefer) signifie 'beau', 'bon' ou 'parfait'.", sign: "𓄤" },
    { text: "Le cartouche 𓍷 entoure toujours les noms royaux.", sign: "𓍷" },
    { text: "L'abeille 𓆤 est le symbole de la Basse-Égypte.", sign: "𓆤" },
    { text: "Le papyrus 𓇅 est le symbole de la Haute-Égypte.", sign: "𓇅" }
];

function initDiscovery() {
    const content = document.getElementById('discovery-content');
    if (!content) return;

    // Pick random fact based on day to keep it stable for the day
    const today = new Date();
    const seed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 31 + today.getDate();
    const index = seed % discoveryFacts.length;
    const fact = discoveryFacts[index];

    content.innerHTML = `
        <p class="discovery-text">"${fact.text}"</p>
    `;

    // Update background sign if possible (optional visual touch)
    const card = document.getElementById('discovery-card');
    if (card) {
        // We use CSS ::before content, so we can't easily change it via inline style without CSS vars.
        // But for now the default Ankh is fine, or we can set a CSS var.
        card.style.setProperty('--discovery-sign', `"${fact.sign}"`);
    }
}

// Call discovery init logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscovery);
} else {
    initDiscovery();
}

// === COPIER DANS LE PRESSE-PAPIERS ===
function copyToClipboard(button, type) {
    let text = '';

    if (type === 'hiero') {
        text = document.getElementById('result-hiero').innerText; // Use innerText to get text content of stacked signs correctly? No, stacked signs are HTML.
        // Wait, copying stacked signs as text might result in garbage or just the characters.
        // Let's get the raw hieroglyphs from history if possible, or just textContent.
        // Actually, result-hiero contains HTML. textContent will give the chars linearly which is good.
        text = document.getElementById('result-hiero').textContent;
    } else if (type === 'french') {
        text = document.getElementById('result-french').textContent.replace('Traduction: ', '').trim();
    } else if (type === 'url') {
        // Logic for share button if it used this function, but share uses shareResult()
    } else {
        // Fallback for passing element ID directly
        const el = document.getElementById(button); // 'button' here is the id string in old calls
        if (el) text = el.textContent;
    }

    if (!text || text.trim() === '') return;

    navigator.clipboard.writeText(text).then(() => {
        // Feedback visuel
        button.classList.add('copied');
        const iconContainer = button.querySelector('.copy-icon'); // It's a span now
        if (iconContainer) {
            // We keep the SVG but maybe add a checkmark class or replace SVG temporarily?
            // CSS handles .copied .copy-icon::after { content: '✓'; } so we don't need to change innerHTML!
            // Just adding the class 'copied' is enough for the CSS we wrote.
            // But wait, the CSS was: ".copy-btn.copied .copy-icon::after { content: ' ✓'; }"
            // This overlays the checkmark.
        }

        setTimeout(() => {
            button.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('Erreur de copie:', err);
    });
}

// Définition des touches du clavier (avec la bonne translittération pour une meilleure compatibilité)
const transliterationKeys = [
    { value: 'ȝ', code: 'ȝ', tooltip: 'Aleph - coup de glotte' },
    { value: 'j', code: 'j', tooltip: 'Yod - semi-voyelle' },
    { value: 'y', code: 'y', tooltip: 'Double roseau' },
    { value: 'ʿ', code: 'ʿ', tooltip: 'Ayin - gutturale' },
    { value: 'w', code: 'w', tooltip: 'Caille - semi-voyelle' },
    { value: 'b', code: 'b', tooltip: 'Jambe' },
    { value: 'p', code: 'p', tooltip: 'Natte' },
    { value: 'f', code: 'f', tooltip: 'Vipère à cornes' },
    { value: 'm', code: 'm', tooltip: 'Hibou' },
    { value: 'n', code: 'n', tooltip: 'Eau' },
    { value: 'r', code: 'r', tooltip: 'Bouche' },
    { value: 'h', code: 'h', tooltip: 'Cabane' },
    { value: 'ḥ', code: 'ḥ', tooltip: 'Mèche de lin' },
    { value: 'ḫ', code: 'ḫ', tooltip: 'Placenta/crible' },
    { value: 'h̬', code: 'h̬', tooltip: 'Ventre animal' },
    { value: 's', code: 's', tooltip: 'Verrou' },
    { value: 'š', code: 'š', tooltip: 'Bassin/jardin' },
    { value: 'q', code: 'q', tooltip: 'Pente de colline' },
    { value: 'k', code: 'k', tooltip: 'Corbeille à anse' },
    { value: 'g', code: 'g', tooltip: 'Support de jarre' },
    { value: 't', code: 't', tooltip: 'Pain' },
    { value: 'ṯ', code: 'ṯ', tooltip: 'Corde à piquet' },
    { value: 'd', code: 'd', tooltip: 'Main' },
    { value: 'ḏ', code: 'ḏ', tooltip: 'Serpent' },
    // Touche Entrée (pour lancer la recherche)
    { value: '↵', code: 'enter', tooltip: 'Rechercher' }
];

const keyboard = document.getElementById('hieroglyph-keyboard');
const mainInput = document.getElementById('main-input');
const resultHiero = document.getElementById('result-hiero');
const resultFrench = document.getElementById('result-french');
const mainContainer = document.querySelector('.main-container');

// --- Logique d'Affichage/Masquage du Clavier ---

// Afficher le clavier au focus sur la barre de recherche
mainInput.addEventListener('focus', () => {
    keyboard.classList.remove('hidden');
    keyboard.classList.add('visible');
});

// Masquer le clavier au clic n'importe où ailleurs
document.addEventListener('click', (event) => {
    const isClickInsideMainInput = mainInput.contains(event.target);
    const isClickInsideKeyboard = keyboard.contains(event.target);

    if (!isClickInsideMainInput && !isClickInsideKeyboard) {
        if (keyboard.classList.contains('visible')) {
            keyboard.classList.remove('visible');
            keyboard.classList.add('hidden');
        }
    }
});


// 1. Création des boutons du clavier avec tooltips
transliterationKeys.forEach(key => {
    const button = document.createElement('button');
    button.textContent = key.value;
    button.classList.add('hiero-key');

    // Ajouter tooltip
    if (key.tooltip) {
        button.setAttribute('data-tooltip', key.tooltip);
    }

    button.addEventListener('click', (event) => {
        event.stopPropagation(); // Empêche le masquage immédiat

        if (key.code === 'backspace') {
            mainInput.value = mainInput.value.slice(0, -1);
        } else if (key.code === 'enter') {
            performTranslation();
        } else {
            // Insère le caractère de translittération dans la barre de recherche
            mainInput.value += key.code;
        }
        mainInput.focus();
        // Déclencher l'événement input pour l'autocomplétion
        mainInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    keyboard.appendChild(button);
});


// === PARSEUR DE PERSONNALISATION ===
// Détecte la syntaxe : Signe((s=1.5,x=0.1,y=-0.2))
function parseHieroglyphString(str) {
    if (!str) return [];

    // Regex pour capturer un signe (surrogate pairs inclus) suivi optionnellement de ((paramètres))
    // \P{M}\p{M}* match un graphème de base et ses accents, mais ici on simplifie pour les hiéroglyphes (surrogates) ou char normal
    // On cherche : (Un ou deux char pour le signe) suivi de ( ((...)) optionnel )

    const regex = /(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^()])(?:\(\(.*?\)\))?/g;
    const matches = str.match(regex) || [];

    return matches.map(token => {
        let char = token;
        let style = '';
        let scale = 1;

        // Vérifier si présence de paramètres ((...))
        if (token.includes('((') && token.endsWith('))')) {
            const parts = token.split('((');
            char = parts[0];
            const paramsStr = parts[1].slice(0, -2); // retirer ))

            // Parser les params s=1.2,x=0.1...
            const params = {};
            paramsStr.split(',').forEach(p => {
                const [key, val] = p.split('=');
                if (key && val) params[key.trim()] = parseFloat(val);
            });

            // Générer le style CSS
            if (params.s && !isNaN(params.s)) {
                style += `font-size: ${params.s}em; `;
                scale = params.s;
            }
            if (params.x && !isNaN(params.x)) {
                style += `margin-left: ${params.x}em; margin-right: ${params.x}em; `;
            }
            if (params.y && !isNaN(params.y)) {
                // margin-top natif
                style += `margin-top: ${params.y}em; `;
            }
        }

        return { char, style, scale };
    });
}

// === FONCTION D'AFFICHAGE HIÉROGLYPHES STYLE VÉGA ===
// Affiche les signes avec différents layouts:
// - Espaces = groupes côte à côte
// - Marqueur | = empilement vertical (Empiler)
// - Marqueur ⌂ = pyramide (1 haut, 2 bas)
function createStackedHieroglyphs(hieroglyphString) {
    if (!hieroglyphString || hieroglyphString.length === 0) {
        return hieroglyphString;
    }

    // Vérifier si contient des espaces (groupes côte à côte)
    if (hieroglyphString.includes(' ')) {
        const groups = hieroglyphString.split(' ');
        // Recursion pour chaque groupe
        const groupsHtml = groups.map(group => `<span style="display: inline-flex; align-items: flex-end; vertical-align: bottom; line-height: 1;">${createStackedHieroglyphs(group)}</span>`).join(' ');

        // Conteneur Flex global
        return `<span style="display: inline-flex; align-items: flex-end; gap: 0.2em;">${groupsHtml}</span>`;
    }

    // Vérifier si c'est un empilement vertical (marqueur |)
    if (hieroglyphString.includes('|')) {
        const signs = hieroglyphString.split('|');

        // CAS SPÉCIFIQUE : ḥnt ou signe similaire - n au-dessus, t à droite
        // Inclut 𓉔 (cour) et 𓌨 (piège/passoir)
        const hasHSign = signs.some(s => s.includes('𓉔') || s.includes('𓌨'));
        const hasNSign = signs.some(s => s.includes('𓈖'));
        const hasTSign = signs.some(s => s.includes('𓏏'));

        // Trouver le signe principal (𓉔 ou 𓌨)
        const mainSign = signs.find(s => s.includes('𓉔')) ? '𓉔' : signs.find(s => s.includes('𓌨')) ? '𓌨' : null;

        if (hasHSign && hasNSign && hasTSign && mainSign) {
            // Layout spécial: n aligné en haut à gauche du signe principal, t à droite
            return `<span style="display: inline-flex; align-items: flex-start; vertical-align: middle;">
                <span style="display: inline-flex; flex-direction: column; align-items: center; margin-right: -0.1em;">
                    <span style="font-size: 0.55em; line-height: 1; margin-bottom: 1.2em;">𓈖</span>
                </span>
                <span style="font-size: 1em; line-height: 1;">${mainSign}</span>
                <span style="font-size: 0.6em; line-height: 1; align-self: flex-end; margin-left: 0.05em;">𓏏</span>
            </span>`;
        }

        // Vérifier si le signe "pr" (𓉐) est dans l'empilement
        const hasPrSign = signs.some(s => s.includes('𓉐'));

        // Réduire la taille des signes empilés (0.75em) et serrer l'espacement
        const stackedSigns = signs.map((signStr, index) => {
            // Parser le signe pour récupérer style persos
            const parsed = parseHieroglyphString(signStr)[0] || { char: signStr, style: '', scale: 1 };

            // Le premier signe n'a pas de marge, les suivants sont rapprochés
            // SAUF si le signe suivant est "pr" (𓉐) : on ajoute plus d'espace
            let marginTopDefault = '';
            if (index > 0) {
                // Si le signe précédent contient "pr", ajouter plus d'espace
                if (signs[index - 1].includes('𓉐')) {
                    marginTopDefault = 'margin-top: 0.1em;'; // Plus d'espace au-dessus de pr
                } else {
                    marginTopDefault = 'margin-top: -0.1em;';
                }
            }
            // Si ce signe est au-dessus de "pr" (donc index+1 contient pr), ajouter de l'espace en bas
            if (index < signs.length - 1 && signs[index + 1].includes('𓉐')) {
                marginTopDefault = 'margin-top: -0.05em; margin-bottom: 0.15em;'; // Légèrement descendu avec espace en bas
            }

            // Si custom scale, on l'applique relative à la taille de pile (0.75em) -> un peu complexe, 
            // simplifions : on applique le fontsize custom s'il existe, sinon 0.75em.
            const fontSize = parsed.style.includes('font-size') ? parsed.style : 'font-size: 0.75em;';
            const extraStyle = parsed.style.replace(/font-size:[^;]+;/g, ''); // retirer font-size du style extra pour pas conflicter

            // Style spécial pour le signe jambe (𓃀) - le rendre plus fin ET plus petit
            const thinLegStyle = parsed.char === '𓃀' ? 'transform: scale(0.85) scaleX(0.7);' : '';

            return `<span style="display: flex; justify-content: center; align-items: center; ${fontSize} line-height: 0.9; text-align: center; ${marginTopDefault} ${thinLegStyle} ${extraStyle}">${parsed.char}</span>`;
        }).join('');

        // Centrage vertical (comme avant)
        return `<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle;">${stackedSigns}</span>`;
    }

    // Vérifier si c'est un layout pyramide (marqueur ⌂)
    // 🔒 LOGIQUE VÉROUILLÉE : Alignement spécifique pour T/Z.
    // NE PAS MODIFIER SANS AUTORISATION EXPLICITE (Mot clé : "change t et z")
    if (hieroglyphString.includes('⌂')) {
        const parts = hieroglyphString.split('⌂');
        const topSignStr = parts[0];

        // Parser le signe du haut
        const topParsed = parseHieroglyphString(topSignStr)[0] || { char: topSignStr, style: '' };

        // Pour les signes du bas, on doit parser la chaîne complète des params
        // Attention : parts[1] contient potentiellement plusieurs signes avec params : 𓃀((s=1))𓎛
        // On ne peut pas juste faire [...parts[1]], il faut utiliser notre parseur global sur parts[1]
        const bottomParsedList = parseHieroglyphString(parts[1]);

        // CAS SPÉCIFIQUE SÉCURISÉ : Uniquement pour tȝ (𓈇 + 𓏤)
        // On aligne par le bas spécifiquement pour ce couple, mais avec les marges asymétriques
        // pour remonter le Z (droite) comme dans l'ancien script.
        if (parts[1] === '𓈇𓏤') { // Note: si params custom ajoutés, ce check échouera (ce qui est voulu, le custom prend le dessus)
            return `<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle;">
                <span style="font-size: 1em; line-height: 1;">${topSignStr}</span>
                <span style="display: inline-flex; justify-content: center; align-items: flex-end; gap: 0.2em; font-size: 0.9em; line-height: 1; margin-top: 0;">
                    ${[...parts[1]].map((s, i) => `<span style="display: inline-flex; align-items: flex-end;${i === 0 ? ' margin-top: -0.2em;' : ' margin-top: -0.25em;'}">${s}</span>`).join('')}
                </span>
            </span>`;
        }

        // CAS SPÉCIFIQUE : Signe ḥ (𓉔 - cour) avec n au-dessus et t à droite
        // Layout: n en haut à gauche, ḥ en bas à gauche, t à droite de ḥ
        if (topSignStr.includes('𓉔') || topParsed.char.includes('𓉔')) {
            // Si le signe du haut est ḥ et les signes du bas sont n et t
            // On réorganise: n en haut, ḥ-t en bas
            const hasNSign = bottomParsedList.some(p => p.char.includes('𓈖'));
            const hasTSign = bottomParsedList.some(p => p.char.includes('𓏏'));

            if (hasNSign && hasTSign) {
                // Layout spécial: n au-dessus, ḥ et t côte à côte en dessous
                return `<span style="display: inline-flex; flex-direction: column; align-items: flex-start; justify-content: center; vertical-align: middle;">
                    <span style="font-size: 0.55em; line-height: 1; margin-left: 0.25em; margin-bottom: 1.2em;">𓈖</span>
                    <span style="display: inline-flex; align-items: flex-end; gap: 0.05em;">
                        <span style="font-size: 1em; line-height: 1; ${topParsed.style}">${topParsed.char}</span>
                        <span style="font-size: 0.7em; line-height: 1; margin-bottom: 0.1em;">𓏏</span>
                    </span>
                </span>`;
            }

            // Sinon, layout par défaut pour ḥ
            return `<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle;">
                <span style="font-size: 1em; line-height: 1; ${topParsed.style}">${topParsed.char}</span>
                <span style="display: inline-flex; justify-content: center; align-items: flex-end; gap: 0.15em; font-size: 0.85em; line-height: 1; margin-top: -0.25em;">
                    ${bottomParsedList.map((p, i) => {
                return `<span style="display: inline-flex; align-items: flex-end; ${p.style}">${p.char}</span>`;
            }).join('')}
                </span>
            </span>`;
        }

        // CAS PAR DÉFAUT (T/Z et autres) - LOGIQUE VÉROUILLÉE
        return `<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle;">
            <span style="font-size: 1em; line-height: 1; ${topParsed.style}">${topParsed.char}</span>
            <span style="display: inline-flex; justify-content: center; align-items: flex-start; gap: 0.2em; font-size: 0.9em; line-height: 1; margin-top: 0;">
                ${bottomParsedList.map((p, i) => {
            // Maintien de la logique 'locked' (-0.2/-0.35) SAUF si override par custom Y
            // Si custom Y défini, on n'applique pas la marge par défaut
            const defaultMargin = (i === 0 ? 'margin-top: -0.2em;' : 'margin-top: -0.35em;');
            const finalStyle = p.style.includes('margin-top') ? p.style : (defaultMargin + p.style);

            return `<span style="display: inline-flex; align-items: flex-end; ${finalStyle}">${p.char}</span>`;
        }).join('')}
            </span>
        </span>`;
    }

    // LISTE SIMPLE (côte à côte sans espaces) ou Signe tout seul
    // Il faut utiliser le parseur pour séparer correctement les signes+params
    const parsedSigns = parseHieroglyphString(hieroglyphString);

    // Si un seul signe, on le rend direct
    if (parsedSigns.length === 1) {
        const p = parsedSigns[0];
        return `<span style="display: inline-block; font-size: 1em; line-height: 1; ${p.style}">${p.char}</span>`;
    }

    // Si plusieurs signes collés (ex: veau 𓃀𓎛𓊃...), on les affiche en flex align-bottom
    return `<span style="display: inline-flex; align-items: flex-end; gap: 0.1em; vertical-align: bottom;">
        ${parsedSigns.map(p => {
        // Appliquer un style spécial pour le signe jambe (𓃀) - le rendre plus fin ET plus petit
        const thinLegStyle = p.char === '𓃀' ? 'transform: scale(0.85) scaleX(0.7);' : '';
        return `<span style="font-size: 1em; line-height: 1; ${thinLegStyle} ${p.style}">${p.char}</span>`;
    }).join('')}
    </span>`;
}

// 2. Fonction de recherche et de Traduction
function performTranslation() {
    const searchTerm = mainInput.value.trim().toLowerCase();

    // Masquer le clavier après la recherche
    keyboard.classList.remove('visible');
    keyboard.classList.add('hidden');

    if (!searchTerm) {
        resultHiero.textContent = "";
        resultFrench.textContent = "Veuillez entrer un terme à traduire.";
        return;
    }

    // Afficher le loader
    showSearchLoader();
    resultHiero.textContent = "";
    resultFrench.textContent = "";

    // Build headers with auth token if available
    const headers = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Requête AJAX vers l'adresse /api/translate
    fetch(`/api/translate?term=${encodeURIComponent(searchTerm)}`, { headers })
        .then(response => response.json())
        .then(data => {
            hideSearchLoader();

            // Update remaining searches display
            if (data.remainingSearches !== undefined) {
                updateRemainingSearches(data.remainingSearches, data.dailyLimit, data.isPremium);
            }

            // Check if user hit limit
            if (data.limited) {
                showLimitModal();
                resultHiero.textContent = "Limite de recherches atteinte";
                resultFrench.textContent = "Passez Premium pour des recherches illimitées !";
                return;
            }

            if (data.success) {
                // Succès : affiche les données reçues avec hiéroglyphes empilés verticalement
                const hieroglyphs = data.data.hieroglyphes || '';
                const stackedHiero = createStackedHieroglyphs(hieroglyphs);
                resultHiero.innerHTML = `<span class="hiero-result-sign">${stackedHiero}</span> <span class="translit-result" style="font-family: 'Gentium Plus', serif;">(${data.data.translitteration})</span>`;
                resultFrench.textContent = `Traduction: ${data.data.francais} `;

                // Ajouter à l'historique
                addToHistory(data.data.francais, data.data.translitteration, data.data.hieroglyphes);

                // Vérifier si c'est un favori
                checkIfFavorite(`Hiéroglyphes: ${data.data.hieroglyphes} (${data.data.translitteration})`);

                // Annoncer aux lecteurs d'écran
                announceToScreenReader(`Traduction trouvée: ${data.data.francais}`);
            } else {
                // Échec : affiche un message "non trouvé"
                resultHiero.textContent = "Aucune traduction trouvée dans la base de données.";
                resultFrench.textContent = `Terme recherché: ${searchTerm} `;
                announceToScreenReader('Aucune traduction trouvée');
            }
        })
        .catch(error => {
            hideSearchLoader();
            console.error('Erreur de connexion:', error);
            resultHiero.textContent = "Erreur de connexion au serveur.";
            resultFrench.textContent = "Vérifiez votre connexion internet.";
        });
}

// === PREMIUM / SEARCH LIMITS ===

function updateRemainingSearches(remaining, limit, isPremium) {
    const counter = document.getElementById('search-remaining-counter');
    if (!counter) return;

    if (isPremium || remaining === -1) {
        counter.innerHTML = '<span class="premium-badge">⭐ Premium</span> Recherches illimitées';
        counter.classList.add('premium');
    } else {
        counter.textContent = `${remaining}/${limit} recherches restantes`;
        counter.classList.remove('premium');

        if (remaining <= 3) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
    }
}

function showLimitModal() {
    const modal = document.getElementById('limit-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('visible');
    }
}

function closeLimitModal() {
    const modal = document.getElementById('limit-modal');
    if (modal) {
        modal.classList.remove('visible');
        modal.classList.add('hidden');
    }
}

function goToPremium() {
    window.location.href = '/premium.html';
}

// 3. Permettre la recherche en appuyant sur Entrée
mainInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        performTranslation();
        document.getElementById('propositions-list').classList.add('hidden');
    }
});

// === PROPOSITIONS (LIVE SEARCH) ===

const propositionsContainer = document.getElementById('propositions-list');
let debounceTimeout = null;

mainInput.addEventListener('input', function () {
    const term = this.value.trim();

    // Clear previous timeout
    if (debounceTimeout) clearTimeout(debounceTimeout);

    // Hide if empty
    if (term.length === 0) {
        propositionsContainer.classList.add('hidden');
        return;
    }

    // Debounce rapide
    debounceTimeout = setTimeout(() => {
        fetchPropositions(term);
    }, 100);
});

function fetchPropositions(term) {
    fetch(`/api/suggest?term=${encodeURIComponent(term)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                renderPropositions(data.data);
            } else {
                propositionsContainer.classList.add('hidden');
            }
        })
        .catch(err => console.error(err));
}

function renderPropositions(items) {
    propositionsContainer.innerHTML = '';
    propositionsContainer.classList.remove('hidden');

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'proposition-item';
        // Affichage : Translittération (Gras) - Français ... Hiéroglyphes (Droite)
        div.innerHTML = `
            <div class="p-info-col">
                <span class="p-translit">${item.translitteration}</span>
                <span class="p-french">${item.francais}</span>
            </div>
            <span class="p-hiero">${createStackedHieroglyphs(item.hieroglyphes || '')}</span>
        `;

        div.onclick = () => {
            // Au clic, on affiche DIRECTEMENT l'item sélectionné (pas de re-recherche)
            mainInput.value = item.translitteration;
            propositionsContainer.classList.add('hidden');

            // Afficher directement les données de l'item cliqué
            const stackedHiero = createStackedHieroglyphs(item.hieroglyphes || '');
            resultHiero.innerHTML = `<span class="hiero-result-sign">${stackedHiero}</span> <span class="translit-result" style="font-family: 'Gentium Plus', serif;">(${item.translitteration})</span>`;
            resultFrench.textContent = `Traduction: ${item.francais}`;

            // Ajouter à l'historique
            addToHistory(item.francais, item.translitteration, item.hieroglyphes);

            // Vérifier si c'est un favori
            checkIfFavorite(`Hiéroglyphes: ${item.hieroglyphes} (${item.translitteration})`);
        };

        propositionsContainer.appendChild(div);
    });
}

// Close propositions only when clicking OUTSIDE the search card entirely (optional)
// For now we keep it simple: it stays open until a choice is made or input cleared.

function getMainInput() { return document.getElementById('main-input'); }

// === NAVIGATION VERS LES SECTIONS ===

// Gérer les clics sur les liens de navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1); // Enlever le #
        showSection(targetId);
    });
});

// Afficher une section et masquer le traducteur
function showSection(sectionId) {
    // Masquer le traducteur
    mainContainer.style.display = 'none';

    // Masquer toutes les sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });

    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        if (sectionId === 'liste-signes') {
            loadGardinerSigns();
        }
    }
}

// === LISTE DES SIGNES (GARDINER) ===
let signsLoaded = false;

function loadGardinerSigns() {
    if (signsLoaded) return;

    const container = document.getElementById('gardiner-list-container');
    const searchInput = document.getElementById('gardiner-search');

    // Add search listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        filterGardinerSigns(query);
    });

    fetch('/api/admin/gardiner')
        .then(response => {
            if (!response.ok) throw new Error("Erreur API");
            return response.json();
        })
        .then(data => {
            if (data.success && data.signs) {
                renderGardinerSigns(data.signs);
                signsLoaded = true;
            } else {
                throw new Error("Format de réponse invalide");
            }
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<p class="error">Impossible de charger la liste des signes.</p>';
        });
}
// Pagination variables (disabled - all signs on one page)
let allGardinerSigns = [];

// Ordre des catégories Gardiner (Aa en dernier)
const gardinerCategoryOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Aa'];

// Fonction pour extraire la catégorie et le numéro d'un code Gardiner
function parseGardinerCode(code) {
    if (!code) return { category: 'ZZ', num: 9999, suffix: '' };
    const match = code.match(/^([A-Za-z]+)(\d+)([A-Za-z]?)$/);
    if (match) {
        return {
            category: match[1].toUpperCase() === 'AA' ? 'Aa' : match[1].toUpperCase(),
            num: parseInt(match[2], 10),
            suffix: match[3] || ''
        };
    }
    return { category: 'ZZ', num: 9999, suffix: '' };
}

// Trier les signes selon l'ordre Gardiner
function sortGardinerSigns(signs) {
    return [...signs].sort((a, b) => {
        const codeA = parseGardinerCode(a.code);
        const codeB = parseGardinerCode(b.code);

        // Comparer par catégorie d'abord
        const catIndexA = gardinerCategoryOrder.indexOf(codeA.category);
        const catIndexB = gardinerCategoryOrder.indexOf(codeB.category);
        const catA = catIndexA === -1 ? 999 : catIndexA;
        const catB = catIndexB === -1 ? 999 : catIndexB;

        if (catA !== catB) return catA - catB;

        // Puis par numéro
        if (codeA.num !== codeB.num) return codeA.num - codeB.num;

        // Puis par suffixe alphabétique
        return codeA.suffix.localeCompare(codeB.suffix);
    });
}

function renderGardinerSigns(signs) {
    allGardinerSigns = sortGardinerSigns(signs);
    renderAllSigns();
}

function renderAllSigns() {
    const container = document.getElementById('gardiner-list-container');
    container.innerHTML = '';

    // Get visible signs after filters
    const visibleSigns = getVisibleSigns();

    if (visibleSigns.length === 0) {
        container.innerHTML = '<p>Aucun signe trouvé.</p>';
        document.getElementById('gardiner-count').textContent = '0';
        return;
    }

    document.getElementById('gardiner-count').textContent = visibleSigns.length;

    visibleSigns.forEach(sign => {
        const div = document.createElement('div');
        div.className = 'sign-item';
        div.dataset.search = (sign.code + " " + (sign.description || "") + " " + (sign.transliteration || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        div.dataset.code = sign.code;

        div.innerHTML = `
            <span class="sign-char">${sign.sign}</span>
            <div class="sign-info" style="display: flex; flex-direction: column; width: 100%;">
                <span class="sign-code" style="margin-bottom: 2px;">${sign.code}</span>
                <div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
                     <span class="sign-desc" style="text-align: left;">${sign.description || ''}</span>
                     <span class="sign-translit" style="text-align: right; color: #888; font-family: 'Gentium Plus', serif; margin-left: 10px;">${sign.transliteration || ''}</span>
                </div>
            </div>
        `;

        div.onclick = () => openSignDetailModal(sign);
        container.appendChild(div);
    });
}

function getVisibleSigns() {
    const query = document.getElementById('gardiner-search')?.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';
    const category = document.getElementById('gardiner-category')?.value || '';

    let filtered = allGardinerSigns.filter(sign => {
        const searchText = (sign.code + " " + (sign.description || "") + " " + (sign.transliteration || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchesQuery = !query || searchText.includes(query);

        let matchesCategory = true;
        if (category) {
            if (category === 'Aa') {
                matchesCategory = sign.code.startsWith('Aa');
            } else {
                matchesCategory = sign.code.startsWith(category) && !sign.code.startsWith('Aa');
            }
        }

        return matchesQuery && matchesCategory;
    });

    // Tri selon gardinerSortBy
    filtered.sort((a, b) => {
        if (gardinerSortBy === 'translit') {
            const aVal = (a.transliteration || '').toLowerCase();
            const bVal = (b.transliteration || '').toLowerCase();
            return aVal.localeCompare(bVal);
        } else if (gardinerSortBy === 'description') {
            const aVal = (a.description || '').toLowerCase();
            const bVal = (b.description || '').toLowerCase();
            return aVal.localeCompare(bVal);
        } else {
            // Tri par code (défaut) - tri naturel pour gérer A1, A2, A10
            return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
        }
    });

    return filtered;
}

function filterGardinerSigns(query) {
    renderAllSigns();
}

function filterByCategory() {
    renderAllSigns();
}

// === MODAL DÉTAIL D'UN SIGNE ===

const signDetailModal = document.getElementById('sign-detail-modal');

function openSignDetailModal(sign) {
    document.getElementById('sign-detail-char').textContent = sign.sign || '';
    document.getElementById('sign-detail-code').textContent = sign.code || '';
    document.getElementById('sign-detail-desc').textContent = sign.description || 'Pas de description disponible';
    document.getElementById('sign-detail-translit').textContent = sign.transliteration || 'Pas de translittération';
    document.getElementById('sign-detail-descriptif').textContent = sign.descriptif || '';

    signDetailModal.classList.remove('hidden');
    signDetailModal.classList.add('visible');
}

function closeSignDetailModal() {
    signDetailModal.classList.remove('visible');
    signDetailModal.classList.add('hidden');
}

// Close modal when clicking outside content
signDetailModal.addEventListener('click', function (e) {
    if (e.target === signDetailModal) {
        closeSignDetailModal();
    }
});

// Masquer une section et revenir au traducteur
function hideSection(sectionId) {
    document.getElementById(sectionId).classList.add('hidden');
    mainContainer.style.display = 'flex';
}

// === COMPTEUR DE MOTS ===
function loadWordCount() {
    fetch('/api/count')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('word-count').textContent = `${data.count} mots`;
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
        });
}

// Charger le compteur au démarrage
loadWordCount();

// === OVERLAY "À PROPOS" ===

const overlay = document.getElementById('about-overlay');
const hieroAnimation = document.getElementById('hiero-animation');

// Hiéroglyphes pour l'animation
const hieroglyphs = ['𓂀', '𓃀', '𓄀', '𓅃', '𓆃', '𓇋', '𓈖', '𓉐', '𓊃', '𓋴', '𓌸', '𓍿', '𓎛', '𓏏', '𓐍', '𓀀', '𓁀', '𓂋', '𓃭', '𓄿', '𓅱', '𓆓', '𓇳', '𓈙', '𓉻', '𓊹', '𓋹', '𓌀', '𓍯', '𓎟', '𓏤', '𓐙'];

let animationInterval;

function openOverlay() {
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    startHieroglyphAnimation();
}

function closeOverlay() {
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    stopHieroglyphAnimation();
}

// Animation de hiéroglyphes défilants
function startHieroglyphAnimation() {
    let display = '';
    let index = 0;

    // Afficher progressivement des hiéroglyphes
    animationInterval = setInterval(() => {
        if (index < 8) {
            const randomHiero = hieroglyphs[Math.floor(Math.random() * hieroglyphs.length)];
            display += randomHiero;
            hieroAnimation.textContent = display;
            index++;
        } else {
            // Recommencer avec de nouveaux hiéroglyphes
            display = '';
            index = 0;
        }
    }, 300);
}

function stopHieroglyphAnimation() {
    clearInterval(animationInterval);
    hieroAnimation.textContent = '';
}

// Fermer l'overlay en cliquant à l'extérieur
overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
        closeOverlay();
    }
});

// Fermer avec la touche Escape
// Fermer avec la touche Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (overlay.classList.contains('visible')) closeOverlay();
        if (authOverlay.classList.contains('visible')) closeAuthOverlay();
        if (accountOverlay.classList.contains('visible')) closeAccountOverlay();
        if (signDetailModal && signDetailModal.classList.contains('visible')) closeSignDetailModal();
    }
});


// === GESTION DE L'AUTHENTIFICATION ===

const authOverlay = document.getElementById('auth-overlay');
const accountOverlay = document.getElementById('account-overlay');
const authBtn = document.getElementById('auth-btn');

let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Obtenir les headers d'authentification
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

// Vérifier si l'utilisateur est connecté au chargement
function checkAuth() {
    if (!authToken) {
        currentUser = null;
        updateAuthUI(false);
        return;
    }

    fetch('/api/auth/profile', {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                updateAuthUI(true);
                loadUserFavorites();
                loadUserHistory();
            } else {
                // Token invalide, déconnecter
                logout();
            }
        })
        .catch(err => {
            console.error(err);
            logout();
        });
}

// Mettre à jour l'interface selon l'état de connexion
// Mettre à jour l'interface selon l'état de connexion
function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        authBtn.textContent = 'Mon Compte';
        authBtn.classList.add('logged-in');

        // Populate Dropdown Info
        document.getElementById('dropdown-username').textContent = currentUser.username;
        document.getElementById('dropdown-email').textContent = currentUser.email;

        // Dropdown header name
        const headerName = document.getElementById('dropdown-header-name');
        if (headerName) headerName.textContent = currentUser.username;

        // Populate Form Inputs for Edit Modals (optional, can be done on open)
        document.getElementById('edit-username-input').value = currentUser.username;
        document.getElementById('edit-email-input').value = currentUser.email;

        // Photo de profil dropdown
        const profilePic = document.getElementById('dropdown-user-pic');
        if (currentUser.profile_picture) {
            profilePic.src = currentUser.profile_picture;
            profilePic.classList.remove('fallback');
        } else {
            profilePic.src = '';
            profilePic.classList.add('fallback');
        }

        // Premium Badge
        const premiumBadge = document.getElementById('dropdown-premium-badge');
        if (premiumBadge) {
            if (currentUser.isPremium) {
                premiumBadge.classList.remove('hidden');
            } else {
                premiumBadge.classList.add('hidden');
            }
        }

        // Initialize search counter
        const dailyLimit = currentUser.dailySearchLimit || 15;
        const dailyCount = currentUser.dailySearchCount || 0;
        const remaining = currentUser.isPremium ? -1 : Math.max(0, dailyLimit - dailyCount);
        updateRemainingSearches(remaining, dailyLimit, currentUser.isPremium);

    } else {
        authBtn.textContent = 'Connexion';
        authBtn.classList.remove('logged-in');

        // Ensure dropdown is closed
        if (accountDropdown) accountDropdown.classList.add('hidden');

        // Hide premium badge
        const premiumBadge = document.getElementById('dropdown-premium-badge');
        if (premiumBadge) premiumBadge.classList.add('hidden');

        // Clear search counter
        const counter = document.getElementById('search-remaining-counter');
        if (counter) counter.textContent = '';
    }
}

// --- OVERLAY AUTH ---

function openAuthOverlay() {
    authOverlay.classList.remove('hidden');
    authOverlay.classList.add('visible');
    switchAuthTab('login'); // Par défaut sur login
}

function closeAuthOverlay() {
    authOverlay.classList.remove('visible');
    authOverlay.classList.add('hidden');
}

function switchAuthTab(tab) {
    // Boutons
    document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick="switchAuthTab('${tab}')"]`).classList.add('active');

    // Formulaires
    if (tab === 'login') {
        document.getElementById('login-form-container').classList.remove('hidden');
        document.getElementById('register-form-container').classList.add('hidden');
    } else {
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
    }
}

// --- LOGIN ---
document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Stocker le token JWT
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                currentUser = data.user;
                updateAuthUI(true);
                closeAuthOverlay();
                loadUserFavorites();
                loadUserHistory();
                // Reset form
                this.reset();
                errorDiv.classList.add('hidden');
            } else {
                errorDiv.textContent = data.error || 'Erreur de connexion';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(err => {
            errorDiv.textContent = "Erreur de connexion serveur";
            errorDiv.classList.remove('hidden');
        });
});

// --- MOT DE PASSE OUBLIÉ ---
function showForgotPasswordForm(event) {
    if (event) event.preventDefault();
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('forgot-password-container').classList.remove('hidden');
    document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
}

function showLoginForm(event) {
    if (event) event.preventDefault();
    document.getElementById('forgot-password-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
    document.querySelector('.auth-tab[onclick="switchAuthTab(\'login\')"]').classList.add('active');
}

document.getElementById('forgot-password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const errorDiv = document.getElementById('forgot-error');
    const successDiv = document.getElementById('forgot-success');
    const submitBtn = this.querySelector('button[type="submit"]');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                successDiv.textContent = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';
                successDiv.classList.remove('hidden');
                this.reset();
            } else {
                errorDiv.textContent = data.error || 'Erreur lors de l\'envoi';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(err => {
            errorDiv.textContent = 'Erreur de connexion au serveur';
            errorDiv.classList.remove('hidden');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer le lien';
        });
});

// --- REGISTER ---
document.getElementById('register-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Stocker le token JWT
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                currentUser = data.user;
                updateAuthUI(true);
                closeAuthOverlay();
                // Message de bienvenue avec info email
                alert('Compte créé avec succès ! ' + (data.emailSent ? 'Un email de vérification vous a été envoyé.' : 'Vérifiez votre email pour activer votre compte.'));
                this.reset();
                errorDiv.classList.add('hidden');
            } else {
                errorDiv.textContent = data.error || 'Erreur lors de l\'inscription';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(err => {
            errorDiv.textContent = "Erreur serveur";
            errorDiv.classList.remove('hidden');
        });
});

// --- OVERLAY COMPTE ---

// --- MANAGEMENT DU DROPDOWN & MODALS ---

const accountDropdown = document.getElementById('account-dropdown');

function handleAuthClick() {
    if (currentUser) {
        toggleDropdown();
    } else {
        openAuthOverlay();
    }
}

function toggleDropdown() {
    if (accountDropdown.classList.contains('hidden')) {
        accountDropdown.classList.remove('hidden');
    } else {
        accountDropdown.classList.add('hidden');
    }
}

function closeDropdown() {
    if (accountDropdown) accountDropdown.classList.add('hidden');
}

// Fermer le dropdown quand on clique en dehors
document.addEventListener('click', function (e) {
    if (accountDropdown && !accountDropdown.classList.contains('hidden')) {
        const authBtn = document.getElementById('auth-btn');
        const isClickInsideDropdown = accountDropdown.contains(e.target);
        const isClickOnAuthBtn = authBtn && authBtn.contains(e.target);

        if (!isClickInsideDropdown && !isClickOnAuthBtn) {
            closeDropdown();
            hideEditPanel(); // Also hide edit panel when closing dropdown
        }
    }
});

// === PANNEAU D'ÉDITION INLINE ===

let currentEditField = null;

function showEditPanel(field) {
    currentEditField = field;

    const mainView = document.getElementById('dropdown-main-view');
    const editView = document.getElementById('dropdown-edit-view');
    const titleElement = document.getElementById('edit-panel-title');

    // Hide all edit fields
    document.querySelectorAll('.edit-field-group').forEach(el => el.classList.add('hidden'));

    // Show the correct field and set title
    const titles = {
        'username': 'Modifier l\'identifiant',
        'email': 'Modifier l\'email',
        'password': 'Modifier le mot de passe'
    };

    titleElement.textContent = titles[field] || 'Modifier';
    document.getElementById(`edit-panel-${field}`).classList.remove('hidden');

    // Pre-fill current values
    if (field === 'username' && currentUser) {
        document.getElementById('inline-edit-username').value = currentUser.username || '';
    } else if (field === 'email' && currentUser) {
        document.getElementById('inline-edit-email').value = currentUser.email || '';
    }

    // Clear password fields
    if (field === 'password') {
        document.getElementById('inline-edit-password-current').value = '';
        document.getElementById('inline-edit-password-new').value = '';
    }

    // Clear errors
    document.getElementById('inline-edit-error').classList.add('hidden');

    // Animate transition
    mainView.classList.add('slide-out');
    editView.classList.remove('hidden');
    editView.classList.add('visible');
}

function hideEditPanel() {
    const mainView = document.getElementById('dropdown-main-view');
    const editView = document.getElementById('dropdown-edit-view');

    mainView.classList.remove('slide-out');
    editView.classList.remove('visible');
    editView.classList.add('hidden');

    currentEditField = null;
}

function saveInlineEdit() {
    if (!currentEditField || !currentUser) return;

    const errorDiv = document.getElementById('inline-edit-error');
    let data = {};

    if (currentEditField === 'username') {
        data.username = document.getElementById('inline-edit-username').value.trim();
        if (!data.username) {
            errorDiv.textContent = 'L\'identifiant ne peut pas être vide';
            errorDiv.classList.remove('hidden');
            return;
        }
    } else if (currentEditField === 'email') {
        data.email = document.getElementById('inline-edit-email').value.trim();
        if (!data.email) {
            errorDiv.textContent = 'L\'email ne peut pas être vide';
            errorDiv.classList.remove('hidden');
            return;
        }
    } else if (currentEditField === 'password') {
        const currentPassword = document.getElementById('inline-edit-password-current').value;
        const newPassword = document.getElementById('inline-edit-password-new').value;
        if (!currentPassword) {
            errorDiv.textContent = 'Veuillez entrer votre mot de passe actuel';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            errorDiv.textContent = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
            errorDiv.classList.remove('hidden');
            return;
        }
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
    }

    // Show loading state
    const saveBtn = document.querySelector('.edit-save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Enregistrement...';
    saveBtn.disabled = true;

    fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                // Update local user data
                if (response.user) {
                    currentUser = response.user;
                }
                // Update UI
                updateAuthUI(true);
                hideEditPanel();

                // Clear password fields
                if (currentEditField === 'password') {
                    document.getElementById('inline-edit-password-current').value = '';
                    document.getElementById('inline-edit-password-new').value = '';
                }
            } else {
                errorDiv.textContent = response.error || 'Erreur lors de la mise à jour';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(err => {
            console.error('Update error:', err);
            errorDiv.textContent = 'Erreur de connexion au serveur';
            errorDiv.classList.remove('hidden');
        })
        .finally(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        });
}


// Toggle password visibility
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
        button.classList.add('visible');
    } else {
        input.type = 'password';
        button.textContent = '👁';
        button.classList.remove('visible');
    }
}

// === GESTION DE L'HISTORIQUE (PAR UTILISATEUR) ===

const historyList = document.getElementById('history-list');

// Retourne la clé de stockage : 'history_guest' ou 'history_username'
function getHistoryKey() {
    if (currentUser && currentUser.username) {
        return `history_${currentUser.username}`;
    }
    return 'history_guest';
}

function getHistory() {
    try {
        const key = getHistoryKey();
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function saveHistory(historyData) {
    const key = getHistoryKey();
    localStorage.setItem(key, JSON.stringify(historyData));
    renderHistory();
}


function addToHistory(french, translit, hiero) {
    let history = getHistory();

    // Éviter les doublons consécutifs
    if (history.length > 0) {
        const last = history[0];
        if (last.french === french && last.translit === translit) return;
    }

    history.unshift({ french, translit, hiero });

    if (history.length > 50) history.pop(); // Limite

    saveHistory(history);

    // Update user stats
    updateStats(translit);
}

// === STATISTIQUES UTILISATEUR ===

function getStatsKey() {
    if (currentUser && currentUser.username) {
        return `stats_${currentUser.username}`;
    }
    return 'stats_guest';
}

function getStats() {
    try {
        const key = getStatsKey();
        return JSON.parse(localStorage.getItem(key)) || { searchCount: 0, wordCounts: {} };
    } catch (e) {
        return { searchCount: 0, wordCounts: {} };
    }
}

function saveStats(stats) {
    const key = getStatsKey();
    localStorage.setItem(key, JSON.stringify(stats));
}

function updateStats(searchTerm) {
    let stats = getStats();

    // Increment search count
    stats.searchCount = (stats.searchCount || 0) + 1;

    // Track word frequency
    if (searchTerm) {
        stats.wordCounts = stats.wordCounts || {};
        stats.wordCounts[searchTerm] = (stats.wordCounts[searchTerm] || 0) + 1;
    }

    saveStats(stats);
    renderStats();
}

function renderStats() {
    const stats = getStats();

    // Update search count
    const countEl = document.getElementById('stat-search-count');
    if (countEl) {
        countEl.textContent = stats.searchCount || 0;
    }

    // Find top word
    const topWordEl = document.getElementById('stat-top-word');
    if (topWordEl && stats.wordCounts) {
        let topWord = '—';
        let maxCount = 0;

        for (const [word, count] of Object.entries(stats.wordCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topWord = word;
            }
        }

        // Truncate if too long
        if (topWord.length > 8) {
            topWord = topWord.substring(0, 7) + '…';
        }

        topWordEl.textContent = topWord;
    }
}

// === GESTION DES FAVORIS ===

function getFavoritesKey() {
    if (currentUser && currentUser.username) {
        return `favorites_${currentUser.username}`;
    }
    return 'favorites_guest';
}

function getFavorites() {
    try {
        const key = getFavoritesKey();
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function saveFavorites(favorites) {
    const key = getFavoritesKey();
    localStorage.setItem(key, JSON.stringify(favorites));
    renderFavorites();
}

function toggleFavorite() {
    const hiero = document.getElementById('result-hiero').textContent;
    const french = document.getElementById('result-french').textContent;
    const translit = document.getElementById('main-input').value;

    if (!hiero || !french) return;

    let favorites = getFavorites();
    const existing = favorites.findIndex(f => f.hiero === hiero);

    const btn = document.getElementById('result-favorite');

    if (existing >= 0) {
        // Remove from favorites
        favorites.splice(existing, 1);
        btn.classList.remove('active');
        btn.querySelector('.favorite-icon').textContent = '☆';
        btn.querySelector('.favorite-text').textContent = 'Ajouter aux favoris';

        // Sync with server if logged in
        if (authToken) {
            fetch('/api/user/favorites', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transliteration: translit, action: 'remove' })
            }).catch(err => console.error('Erreur sync favori:', err));
        }
    } else {
        // Add to favorites
        favorites.unshift({ hiero, french, translit, date: Date.now() });
        if (favorites.length > 20) favorites.pop(); // Limit
        btn.classList.add('active');
        btn.querySelector('.favorite-icon').textContent = '★';
        btn.querySelector('.favorite-text').textContent = 'Dans vos favoris';

        // Sync with server if logged in
        if (authToken) {
            fetch('/api/user/favorites', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transliteration: translit })
            }).catch(err => console.error('Erreur sync favori:', err));
        }
    }

    saveFavorites(favorites);
}

function checkIfFavorite(hiero) {
    const favorites = getFavorites();
    const btn = document.getElementById('result-favorite');
    if (!btn) return;

    const isFav = favorites.some(f => f.hiero === hiero);
    if (isFav) {
        btn.classList.add('active');
        btn.querySelector('.favorite-icon').textContent = '★';
        btn.querySelector('.favorite-text').textContent = 'Dans vos favoris';
    } else {
        btn.classList.remove('active');
        btn.querySelector('.favorite-icon').textContent = '☆';
        btn.querySelector('.favorite-text').textContent = 'Ajouter aux favoris';
    }
}

function renderFavorites() {
    const favorites = getFavorites();
    const container = document.getElementById('favorites-list');
    const countEl = document.getElementById('favorites-count');

    if (!container) return;

    if (countEl) countEl.textContent = `(${favorites.length})`;

    if (favorites.length === 0) {
        container.innerHTML = '<div class="favorites-empty">Aucun favori</div>';
        return;
    }

    container.innerHTML = favorites.map((fav, i) => `
        <div class="favorite-item" onclick="loadFavorite(${i})">
            <span class="favorite-item-hiero">${fav.hiero}</span>
            <span class="favorite-item-text">${fav.translit || fav.french}</span>
            <button class="favorite-remove" onclick="event.stopPropagation(); removeFavorite(${i})">✕</button>
        </div>
    `).join('');
}

function loadFavorite(index) {
    const favorites = getFavorites();
    const fav = favorites[index];
    if (!fav) return;

    // Close dropdown
    closeDropdown();

    // Show main section
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    document.querySelector('.main-container').style.display = 'flex';

    // Fill in the result
    document.getElementById('main-input').value = fav.translit || '';
    document.getElementById('result-hiero').textContent = fav.hiero;
    document.getElementById('result-french').textContent = fav.french;
    checkIfFavorite(fav.hiero);
}

function removeFavorite(index) {
    let favorites = getFavorites();
    favorites.splice(index, 1);
    saveFavorites(favorites);
}

// Search the top word when clicked
function searchTopWord() {
    const stats = getStats();
    if (!stats.wordCounts) return;

    // Find top word (full version, not truncated)
    let topWord = null;
    let maxCount = 0;

    for (const [word, count] of Object.entries(stats.wordCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topWord = word;
        }
    }

    if (topWord && topWord !== '—') {
        // Close dropdown
        closeDropdown();

        // Hide any sections and show main
        document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
        document.querySelector('.main-container').style.display = 'flex';

        // Fill search input and perform search
        document.getElementById('main-input').value = topWord;
        performTranslation();
    }
}

function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Aucune recherche récente</div>';
        return;
    }

    history.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => restoreHistoryItem(item);

        // Utiliser createStackedHieroglyphs pour afficher les hiéroglyphes empilés
        const stackedHiero = createStackedHieroglyphs(item.hiero || '');

        div.innerHTML = `
            <span class="h-french">${item.french}</span>
            <span class="h-sep">-</span>
            <span class="h-translit">${item.translit}</span>
            <span class="h-sep">-</span>
            <span class="h-hiero">${stackedHiero}</span>
        `;
        historyList.appendChild(div);
    });
}

function clearHistory() {
    if (confirm('Voulez-vous vraiment effacer tout l\'historique ?')) {
        const key = getHistoryKey();
        localStorage.removeItem(key);
        renderHistory();
    }
}

function restoreHistoryItem(item) {
    const stackedHiero = createStackedHieroglyphs(item.hiero || '');
    document.getElementById('result-hiero').innerHTML = `Hiéroglyphes: ${stackedHiero} (${item.translit})`;
    document.getElementById('result-french').textContent = `Traduction: ${item.french} `;
}


// === GESTION DE L'INTERFACE (RESET) ===

function resetInterface() {
    // Vider la barre de recherche
    document.getElementById('main-input').value = '';

    // Vider les résultats
    document.getElementById('result-hiero').textContent = '';
    document.getElementById('result-french').textContent = '';

    // Vider / Masquer les suggestions
    if (document.getElementById('propositions-list')) {
        document.getElementById('propositions-list').classList.add('hidden');
        document.getElementById('propositions-list').innerHTML = '';
    }

    // Recharger l'historique (qui sera celui du guest ou vide)
    renderHistory();
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        authBtn.textContent = 'Mon Compte';
        authBtn.classList.add('logged-in');

        document.getElementById('dropdown-username').textContent = currentUser.username;
        document.getElementById('dropdown-email').textContent = currentUser.email;
        document.getElementById('dropdown-header-name').textContent = currentUser.username;

        const profilePic = document.getElementById('dropdown-user-pic');
        if (currentUser.profile_picture) {
            profilePic.src = currentUser.profile_picture;
            profilePic.classList.remove('fallback');
        } else {
            profilePic.src = '';
            profilePic.classList.add('fallback');
        }

        // Charger l'historique et stats de l'utilisateur connecté
        renderHistory();
        renderStats();

    } else {
        authBtn.textContent = 'Connexion';
        authBtn.classList.remove('logged-in');
        closeDropdown();
    }
}

function logout() {
    // Clear token from localStorage
    authToken = null;
    localStorage.removeItem('authToken');
    currentUser = null;
    updateAuthUI(false);
    resetInterface();
    closeDropdown();
}

// === SYNC AVEC LE SERVEUR ===

function loadUserFavorites() {
    if (!authToken) return;

    fetch('/api/user/favorites', {
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.favorites) {
                // Mettre à jour les favoris locaux
                updateLocalFavorites(data.favorites);
            }
        })
        .catch(err => console.error('Erreur chargement favoris:', err));
}

function loadUserHistory() {
    if (!authToken) {
        renderHistory(); // Afficher l'historique local si pas connecté
        return;
    }

    fetch('/api/user/history', {
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour l'historique local avec les données du serveur
                if (data.history && data.history.length > 0) {
                    // Convertir format serveur vers format local et sauvegarder
                    const localFormat = data.history.map(item => ({
                        french: item.french || item.query || '',
                        translit: item.transliteration || '',
                        hiero: item.hieroglyphs || ''
                    }));
                    saveHistory(localFormat);
                }
                // Mettre à jour les stats
                if (data.stats) {
                    updateUserStats(data.stats);
                }
            }
            // Toujours afficher l'historique
            renderHistory();
        })
        .catch(err => {
            console.error('Erreur chargement historique:', err);
            renderHistory(); // Afficher l'historique local en cas d'erreur
        });
}

function updateLocalFavorites(serverFavorites) {
    // Mettre à jour l'affichage des favoris
    const favoritesList = document.getElementById('favorites-list');
    const favoritesCount = document.getElementById('favorites-count');

    if (!favoritesList) return;

    if (!serverFavorites || serverFavorites.length === 0) {
        favoritesList.innerHTML = '<div class="favorites-empty">Aucun favori</div>';
        if (favoritesCount) favoritesCount.textContent = '(0)';
        return;
    }

    if (favoritesCount) favoritesCount.textContent = `(${serverFavorites.length})`;

    favoritesList.innerHTML = serverFavorites.map(fav => `
        <div class="favorite-item" onclick="searchFavorite('${fav.transliteration}')">
            <span class="favorite-term">${fav.transliteration}</span>
            <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${fav.transliteration}')">×</button>
        </div>
    `).join('');
}

function updateLocalHistory(serverHistory) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (!serverHistory || serverHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Aucune recherche récente</div>';
        return;
    }

    historyList.innerHTML = serverHistory.slice(0, 10).map(item => `
        <div class="history-item" onclick="searchFromHistory('${item.query}')">
            <span class="history-query">${item.query}</span>
            ${item.transliteration ? `<span class="history-translit">${item.transliteration}</span>` : ''}
        </div>
    `).join('');
}

function updateUserStats(stats) {
    const searchCount = document.getElementById('stat-search-count');
    const topWord = document.getElementById('stat-top-word');

    if (searchCount) searchCount.textContent = stats.searchCount || 0;
    if (topWord) topWord.textContent = stats.topWord || '—';
}

function syncSearchToServer(query, transliteration, hieroglyphs, french) {
    if (!authToken) return;

    fetch('/api/user/history', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, transliteration, hieroglyphs, french })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.stats) {
                updateUserStats(data.stats);
            }
        })
        .catch(err => console.error('Erreur sync historique:', err));
}

function searchFavorite(term) {
    const input = document.getElementById('main-input');
    if (input) {
        input.value = term;
        handleSearch();
    }
    closeDropdown();
}

function searchFromHistory(query) {
    const input = document.getElementById('main-input');
    if (input) {
        input.value = query;
        handleSearch();
    }
}

function removeFavorite(transliteration) {
    if (!authToken) return;

    fetch('/api/user/favorites', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ transliteration, action: 'remove' })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                updateLocalFavorites(data.favorites);
            }
        })
        .catch(err => console.error('Erreur suppression favori:', err));
}


// === QUIZ SYSTÈME ===

let quizScore = 0;
let quizTotal = 0;
let currentQuizSign = null;
let quizSigns = [];
let quizMode = 'translit'; // 'translit' ou 'description' (translit par défaut)

function switchQuizMode(mode) {
    quizMode = mode;

    // Update buttons
    document.querySelectorAll('.quiz-mode').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update prompts
    const signPrompt = document.getElementById('quiz-sign-prompt');
    const translatePrompt = document.getElementById('quiz-translate-prompt');
    const translateInput = document.getElementById('quiz-translate-input');

    if (mode === 'translit') {
        if (signPrompt) signPrompt.textContent = 'Quelle est la translittération de ce signe ?';
        if (translatePrompt) translatePrompt.textContent = 'Écrivez la translittération :';
        if (translateInput) translateInput.placeholder = 'Ex: ʿnḫ, nfr, pr...';
    } else {
        if (signPrompt) signPrompt.textContent = 'Quelle est la description de ce signe ?';
        if (translatePrompt) translatePrompt.textContent = 'Quelle est la description de ce signe ?';
        if (translateInput) translateInput.placeholder = 'Votre réponse...';
    }

    // Regenerate current question
    if (document.getElementById('quiz-sign').classList.contains('active')) {
        generateSignQuestion();
    } else {
        generateTranslateQuestion();
    }

    // Mettre à jour le leaderboard pour cette catégorie
    updateLeaderboard();
}

// Charger les signes pour le quiz
async function loadQuizSigns() {
    if (quizSigns.length === 0) {
        try {
            const response = await fetch('gardiner_signs.json');
            const signs = await response.json();
            // Filtrer les signes qui ont une description
            quizSigns = signs.filter(s => s.description && s.sign);
        } catch (e) {
            console.error('Erreur chargement quiz:', e);
        }
    }
}

function switchQuizType(type) {
    // Update tabs
    document.querySelectorAll('.quiz-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update panels
    document.querySelectorAll('.quiz-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`quiz-${type}`).classList.add('active');

    // Clear feedback
    document.getElementById('quiz-feedback').classList.add('hidden');

    // Generate new question
    if (type === 'sign') {
        generateSignQuestion();
    } else {
        generateTranslateQuestion();
    }

    // Mettre à jour le leaderboard
    updateLeaderboard();
}

async function generateSignQuestion() {
    await loadQuizSigns();

    // En mode translit, ne garder que les signes avec translittération
    let eligibleSigns = quizSigns;
    if (quizMode === 'translit') {
        eligibleSigns = quizSigns.filter(s => s.transliteration);
    }

    if (eligibleSigns.length < 4) return;

    // Pick random sign
    const correctIndex = Math.floor(Math.random() * eligibleSigns.length);
    currentQuizSign = eligibleSigns[correctIndex];

    // Display the sign
    document.getElementById('quiz-sign-char').textContent = currentQuizSign.sign;

    // Generate 4 options (1 correct + 3 wrong) - tous avec translittération en mode translit
    const options = [currentQuizSign];
    while (options.length < 4) {
        const randSign = eligibleSigns[Math.floor(Math.random() * eligibleSigns.length)];
        if (!options.find(o => o.code === randSign.code)) {
            options.push(randSign);
        }
    }

    // Shuffle
    options.sort(() => Math.random() - 0.5);

    // Render options based on mode
    const container = document.getElementById('quiz-sign-options');
    container.innerHTML = options.map(opt => {
        const displayText = quizMode === 'translit'
            ? (opt.transliteration || 'Pas de translittération')
            : opt.description;
        return `
            <button class="quiz-option" onclick="checkSignAnswer(this, '${opt.code}')">
                ${opt.code} - ${displayText}
            </button>
        `;
    }).join('');
}

function checkSignAnswer(button, selectedCode) {
    const isCorrect = selectedCode === currentQuizSign.code;
    quizTotal++;

    // Disable all buttons
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        if (btn.textContent.includes(currentQuizSign.code)) {
            btn.classList.add('correct');
        }
    });

    if (isCorrect) {
        quizScore++;
        button.classList.add('correct');
        showFeedback(true, 'Correct !');
    } else {
        button.classList.add('wrong');
        const correctText = quizMode === 'translit'
            ? (currentQuizSign.transliteration || 'Pas de translittération')
            : currentQuizSign.description;
        showFeedback(false, `Faux ! C'était ${currentQuizSign.code} - ${correctText}`);
    }

    updateScore();

    // Next question after delay
    setTimeout(() => {
        document.getElementById('quiz-feedback').classList.add('hidden');
        generateSignQuestion();
    }, 2000);
}

async function generateTranslateQuestion() {
    await loadQuizSigns();
    if (quizSigns.length === 0) return;

    // Pick random sign - si mode translit, filtrer ceux qui ont une translittération
    let eligibleSigns = quizSigns;
    if (quizMode === 'translit') {
        eligibleSigns = quizSigns.filter(s => s.transliteration);
    }
    if (eligibleSigns.length === 0) return;

    currentQuizSign = eligibleSigns[Math.floor(Math.random() * eligibleSigns.length)];
    document.getElementById('quiz-translate-char').textContent = currentQuizSign.sign;
    document.getElementById('quiz-translate-input').value = '';
}

function checkTranslation() {
    const input = document.getElementById('quiz-translate-input').value.trim().toLowerCase();

    let correctAnswer, isCorrect;

    if (quizMode === 'translit') {
        correctAnswer = (currentQuizSign.transliteration || '').toLowerCase();
        // Pour la translittération, on vérifie la correspondance exacte ou une partie significative
        isCorrect = correctAnswer && (
            correctAnswer.includes(input) ||
            input.includes(correctAnswer) ||
            input === correctAnswer
        );
    } else {
        correctAnswer = currentQuizSign.description.toLowerCase();
        // Pour la description, on vérifie si ça contient le mot clé
        isCorrect = correctAnswer.includes(input) || input.includes(correctAnswer.split(' ')[0]);
    }

    quizTotal++;

    const displayAnswer = quizMode === 'translit'
        ? (currentQuizSign.transliteration || 'Pas de translittération')
        : currentQuizSign.description;

    if (isCorrect && input.length > 0) {
        quizScore++;
        showFeedback(true, 'Correct !');
    } else {
        showFeedback(false, `C'était : ${displayAnswer}`);
    }

    updateScore();

    setTimeout(() => {
        document.getElementById('quiz-feedback').classList.add('hidden');
        generateTranslateQuestion();
    }, 2000);
}

// Insérer un caractère spécial dans l'input du quiz
function insertQuizChar(char) {
    const input = document.getElementById('quiz-translate-input');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;

    input.value = value.substring(0, start) + char + value.substring(end);
    input.focus();
    input.setSelectionRange(start + char.length, start + char.length);
}

function showFeedback(isCorrect, message) {
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden', 'correct', 'wrong');
    feedback.classList.add(isCorrect ? 'correct' : 'wrong');
    feedback.querySelector('.feedback-icon').textContent = isCorrect ? '✓' : '✗';
    feedback.querySelector('.feedback-text').textContent = message;
}

function updateScore() {
    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-total').textContent = quizTotal;

    // Sauvegarder le score au leaderboard (après 5 questions minimum)
    saveScore();
}

function resetQuiz() {
    quizScore = 0;
    quizTotal = 0;
    updateScore();
    document.getElementById('quiz-feedback').classList.add('hidden');

    // Check which tab is active and generate question
    if (document.getElementById('quiz-sign').classList.contains('active')) {
        generateSignQuestion();
    } else {
        generateTranslateQuestion();
    }
}

// Initialize quiz when section is shown
document.addEventListener('click', (e) => {
    if (e.target.matches('a[href="#exercice"]')) {
        setTimeout(() => {
            generateSignQuestion();
            updateLeaderboard();
        }, 100);
    }
});

// === LEADERBOARD SYSTÈME ===

function getLeaderboardKey() {
    const quizType = document.getElementById('quiz-sign').classList.contains('active') ? 'sign' : 'translate';
    return `leaderboard_${quizType}_${quizMode}`;
}

function getCategoryLabel() {
    const quizType = document.getElementById('quiz-sign').classList.contains('active') ? 'Identifier' : 'Traduire';
    const modeLabel = quizMode === 'translit' ? 'Translittération' : 'Description';
    return `${quizType} • ${modeLabel}`;
}

function getLeaderboard() {
    try {
        const key = getLeaderboardKey();
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function saveScore() {
    if (quizTotal < 5) return; // Minimum 5 questions pour enregistrer

    const username = currentUser?.username || 'Invité';
    const percentage = Math.round((quizScore / quizTotal) * 100);
    const key = getLeaderboardKey();

    let leaderboard = getLeaderboard();

    // Chercher si l'utilisateur a déjà un score
    const existingIndex = leaderboard.findIndex(e => e.name === username);

    if (existingIndex >= 0) {
        // Garder le meilleur score
        if (percentage > leaderboard[existingIndex].score) {
            leaderboard[existingIndex].score = percentage;
            leaderboard[existingIndex].correct = quizScore;
            leaderboard[existingIndex].total = quizTotal;
        }
    } else {
        leaderboard.push({
            name: username,
            score: percentage,
            correct: quizScore,
            total: quizTotal,
            date: Date.now()
        });
    }

    // Trier par score décroissant et garder top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);

    localStorage.setItem(key, JSON.stringify(leaderboard));
    updateLeaderboard();
}

function updateLeaderboard() {
    let leaderboard = getLeaderboard();

    // Ajouter des scores de démonstration si le leaderboard est vide
    if (leaderboard.length === 0) {
        leaderboard = [
            { name: 'juleezzzzz', score: 98, correct: 49, total: 50 },
            { name: 'PharaonMaster', score: 92, correct: 23, total: 25 },
            { name: 'NeferBot', score: 88, correct: 22, total: 25 },
            { name: 'AnubisGamer', score: 84, correct: 21, total: 25 },
            { name: 'HorusPlayer', score: 80, correct: 20, total: 25 },
            { name: 'RaSupreme', score: 76, correct: 19, total: 25 },
            { name: 'ThothWise', score: 72, correct: 18, total: 25 },
            { name: 'IsisQueen', score: 68, correct: 17, total: 25 },
            { name: 'OsirisKing', score: 64, correct: 16, total: 25 },
            { name: 'SethDark', score: 60, correct: 15, total: 25 }
        ];
    }

    const container = document.getElementById('leaderboard-list');
    const categoryEl = document.getElementById('leaderboard-category');
    const yourBestEl = document.getElementById('your-best-score');

    if (!container) return;

    // Mettre à jour le label de catégorie
    if (categoryEl) {
        categoryEl.textContent = getCategoryLabel();
    }

    // Afficher le classement
    if (leaderboard.length === 0) {
        container.innerHTML = '<div class="leaderboard-empty">Aucun score enregistré</div>';
    } else {
        container.innerHTML = leaderboard.map((entry, i) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${i + 1}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${entry.score}%</span>
            </div>
        `).join('');
    }

    // Afficher le meilleur score de l'utilisateur actuel
    const username = currentUser?.username || 'Invité';
    const userEntry = leaderboard.find(e => e.name === username);
    if (yourBestEl) {
        yourBestEl.textContent = userEntry ? `${userEntry.score}% (${userEntry.correct}/${userEntry.total})` : '—';
    }
}

// Initialisation au chargement
renderHistory();
renderStats();
renderFavorites();
checkAuth();

// Nouvelles initialisations
checkFirstVisit();  // Onboarding au premier lancement
handleUrlParams();  // Gérer ?q=xxx dans l'URL

// === CARTOUCHE GENERATOR ===
// Mapping lettres latines vers hiéroglyphes phonétiques (approximatif)
const letterToHiero = {
    'a': '𓄿', 'b': '𓃀', 'c': '𓎡', 'd': '𓂧', 'e': '𓇋', 'f': '𓆑',
    'g': '𓎼', 'h': '𓉔', 'i': '𓇋', 'j': '𓆓', 'k': '𓎡', 'l': '𓃭',
    'm': '𓅓', 'n': '𓈖', 'o': '𓍯', 'p': '𓊪', 'q': '𓏘', 'r': '𓂋',
    's': '𓋴', 't': '𓏏', 'u': '𓅱', 'v': '𓆑', 'w': '𓅱', 'x': '𓎡𓋴',
    'y': '𓇌', 'z': '𓊃'
};

function updateCartouche() {
    const nameInput = document.getElementById('cartouche-name');
    const hierosDisplay = document.getElementById('cartouche-hieros');
    const translitDisplay = document.getElementById('cartouche-translit');

    if (!nameInput || !hierosDisplay) return;

    const name = nameInput.value.toLowerCase().trim();
    let hieros = '';
    let translit = '';

    for (const char of name) {
        if (letterToHiero[char]) {
            hieros += letterToHiero[char];
            translit += char;
        } else if (char === ' ') {
            // Espace entre les mots
            hieros += ' ';
            translit += '-';
        }
    }

    hierosDisplay.textContent = hieros || '𓏏𓍯𓋹'; // Placeholder si vide
    if (translitDisplay) translitDisplay.textContent = translit || '—';
}

function downloadCartouche() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 200;

    // Fond
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cadre du cartouche
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(50, 40, 300, 100, 50);
    ctx.stroke();
    ctx.fillStyle = '#faf3e0';
    ctx.fill();

    // Hiéroglyphes
    ctx.font = '40px "Noto Sans Egyptian Hieroglyphs"';
    ctx.fillStyle = '#2b2b2b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hieros = document.getElementById('cartouche-hieros').textContent;
    ctx.fillText(hieros, 200, 90);

    // Base du cartouche
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(185, 140, 30, 20);

    // Télécharger
    const link = document.createElement('a');
    link.download = 'mon-cartouche.png';
    link.href = canvas.toDataURL();
    link.click();
}

function shareCartouche() {
    const name = document.getElementById('cartouche-name').value;
    const url = `${window.location.origin}${window.location.pathname}?cartouche=${encodeURIComponent(name)}`;

    navigator.clipboard.writeText(url).then(() => {
        alert('Lien copié ! Partagez-le pour montrer votre cartouche.');
    });
}

// Charger un cartouche depuis l'URL
function loadCartoucheFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const cartoucheName = params.get('cartouche');
    if (cartoucheName) {
        const input = document.getElementById('cartouche-name');
        if (input) {
            input.value = cartoucheName;
            updateCartouche();
            showSection('cartouche');
        }
    }
}

// === TEXTES CÉLÈBRES ===
const famousTexts = {
    rosetta: {
        title: 'Pierre de Rosette - Décret de Ptolémée V',
        hieros: '𓇋𓅱𓀀𓏏𓏭 𓇳𓅃𓏏𓇯 𓆓𓏏𓇯 𓇋𓈖𓏤 𓊪𓏏𓍯𓃭𓅓𓇋𓅱𓋴',
        translation: '"Au temps du roi Ptolémée, dieu vivant, bien-aimé de Ptah..."'
    },
    book_dead: {
        title: 'Livre des Morts - Chapitre 125',
        hieros: '𓇋𓀀 𓅓 𓇋𓏤𓂋𓏏 𓂝𓏏 𓅓𓂋𓏤𓇋𓏏 𓄿𓏤𓂋𓂧𓅱𓀀',
        translation: '"Je suis pur, je suis pur ! Je n\'ai pas commis d\'injustice..."'
    },
    hymn_nile: {
        title: 'Hymne au Nil',
        hieros: '𓇋𓈖𓂧𓅱𓀀 𓉐𓂝𓏤𓂋 𓆓𓏏𓇋𓏤 𓏏𓄿𓏤',
        translation: '"Salut à toi, ô Nil, qui jaillis de la terre..."'
    },
    tutankhamun: {
        title: 'Cartouche de Toutânkhamon',
        hieros: '𓇋𓏠𓈖 𓏏𓅱𓏏 𓋹𓈖𓐍 𓇋𓏠𓈖',
        translation: 'Toutânkhamon = "Image vivante d\'Amon" (twt-ʿnḫ-jmn)'
    }
};

function openTexte(texteId) {
    const texte = famousTexts[texteId];
    if (!texte) return;

    const viewer = document.getElementById('texte-viewer');
    document.getElementById('texte-title').textContent = texte.title;
    document.getElementById('texte-hieros').textContent = texte.hieros;
    document.getElementById('texte-translation').textContent = texte.translation;

    viewer.classList.remove('hidden');
    viewer.scrollIntoView({ behavior: 'smooth' });
}

// === API STATS ===
async function loadApiStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('total-searches').textContent = data.total_searches.toLocaleString();
            document.getElementById('today-searches').textContent = data.today_count.toLocaleString();

            const topList = document.getElementById('top-words-list');
            if (topList && data.top_words.length > 0) {
                topList.innerHTML = data.top_words.map(w =>
                    `<li><strong>${w.term}</strong> (${w.count} recherches)</li>`
                ).join('');
            }
        }
    } catch (err) {
        console.error('Erreur chargement stats:', err);
    }
}

// Load stats when API section is shown
const originalShowSection = window.showSection;
window.showSection = function (sectionId) {
    originalShowSection(sectionId);

    if (sectionId === 'api') {
        loadApiStats();
    }
};

// === BROWSER EXTENSION HELPER ===
// Info pour créer l'extension navigateur
function getExtensionCode() {
    return {
        manifest: {
            name: "Hierotranslate",
            version: "1.0",
            description: "Traduisez les hiéroglyphes depuis n'importe quel site",
            permissions: ["activeTab"],
            action: {
                default_popup: "popup.html",
                default_icon: "icon.png"
            },
            manifest_version: 3
        },
        popup_html: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { width: 300px; padding: 15px; font-family: sans-serif; }
        input { width: 100%; padding: 8px; margin: 10px 0; }
        #result { margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .hiero { font-family: 'Noto Sans Egyptian Hieroglyphs'; font-size: 24px; }
    </style>
</head>
<body>
    <h3>🔍 Hierotranslate</h3>
    <input type="text" id="term" placeholder="Entrez un mot...">
    <div id="result"></div>
    <script src="popup.js"></script>
</body>
</html>`,
        popup_js: `document.getElementById('term').addEventListener('input', async (e) => {
    const term = e.target.value.trim();
    if (!term) return;
    
    const response = await fetch('https://hierotranslate.com/api/translate?term=' + term);
    const data = await response.json();
    
    if (data.success) {
        document.getElementById('result').innerHTML = 
            '<div class="hiero">' + data.data.hieroglyphes + '</div>' +
            '<p>' + data.data.francais + '</p>';
    }
});`
    };
}

// Initialiser cartouche depuis URL si présent
loadCartoucheFromUrl();

// === FORUM DE DISCUSSION ===
let currentTopicId = null;
let forumTopics = [];

// Hook showSection pour charger le forum
const forumShowSection = window.showSection;
window.showSection = function (sectionId) {
    forumShowSection(sectionId);

    if (sectionId === 'discussion') {
        loadForumTopics();
    }
};

// Charger les sujets du forum
async function loadForumTopics() {
    const topicsList = document.getElementById('forum-topics-list');
    const emptyState = document.getElementById('forum-empty');
    const loginHint = document.getElementById('forum-login-hint');
    const newTopicBtn = document.getElementById('new-topic-btn');

    // Afficher/masquer bouton nouveau sujet selon connexion
    const token = localStorage.getItem('authToken');
    if (token) {
        newTopicBtn.classList.remove('hidden');
        loginHint.classList.add('hidden');
    } else {
        newTopicBtn.classList.add('hidden');
        loginHint.classList.remove('hidden');
    }

    try {
        const response = await fetch('/api/forum/topics');
        const data = await response.json();

        if (data.success && data.topics.length > 0) {
            forumTopics = data.topics;
            topicsList.innerHTML = '';
            emptyState.classList.add('hidden');

            data.topics.forEach(topic => {
                const div = document.createElement('div');
                div.className = 'forum-topic-item';
                div.dataset.date = topic.createdAt;
                div.dataset.likes = topic.likesCount || 0;
                div.onclick = (e) => {
                    // Ne pas naviguer si on clique sur le bouton like
                    if (e.target.closest('.forum-like-btn')) return;
                    viewTopic(topic.id);
                };

                const date = new Date(topic.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                div.innerHTML = `
                    <div class="forum-topic-item-header">
                        <h3 class="forum-topic-item-title">${escapeHtml(topic.title)}</h3>
                    </div>
                    <p class="forum-topic-item-preview">${escapeHtml(topic.content)}</p>
                    <div class="forum-topic-item-footer">
                        <div class="forum-topic-item-author">
                            <img src="${topic.authorPicture || ''}" alt="" class="forum-avatar ${!topic.authorPicture ? 'fallback' : ''}" onerror="this.classList.add('fallback')">
                            <span>${escapeHtml(topic.authorName)}</span>
                        </div>
                        <div class="forum-topic-item-meta">
                            <button class="forum-like-btn" data-topic-id="${topic.id}" onclick="toggleLike(event, '${topic.id}')">
                                <span class="like-icon">♡</span>
                                <span class="like-count">${topic.likesCount || 0}</span>
                            </button>
                            <span>💬 ${topic.repliesCount}</span>
                            <span>${date}</span>
                        </div>
                    </div>
                `;

                topicsList.appendChild(div);
            });
        } else {
            topicsList.innerHTML = '';
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erreur chargement forum:', error);
        topicsList.innerHTML = '<p class="forum-loading">Erreur de chargement</p>';
    }
}

// Échapper le HTML pour éviter XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Afficher le formulaire nouveau sujet
function showNewTopicForm() {
    document.getElementById('forum-list-view').classList.add('hidden');
    document.getElementById('forum-new-topic-view').classList.remove('hidden');
    document.getElementById('forum-topic-view').classList.add('hidden');
}

// Masquer le formulaire nouveau sujet
function hideNewTopicForm() {
    document.getElementById('forum-list-view').classList.remove('hidden');
    document.getElementById('forum-new-topic-view').classList.add('hidden');
    document.getElementById('new-topic-form').reset();
    document.getElementById('topic-form-error').classList.add('hidden');
}

// Soumettre un nouveau sujet
async function submitNewTopic(event) {
    event.preventDefault();

    const title = document.getElementById('topic-title').value.trim();
    const content = document.getElementById('topic-content').value.trim();
    const errorEl = document.getElementById('topic-form-error');
    const token = localStorage.getItem('authToken');

    if (!token) {
        errorEl.textContent = 'Veuillez vous connecter pour publier';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/forum/topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });

        const data = await response.json();

        if (data.success) {
            hideNewTopicForm();
            loadForumTopics();
        } else {
            errorEl.textContent = data.error || 'Erreur lors de la publication';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erreur création sujet:', error);
        errorEl.textContent = 'Erreur de connexion';
        errorEl.classList.remove('hidden');
    }
}

// Voir un sujet
async function viewTopic(topicId) {
    currentTopicId = topicId;

    document.getElementById('forum-list-view').classList.add('hidden');
    document.getElementById('forum-new-topic-view').classList.add('hidden');
    document.getElementById('forum-topic-view').classList.remove('hidden');

    const token = localStorage.getItem('authToken');
    const userId = getCurrentUserId();

    // Afficher/masquer formulaire réponse selon connexion
    if (token) {
        document.getElementById('forum-reply-form').classList.remove('hidden');
        document.getElementById('forum-reply-login-hint').classList.add('hidden');
    } else {
        document.getElementById('forum-reply-form').classList.add('hidden');
        document.getElementById('forum-reply-login-hint').classList.remove('hidden');
    }

    try {
        const response = await fetch(`/api/forum/topics/${topicId}`);
        const data = await response.json();

        if (data.success) {
            const topic = data.topic;
            const replies = data.replies;

            // Afficher le sujet
            document.getElementById('topic-author-pic').src = topic.authorPicture || '';
            document.getElementById('topic-author-pic').classList.toggle('fallback', !topic.authorPicture);
            document.getElementById('topic-author-name').textContent = topic.authorName;
            document.getElementById('topic-date').textContent = new Date(topic.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('topic-detail-title').textContent = topic.title;
            document.getElementById('topic-detail-content').textContent = topic.content;

            // Bouton supprimer (si auteur)
            const deleteBtn = document.getElementById('topic-delete-btn');
            if (userId && topic.authorId === userId) {
                deleteBtn.classList.remove('hidden');
            } else {
                deleteBtn.classList.add('hidden');
            }

            // Afficher les réponses
            document.getElementById('replies-count').textContent = `(${replies.length})`;
            const repliesList = document.getElementById('forum-replies-list');
            const repliesEmpty = document.getElementById('forum-replies-empty');

            if (replies.length > 0) {
                repliesList.innerHTML = '';
                repliesEmpty.classList.add('hidden');

                replies.forEach(reply => {
                    const div = document.createElement('div');
                    div.className = 'forum-reply-item';
                    div.innerHTML = `
                        <div class="forum-reply-header">
                            <div class="forum-author">
                                <img src="${reply.authorPicture || ''}" alt="" class="forum-avatar ${!reply.authorPicture ? 'fallback' : ''}" onerror="this.classList.add('fallback')">
                                <span class="forum-author-name">${escapeHtml(reply.authorName)}</span>
                            </div>
                            <span class="forum-date">${new Date(reply.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div class="forum-reply-content">${escapeHtml(reply.content)}</div>
                    `;
                    repliesList.appendChild(div);
                });
            } else {
                repliesList.innerHTML = '';
                repliesEmpty.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Erreur chargement sujet:', error);
    }
}

// Retour à la liste du forum
function backToForumList() {
    document.getElementById('forum-topic-view').classList.add('hidden');
    document.getElementById('forum-list-view').classList.remove('hidden');
    document.getElementById('reply-content').value = '';
    currentTopicId = null;
    loadForumTopics();
}

// Afficher la liste du forum (pour le bouton retour principal)
function showForumList() {
    document.getElementById('forum-topic-view').classList.add('hidden');
    document.getElementById('forum-new-topic-view').classList.add('hidden');
    document.getElementById('forum-list-view').classList.remove('hidden');
    currentTopicId = null;
}

// Soumettre une réponse
async function submitReply() {
    const content = document.getElementById('reply-content').value.trim();
    const errorEl = document.getElementById('reply-form-error');
    const token = localStorage.getItem('authToken');

    if (!content) return;

    if (!token) {
        errorEl.textContent = 'Veuillez vous connecter pour répondre';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/forum/replies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ topicId: currentTopicId, content })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('reply-content').value = '';
            errorEl.classList.add('hidden');
            viewTopic(currentTopicId); // Rafraîchir
        } else {
            errorEl.textContent = data.error || 'Erreur';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erreur réponse:', error);
        errorEl.textContent = 'Erreur de connexion';
        errorEl.classList.remove('hidden');
    }
}

// Supprimer un sujet
async function deleteTopic() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce sujet ?')) return;

    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/forum/topics/${currentTopicId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            backToForumList();
        } else {
            alert(data.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur de connexion');
    }
}

// Récupérer l'ID utilisateur actuel (depuis le token JWT)
function getCurrentUserId() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch {
        return null;
    }
}

// Filtrer les sujets du forum par recherche
function filterForumTopics(query) {
    const q = query.toLowerCase().trim();
    const items = document.querySelectorAll('.forum-topic-item');

    items.forEach(item => {
        const title = item.querySelector('.forum-topic-item-title')?.textContent.toLowerCase() || '';
        const preview = item.querySelector('.forum-topic-item-preview')?.textContent.toLowerCase() || '';
        const matches = title.includes(q) || preview.includes(q);
        item.style.display = matches ? '' : 'none';
    });
}

// Trier les sujets par récent ou populaire
let forumSortOrder = 'recent';

function sortForumBy(order) {
    forumSortOrder = order;

    // Update tabs
    document.querySelectorAll('.forum-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sort === order);
    });

    // Sort topics in DOM
    const list = document.getElementById('forum-topics-list');
    const items = Array.from(list.querySelectorAll('.forum-topic-item'));

    items.sort((a, b) => {
        if (order === 'popular') {
            const aLikes = parseInt(a.dataset.likes || '0');
            const bLikes = parseInt(b.dataset.likes || '0');
            return bLikes - aLikes;
        } else {
            // recent
            const aDate = new Date(a.dataset.date || 0);
            const bDate = new Date(b.dataset.date || 0);
            return bDate - aDate;
        }
    });

    items.forEach(item => list.appendChild(item));
}

// Toggle like sur un sujet
async function toggleLike(event, topicId) {
    event.stopPropagation();

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Connectez-vous pour aimer un sujet');
        return;
    }

    const btn = event.target.closest('.forum-like-btn');
    if (!btn) return;

    try {
        const response = await fetch('/api/forum/likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ topicId })
        });

        const data = await response.json();

        if (data.success) {
            // Mettre à jour l'UI
            const icon = btn.querySelector('.like-icon');
            const count = btn.querySelector('.like-count');

            icon.textContent = data.liked ? '♥' : '♡';
            btn.classList.toggle('liked', data.liked);
            count.textContent = data.likesCount;

            // Mettre à jour data-likes pour le tri
            const topicItem = btn.closest('.forum-topic-item');
            if (topicItem) {
                topicItem.dataset.likes = data.likesCount;
            }
        }
    } catch (error) {
        console.error('Erreur like:', error);
    }
}

// === TRADUCTION DE PRÉNOMS (PHONÉTIQUE) ===
const hieroAlphabet = {
    'A': '𓄿', // Vautour (Aleph)
    'B': '𓃀', // Jambe
    'C': '𓎡', // Corbeille (K) - ou S selon contexte
    'D': '𓂧', // Main
    'E': '𓇋', // Roseau (I/E)
    'F': '𓆑', // Vipère
    'G': '𓎼', // Support de jarre
    'H': '𓉔', // Maison (H)
    'I': '𓇋', // Roseau
    'J': '𓆓', // Cobra (Dj)
    'K': '𓎡', // Corbeille
    'L': '𓃭', // Lion (L - Ptolémaïque)
    'M': '𓅓', // Hibou
    'N': '𓈖', // Eau
    'O': '𓍯', // Caille (W/O)
    'P': '𓊪', // Natte/Tabouret
    'Q': '𓈎', // Pente
    'R': '𓂋', // Bouche
    'S': '𓋴', // Linge plié (S)
    'T': '𓏏', // Pain
    'U': '𓅱', // Caille (W/U)
    'V': '𓆑', // Vipère (F)
    'W': '𓅱', // Caille
    'X': '𓎡𓋴', // K+S
    'Y': '𓇌', // Double roseau
    'Z': '𓊃', // Verrou (Z)
    ' ': ' ',
    '-': '-'
};

function translateName() {
    const input = document.getElementById('prenom-input');
    const resultContainer = document.getElementById('cartouche-container');
    const cartoucheResult = document.getElementById('cartouche-result');
    const cartoucheText = document.getElementById('cartouche-text');

    if (!input || !resultContainer || !cartoucheResult) return;

    const name = input.value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (name.length === 0) {
        resultContainer.classList.add('hidden');
        return;
    }

    let hieroName = '';
    let i = 0;
    while (i < name.length) {
        let char = name[i];
        if (hieroAlphabet[char]) {
            // Petite variation pour les noms : on les met en colonne parfois ? 
            // Pour l'instant simple ligne.
            hieroName += `<span class="name-sign">${hieroAlphabet[char]}</span>`;
        }
        i++;
    }

    // Structure du cartouche : Début (Corde arrondie) - Contenu - Fin (Barre verticale)
    // On utilisera le CSS pour faire le contour
    cartoucheResult.innerHTML = hieroName;

    cartoucheText.textContent = input.value.trim();
    resultContainer.classList.remove('hidden');
}

// Event listener pour la touche Entrée sur l'input prénom
const prenomInput = document.getElementById('prenom-input');
if (prenomInput) {
    prenomInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            translateName();
        }
    });
}

// === GESTION DE LA PROPOSITION DE CONTRIBUTIONS ===
const proposalOverlay = document.getElementById('proposal-overlay');
let proposalKeyboardCloned = false;

function openProposalOverlay() {
    if (proposalOverlay) {
        proposalOverlay.classList.remove('hidden');
        proposalOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';

        // Clone keyboard if not already done
        if (!proposalKeyboardCloned) {
            setupProposalKeyboard();
            proposalKeyboardCloned = true;
        }
    }
}

function closeProposalOverlay() {
    if (proposalOverlay) {
        proposalOverlay.classList.remove('visible');
        proposalOverlay.classList.add('hidden');
        document.body.style.overflow = '';

        // Reset form
        document.getElementById('proposal-form').reset();
        document.getElementById('proposal-success').classList.add('hidden');
        document.getElementById('proposal-error').classList.add('hidden');
    }
}

function setupProposalKeyboard() {
    const container = document.getElementById('prop-keyboard-container');
    const input = document.getElementById('prop-hiero');

    if (!container || !input) return;

    // ALWAYS VISIBLE: We do not hide it anymore based on user feedback.
    container.classList.add('visible');

    // Clear container to avoid duplicates if rerun
    container.innerHTML = '';

    // Recreate keys logic for this specific input
    if (typeof transliterationKeys !== 'undefined') {
        transliterationKeys.forEach(key => {
            const button = document.createElement('button');
            button.textContent = key.value;
            button.className = 'hiero-key';
            button.type = 'button';

            button.onclick = (e) => {
                e.stopPropagation();
                if (key.code === 'enter') return;

                input.value += key.code;
                input.focus();
            };

            container.appendChild(button);
        });

        // ADD BACKSPACE BUTTON
        const backspaceBtn = document.createElement('button');
        backspaceBtn.innerHTML = '⌫';
        backspaceBtn.className = 'hiero-key backspace-key';
        backspaceBtn.type = 'button';
        backspaceBtn.title = 'Effacer';
        backspaceBtn.onclick = (e) => {
            e.stopPropagation();
            input.value = input.value.slice(0, -1);
            input.focus();
        };
        container.appendChild(backspaceBtn);
    }
}

// Side Panel Logic
let sidePanelLoaded = false;
let sidePanelSigns = [];
let filteredPanelSigns = [];

function toggleSignsPanel() {
    // UPDATED: Now targets the internal panel #proposal-left-panel
    const panel = document.getElementById('proposal-left-panel');
    if (!panel) return;

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        if (!sidePanelLoaded) {
            loadSidePanelSigns();
        }
    } else {
        panel.classList.add('hidden');
    }
}

function loadSidePanelSigns() {
    const grid = document.getElementById('side-panel-grid');
    grid.innerHTML = '<div class="panel-loading">Chargement des signes...</div>';

    // We can reuse the API call
    fetch('/api/admin/gardiner')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.signs) {
                // Reuse sort function if available, else just use raw
                // Assume sortGardinerSigns exists or just use data.signs
                sidePanelSigns = (typeof sortGardinerSigns === 'function') ? sortGardinerSigns(data.signs) : data.signs;
                filteredPanelSigns = sidePanelSigns;
                renderSidePanelSigns();
                sidePanelLoaded = true;
            }
        })
        .catch(err => {
            console.error(err);
            grid.innerHTML = '<div class="panel-loading error">Erreur de chargement</div>';
        });
}

function renderSidePanelSigns() {
    const grid = document.getElementById('side-panel-grid');
    grid.innerHTML = '';

    // Render ALL signs as requested. 
    // Browser can handle ~1000 simple div elements.
    const subset = filteredPanelSigns;

    if (subset.length === 0) {
        grid.innerHTML = '<div class="panel-loading">Aucun signe trouvé</div>';
        return;
    }

    // Optimization: Use DocumentFragment for faster insertion
    const fragment = document.createDocumentFragment();

    subset.forEach(sign => {
        const item = document.createElement('div');
        item.className = 'panel-sign-item';
        item.textContent = sign.sign; // The character
        item.title = `${sign.code} - ${sign.description}`;
        item.onclick = () => addSignToProposal(sign.sign);
        fragment.appendChild(item);
    });

    grid.appendChild(fragment);
}

function filterSidePanelSigns(query) {
    query = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const category = document.getElementById('side-panel-category-select').value;

    filteredPanelSigns = sidePanelSigns.filter(s => {
        const matchQuery = s.code.toLowerCase().includes(query) ||
            (s.description && s.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));
        const matchCat = category ? s.code.startsWith(category) : true;
        return matchQuery && matchCat;
    });
    renderSidePanelSigns();
}

function filterSidePanelCategory(cat) {
    const query = document.getElementById('side-panel-search-input').value; // Keep current search text
    filterSidePanelSigns(query);
}

function addSignToProposal(char) {
    const input = document.getElementById('prop-hiero');
    input.value += char;
    // Don't close panel, user might want to add more
}

async function submitProposal(event) {
    event.preventDefault();

    const hiero = document.getElementById('prop-hiero').value.trim();
    const translit = document.getElementById('prop-translit').value.trim();
    const french = document.getElementById('prop-french').value.trim();
    const notes = document.getElementById('prop-notes').value.trim();
    const errorMsg = document.getElementById('proposal-error');
    const successMsg = document.getElementById('proposal-success');

    // Basic validation
    if (!hiero && !translit && !french) {
        errorMsg.textContent = "Veuillez remplir au moins un champ principal.";
        errorMsg.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/proposals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hieroglyphs: hiero,
                transliteration: translit,
                french: french,
                notes: notes
            })
        });

        const data = await response.json();

        if (data.success) {
            successMsg.classList.remove('hidden');
            errorMsg.classList.add('hidden');
            document.getElementById('proposal-form').reset();

            // Close after 2 seconds
            setTimeout(() => {
                closeProposalOverlay();
            }, 2000);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = "Erreur lors de l'envoi. Veuillez réessayer.";
        errorMsg.classList.remove('hidden');
    }
}
