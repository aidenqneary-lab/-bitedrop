/* ═══════════════════════════════════════════════════════════════
   BiteDrop admin — edits products.json in the GitHub repo.
   Saving needs a fine-grained personal access token with
   "Contents: read & write" on the bitedrop repo only.
   ═══════════════════════════════════════════════════════════════ */
const OWNER = "aidenqneary-lab";
const REPO = "-bitedrop";
const BRANCH = "main";
const FILE = "products.json";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
const TOKEN_KEY = "bitedrop_admin_token";

let products = [];
let fileSha = null;

const table = document.getElementById("adminTable");
const tokenInput = document.getElementById("tokenInput");
const rememberBox = document.getElementById("rememberToken");
const errorBox = document.getElementById("adminError");
const okBox = document.getElementById("adminOk");
const saveBtn = document.getElementById("saveBtn");

/* UTF-8-safe base64 helpers */
const b64encode = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken) {
  tokenInput.value = savedToken;
  rememberBox.checked = true;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
  okBox.hidden = true;
}
function showOk(msg) {
  okBox.textContent = msg;
  okBox.hidden = false;
  errorBox.hidden = true;
}

function renderTable() {
  table.innerHTML = `
    <div class="admin-row admin-row--head">
      <span></span><span>Item</span><span>Price ($)</span><span>Stock</span>
    </div>`;
  for (const p of products) {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      ${p.image
        ? `<img class="admin-row__img" src="${p.image}" alt="" />`
        : `<span class="admin-row__emoji">${p.emoji}</span>`}
      <div>
        <p class="admin-row__name">${p.name}</p>
        <p class="admin-row__detail">${p.detail}</p>
      </div>
      <input type="number" min="0" step="0.01" placeholder="TBD" data-id="${p.id}" data-field="price"
        value="${p.price == null ? "" : p.price}" aria-label="Price for ${p.name}" />
      <input type="number" min="0" step="1" data-id="${p.id}" data-field="stock"
        value="${p.stock}" aria-label="Stock for ${p.name}" />`;
    table.appendChild(row);
  }
}

async function load() {
  try {
    const res = await fetch(`${API}?ref=${BRANCH}&ts=${Date.now()}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const data = await res.json();
    fileSha = data.sha;
    products = JSON.parse(b64decode(data.content.replace(/\n/g, ""))).products;
    renderTable();
  } catch (err) {
    table.innerHTML = "";
    showError("Couldn't load products.json from GitHub — check your connection and refresh.");
  }
}

saveBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    showError("Paste your GitHub token first — saving writes to the repo.");
    return;
  }
  if (rememberBox.checked) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  // read the inputs back into the product list
  for (const input of table.querySelectorAll("input[data-id]")) {
    const p = products.find((x) => x.id === input.dataset.id);
    if (input.dataset.field === "price") {
      p.price = input.value === "" ? null : Math.max(0, parseFloat(input.value));
    } else {
      p.stock = Math.max(0, parseInt(input.value || "0", 10));
    }
  }

  const json = JSON.stringify({ products }, null, 2) + "\n";
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    const res = await fetch(API, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update prices/stock via BiteDrop admin",
        content: b64encode(json),
        sha: fileSha,
        branch: BRANCH,
      }),
    });
    if (res.status === 401 || res.status === 403) throw new Error("bad-token");
    if (res.status === 409) throw new Error("conflict");
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const data = await res.json();
    fileSha = data.content.sha;
    showOk("Saved ✓ — the live site will update in a minute or two.");
  } catch (err) {
    if (err.message === "bad-token") {
      showError("GitHub rejected the token. Check it has Contents read & write access to the bitedrop repo.");
    } else if (err.message === "conflict") {
      showError("Someone else changed the file since you loaded this page. Refresh and try again.");
    } else {
      showError("Couldn't save — check your connection and try again.");
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save changes";
  }
});

load();
