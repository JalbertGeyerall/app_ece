// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════
const DIES     = ['DILLUNS','DIMARTS','DIMECRES','DIJOUS','DIVENDRES','DISSABTE'];
const DIES_CAT = ['Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte'];
const DIES_ABR = ['DIL','DIM','DIX','DIJ','DIV','DIS']; // Abreviatures
const HORES    = ['8:00','9:00','10:00','11:30','12:30','13:30','15:00','16:00','17:00','18:30','19:30','20:30'];

// Llista de tots els cursos vàlids (incloent optatives)
const CURSOS_VALIDS = [
    // ESO
    '1ESOA', '1ESOB', '1ESOC',
    '2ESOA', '2ESOB', '2ESOC', '2ESOABC',
    '3ESOA', '3ESOB', '3ESOC', '3ESOABC',
    '4ESOA', '4ESOB', '4ESOC', '4ESOABC',
    // BATXILLERAT
    '1BATA', '1BATB',
    '2BATA', '2BATB'
];

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTF0rfPNnGvkEOcNAMxbloLrznYFDON-PbsKVkSkcbYFU-T4hvyXS-2MWbb9Yjw_AzNs1g3Rx_0F2Ny/pub?gid=1079228131&single=true&output=csv';
const SUPLENCIES_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1u8KL1jS-vEbAK_oaFzj5o0L506j3ObyIT41zZEQbKCKQbgl3eyrP8CnbXiiCrCiuMu2t4HhOWJ2U/pub?gid=1734135219&single=true&output=csv';
const CACHE_KEY = 'horaris_csv_cache';
const CACHE_TIMESTAMP_KEY = 'horaris_csv_timestamp';
const SUPLENCIES_CACHE_KEY = 'suplencies_cache';
const SUPLENCIES_TIMESTAMP_KEY = 'suplencies_timestamp';

const DIA_CLASS = {
    DILLUNS:   'day-dilluns',
    DIMARTS:   'day-dimarts',
    DIMECRES:  'day-dimecres',
    DIJOUS:    'day-dijous',
    DIVENDRES: 'day-divendres',
    DISSABTE:  'day-dissabte'
};

// Només excloure coses que no volen veure MAI (ni a horari professor ni a res)
// Array buit = mostrar tot
const EXCLOSOS_TOTALS = [];

let dades = [];
let csvCachedText = null;
let suplenciesCache = null; // Caché en memòria

// ═══════════════════════════════════════════════════════════════
// INICI
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDades();
    configurarNav();
    configurarVistes();
    omplirDatalistProfessors();
    preseleccionarDiaHoraActual();
    construirUIcursos();
    
    // Precarregar suplències en background (sense bloquejar la UI)
    precarregarSuplencies();
});

// ═══════════════════════════════════════════════════════════════
// NAVEGACIÓ
// ═══════════════════════════════════════════════════════════════
function configurarNav() {
    document.getElementById('btn-home').addEventListener('click', () => anarA('home'));
    
    // Menú logo
    const btnMenu = document.getElementById('btn-menu-logo');
    const menu = document.getElementById('menu-logo');
    btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });
    
    // Tancar menú en clicar fora
    document.addEventListener('click', () => {
        menu.classList.add('hidden');
    });
    
    // Opcions del menú
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            menu.classList.add('hidden');
            if (action === 'suplencies') mostrarSuplencies();
        });
    });
    
    document.querySelectorAll('.action-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => anarA(btn.dataset.view));
    });

    document.querySelectorAll('.action-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action === 'suplencies') mostrarSuplencies();
        });
    });
}

const TITOLS_VISTES = {
    home:       { titol: 'Eina Cap Estudis', sub: 'SMA 2025-26' },
    ara:        { titol: 'Qui fa classe ara?', sub: null },
    hora:       { titol: 'Qui fa classe / hora?', sub: null },
    professor:  { titol: 'Horari Professor', sub: null },
    curs:       { titol: 'Horari Curs', sub: null },
    guardies:   { titol: 'Horari Guàrdies', sub: null },
    suplencies: { titol: 'Suplències', sub: null },
};

function actualitzarTitolHeader(vista) {
    const info = TITOLS_VISTES[vista] || TITOLS_VISTES.home;
    document.getElementById('header-title').textContent = info.titol;
    const sub = document.getElementById('header-sub');
    if (info.sub) {
        sub.textContent = info.sub;
        sub.style.display = '';
    } else {
        sub.style.display = 'none';
    }
}

function anarA(vista) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${vista}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    actualitzarTitolHeader(vista);
    if (vista === 'ara') { omplirSelectorAra(); buscarAra(); }
    if (vista === 'guardies') mostrarGuardies();
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURAR VISTES
// ═══════════════════════════════════════════════════════════════
function configurarVistes() {
    // Vista ARA
    configurarInputAmbDesplegable('input-ara', buscarAra);

    // Vista HORA
    document.getElementById('btn-buscar-hora').addEventListener('click', buscarPerHora);
    document.getElementById('input-hora-prof').addEventListener('input', buscarPerHora);
    configurarInputAmbDesplegable('input-hora-prof', buscarPerHora);

    // Vista PROFESSOR - ara és un select
    document.getElementById('sel-professor').addEventListener('change', () => {
        const nom = document.getElementById('sel-professor').value;
        if (nom) cercarProfessor(nom);
    });

    // Vista CURS
    document.getElementById('sel-curs').addEventListener('change', () => {
        const curs = document.getElementById('sel-curs').value;
        if (curs) seleccionarCurs(curs);
    });
}

// Configurar input amb desplegable que no filtra quan cliques
function configurarInputAmbDesplegable(inputId, callback) {
    const input = document.getElementById(inputId);
    
    input.addEventListener('input', callback);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') callback();
    });
    
    // Buidar quan clica per veure tots els professors
    input.addEventListener('click', () => {
        if (input.value) {
            input.value = '';
            input.focus();
        }
    });
    
    // També quan fa focus des de teclat
    input.addEventListener('focus', (e) => {
        // Només seleccionar si ve de teclat (no de clic)
        if (e.relatedTarget) {
            input.select();
        }
    });
}

