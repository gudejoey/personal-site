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
  await vimg.decode().catch(() => {}); // know the final size before measuring
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

// everything inside <main>; runs on first load and after every in-place navigation
function initMain() {
  const main = $("main");
  // clicking any gallery, carousel or project image enlarges it
  for (const box of main.querySelectorAll("#gallery, #carousel, .media")) {
    box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const img = $("img", b), src = img.getAttribute("src");
      // the carousel's second (duplicate) set has empty alt text, so borrow it from the first
      const alt = img.alt || box.querySelector(`img[src="${src}"]`).alt;
      openViewer(src, alt, b);
    });
  }
  if ($("#carousel", main)) initLift($("#carousel", main));
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
