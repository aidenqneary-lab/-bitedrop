/* ═══════════════════════════════════════════════════════════════
   BiteDrop inventory lives in products.json — edit prices and
   stock there directly, or use admin.html which saves it for you.
   ═══════════════════════════════════════════════════════════════ */
let PRODUCTS = [];

const LOW_STOCK = 5; // at or below this, the "low stock" badge shows

/* ── State ── */
const cart = new Map(); // id -> qty

/* ── Elements ── */
const grid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const totalNote = document.getElementById("totalNote");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const toast = document.getElementById("toast");
const heroStock = document.getElementById("heroStock");

/* Scroll-reveal: elements with .reveal fade/slide in as they enter view */
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);
function reveal(el, delayMs = 0) {
  el.classList.add("reveal");
  el.style.transitionDelay = delayMs + "ms";
  // once the entrance finishes, drop the reveal styles so the element's own
  // hover transitions (shadow, lift) take back over
  el.addEventListener(
    "transitionend",
    () => {
      el.classList.remove("reveal", "in");
      el.style.transitionDelay = "";
    },
    { once: true }
  );
  revealObserver.observe(el);
}
let firstGridRender = true; // only animate cards on the initial page load

const money = (n) => "$" + n.toFixed(2);
const priceLabel = (p) => (p == null ? "Price TBD" : money(p));
const remaining = (p) => p.stock - (cart.get(p.id) || 0);

/* ── Product grid ── */
function renderGrid() {
  grid.innerHTML = "";
  for (const p of PRODUCTS) {
    const left = remaining(p);
    const out = left <= 0;
    const card = document.createElement("article");
    card.className = "card" + (out ? " card--out" : "");

    let badge = "";
    if (out) badge = '<span class="card__badge card__badge--out">Sold out</span>';
    else if (p.stock <= LOW_STOCK) badge = '<span class="card__badge card__badge--low">Low stock</span>';

    // real product photo when available; falls back to the emoji if the file is missing
    const art = p.image
      ? `<img class="card__img" src="${p.image}" alt="${p.name}" onerror="this.outerHTML='${p.emoji}'" />`
      : p.emoji;
    card.innerHTML = `
      ${badge}
      <div class="card__art">${art}</div>
      <div class="card__body">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__detail">${p.detail}</p>
        <p class="card__stock">${out ? "None left" : left + " left in stock"}</p>
        <div class="card__row">
          <span class="card__price ${p.price == null ? "card__price--tbd" : ""}">${priceLabel(p.price)}</span>
          <button class="card__add" data-id="${p.id}" ${out ? "disabled" : ""}>
            ${out ? "Sold out" : "Add +"}
          </button>
        </div>
      </div>`;
    if (firstGridRender) reveal(card, PRODUCTS.indexOf(p) * 70);
    grid.appendChild(card);
  }
  firstGridRender = false;
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".card__add");
  if (!btn) return;
  addToCart(btn.dataset.id);
});

/* ── Cart logic ── */
function addToCart(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p || remaining(p) <= 0) return;
  cart.set(id, (cart.get(id) || 0) + 1);
  showToast(`${p.emoji} ${p.name} added to cart`);
  renderAll();
}

function changeQty(id, delta) {
  const p = PRODUCTS.find((x) => x.id === id);
  const qty = (cart.get(id) || 0) + delta;
  if (delta > 0 && remaining(p) <= 0) return;
  if (qty <= 0) cart.delete(id);
  else cart.set(id, qty);
  renderAll();
}

