// Posters and photos, interleaved on purpose
const gallery = [
  { src: "grease", alt: "Pink neon Grease poster set at a diner counter with showtimes and ticket QR code" },
  { src: "cat", alt: "Tabby and white cat sniffing a white orchid in window light" },
  { src: "lmp", alt: "Night street with a streetlamp whose light cone forms the letter A between L, M and P" },
  { src: "moped", alt: "Boy with a red scarf riding on the back of a scooter in low evening sun" },
  { src: "spring", alt: "Green hills of grass with the word SPRING emerging from them and a child flying a kite" },
  { src: "roses", alt: "Pink roses against a deep blue sky, shot through a soft foreground blur" },
  { src: "noexit", alt: "Green poster with two eyes, arrow-shaped trees and the exit-sign running figure above the word EXIT" },
  { src: "greens", alt: "Young boy with a red scarf carrying a large bunch of greens across a sidewalk" }
];

const $ = (s, r = document) => r.querySelector(s);

// viewer: one dialog for the whole site, created on first use
let dlg;
function openViewer(src, alt) {
  if (!dlg) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="viewer" aria-label="Image viewer">
        <div class="in"><img id="vimg" alt=""><div class="cap"><button class="x" id="vclose">Close</button></div></div>
      </dialog>`);
    dlg = $("#viewer");
    $("#vclose").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  }
  const vimg = $("#vimg");
  vimg.src = "img/" + src + ".jpg"; vimg.alt = alt;
  if (typeof dlg.showModal === "function") dlg.showModal();
}

function initCopy(root) {
  root.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); btn.textContent = "copied"; }
    catch { const el = btn.parentNode.querySelector(".em"); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "selected"; }
    setTimeout(() => btn.textContent = "copy", 1600);
  }));
}

// everything inside <main>; runs on first load and after every in-place navigation
function initMain() {
  const main = $("main");
  const grid = $("#gallery", main);
  if (grid) {
    grid.innerHTML = gallery.map((p, i) => `<button type="button" data-i="${i}" aria-label="Enlarge image"><img src="img/${p.src}.jpg" alt="${p.alt}" loading="lazy"></button>`).join("");
    grid.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const p = gallery[+b.dataset.i]; openViewer(p.src, p.alt);
    });
  }
  initCopy(main);
}
initMain();
initCopy($("footer.site"));

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

document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a");
  if (!isPage(a)) return;
  e.preventDefault();
  if (a.href === location.href) return;
  go(a.href, true);
});
window.addEventListener("popstate", () => go(location.href, false));
