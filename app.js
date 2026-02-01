const $ = (id) => document.getElementById(id);

function qpGet(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}
function qpSet(url, key, val) {
  if (val === undefined || val === null) return url;
  const s = String(val);
  if (!s) return url;
  const u = new URL(url);
  u.searchParams.set(key, s);
  return u.toString();
}
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// ================= THEME =================
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}
function initTheme(){
  const saved = localStorage.getItem("theme");
  if (saved) return applyTheme(saved);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ================= BACKGROUND SLIDESHOW =================
// Put your images here:
const BG_IMAGES = [
  "assets/img/bg1.jpg",
  "assets/img/bg2.jpg",
  "assets/img/bg3.jpg",
];

function initBgShow(){
  const el = document.querySelector(".bgshow");
  if (!el) return;

  let i = 0;
  function setBg(){
    el.style.backgroundImage = `url("${BG_IMAGES[i]}")`;
    i = (i + 1) % BG_IMAGES.length;
  }
  setBg();
  setInterval(setBg, 6000);
}

// ================= AUDIO =================
// Mobile browsers block autoplay. We use overlay tap to start.
const audio = {
  music: new Audio("assets/audio/bg.mp3"),
  pops: [ new Audio("assets/audio/pop1.mp3"), new Audio("assets/audio/pop2.mp3") ],
  enabled: true,
};

function initAudio(){
  audio.music.loop = true;
  audio.music.volume = 0.35;
  audio.pops.forEach(a => a.volume = 0.6);

  // default music ON (your request)
  const saved = localStorage.getItem("music");
  if (saved === null) localStorage.setItem("music", "on");

  audio.enabled = (localStorage.getItem("music") || "on") === "on";
  updateMusicIcon();
}
function updateMusicIcon(){
  const btn = $("musicBtn");
  if (!btn) return;
  btn.textContent = audio.enabled ? "🔊" : "🔇";
}
async function tryStartMusic(){
  if (!audio.enabled) return;
  try { await audio.music.play(); } catch {}
}
function setMusic(on){
  audio.enabled = !!on;
  localStorage.setItem("music", on ? "on" : "off");
  if (!on) audio.music.pause();
  updateMusicIcon();
}
function toggleMusic(){
  setMusic(!audio.enabled);
  if (audio.enabled) tryStartMusic();
}
function pop(){
  const s = pick(audio.pops);
  try { s.currentTime = 0; s.play(); } catch {}
}

// ================= SHARE IMAGE (Canvas -> share sheet) =================
// Creates a pretty image with names and "Accepted 💖"
async function buildAcceptanceImageBlob({ from, to, subtitle }){
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#ff4d8d");
  g.addColorStop(1, "#7c3aed");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // Soft glow circles
  function glow(x,y,r,a){
    const rg = ctx.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  glow(250, 380, 500, 0.30);
  glow(880, 520, 420, 0.22);
  glow(540, 1420, 620, 0.18);

  // Hearts
  const hearts = ["💖","💗","💘","💕","💞","🌸"];
  ctx.globalAlpha = 0.95;
  for (let i=0;i<40;i++){
    ctx.font = `${40 + Math.floor(Math.random()*60)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
    ctx.fillText(pick(hearts), Math.random()*W, Math.random()*H);
  }
  ctx.globalAlpha = 1;

  // Card
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  roundRect(ctx, 90, 520, W-180, 880, 48);
  ctx.fill();

  // Text
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";

  ctx.font = "900 86px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("ACCEPTED 💖", W/2, 680);

  ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`${to} said YES`, W/2, 790);

  ctx.font = "700 42px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`to ${from}`, W/2, 860);

  ctx.fillStyle = "#374151";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(subtitle || "Happy Valentine’s 💞", W/2, 950);

  ctx.fillStyle = "rgba(17,24,39,0.75)";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Made with LoveLink 💘", W/2, 1260);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));

  function roundRect(c,x,y,w,h,r){
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }
}

async function shareImage(blob, filename="valentine.png"){
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/png" });

  // Web Share (works on many phones)
  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share){
    try{
      await navigator.share({ files: [file], title: "Valentine 💖", text: "💞" });
      return true;
    }catch{
      // fallthrough to download
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return false;
}

// ================= WHATSAPP LINK =================
function waLink(number, message){
  const digits = String(number || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ================= GLOBAL BOOT =================
(function boot(){
  initTheme();
  initBgShow();
  initAudio();

  const themeBtn = $("themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const musicBtn = $("musicBtn");
  if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

  // Overlay: tap to start music
  const ov = $("startOverlay");
  if (ov){
    // default music ON
    setMusic(true);
    ov.addEventListener("click", async () => {
      setMusic(true);
      await tryStartMusic();
      ov.remove();
    });
  }
})();

// ================= PAGE: index =================
(function initIndex(){
  if (!$("makeBtn")) return;

  const fromName = $("fromName");
  const toName = $("toName");
  const msg = $("msg");
  const wa = $("wa");

  const linkOut = $("linkOut");
  const senderOut = $("senderOut");
  const shareBtn = $("shareBtn");
  const copyBtn = $("copyBtn");
  const copySenderBtn = $("copySenderBtn");
  const openReceiver = $("openReceiver");
  const openSender = $("openSender");

  function buildLinks(){
    const askBase = new URL("ask.html", location.href).toString();
    const senderBase = new URL("sender.html", location.href).toString();

    const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

    const selectedGifts = Array.from(document.querySelectorAll(".gcb:checked"))
      .map(x => x.value).join(",");

    let askLink = askBase;
    askLink = qpSet(askLink, "from", fromName.value.trim());
    askLink = qpSet(askLink, "to", toName.value.trim());
    askLink = qpSet(askLink, "msg", msg.value.trim());
    askLink = qpSet(askLink, "wa", wa.value.trim());
    askLink = qpSet(askLink, "t", token);
    askLink = qpSet(askLink, "g", selectedGifts);

    let senderLink = senderBase;
    senderLink = qpSet(senderLink, "from", fromName.value.trim());
    senderLink = qpSet(senderLink, "to", toName.value.trim());
    senderLink = qpSet(senderLink, "wa", wa.value.trim());
    senderLink = qpSet(senderLink, "t", token);
    senderLink = qpSet(senderLink, "g", selectedGifts);

    return { askLink, senderLink };
  }

  async function copyText(val, btn){
    try{ await navigator.clipboard.writeText(val); }
    catch{
      const tmp = document.createElement("input");
      tmp.value = val; document.body.appendChild(tmp);
      tmp.select(); document.execCommand("copy"); tmp.remove();
    }
    btn.textContent = "Copied ✅";
    setTimeout(()=> btn.textContent="Copy", 900);
  }

  $("makeBtn").addEventListener("click", () => {
    const { askLink, senderLink } = buildLinks();
    linkOut.value = askLink;
    senderOut.value = senderLink;

    shareBtn.disabled = false;
    copyBtn.disabled = false;
    copySenderBtn.disabled = false;

    openReceiver.href = askLink;
    openSender.href = senderLink;

    openReceiver.setAttribute("aria-disabled","false");
    openSender.setAttribute("aria-disabled","false");
  });

  copyBtn.addEventListener("click", () => copyText(linkOut.value, copyBtn));
  copySenderBtn.addEventListener("click", () => copyText(senderOut.value, copySenderBtn));

  shareBtn.addEventListener("click", async () => {
    const url = linkOut.value;
    if (!url || url.includes("Generate first")) return;

    if (navigator.share){
      try{ await navigator.share({ title:"Valentine 💘", text:"Open this 😄", url }); return; }
      catch{}
    }
    await copyText(url, shareBtn);
    shareBtn.textContent = "Link copied ✅";
    setTimeout(()=> shareBtn.textContent="Share 🔗", 1100);
  });
})();

// ================= PAGE: ask =================
(function initAsk(){
  if (!$("noBtn")) return;

  const from = qpGet("from") || "Someone";
  const to = qpGet("to") || "Friend";
  const msg = qpGet("msg");
  const wa = (qpGet("wa") || "").trim();
  const token = qpGet("t") || "";
  const gifts = qpGet("g") || "";

  $("fromMini").textContent = from;
  $("toSpan").textContent = to;
  $("msgLine").textContent = msg ? `“${msg}”` : "";

  const NO_LINES = [
    "No? That button looks shy 😼",
    "Waittt… are you sure? 🥺",
    "One more chance? 💗",
    "I promise it’s fun 😄",
    "You’re my favorite person today ✨",
    "Plot twist: you meant YES 😭",
    "Don’t break my tiny heart 🐱💔",
    "We can celebrate with snacks 🍫",
    "Ok ok… last chance 😄"
  ];

  const noBtn = $("noBtn");
  const yesBtn = $("yesBtn");
  const lines = $("lines");
  let tries = 0;

  const area = noBtn.parentElement;

  function moveNoButton(){
    const rect = area.getBoundingClientRect();
    const b = noBtn.getBoundingClientRect();
    const pad = 8;
    const maxX = rect.width - b.width - pad;
    const maxY = rect.height - b.height - pad;

    const x = clamp(Math.random() * maxX, pad, maxX);
    const y = clamp(Math.random() * maxY, pad, maxY);

    noBtn.style.position = "absolute";
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  function addLine(){
    tries++;
    const div = document.createElement("div");
    div.className = "line";
    div.textContent = pick(NO_LINES);
    lines.prepend(div);
  }

  function escape(){
    moveNoButton();
    addLine();
    pop();
  }

  ["mouseover","pointerenter","touchstart","focus"].forEach(evt => {
    noBtn.addEventListener(evt, (e) => {
      if (evt === "touchstart") e.preventDefault();
      escape();
    }, { passive: false });
  });

  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    escape();
  });

  yesBtn.addEventListener("click", () => {
    // Sender dashboard link with accepted=1 so sender sees it immediately
    const senderDash = new URL("sender.html", location.href);
    senderDash.searchParams.set("from", from);
    senderDash.searchParams.set("to", to);
    senderDash.searchParams.set("wa", wa);
    senderDash.searchParams.set("t", token);
    senderDash.searchParams.set("g", gifts);
    senderDash.searchParams.set("accepted", "1");
    senderDash.searchParams.set("ts", String(Date.now()));

    // Notify sender via WhatsApp on YES
    if (wa){
      const msg =
`💖 ACCEPTED!
${to} accepted ${from}'s Valentine request.

Open sender dashboard:
${senderDash.toString()}

(You can generate a share-image there)`;
      window.open(waLink(wa, msg), "_blank");
    }

    // Go to YES page
    const u = new URL("yes.html", location.href);
    u.searchParams.set("from", from);
    u.searchParams.set("to", to);
    u.searchParams.set("wa", wa);
    u.searchParams.set("t", token);
    u.searchParams.set("g", gifts);
    location.href = u.toString();
  });

  moveNoButton();
})();

// ================= PAGE: yes =================
(function initYes(){
  if (!$("shareImgBtn")) return;

  const from = qpGet("from") || "Someone";
  const to = qpGet("to") || "Friend";
  const wa = (qpGet("wa") || "").trim();
  const token = qpGet("t") || "";
  const giftsParam = (qpGet("g") || "").trim();
  const chosen = giftsParam ? giftsParam.split(",").filter(Boolean) : [];

  $("yesLine").textContent = `${to} said YES to ${from}! 💖`;

  // Hearts animation
  const heartsWrap = document.querySelector(".hearts");
  const HEARTS = ["💗","💖","💘","💕","💞","🌸"];
  const timer = setInterval(() => {
    if (!heartsWrap) return;
    const h = document.createElement("div");
    h.className = "heart";
    h.textContent = pick(HEARTS);
    h.style.left = Math.floor(Math.random() * 92 + 4) + "%";
    h.style.bottom = "0px";
    heartsWrap.appendChild(h);
    setTimeout(() => h.remove(), 3600);
  }, 180);

  // Gifts: if none selected by sender -> hide box
  const giftBox = $("giftBox");
  if (!chosen.length && giftBox) giftBox.style.display = "none";

  // Hide unselected gift buttons
  document.querySelectorAll(".giftBtn").forEach(btn => {
    const key = btn.getAttribute("data-key");
    if (chosen.length && !chosen.includes(key)) btn.style.display = "none";
  });

  // Share / Download acceptance image
  async function makeBlob(){
    return await buildAcceptanceImageBlob({
      from, to,
      subtitle: "Happy Valentine’s 💞"
    });
  }

  $("shareImgBtn").addEventListener("click", async () => {
    const blob = await makeBlob();
    await shareImage(blob, "valentine-accepted.png");
  });

  $("downloadImgBtn").addEventListener("click", async () => {
    const blob = await makeBlob();
    await shareImage(blob, "valentine-accepted.png"); // same function downloads if share not possible
  });

  // Gift click -> notify sender
  document.querySelectorAll(".giftBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!wa){
        alert("Sender WhatsApp not set. Tell sender to generate link with WhatsApp number.");
        return;
      }

      const giftLabel = btn.getAttribute("data-label") || "Gift";

      const senderDash = new URL("sender.html", location.href);
      senderDash.searchParams.set("from", from);
      senderDash.searchParams.set("to", to);
      senderDash.searchParams.set("wa", wa);
      senderDash.searchParams.set("t", token);
      senderDash.searchParams.set("g", giftsParam);
      senderDash.searchParams.set("accepted", "1");
      senderDash.searchParams.set("gift", giftLabel);
      senderDash.searchParams.set("ts", String(Date.now()));

      const msg =
`🎁 GIFT CHOSEN!
${to} accepted ${from} 💖
Gift: ${giftLabel}

Sender dashboard:
${senderDash.toString()}`;

      location.href = waLink(wa, msg);
    });
  });

  // Clean up timer on navigation (optional)
  window.addEventListener("beforeunload", () => clearInterval(timer));
})();

// ================= PAGE: sender =================
(function initSender(){
  if (!$("statusBox")) return;

  const from = qpGet("from") || "Someone";
  const to = qpGet("to") || "Friend";
  const accepted = qpGet("accepted") === "1";
  const gift = qpGet("gift") || "";

  $("senderLine").textContent = `From: ${from} • To: ${to}`;

  const box = $("statusBox");
  if (accepted){
    box.textContent = gift
      ? `✅ Accepted! Gift picked: ${gift}`
      : `✅ Accepted! (No gift picked yet)`;
  } else {
    box.textContent = "⏳ Waiting… share the receiver link.";
  }

  // Affiliate links you set (replace with real ones)
  const giftLinks = {
    gift1: "https://example.com/flowers?ref=yourid",
    gift2: "https://example.com/chocolate?ref=yourid",
    gift3: "https://example.com/teddy?ref=yourid",
    gift4: "https://example.com/card?ref=yourid",
  };
  Object.entries(giftLinks).forEach(([id, url]) => {
    const el = $(id);
    if (el) el.href = url;
  });

  async function makeBlob(){
    return await buildAcceptanceImageBlob({
      from, to,
      subtitle: gift ? `Gift: ${gift}` : "Accepted 💞"
    });
  }

  $("senderShareImgBtn").addEventListener("click", async () => {
    const blob = await makeBlob();
    await shareImage(blob, "acceptance.png");
  });

  $("senderDownloadImgBtn").addEventListener("click", async () => {
    const blob = await makeBlob();
    await shareImage(blob, "acceptance.png");
  });
})();
