(() => {
  "use strict";
  const one = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const USERS = {
    karen: {
      hash: "93f2947d95ceabd3989ebd156b54c183e76ea006c4d93ad9557bead57701dfe5",
      role: "admin",
      name: "Karen",
    },
    taller: {
      hash: "eaaedae85b40710496e7ba12793e2bd1323fcfd22b8ab04e6998dd7d78e04b4f",
      role: "operator",
      name: "Encargada del taller",
    },
  };
  const money = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const sha256 = async (text) =>
    [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
    ]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  const currentWeek = () => {
    const now = new Date();
    const date = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return `${date.getUTCFullYear()}-W${String(Math.ceil(((date - yearStart) / 86400000 + 1) / 7)).padStart(2, "0")}`;
  };
  const today = () => new Date().toISOString().slice(0, 10);
  let state = {
    user: null,
    week: currentWeek(),
    works: [],
    payments: [],
    closes: [],
    audit: [],
    closed: false,
  };

  function jsonp(payload) {
    return new Promise((resolve, reject) => {
      const callback = `kv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const script = document.createElement("script");
      const timer = setTimeout(
        () => finish(null, Error("No fue posible conectar con Google Sheets")),
        15000,
      );
      function finish(value, error) {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(value);
      }
      window[callback] = (response) =>
        response.ok
          ? finish(response.data)
          : finish(
              null,
              Error(response.error || "No fue posible completar la operación"),
            );
      script.onerror = () =>
        finish(
          null,
          Error("El navegador bloqueó la conexión con Google Sheets"),
        );
      script.src = `${window.SYSTEM_CONFIG.API_URL}?callback=${callback}&payload=${encodeURIComponent(JSON.stringify({ ...payload, appKey: window.SYSTEM_CONFIG.APP_KEY }))}`;
      document.head.appendChild(script);
    });
  }
  function demoDatabase() {
    return JSON.parse(
      localStorage.getItem("kvWorkshopDemo") ||
        '{"works":[],"payments":[],"closes":[],"audit":[]}',
    );
  }
  function saveDemo(db) {
    localStorage.setItem("kvWorkshopDemo", JSON.stringify(db));
  }
  function demoApi(action, data) {
    const db = demoDatabase();
    if (action === "list")
      return {
        works: db.works.filter((x) => x.week === data.week),
        payments: db.payments.filter((x) => x.week === data.week),
        closes: db.closes,
        audit: db.audit,
        closed: db.closes.some((x) => x.week === data.week),
      };
    if (action === "saveWork") {
      db.works.push({
        ...data.item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        createdBy: state.user.name,
      });
      db.audit.unshift({
        at: new Date().toISOString(),
        user: state.user.name,
        event: "Registró vestido",
        detail: data.item.client,
      });
      saveDemo(db);
      return true;
    }
    if (action === "savePayment") {
      db.payments.push({
        ...data.item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        createdBy: state.user.name,
      });
      db.audit.unshift({
        at: new Date().toISOString(),
        user: state.user.name,
        event: "Registró abono",
        detail: money(data.item.value),
      });
      saveDemo(db);
      return true;
    }
    if (action === "closeWeek") {
      const works = db.works.filter((x) => x.week === data.week),
        payments = db.payments.filter((x) => x.week === data.week);
      const total = works.reduce((sum, x) => sum + Number(x.value), 0),
        paid = payments.reduce((sum, x) => sum + Number(x.value), 0);
      db.closes.unshift({
        week: data.week,
        count: works.length,
        total,
        paid,
        balance: total - paid,
        closedAt: new Date().toISOString(),
        closedBy: state.user.name,
      });
      db.audit.unshift({
        at: new Date().toISOString(),
        user: state.user.name,
        event: "Cerró semana",
        detail: data.week,
      });
      saveDemo(db);
      return true;
    }
    throw Error("Acción no disponible");
  }
  async function api(action, data = {}) {
    if (window.SYSTEM_CONFIG.DEMO_MODE || !window.SYSTEM_CONFIG.API_URL)
      return demoApi(action, data);
    return jsonp({ action, ...data });
  }
  function toast(message) {
    one("#toast").textContent = message;
    one("#toast").classList.add("show");
    setTimeout(() => one("#toast").classList.remove("show"), 2200);
  }
  async function load() {
    const data = await api("list", { week: state.week });
    Object.assign(state, data);
    render();
  }
  function render() {
    const total = state.works.reduce(
      (sum, item) => sum + Number(item.value),
      0,
    );
    const paid = state.payments.reduce(
      (sum, item) => sum + Number(item.value),
      0,
    );
    const balance = total - paid;
    one("#weekLabel").textContent = state.week.replace("-W", " · Semana ");
    one("#statWorks").textContent = state.works.length;
    one("#statTotal").textContent = money(total);
    one("#statPaid").textContent = money(paid);
    one("#balanceTitle").textContent =
      balance >= 0 ? "Saldo pendiente" : "Saldo a favor de Karen";
    one("#statBalance").textContent = money(Math.abs(balance));
    one("#weekState").textContent = state.closed ? "Cerrada" : "Abierta";
    const statuses = ["Cortado", "En confección", "Terminado", "Entregado"];
    one("#statusSummary").innerHTML = statuses
      .map((status) => {
        const count = state.works.filter((x) => x.status === status).length;
        const percent = state.works.length
          ? Math.round((count / state.works.length) * 100)
          : 0;
        return `<div class="status-row"><span>${status}</span><div class="track"><div class="fill" style="width:${percent}%"></div></div><b>${count}</b></div>`;
      })
      .join("");
    one("#worksList").innerHTML = state.works.length
      ? state.works
          .map(
            (x) =>
              `<article class="record"><div><b>${escapeHtml(x.client)}</b><p>${escapeHtml(x.garment)} · ${escapeHtml(x.type)}</p><span class="pill">${escapeHtml(x.status)}</span><p>Registró: ${escapeHtml(x.createdBy)}</p></div><span class="amount">${money(x.value)}</span></article>`,
          )
          .join("")
      : '<div class="empty">No hay vestidos registrados esta semana.</div>';
    one("#paymentsList").innerHTML = state.payments.length
      ? state.payments
          .map(
            (x) =>
              `<article class="record"><div><b>${escapeHtml(x.date)} · ${escapeHtml(x.method)}</b><p>${escapeHtml(x.note || "Sin nota")}</p><p>Registró: ${escapeHtml(x.createdBy)}</p></div><span class="amount">${money(x.value)}</span></article>`,
          )
          .join("")
      : '<div class="empty">No hay abonos esta semana.</div>';
    one("#historyList").innerHTML = state.closes.length
      ? state.closes
          .map(
            (x) =>
              `<article class="record"><div><b>${escapeHtml(x.week)}</b><p>${x.count} vestidos · Cerró ${escapeHtml(x.closedBy)}</p></div><span class="amount">${money(x.balance)} saldo</span></article>`,
          )
          .join("")
      : '<div class="empty">Aún no hay cierres.</div>';
    one("#auditList").innerHTML = state.audit.length
      ? state.audit
          .map(
            (x) =>
              `<article class="record"><div><b>${escapeHtml(x.event)}</b><p>${escapeHtml(x.user)} · ${escapeHtml(x.detail)}</p></div><small>${new Date(x.at).toLocaleString("es-CO")}</small></article>`,
          )
          .join("")
      : '<div class="empty">Sin actividad.</div>';
    all("[data-open-work],[data-open-payment]").forEach((button) => {
      button.disabled = state.closed;
    });
    one("#closeWeekButton").disabled = state.closed;
  }
  function enter(user) {
    state.user = user;
    localStorage.setItem("kvWorkshopSession", JSON.stringify(user));
    one("#loginScreen").hidden = true;
    one("#system").hidden = false;
    one("#userRole").textContent =
      `${user.name} · ${user.role === "admin" ? "Administradora" : "Taller"}`;
    all("[data-admin]").forEach((item) => {
      item.hidden = user.role !== "admin";
    });
    load().catch((error) => toast(error.message));
  }
  one("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = one("#loginButton");
    button.disabled = true;
    button.textContent = "Ingresando…";
    one("#loginError").textContent = "";
    try {
      const username = one("#loginUser").value.trim().toLowerCase();
      const user = USERS[username];
      const hash = await sha256(one("#loginPassword").value);
      if (!user || user.hash !== hash)
        throw Error("Usuario o contraseña incorrectos");
      enter({ username, role: user.role, name: user.name });
    } catch (error) {
      one("#loginError").textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Iniciar sesión";
    }
  });
  one("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem("kvWorkshopSession");
    location.reload();
  });
  all("nav button").forEach((button) =>
    button.addEventListener("click", () => {
      all("nav button,.page").forEach((item) =>
        item.classList.remove("active"),
      );
      button.classList.add("active");
      one(`#${button.dataset.page}`).classList.add("active");
    }),
  );
  all("[data-open-work]").forEach((button) =>
    button.addEventListener("click", () => one("#workDialog").showModal()),
  );
  all("[data-open-payment]").forEach((button) =>
    button.addEventListener("click", () => {
      one('#paymentForm [name="date"]').value = today();
      one("#paymentDialog").showModal();
    }),
  );
  all("[data-close]").forEach((button) =>
    button.addEventListener("click", () =>
      one(`#${button.dataset.close}`).close(),
    ),
  );
  one("#workForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const item = Object.fromEntries(new FormData(event.currentTarget));
    item.week = state.week;
    item.createdBy = state.user.name;
    await api("saveWork", { item });
    event.currentTarget.reset();
    one("#workDialog").close();
    toast("Vestido registrado");
    load();
  });
  one("#paymentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const item = Object.fromEntries(new FormData(event.currentTarget));
    item.week = state.week;
    item.createdBy = state.user.name;
    await api("savePayment", { item });
    event.currentTarget.reset();
    one("#paymentDialog").close();
    toast("Abono registrado");
    load();
  });
  one("#closeWeekButton").addEventListener("click", async () => {
    if (!confirm(`¿Cerrar ${state.week}? Después no se podrá modificar.`))
      return;
    await api("closeWeek", { week: state.week });
    toast("Semana cerrada");
    load();
  });
  one("#weekInput").value = state.week;
  one("#weekInput").addEventListener("change", (event) => {
    state.week = event.target.value;
    load();
  });
  try {
    const session = JSON.parse(localStorage.getItem("kvWorkshopSession"));
    if (session?.username && USERS[session.username]) enter(session);
  } catch {
    localStorage.removeItem("kvWorkshopSession");
  }
})();
