// The gallery and carousel images are written into the pages at build time (src/_data/gallery.json);
// this script only adds behaviour to them.
const $ = (s, r = document) => r.querySelector(s);

/* Viewer: one dialog for the whole site, created on first use. The enlarged image grows out of
   the thumbnail that was clicked and shrinks back into it on close. */
let dlg, origin = null, closing = false;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.2,.7,.2,1)";

// transform that makes the viewer image sit exactly over `thumb`
function fromThumb(vimg, thumb) {
  const a = thumb.getBoundingClientRect(), b = vimg.getBoundingClientRect();
  return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
}

function closeViewer() {
  if (closing || !dlg.open) return;
  const vimg = $("#vimg"), thumb = origin;
  const done = () => { dlg.close(); dlg.classList.remove("closing"); if (thumb) thumb.style.visibility = ""; closing = false; };
  if (!thumb || !thumb.isConnected || calm()) { done(); return; }
  closing = true;
  dlg.classList.add("closing"); // fades the backdrop and Close button
  vimg.animate([{ transform: "none" }, { transform: fromThumb(vimg, thumb) }], { duration: 320, easing: ease }).finished.then(done, done);
}

async function openViewer(src, alt, thumb) {
  if (!dlg) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="viewer" aria-label="Image viewer">
        <div class="in"><img id="vimg" alt=""><div class="cap"><button class="x" id="vclose">Close</button></div></div>
      </dialog>`);
    dlg = $("#viewer");
    $("#vclose").addEventListener("click", closeViewer);
    dlg.addEventListener("click", e => { if (e.target === dlg) closeViewer(); });
    dlg.addEventListener("cancel", e => { e.preventDefault(); closeViewer(); }); // Esc animates too
  }
  const vimg = $("#vimg");
  vimg.src = src; vimg.alt = alt;
  // know the final size before measuring; don't wait forever if decoding stalls
  await Promise.race([vimg.decode().catch(() => {}), new Promise(r => setTimeout(r, 400))]);
  if (typeof dlg.showModal !== "function") return;
  dlg.showModal();
  origin = thumb || null;
  if (!thumb || calm()) return;
  thumb.style.visibility = "hidden"; // it looks like the thumbnail itself lifts off the page
  vimg.style.transformOrigin = "0 0";
  vimg.animate([{ transform: fromThumb(vimg, thumb) }, { transform: "none" }], { duration: 420, easing: ease });
}

function initCopy(root) {
  root.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); btn.textContent = "copied"; }
    catch { const el = btn.parentNode.querySelector(".em"); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "selected"; }
    setTimeout(() => btn.textContent = "copy", 1600);
  }));
}

/* Carousel images rise toward the cursor, more the closer they are. The strip keeps moving
   under a still mouse, so distances are re-measured every frame while the pointer is over it. */
function initLift(carousel) {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const buttons = [...carousel.querySelectorAll("button")];
  const reach = 260; // px from the cursor at which an image stops reacting
  let x = null, frame = 0;
  const tick = () => {
    if (x === null || !carousel.isConnected) { frame = 0; return; }
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - x);
      const lift = Math.max(0, 1 - d / reach);
      b.style.setProperty("--lift", (lift * lift * (3 - 2 * lift)).toFixed(3)); // smoothstep, so the falloff is soft
    }
    frame = requestAnimationFrame(tick);
  };
  carousel.addEventListener("pointerenter", e => {
    x = e.clientX;
    carousel.classList.add("settling"); // ease in from rest instead of snapping
    setTimeout(() => carousel.classList.remove("settling"), 450);
    if (!frame) frame = requestAnimationFrame(tick);
  });
  carousel.addEventListener("pointermove", e => { x = e.clientX; });
  carousel.addEventListener("pointerleave", () => {
    x = null;
    carousel.classList.add("settling");
    buttons.forEach(b => b.style.setProperty("--lift", 0));
  });
}

/* A section's reel: thumbnails switch which item fills the lead frame (crossfade in CSS).
   Videos only play while they are the active item and the reel is on screen. */
function initReels(main) {
  const reels = [...main.querySelectorAll(".reel")];
  // every video on the site is silent; being muted is also what lets browsers autoplay it
  main.querySelectorAll(".reel video").forEach(v => { v.muted = true; v.defaultMuted = true; });
  const playActive = reel => {
    reel.querySelectorAll(".slide video").forEach(v => {
      const on = v.closest(".slide").classList.contains("on") && reel.dataset.visible === "1" && !calm();
      if (on) v.play().catch(() => {}); else v.pause();
    });
  };
  for (const reel of reels) {
    const slides = [...reel.querySelectorAll(".slide")], thumbs = [...reel.querySelectorAll(".thumb")];
    const cap = $(".reel-cap", reel), n = $(".count .n", reel);
    let at = 0;
    const show = i => {
      at = i;
      slides.forEach((s, j) => {
        s.classList.toggle("on", i === j);
        s.toggleAttribute("aria-hidden", i !== j);
        const b = $("button", s); if (b) b.tabIndex = i === j ? 0 : -1;
      });
      thumbs.forEach((t, j) => { t.classList.toggle("on", i === j); t.setAttribute("aria-pressed", i === j); });
      cap.textContent = slides[i].dataset.caption || ""; cap.hidden = !cap.textContent;
      if (n) n.textContent = i + 1;
      playActive(reel);
    };
    // arrows on the lead frame step through the items, wrapping around at either end
    const step = d => show((at + d + slides.length) % slides.length);
    $(".step.prev", reel)?.addEventListener("click", () => step(-1));
    $(".step.next", reel)?.addEventListener("click", () => step(1));
    thumbs.forEach((t, i) => {
      t.addEventListener("click", () => show(i));
      t.addEventListener("keydown", e => { // arrow keys step through the thumbnails
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const j = (i + d + thumbs.length) % thumbs.length;
        thumbs[j].focus(); show(j);
      });
    });
  }
  if (!reels.length || !("IntersectionObserver" in window)) return;
  const seen = new IntersectionObserver(entries => entries.forEach(en => {
    en.target.dataset.visible = en.isIntersecting ? "1" : "0";
    playActive(en.target);
  }), { threshold: 0.25 });
  reels.forEach(r => seen.observe(r));
}

/* Timeline rail: highlights the section currently in view and slides the marker dot to it. */
function initRail(main) {
  const rail = $(".rail", main);
  if (!rail) return;
  const links = [...rail.querySelectorAll("a")], marker = $(".marker", rail);
  const entries = links.map(a => main.querySelector(a.hash));
  let current = -1, pinned = null; // pinned: a section picked on the rail, kept while scrolling there
  const mark = i => {
    if (i === current) return;
    current = i;
    links.forEach((l, j) => j === i ? l.setAttribute("aria-current", "true") : l.removeAttribute("aria-current"));
    const a = links[i];
    marker.style.transform = `translateY(${a.offsetTop + a.offsetHeight / 2 - marker.offsetHeight / 2}px)`;
    marker.classList.add("shown");
  };
  const off = new AbortController(); // drops the window listeners below once this page is swapped away
  const update = () => {
    if (!rail.isConnected) { off.abort(); return; }
    // current = the first section that still reaches below a line near the top of the screen
    // (just under where rail jumps land, so short text-only sections count too)
    const line = 80;
    let i = entries.findIndex(e => e && e.getBoundingClientRect().bottom > line);
    if (i < 0) i = entries.length - 1;
    // the last sections may never reach that line, so at the very bottom trust the rail pick (or take the last)
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    if (pinned !== null && (atBottom || i === pinned)) i = pinned;
    else if (atBottom) i = entries.length - 1;
    mark(i);
  };
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  addEventListener("scroll", onScroll, { passive: true, signal: off.signal });
  links.forEach((a, i) => a.addEventListener("click", () => { pinned = i; mark(i); }));
  // the user scrolling on their own releases the rail pick
  for (const ev of ["wheel", "touchmove", "keydown"]) addEventListener(ev, () => { pinned = null; }, { passive: true, signal: off.signal });
  update();
}

/* Gallery: justified rows. Tiles are packed left to right into rows that exactly fill the width;
   each row's height comes from the shapes of its images, so nothing is cropped and every image is
   treated the same. Motion is kept to transform and opacity (GPU-friendly): while the window is being
   dragged the layout simply follows it; a one-off size change (e.g. rotating a phone) glides into place. */
function initGallery(main) {
  const g = $("#gallery", main);
  if (!g) return;
  const tiles = [...g.querySelectorAll(".tile")];
  const items = tiles.map(t => ({ t, r: parseFloat(getComputedStyle(t).getPropertyValue("--r")) || 1 }));

  // work out every tile's box for the current width
  const layout = () => {
    const W = g.clientWidth, gap = parseFloat(getComputedStyle(g).rowGap) || 16;
    const target = W < 600 ? 150 : W < 860 ? 210 : 260; // row height to aim for
    const boxes = new Map();
    let y = 0, row = [];
    const place = (list, h) => {
      let x = 0;
      list.forEach((it, i) => { boxes.set(it.t, { x, y, w: it.r * h, h, i }); x += it.r * h + gap; });
      y += h + gap;
    };
    for (const it of items) {
      row.push(it);
      const sum = row.reduce((s, x) => s + x.r, 0), free = W - gap * (row.length - 1);
      if (sum * target >= free) { place(row, free / sum); row = []; }
    }
    if (row.length) { // an unfinished last row keeps its natural height unless it's nearly full
      const sum = row.reduce((s, x) => s + x.r, 0), free = W - gap * (row.length - 1);
      place(row, sum * target >= free * 0.75 ? free / sum : target);
    }
    return { boxes, height: Math.max(0, y - gap), W };
  };

  const apply = ({ boxes, height }) => {
    for (const [t, b] of boxes) {
      t.getAnimations().forEach(an => { if (an.id === "glide") an.cancel(); }); // a snap overrides any glide in progress
      Object.assign(t.style, { width: `${b.w}px`, height: `${b.h}px`, transform: `translate3d(${b.x}px, ${b.y}px, 0)` });
      t.style.setProperty("--delay", `${Math.min(b.i * 60, 300)}ms`); // reveal sweeps left to right along each row
    }
    g.style.height = `${height}px`;
  };

  // glide from the old boxes to the new ones by animating transform only (FLIP)
  const glide = next => {
    const before = new Map(tiles.map(t => [t, t.getBoundingClientRect()]));
    apply(next);
    for (const t of tiles) {
      const a = before.get(t), b = t.getBoundingClientRect();
      if (!b.width || (Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 && Math.abs(a.width - b.width) < 1)) continue;
      const end = t.style.transform;
      t.animate([
        { transform: `translate3d(${a.left - b.left}px, ${a.top - b.top}px, 0) ${end} scale(${a.width / b.width}, ${a.height / b.height})`, transformOrigin: "0 0" },
        { transform: end, transformOrigin: "0 0" }
      ], { id: "glide", duration: 520, easing: "cubic-bezier(.16, 1, .3, 1)" });
    }
  };

  g.classList.add("packed");
  let current = layout();
  apply(current);

  let queued = false, lastResize = 0;
  const off = new AbortController(); // stops listening once this page is swapped away
  const onResize = () => {
    if (!g.isConnected) { ro.disconnect(); off.abort(); return; }
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const next = layout();
      if (Math.abs(next.W - current.W) < 0.5) return;
      const now = performance.now(), dragging = now - lastResize < 200;
      lastResize = now;
      current = next;
      if (dragging || calm()) apply(next); else glide(next);
    });
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(g);
  addEventListener("resize", onResize, { signal: off.signal });

  // tiles drift up and fade in as they scroll into view
  if (calm() || !("IntersectionObserver" in window)) return;
  g.classList.add("reveal");
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
    setTimeout(() => e.target.classList.add("settled"), 1600); // reveal done: hover fades react immediately
  }), { rootMargin: "0px 0px -6% 0px" });
  tiles.forEach(t => io.observe(t));
}

// biggest file in an image's srcset (the page itself shows a smaller one); falls back to src
function largest(img) {
  const best = (img.getAttribute("srcset") || "").split(",")
    .map(s => s.trim().split(/\s+/)).filter(([url]) => url)
    .map(([url, w]) => [url, parseInt(w) || 0]).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : img.getAttribute("src");
}

// everything inside <main>; runs on first load and after every in-place navigation
function initMain() {
  const main = $("main");
  initReels(main);
  initRail(main);
  initGallery(main);
  // clicking any gallery, carousel or project image enlarges it
  for (const box of main.querySelectorAll("#gallery, #carousel, .reel .lead")) {
    box.addEventListener("click", e => {
      const b = e.target.closest("button"), img = b && $("img", b);
      if (!img) return; // e.g. the reel's arrow buttons
      const src = img.getAttribute("src");
      // the carousel's second (duplicate) set has empty alt text, so borrow it from the first
      const alt = img.alt || box.querySelector(`img[src="${src}"]`).alt;
      openViewer(largest(img), alt, b);
    });
  }
  if ($("#carousel", main)) initLift($("#carousel", main));
  initCopy(main);
}
initMain();
initCopy($("footer.site"));

// discourage saving images and videos: no right-click menu or dragging them out of the page
// (this stops casual saving only; anything shown on a web page can still be captured)
for (const ev of ["contextmenu", "dragstart"]) {
  document.addEventListener(ev, e => { if (e.target.closest?.("img, video")) e.preventDefault(); });
}

// clicking the face makes the nose twitch (the header survives navigation, so it plays either way)
const snout = $(".face .snout");
if (snout) {
  $(".mark").addEventListener("click", () => {
    snout.classList.remove("poke");
    void snout.getBoundingClientRect(); // restart the animation if clicked again mid-twitch
    snout.classList.add("poke");
  });
  snout.addEventListener("animationend", e => { if (e.animationName === "poke") snout.classList.remove("poke"); });
}

/* Idle nose twitches at random moments. The eyes blink on a fixed 7s CSS cycle (a blink around
   2.7-3.0s, a double blink around 6.0-6.6s), so twitches wait for a quiet stretch of that cycle
   and never land on a blink. */
const eye = $(".face .eye");
if (snout && eye && !calm()) {
  const rand = (min, max) => min + Math.random() * (max - min);
  const nearBlink = () => {
    const t = eye.getAnimations()[0]?.currentTime;
    if (t == null) return false;
    const s = (t / 1000) % 7; // seconds into the blink cycle
    return (s > 2.0 && s < 3.7) || s > 5.3 || s < 0.25;
  };

  const twitch = () => {
    // wait out a blink or the click "poke", then try again shortly
    if (nearBlink() || snout.classList.contains("poke")) { setTimeout(twitch, rand(300, 700)); return; }
    const a = rand(4, 6), b = a * rand(0.6, 0.8);
    snout.animate([{ transform: "none" }, { transform: `rotate(${a}deg)`, offset: 0.25 }, { transform: "none", offset: 0.5 },
      { transform: `rotate(${b}deg)`, offset: 0.72 }, { transform: "none" }], { duration: rand(280, 360), easing: "ease-out" });
    setTimeout(twitch, rand(4500, 10000));
  };

  setTimeout(twitch, rand(2500, 6000));
}

/* In-place navigation: fetch the next page and swap only <main>, so the header, fonts and
   favicon are never reloaded. Falls back to a normal page load if anything goes wrong
   (including opening the files straight from disk, where fetch is blocked). */
const cache = new Map();
const isPage = a => a && a.origin === location.origin && /\.html$/.test(a.pathname) && !a.target && !a.hasAttribute("download");
const load = url => {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw r.status; return r.text(); }).catch(e => { cache.delete(url); throw e; }));
  return cache.get(url);
};

// start fetching as soon as the pointer reaches a link
const warm = e => { const a = e.target.closest?.("a"); if (isPage(a)) load(a.href).catch(() => {}); };
document.addEventListener("pointerover", warm);
document.addEventListener("touchstart", warm, { passive: true });

async function go(url, push) {
  let html;
  try { html = await load(url); } catch { location.href = url; return; }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const next = $("main", doc);
  if (!next) { location.href = url; return; }
  const swap = () => {
    $("main").replaceWith(document.adoptNode(next));
    document.title = doc.title;
    const navNext = [...doc.querySelectorAll("nav.site a")].map(a => a.hasAttribute("aria-current"));
    document.querySelectorAll("nav.site a").forEach((a, i) => navNext[i] ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    if (push) history.pushState({}, "", url);
    window.scrollTo(0, 0);
    initMain();
  };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // the browser skips the animation (but still swaps) when e.g. the tab is hidden; that's fine
    const t = document.startViewTransition(swap);
    [t.ready, t.finished, t.updateCallbackDone].forEach(p => p.catch(() => {}));
  } else swap();
}

let shownPath = location.pathname; // page whose <main> is on screen

document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a");
  if (!isPage(a)) return;
  if (a.pathname === location.pathname && a.hash) return; // jump within this page (e.g. the timeline rail): let the browser scroll
  e.preventDefault();
  if (a.href === location.href) return;
  shownPath = a.pathname;
  go(a.href, true);
});
window.addEventListener("popstate", () => {
  if (location.pathname === shownPath) return; // only the #hash changed; the browser handles that scroll
  shownPath = location.pathname;
  go(location.href, false);
});
