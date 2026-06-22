/* ============================================================================
   Date-Einladung für Cati — Interaktion, Effekte & ai-sync-Anbindung
   Reines Vanilla-JS, keine Abhängigkeiten.
   ========================================================================= */
"use strict";

/* ─── Konfiguration ───────────────────────────────────────────────────────
   Damit beim Bestätigen automatisch eine Aufgabe in der ai-sync / Quantus-App
   landet, muss die Seite die ai-sync-Netlify-URL kennen (anderer Origin).

   Wege, sie zu setzen (in dieser Reihenfolge):
     1. ?api=https://deine-ai-sync.netlify.app   (wird im Browser gemerkt)
     2. localStorage-Eintrag "aiSyncBase"
     3. die Konstante AI_SYNC_BASE hier unten

   Ist nichts gesetzt, funktioniert die Seite trotzdem komplett — es wird dann
   nur keine Aufgabe verschickt (gracefully). */
const AI_SYNC_BASE = ""; // z. B. "https://deine-ai-sync.netlify.app"
const ENDPOINT_PATH = "/.netlify/functions/date-invite";

function resolveEndpoint() {
  const fromQuery = new URLSearchParams(location.search).get("api");
  if (fromQuery) {
    try { localStorage.setItem("aiSyncBase", fromQuery); } catch (_) {}
  }
  let base = "";
  try { base = fromQuery || localStorage.getItem("aiSyncBase") || AI_SYNC_BASE || ""; }
  catch (_) { base = fromQuery || AI_SYNC_BASE || ""; }
  base = base.trim().replace(/\/+$/, "");
  if (!base) return "";
  if (!/^https?:\/\//i.test(base)) base = "https://" + base;
  return base + ENDPOINT_PATH;
}

/* ─── Kleine Helfer ───────────────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const vibrate = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

const WEEKDAYS = ["Sunntig", "Mäntig", "Ziischtig", "Mittwuch", "Dunschtig", "Friitig", "Samschtig"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
  "Auguscht", "Septämber", "Oktober", "Novämber", "Dezämber"];

function toYmd(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function formatDateLong(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  if (!m) return ymd || "";
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${WEEKDAYS[d.getDay()]}, ${+m[3]}. ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/* ─── Bildschirm-Wechsel ──────────────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => {
    const active = s.id === id;
    s.classList.toggle("is-active", active);
    s.hidden = !active;
  });
  window.scrollTo({ top: 0 });
}

/* ─── Hintergrund-Herzen ──────────────────────────────────────────────────── */
function spawnBackgroundHearts() {
  const layer = $(".bg-hearts");
  if (!layer) return;
  const glyphs = ["💕", "💖", "💗", "❤️", "🩷", "💞"];
  const count = window.innerWidth < 480 ? 12 : 20;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
    s.style.left = rand(0, 100) + "vw";
    s.style.setProperty("--size", rand(16, 34) + "px");
    s.style.setProperty("--op", rand(0.3, 0.7).toFixed(2));
    s.style.setProperty("--dur", rand(10, 20).toFixed(1) + "s");
    s.style.setProperty("--delay", "-" + rand(0, 20).toFixed(1) + "s");
    s.style.setProperty("--drift", rand(-40, 40).toFixed(0) + "px");
    layer.appendChild(s);
  }
}

/* ─── Effekt-Engine: Konfetti & Herzen auf dem Canvas ─────────────────────── */
const FX = (() => {
  const canvas = $("#fx");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let raf = null;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  const HEARTS = ["💕", "💖", "💗", "❤️", "🩷"];
  const COLORS = ["#ff2e63", "#ff5b8a", "#ff8fb3", "#ffd700", "#ffffff", "#ff9ebd"];

  function add(p) { particles.push(p); }

  function makeConfetti(x, y) {
    const a = rand(-Math.PI, 0); // nach oben/außen
    const speed = rand(6, 14);
    return {
      type: "confetti", x, y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - rand(2, 6),
      g: 0.32, rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
      w: rand(7, 12), h: rand(9, 16), color: COLORS[(Math.random() * COLORS.length) | 0],
      life: rand(70, 120),
    };
  }
  function makeHeart(x, y, opts = {}) {
    const a = rand(-Math.PI, 0);
    const speed = opts.speed ?? rand(5, 11);
    return {
      type: "heart", x, y,
      vx: opts.vx ?? Math.cos(a) * speed, vy: opts.vy ?? Math.sin(a) * speed - rand(2, 5),
      g: opts.g ?? 0.22, rot: rand(-0.4, 0.4), vr: rand(-0.05, 0.05),
      size: rand(18, 32), glyph: HEARTS[(Math.random() * HEARTS.length) | 0],
      life: opts.life ?? rand(80, 140),
    };
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.vy += p.g;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(p.life / 40, 0, 1);
      if (p.type === "confetti") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 2);
        else ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h); // Fallback für ältere Browser
        ctx.fill();
      } else {
        ctx.font = p.size + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.glyph, 0, 0);
      }
      ctx.restore();
    }
    particles = particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 60);
    if (particles.length) {
      raf = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(raf); raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }

  return {
    /** Konfetti- + Herz-Explosion an Punkt (x,y) */
    burst(x, y) {
      for (let i = 0; i < 90; i++) add(makeConfetti(x, y));
      for (let i = 0; i < 30; i++) add(makeHeart(x, y));
      start();
    },
    /** Chliine Herz-Schwung (z. B. wenn "Nei" zu "Ja" wird) */
    pop(x, y) {
      for (let i = 0; i < 14; i++) add(makeHeart(x, y));
      start();
    },
    /** Sanfter Herzregen von oben (für die Danke-Seite) */
    rain(durationMs = 2600) {
      const end = Date.now() + durationMs;
      const tick = () => {
        if (Date.now() > end) return;
        add(makeHeart(rand(0, window.innerWidth), -30, {
          vx: rand(-1, 1), vy: rand(1, 2.5), g: 0.02, speed: 0, life: 200,
        }));
        start();
        setTimeout(tick, 140);
      };
      tick();
    },
  };
})();

