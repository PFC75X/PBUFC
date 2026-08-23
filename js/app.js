const D = () => Store.data;

const CATEGORIES = ['Poids paille', 'Poids mouche', 'Poids coq', 'Poids plume', 'Poids léger', 'Poids welter', 'Poids moyen', 'Poids lourd'];
const FIGHTER_STATUS = ['Actif', 'Blessé', 'Suspendu', 'Retraité'];
const STAFF_ROLES = ['Patron', 'Co-Patron', 'Fight Manager', 'Comptable', 'Sécurité', 'Barman', 'Danseuse', 'Coach', 'Médecin', 'Autre'];

const AC_CATS = {
  Recette: ['Billetterie gala', 'Bar & boutique', 'Sponsors', 'Cotisations membres', 'Paris & mises', 'Amendes', 'Autre recette'],
  'Dépense': ['Salaires staff', 'Primes de combat', 'Organisation gala', 'Salle & charges', 'Matériel & soins', 'Communication', 'Autre dépense']
};
let acMonth = '';
const KO_METHODS = ['KO', 'TKO', 'Soumission'];
const METHODS = [...KO_METHODS, 'Décision unanime', 'Décision split', 'Abandon', 'Autre'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const money = n => Number(n || 0).toLocaleString('fr-FR') + ' $';
const fmtDate = d => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtDateTime = iso => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

function fighterById(id) { return D().fighters.find(f => f.id === id); }
function fighterName(id) { const f = fighterById(id); return f ? f.name + (f.nickname ? ` « ${f.nickname} »` : '') : '—'; }
function eventName(id) { const e = D().events.find(x => x.id === id); return e ? `#${e.number} ${e.name.split('—')[1] || ''}` : '—'; }

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
    if (ft.winnerId === 'DRAW') { n++; return; }
    if (ft.winnerId === fid) { w++; pts += ft.method === 'Abandon' ? 2 : 4; if (KO_METHODS.includes(ft.method)) ko++; }
    else { l++; pts -= 4; }
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

function teamById(tid) { return (D().teams || []).find(t => t.id === tid); }
function teamName(tid) { const t = teamById(tid); return t ? t.name : '—'; }
function teamStats(tid) {
  let w = 0, l = 0, n = 0, pts = 0;
  (D().tfights || []).forEach(f => {
    if (!f.winnerId || (f.t1Id !== tid && f.t2Id !== tid)) return;
    const sz = Math.max(1, Number(f.size || 1));
    if (f.winnerId === 'DRAW') { n++; return; }
    if (f.winnerId === tid) { w++; pts += 2 * sz; } else { l++; pts -= 2 * sz; }
  });
  const t = teamById(tid);
  pts += Number(t?.bonus || 0);
  return { w, l, n, pts };
}
function teamRanking() {
  return D().teams.map(t => ({ t, s: teamStats(t.id) }))
    .sort((a, b) => b.s.pts - a.s.pts || b.s.w - a.s.w || a.t.name.localeCompare(b.t.name));
}
function memberStack(ids, size = 26) {
  const list = (ids || []).map(id => fighterById(id)).filter(Boolean);
  return `<span class="avstack">${list.slice(0, 6).map(m => avatar(m, size)).join('')}${list.length > 6 ? `<span class="av-more" style="width:${size}px;height:${size}px">+${list.length - 6}</span>` : ''}</span>`;
}
function teamDot(tid) {
  const t = teamById(tid);
  return `<span class="team-dot" style="background:${esc(t?.color || '#e5304a')}"></span>${esc(t ? t.name : '—')}`;
}

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
    group: 'Fighting League', items: [
      { id: 'fighters', label: 'Combattants' },
      { id: 'ranked', label: 'Ranked' },
      { id: 'fights', label: 'Combats' }
    ]
  },
  {
    group: 'Team Fighting League', items: [
      { id: 'teams', label: 'Équipes' },
      { id: 'tranked', label: 'TFL Ranking' },
      { id: 'tfights', label: 'Combats TFL' }
    ]
  },
  {
    group: 'Le Club', items: [
      { id: 'events', label: 'Galas & Soirées' },
      { id: 'championships', label: 'Championnat' },
      { id: 'staff', label: 'Staff' },
      { id: 'sanctions', label: 'Sanctions' },
      { id: 'hof', label: 'Hall of Fame' }
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

  teams: {
    title: 'Équipes TFL', singular: 'Équipe', icon: '🛡️',
    desc: 'Team Fighting League : enregistre les équipes qui s’affrontent en Team vs Team.',
    columns: [
      { label: 'Équipe', get: t => `<div class="cell-flex"><span class="team-dot" style="background:${esc(t.color || '#e5304a')}"></span><div><b>${esc(t.name)}</b>${t.tag ? ` <small class="muted">[${esc(t.tag)}]</small>` : ''}</div></div>` },
      { label: 'Membres', get: t => memberStack(t.members) },
      { label: 'Capitaine', get: t => esc(fighterName(t.captainId)) },
      { label: 'Bilan TFL', get: t => { const s = teamStats(t.id); return `<span class="rec">${s.w}V</span> · <span class="gray">${s.l}D</span> · <span class="gray">${s.n}N</span>`; } },
      { label: 'Points', get: t => `<b>${teamStats(t.id).pts}</b> pts` },
      { label: 'Statut', get: t => badge(t.status || 'Actif', t.status === 'Actif' ? 'green' : t.status === 'Dissous' ? 'red' : 'gray') }
    ],
    fields: [
      { key: 'name', label: 'Nom de l’équipe *', required: true },
      { key: 'tag', label: 'Sigle', placeholder: 'ex : HBK' },
      { key: 'color', label: 'Couleur', type: 'color', value: '#e5304a' },
      { key: 'members', label: 'Membres (combattants licenciés)', type: 'members' },
      { key: 'captainId', label: 'Capitaine', type: 'select', options: () => [{ v: '', l: '— Aucun —' }, ...D().fighters.map(f => ({ v: f.id, l: f.name }))] },
      { key: 'status', label: 'Statut', type: 'select', options: ['Actif', 'Inactif', 'Dissous'] }
    ],
    actions: t => `<button class="row-btn" data-action="points" data-section="teams" data-id="${t.id}">Points</button>
        <button class="row-btn" data-action="teamfiche" data-id="${t.id}">Fiche</button>`,
    onSave(item, isNew) {
      if (isNew) {
        item.createdAt = new Date().toISOString().slice(0, 10);
        Store.log(`Nouvelle équipe TFL : ${item.name}${item.members?.length ? ` (${item.members.length} membre(s))` : ''}`);
      }
    },
    rowTitle: t => t.name
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
    sortFn: (a, b) => {
      const ra = STAFF_ROLES.indexOf(a.role), rb = STAFF_ROLES.indexOf(b.role);
      return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || String(a.name || '').localeCompare(b.name || '');
    },
    rowTitle: m => m.name
  },

  fights: {
    title: 'Combats', singular: 'Combat', icon: '🤜',
    desc: 'Fighting League (1 vs 1). Enregistrer un résultat met à jour automatiquement le Ranked : victoire +4, défaite −4, nul 0, abandon adverse +2.',
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
      { key: 'eventId', label: 'Événement', type: 'select', options: () => D().events.map(e => ({ v: e.id, l: `#${e.number} — ${e.name}` })) },
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

  tfights: {
    title: 'Combats TFL', singular: 'Combat TFL', icon: '⚔️',
    desc: 'Team Fighting League (équipe vs équipe). Victoire : +2 pts par combattant dans l’arène · défaite : −2 pts par combattant.',
    columns: [
      { label: 'Date', get: f => fmtDate(f.date) },
      { label: 'Affiche', get: f => `<div class="cell-flex"><span class="team-dot" style="background:${esc(teamById(f.t1Id)?.color || '#e5304a')}"></span><b>${esc(teamName(f.t1Id))}</b><small class="muted">&nbsp;vs&nbsp;</small><span class="team-dot" style="background:${esc(teamById(f.t2Id)?.color || '#3d6fe5')}"></span><b>${esc(teamName(f.t2Id))}</b></div>` },
      { label: 'Arène', get: f => `<b>${f.size || 1}</b> v <b>${f.size || 1}</b>` },
      { label: 'Événement', get: f => f.eventId ? esc(eventName(f.eventId)) : '<small class="muted">Hors gala</small>' },
      { label: 'Résultat', get: f => !f.winnerId ? badge('À venir', 'blue') : f.winnerId === 'DRAW' ? badge('Match nul', 'orange') : `<div class="cell-flex"><span class="team-dot" style="background:${esc(teamById(f.winnerId)?.color || '#e5304a')}"></span><b>${esc(teamName(f.winnerId))} gagne</b></div>` },
      { label: 'Points', get: f => { if (!f.winnerId || f.winnerId === 'DRAW') return '—'; const sz = Math.max(1, Number(f.size || 1)); return `<span class="rec">+${2 * sz}</span> / <span class="exp">−${2 * sz}</span>`; } },
      { label: 'Notes', get: f => f.notes ? `<small>${esc(f.notes)}</small>` : '—' }
    ],
    fields: [
      { key: 'eventId', label: 'Événement', type: 'select', options: () => D().events.map(e => ({ v: e.id, l: `#${e.number} — ${e.name}` })) },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 't1Id', label: 'Équipe 1 *', type: 'select', options: () => D().teams.map(t => ({ v: t.id, l: t.name })), required: true },
      { key: 't2Id', label: 'Équipe 2 *', type: 'select', options: () => D().teams.map(t => ({ v: t.id, l: t.name })), required: true },
      { key: 'size', label: 'Combattants par équipe dans l’arène *', type: 'number', value: 3, required: true },
      { key: 'winnerId', label: 'Vainqueur', type: 'select', options: () => [{ v: '', l: '— Combat à venir / non tranché —' }, ...D().teams.map(t => ({ v: t.id, l: t.name })), { v: 'DRAW', l: 'MATCH NUL' }] },
      { key: 'referee', label: 'Arbitre' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    onSave(item, isNew) {
      if (isNew && item.winnerId && item.winnerId !== 'DRAW') {
        const sz = Math.max(1, Number(item.size || 1));
        Store.log(`TFL : ${teamName(item.t1Id)} vs ${teamName(item.t2Id)} → ${teamName(item.winnerId)} gagne (${sz} v ${sz}, ±${2 * sz} pts)`);
      }
    },
    rowTitle: f => `${teamName(f.t1Id)} vs ${teamName(f.t2Id)}`
  },

  events: {
    title: 'Événements', singular: 'Événement', icon: '📅',
    desc: 'Galas Fight Night (avec enjeux) et soirées hors-enjeux : carte des combats, horaires, main event.',
    columns: [
      { label: '#', get: e => `<b class="mono">#${esc(e.number)}</b>` },
      { label: 'Nom', get: e => `<b>${esc(e.name)}</b> ${badge(e.type || 'Gala', e.type === 'Soirée' ? 'purple' : 'gold')}${e.notes ? `<br><small class="muted">${esc(e.notes)}</small>` : ''}` },
      { label: 'Date & heure', get: e => `${fmtDate(e.date)}<br><small class="muted">${esc(e.time || '')}</small>` },
      { label: 'Lieu', get: e => esc(e.location || '—') },
      { label: 'Carte', get: e => { const n = D().fights.filter(f => f.eventId === e.id).length; const me = D().fights.find(f => f.eventId === e.id && f.importance === 'Main Event'); return `${n} combat(s)${me ? `<br><small class="gold">★ ME : ${esc(fighterName(me.f1Id))} vs ${esc(fighterName(me.f2Id))}</small>` : ''}`; } },
      { label: 'Statut', get: e => badge(e.status, e.status === 'À venir' ? 'blue' : e.status === 'Terminé' ? 'green' : 'red') }
    ],
    fields: [
      { key: 'number', label: 'Numéro FN (vide = auto)', placeholder: 'ex : 009' },
      { key: 'name', label: 'Nom de l’événement *', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Gala', 'Soirée'] },
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
    desc: 'Tarifs officiels PBUFC : Entrée Spectateur 250 $/pers · Entrée VIP 750 $/pers · Inscription Combattant 150 $/combattant.',
    before() {
      const t = D().tickets;
      const sum = ty => t.filter(x => x.type === ty);
      const totalPaid = t.filter(x => x.paid).reduce((s, x) => s + x.price * x.qty, 0);
      const pending = t.filter(x => !x.paid).reduce((s, x) => s + x.price * x.qty, 0);
      return `
        <div class="stat-row">
          <div class="stat-card"><small>Entrées Spectateur</small><b>${sum('Spectateur').reduce((s, x) => s + x.qty, 0)}</b><small>250 $/pers</small></div>
          <div class="stat-card gold-b"><small>Entrées VIP</small><b>${sum('VIP').reduce((s, x) => s + x.qty, 0)}</b><small>750 $/pers</small></div>
          <div class="stat-card purple"><small>Inscriptions combattants</small><b>${sum('Inscription Combattant').reduce((s, x) => s + x.qty, 0)}</b><small>150 $/combattant</small></div>
          <div class="stat-card green"><small>Encaissé</small><b>${money(totalPaid)}</b></div>
          <div class="stat-card orange"><small>En attente</small><b>${money(pending)}</b></div>
        </div>`;
    },
    columns: [
      { label: 'Date', get: t => fmtDate(t.date) },
      { label: 'Acheteur', get: t => `<b>${esc(t.buyer)}</b>` },
      { label: 'Type', get: t => badge(t.type, t.type === 'VIP' ? 'gold' : t.type === 'Inscription Combattant' ? 'purple' : 'blue') },
      { label: 'Qté', get: t => t.qty },
      { label: 'Prix unit.', get: t => money(t.price) },
      { label: 'Total', get: t => `<b>${money(t.price * t.qty)}</b>` },
      { label: 'Paiement', get: t => t.paid ? badge('Payé', 'green') : badge('Impayé', 'orange') }
    ],
    fields: [
      { key: 'buyer', label: 'Acheteur / Réservation *', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Spectateur', 'VIP', 'Inscription Combattant'] },
      { key: 'qty', label: 'Quantité', type: 'number', value: 1 },
      { key: 'price', label: 'Prix unitaire ($)', type: 'number', value: 250 },
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
    desc: 'Journal détaillé : recettes, dépenses, catégories, méthodes de paiement et suivi par gala.',
    before() {
      const all = D().accounting;
      const rows = (acMonth ? all.filter(a => String(a.date || '').startsWith(acMonth)) : all)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      const r = rows.filter(a => a.type === 'Recette').reduce((s, a) => s + Number(a.amount || 0), 0);
      const d = rows.filter(a => a.type === 'Dépense').reduce((s, a) => s + Number(a.amount || 0), 0);
      const catSum = t => { const m = {}; rows.filter(a => a.type === t).forEach(a => { const k = a.category || 'Autre'; m[k] = (m[k] || 0) + Number(a.amount || 0); }); return Object.entries(m).sort((x, y) => y[1] - x[1]); };
      const rc = catSum('Recette'), dc = catSum('Dépense');
      const maxR = Math.max(1, ...rc.map(x => x[1])), maxD = Math.max(1, ...dc.map(x => x[1]));
      const bars = (list, max, color) => list.map(([k, v]) => `
        <div class="ac-line"><span>${esc(k)}</span><div class="ac-bar"><i style="width:${Math.max(3, Math.round(v / max * 100))}%;background:${color}"></i></div><b>${money(v)}</b></div>`).join('') || '<p class="muted small">Aucune opération sur la période.</p>';
      const g = recettes() - depenses();
      return `
        <div class="ac-toolbar">
          <label class="ac-month"><span>Période :</span><input type="month" id="ac-month" value="${esc(acMonth)}"></label>
          ${acMonth ? '<button class="btn btn-ghost btn-sm" data-action="ac-all">Tous les mois</button>' : ''}
          <button class="btn btn-outline btn-sm" data-action="export-compta">Exporter CSV</button>
        </div>
        <div class="stat-row">
          <div class="stat-card ${g >= 0 ? 'green' : 'red'}"><small>Solde global</small><b>${money(g)}</b><small>toutes périodes</small></div>
          <div class="stat-card"><small>Recettes</small><b class="rec">+${money(r)}</b><small>${esc(acMonth || 'toutes périodes')}</small></div>
          <div class="stat-card"><small>Dépenses</small><b class="exp">−${money(d)}</b><small>${esc(acMonth || 'toutes périodes')}</small></div>
          <div class="stat-card ${r - d >= 0 ? 'green' : 'red'}"><small>Résultat période</small><b>${money(r - d)}</b><small>${rows.length} opération(s)</small></div>
        </div>
        <div class="ac-grid">
          <div class="panel ac-panel"><h4>Recettes par catégorie</h4>${bars(rc, maxR, '#22c55e')}</div>
          <div class="panel ac-panel"><h4>Dépenses par catégorie</h4>${bars(dc, maxD, '#e5304a')}</div>
        </div>`;
    },
    columns: [
      { label: 'Date', get: a => fmtDate(a.date) },
      { label: 'Libellé', get: a => `<b>${esc(a.label)}</b>${a.ref ? `<br><small class="muted">${esc(a.ref)}</small>` : ''}` },
      { label: 'Type', get: a => a.type === 'Recette' ? badge('Recette', 'green') : badge('Dépense', 'red') },
      { label: 'Catégorie', get: a => esc(a.category || '—') },
      { label: 'Paiement', get: a => esc(a.method || '—') },
      { label: 'Montant', get: a => `<b class="${a.type === 'Recette' ? 'rec' : 'exp'}">${a.type === 'Recette' ? '+' : '−'}${money(a.amount)}</b>` }
    ],
    sortFn: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
    fields: [
      { key: 'label', label: 'Libellé *', required: true, placeholder: 'ex : Recettes bar gala du 15' },
      { key: 'type', label: 'Type', type: 'select', options: ['Recette', 'Dépense'] },
      { key: 'category', label: 'Catégorie', type: 'select', options: [...AC_CATS.Recette, ...AC_CATS['Dépense']] },
      { key: 'amount', label: 'Montant ($)', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'method', label: 'Méthode de paiement', type: 'select', options: ['Espèces', 'Carte', 'Virement', 'Crypto'] },
      { key: 'ref', label: 'Référence / Gala concerné', placeholder: 'ex : Gala Blood Night — salle A' }
    ],
    afterForm(form) {
      const tsel = form.elements.type, csel = form.elements.category;
      if (!tsel || !csel) return;
      const sync = () => { const cur = csel.value; csel.innerHTML = (AC_CATS[tsel.value] || []).map(c => `<option${c === cur ? ' selected' : ''}>${c}</option>`).join(''); };
      tsel.addEventListener('change', sync); sync();
    },
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
        <p class="hero-kicker">PlayBoy Underground Fight Club · Panel officiel</p>
        <h2 class="hero-title">PB<em>UFC</em></h2>
        <p class="hero-sub">${next ? `Prochaine ${next.type === 'Soirée' ? 'soirée hors-enjeux' : 'nuit de combat'} : #${esc(next.number)} ${esc(next.name)} — ${fmtDate(next.date)}, ${esc(next.location || 'lieu à confirmer')}.` : 'Aucun événement planifié pour le moment.'}</p>
      </section>
      <div class="stat-row">
        <div class="stat-card"><small>Prochain événement</small><b>${next ? `#${esc(next.number)}` : '—'}</b><small>${next ? `${next.type === 'Soirée' ? 'Soirée' : 'Gala'} · ${fmtDate(next.date)}` : 'aucun planifié'}</small></div>
        <div class="stat-card"><small>Combattants actifs</small><b>${activeFighters}</b><small>sur ${D().fighters.length} licenciés PBUFC</small></div>
        <div class="stat-card purple"><small>Équipes TFL</small><b>${D().teams.filter(t => t.status !== 'Dissous').length}</b><small>${D().tfights.length} combat(s) d’équipe</small></div>
        <div class="stat-card"><small>Ceintures en jeu</small><b>${D().championships.length}</b><small>${champLine().replace(/<[^>]+>/g, '').split(':').length - 1} champions titrés</small></div>
        <div class="stat-card ${r - d >= 0 ? 'green' : 'red'}"><small>Solde du club</small><b>${money(r - d)}</b><small>+${money(r)} / −${money(d)}</small></div>
      </div>

      <div class="dash-grid">
        <section class="panel">
          <h3>Prochains événements</h3>
          ${nextEvents().slice(0, 4).map(e => `
            <div class="list-item">
              <span class="mono gold">#${esc(e.number)}</span>
              <div style="flex:1"><b>${esc(e.name.split('—')[1] || e.name)}</b> <small class="muted">${esc(e.type || 'Gala')}</small><br><small class="muted">${fmtDate(e.date)} · ${esc(e.time || '')} · ${esc(e.location)}</small></div>
              <button class="btn btn-ghost btn-sm" data-action="goto" data-target="#events">Ouvrir</button>
            </div>`).join('') || '<p class="muted">Aucun événement à venir.</p>'}
        </section>

        <section class="panel">
          <h3>Top 5 — Fighting League</h3>
          ${top5.map((row, i) => `
            <div class="list-item">
              <span class="rank r-${i + 1}">${i + 1}</span>
              <div style="flex:1"><b>${esc(row.f.name)}</b> <small class="muted">${esc(row.f.category)}</small></div>
              <span class="pts">${row.s.pts} pts <small class="muted">(${row.s.w}V-${row.s.l}D)</small></span>
            </div>`).join('')}
          <button class="btn btn-ghost btn-sm full-w" data-action="goto" data-target="#ranked">Voir le Ranked FL →</button>
        </section>

        <section class="panel">
          <h3>Top équipes — Team Fighting League</h3>
          ${teamRanking().slice(0, 5).map((row, i) => `
            <div class="list-item">
              <span class="rank r-${i + 1}">${i + 1}</span>
              <div style="flex:1"><span class="team-dot" style="background:${esc(row.t.color || '#e5304a')}"></span><b>${esc(row.t.name)}</b> <small class="muted">${row.t.members?.length || 0} membre(s)</small></div>
              <span class="pts">${row.s.pts} pts <small class="muted">(${row.s.w}V-${row.s.l}D)</small></span>
            </div>`).join('') || '<p class="muted">Aucune équipe enregistrée.</p>'}
          <button class="btn btn-ghost btn-sm full-w" data-action="goto" data-target="#tranked">Voir le TFL Ranking →</button>
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
        <div><h2>Ranked — Fighting League</h2><p class="muted">Barème : victoire <b class="rec">+4</b> · défaite <b class="exp">−4</b> · nul 0 · abandon adverse <b class="rec">+2</b>. Ajustez points et palmarès manuellement, suivez la forme.</p></div>
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
            const pct = Math.max(0, Math.round(s.pts / maxPts * 100));
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
              <td style="min-width:120px"><b class="gold" style="font-size:1.05rem">${s.pts}</b><div class="bar"><i style="width:${pct}%"></i></div></td>              <td class="actions-cell">
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
            ${se.teams && se.teams.length ? `<p class="small" style="margin:8px 0 2px"><b>Équipes TFL :</b></p><ol class="season-list">
              ${se.teams.slice(0, 5).map(t => `<li><b>${esc(t.name)}</b>${t.tag ? ` <small class="muted">[${esc(t.tag)}]</small>` : ''} — <span class="gold">${t.pts} pts</span> <small class="muted">(${t.w}V-${t.l}D)</small></li>`).join('')}
            </ol>` : ''}
          </div>`).join('')}
      </details>` : ''}`;
  },

  teams() {
    const list = teamRanking();
    return `
      <div class="section-head">
        <div><h2>Équipes — Team Fighting League</h2><p class="muted">Enregistre les équipes, compose les rosters et suis leurs points TFL.</p></div>
        <button class="btn btn-primary" data-action="add" data-section="teams">+ Ajouter une équipe</button>
      </div>
      <div class="team-cards">
        ${list.map(({ t, s }) => `
          <div class="team-card" style="--tc:${esc(t.color || '#e5304a')}">
            <div class="tc-head">
              <span class="tc-tag">${esc(t.tag || t.name.slice(0, 3).toUpperCase())}</span>
              ${badge(t.status || 'Actif', t.status === 'Actif' ? 'green' : t.status === 'Dissous' ? 'red' : 'gray')}
              <b class="tc-pts">${s.pts}<small>pts</small></b>
            </div>
            <h4>${esc(t.name)}</h4>
            <p class="muted small" style="margin:0 0 10px">Capitaine : <b>${esc(fighterName(t.captainId))}</b> · ${(t.members || []).length} membre(s)</p>
            ${memberStack(t.members, 30)}
            <div class="tc-foot">
              <span class="rec">${s.w}V</span> · <span class="gray">${s.l}D</span> · <span class="gray">${s.n}N</span>
              <span class="tc-actions">
                <button class="row-btn ok" data-action="teamfiche" data-id="${t.id}">Fiche</button>
                <button class="row-btn" data-action="edit" data-section="teams" data-id="${t.id}">Modifier</button>
                <button class="row-btn danger" data-action="del" data-section="teams" data-id="${t.id}">Supprimer</button>
              </span>
            </div>
          </div>`).join('')}
        ${list.length ? '' : '<p class="muted">Aucune équipe. Clique sur « Ajouter une équipe » pour créer la première.</p>'}
      </div>`;
  },

  tranked() {
    const rows = teamRanking();
    const maxPts = Math.max(1, ...rows.map(r => r.s.pts));
    const podium = rows.slice(0, 3).map((r, i) => `
      <div class="pod-card p${i + 1}" style="--pc:${esc(r.t.color || '#e5304a')}">
        <span class="pod-place">${i + 1}</span>
        <span class="tc-tag big">${esc(r.t.tag || r.t.name.slice(0, 3).toUpperCase())}</span>
        <div><b>${esc(r.t.name)}</b><small class="muted">${(r.t.members || []).length} membre(s) · cap. ${esc(fighterName(r.t.captainId))}</small></div>
        <b class="pod-pts">${r.s.pts}<small>pts</small></b>
      </div>`).join('');
    return `
      <div class="section-head">
        <div><h2>TFL Ranking</h2><p class="muted">Classement des équipes. Barème : victoire <b class="rec">+2 pts / combattant dans l’arène</b> · défaite <b class="exp">−2 pts / combattant</b>.</p></div>
      </div>
      <div class="podium">${podium}</div>
      <input class="search-input" placeholder="Rechercher une équipe…" data-filter-table="tranked">
      <div class="table-wrap panel"><table data-tbody-for="tranked">
        <thead><tr>
          <th>#</th><th>Équipe</th><th>Membres</th><th>V-D-N</th><th>Détail points</th><th>Total</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${rows.map(({ t, s }, i) => {
            const pct = Math.max(0, Math.round(s.pts / maxPts * 100));
            return `
            <tr>
              <td><span class="rank r-${i + 1}">${i + 1}</span></td>
              <td><div class="cell-flex"><span class="team-dot" style="background:${esc(t.color || '#e5304a')}"></span><div><b>${esc(t.name)}</b>${t.tag ? ` <small class="muted">[${esc(t.tag)}]</small>` : ''}</div></div></td>
              <td>${memberStack(t.members, 24)}</td>
              <td><span class="rec">${s.w}</span>-<span class="gray">${s.l}</span>-<span class="gray">${s.n}</span></td>
              <td><small class="muted">combats ${s.pts - (Number(t.bonus) || 0)}</small>${Number(t.bonus) ? ` · <small class="gold">ajusté ${Number(t.bonus) > 0 ? '+' : ''}${t.bonus}</small>` : ''}</td>
              <td style="min-width:120px"><b class="gold" style="font-size:1.05rem">${s.pts}</b><div class="bar"><i style="width:${pct}%"></i></div></td>
              <td class="actions-cell">
                <button class="row-btn ok" data-action="points" data-section="teams" data-id="${t.id}">Points</button>
                <button class="row-btn" data-action="teamfiche" data-id="${t.id}">Fiche</button>
              </td>
            </tr>`;
          }).join('')}
          ${rows.length ? '' : '<tr><td colspan="7" class="muted center">Aucune équipe enregistrée.</td></tr>'}
        </tbody>
      </table></div>`;
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
  const raw = D()[section];
  const items = typeof s.sortFn === 'function' ? [...raw].sort(s.sortFn) : raw;
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
    case 'color': input = `<input type="color" name="${f.key}" value="${esc(val || f.value || '#e5304a')}">`; break;
    case 'members': {
      const cur = Array.isArray(val) ? val : [];
      input = D().fighters.length ? `<div class="members-grid">${D().fighters.map(m => `
        <label class="member-pick ${cur.includes(m.id) ? 'on' : ''}"><input type="checkbox" name="members" value="${m.id}" ${cur.includes(m.id) ? 'checked' : ''}>${avatar(m, 22)}<span>${esc(m.name)}</span></label>`).join('')}</div>`
        : '<p class="muted small" style="grid-column:1/-1;margin:0">Enregistre d’abord des combattants pour composer l’équipe.</p>';
      return `<div class="field field-wide"><span>${f.label}</span>${input}</div>`;
    }
    default: input = `<input type="text" name="${f.key}" value="${esc(val)}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">`;
  }
  return `<label class="field ${f.type === 'members' ? 'field-wide' : ''}"><span>${f.label}</span>${input}</label>`;
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
  if (typeof s.afterForm === 'function') s.afterForm(document.getElementById('entity-form'));
}

function submitEntityForm(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const section = form.dataset.section;
  const id = form.dataset.id;
  const s = SCHEMAS[section];
  const values = {};
  s.fields.forEach(f => {
    if (f.type === 'members') { values[f.key] = [...form.querySelectorAll('input[name="members"]:checked')].map(i => i.value); return; }
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

function openTeamFiche(id) {
  const t = teamById(id);
  if (!t) return;
  const s = teamStats(id);
  const roster = (t.members || []).map(mid => fighterById(mid)).filter(Boolean);
  const hist = D().tfights.filter(f => f.t1Id === id || f.t2Id === id)
    .sort((a, b) => String(b.date).localeCompare(a.date));
  showModal(`
    <div class="team-banner" style="--tc:${esc(t.color || '#e5304a')}">
      <span class="tc-tag big">${esc(t.tag || t.name.slice(0, 3).toUpperCase())}</span>
      <h3 style="margin:0">${esc(t.name)}</h3>
    </div>
    <p class="muted small">Capitaine : <b>${esc(fighterName(t.captainId))}</b> · Statut : ${esc(t.status || 'Actif')} · Créée le ${fmtDate(t.createdAt)}</p>
    <div class="stat-row">
      <div class="stat-card gold-b"><small>Points TFL</small><b>${s.pts}</b></div>
      <div class="stat-card"><small>Bilan</small><b>${s.w}V – ${s.l}D – ${s.n}N</b></div>
      <div class="stat-card"><small>Membres</small><b>${roster.length}</b></div>
    </div>
    <h4>Effectif</h4>
    <div class="card-list">
      ${roster.map(m => { const ms = stats(m.id); return `
        <div class="list-item">
          ${avatar(m, 34)}
          <div style="flex:1"><b>${esc(m.name)}</b> <small class="muted">${esc(m.category || '')}${m.id === t.captainId ? ' · 🅲 capitaine' : ''}</small></div>
          <span class="pts">${ms.w}V-${ms.l}D <small class="muted">FL ${ms.pts} pts</small></span>
        </div>`; }).join('') || '<p class="muted small">Aucun membre enregistré.</p>'}
    </div>
    <h4>Combats TFL (${hist.length})</h4>
    <div class="card-list" style="max-height:220px;overflow:auto">
      ${hist.map(f => {
        const win = !f.winnerId ? null : f.winnerId === 'DRAW' ? 'n' : f.winnerId === id ? 'w' : 'l';
        const res = win === 'w' ? '<b class="rec">V</b>' : win === 'l' ? '<b class="exp">D</b>' : win === 'n' ? '<b>N</b>' : '<span class="muted">—</span>';
        return `<div class="fight-line"><span>${res}</span><div style="flex:1"><b>${esc(teamName(f.t1Id))}</b> vs <b>${esc(teamName(f.t2Id))}</b><br><small class="muted">${fmtDate(f.date)}${f.size ? ` · ${f.size} v ${f.size}` : ''}</small></div><span>${win === 'w' ? `<span class="rec">+${2 * Math.max(1, Number(f.size || 1))}</span>` : win === 'l' ? `<span class="exp">−${2 * Math.max(1, Number(f.size || 1))}</span>` : ''}</span></div>`;
      }).join('') || '<p class="muted small">Aucun combat d’équipe.</p>'}
    </div>
    ${(t.pointsLog && t.pointsLog.length) ? `<h4>Ajustements de points</h4>${t.pointsLog.map(p => `<p class="small">• ${fmtDate(p.time)} — <b class="${p.delta > 0 ? 'rec' : 'exp'}">${p.delta > 0 ? '+' : ''}${p.delta} pt(s)</b> : ${esc(p.reason)}</p>`).join('')}` : ''}
    <div class="modal-actions"><button class="btn btn-outline" data-action="close-modal">Fermer</button></div>
  `);
}

function closeSeason() {
  askConfirm('Clôturer la saison', 'Les tops 10 FL et équipes TFL seront archivés et tous les ajustements manuels remis à zéro.', () => {
    D().seasons = D().seasons || [];
    const topF = ranking().slice(0, 10).map(r => { const s = stats(r.f.id); return { name: r.f.name, pbufc: r.f.pbufc, pts: s.pts, w: s.w, l: s.l }; });
    const topT = teamRanking().slice(0, 10).map(r => { return { name: r.t.name, tag: r.t.tag || '', pts: r.s.pts, w: r.s.w, l: r.s.l }; });
    D().seasons.unshift({ id: Store.uid(), closedAt: new Date().toISOString().slice(0, 10), top: topF, teams: topT });
    D().fighters.forEach(f => { f.bonus = 0; f.adj = {}; });
    D().teams.forEach(t => { t.bonus = 0; });
    Store.log(`Saison clôturée — top ${topF.length} combattants + top ${topT.length} équipes archivés, ajustements remis à zéro`);
    Store.save();
    render();
  });
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

function deleteItem(section, id) {
  const s = SCHEMAS[section];
  const idx = D()[section].findIndex(x => x.id === id);
  if (idx < 0) return;
  const item = D()[section][idx];
  const name = typeof s.rowTitle === 'function' ? s.rowTitle(item) : (item.name || item.belt || '');
  askConfirm('Supprimer', `Supprimer « ${esc(name)} » ? Cette action est définitive.`, () => {
    const i = D()[section].findIndex(x => x.id === id);
    if (i < 0) return;
    D()[section].splice(i, 1);
    Store.log(`Suppression ${s.singular} : ${name}`);
    Store.save();
    render();
  });
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
    <h3>Carte — #${esc(e.number)} ${esc(e.name.split('—')[1] || '')} ${badge(e.type || 'Gala', e.type === 'Soirée' ? 'purple' : 'gold')}</h3>
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

function openPoints(section, id) {
  const isTeam = section === 'teams';
  const f = isTeam ? teamById(id) : fighterById(id);
  if (!f) return;
  const autoPts = isTeam ? (teamStats(id).pts - (Number(f.bonus) || 0)) : autoStats(id).pts;
  showModal(`
    <h3>Ajustement de points — ${esc(f.name)}${isTeam ? ' <small class="muted">(équipe TFL)</small>' : ''}</h3>
    <p class="muted small">Points automatiques : <b>${autoPts} pts</b>${Number(f.bonus) ? ` · ajustement actuel : <b>${Number(f.bonus) > 0 ? '+' : ''}${Number(f.bonus)}</b>` : ' · aucun ajustement manuel'}</p>
    <form id="points-form" data-id="${id}" data-section="${section}">
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
  const section = form.dataset.section;
  const f = section === 'teams' ? teamById(form.dataset.id) : fighterById(form.dataset.id);
  if (!f) return;
  const dir = Number(form.elements.dir.value);
  const amt = Math.abs(Number(form.elements.amt.value));
  const reason = form.elements.reason.value.trim();
  if (!amt || !reason) return;
  f.bonus = (Number(f.bonus) || 0) + dir * amt;
  f.pointsLog = [{ time: new Date().toISOString(), delta: dir * amt, reason }, ...(f.pointsLog || [])].slice(0, 50);
  Store.log(`Points ${dir * amt > 0 ? '+' : ''}${dir * amt} pour ${f.name}${section === 'teams' ? ' (équipe)' : ''} — ${reason}`);
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
let _confirmCb = null;
function askConfirm(title, msg, cb) {
  _confirmCb = cb;
  showModal(`
    <h3>${esc(title)}</h3>
    <p class="confirm-msg">${msg}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" data-action="close-modal">Annuler</button>
      <button class="btn btn-danger" id="cf-ok">Confirmer</button>
    </div>`);
  document.getElementById('cf-ok').addEventListener('click', () => {
    const f = _confirmCb; _confirmCb = null;
    closeModal();
    if (f) f();
  });
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

function fmtBytes(n) { return n > 1024 ? (n / 1024).toFixed(1) + ' Ko' : n + ' o'; }

function openBackups() {
  const hist = Store.history();
  const rows = hist.map((b, i) => {
    const d = new Date(b.at);
    return `<div class="bk-row">
      <div class="bk-info"><b>${d.toLocaleDateString('fr-FR')} · ${d.toLocaleTimeString('fr-FR')}</b><small class="muted">${esc(b.label || 'Modification')} — ${fmtBytes(b.size || 0)}</small></div>
      <div class="bk-actions">
        <button class="row-btn" data-action="backup-restore" data-i="${i}">Restaurer</button>
        <button class="row-btn" data-action="backup-dl" data-i="${i}">Télécharger</button>
        <button class="row-btn danger" data-action="backup-del" data-i="${i}">Supprimer</button>
      </div>
    </div>`;
  }).join('');
  showModal(`
    <h3>Sauvegardes automatiques</h3>
    <p class="muted small">Un instantané est créé automatiquement à chaque modification du club (maximum ${Store.HIST_MAX}, les plus anciennes sont effacées). Restaurer remplace les données actuelles.</p>
    <div class="bk-list">${rows || '<p class="muted">Aucune sauvegarde pour le moment — la première sera créée dès la prochaine modification.</p>'}</div>
    <div class="modal-actions"><button class="btn btn-outline" data-action="close-modal">Fermer</button></div>`);
}

function exportCompta() {
  const rows = (acMonth ? D().accounting.filter(a => String(a.date || '').startsWith(acMonth)) : D().accounting)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const head = 'Date;Type;Categorie;Libelle;Paiement;Reference;Montant';
  const lines = rows.map(a => [a.date || '', a.type || '', a.category || '', a.label || '', a.method || '', a.ref || '', Number(a.amount || 0)]
    .map(x => String(x).replace(/;/g, ',')).join(';'));
  const blob = new Blob(['\ufeff' + head + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `compta-pbafc-${acMonth || 'tout'}.csv`;
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
    case 'points': openPoints(section, id); break;
    case 'record': openRecord(id); break;
    case 'teamfiche': openTeamFiche(id); break;
    case 'close-season': closeSeason(); break;
    case 'close-modal': closeModal(); break;
    case 'export': exportJSON(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset':
      askConfirm('Réinitialisation', 'Réinitialiser TOUTES les données du club ? Tout repartira de zéro.', () => { Store.reset(); render(); });
      break;
    case 'ac-all':
      acMonth = ''; render();
      break;
    case 'export-compta':
      exportCompta();
      break;
    case 'backups':
      openBackups();
      break;
    case 'backup-restore': {
      const i = Number(e.target.closest('[data-i]').dataset.i);
      const b = Store.history()[i];
      if (!b) break;
      askConfirm('Restaurer la sauvegarde', `Remplacer les données actuelles par celles du ${new Date(b.at).toLocaleString('fr-FR')} ?\nLes modifications faites depuis seront perdues.`, () => { Store.restoreBackup(i); closeModal(); render(); });
      break;
    }
    case 'backup-dl': {
      const i = Number(e.target.closest('[data-i]').dataset.i);
      const b = Store.history()[i];
      if (!b) break;
      const blob = new Blob([JSON.stringify(b.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pbafc-sauvegarde-${b.at.slice(0, 10)}_${b.at.slice(11, 19).replace(/:/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      break;
    }
    case 'backup-del': {
      const i = Number(e.target.closest('[data-i]').dataset.i);
      askConfirm('Supprimer la sauvegarde', 'Cette instantané sera définitivement effacé.', () => { Store.deleteBackup(i); openBackups(); });
      break;
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'ac-month') { acMonth = e.target.value; render(); return; }
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

document.addEventListener('pbafc:saved', () => { if (window.__pbafcReady) flashSaved(false); });
document.addEventListener('pbafc:save-error', () => { if (window.__pbafcReady) flashSaved(true); });

let toastTimer = null;
function flashSaved(err) {
  let t = document.getElementById('save-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'save-toast';
    t.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><b></b><small></small>`;
    document.body.appendChild(t);
  }
  t.classList.toggle('err', !!err);
  t.querySelector('b').textContent = err ? 'Échec — non enregistré' : 'Enregistré';
  t.querySelector('small').textContent = 'à ' + new Date().toLocaleTimeString('fr-FR');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

Store.load();
render();
window.__pbafcReady = true;
console.log('PBUFC — Panel de gestion chargé.');
