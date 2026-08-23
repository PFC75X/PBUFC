const D = () => Store.data;

const CATEGORIES = ['Poids paille', 'Poids mouche', 'Poids coq', 'Poids plume', 'Poids léger', 'Poids welter', 'Poids moyen', 'Poids lourd'];
const FIGHTER_STATUS = ['Actif', 'Blessé', 'Suspendu', 'Retraité'];
const STAFF_ROLES = ['Patron', 'Co-Patron', 'Fight Manager', 'Sécurité', 'Barman', 'Danseuse', 'Coach', 'Médecin', 'Autre'];
const KO_METHODS = ['KO', 'TKO', 'Soumission'];
const METHODS = [...KO_METHODS, 'Décision unanime', 'Décision split', 'Autre'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const money = n => Number(n || 0).toLocaleString('fr-FR') + ' $';
const fmtDate = d => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtDateTime = iso => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

function fighterById(id) { return D().fighters.find(f => f.id === id); }
function fighterName(id) { const f = fighterById(id); return f ? f.name + (f.nickname ? ` « ${f.nickname} »` : '') : '—'; }
function eventName(id) { const e = D().events.find(x => x.id === id); return e ? `FN #${e.number}` : '—'; }

function avatar(f, size = 36) {
  if (!f) return `<span class="avatar avatar-txt" style="width:${size}px;height:${size}px">?</span>`;
  const init = (f.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (f.photo) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(f.photo)}" alt="" onerror="this.outerHTML='<span class=&quot;avatar avatar-txt&quot;>${init}</span>'">`;
  return `<span class="avatar avatar-txt" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .38)}px">${init}</span>`;
}

function badge(text, color) { return `<span class="badge b-${color}">${esc(text)}</span>`; }
const STATUS_COLORS = { 'Actif': 'green', 'Blessé': 'orange', 'Suspendu': 'red', 'Retraité': 'gray' };

function autoStats(fid) {
  let w = 0, l = 0, n = 0, ko = 0, pts = 0;
  D().fights.forEach(ft => {
    if (!ft.winnerId || (ft.f1Id !== fid && ft.f2Id !== fid)) return;
    if (ft.winnerId === 'DRAW') { n++; pts += 1; return; }
    if (ft.winnerId === fid) { w++; pts += KO_METHODS.includes(ft.method) ? 5 : 3; if (KO_METHODS.includes(ft.method)) ko++; }
    else l++;
  });
  return { w, l, n, ko, pts };
}

function stats(fid) {
  const s = autoStats(fid);
  const bf = fighterById(fid);
  const adj = bf?.adj || {};
  s.adj = { w: Number(adj.w || 0), l: Number(adj.l || 0), n: Number(adj.n || 0), ko: Number(adj.ko || 0) };
  s.aw = s.w; s.al = s.l; s.an = s.n; s.ak = s.ko;
  s.w += s.adj.w; s.l += s.adj.l; s.n += s.adj.n; s.ko += s.adj.ko;
  s.bonus = Number(bf?.bonus || 0);
  s.pts += s.bonus;
  return s;
}

function ranking() {
  return D().fighters.map(f => ({ f, s: stats(f.id) }))
    .sort((a, b) => b.s.pts - a.s.pts || b.s.w - a.s.w || a.f.name.localeCompare(b.f.name));
}
function rankOf(fid) { return ranking().findIndex(r => r.f.id === fid) + 1; }

function resultsOf(fid) {
  return D().fights.filter(f => f.winnerId && (f.f1Id === fid || f.f2Id === fid))
    .sort((a, b) => String(a.date).localeCompare(b.date))
    .map(f => f.winnerId === 'DRAW' ? 'n' : (f.winnerId === fid ? 'w' : 'l'));
}
function streakOf(res) {
  if (!res.length) return null;
  let c = 0;
  for (let i = res.length - 1; i >= 0; i--) { if (res[i] === res[res.length - 1]) c++; else break; }
  return { type: res[res.length - 1], count: c };
}
const rankedState = { cat: '' };

function recettes() { return D().accounting.filter(a => a.type === 'Recette').reduce((s, a) => s + Number(a.amount || 0), 0); }
function depenses() { return D().accounting.filter(a => a.type === 'Dépense').reduce((s, a) => s + Number(a.amount || 0), 0); }

function nextEvents() {
  return D().events.filter(e => e.status === 'À venir')
    .sort((a, b) => String(a.date).localeCompare(b.date));
}

function champLine() {
  return D().championships.map(c => {
    const ch = fighterById(c.championId);
    return `${esc(c.belt.replace('Ceinture PBUFC — ', ''))} : <b>${ch ? esc(ch.name) : 'Vacant'}</b> (${c.defenses} déf.)`;
  }).join('<br>');
}

/* ================= NAVIGATION ================= */

const NAV = [
  { group: 'Tableau de bord', items: [{ id: 'dashboard', label: 'Vue générale' }] },
  {
    group: 'Compétition', items: [
      { id: 'fighters', label: 'Combattants' },
      { id: 'ranked', label: 'Ranked' },
      { id: 'classement', label: 'Classement' },
      { id: 'championships', label: 'Championnat' },
      { id: 'sanctions', label: 'Sanctions' },
      { id: 'hof', label: 'Hall of Fame' }
    ]
  },
  {
    group: 'Organisation', items: [
      { id: 'events', label: 'Événements' },
      { id: 'fights', label: 'Combats' },
      { id: 'staff', label: 'Staff' }
    ]
  },
  {
    group: 'Business', items: [
      { id: 'tickets', label: 'Billetterie & VIP' },
      { id: 'accounting', label: 'Comptabilité' },
      { id: 'sponsors', label: 'Sponsors' }
    ]
  },
  { group: 'Archives', items: [{ id: 'historique', label: 'Historique complet' }] }
];

/* ================= SCHEMAS ================= */

const SCHEMAS = {
  fighters: {
    title: 'Combattants', singular: 'Combattant', icon: '🥊',
    desc: 'Fiches complètes : palmarès calculé automatiquement depuis les combats enregistrés.',
    columns: [
      { label: 'Licence', get: f => `<small class="mono">${esc(f.pbufc)}</small>` },
      { label: 'Combattant', get: f => `<div class="cell-flex">${avatar(f)}<div><b>${esc(f.name)}</b>${f.nickname ? `<br><small class="muted">« ${esc(f.nickname)} »</small>` : ''}</div></div>` },
      { label: 'Catégorie', get: f => esc(f.category || '—') },
      { label: 'Palmarès', get: f => { const s = stats(f.id); return `<span class="rec">${s.w}V</span> · <span class="gray">${s.l}D</span> · <span class="gray">${s.n}N</span> <small class="muted">(KO ${s.ko})</small>`; } },
      { label: 'Points', get: f => { const s = stats(f.id); return `<b>${s.pts}</b> pts`; } },
      { label: 'Statut', get: f => badge(f.status, STATUS_COLORS[f.status] || 'gray') }
    ],
    fields: [
      { key: 'name', label: 'Nom RP *', required: true },
      { key: 'nickname', label: 'Surnom de ring' },
      { key: 'photo', label: 'Photo (URL)', type: 'url' },
      { key: 'category', label: 'Catégorie', type: 'select', options: CATEGORIES },
      { key: 'status', label: 'Statut', type: 'select', options: FIGHTER_STATUS },
      { key: 'contact', label: 'Contact RP' }
    ],
    actions: f => `<button class="row-btn" data-action="points" data-section="fighters" data-id="${f.id}">Points</button>
        <button class="row-btn" data-action="fiche" data-section="fighters" data-id="${f.id}">Fiche</button>`,
    onSave(item, isNew) {
      if (isNew) item.pbufc = Store.nextPbufc(), item.createdAt = new Date().toISOString().slice(0, 10);
    },
    rowTitle: f => f.name
  },

  staff: {
    title: 'Staff', singular: 'Membre du staff', icon: '🕴️',
    desc: 'Organisation interne du club.',
    columns: [
      { label: 'Nom', get: m => `<div class="cell-flex">${avatar(m)}<div><b>${esc(m.name)}</b>${m.nickname ? `<br><small class="muted">« ${esc(m.nickname)} »</small>` : ''}</div></div>` },
      { label: 'Rôle', get: m => badge(m.role, m.role === 'Patron' ? 'gold' : m.role === 'Co-Patron' ? 'silver' : 'blue') },
      { label: 'Contact', get: m => esc(m.contact || '—') },
      { label: 'Statut', get: m => badge(m.status, m.status === 'Actif' ? 'green' : 'gray') }
    ],
    fields: [
      { key: 'name', label: 'Nom RP *', required: true },
      { key: 'nickname', label: 'Surnom' },
      { key: 'role', label: 'Rôle', type: 'select', options: STAFF_ROLES },
      { key: 'contact', label: 'Contact' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Actif', 'Inactif'] }
    ],
    rowTitle: m => m.name
  },

  fights: {
    title: 'Combats', singular: 'Combat', icon: '🤜',
    desc: 'Enregistrer un résultat met à jour automatiquement palmarès et classement (+5 pts KO/TKO/Soumission, +3 décision, +1 nul).',
    columns: [
      { label: 'Date', get: ft => fmtDate(ft.date) },
      { label: 'Combat', get: ft => `<b>${esc(fighterName(ft.f1Id))}</b><br>vs <b>${esc(fighterName(ft.f2Id))}</b>` },
      { label: 'Événement', get: ft => ft.eventId ? esc(eventName(ft.eventId)) : '<small class="muted">Hors gala</small>' },
      { label: 'Résultat', get: ft => !ft.winnerId ? badge('À venir', 'blue') : ft.winnerId === 'DRAW' ? badge('Match nul', 'orange') : `<b>${esc(fighterName(ft.winnerId).split(' ')[0])}… gagne</b>` },
      { label: 'Méthode', get: ft => ft.method ? `${esc(ft.method)}${ft.round ? ` — R${esc(ft.round)}` : ''}` : '—' },
      { label: 'Arbitre', get: ft => esc(ft.referee || '—') },
      { label: 'Notes', get: ft => ft.notes ? `<small>${esc(ft.notes)}</small>` : '—' }
    ],
    fields: [
      { key: 'eventId', label: 'Événement', type: 'select', options: () => D().events.map(e => ({ v: e.id, l: `FN #${e.number} — ${e.name}` })) },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'f1Id', label: 'Combattant 1 *', type: 'select', options: () => D().fighters.map(f => ({ v: f.id, l: f.name })), required: true },
      { key: 'f2Id', label: 'Combattant 2 *', type: 'select', options: () => D().fighters.map(f => ({ v: f.id, l: f.name })), required: true },
      { key: 'importance', label: 'Position carte', type: 'select', options: ['Carte principale', 'Co-Main Event', 'Main Event'] },
      { key: 'winnerId', label: 'Gagnant (vide ou « draw » = nul)', type: 'select', options: () => [{ v: '', l: '— Combat à venir / non tranché —' }, ...D().fighters.map(f => ({ v: f.id, l: f.name })), { v: 'DRAW', l: 'MATCH NUL' }] },
      { key: 'method', label: 'Type de victoire', type: 'select', options: ['', ...METHODS] },
      { key: 'round', label: 'Round', type: 'number' },
      { key: 'referee', label: 'Arbitre' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    onSave(item, isNew) {
      if (isNew && item.winnerId) Store.log(`Résultat enregistré : ${fighterName(item.f1Id)} vs ${fighterName(item.f2Id)} → ${item.winnerId === 'DRAW' ? 'match nul' : fighterName(item.winnerId) + ' (' + item.method + ')'}`);
    },
    rowTitle: ft => `${fighterName(ft.f1Id)} vs ${fighterName(ft.f2Id)}`
  },

  events: {
    title: 'Événements', singular: 'Événement', icon: '📅',
    desc: 'Galas Fight Night : carte des combats, horaires, main event et co-main event.',
    columns: [
      { label: '#', get: e => `<b class="mono">#${esc(e.number)}</b>` },
      { label: 'Nom', get: e => `<b>${esc(e.name)}</b>${e.notes ? `<br><small class="muted">${esc(e.notes)}</small>` : ''}` },
      { label: 'Date & heure', get: e => `${fmtDate(e.date)}<br><small class="muted">${esc(e.time || '')}</small>` },
      { label: 'Lieu', get: e => esc(e.location || '—') },
      { label: 'Carte', get: e => { const n = D().fights.filter(f => f.eventId === e.id).length; const me = D().fights.find(f => f.eventId === e.id && f.importance === 'Main Event'); return `${n} combat(s)${me ? `<br><small class="gold">★ ME : ${esc(fighterName(me.f1Id))} vs ${esc(fighterName(me.f2Id))}</small>` : ''}`; } },
      { label: 'Statut', get: e => badge(e.status, e.status === 'À venir' ? 'blue' : e.status === 'Terminé' ? 'green' : 'red') }
    ],
    fields: [
      { key: 'number', label: 'Numéro FN (vide = auto)', placeholder: 'ex : 009' },
      { key: 'name', label: 'Nom du gala *', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Heure début' },
      { key: 'location', label: 'Lieu' },
      { key: 'status', label: 'Statut', type: 'select', options: ['À venir', 'Terminé', 'Annulé'] },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    actions: e => `<button class="row-btn" data-action="carte" data-section="events" data-id="${e.id}">Carte</button>`,
    onSave(item, isNew) { if (isNew && !item.number) item.number = Store.nextEventNumber(); },
    rowTitle: e => e.name
  },

  championships: {
    title: 'Championnat', singular: 'Ceinture', icon: '🥇',
    desc: 'Ceintures en jeu. Changer le champion met à jour les défenses et l’historique automatiquement.',
    columns: [
      { label: 'Ceinture', get: c => `<b>${esc(c.belt)}</b>` },
      { label: 'Catégorie', get: c => esc(c.category || '—') },
      { label: 'Champion actuel', get: c => `<div class="cell-flex">${avatar(fighterById(c.championId))}<b>${esc(fighterName(c.championId))}</b></div>` },
      { label: 'Défenses', get: c => `<b>${c.defenses || 0}</b>` },
      { label: 'Dernier changement', get: c => c.history && c.history.length ? `<small>${esc(c.history[0])}</small>` : '—' }
    ],
    fields: [
      { key: 'belt', label: 'Nom de la ceinture *', required: true },
      { key: 'category', label: 'Catégorie', type: 'select', options: CATEGORIES },
      { key: 'championId', label: 'Champion actuel', type: 'select', options: () => [{ v: '', l: '— Vacant —' }, ...D().fighters.map(f => ({ v: f.id, l: f.name }))] },
      { key: 'defenses', label: 'Défenses de titre', type: 'number' },
      { key: '_note', label: 'Note (facultatif)', placeholder: 'ex : victoire par TKO vs X' }
    ],
    onSave(item, isNew) {
      const old = isNew ? null : (SCHEMAS._prevChamp && SCHEMAS._prevChamp[item.id]);
      SCHEMAS._prevChamp = SCHEMAS._prevChamp || {};
      SCHEMAS._prevChamp[item.id] = item.championId;
      if (!isNew && old !== undefined && old !== item.championId) {
        item.defenses = 0;
        const entry = `${new Date().toISOString().slice(0, 10)} : ${fighterName(item.championId)} devient champion (${item.belt})${old ? ', succède à ' + fighterName(old) : ''}${item._note ? ' — ' + item._note : ''}`;
        item.history = [entry, ...(item.history || [])];
        Store.log(`Changement de champion : ${entry}`);
        delete item._note;
      }
      if (isNew && item.championId) {
        item.history = [`${new Date().toISOString().slice(0, 10)} : ${fighterName(item.championId)} devient champion (${item.belt})`, ...(item.history || [])];
        Store.log(`Nouvelle ceinture créée : ${item.belt}`);
      }
    },
    editPreload(id) { SCHEMAS._prevChamp = SCHEMAS._prevChamp || {}; SCHEMAS._prevChamp[id] = D().championships.find(c => c.id === id)?.championId; },
    rowTitle: c => c.belt
  },

  tickets: {
    title: 'Billetterie & VIP', singular: 'Réservation', icon: '🎟️',
    desc: 'Suivi des entrées, réservations et Black Cards. Tarifs habituels : Standard 25 $ · VIP 80 $ · Black Card 250 $.',
    before() {
      const t = D().tickets;
      const sum = ty => t.filter(x => x.type === ty);
      const totalPaid = t.filter(x => x.paid).reduce((s, x) => s + x.price * x.qty, 0);
      const pending = t.filter(x => !x.paid).reduce((s, x) => s + x.price * x.qty, 0);
      return `
        <div class="stat-row">
          <div class="stat-card"><small>Black Cards vendues</small><b>${sum('Black Card').reduce((s, x) => s + x.qty, 0)}</b></div>
          <div class="stat-card"><small>Places VIP</small><b>${sum('VIP').reduce((s, x) => s + x.qty, 0)}</b></div>
          <div class="stat-card"><small>Places Standard</small><b>${sum('Standard').reduce((s, x) => s + x.qty, 0)}</b></div>
          <div class="stat-card green"><small>Encaissé</small><b>${money(totalPaid)}</b></div>
          <div class="stat-card orange"><small>En attente</small><b>${money(pending)}</b></div>
        </div>`;
    },
    columns: [
      { label: 'Date', get: t => fmtDate(t.date) },
      { label: 'Acheteur', get: t => `<b>${esc(t.buyer)}</b>` },
      { label: 'Type', get: t => badge(t.type, t.type === 'Black Card' ? 'gold' : t.type === 'VIP' ? 'purple' : 'blue') },
      { label: 'Qté', get: t => t.qty },
      { label: 'Prix unit.', get: t => money(t.price) },
      { label: 'Total', get: t => `<b>${money(t.price * t.qty)}</b>` },
      { label: 'Paiement', get: t => t.paid ? badge('Payé', 'green') : badge('Impayé', 'orange') }
    ],
    fields: [
      { key: 'buyer', label: 'Acheteur / Réservation *', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Standard', 'VIP', 'Black Card'] },
      { key: 'qty', label: 'Quantité', type: 'number', value: 1 },
      { key: 'price', label: 'Prix unitaire ($)', type: 'number', value: 25 },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'paid', label: 'Payé ?', type: 'checkbox' }
    ],
    onSave(item, isNew) {
      if (item.paid === true) item.paid = true; else item.paid = false;
      if (isNew) Store.log(`Billetterie : ${item.qty}× ${item.type} pour ${item.buyer} (${money(item.price * item.qty)})`);
    },
    rowTitle: t => t.buyer
  },

  accounting: {
    title: 'Comptabilité', singular: 'Transaction', icon: '💰',
    desc: 'Recettes, dépenses, primes et salaires du club.',
    before() {
      const r = recettes(), d = depenses();
      return `
        <div class="stat-row">
          <div class="stat-card green"><small>Total recettes</small><b>+${money(r)}</b></div>
          <div class="stat-card red"><small>Total dépenses</small><b>−${money(d)}</b></div>
          <div class="stat-card ${r - d >= 0 ? 'green' : 'red'}"><small>Solde du club</small><b>${money(r - d)}</b></div>
        </div>`;
    },
    columns: [
      { label: 'Date', get: a => fmtDate(a.date) },
      { label: 'Libellé', get: a => `<b>${esc(a.label)}</b>` },
      { label: 'Type', get: a => a.type === 'Recette' ? badge('Recette', 'green') : badge('Dépense', 'red') },
      { label: 'Catégorie', get: a => esc(a.category || '—') },
      { label: 'Montant', get: a => `<b class="${a.type === 'Recette' ? 'rec' : 'exp'}">${a.type === 'Recette' ? '+' : '−'}${money(a.amount)}</b>` }
    ],
    fields: [
      { key: 'label', label: 'Libellé *', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Recette', 'Dépense'] },
      { key: 'category', label: 'Catégorie', type: 'select', options: ['Billetterie', 'Bar', 'Sponsors', 'Primes', 'Salaires', 'Location', 'Matériel', 'Sanctions', 'Autre'] },
      { key: 'amount', label: 'Montant ($)', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date' }
    ],
    onSave(item) { Store.log(`${item.type} comptable : ${item.label} (${money(item.amount)})`); },
    rowTitle: a => a.label
  },

  sponsors: {
    title: 'Sponsors & Partenariats', singular: 'Sponsor', icon: '🤝',
    desc: 'Contrats de sponsoring du club.',
    before() {
      const actifs = D().sponsors.filter(s => s.status === 'Actif');
      const total = actifs.reduce((s, x) => s + Number(x.monthly || 0), 0);
      return `<div class="stat-row">
        <div class="stat-card"><small>Partenaires actifs</small><b>${actifs.length}</b></div>
        <div class="stat-card green"><small>Revenus mensuels sponsors</small><b>+${money(total)}</b></div>
      </div>`;
    },
    columns: [
      { label: 'Sponsor', get: s => `<b>${esc(s.name)}</b>` },
      { label: 'Contact', get: s => esc(s.contact || '—') },
      { label: 'Montant / mois', get: s => `<b class="rec">+${money(s.monthly)}</b>` },
      { label: 'Durée', get: s => `${fmtDate(s.start)} → ${fmtDate(s.end)}` },
      { label: 'Statut', get: s => badge(s.status, s.status === 'Actif' ? 'green' : 'gray') }
    ],
    fields: [
      { key: 'name', label: 'Nom du sponsor *', required: true },
      { key: 'contact', label: 'Contact' },
      { key: 'monthly', label: 'Montant mensuel ($)', type: 'number' },
      { key: 'start', label: 'Début contrat', type: 'date' },
      { key: 'end', label: 'Fin contrat', type: 'date' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Actif', 'Expiré', 'Résilié', 'En négociation'] }
    ],
    rowTitle: s => s.name
  },

  sanctions: {
    title: 'Sanctions & Avertissements', singular: 'Sanction', icon: '⚠️',
    desc: 'Discipline des combattants et du staff.',
    columns: [
      { label: 'Date', get: s => fmtDate(s.date) },
      { label: 'Cible', get: s => `<b>${esc(s.target)}</b><br><small class="muted">${esc(s.targetType)}</small>` },
      { label: 'Motif', get: s => `<small>${esc(s.reason)}</small>` },
      { label: 'Sévérité', get: s => badge(s.severity, s.severity === 'Avertissement' ? 'orange' : s.severity === 'Amende' ? 'purple' : 'red') },
      { label: 'Amende', get: s => s.amount > 0 ? money(s.amount) : '—' },
      { label: 'Statut', get: s => badge(s.status, s.status === 'Active' ? 'red' : 'green') }
    ],
    fields: [
      { key: 'target', label: 'Nom de la personne *', required: true },
      { key: 'targetType', label: 'Type', type: 'select', options: ['Combattant', 'Staff'] },
      { key: 'reason', label: 'Motif *', type: 'textarea', required: true },
      { key: 'severity', label: 'Sévérité', type: 'select', options: ['Avertissement', 'Amende', 'Suspension courte', 'Suspension longue', 'Exclusion'] },
      { key: 'amount', label: 'Amende ($) si applicable', type: 'number' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Active', 'Levée', 'Payée', 'Purgeée'] },
      { key: 'date', label: 'Date', type: 'date' }
    ],
    onSave(item, isNew) { if (isNew) Store.log(`Sanction : ${item.target} — ${item.severity} (${item.reason.slice(0, 40)}…)`) },
    rowTitle: s => `${s.target} — ${s.severity}`
  },

  hof: {
    title: 'Hall of Fame', singular: 'Légende', icon: '🗿',
    desc: 'Les légendes du PBUFC.', view: 'cards',
    card(h) {
      return `<article class="card hof-card">
        <div class="hof-top">${avatar({ name: h.name, photo: h.photo }, 56)}
        <div><h3>${esc(h.name)}</h3><p class="muted small">${esc(h.title || '')}</p></div></div>
        <p class="hof-record">${esc(h.record || '')}</p>
        <p class="small muted">${esc(h.description || '')}</p>
        <p class="small gold">Intronisé en ${esc(h.year || '?')}</p>
      </article>`;
    },
    fields: [
      { key: 'name', label: 'Nom RP *', required: true },
      { key: 'title', label: 'Titre / Distinction' },
      { key: 'record', label: 'Palmarès (RP)' },
      { key: 'year', label: 'Année d’intronisation' },
      { key: 'photo', label: 'Photo (URL)', type: 'url' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    rowTitle: h => h.name
  }
};

/* ================= VUES PERSONNALISÉES ================= */

const CUSTOM_VIEWS = {

  dashboard() {
    const next = nextEvents()[0];
    const activeFighters = D().fighters.filter(f => f.status === 'Actif').length;
    const top5 = ranking().slice(0, 5);
    const r = recettes(), d = depenses();
    const lastLog = D().log.slice(0, 6);

    return `
      <section class="hero">
        <p class="hero-kicker">Panel officiel · Saison 2026</p>
        <h2 class="hero-title">Iron <em>Fight Club</em></h2>
        <p class="hero-sub">${next ? `Prochain gala : FN #${esc(next.number)} — ${fmtDate(next.date)}, ${esc(next.location || 'lieu à confirmer')}.` : 'Aucun gala planifié pour le moment.'}</p>
      </section>
      <div class="stat-row">
        <div class="stat-card"><small>Prochain gala</small><b>${next ? `FN #${esc(next.number)}` : '—'}</b><small>${next ? fmtDate(next.date) : 'aucun planifié'}</small></div>
        <div class="stat-card"><small>Combattants actifs</small><b>${activeFighters}</b><small>sur ${D().fighters.length} licenciés</small></div>
        <div class="stat-card"><small>Ceintures en jeu</small><b>${D().championships.length}</b><small>${champLine().replace(/<[^>]+>/g, '').split(':').length - 1} champions titrés</small></div>
        <div class="stat-card ${r - d >= 0 ? 'green' : 'red'}"><small>Solde du club</small><b>${money(r - d)}</b><small>+${money(r)} / −${money(d)}</small></div>
      </div>

      <div class="dash-grid">
        <section class="panel">
          <h3>Prochains événements</h3>
          ${nextEvents().slice(0, 4).map(e => `
            <div class="list-item">
              <span class="mono gold">#${esc(e.number)}</span>
              <div style="flex:1"><b>${esc(e.name.split('—')[1] || e.name)}</b><br><small class="muted">${fmtDate(e.date)} · ${esc(e.time || '')} · ${esc(e.location)}</small></div>
              <button class="btn btn-ghost btn-sm" data-action="goto" data-target="#events">Ouvrir</button>
            </div>`).join('') || '<p class="muted">Aucun événement à venir.</p>'}
        </section>

        <section class="panel">
          <h3>Top 5 — Classement</h3>
          ${top5.map((row, i) => `
            <div class="list-item">
              <span class="rank r-${i + 1}">${i + 1}</span>
              <div style="flex:1"><b>${esc(row.f.name)}</b> <small class="muted">${esc(row.f.category)}</small></div>
              <span class="pts">${row.s.pts} pts <small class="muted">(${row.s.w}V-${row.s.l}D)</small></span>
            </div>`).join('')}
          <button class="btn btn-ghost btn-sm full-w" data-action="goto" data-target="#classement">Voir tout le classement →</button>
        </section>

        <section class="panel">
          <h3>Champions actuels</h3>
          ${D().championships.map(c => `
            <div class="list-item">
              ${avatar(fighterById(c.championId), 40)}
              <div style="flex:1"><b>${esc(fighterName(c.championId))}</b><br><small class="muted">${esc(c.belt.replace('Ceinture PBUFC — ', ''))}</small></div>
              <span class="pts">${c.defenses} déf.</span>
            </div>`).join('')}
        </section>

        <section class="panel">
          <h3>Activité récente</h3>
          ${lastLog.map(l => `<div class="list-item"><small class="mono muted">${fmtDateTime(l.time)}</small><span class="log-text">${esc(l.text)}</span></div>`).join('') || '<p class="muted">Rien pour le moment.</p>'}
        </section>
      </div>`;
  },

  ranked() {
    const cat = rankedState.cat || '';
    const rows = ranking();
    const cats = [...new Set(D().fighters.map(f => f.category).filter(Boolean))];
    const filtered = cat ? rows.filter(r => r.f.category === cat) : rows;
    const maxPts = Math.max(1, ...rows.map(r => r.s.pts));
    const champIds = D().championships.map(c => c.championId).filter(Boolean);
    const posOf = {};
    rows.forEach((r, i) => { posOf[r.f.id] = i + 1; });

    const byCat = {};
    rows.forEach(r => { const c = r.f.category || '—'; (byCat[c] = byCat[c] || []).push(r.f.id); });
    function contenderTag(fid) {
      const me = fighterById(fid);
      const belt = D().championships.find(c => c.category === me?.category);
      if (!belt) return '';
      const list = (byCat[belt.category] || []).filter(x => x !== belt.championId);
      const pos = list.indexOf(fid);
      if (pos === 0) return '<span class="mini-tag contender">Prétendant #1</span>';
      if (pos === 1) return '<span class="mini-tag contender">Prétendant #2</span>';
      return '';
    }

    const podium = rows.slice(0, 3).map((r, i) => `
      <div class="pod-card p${i + 1}">
        <span class="pod-place">${i + 1}</span>
        ${avatar(r.f, 52)}
        <div><b>${esc(r.f.name)}</b><small class="muted">${esc(r.f.nickname ? '« ' + r.f.nickname + ' »' : (r.f.category || ''))}</small></div>
        <b class="pod-pts">${r.s.pts}<small>pts</small></b>
      </div>`).join('');

    return `
      <div class="section-head">
        <div><h2>Ranked PBUFC</h2><p class="muted">Gestion du classement : ajustez points et palmarès manuellement, suivez la forme et les séries.</p></div>
        <button class="btn btn-outline btn-sm" data-action="close-season">Clôturer la saison</button>
      </div>

      <div class="chip-row">
        <button class="chip ${!cat ? 'on' : ''}" data-rank-cat="">Toutes catégories</button>
        ${cats.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-rank-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>

      ${(D().seasons && D().seasons.length) ? `<p class="muted small" style="margin:-4px 0 14px">${D().seasons.length} saison(s) archivée(s) — détail en bas de page.</p>` : ''}

      <div class="podium">${podium}</div>

      <input class="search-input" placeholder="Rechercher un combattant…" data-filter-table="ranked">

      <div class="table-wrap panel"><table data-tbody-for="ranked">
        <thead><tr>
          <th>#</th><th>Combattant</th><th>Catégorie</th><th>Forme (5)</th><th>Série</th>
          <th>V-D-N</th><th>Finitions</th><th>Détail points</th><th>Total</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.map(({ f, s }) => {
            const res = resultsOf(f.id);
            const fm = res.slice(-5);
            const st = streakOf(res);
            const autoPts = s.pts - s.bonus;
            const pct = Math.max(2, Math.round(s.pts / maxPts * 100));
            return `
            <tr>
              <td><span class="rank r-${posOf[f.id]}">${posOf[f.id]}</span></td>
              <td><div class="cell-flex">${avatar(f)}<div><b>${esc(f.name)}</b> ${contenderTag(f.id)}</div></div></td>
              <td>${esc(f.category || '—')}</td>
              <td>${fm.length ? fm.map(ch => `<i class="dot-f ${ch}"></i>`).join('') : '<span class="muted small">—</span>'}</td>
              <td>${st ? `<b class="${st.type === 'w' ? 'rec' : st.type === 'l' ? 'exp' : 'muted'}">${st.type.toUpperCase()}${st.count}</b>` : '<span class="muted">—</span>'}</td>
              <td><span class="rec">${s.w}</span>-<span class="gray">${s.l}</span>-<span class="gray">${s.n}</span></td>
              <td>${s.ko}</td>
              <td><small class="muted">auto ${autoPts}</small>${s.bonus ? ` · <small class="gold">ajusté ${s.bonus > 0 ? '+' : ''}${s.bonus}</small>` : ''}</td>
              <td style="min-width:120px"><b class="gold" style="font-size:1.05rem">${s.pts}</b><div class="bar"><i style="width:${pct}%"></i></div></td>
              <td class="actions-cell">
                <button class="row-btn ok" data-action="points" data-section="fighters" data-id="${f.id}">Points</button>
                <button class="row-btn" data-action="record" data-id="${f.id}">Record</button>
              </td>
            </tr>`;
          }).join('')}
          ${filtered.length ? '' : '<tr><td colspan="10" class="muted center">Aucun combattant dans ce filtre.</td></tr>'}
        </tbody>
      </table></div>

      ${(D().seasons && D().seasons.length) ? `<details class="manage-details panel"><summary>Saisons archivées (${D().seasons.length})</summary>
        ${D().seasons.map(se => `
          <div class="season-box">
            <b>Saison clôturée le ${fmtDate(se.closedAt)}</b>
            <ol class="season-list">
              ${se.top.slice(0, 5).map(t => `<li><b>${esc(t.name)}</b> <small class="muted">${esc(t.pbufc)}</small> — <span class="gold">${t.pts} pts</span> <small class="muted">(${t.w}V-${t.l}D)</small></li>`).join('')}
            </ol>
          </div>`).join('')}
      </details>` : ''}`;
  },

  classement() {
    const rows = ranking();
    const champIds = D().championships.map(c => c.championId);
    return `
      <div class="panel rules-panel">
        <b>Système de points — calcul automatique</b>
        <span>Victoire par KO / TKO / Soumission : <b class="gold">+5 pts</b></span>
        <span>Victoire par décision : <b>+3 pts</b></span>
        <span>Match nul : <b>+1 pt</b></span>
        <span>Défaite : <b class="muted">0 pt</b></span>
        <span>Bonus / malus manuels (direction) : inclus au total — bouton « Points » sur les fiches</span><button class="btn btn-ghost btn-sm" data-route="ranked">Ouvrir Ranked</button>
      </div>
      <div class="table-wrap panel">
        <table>
          <thead><tr><th>#</th><th>Combattant</th><th>Licence</th><th>Catégorie</th><th>V-D-N</th><th>Finitions</th><th>Points</th><th>Statut</th></tr></thead>
          <tbody>
            ${rows.map(({ f, s }, i) => `
              <tr class="${champIds.includes(f.id) ? 'champ-row' : ''}">
                <td><span class="rank r-${i + 1}">${i + 1}</span></td>
                <td><div class="cell-flex">${avatar(f)}<b>${esc(f.name)}</b>${champIds.includes(f.id) ? '<span class="mini-tag">Champion</span>' : ''}</div></td>
                <td><small class="mono muted">${esc(f.pbufc)}</small></td>
                <td>${esc(f.category)}</td>
                <td><span class="rec">${s.w}</span>-<span class="gray">${s.l}</span>-<span class="gray">${s.n}</span></td>
                <td>${s.ko} KO/Sub</td>
                <td><b class="gold">${s.pts}</b></td>
                <td>${badge(f.status, STATUS_COLORS[f.status] || 'gray')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  historique() {
    return `
      <div class="panel">
        <h3>Historique du club</h3>
        <p class="muted small">Toutes les actions importantes sont enregistrées automatiquement (combats, champions, sanctions, finances, points…).</p>
        <div class="timeline">
          ${D().log.map(l => `
            <div class="timeline-item">
              <span class="dot"></span>
              <div><small class="mono muted">${fmtDateTime(l.time)}</small><p>${esc(l.text)}</p></div>
            </div>`).join('') || '<p class="muted">Historique vide.</p>'}
        </div>
      </div>`;
  }
};

/* ================= MOTEUR RENDU ================= */

function renderNav(active) {
  const html = NAV.map((g, gi) => {
    if (g.items.length === 1) {
      return `<button class="menu-btn direct ${active === g.items[0].id ? 'current' : ''}" data-route="${g.items[0].id}">${g.items[0].label}</button>`;
    }
    const isCurrent = g.items.some(i => i.id === active);
    return `
      <div class="menu-group ${isCurrent ? 'current' : ''}">
        <button class="menu-btn" data-dropdown>${g.group}<span class="chev"></span></button>
        <div class="dropdown">
          ${g.items.map(it => `<button class="nav-item ${it.id === active ? 'active' : ''}" data-route="${it.id}"><span>${it.label}</span></button>`).join('')}
        </div>
      </div>`;
  }).join('');
  document.getElementById('nav').innerHTML = html;
}

function actionButtons(section, it) {
  const s = SCHEMAS[section];
  return `${s.actions ? s.actions(it) : ''}
    <button class="row-btn" data-action="edit" data-section="${section}" data-id="${it.id}">Modifier</button>
    <button class="row-btn danger" data-action="del" data-section="${section}" data-id="${it.id}">Supprimer</button>`;
}

function entityView(section) {
  const s = SCHEMAS[section];
  const items = D()[section];
  const searchBox = items.length > 4 ? `<input class="search-input" placeholder="Rechercher…" data-filter-table="${section}">` : '';

  let html = `
    <div class="section-head">
      <div><h2>${esc(s.title)}</h2><p class="muted">${s.desc || ''}</p></div>
      <button class="btn btn-primary" data-action="add" data-section="${section}">Ajouter</button>
    </div>${searchBox}`;

  if (s.before) html += s.before();

  if (s.view === 'cards') {
    html += `<div class="cards-grid">${items.map(it => s.card(it)).join('')}</div>
      ${items.length ? '' : '<p class="muted">Rien ici pour le moment.</p>'}`;
    html += hiddenRowsTable(section, items);
    return html;
  }

  html += `<div class="table-wrap panel"><table data-tbody-for="${section}">
    <thead><tr>${s.columns.map(c => `<th>${c.label}</th>`).join('')}<th class="th-actions">Actions</th></tr></thead>
    <tbody>
      ${items.map(it => `<tr>${s.columns.map(c => `<td>${c.get(it)}</td>`).join('')}<td class="actions-cell">${actionButtons(section, it)}</td></tr>`).join('')}
      ${items.length ? '' : `<tr><td colspan="${s.columns.length + 1}" class="muted center">Aucun élément — clique sur « + Ajouter ».</td></tr>`}
    </tbody>
  </table></div>`;
  return html;
}

function hiddenRowsTable(section, items) {
  const s = SCHEMAS[section];
  return `<details class="manage-details"><summary>Gérer (${items.length}) — modifier / supprimer</summary>
    <div class="table-wrap"><table>
      <thead><tr>${s.columns.map(c => `<th>${c.label}</th>`).join('')}<th>Actions</th></tr></thead>
      <tbody>${items.map(it => `<tr>${s.columns.map(c => `<td>${c.get(it)}</td>`).join('')}<td class="actions-cell">${actionButtons(section, it)}</td></tr>`).join('')}</tbody>
    </table></div></details>`;
}

function render() {
  const route = (location.hash || '#dashboard').slice(1);
  const knownNav = NAV.flatMap(g => g.items).find(i => i.id === route);
  const id = knownNav ? route : 'dashboard';
  renderNav(id);

  const navItem = NAV.flatMap(g => g.items).find(i => i.id === id);
  document.getElementById('page-title').textContent = navItem.label;

  const custom = CUSTOM_VIEWS[id];
  document.getElementById('view').innerHTML =
    `<div class="fade-in">${custom ? custom() : entityView(id)}</div>`;

  document.querySelectorAll('.menu-group.open').forEach(m => m.classList.remove('open'));
  document.getElementById('topnav').classList.remove('open');
  window.scrollTo(0, 0);
}

/* ================= FORMULAIRES (MODALE) ================= */

function fieldHtml(f, item) {
  const val = item ? (item[f.key] ?? '') : (f.value ?? '');
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea name="${f.key}" ${f.required ? 'required' : ''}>${esc(val)}</textarea>`; break;
    case 'select': {
      const opts = typeof f.options === 'function' ? f.options() : f.options;
      input = `<select name="${f.key}">
        ${opts.map(o => { const v = o && typeof o === 'object' ? o.v : o; const l = o && typeof o === 'object' ? o.l : o; return `<option value="${esc(v)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}
      </select>`; break;
    }
    case 'date': input = `<input type="date" name="${f.key}" value="${esc(val)}">`; break;
    case 'number': input = `<input type="number" name="${f.key}" value="${esc(val)}" step="any">`; break;
    case 'checkbox': input = `<input type="checkbox" name="${f.key}" ${val === true || val === 'on' ? 'checked' : ''} style="transform:scale(1.4)">`; break;
    default: input = `<input type="text" name="${f.key}" value="${esc(val)}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">`;
  }
  return `<label class="field"><span>${f.label}</span>${input}</label>`;
}

function openForm(section, id) {
  const s = SCHEMAS[section];
  if (id && s.editPreload) s.editPreload(id);
  const item = id ? D()[section].find(x => x.id === id) : null;
  showModal(`
    <h3>${item ? 'Modifier' : 'Ajouter'} — ${esc(s.singular)}</h3>
    <form id="entity-form" data-section="${section}" data-id="${id || ''}">
      <div class="form-grid">${s.fields.map(f => fieldHtml(f, item)).join('')}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-action="close-modal">Annuler</button>
        <button class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`);
  document.getElementById('entity-form').addEventListener('submit', submitEntityForm);
}

function submitEntityForm(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const section = form.dataset.section;
  const id = form.dataset.id;
  const s = SCHEMAS[section];
  const values = {};
  s.fields.forEach(f => {
    const el = form.elements[f.key];
    if (!el) return;
    values[f.key] = f.type === 'checkbox' ? el.checked : el.value.trim();
  });

  let item;
  if (id) {
    item = D()[section].find(x => x.id === id);
    Object.assign(item, values);
  } else {
    item = { id: Store.uid(), createdAt: new Date().toISOString().slice(0, 10), ...values };
    D()[section].unshift(item);
  }
  if (s.onSave) s.onSave(item, !id);

  if (!id) Store.log(`${s.singular} ajouté(e) : ${typeof s.rowTitle === 'function' ? s.rowTitle(item) : item.name || item.label || item.belt || ''}`);
  Store.save();
  closeModal();
  render();
}

function openRecord(id) {
  const f = fighterById(id);
  if (!f) return;
  const s = stats(id);
  const cur = f.adj || {};
  const g = k => Number(cur[k] || 0);
  const step = (k, label) => `
    <div class="stepper"><span>${label}</span>
      <div class="step-ctl">
        <button type="button" class="step-btn" data-key="${k}" data-step="-1">−</button>
        <input type="number" name="${k}" value="0">
        <button type="button" class="step-btn" data-key="${k}" data-step="1">+</button>
      </div>
    </div>`;
  showModal(`
    <h3>Ajustement de palmarès — ${esc(f.name)}</h3>
    <p class="muted small">Palmarès affiché : <b>${s.w}V – ${s.l}D – ${s.n}N</b> · ${s.ko} finition(s). Ajustements manuels actuels : ${g('w')}V / ${g('l')}D / ${g('n')}N / ${g('ko')}KO.</p>
    <form id="record-form" data-id="${id}">
      <div class="form-grid">
        ${step('w', 'Victoires')}${step('l', 'Défaites')}${step('n', 'Matchs nuls')}${step('ko', 'Finitions KO/Sub')}
      </div>
      <label class="field" style="margin-top:12px"><span>Motif de l’ajustement *</span>
        <input name="reason" required placeholder="ex : combats non homologués, décision de la direction…"></label>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-action="close-modal">Annuler</button>
        <button class="btn btn-primary">Appliquer au palmarès</button>
      </div>
    </form>`);
  document.querySelectorAll('#record-form .step-btn').forEach(b => {
    b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      inp.value = (Math.trunc(Number(inp.value) || 0)) + Number(b.dataset.step);
    });
  });
  document.getElementById('record-form').addEventListener('submit', submitRecord);
}

function submitRecord(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const f = fighterById(form.dataset.id);
  if (!f) return;
  const deltas = {};
  ['w', 'l', 'n', 'ko'].forEach(k => {
    const v = Math.trunc(Number(form.elements[k].value) || 0);
    if (v) deltas[k] = v;
  });
  const reason = form.elements.reason.value.trim();
  if (!Object.keys(deltas).length || !reason) return;
  f.adj = f.adj || {};
  Object.entries(deltas).forEach(([k, v]) => { f.adj[k] = (Number(f.adj[k]) || 0) + v; });
  f.recordLog = [{ time: new Date().toISOString(), deltas, reason }, ...(f.recordLog || [])].slice(0, 50);
  const names = { w: 'V', l: 'D', n: 'N', ko: 'KO' };
  const txt = Object.entries(deltas).map(([k, v]) => names[k] + (v > 0 ? '+' : '') + v).join(' ');
  Store.log(`Palmarès ajusté pour ${f.name} (${txt}) — ${reason}`);
  Store.save();
  closeModal();
  render();
}

function closeSeason() {
  if (!confirm('Clôturer la saison ?\n\nLe top 10 actuel sera archivé et tous les ajustements manuels (points + palmarès) seront remis à zéro.')) return;
  D().seasons = D().seasons || [];
  const top = ranking().slice(0, 10).map(r => { const s = stats(r.f.id); return { name: r.f.name, pbufc: r.f.pbufc, pts: s.pts, w: s.w, l: s.l }; });
  D().seasons.unshift({ id: Store.uid(), closedAt: new Date().toISOString().slice(0, 10), top });
  D().fighters.forEach(f => { f.bonus = 0; f.adj = {}; });
  Store.log(`Saison clôturée — top ${top.length} archivé, ajustements remis à zéro`);
  Store.save();
  render();
}

function deleteItem(section, id) {
  const s = SCHEMAS[section];
  const idx = D()[section].findIndex(x => x.id === id);
  if (idx < 0) return;
  const item = D()[section][idx];
  const name = typeof s.rowTitle === 'function' ? s.rowTitle(item) : (item.name || item.belt || '');
  if (!confirm(`Supprimer « ${name} » ? Cette action est définitive.`)) return;
  D()[section].splice(idx, 1);
  Store.log(`Suppression ${s.singular} : ${name}`);
  Store.save();
  render();
}

/* ================= ACTIONS SPÉCIALES ================= */

function openFiche(id) {
  const f = fighterById(id);
  if (!f) return;
  const st = stats(id);
  const au = autoStats(id);
  const hisFights = D().fights.filter(ft => ft.f1Id === id || ft.f2Id === id)
    .sort((a, b) => String(b.date).localeCompare(a.date));
  const san = D().sanctions.filter(s => s.target === f.name);
  const champ = D().championships.find(c => c.championId === id);

  showModal(`
    <div class="fiche-head">
      ${avatar(f, 72)}
      <div>
        <h3>${esc(f.name)} ${f.nickname ? `<span class="gold">« ${esc(f.nickname)} »</span>` : ''}</h3>
        <p class="muted small mono">${esc(f.pbufc)} · ${esc(f.category)} · ${badge(f.status, STATUS_COLORS[f.status] || 'gray')}</p>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-card"><small>Palmarès</small><b>${st.w}V – ${st.l}D – ${st.n}N</b><small>${(st.adj.w || st.adj.l || st.adj.n || st.adj.ko) ? 'inclut ajustements manuels' : '100% combat automatique'}</small></div>
      <div class="stat-card"><small>Finitions</small><b>${st.ko} KO/Sub</b></div>
      <div class="stat-card gold-b"><small>Points</small><b class="gold">${st.pts}</b><small>${au.pts} auto + ${st.bonus} ajusté · Classé #${rankOf(id)}</small></div>
      ${champ ? `<div class="stat-card gold-b"><small>Champion</small><b>${esc(champ.belt.replace('Ceinture PBUFC — ', ''))}</b><small>${champ.defenses} défenses</small></div>` : ''}
    </div>
    <h4>Historique des combats (${hisFights.length})</h4>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Adversaire</th><th>Résultat</th><th>Méthode</th><th>Événement</th></tr></thead>
      <tbody>
        ${hisFights.map(ft => {
    const opp = ft.f1Id === id ? ft.f2Id : ft.f1Id;
    const res = !ft.winnerId ? badge('À venir', 'blue')
      : ft.winnerId === 'DRAW' ? badge('Nul', 'orange')
        : ft.winnerId === id ? badge('Victoire', 'green') : badge('Défaite', 'red');
    return `<tr><td>${fmtDate(ft.date)}</td><td>${esc(fighterName(opp))}</td><td>${res}</td><td>${ft.method ? esc(ft.method) + (ft.round ? ' R' + ft.round : '') : '—'}</td><td>${ft.eventId ? esc(eventName(ft.eventId)) : '—'}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="muted">Aucun combat.</td></tr>'}
      </tbody>
    </table></div>
    ${(f.pointsLog && f.pointsLog.length) ? `<h4>Ajustements de points</h4>${f.pointsLog.map(p => `<p class="small">• ${fmtDate(p.time)} — <b class="${p.delta > 0 ? 'rec' : 'exp'}">${p.delta > 0 ? '+' : ''}${p.delta} pt(s)</b> : ${esc(p.reason)}</p>`).join('')}` : ''}
    ${san.length ? `<h4>Sanctions (${san.length})</h4>${san.map(s => `<p class="small">• ${fmtDate(s.date)} — ${esc(s.severity)} : ${esc(s.reason)} <span class="muted">(${esc(s.status)})</span></p>`).join('')}` : ''}
    <div class="modal-actions"><button class="btn btn-outline" data-action="close-modal">Fermer</button></div>
  `);
}

function openCarte(eventId) {
  const e = D().events.find(x => x.id === eventId);
  if (!e) return;
  const fights = D().fights.filter(f => f.eventId === eventId)
    .sort((a, b) => (b.importance === 'Main Event') - (a.importance === 'Main Event'));
  const order = { 'Main Event': 0, 'Co-Main Event': 1, 'Carte principale': 2 };
  fights.sort((a, b) => (order[a.importance] ?? 3) - (order[b.importance] ?? 3));

  showModal(`
    <h3>Carte — FN #${esc(e.number)} ${esc(e.name.split('—')[1] || '')}</h3>
    <p class="muted small">${fmtDate(e.date)} · ${esc(e.time || '')} · ${esc(e.location || '')}</p>
    <div class="card-list">
      ${fights.map(f => `
        <div class="fight-line">
          <span class="imp-tag ${f.importance === 'Main Event' ? 'gold-b' : f.importance === 'Co-Main Event' ? 'silver-b' : ''}">${esc(f.importance || 'Carte')}</span>
          <div style="flex:1"><b>${esc(fighterName(f.f1Id))}</b><br>vs<br><b>${esc(fighterName(f.f2Id))}</b></div>
          <span>${!f.winnerId ? badge('À venir', 'blue') : f.winnerId === 'DRAW' ? 'Nul' : `<b class="gold">${esc(fighterName(f.winnerId))}</b><br><small>${esc(f.method || '')}</small>`}</span>
        </div>`).join('') || '<p class="muted">Aucun combat programmé sur ce gala.</p>'}
    </div>
    <div class="modal-actions"><button class="btn btn-outline" data-action="close-modal">Fermer</button></div>
  `);
}

function openPoints(id) {
  const f = fighterById(id);
  if (!f) return;
  const au = autoStats(id);
  showModal(`
    <h3>Ajustement de points — ${esc(f.name)}</h3>
    <p class="muted small">Palmarès automatique : <b>${au.pts} pts</b>${Number(f.bonus) ? ` · ajustement actuel : <b>${Number(f.bonus) > 0 ? '+' : ''}${Number(f.bonus)}</b>` : ' · aucun ajustement manuel'}</p>
    <form id="points-form" data-id="${id}">
      <div class="form-grid">
        <label class="field"><span>Action</span>
          <select name="dir">
            <option value="1">Attribuer des points (+)</option>
            <option value="-1">Retirer des points (−)</option>
          </select>
        </label>
        <label class="field"><span>Montant *</span><input type="number" name="amt" min="1" required placeholder="ex : 5"></label>
        <label class="field"><span>Motif *</span><input type="text" name="reason" required placeholder="ex : victoire hors gala, bonus du patron…"></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-action="close-modal">Annuler</button>
        <button class="btn btn-primary">Appliquer</button>
      </div>
    </form>`);
  document.getElementById('points-form').addEventListener('submit', submitPoints);
}

function submitPoints(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const f = fighterById(form.dataset.id);
  if (!f) return;
  const dir = Number(form.elements.dir.value);
  const amt = Math.abs(Number(form.elements.amt.value));
  const reason = form.elements.reason.value.trim();
  if (!amt || !reason) return;
  f.bonus = (Number(f.bonus) || 0) + dir * amt;
  f.pointsLog = [{ time: new Date().toISOString(), delta: dir * amt, reason }, ...(f.pointsLog || [])].slice(0, 50);
  Store.log(`Points ${dir * amt > 0 ? '+' : ''}${dir * amt} pour ${f.name} — ${reason}`);
  Store.save();
  closeModal();
  render();
}

/* ================= MODALE GÉNÉRIQUE ================= */

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.style.overflow = '';
}
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') closeModal();
});

/* ================= EXPORT / IMPORT / RESET ================= */

function exportJSON() {
  const blob = new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pbafc-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('import-file').addEventListener('change', ev => {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.fighters) throw new Error('format invalide');
      localStorage.setItem(Store.KEY, JSON.stringify(parsed));
      location.reload();
    } catch (err) { alert('Fichier de sauvegarde invalide.'); }
  };
  reader.readAsText(file);
});

/* ================= ÉCOUTEURS ================= */

document.addEventListener('click', e => {
  const ddBtn = e.target.closest('[data-dropdown]');
  if (ddBtn) {
    const grp = ddBtn.parentElement;
    const wasOpen = grp.classList.contains('open');
    closeMenus();
    if (!wasOpen) grp.classList.add('open');
    return;
  }
  if (!e.target.closest('#nav')) closeMenus();

  const routeBtn = e.target.closest('[data-route]');
  if (routeBtn) {
    location.hash = '#' + routeBtn.dataset.route;
    closeMenus();
    document.getElementById('topnav').classList.remove('open');
    return;
  }

  const gotoBtn = e.target.closest('[data-action="goto"]');
  const chip = e.target.closest('[data-rank-cat]');
  if (chip) { rankedState.cat = chip.dataset.rankCat; render(); return; }
  if (gotoBtn) {
    location.hash = gotoBtn.dataset.target;
    document.getElementById('topnav').classList.remove('open');
    return;
  }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, section, id, target } = el.dataset;

  switch (action) {
    case 'add': openForm(section); break;
    case 'edit': openForm(section, id); break;
    case 'del': deleteItem(section, id); break;
    case 'fiche': openFiche(id); break;
    case 'carte': openCarte(id); break;
    case 'points': openPoints(id); break;
    case 'record': openRecord(id); break;
    case 'close-season': closeSeason(); break;
    case 'close-modal': closeModal(); break;
    case 'export': exportJSON(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset':
      if (confirm('Réinitialiser TOUTES les données du club ? Tout repartira de zéro.')) { Store.reset(); render(); }
      break;
  }
});

document.addEventListener('input', e => {
  const inp = e.target.closest('[data-filter-table]');
  if (!inp) return;
  const q = inp.value.toLowerCase();
  document.querySelectorAll(`[data-tbody-for="${inp.dataset.filterTable}"] tbody tr`).forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

document.addEventListener('toggle', e => {
  const det = e.target.closest('.manage-details');
  if (det && det.open) det.querySelector('.search-input, input')?.focus?.();
}, true);

function closeMenus() {
  document.querySelectorAll('.menu-group.open').forEach(m => m.classList.remove('open'));
}

document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('topnav').classList.toggle('open');
});
window.addEventListener('hashchange', render);

Store.load();
render();
console.log('PBUFC — Panel de gestion chargé.');