/* ─── Gemeinsame Wiiterleitig zur Termin-Siite ────────────────────────────── */
function proceedToDate(originEl) {
  const el = originEl || $("#btn-yes");
  const r = el.getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + r.height / 2);
  vibrate([20, 40, 20]);
  setTimeout(() => showScreen("screen-date"), 650);
}

/* ─── "Ja!" ───────────────────────────────────────────────────────────────── */
function setupYesButton() {
  $("#btn-yes").addEventListener("click", function () { proceedToDate(this); });
}

/* ─── "Nei" — bliibt immer am Bildschirm & wird zu "Ja" ────────────────────
   Kei Flüchte meh: Bim Drücke verwandlet sich de Nei-Knopf ad gliiche Stell
   i en zweite "Ja"-Knopf. So chasch praktisch nöd Nei säge 😏 De nöchscht
   Druck (jetz "Ja") gaht denn wiiter zur Termin-Siite. */
function setupNoButton() {
  const noBtn = $("#btn-no");
  const hint = $("#no-taunt");
  let converted = false;

  function morphToYes() {
    converted = true;
    noBtn.textContent = "Ja 💕";
    noBtn.classList.remove("btn-no");
    noBtn.classList.add("btn-yes", "just-converted");
    const r = noBtn.getBoundingClientRect();
    FX.pop(r.left + r.width / 2, r.top + r.height / 2);
    hint.textContent = "Gäll, eigentli wetsch Ja 😏 — druck nomal 💕";
    vibrate(25);
  }

  // Bim Drücke: zerscht zu "Ja" werde, denn (zwöite Druck) wiiter.
  noBtn.addEventListener("click", (e) => {
    if (!converted) { e.preventDefault(); morphToYes(); }
    else proceedToDate(noBtn);
  });

  // Uf em Desktop: chli zABble bi Annäherig — bliibt aber ad Ort.
  noBtn.addEventListener("pointerenter", () => {
    if (converted) return;
    noBtn.classList.remove("wiggle");
    void noBtn.offsetWidth; // Reflow erzwinge, damit d Animation neu startet
    noBtn.classList.add("wiggle");
  });
  noBtn.addEventListener("animationend", () => {
    noBtn.classList.remove("wiggle", "just-converted");
  });
}

/* ─── Termin-Seite: Schnellauswahl, Validierung, Absenden ─────────────────── */
function setupDateForm() {
  const form = $("#date-form");
  const dateInput = $("#input-date");
  const timeInput = $("#input-time");
  const chipsBox = $("#quick-chips");
  const errEl = $("#form-error");
  const submitBtn = $("#btn-submit");

  const today = new Date();
  const todayYmd = toYmd(today);
  dateInput.min = todayYmd;

  // nächsten gewünschten Wochentag finden (0=So … 6=Sa)
  function upcoming(weekday) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
    return toYmd(d);
  }
  function tomorrow() {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toYmd(d);
  }

  const chips = [
    { label: "Hüt Abig", date: todayYmd, time: "19:00" },
    { label: "Morn Abig", date: tomorrow(), time: "19:00" },
    { label: "Samschtig", date: upcoming(6), time: "19:00" },
    { label: "Sunntig", date: upcoming(0), time: "15:00" },
  ];

  chips.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = c.label;
    b.addEventListener("click", () => {
      dateInput.value = c.date;
      timeInput.value = c.time;
      chipsBox.querySelectorAll(".chip").forEach((x) => x.classList.remove("is-selected"));
      b.classList.add("is-selected");
      errEl.textContent = "";
    });
    chipsBox.appendChild(b);
  });

  // manuelle Änderung hebt die Chip-Markierung auf
  [dateInput, timeInput].forEach((inp) =>
    inp.addEventListener("input", () => {
      chipsBox.querySelectorAll(".chip").forEach((x) => x.classList.remove("is-selected"));
      errEl.textContent = "";
    })
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!date) { errEl.textContent = "Wähl bitte en Tag us 🙂"; return; }
    if (date < todayYmd) { errEl.textContent = "Wähl bitte en Tag i de Zuekunft 💫"; return; }
    if (!time) { errEl.textContent = "Wähl bitte e Zyt us 🙂"; return; }

    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = "Am schicke… 💌";

    const payload = { date, time, name: "Cati" };
    // lokale Sicherungskopie (falls der Endpoint mal nicht erreichbar ist)
    try { localStorage.setItem("lastDateInvite", JSON.stringify({ ...payload, at: Date.now() })); } catch (_) {}

    const result = await sendToAiSync(payload);
    if (!result.ok && !result.skipped) {
      console.warn("[date-invite] Konnte Aufgabe nicht senden:", result);
    }

    goToThankYou(date, time, result);
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  });
}

async function sendToAiSync(payload) {
  const url = resolveEndpoint();
  if (!url) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function goToThankYou(date, time, result) {
  $("#done-summary").textContent =
    `Mir gsehnd öis am ${formatDateLong(date)} am ${time} Uhr 💕`;
  $("#done-note").textContent = result && result.ok
    ? "Er weiss jetz Bscheid 💌"
    : "Ich cha's fasch nöd erwarte ✨";
  showScreen("screen-done");
  FX.rain(2800);
  vibrate([20, 40, 20, 40, 60]);
}

/* ─── Start ───────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  spawnBackgroundHearts();
  setupNoButton();
  setupYesButton();
  setupDateForm();
});