function omplirDatalistProfessors() {
    const noms = dades
        .map(p => p.nom)
        .filter(n => n && /^[A-ZÀ-ÿ]/.test(n)) // Només noms que comencin per lletra
        .sort();
    
    ['list-professors-ara', 'list-professors-hora'].forEach(id => {
        const dl = document.getElementById(id);
        if (!dl) return;
        dl.innerHTML = noms.map(n => `<option value="${n}">`).join('');
    });
    
    // Omplir també el selector de professors
    omplirSelectorProfessors();
}

function omplirSelectorProfessors() {
    const noms = dades
        .map(p => p.nom)
        .filter(n => n && /^[A-ZÀ-ÿ]/.test(n))
        .sort();
    
    const sel = document.getElementById('sel-professor');
    sel.innerHTML = '<option value="">Selecciona un professor...</option>';
    for (const nom of noms) {
        const opt = document.createElement('option');
        opt.value = nom;
        opt.textContent = nom;
        sel.appendChild(opt);
    }
}

// ═══════════════════════════════════════════════════════════════
// PRESELECCIONAR DIA I HORA
// ═══════════════════════════════════════════════════════════════
function preseleccionarDiaHoraActual() {
    const ara = new Date();
    const diaIndex = ara.getDay() - 1;
    if (diaIndex >= 0 && diaIndex <= 5) {
        document.getElementById('sel-dia').value = DIES[diaIndex];
    }
    const horaActual = trobarHoraActual(ara);
    if (horaActual) {
        document.getElementById('sel-hora').value = horaActual;
    }
}

// ═══════════════════════════════════════════════════════════════
// CÀRREGA I PARSEIG CSV
// ═══════════════════════════════════════════════════════════════
async function carregarDades() {
    try {
        // 1. Intentar descarregar del Google Sheet
        console.log('📡 Intentant connectar amb Google Sheets...');
        const res = await fetch(CSV_URL);
        if (res.ok) {
            const text = await res.text();
            csvCachedText = text;
            
            // Guardar en localStorage
            try {
                localStorage.setItem(CACHE_KEY, text);
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                console.log('✅ CSV descarregat i guardat en caché');
            } catch (e) {
                console.warn('⚠️ No s\'ha pogut guardar en caché:', e);
            }
            
            parsejarCSV(text);
            return;
        }
    } catch (e) {
        console.log('⚠️ No s\'ha pogut connectar a Google Sheets');
    }
    
    // 2. Intentar carregar des de localStorage
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const dies = timestamp ? Math.floor((Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24)) : '?';
            console.log(`📦 Carregant des de caché (última actualització: fa ${dies} dies)`);
            csvCachedText = cached;
            parsejarCSV(cached);
            return;
        }
    } catch (e) {
        console.warn('⚠️ Error llegint caché:', e);
    }
    
    // 3. Si tot falla, carregar fitxer local
    try {
        console.log('📁 Carregant CSV local...');
        const res = await fetch('horarios.csv');
        const text = await res.text();
        csvCachedText = text;
        parsejarCSV(text);
        console.log('✅ CSV local carregat');
    } catch (e) {
        console.error('❌ Error carregant dades:', e);
        alert('❌ No s\'han pogut carregar els horaris. Comprova la connexió.');
    }
}

function parsejarCSV(text) {
    const linies = text.split('\n').filter(l => l.trim());
    for (let i = 2; i < linies.length; i++) {
        const cols = splitCSV(linies[i]);
        if (cols.length < 2) continue;
        const nom = cols[0].trim();
        if (!nom) continue;
        const email = cols[cols.length - 1].trim();
        const horari = [];
        let idx = 1;
        for (const dia of DIES) {
            for (const hora of HORES) {
                const cel = cols[idx] ? cols[idx].trim() : '';
                if (cel && !esExclos(cel)) {
                    horari.push({
                        dia,
                        hora,
                        classe:  cel,
                        curs:    extraureCurs(cel),
                        materia: extreureMateriaRaw(cel)
                    });
                }
                idx++;
            }
        }
        if (horari.length > 0) dades.push({ nom, email, horari });
    }
}

function splitCSV(linia) {
    const res = [];
    let cometes = false, val = '';
    for (const c of linia) {
        if (c === '"') { cometes = !cometes; }
        else if (c === ',' && !cometes) { res.push(val); val = ''; }
        else { val += c; }
    }
    res.push(val);
    return res;
}

function esExclos(t) {
    // Si no hi ha exclusions, no excloure res
    if (EXCLOSOS_TOTALS.length === 0) return false;
    
    // Si comença amb un curs vàlid, NO excloure (és una classe real)
    const comencaAmbCurs = CURSOS_VALIDS.some(curs => t.startsWith(curs));
    if (comencaAmbCurs) return false;
    
    // Si no té curs, només excloure si està a la llista d'exclosos
    return EXCLOSOS_TOTALS.some(x => t.includes(x));
}

function extraureCurs(c) {
    const m = c.match(/^(\d)(ESO|BAT[AB]?|CICLE)([ABCD]{2,})/i);
    if (m) {
        return `${m[1]}${m[2].toUpperCase()} ${m[3]}`.trim();
    }
    const m2 = c.match(/^(\d)(ESO|BAT[AB]?|CICLE)([ABCD]?)/i);
    return m2 ? `${m2[1]}${m2[2].toUpperCase()} ${m2[3]}`.trim() : '';
}

function esOptativa(curs) {
    const m = curs.match(/\s([ABCD]{2,})$/);
    return !!m;
}

function extreureMateriaRaw(c) {
    const m = c.match(/^\d(?:ESO|BAT[AB]?|CICLE)[ABCD]+\s+(.+)/i);
    return m ? m[1].trim() : c;
}

