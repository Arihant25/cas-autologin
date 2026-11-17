// Waits for the CAS login form to be prefilled, then submits it.
(async () => {
  const POLL_MS = 100;
  const MAX_WAIT_MS = 6000;
  const COOLDOWN_MS = 20000; // don't retry in a loop if the login fails
  const KEY = 'casAutologinLastAttempt';

  const { enabled = true } = await chrome.storage.local.get('enabled');
  if (!enabled) return;

  const form = document.getElementById('fm1');
  const user = form?.querySelector('#username');
  const pass = form?.querySelector('#password');
  if (!form || !user || !pass) return;

  // Bail out if CAS is showing a login error, or we tried very recently.
  if (document.querySelector('#loginErrorsPanel, .alert-danger, .banner-danger, .errors')) return;
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < COOLDOWN_MS) return;

  // If the user starts typing or clicking themselves, back off.
  let userActed = false;
  const stop = () => { userActed = true; };
  document.addEventListener('keydown', stop, { capture: true, once: true });
  document.addEventListener('mousedown', stop, { capture: true, once: true });

  const isAutofilled = (el) => {
    for (const sel of [':autofill', ':-webkit-autofill']) {
      try { if (el.matches(sel)) return true; } catch {}
    }
    return false;
  };
  const hasValue = (el) => el.value.trim() !== '';
  const ready = (el) => hasValue(el) || isAutofilled(el);

  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (userActed) return;
    if (ready(user) && ready(pass)) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  if (userActed || !(ready(user) && ready(pass))) return;

  sessionStorage.setItem(KEY, String(Date.now()));

  if (hasValue(user) && hasValue(pass)) {
    // Values are readable (e.g. filled by a password-manager extension): submit directly.
    const btn = form.querySelector('button[type="submit"], input[type="submit"]');
    form.requestSubmit(btn || undefined);
    return;
  }

  // Chrome's own autofill hides values from page JS until a real user gesture,
  // so a scripted submit would post an empty password. Ask the background worker
  // to send a trusted click on the password field + an Enter keypress.
  const r = pass.getBoundingClientRect();
  chrome.runtime.sendMessage({
    type: 'pressEnter',
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
  });
})();
