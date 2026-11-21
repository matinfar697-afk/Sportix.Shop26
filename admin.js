(() => {
  const S = window.SPORTIX, $ = id => document.getElementById(id);
  const { esc, fa, money } = S;
  const SESSION = "sportix_admin_session", LOCK = "sportix_admin_lock", TTL = 8 * 3600e3;
  const STATUSES = ["جدید", "در حال آماده‌سازی", "ارسال شد", "تحویل شد", "لغو شده"];
  const TITLES = { dash: "داشبورد", products: "محصولات", orders: "سفارش‌ها", cats: "دسته‌بندی‌ها", packs: "پک‌های ورزشی", settings: "محتوای سایت", data: "داده‌ها و انتشار" };
  let db, orders, view = "dash";
  const pf = { q: "", cat: "" };

  let toastT;
  const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2300); };
  const num = v => Number(S.en(v == null ? "" : v).replace(/[^\d.]/g, "")) || 0;
  const imgTag = p => `<img src="${esc(S.img(p, 0))}" data-ph="${esc(p.name)}" data-cat="${esc(p.category)}" alt="" loading="lazy">`;
  const sBadge = s => `<span class="badge ${{ "جدید": "blue", "در حال آماده‌سازی": "warn", "ارسال شد": "warn", "تحویل شد": "ok", "لغو شده": "no" }[s] || ""}">${esc(s)}</span>`;

  function commit(msg) {
    if (!S.save(db)) { toast("حافظه‌ی مرورگر پر است؛ از تصویر کمتر یا کوچک‌تر استفاده کن."); db = S.load(); return false; }
    if (msg) toast(msg);
    return true;
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function dlg(html, w) {
    const d = $("dlg"); d.style.width = w || ""; d.innerHTML = html;
    if (!d.open) d.showModal();
    return d;
  }
  $("dlg").addEventListener("click", e => { if (e.target === $("dlg") || e.target.closest("[data-close]")) $("dlg").close(); });

  /* ================= ورود ================= */
  const authed = () => { try { const s = JSON.parse(sessionStorage.getItem(SESSION)); return !!s && Date.now() - s.t < TTL; } catch (e) { return false; } };
  const loginErr = m => { $("loginErr").textContent = m; const c = $("loginForm"); c.classList.remove("shake"); void c.offsetWidth; if (m) c.classList.add("shake"); };

  $("loginForm").onsubmit = e => {
    e.preventDefault();
    let lock; try { lock = JSON.parse(localStorage.getItem(LOCK)) || { n: 0, until: 0 }; } catch (x) { lock = { n: 0, until: 0 }; }
    if (Date.now() < lock.until) return loginErr(`تلاش‌های ناموفق زیاد بود. ${fa(Math.ceil((lock.until - Date.now()) / 1000))} ثانیه دیگر دوباره امتحان کن.`);
    const d = new FormData(e.target), u = String(d.get("u")).trim().toLowerCase(), p = String(d.get("p"));
    const ok = u === S.ADMIN.user && S.hashPass(S.ADMIN.user, p) === S.ADMIN.hash;
    if (!ok) {
      lock.n++; if (lock.n >= 5) { lock = { n: 0, until: Date.now() + 60000 }; }
      try { localStorage.setItem(LOCK, JSON.stringify(lock)); } catch (x) {}
      return loginErr("نام کاربری یا رمز عبور اشتباه است.");
    }
    try { localStorage.removeItem(LOCK); sessionStorage.setItem(SESSION, JSON.stringify({ t: Date.now() })); } catch (x) {}
    e.target.reset(); loginErr(""); start();
  };
  $("logout").onclick = () => { try { sessionStorage.removeItem(SESSION); } catch (e) {} location.reload(); };
  $("themeBtn").onclick = S.toggleTheme;

  function start() {
    db = S.load(); orders = S.orders();
    $("login").hidden = true; $("app").hidden = false;
    go(TITLES[location.hash.slice(1)] ? location.hash.slice(1) : "dash");
  }

  /* ================= مسیریابی ================= */
  function go(v) {
    view = v; location.hash = v;
    document.querySelectorAll("#nav button").forEach(b => b.setAttribute("aria-current", b.dataset.view === v ? "page" : "false"));
    $("viewTitle").textContent = TITLES[v]; $("viewActions").innerHTML = ""; document.title = TITLES[v] + " | پنل SPORTIX";
    V[v](); window.scrollTo(0, 0);
  }
  $("nav").onclick = e => { const b = e.target.closest("[data-view]"); if (b) go(b.dataset.view); };

  /* ================= داشبورد ================= */
  function dash() {
    const live = orders.filter(o => o.status !== "لغو شده"), rev = live.reduce((a, o) => a + o.total, 0);
    const low = db.products.filter(p => p.stock <= 5);
    const cnt = c => db.products.filter(p => p.category === c).length, max = Math.max(1, ...db.categories.map(cnt));
    $("view").innerHTML = `
      <div class="stats">
        <div class="stat"><small>محصولات</small><b>${fa(db.products.length)}</b></div>
        <div class="stat"><small>سفارش‌ها (این مرورگر)</small><b>${fa(orders.length)}</b></div>
        <div class="stat"><small>جمع فروش آزمایشی</small><b>${fa(rev)}</b></div>
        <div class="stat ${low.length ? "warn" : ""}"><small>موجودی کم یا تمام‌شده</small><b>${fa(low.length)}</b></div>
      </div>
      <div class="cols">
        <div class="box"><h3>آخرین سفارش‌ها</h3><div class="list">${orders.slice(0, 5).map(o => `<div><span>${esc(o.customer.name)} · <span class="muted">${esc(o.id)}</span></span><span>${money(o.total)}</span></div>`).join("") || '<p class="muted">هنوز سفارشی ثبت نشده است.</p>'}</div></div>
        <div class="box"><h3>محصولات به تفکیک دسته</h3><div class="bars">${db.categories.map(c => `<div class="bar-row"><span>${esc(c)}</span><i><u style="width:${cnt(c) / max * 100}%"></u></i><span>${fa(cnt(c))}</span></div>`).join("")}</div></div>
      </div>
      ${low.length ? `<div class="box" style="margin-top:14px"><h3>نیاز به شارژ موجودی</h3><div class="list">${low.map(p => `<div><span>${esc(p.name)}</span><span>${p.stock <= 0 ? '<span class="badge no">ناموجود</span>' : `<span class="badge warn">${fa(p.stock)} عدد</span>`}</span></div>`).join("")}</div></div>` : ""}`;
  }

  /* ================= محصولات ================= */
  function products() {
    $("viewActions").innerHTML = '<button class="btn" id="newP">+ محصول جدید</button>';
    $("newP").onclick = () => openProduct();
    $("view").innerHTML = `<div class="toolbar"><input class="input" id="pq" placeholder="جستجو در محصولات…" value="${esc(pf.q)}"><select class="input" id="pc"><option value="">همه دسته‌ها</option>${db.categories.map(c => `<option ${c === pf.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div><div class="table-wrap" id="ptable"></div>`;
    $("pq").oninput = e => { pf.q = e.target.value; ptable(); };
    $("pc").onchange = e => { pf.cat = e.target.value; ptable(); };
    ptable();
  }
  function ptable() {
    const q = pf.q.trim().toLowerCase();
    const list = db.products.filter(p => (!pf.cat || p.category === pf.cat) && (!q || p.name.toLowerCase().includes(q)));
    $("ptable").innerHTML = list.length ? `<table class="t"><thead><tr><th>محصول</th><th>قیمت</th><th>موجودی</th><th></th></tr></thead><tbody>${list.map(p => `<tr>
      <td><div class="pcell">${imgTag(p)}<div><b>${esc(p.name)}</b><small>${esc(p.category)} · ${esc(p.gender)}${p.featured ? " · منتخب" : ""}</small></div></div></td>
      <td>${money(p.price)}${p.oldPrice > p.price ? `<br><small class="muted"><del>${money(p.oldPrice)}</del></small>` : ""}</td>
      <td>${p.stock <= 0 ? '<span class="badge no">ناموجود</span>' : p.stock <= 5 ? `<span class="badge warn">${fa(p.stock)} عدد</span>` : `<span class="badge ok">${fa(p.stock)} عدد</span>`}</td>
      <td><div class="acts"><button class="btn ghost sm" data-act="editP" data-id="${p.id}">ویرایش</button><button class="btn danger sm" data-act="delP" data-id="${p.id}">حذف</button></div></td></tr>`).join("")}</tbody></table>` : '<p class="empty">محصولی پیدا نشد.</p>';
  }

  function openProduct(id) {
    const isNew = !id;
    const p = isNew ? { id: Date.now(), name: "", category: db.categories[0] || "", gender: "یونیسکس", price: "", oldPrice: "", stock: 10, badge: "", featured: false, desc: "", specs: [], images: [] } : S.clone(db.products.find(x => x.id === Number(id)));
    let imgs = [...(p.images || [])];
    const d = dlg(`
      <div class="dlg-head"><h3>${isNew ? "محصول جدید" : "ویرایش محصول"}</h3><button class="x" data-close aria-label="بستن">×</button></div>
      <form class="dlg-body" id="pForm"><div class="form-grid">
        <label class="field full">نام محصول<input name="name" required value="${esc(p.name)}"></label>
        <label class="field">دسته‌بندی<select name="category">${db.categories.map(c => `<option ${c === p.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label class="field">مناسب برای<select name="gender">${["یونیسکس", "مردانه", "زنانه"].map(g => `<option ${g === p.gender ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        <label class="field">قیمت (تومان)<input name="price" required inputmode="numeric" value="${esc(p.price)}"></label>
        <label class="field">قیمت قبل از تخفیف (اختیاری)<input name="oldPrice" inputmode="numeric" value="${esc(p.oldPrice || "")}"></label>
        <label class="field">موجودی (عدد)<input name="stock" inputmode="numeric" value="${esc(p.stock)}"></label>
        <label class="field">برچسب (مثلاً پرفروش)<input name="badge" value="${esc(p.badge || "")}"></label>
        <label class="check full"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}> نمایش در بالای صفحه‌ی اصلی (منتخب)</label>
        <label class="field full">توضیحات<textarea name="desc" rows="3">${esc(p.desc || "")}</textarea></label>
        <label class="field full">مشخصات فنی<textarea name="specs" rows="4" placeholder="هر خط یک مورد، به شکل  عنوان: مقدار&#10;وزن: ۵ کیلوگرم">${esc((p.specs || []).map(s => s.join(": ")).join("\n"))}</textarea><small>هر خط یک مشخصه؛ عنوان و مقدار را با «:» جدا کن.</small></label>
        <div class="field full">تصاویر
          <div class="imgs" id="imgs"></div>
          <div class="urlrow"><input class="input" id="imgUrl" placeholder="یا لینک عکس را بچسبان (https://…)" dir="ltr"><button type="button" class="btn ghost sm" id="addUrl">افزودن لینک</button></div>
          <small>اولین تصویر، تصویر اصلی است. عکس‌های آپلودی خودکار کوچک می‌شوند تا حافظه‌ی مرورگر پر نشود.</small>
        </div>
      </div>
      <p class="err" id="pErr" role="alert"></p>
      <div class="dlg-actions"><button type="button" class="btn ghost" data-close>انصراف</button><button class="btn">ذخیره محصول</button></div></form>`, "min(780px,94vw)");

    const paint = () => {
      $("imgs").innerHTML = imgs.map((u, i) => `<figure class="${i === 0 ? "main" : ""}"><img src="${esc(u)}" alt="" data-ph="${esc(p.name || "S")}" data-cat="${esc(p.category)}"><button type="button" class="del" data-del="${i}" aria-label="حذف تصویر">×</button>${i === 0 ? '<span class="lbl">اصلی</span>' : `<button type="button" class="mk" data-main="${i}">اصلی شود</button>`}</figure>`).join("") +
        `<label class="drop"><input type="file" accept="image/*" multiple id="file">+ آپلود<br>عکس</label>`;
      $("file").onchange = async e => {
        const files = [...e.target.files]; let bad = 0;
        for (const f of files) { if (imgs.length >= 8) { toast("حداکثر ۸ تصویر برای هر محصول"); break; } try { imgs.push(await S.resizeImage(f)); } catch (x) { bad++; } }
        if (bad) toast("بعضی فایل‌ها تصویر معتبر نبودند");
        paint();
      };
    };
    paint();
    $("imgs").onclick = e => {
      const del = e.target.closest("[data-del]"), mk = e.target.closest("[data-main]");
      if (del) { imgs.splice(Number(del.dataset.del), 1); paint(); }
      if (mk) { const [x] = imgs.splice(Number(mk.dataset.main), 1); imgs.unshift(x); paint(); }
    };
    $("addUrl").onclick = () => {
      const u = $("imgUrl").value.trim();
      if (!/^https?:\/\//i.test(u)) return toast("لینک باید با http:// یا https:// شروع شود");
      if (imgs.length >= 8) return toast("حداکثر ۸ تصویر برای هر محصول");
      imgs.push(u); $("imgUrl").value = ""; paint();
    };
    $("pForm").onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target), err = m => { $("pErr").textContent = m; };
      const price = num(fd.get("price")), oldPrice = num(fd.get("oldPrice")), stock = Math.max(0, Math.floor(num(fd.get("stock"))));
      const name = String(fd.get("name")).trim();
      if (!name) return err("نام محصول را وارد کن.");
      if (price <= 0) return err("قیمت باید بیشتر از صفر باشد.");
      if (oldPrice && oldPrice <= price) return err("قیمت قبل از تخفیف باید از قیمت فعلی بیشتر باشد (یا خالی بگذار).");
      const specs = String(fd.get("specs")).split("\n").map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(s => s && s[0] && s[1]);
      const out = { id: p.id, name, category: fd.get("category"), gender: fd.get("gender"), price, oldPrice, stock, badge: String(fd.get("badge")).trim(), featured: fd.get("featured") === "on", desc: String(fd.get("desc")).trim(), specs, images: imgs };
      const before = S.clone(db);
      if (isNew) db.products.unshift(out); else db.products = db.products.map(x => x.id === out.id ? out : x);
      if (!commit(isNew ? "محصول اضافه شد" : "تغییرات ذخیره شد")) { db = before; return err("ذخیره نشد: حافظه‌ی مرورگر پر است. تصاویر کمتر یا کوچک‌تر بگذار."); }
      $("dlg").close(); products();
    };
  }

  /* ================= سفارش‌ها ================= */
  let of = "";
  function ordersView() {
    $("view").innerHTML = `<p class="muted" style="margin-bottom:14px;font-size:13.5px">سفارش‌های آزمایشی فقط در همان مرورگری ذخیره می‌شوند که مشتری با آن سفارش داده است (فروشگاه بک‌اند ندارد).</p>
      <div class="toolbar"><select class="input" id="of"><option value="">همه وضعیت‌ها</option>${STATUSES.map(s => `<option ${s === of ? "selected" : ""}>${s}</option>`).join("")}</select></div><div id="olist"></div>`;
    $("of").onchange = e => { of = e.target.value; olist(); };
    olist();
  }
  function olist() {
    const list = orders.filter(o => !of || o.status === of);
    $("olist").innerHTML = list.map(o => `<details class="order"><summary><b>${esc(o.id)}</b><span>${esc(o.customer.name)}</span><span>${money(o.total)}</span>${sBadge(o.status)}</summary>
      <div class="order-body">
        <div class="muted">${S.date(o.date)} · <span class="ltr">${esc(o.customer.phone)}</span><br>${esc(o.customer.address)}</div>
        <div class="lines">${o.items.map(i => `<div><span>${esc(i.name)} × ${fa(i.qty)}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
          ${o.discount ? `<div><span>تخفیف پک</span><span>− ${money(o.discount)}</span></div>` : ""}<div><span>ارسال</span><span>${o.shipping ? money(o.shipping) : "رایگان"}</span></div><div><b>جمع</b><b>${money(o.total)}</b></div></div>
        <div class="row"><select data-status="${esc(o.id)}" aria-label="وضعیت سفارش">${STATUSES.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select><button class="btn danger sm" data-act="delO" data-id="${esc(o.id)}">حذف سفارش</button></div>
      </div></details>`).join("") || '<p class="empty">سفارشی وجود ندارد.</p>';
  }

  /* ================= دسته‌بندی‌ها ================= */
  function cats() {
    const used = c => db.products.filter(p => p.category === c).length;
    $("view").innerHTML = `<div class="rows" id="catRows">${db.categories.map(c => `<div class="rowline"><input value="${esc(c)}" data-cat="${esc(c)}" aria-label="نام دسته"><span class="badge">${fa(used(c))} محصول</span><button class="btn danger sm" data-act="delCat" data-name="${esc(c)}" ${used(c) ? "disabled" : ""} title="${used(c) ? "ابتدا محصولات این دسته را جابه‌جا یا حذف کن" : ""}">حذف</button></div>`).join("")}</div>
      <form class="addline" id="addCat"><input class="input" name="n" placeholder="نام دسته‌ی جدید" required><button class="btn">افزودن دسته</button></form>`;
    $("catRows").onchange = e => {
      const old = e.target.dataset.cat, n = e.target.value.trim();
      if (!n || (n !== old && db.categories.includes(n))) { toast("نام دسته خالی یا تکراری است"); e.target.value = old; return; }
      db.categories = db.categories.map(c => c === old ? n : c); db.products.forEach(p => { if (p.category === old) p.category = n; });
      if (commit("نام دسته تغییر کرد")) cats();
    };
    $("addCat").onsubmit = e => {
      e.preventDefault(); const n = new FormData(e.target).get("n").trim();
      if (db.categories.includes(n)) return toast("این دسته قبلاً وجود دارد");
      db.categories.push(n); if (commit("دسته اضافه شد")) cats();
    };
  }

  /* ================= پک‌ها ================= */
  function packs() {
    $("viewActions").innerHTML = '<button class="btn" id="newPack">+ پک جدید</button>';
    $("newPack").onclick = () => openPack();
    const pk = db.packs || [];
    $("view").innerHTML = pk.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>پک</th><th>اقلام</th><th>تخفیف</th><th></th></tr></thead><tbody>${pk.map(x => `<tr><td><b>${esc(x.name)}</b><br><small class="muted">${esc(x.desc || "")}</small></td><td>${x.productIds.map(id => (db.products.find(p => p.id === id) || {}).name).filter(Boolean).map(esc).join("، ")}</td><td>٪${fa(x.discount)}</td><td><div class="acts"><button class="btn ghost sm" data-act="editPack" data-id="${esc(x.id)}">ویرایش</button><button class="btn danger sm" data-act="delPack" data-id="${esc(x.id)}">حذف</button></div></td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">هنوز پکی نساخته‌ای.</p>';
  }
  function openPack(id) {
    const old = (db.packs || []).find(x => x.id === id), isNew = !old;
    const p = old ? S.clone(old) : { id: "p" + Date.now(), name: "", desc: "", productIds: [], discount: 10 };
    dlg(`<div class="dlg-head"><h3>${isNew ? "پک جدید" : "ویرایش پک"}</h3><button class="x" data-close aria-label="بستن">×</button></div>
      <form class="dlg-body form-grid" id="packForm">
        <label class="field full">نام پک<input name="name" required value="${esc(p.name)}"></label>
        <label class="field full">توضیح کوتاه<input name="desc" value="${esc(p.desc || "")}"></label>
        <label class="field">درصد تخفیف<input name="discount" inputmode="numeric" value="${esc(p.discount)}"></label>
        <div class="field full">اقلام پک (حداقل ۲ محصول)<div class="packsel">${db.products.map(x => `<label class="check"><input type="checkbox" name="pid" value="${x.id}" ${p.productIds.includes(x.id) ? "checked" : ""}> ${esc(x.name)}</label>`).join("")}</div></div>
        <p class="err full" id="kErr" role="alert"></p>
        <div class="dlg-actions full"><button type="button" class="btn ghost" data-close>انصراف</button><button class="btn">ذخیره پک</button></div></form>`);
    $("packForm").onsubmit = e => {
      e.preventDefault(); const fd = new FormData(e.target), ids = fd.getAll("pid").map(Number), disc = Math.min(60, Math.max(0, num(fd.get("discount"))));
      if (ids.length < 2) { $("kErr").textContent = "حداقل دو محصول انتخاب کن."; return; }
      const out = { id: p.id, name: String(fd.get("name")).trim(), desc: String(fd.get("desc")).trim(), productIds: ids, discount: disc };
      db.packs = db.packs || []; db.packs = isNew ? [...db.packs, out] : db.packs.map(x => x.id === out.id ? out : x);
      if (commit("پک ذخیره شد")) { $("dlg").close(); packs(); }
    };
  }

  /* ================= محتوای سایت ================= */
  function settings() {
    const s = db.settings || {};
    $("view").innerHTML = `<form class="card-form" id="setForm"><h3>متن‌های صفحه‌ی اصلی</h3>
        <label class="field">نوار اعلان بالای سایت<input name="announcement" value="${esc(s.announcement || "")}"><small>خالی بگذاری، نوار نمایش داده نمی‌شود.</small></label>
        <label class="field">تیتر اصلی<textarea name="heroTitle" rows="2">${esc(s.heroTitle || "")}</textarea><small>با Enter می‌توانی تیتر را به دو خط بشکنی.</small></label>
        <label class="field">زیرتیتر<textarea name="heroSub" rows="2">${esc(s.heroSub || "")}</textarea></label>
        <h3>ارسال</h3>
        <div class="form-grid"><label class="field">ارسال رایگان از مبلغ (تومان)<input name="freeShipping" inputmode="numeric" value="${esc(s.freeShipping || 0)}"></label>
        <label class="field">هزینه ارسال زیر آن مبلغ (تومان)<input name="shippingFee" inputmode="numeric" value="${esc(s.shippingFee || 0)}"></label></div>
        <div><button class="btn">ذخیره تغییرات</button></div></form>
      <form class="card-form" id="passForm" style="margin-top:14px"><h3>تغییر رمز ورود</h3>
        <p class="muted" style="font-size:13.5px">چون سایت بک‌اند ندارد، رمز به‌صورت هش در فایل <span class="ltr">common.js</span> ذخیره می‌شود. رمز جدید را بنویس، هش را بساز و در همان فایل جایگزین کن.</p>
        <label class="field">رمز جدید<input name="np" type="password" autocomplete="new-password" minlength="6" required></label>
        <div><button class="btn ghost">ساخت هش</button></div><div class="hashout" id="hashOut" hidden></div></form>`;
    $("setForm").onsubmit = e => {
      e.preventDefault(); const fd = new FormData(e.target);
      db.settings = { ...db.settings, announcement: String(fd.get("announcement")).trim(), heroTitle: String(fd.get("heroTitle")).trim(), heroSub: String(fd.get("heroSub")).trim(), freeShipping: num(fd.get("freeShipping")), shippingFee: num(fd.get("shippingFee")) };
      commit("تغییرات ذخیره شد");
    };
    $("passForm").onsubmit = e => {
      e.preventDefault(); const np = new FormData(e.target).get("np");
      const o = $("hashOut"); o.hidden = false; o.textContent = `S.ADMIN = { user: "${S.ADMIN.user}", hash: "${S.hashPass(S.ADMIN.user, np)}" };`;
    };
  }

  /* ================= داده‌ها و انتشار ================= */
  function data() {
    $("view").innerHTML = `<div class="data-grid">
      <div class="box"><h3>انتشار تغییرات برای همه‌ی بازدیدکننده‌ها</h3><p>تغییراتی که اینجا می‌دهی فقط در همین مرورگر ذخیره می‌شود. برای اینکه همه ببینند: فایل <span class="ltr">data.js</span> را بگیر و در ریشه‌ی ریپازیتوری GitHub جایگزین فایل قبلی کن.</p><button class="btn" data-act="exportJs">دانلود data.js</button></div>
      <div class="box"><h3>بکاپ</h3><p>یک فایل JSON از محصولات، دسته‌ها، پک‌ها، تنظیمات و سفارش‌ها.</p><div class="acts" style="justify-content:flex-start"><button class="btn ghost" data-act="exportJson">دانلود بکاپ</button><label class="btn ghost">بازگردانی بکاپ<input type="file" accept="application/json" id="imp" hidden></label></div></div>
      <div class="box"><h3>پاک‌سازی سفارش‌ها</h3><p>همه‌ی سفارش‌های آزمایشی این مرورگر حذف می‌شود.</p><div><button class="btn danger" data-act="clearOrders">حذف همه‌ی سفارش‌ها</button></div></div>
      <div class="box"><h3>بازنشانی فروشگاه</h3><p>همه‌ی تغییرات این مرورگر پاک می‌شود و داده‌های فایل data.js برمی‌گردد.</p><div><button class="btn danger" data-act="reset">بازنشانی به پیش‌فرض</button></div></div></div>`;
    $("imp").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text()), d = j.db || j;
        if (!Array.isArray(d.products) || !Array.isArray(d.categories)) throw 0;
        const before = db; db = d; db.version = Date.now();
        if (!commit()) { db = before; return; }
        if (Array.isArray(j.orders)) { orders = j.orders; S.saveOrders(orders); }
        toast("بکاپ بازگردانی شد");
      } catch (x) { toast("فایل بکاپ معتبر نیست"); }
    };
  }

  /* ================= اکشن‌ها ================= */
  const ACT = {
    editP: d => openProduct(Number(d.id)),
    delP: d => {
      const p = db.products.find(x => x.id === Number(d.id)); if (!p || !confirm(`«${p.name}» حذف شود؟`)) return;
      db.products = db.products.filter(x => x.id !== p.id);
      (db.packs || []).forEach(k => k.productIds = k.productIds.filter(i => i !== p.id));
      if (commit("محصول حذف شد")) ptable();
    },
    delO: d => { if (!confirm("این سفارش حذف شود؟")) return; orders = orders.filter(o => o.id !== d.id); S.saveOrders(orders); toast("سفارش حذف شد"); ordersView(); },
    delCat: d => { db.categories = db.categories.filter(c => c !== d.name); if (commit("دسته حذف شد")) cats(); },
    editPack: d => openPack(d.id),
    delPack: d => { if (!confirm("این پک حذف شود؟")) return; db.packs = db.packs.filter(x => x.id !== d.id); if (commit("پک حذف شد")) packs(); },
    exportJs: () => {
      db.version = Date.now(); commit();
      download("data.js", `/* SPORTIX — داده‌های فروشگاه (خروجی پنل ادمین) */\nwindow.SPORTIX_DEFAULT = ${JSON.stringify(db, null, 2)};\n`, "text/javascript");
      toast("data.js دانلود شد؛ آن را در GitHub جایگزین کن");
    },
    exportJson: () => download("sportix-backup.json", JSON.stringify({ db, orders }, null, 2), "application/json"),
    clearOrders: () => { if (!confirm("همه‌ی سفارش‌ها حذف شود؟")) return; orders = []; S.saveOrders(orders); toast("سفارش‌ها پاک شد"); },
    reset: () => { if (!confirm("همه‌ی تغییرات این مرورگر پاک و داده‌های پیش‌فرض برگردانده شود؟")) return; try { localStorage.removeItem("sportix_db_v3"); } catch (e) {} db = S.load(); toast("بازنشانی شد"); }
  };
  $("view").addEventListener("click", e => { const t = e.target.closest("[data-act]"); if (t && ACT[t.dataset.act]) ACT[t.dataset.act](t.dataset); });
  $("view").addEventListener("change", e => {
    const id = e.target.dataset.status; if (!id) return;
    const o = orders.find(x => x.id === id); o.status = e.target.value; S.saveOrders(orders); toast("وضعیت سفارش به‌روز شد"); olist();
    document.querySelector(`[data-status="${CSS.escape(id)}"]`).closest("details").open = true;
  });

  const V = { dash, products, orders: ordersView, cats, packs, settings, data };
  window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (!$("app").hidden && TITLES[v] && v !== view) go(v); });
  window.addEventListener("storage", e => { if (e.key === "sportix_orders_v3" && !$("app").hidden) { orders = S.orders(); if (view === "orders") ordersView(); if (view === "dash") dash(); } });

  if (authed()) start();
})();