// ═══════════════════════════════════════════════════════════════
// VISTA: QUI FA CLASSE ARA?
// ═══════════════════════════════════════════════════════════════
function omplirSelectorAra() {
    const sel = document.getElementById('input-ara');
    if (!sel || sel.options.length > 1) return; // ja omplert
    const noms = dades
        .map(p => p.nom)
        .filter(nom => nom && nom.trim().length > 1 && /[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöùúûüýÀ-Ö]/.test(nom))
        .sort((a, b) => a.localeCompare(b));
    noms.forEach(nom => {
        const opt = document.createElement('option');
        opt.value = nom;
        opt.textContent = nom;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', buscarAra);
}

function buscarAra() {
    const filtre = document.getElementById('input-ara').value.trim();
    const ara    = new Date();
    const dIdx   = ara.getDay() - 1;

    if (dIdx < 0 || dIdx > 5) {
        renderEmpty('results-ara', 'ph-moon', "Avui no hi ha classes (diumenge o fora del calendari)");
        return;
    }

    const diaActual  = DIES[dIdx];
    const horaActual = trobarHoraActual(ara);

    if (!horaActual) {
        renderEmpty('results-ara', 'ph-coffee', "Ara mateix no hi ha cap classe en curs");
        return;
    }

    let professors = dades.filter(p =>
        p.horari.some(h => h.dia === diaActual && h.hora === horaActual)
    );

    if (filtre) professors = professors.filter(p => p.nom === filtre);

    if (professors.length === 0) {
        renderEmpty('results-ara', 'ph-magnifying-glass',
            filtre ? `${filtre} no fa classe ara` : 'Cap professor fa classe ara');
        return;
    }

    const resultats = professors.map(p => ({
        professor: p,
        classes: [p.horari.find(h => h.dia === diaActual && h.hora === horaActual)]
    }));

    const badge = `<div class="time-badge"><i class="ph ph-clock"></i>${DIES_ABR[dIdx]} · ${horaActual}h · ${professors.length} professor${professors.length !== 1 ? 's' : ''}</div>`;
    document.getElementById('results-ara').innerHTML = badge + resultats.map(r => crearCard(r.professor, r.classes)).join('');
}

function trobarHoraActual(ara) {
    const min = ara.getHours() * 60 + ara.getMinutes();
    return HORES.find(h => {
        const [hh, mm] = h.split(':').map(Number);
        const ini = hh * 60 + mm;
        return min >= ini && min < ini + 60;
    }) || null;
}

// ═══════════════════════════════════════════════════════════════
// VISTA: QUI FA CLASSE / HORA?
// ═══════════════════════════════════════════════════════════════
function buscarPerHora() {
    const dia    = document.getElementById('sel-dia').value;
    const hora   = document.getElementById('sel-hora').value;
    const filtre = document.getElementById('input-hora-prof').value.toLowerCase().trim();

    let professors = dades.filter(p =>
        p.horari.some(h => h.dia === dia && h.hora === hora)
    );

    if (filtre) professors = professors.filter(p => p.nom.toLowerCase().includes(filtre));

    if (professors.length === 0) {
        renderEmpty('results-hora', 'ph-calendar-x',
            filtre
                ? `Cap professor coincideix amb "${filtre}" el ${DIES_CAT[DIES.indexOf(dia)]} a les ${hora}h`
                : `Cap professor fa classe el ${DIES_CAT[DIES.indexOf(dia)]} a les ${hora}h`);
        return;
    }

    const resultats = professors.map(p => ({
        professor: p,
        classes: [p.horari.find(h => h.dia === dia && h.hora === hora)]
    }));

    const badge = `<div class="time-badge"><i class="ph ph-calendar-blank"></i>${DIES_ABR[DIES.indexOf(dia)]} · ${hora}h · ${professors.length} professor${professors.length !== 1 ? 's' : ''}</div>`;
    document.getElementById('results-hora').innerHTML = badge + resultats.map(r => crearCard(r.professor, r.classes)).join('');
}

// ═══════════════════════════════════════════════════════════════
// VISTA: HORARI PROFESSOR
// ═══════════════════════════════════════════════════════════════
function cercarProfessor(nom) {
    const professor = dades.find(p => p.nom === nom);
    
    if (!professor) {
        renderEmpty('results-professor', 'ph-user-x', `No s'ha trobat el professor "${nom}"`);
        return;
    }

    document.getElementById('results-professor').innerHTML = crearCard(professor, professor.horari);
}

// ═══════════════════════════════════════════════════════════════
// VISTA: HORARI CURS
// ═══════════════════════════════════════════════════════════════
function construirUIcursos() {
    const cursosSet = new Set();
    for (const p of dades) {
        for (const h of p.horari) {
            // NO afegir cursos optatius (amb 2+ lletres) al selector
            if (h.curs && !esOptativa(h.curs)) {
                cursosSet.add(h.curs);
            }
        }
    }

    const cursos = [...cursosSet].sort((a, b) => {
        const numA = parseInt(a), numB = parseInt(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    const sel = document.getElementById('sel-curs');
    sel.innerHTML = '<option value="">Selecciona un curs...</option>';
    for (const c of cursos) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    }
}

function seleccionarCurs(curs) {
    const ordre = {};
    DIES.forEach((d, i) => ordre[d] = i);

    // Recollir totes les entrades del curs (incloent optatives)
    const entrades = [];
    for (const p of dades) {
        for (const h of p.horari) {
            // Agafar tant el curs exacte com les optatives d'aquest curs
            const cursBase = h.curs.replace(/\s[ABCD]{2,}$/, ''); // 4ESO ABC → 4ESO
            const cursSeleccionatBase = curs.replace(/\s[ABCD]$/, ''); // 4ESO A → 4ESO
            
            if (h.curs === curs || (esOptativa(h.curs) && cursBase === cursSeleccionatBase)) {
                entrades.push({ ...h, professor: p.nom, email: p.email });
            }
        }
    }

    if (entrades.length === 0) {
        renderEmpty('results-curs', 'ph-graduation-cap', `No s'han trobat classes per al curs "${curs}"`);
        return;
    }

    entrades.sort((a, b) => {
        const dDiff = (ordre[a.dia] ?? 9) - (ordre[b.dia] ?? 9);
        if (dDiff !== 0) return dDiff;
        const [ah, am] = a.hora.split(':').map(Number);
        const [bh, bm] = b.hora.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
    });

    // Agrupar per dia+hora
    const grups = {};
    for (const e of entrades) {
        const clau = `${e.dia}-${e.hora}`;
        if (!grups[clau]) grups[clau] = [];
        grups[clau].push(e);
    }

    let files = '';
    let idCounter = 0;
    
    for (const clau in grups) {
        const grup = grups[clau];
        
        // Separar optatives de no-optatives
        const optatives = grup.filter(e => esOptativa(e.curs));
        const normals = grup.filter(e => !esOptativa(e.curs));
        
        // Processar normals primer
        for (const e of normals) {
            const dIdx = DIES.indexOf(e.dia);
            const diaCat = DIES_ABR[dIdx] || e.dia; // Usar abreviatura
            const cls = DIA_CLASS[e.dia] || '';
            const emailBtn = e.email
                ? `<a class="btn-mail-sm" href="mailto:${e.email}" title="Enviar correu a ${e.professor}"><i class="ph ph-envelope-simple"></i></a>`
                : '';
            files += `
                <tr class="${cls}">
                    <td>${diaCat}</td>
                    <td>${e.hora}</td>
                    <td>${e.materia}</td>
                    <td class="td-prof">${e.professor}</td>
                    <td class="td-email">${emailBtn}</td>
                </tr>`;
        }
        
        // Si hi ha optatives, crear fila expandible
        if (optatives.length > 0) {
            const e = optatives[0];
            const dIdx = DIES.indexOf(e.dia);
            const diaCat = DIES_ABR[dIdx] || e.dia; // Usar abreviatura
            const cls = DIA_CLASS[e.dia] || '';
            const rowId = `opt-${idCounter++}`;
            
            files += `
                <tr class="${cls} optativa-row" data-target="${rowId}">
                    <td>${diaCat}</td>
                    <td>${e.hora}</td>
                    <td>OPTATIVA (${optatives.length})</td>
                    <td class="td-prof" style="text-align:right"><span class="optativa-toggle"></span></td>
                    <td class="td-email"></td>
                </tr>`;
            
            // Files de detall
            for (const entry of optatives) {
                const emailBtn = entry.email
                    ? `<a class="btn-mail-sm" href="mailto:${entry.email}" title="Enviar correu a ${entry.professor}"><i class="ph ph-envelope-simple"></i></a>`
                    : '';
                files += `
                    <tr class="${cls} optativa-detall" data-group="${rowId}">
                        <td colspan="2"></td>
                        <td>${entry.materia}</td>
                        <td class="td-prof">${entry.professor}</td>
                        <td class="td-email">${emailBtn}</td>
                    </tr>`;
            }
        }
    }

    document.getElementById('results-curs').innerHTML = `
        <div class="result-card">
            <div class="card-head">
                <div class="card-head-info">
                    <h3>${curs}</h3>
                    <span class="email-text">${entrades.length} sessions</span>
                </div>
            </div>
            <div class="card-body">
                <table class="schedule-table">
                    <colgroup>
                        <col class="col-dia">
                        <col class="col-hora">
                        <col style="width:auto">
                        <col class="col-prof">
                        <col class="col-email">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Dia</th>
                            <th>Hora</th>
                            <th>Matèria</th>
                            <th>Professor/a</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${files}</tbody>
                </table>
            </div>
        </div>`;
    
    document.querySelectorAll('.optativa-row').forEach(row => {
        row.addEventListener('click', () => {
            const target = row.dataset.target;
            const detalls = document.querySelectorAll(`[data-group="${target}"]`);
            row.classList.toggle('expanded');
            detalls.forEach(d => d.classList.toggle('visible'));
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// RENDERITZACIÓ: CARD PROFESSOR
// ═══════════════════════════════════════════════════════════════
function crearCard(professor, classes) {
    const btnMail = professor.email
        ? `<a class="btn-mail" href="mailto:${professor.email}" title="Enviar correu a ${professor.nom}"><i class="ph ph-envelope-simple"></i></a>`
        : '';

    let files = '';
    for (const c of classes) {
        const dIdx   = DIES.indexOf(c.dia);
        const diaCat = DIES_ABR[dIdx] || c.dia; // Usar abreviatura
        const cls    = DIA_CLASS[c.dia] || '';
        const cursText    = c.curs || '—';
        const materiaText = c.curs ? c.materia : c.classe;
        files += `
            <tr class="${cls}">
                <td>${diaCat}</td>
                <td>${c.hora}</td>
                <td>${cursText}</td>
                <td>${materiaText}</td>
            </tr>`;
    }

    return `
        <div class="result-card">
            <div class="card-head">
                <div class="card-head-info">
                    <h3>${professor.nom}</h3>
                    ${professor.email ? `<span class="email-text">${professor.email}</span>` : ''}
                </div>
                ${btnMail}
            </div>
            <div class="card-body">
                <table class="schedule-table">
                    <colgroup>
                        <col class="col-dia">
                        <col class="col-hora">
                        <col class="col-curs">
                        <col class="col-classe">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Dia</th>
                            <th>Hora</th>
                            <th>Curs</th>
                            <th>Matèria</th>
                        </tr>
                    </thead>
                    <tbody>${files}</tbody>
                </table>
            </div>
        </div>`;
}

function renderEmpty(containerId, icon, text) {
    document.getElementById(containerId).innerHTML = `
        <div class="empty-state">
            <i class="ph ph-${icon}"></i>
            <p>${text}</p>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════
// GUÀRDIES
// ═══════════════════════════════════════════════════════════════
// Retorna un Map de "nom-hora" → {profAbsent, curs, materia} per una data concreta
// dataStr pot ser yyyy-mm-dd o dd/mm/yyyy o null (data d'avui)
function obtenirOcupatsPerData(dataStr) {
    const ocupats = new Map();
    if (!suplenciesCache) return ocupats;

    let dataCerca = dataStr;
    if (!dataCerca) {
        // Avui
        const ara = new Date();
        const d = ara.getDate().toString().padStart(2,'0');
        const m = (ara.getMonth()+1).toString().padStart(2,'0');
        const y = ara.getFullYear();
        dataCerca = `${d}/${m}/${y}`;
    } else if (dataCerca.includes('-')) {
        const [y, mo, d] = dataCerca.split('-');
        dataCerca = `${d}/${mo}/${y}`;
    }

    const linies = suplenciesCache.split('\n');
    let dataActual = null;
    let profAbsent = null;
    let i = 0;
    while (i < linies.length) {
        const linia = linies[i].trim();
        if (!linia) { i++; continue; }
        const cols = splitCSV(linia);
        if (cols[0] && cols[0].includes('SUBSTITUCIÓ DE:')) {
            profAbsent = cols[2] ? cols[2].trim() : '';
            i++;
            if (i < linies.length) {
                const nextCols = splitCSV(linies[i]);
                if (nextCols[4]) {
                    const dataRaw = nextCols[4].trim();
                    const dataMatch = dataRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    dataActual = dataMatch ? `${dataMatch[1]}/${dataMatch[2]}/${dataMatch[3]}` : dataRaw;
                }
            }
            i += 2; // saltar capçaleres
            while (i < linies.length) {
                const hl = linies[i].trim();
                if (!hl) { i++; break; }
                const hc = splitCSV(hl);
                if (hc[0] && hc[0].includes('SUBSTITUCIÓ DE:')) break;
                if (dataActual === dataCerca && hc[0] && hc[0].match(/^\d{1,2}:\d{2}$/) && hc[3]) {
                    const clau = `${hc[3].trim()}-${hc[0].trim()}`;
                    ocupats.set(clau, {
                        profAbsent: profAbsent,
                        curs: hc[1] ? hc[1].trim() : '',
                        materia: hc[2] ? hc[2].trim() : ''
                    });
                }
                i++;
            }
            continue;
        }
        i++;
    }
    return ocupats;
}

function tipusGuardia(materia) {
    const m = (materia || '').toLowerCase().trim();
    const esGuardia    = m.includes('guardia') || m.includes('guàrdia');
    const esPermanencia = m.includes('permanencia') || m.includes('permanència');
    if (esGuardia) return 'G';
    if (esPermanencia) {
        // Si a part de "permanencia" hi ha més text, afegir *
        const netejat = m.replace(/permanènc[ia]+/i, '').replace(/permanenci[a]+/i, '').trim();
        return netejat.length > 0 ? 'P*' : 'P';
    }
    return '?';
}

function renderTaulaGuardies(entrades, ocupats = new Map()) {
    if (entrades.length === 0) return '<p class="guardies-buit">Cap guàrdia o permanència en aquest moment</p>';

    const ordre = {};
    DIES.forEach((d, i) => ordre[d] = i);

    entrades.sort((a, b) => {
        const dDiff = (ordre[a.dia] ?? 9) - (ordre[b.dia] ?? 9);
        if (dDiff !== 0) return dDiff;
        const [ah, am] = a.hora.split(':').map(Number);
        const [bh, bm] = b.hora.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
    });

    const grups = {};
    for (const e of entrades) {
        const clau = `${e.dia}-${e.hora}`;
        if (!grups[clau]) grups[clau] = { dia: e.dia, hora: e.hora, professors: [] };
        grups[clau].professors.push(e);
    }

    let files = '';
    for (const clau in grups) {
        const { dia, hora, professors } = grups[clau];
        const dIdx = DIES.indexOf(dia);
        const diaCat = DIES_ABR[dIdx] || dia;
        const cls = DIA_CLASS[dia] || '';

        professors.forEach((e, i) => {
            const emailBtn = e.email
                ? `<a class="btn-mail-sm" href="mailto:${e.email}" title="Enviar correu a ${e.professor}"><i class="ph ph-envelope-simple"></i></a>`
                : '';
            const tipus = tipusGuardia(e.materia || e.classe);
            const clauOcupat = `${e.professor}-${e.hora}`;
            const infSup = ocupats.get(clauOcupat);
            const ocupat = !!infSup;
            const ratllat = ocupat ? ' class="guardia-ocupada"' : '';
            const dataOcupat = ocupat
                ? `data-prof-absent="${(infSup.profAbsent||'').replace(/"/g,'&quot;')}" data-curs="${(infSup.curs||'').replace(/"/g,'&quot;')}" data-materia="${(infSup.materia||'').replace(/"/g,'&quot;')}"`
                : '';
            const ocupatBadge = ocupat
                ? ` <button class="guardia-ocupat-badge" ${dataOcupat} title="Veure detall suplència">ocupat</button>`
                : '';
            files += `
                <tr class="${cls}">
                    <td>${i === 0 ? diaCat : ''}</td>
                    <td>${i === 0 ? hora : ''}</td>
                    <td class="td-prof"${ratllat}>${e.professor}${ocupatBadge}</td>
                    <td class="col-tipus"${ratllat}>${tipus}</td>
                    <td class="td-email">${emailBtn}</td>
                </tr>`;
        });
    }

    return `
        <table class="schedule-table">
            <colgroup>
                <col class="col-dia">
                <col class="col-hora">
                <col class="col-prof">
                <col style="width:30px;text-align:center">
                <col class="col-email">
            </colgroup>
            <thead>
                <tr>
                    <th>Dia</th>
                    <th>Hora</th>
                    <th>Professor/a</th>
                    <th title="G=Guàrdia P=Permanència P*=Permanència especial">T</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${files}</tbody>
        </table>`;
}

function mostrarGuardies() {
    const PARAULES_GUARDIA = ['guardia', 'guàrdia', 'permanencia', 'permanència'];

    // Recollir totes les entrades
    const totes = [];
    for (const p of dades) {
        for (const h of p.horari) {
            const materiaLow = (h.materia || h.classe || '').toLowerCase();
            if (PARAULES_GUARDIA.some(w => materiaLow.includes(w))) {
                totes.push({ ...h, professor: p.nom, email: p.email });
            }
        }
    }

    if (totes.length === 0) {
        renderEmpty('results-guardies', 'ph-shield-check', 'No s\'han trobat guàrdies ni permanències');
        return;
    }

    // Calcular "ara" i "hora següent"
    const ara = new Date();
    const dIdx = ara.getDay() - 1;
    const diaAra = (dIdx >= 0 && dIdx <= 5) ? DIES[dIdx] : null;
    const horaAra = trobarHoraActual(ara);

    // Hora següent: la primera hora de HORES que és posterior a horaAra
    let horaSeguent = null;
    if (horaAra) {
        const idxHora = HORES.indexOf(horaAra);
        if (idxHora >= 0 && idxHora < HORES.length - 1) horaSeguent = HORES[idxHora + 1];
    }

    const ocupatsAvui = obtenirOcupatsPerData(null); // null = avui

    const entradesAra = diaAra && horaAra
        ? totes.filter(e => e.dia === diaAra && e.hora === horaAra)
        : [];

    const entradesSeguent = diaAra && horaSeguent
        ? totes.filter(e => e.dia === diaAra && e.hora === horaSeguent)
        : [];

    // Construir selectors de dia i hora únics
    const diesDisponibles = [...new Set(totes.map(e => e.dia))].sort((a, b) => {
        const ordre = {}; DIES.forEach((d, i) => ordre[d] = i);
        return (ordre[a] ?? 9) - (ordre[b] ?? 9);
    });
    const horesDisponibles = [...new Set(totes.map(e => e.hora))].sort((a, b) => {
        const [ah, am] = a.split(':').map(Number);
        const [bh, bm] = b.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
    });

    const optionsDia = diesDisponibles.map(d => {
        const dI = DIES.indexOf(d);
        return `<option value="${d}">${DIES_CAT[dI] || d}</option>`;
    }).join('');
    const optionsHora = horesDisponibles.map(h => `<option value="${h}">${h}</option>`).join('');

    // Secció "Ara" + "Hora següent"
    const secAra = `
        <div class="result-card guardies-ara-card">
            <div class="card-head">
                <div class="card-head-info">
                    <h3><i class="ph ph-clock"></i> Ara${diaAra && horaAra ? ` · ${DIES_ABR[dIdx]} ${horaAra}h` : ''}</h3>
                </div>
            </div>
            <div class="card-body" id="guardies-ara-body">
                ${renderTaulaGuardies(entradesAra, ocupatsAvui)}
            </div>
        </div>
        ${horaSeguent ? `
        <div class="result-card guardies-ara-card guardies-seguent-card">
            <div class="card-head">
                <div class="card-head-info">
                    <h3><i class="ph ph-clock-countdown"></i> Hora següent · ${DIES_ABR[dIdx]} ${horaSeguent}h</h3>
                </div>
            </div>
            <div class="card-body">
                ${renderTaulaGuardies(entradesSeguent, ocupatsAvui)}
            </div>
        </div>` : ''}`;

    // Secció filtre dia+hora
    const secFiltre = `
        <div class="result-card">
            <div class="card-head">
                <div class="card-head-info">
                    <h3><i class="ph ph-funnel"></i> Filtrar per dia i hora</h3>
                </div>
            </div>
            <div class="card-body">
                <div class="guardies-selectors-row">
                    <div class="field-group">
                        <label for="guardies-sel-data">Data</label>
                        <input type="date" id="guardies-sel-data" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--r-md);font-family:'DM Sans',sans-serif;font-size:14px;">
                    </div>
                    <div class="field-group">
                        <label for="guardies-sel-hora">Hora</label>
                        <select id="guardies-sel-hora">
                            <option value="">Totes</option>
                            ${optionsHora}
                        </select>
                    </div>
                </div>
                <div id="guardies-filtre-body">
                    ${renderTaulaGuardies(totes)}
                </div>
            </div>
        </div>`;

    document.getElementById('results-guardies').innerHTML = secAra + secFiltre;

    // Listeners selectors
    const selData = document.getElementById('guardies-sel-data');
    const selHora = document.getElementById('guardies-sel-hora');
    const araCard = document.getElementById('guardies-ara-body').closest('.guardies-ara-card');

    function actualitzarFiltre() {
        const dataVal = selData.value; // yyyy-mm-dd o buit
        const hora    = selHora.value;

        // Calcular dia de la setmana a partir de la data triada
        let diaSetmana = '';
        if (dataVal) {
            const [y, m, d] = dataVal.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const idx = date.getDay() - 1; // 0=dilluns
            diaSetmana = (idx >= 0 && idx <= 5) ? DIES[idx] : '';
        }

        const filtrades = totes.filter(e =>
            (!diaSetmana || e.dia === diaSetmana) &&
            (!hora       || e.hora === hora)
        );

        const ocupats = obtenirOcupatsPerData(dataVal);
        document.getElementById('guardies-filtre-body').innerHTML = renderTaulaGuardies(filtrades, ocupats);

        // Ocultar secció Ara si hi ha algun filtre actiu
        if (araCard) araCard.style.display = (dataVal || hora) ? 'none' : '';

        // Listeners badges ocupat del filtre
        afegirListenersBadges(document.getElementById('guardies-filtre-body'));
    }

    selData.addEventListener('change', actualitzarFiltre);
    selHora.addEventListener('change', actualitzarFiltre);

    // Listeners badges ocupat de la secció Ara i Següent
    afegirListenersBadges(document.getElementById('results-guardies'));
}

function afegirListenersBadges(container) {
    if (!container) return;
    container.querySelectorAll('.guardia-ocupat-badge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const profAbsent = btn.getAttribute('data-prof-absent') || '—';
            const curs       = btn.getAttribute('data-curs') || '—';
            const materia    = btn.getAttribute('data-materia') || '—';

            // Eliminar popup anterior si existeix
            document.querySelectorAll('.guardia-popup').forEach(p => p.remove());

            const popup = document.createElement('div');
            popup.className = 'guardia-popup';
            popup.innerHTML = `
                <div class="guardia-popup-inner">
                    <button class="guardia-popup-close">✕</button>
                    <p><strong>Professor absent:</strong> ${profAbsent}</p>
                    <p><strong>Curs:</strong> ${curs}</p>
                    <p><strong>Matèria:</strong> ${materia}</p>
                </div>`;
            popup.querySelector('.guardia-popup-close').addEventListener('click', () => popup.remove());
            popup.addEventListener('click', (ev) => { if (ev.target === popup) popup.remove(); });
            document.body.appendChild(popup);
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// SUPLÈNCIES
// ═══════════════════════════════════════════════════════════════
async function precarregarSuplencies() {
    // Descarrega SEMPRE en background (no bloqueja res)
    try {
        console.log('📥 Descarregant suplències en background...');
        const res = await fetch(SUPLENCIES_URL);
        if (res.ok) {
            const text = await res.text();
            if (text.length > 100) {
                suplenciesCache = text;
                console.log('✅ Suplències descarregades i a punt');
            }
        }
    } catch (e) {
        console.log('⚠️ Error descarregant suplències:', e.message);
    }
}

async function mostrarSuplencies() {
    anarA('suplencies');
    const container = document.getElementById('suplencies-container');
    
    // Si ja tenim caché en memòria (descarregat en background), mostrar immediatament
    if (suplenciesCache) {
        console.log('⚡ Mostrant suplències (ja descarregades)');
        container.innerHTML = '<div class="loading">Carregant suplències...</div>';
        parsejarSuplencies(suplenciesCache, container);
        return;
    }
    
    // Si encara no s'han descarregat, esperar
    container.innerHTML = '<div class="loading">Descarregant suplències...</div>';
    
    try {
        console.log('📥 Descarregant suplències ara...');
        const res = await fetch(SUPLENCIES_URL);
        if (!res.ok) throw new Error('Error HTTP: ' + res.status);
        
        const text = await res.text();
        
        if (text.length < 100) {
            throw new Error('CSV massa curt o buit');
        }
        
        suplenciesCache = text;
        parsejarSuplencies(text, container);
        
    } catch (e) {
        console.error('❌ Error carregant suplències:', e);
        container.innerHTML = '<div class="empty-state"><i class="ph ph-warning"></i><p>No s\'han pogut carregar les suplències: ' + e.message + '</p></div>';
    }
}

function parsejarSuplencies(csvText, container) {
    console.log('🔍 Parsejant CSV...');
    const linies = csvText.split('\n');
    console.log('📊 Total línies:', linies.length);
    
    const suplencies = [];
    let professorActual = null;
    let diaActual = null;
    let dataActual = null;
    let i = 0;
    
    while (i < linies.length) {
        const linia = linies[i].trim();
        if (!linia) { i++; continue; }
        
        const cols = splitCSV(linia);
        
        // Detectar nova suplència: "SUBSTITUCIÓ DE:" a col[0], nom a col[2], "DATA: XXX" a col[4]
        if (cols[0] && cols[0].includes('SUBSTITUCIÓ DE:')) {
            // Professor està a la columna 2 (després de les dues comes)
            if (cols[2]) {
                professorActual = cols[2].trim();
            }
            
            // Dia està a col[4] després de "DATA:"
            if (cols[4] && cols[4].includes('DATA:')) {
                const diaMatch = cols[4].match(/DATA:\s*(\w+)/i);
                if (diaMatch) {
                    diaActual = diaMatch[1].trim().toUpperCase();
                }
            }
            
            console.log('👤 Professor:', professorActual, '| 📅 Dia:', diaActual);
            
            // Següent línia: data a col[4]
            i++;
            if (i < linies.length) {
                const nextCols = splitCSV(linies[i]);
                if (nextCols[4]) {
                    const dataRaw = nextCols[4].trim();
                    // Intentar extreure dd/mm/yyyy del format que sigui
                    const dataMatch = dataRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (dataMatch) {
                        dataActual = `${dataMatch[1]}/${dataMatch[2]}/${dataMatch[3]}`;
                    } else {
                        // Si no té barres, provar amb altres formats
                        dataActual = dataRaw;
                    }
                    console.log('📅 Data:', dataActual);
                }
            }
            
            // Següent línia: capçaleres (saltar)
            i++;
            
            // Crear objecte suplència
            if (professorActual && diaActual && dataActual) {
                const sup = {
                    professor: professorActual,
                    dia: diaActual,
                    data: dataActual,
                    classes: []
                };
                
                // Llegir files d'horari fins trobar línia buida o nova suplència
                i++;
                while (i < linies.length) {
                    const horariLinia = linies[i].trim();
                    if (!horariLinia) { i++; break; }
                    
                    const horariCols = splitCSV(horariLinia);
                    
                    // Si trobem nova suplència, aturar
                    if (horariCols[0] && horariCols[0].includes('SUBSTITUCIÓ DE:')) {
                        break;
                    }
                    
                    // Si té hora (format XX:XX) i alguna dada més
                    if (horariCols[0] && horariCols[0].match(/^\d{1,2}:\d{2}$/)) {
                        // Només afegir si té algun contingut (curs, matèria o professor)
                        if (horariCols[1] || horariCols[2] || horariCols[3]) {
                            sup.classes.push({
                                hora: horariCols[0].trim(),
                                curs: horariCols[1] ? horariCols[1].trim() : '',
                                materia: horariCols[2] ? horariCols[2].trim() : '',
                                professor: horariCols[3] ? horariCols[3].trim() : '',
                                indicacions: horariCols[4] ? horariCols[4].trim() : ''
                            });
                        }
                    }
                    
                    i++;
                }
                
                if (sup.classes.length > 0) {
                    suplencies.push(sup);
                    console.log('➕ Suplència afegida:', sup.professor, '-', sup.classes.length, 'classes');
                }
            }
            
            continue;
        }
        
        i++;
    }
    
    console.log('✅ Total suplències trobades:', suplencies.length);
    console.log('📋 Suplències:', suplencies);
    
    renderitzarSuplencies(suplencies, container);
}

function renderitzarSuplencies(suplencies, container) {
    if (suplencies.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="ph ph-calendar-x"></i><p>No hi ha suplències disponibles</p></div>';
        return;
    }
    
    // Agrupar per data (dd/mm)
    const perData = {};
    for (const sup of suplencies) {
        const clau = sup.data; // ja ve en format dd/mm/yyyy
        if (!perData[clau]) perData[clau] = [];
        perData[clau].push(sup);
    }
    
    // Ordenar dates
    const datesOrdenades = Object.keys(perData).sort((a, b) => {
        const [dA, mA] = a.split('/').map(Number);
        const [dB, mB] = b.split('/').map(Number);
        if (mA !== mB) return mA - mB;
        return dA - dB;
    });
    
    let html = '';
    for (const data of datesOrdenades) {
        const sups = perData[data];
        // Format: dia dd/mm (sense any ni hora)
        const [dia, mes] = data.split('/');
        const dataFormatada = `${dia}/${mes}`;
        const diaSetmana = sups[0].dia; // Ja ve net (DIMARTS, DIMECRES...)
        
        html += `
            <div class="sup-dia-group">
                <div class="sup-dia-header">
                    <h3>${diaSetmana} ${dataFormatada} <span style="opacity:0.6;font-weight:400;font-size:13px">(${sups.length})</span></h3>
                    <span class="sup-dia-toggle">▼</span>
                </div>
                <div class="sup-dia-body">`;
        
        for (const sup of sups) {
            html += `<button class="sup-btn" data-sup='${JSON.stringify(sup).replace(/'/g, "&#39;")}'>${sup.professor}</button>`;
        }
        
        html += `
                </div>
            </div>`;
    }
    
    // Modal per mostrar detall
    html += `
        <div id="sup-modal" class="sup-modal">
            <div class="sup-modal-content">
                <div class="sup-modal-header">
                    <div class="sup-modal-title-group">
                        <h3 id="sup-modal-title"></h3>
                        <a id="sup-modal-mail" class="btn-mail-sup-title" style="display:none" title="Enviar correu"><i class="ph ph-envelope-simple"></i></a>
                    </div>
                    <button class="sup-modal-close">✕</button>
                </div>
                <div class="sup-modal-body" id="sup-modal-body"></div>
            </div>
        </div>`;
    
    container.innerHTML = html;
    
    // Listeners per col·lapsar dies
    document.querySelectorAll('.sup-dia-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('collapsed');
        });
    });
    
    // Listeners per botons de suplència
    document.querySelectorAll('.sup-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const supJson = btn.getAttribute('data-sup');
            const sup = JSON.parse(supJson);
            mostrarDetallSuplencia(sup);
        });
    });
    
    // Tancar modal
    const modal = document.getElementById('sup-modal');
    const closeBtn = document.querySelector('.sup-modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', tancarModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'sup-modal') tancarModal();
        });
    }
}

