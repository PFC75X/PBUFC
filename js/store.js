const Store = {
  KEY: 'pbafc_v3',
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.data = raw ? JSON.parse(raw) : this.seed();
    } catch (e) {
      this.data = this.seed();
    }
    if (!this.data.log) this.data.log = [];
    ['fighters', 'staff', 'events', 'fights', 'tfights', 'teams', 'championships', 'tickets', 'accounting', 'sponsors', 'sanctions', 'hof', 'seasons'].forEach(k => { if (!Array.isArray(this.data[k])) this.data[k] = []; });
    if (!this.data.counters) this.data.counters = { pbufc: 0, event: 0 };
    this.save();
    return this.data;
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify(this.data));
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
