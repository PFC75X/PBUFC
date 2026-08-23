const Store = {
  KEY: 'pbafc_v3',
  HIST_KEY: 'pbafc_hist_v1',
  HIST_MAX: 25,
  SYNC_KEY: '$2a$10$HuqA09uGOK97vYrfGFkt6.lFPy3a7Y5CcJGlX3vxmEHts/b.krR9y',
  SYNC_BIN: '6a8b6917da38895dfe081200',
  syncTimer: null,
  _stable: null,
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.data = raw ? JSON.parse(raw) : this.seed();
    } catch (e) {
      this.data = this.seed();
    }
    if (!this.data) this.data = this.seed();
    this.normalize();
    this._stable = this.stableJson();
    this.save();
    return this.data;
  },

  normalize() {
    if (!this.data.log) this.data.log = [];
    ['fighters', 'staff', 'events', 'fights', 'tfights', 'teams', 'championships', 'tickets', 'accounting', 'sponsors', 'sanctions', 'hof', 'seasons'].forEach(k => { if (!Array.isArray(this.data[k])) this.data[k] = []; });
    if (!this.data.counters) this.data.counters = { pbufc: 0, event: 0 };
  },

  stableJson() {
    const c = {};
    for (const k in this.data) { if (k === 'updatedAt') continue; c[k] = this.data[k]; }
    return JSON.stringify(c);
  },

  save() {
    const s = this.stableJson();
    if (this._stable === null) this._stable = s;
    else if (s !== this._stable) { this._stable = s; this.data.updatedAt = new Date().toISOString(); }
    const json = JSON.stringify(this.data);
    let ok = true;
    try { localStorage.setItem(this.KEY, json); } catch (e) { ok = false; }
    this.autoBackup(json);
    try {
      document.dispatchEvent(new CustomEvent(ok ? 'pbafc:saved' : 'pbafc:save-error'));
    } catch (e) { }
    this.pushRemote();
  },

  history() {
    try { const h = JSON.parse(localStorage.getItem(this.HIST_KEY)); return Array.isArray(h) ? h : []; } catch (e) { return []; }
  },

  autoBackup(json) {
    try {
      const hist = this.history();
      if (hist[0] && JSON.stringify(hist[0].data) === json) return;
      hist.unshift({
        at: new Date().toISOString(),
        label: (this.data.log && this.data.log[0] && this.data.log[0].text) || 'Modification manuelle',
        size: json.length,
        data: JSON.parse(json)
      });
      while (hist.length > this.HIST_MAX) hist.pop();
      localStorage.setItem(this.HIST_KEY, JSON.stringify(hist));
    } catch (e) { /* quota dépassé — on ignore */ }
  },

  restoreBackup(i) {
    const b = this.history()[i];
    if (!b) return false;
    this.data = b.data;
    if (!this.data.log) this.data.log = [];
    if (!this.data.counters) this.data.counters = { pbufc: 0, event: 0 };
    ['fighters', 'staff', 'events', 'fights', 'tfights', 'teams', 'championships', 'tickets', 'accounting', 'sponsors', 'sanctions', 'hof', 'seasons'].forEach(k => { if (!Array.isArray(this.data[k])) this.data[k] = []; });
    this._stable = null;
    this.log(`Sauvegarde du ${new Date(b.at).toLocaleString('fr-FR')} restaurée`);
    this.save();
    return true;
  },

  pushRemote(now) {
    if (typeof fetch === 'undefined') { try { document.dispatchEvent(new CustomEvent('pbafc:cloud-err')); } catch (e) { } return; }
    clearTimeout(this.syncTimer);
    const send = () => {
      fetch(`https://api.jsonbin.io/v3/b/${this.SYNC_BIN}`, {
        method: 'PUT',
        headers: { 'X-Master-Key': this.SYNC_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: this.data })
      }).then(r => {
        if (r.ok) {
          try { localStorage.setItem('pbafc_lastsync', new Date().toISOString()); } catch (e) { }
          document.dispatchEvent(new CustomEvent('pbafc:cloud-ok'));
        } else document.dispatchEvent(new CustomEvent('pbafc:cloud-err'));
      }).catch(() => document.dispatchEvent(new CustomEvent('pbafc:cloud-err')));
    };
    if (now) send();
    else this.syncTimer = setTimeout(send, 1500);
  },

  forcePush() { this.pushRemote(true); },

  pullRemote() {
    if (typeof fetch === 'undefined') return Promise.resolve(null);
    return fetch(`https://api.jsonbin.io/v3/b/${this.SYNC_BIN}/latest`, { headers: { 'X-Master-Key': this.SYNC_KEY } })
      .then(r => r.ok ? r.json() : null)
      .then(j => (j && j.record) ? j.record : null)
      .catch(() => null);
  },

  lastSync() { try { return localStorage.getItem('pbafc_lastsync'); } catch (e) { return null; } },

  deleteBackup(i) {
    const hist = this.history();
    if (!hist[i]) return;
    hist.splice(i, 1);
    localStorage.setItem(this.HIST_KEY, JSON.stringify(hist));
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  log(text) {
    this.data.log.unshift({
      id: this.uid(),
      time: new Date().toISOString(),
      text
    });
    if (this.data.log.length > 500) this.data.log.length = 500;
  },

  nextPbufc() {
    const n = this.data.counters.pbufc || 0;
    this.data.counters.pbufc = n + 1;
    return 'PBUFC-' + String(n).padStart(4, '0');
  },

  nextEventNumber() {
    const n = this.data.counters.event || 0;
    this.data.counters.event = n + 1;
    return String(n).padStart(3, '0');
  },

  reset() {
    localStorage.removeItem(this.KEY);
    location.hash = '#dashboard';
    this.load();
  },

  seed() {
    return {
      counters: { pbufc: 0, event: 0 },
      fighters: [],
      teams: [],
      staff: [],
      events: [],
      fights: [],
      tfights: [],
      championships: [],
      tickets: [],
      accounting: [],
      sponsors: [],
      sanctions: [],
      hof: [],
      seasons: []
    };
  }
};