function trobarEmailProfessor(nom) {
    if (!nom) return null;
    const nomNet = nom.trim().toLowerCase();
    const prof = dades.find(p => p.nom.trim().toLowerCase() === nomNet);
    return prof ? prof.email : null;
}

function mostrarDetallSuplencia(sup) {
    // La data ja ve neta com dd/mm/yyyy
    const [dia, mes] = sup.data.split('/');
    const diaFormat = `${dia}/${mes}`;
    // El dia ja ve net (DIMARTS, DIMECRES...)
    const diaSetmana = sup.dia;
    document.getElementById('sup-modal-title').textContent = `${sup.professor} - ${diaSetmana} ${diaFormat}`;

    // Icona mail al títol
    const mailLink = document.getElementById('sup-modal-mail');
    const emailTitol = trobarEmailProfessor(sup.professor);
    if (emailTitol) {
        mailLink.href = `mailto:${emailTitol}`;
        mailLink.title = `Enviar correu a ${sup.professor}`;
        mailLink.style.display = 'inline-flex';
    } else {
        mailLink.style.display = 'none';
    }
    
    let html = `
        <table class="schedule-table suplencies-table">
            <colgroup>
                <col style="width:70px">
                <col style="width:80px">
                <col style="min-width:80px">
                <col>
            </colgroup>
            <thead>
                <tr>
                    <th>Hora</th>
                    <th>Curs</th>
                    <th>Matèria</th>
                    <th>Professor</th>
                </tr>
            </thead>
            <tbody>`;

    for (const c of sup.classes) {
        const indicacionsEscaped = c.indicacions ? c.indicacions.replace(/'/g, "&#39;").replace(/"/g, '&quot;') : '';
        const notaBtn = c.indicacions && c.indicacions.trim()
            ? `<button class="sup-nota-btn" title="Veure indicació" data-nota="${indicacionsEscaped}"><i class="ph ph-note"></i></button>`
            : '';
        const emailFila = trobarEmailProfessor(c.professor);
        const mailBtn = emailFila
            ? `<a class="btn-mail-sm" href="mailto:${emailFila}" title="Enviar correu a ${c.professor}"><i class="ph ph-envelope-simple"></i></a>`
            : '';
        html += `
            <tr>
                <td>${c.hora}</td>
                <td>${c.curs}</td>
                <td>${c.materia}</td>
                <td class="sup-professor-cell">${c.professor}${mailBtn}${notaBtn}</td>
            </tr>`;
    }

    html += `</tbody></table>`;

    const modalBody = document.getElementById('sup-modal-body');
    modalBody.innerHTML = html;

    // Listeners per als botons de nota
    modalBody.querySelectorAll('.sup-nota-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-nota');
            const overlay = document.createElement('div');
            overlay.className = 'sup-nota-overlay';
            overlay.innerHTML = `
                <button class="sup-nota-back"><i class="ph ph-arrow-left"></i> Tornar</button>
                <div class="sup-nota-text">${text}</div>`;
            overlay.querySelector('.sup-nota-back').addEventListener('click', () => overlay.remove());
            modalBody.appendChild(overlay);
        });
    });

    document.getElementById('sup-modal').classList.add('active');
}

function tancarModal() {
    document.getElementById('sup-modal').classList.remove('active');
}
