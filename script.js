(() => {
  const S = window.SPORTIX, $ = id => document.getElementById(id);
  const { esc, fa, money } = S;

  let db = S.load();
  let cart = S.read("cart", {});      // { productId: qty }
  let favs = S.read("favs", []);
  const f = { cat: "همه", q: "", gender: "همه", min: "", max: "", sort: "default", stock: false };

  const heart = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  const byId = id => db.products.find(p => p.id === Number(id));
  const off = p => (p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
  const imgTag = (p, i, extra = "") => `<img src="${esc(S.img(p, i))}" data-ph="${esc(p.name)}" data-cat="${esc(p.category)}" alt="${esc(p.name)}" ${extra}>`;
  const priceHTML = p => `<div class="price">${off(p) ? `<del>${money(p.oldPrice)}</del>` : ""}<b class="${off(p) ? "sale" : ""}">${money(p.price)}</b></div>`;

  let toastT;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2000);
  }
  const open = id => { const d = $(id); if (!d.open) d.showModal(); };

  /* ---------- محتوای قابل‌ویرایش از ادمین ---------- */
  function renderSettings() {
    const s = db.settings || {};
    $("announce").textContent = s.announcement || "";
    $("heroTitle").textContent = s.heroTitle || "";
    $("heroSub").textContent = s.heroSub || "";
    $("facts").innerHTML = [
      `ارسال رایگان برای سفارش‌های بالای ${money(s.freeShipping || 0)}`,
      "دستیار هوشمند برای کمک به انتخاب محصول",
      "پک‌های آماده با تخفیف خودکار"
    ].map(t => `<li>${esc(t)}</li>`).join("");
  }

  function renderCollage() {
    const list = [...db.products.filter(p => p.featured), ...db.products.filter(p => !p.featured)].slice(0, 3);
    $("collage").innerHTML = list.map(p => `<figure><button data-open="${p.id}" aria-label="${esc(p.name)}">${imgTag(p, 0, 'loading="eager"')}</button><figcaption><span>${esc(p.name)}</span><span>${money(p.price)}</span></figcaption></figure>`).join("");
  }

  /* ---------- فیلتر و لیست محصولات ---------- */
  function renderPills() {
    const cats = ["همه", ...db.categories];
    if (!cats.includes(f.cat)) f.cat = "همه";
    $("pills").innerHTML = cats.map(c => `<button class="pill" role="tab" aria-selected="${c === f.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  }

  function card(p) {
    const out = p.stock <= 0;
    return `<article class="card">
      <div class="card-img">
        <button class="open" data-open="${p.id}" aria-label="مشاهده ${esc(p.name)}">${imgTag(p, 0, 'loading="lazy"')}</button>
        ${out ? '<span class="tag out">ناموجود</span>' : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
        ${off(p) ? `<span class="tag off">٪${fa(off(p))}</span>` : ""}
        <button class="fav ${favs.includes(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="علاقه‌مندی" aria-pressed="${favs.includes(p.id)}">${heart}</button>
      </div>
      <div class="card-body">
        <small>${esc(p.category)} · ${esc(p.gender)}</small>
        <h3><button data-open="${p.id}">${esc(p.name)}</button></h3>
        <div class="card-foot">${priceHTML(p)}<button class="btn sm" data-add="${p.id}" ${out ? "disabled" : ""}>افزودن</button></div>
      </div>
    </article>`;
  }

  function renderProducts() {
    const q = f.q.trim().toLowerCase(), min = Number(f.min) || 0, max = Number(f.max) || Infinity;
    let list = db.products.filter(p =>
      (f.cat === "همه" || p.category === f.cat) &&
      (f.gender === "همه" || p.gender === f.gender) &&
      p.price >= min && p.price <= max &&
      (!f.stock || p.stock > 0) &&
      (!q || (p.name + " " + p.category + " " + (p.desc || "")).toLowerCase().includes(q)));
    if (f.sort === "low") list.sort((a, b) => a.price - b.price);
    if (f.sort === "high") list.sort((a, b) => b.price - a.price);
    if (f.sort === "off") list.sort((a, b) => off(b) - off(a));
    $("resultCount").textContent = fa(list.length) + " محصول";
    $("grid").innerHTML = list.map(card).join("");
    $("empty").hidden = list.length > 0;
  }

  /* ---------- پک‌ها ---------- */
  const packItems = pk => pk.productIds.map(byId).filter(Boolean);
  const packPrice = pk => { const sum = packItems(pk).reduce((a, p) => a + p.price, 0); return { sum, final: Math.round(sum * (1 - pk.discount / 100) / 1000) * 1000 }; };
  function renderPacks() {
    const packs = (db.packs || []).filter(pk => packItems(pk).length >= 2);
    $("packs").hidden = !packs.length;
    $("packList").innerHTML = packs.map(pk => {
      const items = packItems(pk), { sum, final } = packPrice(pk);
      return `<article class="pack">
        <div class="pack-imgs">${items.slice(0, 4).map(p => imgTag(p, 0, 'loading="lazy"')).join("")}</div>
        <h3>${esc(pk.name)}</h3><p>${esc(pk.desc || "")}</p>
        <ul>${items.map(p => `<li>${esc(p.name)}</li>`).join("")}</ul>
        <div class="pack-foot"><div class="price"><del>${money(sum)}</del><b class="sale">${money(final)}</b></div><button class="btn" data-pack="${esc(pk.id)}">افزودن پک</button></div>
      </article>`;
    }).join("");
  }

  /* ---------- سبد خرید ---------- */
  const saveCart = () => S.write("cart", cart);
  function addToCart(id, n = 1) {
    const p = byId(id); if (!p) return false;
    if (p.stock <= 0) { toast("این محصول ناموجود است"); return false; }
    const cur = cart[p.id] || 0;
    if (cur + n > p.stock) { toast(`حداکثر ${fa(p.stock)} عدد از این محصول موجود است`); return false; }
    cart[p.id] = cur + n; saveCart(); renderCart(); return true;
  }
  // تخفیف پک: اگر همه‌ی اقلام یک پک در سبد باشد، خودکار اعمال می‌شود
  function calc() {
    const left = { ...cart }; let sub = 0, discount = 0;
    Object.entries(cart).forEach(([id, n]) => { const p = byId(id); if (p) sub += p.price * n; });
    (db.packs || []).forEach(pk => {
      const items = packItems(pk); if (items.length < 2) return;
      const k = Math.min(...items.map(p => left[p.id] || 0)); if (!k) return;
      items.forEach(p => left[p.id] -= k);
      discount += k * (packPrice(pk).sum - packPrice(pk).final);
    });
    const net = sub - discount, s = db.settings || {};
    const shipping = !sub || net >= (s.freeShipping || 0) ? 0 : (s.shippingFee || 0);
    return { sub, discount, shipping, total: net + shipping, net };
  }
  function renderCart() {
    Object.keys(cart).forEach(id => { if (!byId(id)) delete cart[id]; });
    const entries = Object.entries(cart), count = entries.reduce((a, [, n]) => a + n, 0);
    $("cartCount").hidden = !count; $("cartCount").textContent = fa(count);
    $("cartList").innerHTML = entries.map(([id, n]) => { const p = byId(id); return `<div class="cart-row">${imgTag(p, 0)}<div><b>${esc(p.name)}</b><small>${money(p.price)}</small></div><div class="qty"><button data-dec="${p.id}" aria-label="کم کردن">−</button><span>${fa(n)}</span><button data-inc="${p.id}" aria-label="زیاد کردن">+</button></div></div>`; }).join("") || '<p class="cart-empty">سبد خرید خالی است.</p>';
    const c = calc(), free = (db.settings || {}).freeShipping || 0;
    $("cartSum").innerHTML = count ? `
      <div><span>جمع کالاها</span><span>${money(c.sub)}</span></div>
      ${c.discount ? `<div class="save"><span>تخفیف پک</span><span>− ${money(c.discount)}</span></div>` : ""}
      <div><span>هزینه ارسال</span><span>${c.shipping ? money(c.shipping) : "رایگان"}</span></div>
      <div class="total"><span>مبلغ نهایی</span><span>${money(c.total)}</span></div>
      ${c.shipping && free ? `<p class="note">با ${money(Math.max(0, free - c.net))} خرید بیشتر، ارسال رایگان می‌شود.</p>` : ""}
      <button class="btn red block" id="goPay">ادامه و ثبت سفارش</button>` : "";
  }

  /* ---------- جزئیات محصول ---------- */
  function showDetail(id) {
    const p = byId(id); if (!p) return;
    const imgs = p.images && p.images.length ? p.images : [null];
    const st = p.stock <= 0 ? ["no", "ناموجود"] : p.stock <= 5 ? ["low", `فقط ${fa(p.stock)} عدد در انبار`] : ["ok", "موجود در انبار"];
    $("dTitle").textContent = p.name;
    $("dBody").innerHTML = `<div class="detail">
      <div class="gallery"><div class="main" id="gMain">${imgTag({ ...p, images: imgs[0] ? [imgs[0]] : [] }, 0)}</div>
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button data-thumb="${i}" aria-current="${i === 0}" aria-label="تصویر ${fa(i + 1)}">${imgTag({ ...p, images: [u] }, 0)}</button>`).join("")}</div>` : ""}</div>
      <div class="info">
        <div class="meta"><span class="chip">${esc(p.category)}</span><span class="chip">مناسب ${esc(p.gender)}</span>${p.badge ? `<span class="chip">${esc(p.badge)}</span>` : ""}</div>
        ${priceHTML(p)}
        <span class="stock ${st[0]}">${st[1]}</span>
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
        ${p.specs && p.specs.length ? `<table class="specs">${p.specs.map(s => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join("")}</table>` : ""}
        <div class="hero-actions"><button class="btn red" data-add="${p.id}" data-close-after ${p.stock <= 0 ? "disabled" : ""}>افزودن به سبد خرید</button><button class="btn ghost" data-fav="${p.id}">${favs.includes(p.id) ? "حذف از علاقه‌مندی‌ها" : "علاقه‌مندی"}</button></div>
      </div></div>`;
    $("dBody").dataset.imgs = JSON.stringify(imgs); $("dBody").dataset.pid = p.id;
    open("detailDlg");
  }

  function renderFavs() {
    $("favCount").hidden = !favs.length; $("favCount").textContent = fa(favs.length);
    const list = db.products.filter(p => favs.includes(p.id));
    $("favList").innerHTML = list.map(p => `<div class="fav-row">${imgTag(p, 0)}<div><b>${esc(p.name)}</b><small>${money(p.price)}</small></div><button class="btn sm" data-add="${p.id}">افزودن</button></div>`).join("") || '<p class="cart-empty">هنوز محصولی ذخیره نکرده‌ای. روی قلب هر محصول بزن.</p>';
  }
  function toggleFav(id) {
    favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    S.write("favs", favs); renderFavs(); renderProducts();
    toast(favs.includes(id) ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
  }

  /* ---------- ثبت سفارش آزمایشی ---------- */
  function submitOrder(e) {
    e.preventDefault();
    const d = new FormData(e.target), phone = S.en(d.get("phone")).replace(/\D/g, "");
    if (!/^(98|0)?9\d{9}$/.test(phone)) { $("payErr").textContent = "شماره موبایل معتبر نیست؛ مثال: ۰۹۱۲۳۴۵۶۷۸۹"; return; }
    $("payErr").textContent = "";
    const c = calc(), items = Object.entries(cart).map(([id, qty]) => { const p = byId(id); return { id: p.id, name: p.name, price: p.price, qty }; });
    const orders = S.orders();
    orders.unshift({ id: "SX-" + Date.now().toString(36).toUpperCase(), date: new Date().toISOString(), customer: { name: String(d.get("name")).trim(), phone, address: String(d.get("address")).trim() }, items, subtotal: c.sub, discount: c.discount, shipping: c.shipping, total: c.total, status: "جدید" });
    S.saveOrders(orders);
    cart = {}; saveCart(); renderCart(); e.target.reset(); $("payDlg").close();
    toast("سفارش آزمایشی ثبت شد. ممنون!");
  }

  /* ---------- دستیار ---------- */
  function chatAdd(html, who) { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; $("chat").appendChild(d); $("chat").scrollTop = $("chat").scrollHeight; }
  function budgetOf(s) {
    s = S.en(s); let m;
    if ((m = s.match(/(\d+(?:\.\d+)?)\s*میلیون/))) return Number(m[1]) * 1e6;
    if ((m = s.match(/(\d+)\s*هزار/))) return Number(m[1]) * 1e3;
    if ((m = s.match(/(\d{5,})/))) return Number(m[1]);
    return Infinity;
  }
  function reply(msg) {
    const s = msg.toLowerCase(), budget = budgetOf(msg);
    const cat = db.categories.find(c => s.includes(c)) || (/باشگاه|وزنه|عضله|تمرین خانگی/.test(s) ? "بدنسازی" : /استخر|شنا/.test(s) ? "شنا" : /می‌?دوم|دویدن|ران/.test(s) ? "دویدن" : null);
    let list = db.products.filter(p => p.stock > 0 && p.price <= budget);
    const words = s.split(/\s+/).filter(w => w.length > 2);
    if (cat) list = list.filter(p => p.category === cat);
    else { const m = list.filter(p => words.some(w => p.name.toLowerCase().includes(w))); if (m.length) list = m; else list = []; }
    if (!list.length) return `<p>چیزی دقیقاً با این مشخصات پیدا نکردم. ورزش، سطح تمرین و بودجه‌ات را بگو (مثلاً «یوگا زیر ۱ میلیون») تا از محصولات همین فروشگاه پیشنهاد بدهم.</p>`;
    list = list.sort((a, b) => off(b) - off(a)).slice(0, 3);
    return `<p>${cat ? `برای ${esc(cat)}` : "برای درخواستت"}${budget < Infinity ? ` و بودجه‌ی ${money(budget)}` : ""} این‌ها را پیشنهاد می‌کنم:</p><div class="sugg">${list.map(p => `<button data-open="${p.id}">${imgTag(p, 0)}<span><b>${esc(p.name)}</b><small>${money(p.price)}</small></span></button>`).join("")}</div>`;
  }

  /* ---------- رویدادها ---------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open],[data-fav],[data-add],[data-pack],[data-inc],[data-dec],[data-cat],[data-thumb],[data-close]");
    if (!t) return;
    if (t.dataset.close !== undefined) return t.closest("dialog").close();
    if (t.dataset.open) { if ($("aiDlg").open) $("aiDlg").close(); return showDetail(t.dataset.open); }
    if (t.dataset.fav) return toggleFav(Number(t.dataset.fav)), $("detailDlg").open && showDetail(t.dataset.fav);
    if (t.dataset.add) { if (addToCart(Number(t.dataset.add))) { toast("به سبد خرید اضافه شد"); if (t.dataset.closeAfter !== undefined) $("detailDlg").close(); } return; }
    if (t.dataset.pack) { const pk = db.packs.find(x => x.id === t.dataset.pack); const ok = packItems(pk).every(p => addToCart(p.id)); if (ok) { toast("پک به سبد اضافه شد"); open("cartDlg"); } return; }
    if (t.dataset.inc) { addToCart(Number(t.dataset.inc)); return; }
    if (t.dataset.dec) { const id = t.dataset.dec; cart[id]--; if (cart[id] <= 0) delete cart[id]; saveCart(); renderCart(); return; }
    if (t.dataset.cat) { f.cat = t.dataset.cat; renderPills(); renderProducts(); return; }
    if (t.dataset.thumb !== undefined) {
      const imgs = JSON.parse($("dBody").dataset.imgs), i = Number(t.dataset.thumb), p = byId($("dBody").dataset.pid);
      $("gMain").innerHTML = imgTag({ ...p, images: [imgs[i]] }, 0);
      document.querySelectorAll("[data-thumb]").forEach(b => b.setAttribute("aria-current", b === t));
    }
  });
  // کلیک روی پس‌زمینه‌ی دیالوگ = بستن
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  $("cartBtn").onclick = () => { renderCart(); open("cartDlg"); };
  $("favBtn").onclick = () => { renderFavs(); open("favDlg"); };
  $("themeBtn").onclick = S.toggleTheme;
  $("cartSum").addEventListener("click", e => { if (e.target.id === "goPay") { $("payTotal").innerHTML = `<span>مبلغ نهایی</span><span>${money(calc().total)}</span>`; $("cartDlg").close(); open("payDlg"); } });
  $("payForm").onsubmit = submitOrder;
  [$("fab"), $("navAssistant"), $("heroAssistant")].forEach(b => b.onclick = () => { open("aiDlg"); $("chatIn").focus(); });
  $("chatForm").onsubmit = e => { e.preventDefault(); const m = $("chatIn").value.trim(); if (!m) return; chatAdd(esc(m), "me"); $("chatIn").value = ""; setTimeout(() => chatAdd(reply(m), "bot"), 300); };

  $("q").oninput = e => { f.q = e.target.value; renderProducts(); };
  $("gender").onchange = e => { f.gender = e.target.value; renderProducts(); };
  $("minP").oninput = e => { f.min = e.target.value; renderProducts(); };
  $("maxP").oninput = e => { f.max = e.target.value; renderProducts(); };
  $("sort").onchange = e => { f.sort = e.target.value; renderProducts(); };
  $("inStock").onchange = e => { f.stock = e.target.checked; renderProducts(); };
  $("reset").onclick = () => { Object.assign(f, { cat: "همه", q: "", gender: "همه", min: "", max: "", sort: "default", stock: false }); ["q", "minP", "maxP"].forEach(i => $(i).value = ""); $("gender").value = "همه"; $("sort").value = "default"; $("inStock").checked = false; renderPills(); renderProducts(); };
  document.addEventListener("keydown", e => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $("q").focus(); } });

  // وقتی ادمین در تب دیگری چیزی را تغییر می‌دهد، همین‌جا هم به‌روز شود
  window.addEventListener("storage", e => { if (e.key && e.key.startsWith("sportix_")) { db = S.load(); cart = S.read("cart", {}); favs = S.read("favs", []); renderAll(); } });

  function renderAll() { renderSettings(); renderCollage(); renderPills(); renderProducts(); renderPacks(); renderCart(); renderFavs(); }
  chatAdd("سلام! ورزشت، سطح تمرینت و بودجه‌ات را بگو تا از محصولات همین فروشگاه پیشنهاد بدهم.", "bot");
  renderAll();
})();
