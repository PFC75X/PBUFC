(function () {
  const CODE = '23082026';
  const TAB_KEY = 'pbafc_unlock_tab';
  try { if (sessionStorage.getItem(TAB_KEY) === '1') { const _l = document.getElementById('lock'); if (_l) _l.remove(); return; } } catch (e) { }

  const root = document.getElementById('lock');
  if (!root) return;
  document.documentElement.style.overflow = 'hidden';

  root.innerHTML = `
    <div class="lock-frame">
      <div class="lock-screen" id="lk-screen">
        <div class="statusbar"><span class="sb-brand">PB Portal</span><span>Session chiffrée · FR</span></div>
        <div class="boot" id="lk-boot">
          <img class="boot-logo" src="assets/logo-lock.jpg" alt="" onerror="this.style.display='none'">
          <div class="boot-name">PB PORTAL<span>ESPACE PROFESSIONNEL · v3.1</span></div>
          <div class="boot-bar"><i></i></div>
          <div class="boot-msg" id="lk-bootmsg">Chargement…</div>
        </div>
        <div class="lock-ui" id="lk-ui" style="display:none">
          <div class="lk-mid">
            <div class="lk-clock" id="lk-clock">--:--</div>
            <div class="lk-date" id="lk-date"></div>
            <button class="lk-seal" id="lk-seal" title="Logo de l’entreprise — appui long">
              <img src="assets/logo-lock.jpg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
              <b class="seal-pb">PB</b>
              <span class="ring"></span>
            </button>
            <div class="lk-code" id="lk-code"></div>
            <div class="lk-status" id="lk-status">Authentification requise</div>
            <div class="keypad" id="lk-pad"></div>
            <div class="lk-hint"><b>Astuce :</b> maintenez le logo de l’entreprise, puis saisissez votre code d’accès à 8 chiffres.</div>
          </div>
        </div>
      </div>
    </div>`;

  const $ = id => document.getElementById(id);
  const screen = $('lk-screen'), ui = $('lk-ui'), seal = $('lk-seal'),
    codeBox = $('lk-code'), status = $('lk-status'), pad = $('lk-pad');

  let stage = 0, buf = '', attempts = 0, holdTimer = null, busy = false;
  let chips = [], pbChip = null;

  function buildChips() {
    codeBox.innerHTML = '<span class="chip pb">PB</span>' + Array.from({ length: 8 }, () => '<span class="chip"></span>').join('');
    pbChip = codeBox.querySelector('.chip.pb');
    chips = [...codeBox.querySelectorAll('.chip:not(.pb)')];
  }
  function renderCode() {
    if (!pbChip) buildChips();
    pbChip.classList.toggle('on', stage >= 1);
    chips.forEach((c, i) => {
      const on = i < buf.length;
      c.classList.toggle('on', on);
      c.textContent = on ? '•' : '';
    });
  }
  const MSGS_FAIL = [
    'Code incorrect. Réessayez.',
    'Code incorrect — vérifiez votre code d’accès.',
    'Trop de tentatives. Le logo a été reverrouillé.'
  ];
  const MSGS_BOOT = ['Chargement du portail…', 'Connexion sécurisée établie.', 'Synchronisation des plannings…', 'Bienvenue.'];

  function setStatus(txt, cls = '') { status.textContent = txt; status.className = 'lk-status ' + cls; }

  [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['C', 'fn'], ['0'], ['⌫', 'fn']].forEach(([k, cls]) => {
    const b = document.createElement('button');
    b.textContent = k;
    if (cls) b.className = cls;
    b.dataset.k = k;
    b.disabled = true;
    pad.appendChild(b);
  });

  function digit(d) {
    if (stage < 1 || busy || buf.length >= 8) return;
    buf += d;
    renderCode();
    if (buf.length === 8) setTimeout(validate, 180);
  }
  function validate() {
    if (buf === CODE) {
      busy = true;
      setStatus('BIENVENUE DANS VOTRE ESPACE', 'ok');
      screen.classList.add('flash-ok');
      try { sessionStorage.setItem(TAB_KEY, '1'); } catch (e) { }
      setTimeout(() => root.classList.add('off'), 850);
      setTimeout(() => { root.remove(); document.documentElement.style.overflow = ''; }, 1600);
    } else {
      attempts++;
      setStatus(MSGS_FAIL[Math.min(attempts - 1, MSGS_FAIL.length - 1)] + ` (${attempts})`, 'bad');
      const frame = root.querySelector('.lock-frame');
      frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
      buf = '';
      if (attempts % 3 === 0) { stage = 0; seal.classList.remove('active'); lockPad(true); setStatus('Logo reverrouillé par sécurité.'); }
      renderCode();
    }
  }

  function lockPad(lock) { pad.querySelectorAll('button').forEach(b => b.disabled = !!lock); }

  pad.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'C') { buf = ''; renderCode(); }
    else if (k === '⌫') { buf = buf.slice(0, -1); renderCode(); }
    else if (/^[0-9]$/.test(k)) digit(k);
  });

  document.addEventListener('keydown', e => {
    if (/^[0-9]$/.test(e.key)) digit(e.key);
    else if (e.key === 'Backspace') { buf = buf.slice(0, -1); renderCode(); }
    else if (e.key === 'Escape') { buf = ''; renderCode(); }
  });

  function startHold(ev) {
    if (stage >= 1 || holdTimer) return;
    seal.classList.add('holding');
    holdTimer = setTimeout(() => {
      stage = 1; holdTimer = null;
      seal.classList.remove('holding');
      seal.classList.add('active');
      lockPad(false);
      setStatus('Logo validé · saisissez votre code à 8 chiffres');
      renderCode();
      try { navigator.vibrate && navigator.vibrate(60); } catch (err) { }
    }, 750);
  }
  function cancelHold() {
    seal.classList.remove('holding');
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; if (stage < 1) setStatus('Appui trop court — maintenez le logo.', ''); }
  }
  seal.addEventListener('pointerdown', startHold);
  seal.addEventListener('pointerup', cancelHold);
  seal.addEventListener('pointerleave', cancelHold);

  function tick() {
    const c = $('lk-clock'), d = $('lk-date');
    if (!c || !d) return;
    const n = new Date();
    c.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    d.textContent = n.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);

  let mi = 0;
  $('lk-bootmsg').textContent = MSGS_BOOT[0];
  const bootInt = setInterval(() => {
    mi++;
    if (mi < MSGS_BOOT.length) $('lk-bootmsg').textContent = MSGS_BOOT[mi];
    else {
      clearInterval(bootInt);
      const b = $('lk-boot');
      b.classList.add('fadeout');
      setTimeout(() => { b.style.display = 'none'; }, 480);
      ui.style.display = 'flex';
      requestAnimationFrame(() => requestAnimationFrame(() => ui.classList.add('in')));
    }
  }, 620);

  renderCode();
})();
