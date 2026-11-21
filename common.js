/* SPORTIX — توابع مشترک بین فروشگاه و پنل ادمین */
(function () {
  const S = (window.SPORTIX = {});
  const P = "sportix_";

  /* ---------- ورود ادمین ----------
     نام کاربری: admin | رمز: sportix87
     توجه: چون سایت روی GitHub Pages فقط فرانت‌اند است، این ورود فقط یک قفل ظاهری است
     و امنیت واقعی ندارد (هر کسی می‌تواند کد را ببیند). برای امنیت واقعی بک‌اند لازم است.
     برای عوض‌کردن رمز: در پنل ادمین > تنظیمات هش جدید بساز و اینجا جایگزین کن. */
  S.ADMIN = { user: "admin", hash: "a13383be7b6761819f0c7facb4fa327bd8e81bd44c18f6b8f670a1dfaf70810d" };

  /* ---------- ابزارهای عمومی ---------- */
  S.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  S.fa = n => new Intl.NumberFormat("fa-IR").format(n);
  S.money = n => S.fa(n) + " تومان";
  S.clone = o => JSON.parse(JSON.stringify(o));
  S.en = s => String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  S.date = iso => new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  /* ---------- ذخیره‌سازی ---------- */
  S.read = (k, def) => { try { const v = localStorage.getItem(P + k + "_v3"); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  S.write = (k, v) => { try { localStorage.setItem(P + k + "_v3", JSON.stringify(v)); return true; } catch (e) { return false; } };

  // فروشگاه: اگر ادمین چیزی ذخیره کرده باشد همان، وگرنه data.js
  S.load = () => {
    const def = window.SPORTIX_DEFAULT, st = S.read("db", null);
    if (!st || (def.version || 0) > (st.version || 0)) return S.clone(def);
    return st;
  };
  S.save = db => S.write("db", db);
  S.orders = () => S.read("orders", []);
  S.saveOrders = o => S.write("orders", o);

  /* ---------- تصویر ---------- */
  S.placeholder = (name, cat) => {
    const hues = { "بدنسازی": 12, "فوتبال": 140, "دویدن": 205, "شنا": 190, "یوگا": 300, "بسکتبال": 28 };
    const h = hues[cat] != null ? hues[cat] : 220;
    const ch = (String(name || "S").trim()[0] || "S");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},35%,88%)"/><stop offset="1" stop-color="hsl(${h},30%,72%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="245" font-size="150" font-family="Tahoma,sans-serif" font-weight="700" text-anchor="middle" fill="hsl(${h},30%,35%)" fill-opacity=".55">${ch}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  S.img = (p, i) => (p.images && p.images[i || 0]) || S.placeholder(p.name, p.category);
  // اگر عکسی لود نشد (آفلاین یا لینک خراب) جایگزین نشان بده
  document.addEventListener("error", e => {
    const t = e.target;
    if (t && t.tagName === "IMG" && t.dataset.ph !== undefined && !t.dataset.done) {
      t.dataset.done = 1;
      t.src = S.placeholder(t.dataset.ph, t.dataset.cat);
    }
  }, true);

  // کوچک‌کردن عکس آپلودی تا حافظه مرورگر پر نشود
  S.resizeImage = (file, max = 900, q = 0.82) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("read"));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error("img"));
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", q));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });

  /* ---------- SHA-256 (برای قفل ورود) ---------- */
  const K = [], H0 = [];
  (() => {
    let c = 0;
    for (let n = 2; c < 64; n++) {
      let pr = true;
      for (let i = 2; i * i <= n; i++) if (n % i === 0) { pr = false; break; }
      if (!pr) continue;
      if (c < 8) H0[c] = (Math.sqrt(n) % 1) * 4294967296 | 0;
      K[c] = (Math.cbrt(n) % 1) * 4294967296 | 0;
      c++;
    }
  })();
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  S.sha256 = msg => {
    const b = new TextEncoder().encode(msg), l = b.length, total = ((l + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total); buf.set(b); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 4, (l * 8) >>> 0); dv.setUint32(total - 8, Math.floor(l * 8 / 4294967296));
    const w = new Int32Array(64); let h = H0.slice();
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], c = w[i - 2];
        w[i] = (w[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rr(c, 17) ^ rr(c, 19) ^ (c >>> 10))) | 0;
      }
      let [a, b2, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
      }
      h = [h[0] + a | 0, h[1] + b2 | 0, h[2] + c | 0, h[3] + d | 0, h[4] + e | 0, h[5] + f | 0, h[6] + g | 0, h[7] + hh | 0];
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
  };
  S.hashPass = (u, p) => { let x = "sportix|" + u + "|" + p; for (let i = 0; i < 3000; i++) x = S.sha256(x + "|" + i); return x; };

  /* ---------- تم تیره/روشن ---------- */
  S.theme = () => document.documentElement.dataset.theme;
  S.toggleTheme = () => {
    const t = S.theme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(P + "theme", t); } catch (e) {}
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "dark" ? "#0E0F11" : "#F7F8FA";
  };
})();