function renderCart() {
  cartItems.innerHTML = "";
  if (cart.size === 0) {
    cartItems.innerHTML =
      '<p class="cart-empty"><span class="big">🛒</span>Nothing here yet.<br />Go grab something sweet!</p>';
  }

  let totalQty = 0;
  let totalPrice = 0;
  let anyUnpriced = false;

  for (const [id, qty] of cart) {
    const p = PRODUCTS.find((x) => x.id === id);
    totalQty += qty;
    if (p.price == null) anyUnpriced = true;
    else totalPrice += p.price * qty;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <span class="cart-item__emoji">${p.emoji}</span>
      <div class="cart-item__info">
        <p class="cart-item__name">${p.name}</p>
        <p class="cart-item__price">${priceLabel(p.price)} each</p>
      </div>
      <div class="cart-item__qty">
        <button data-id="${id}" data-d="-1" aria-label="Remove one ${p.name}">−</button>
        <span>${qty}</span>
        <button data-id="${id}" data-d="1" aria-label="Add one ${p.name}" ${remaining(p) <= 0 ? "disabled" : ""}>+</button>
      </div>`;
    cartItems.appendChild(row);
  }

  cartCount.textContent = totalQty;
  if (cart.size === 0) {
    cartTotal.textContent = "—";
    totalNote.hidden = true;
  } else if (anyUnpriced) {
    cartTotal.textContent = totalPrice > 0 ? money(totalPrice) + " +" : "TBD";
    totalNote.hidden = false;
  } else {
    cartTotal.textContent = money(totalPrice);
    totalNote.hidden = true;
  }
}

cartItems.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  changeQty(btn.dataset.id, Number(btn.dataset.d));
});

/* ── Drawer ── */
function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}
document.getElementById("cartBtn").addEventListener("click", openDrawer);
document.getElementById("drawerClose").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const checkout = document.getElementById("checkoutOverlay");
  if (!checkout.hidden) checkout.hidden = true;
  else closeDrawer();
});

/* ── Checkout: collect contact info, then email the order ── */
const ORDER_EMAIL = "aidenqneary@gmail.com"; // orders are sent here via formsubmit.co
const checkoutOverlay = document.getElementById("checkoutOverlay");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutError = document.getElementById("checkoutError");
const checkoutSubmit = document.getElementById("checkoutSubmit");

document.getElementById("checkoutBtn").addEventListener("click", () => {
  if (cart.size === 0) {
    showToast("Your cart is empty — add some snacks first!");
    return;
  }
  checkoutError.hidden = true;
  checkoutOverlay.hidden = false;
  checkoutForm.querySelector("input[name=name]").focus();
});

function closeCheckout() {
  checkoutOverlay.hidden = true;
}
document.getElementById("checkoutClose").addEventListener("click", closeCheckout);
checkoutOverlay.addEventListener("click", (e) => {
  if (e.target === checkoutOverlay) closeCheckout();
});

function orderSummary() {
  const lines = [];
  let total = 0;
  let anyUnpriced = false;
  for (const [id, qty] of cart) {
    const p = PRODUCTS.find((x) => x.id === id);
    lines.push(`${qty}x ${p.name} (${p.detail}) — ${priceLabel(p.price)} each`);
    if (p.price == null) anyUnpriced = true;
    else total += p.price * qty;
  }
  lines.push(anyUnpriced ? `Total: ${total > 0 ? money(total) + " + unpriced items" : "TBD (prices not set)"}` : `Total: ${money(total)}`);
  return lines.join("\n");
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(checkoutForm);
  const payload = {
    _subject: "BITEDROP STORE",
    _template: "box",
    name: data.get("name"),
    email: data.get("email"),
    "meet location": data.get("location") || "(not given)",
    order: orderSummary(),
  };

  checkoutSubmit.disabled = true;
  checkoutSubmit.textContent = "Sending…";
  checkoutError.hidden = true;
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${ORDER_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("send failed");

    for (const [id, qty] of cart) {
      const p = PRODUCTS.find((x) => x.id === id);
      p.stock = Math.max(0, p.stock - qty);
    }
    cart.clear();
    renderAll();
    checkoutForm.reset();
    closeCheckout();
    closeDrawer();
    showToast("🎉 Order sent! We'll get back to you on Gmail.");
  } catch (err) {
    checkoutError.textContent =
      "Couldn't send your order — check your connection and try again.";
    checkoutError.hidden = false;
  } finally {
    checkoutSubmit.disabled = false;
    checkoutSubmit.textContent = "Confirm order";
  }
});

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ── Hero stock note ── */
function renderHero() {
  const total = PRODUCTS.reduce((s, p) => s + p.stock, 0);
  heroStock.textContent = `${total} packs in stock right now`;
}

function renderAll() {
  renderGrid();
  renderCart();
  renderHero();
}

/* ── Boot: load inventory, then render ── */
async function init() {
  try {
    const res = await fetch("products.json?ts=" + Date.now());
    PRODUCTS = (await res.json()).products;
  } catch (err) {
    grid.innerHTML =
      '<p class="cart-empty">Couldn\'t load the stock list — refresh to try again.</p>';
    return;
  }
  renderAll();
  document.querySelectorAll(".shop__head, .faq h2").forEach((el) => reveal(el));
  document.querySelectorAll(".faq__steps li").forEach((el, i) => reveal(el, i * 90));
}
init();
