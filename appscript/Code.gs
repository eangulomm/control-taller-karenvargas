const CFG = {
  sheets: {
    works: "Trabajos",
    payments: "Abonos",
    closes: "Cierres",
    audit: "Auditoria",
  },
  sessionHours: 720,
};
const HEAD = {
  Trabajos: [
    "ID",
    "Semana",
    "Fecha",
    "Clienta",
    "Prenda",
    "Tipo",
    "Estado",
    "Valor",
    "Nota",
    "Creado el",
    "Creado por",
  ],
  Abonos: [
    "ID",
    "Semana",
    "Fecha",
    "Valor",
    "Medio",
    "Nota",
    "Creado el",
    "Creado por",
  ],
  Cierres: [
    "Semana",
    "Prendas",
    "Producido",
    "Abonado",
    "Saldo",
    "Cerrado el",
    "Cerrado por",
  ],
  Auditoria: ["Fecha", "Usuario", "Evento", "Detalle"],
};

function doGet(e) {
  try {
    const p = JSON.parse(e.parameter.payload || "{}"),
      out = route_(p.action, p);
    return reply_({ ok: true, data: out }, e.parameter.callback);
  } catch (err) {
    return reply_({ ok: false, error: err.message }, e.parameter.callback);
  }
}
function reply_(obj, cb) {
  const text = JSON.stringify(obj);
  if (cb)
    return ContentService.createTextOutput(cb + "(" + text + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  return ContentService.createTextOutput(text).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// Ejecutar una sola vez desde el editor. Después cambiar ambas contraseñas.
function setup() {
  ensureSheets_();
  setUser_("karen", "CAMBIAR-CONTRASENA-KAREN", "admin", "Karen");
  setUser_(
    "taller",
    "CAMBIAR-CONTRASENA-TALLER",
    "operador",
    "Encargada del taller",
  );
}
function setUser_(username, password, role, name) {
  PropertiesService.getScriptProperties().setProperty(
    "USER_" + username.toLowerCase(),
    JSON.stringify({
      username: username.toLowerCase(),
      passwordHash: hash_(password),
      role: role,
      name: name,
      active: true,
    }),
  );
}
function cambiarContrasenaKaren(nueva) {
  setUser_("karen", nueva, "admin", "Karen");
}
function cambiarContrasenaTaller(nueva) {
  setUser_("taller", nueva, "operador", "Encargada del taller");
}

function route_(a, p) {
  if (a === "login") return login_(p);
  const s = session_(p.token);
  if (a === "session") return publicUser_(s);
  if (a === "logout") {
    PropertiesService.getScriptProperties().deleteProperty(
      "SESSION_" + p.token,
    );
    return true;
  }
  if (a === "list") return list_(p.week, s);
  if (a === "saveWork") return saveWork_(p.item, s);
  if (a === "savePayment") return savePayment_(p.item, s);
  if (a === "closeWeek") return closeWeek_(p.week, s);
  throw Error("Acción no disponible");
}
function user_(username) {
  const raw = PropertiesService.getScriptProperties().getProperty(
    "USER_" + String(username || "").toLowerCase(),
  );
  return raw ? JSON.parse(raw) : null;
}
function login_(p) {
  const u = user_(p.username);
  if (!u || !u.active || u.passwordHash !== String(p.passwordHash || ""))
    throw Error("Usuario o contraseña incorrectos");
  const token =
    Utilities.getUuid().replace(/-/g, "") +
    Utilities.getUuid().replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty(
    "SESSION_" + token,
    JSON.stringify({
      username: u.username,
      name: u.name,
      role: u.role,
      expires: Date.now() + CFG.sessionHours * 3600000,
    }),
  );
  audit_(u.name, "Inicio de sesión", "");
  return { token: token, user: publicUser_(u) };
}
function session_(token) {
  if (!token) throw Error("Debes iniciar sesión");
  const props = PropertiesService.getScriptProperties(),
    key = "SESSION_" + token,
    raw = props.getProperty(key);
  if (!raw) throw Error("Sesión vencida");
  const s = JSON.parse(raw);
  if (Date.now() > s.expires) {
    props.deleteProperty(key);
    throw Error("Sesión vencida");
  }
  return s;
}
function publicUser_(u) {
  return { username: u.username, name: u.name, role: u.role };
}
function hash_(text) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8,
  )
    .map((b) => ("0" + ((b + 256) % 256).toString(16)).slice(-2))
    .join("");
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HEAD).forEach((n) => {
    let sh = ss.getSheetByName(n);
    if (!sh) sh = ss.insertSheet(n);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEAD[n]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEAD[n].length)
        .setFontWeight("bold")
        .setBackground("#5b3046")
        .setFontColor("#ffffff");
    }
  });
}
function rows_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh
      .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
      .getValues(),
    h = HEAD[name];
  return vals.map((r) => Object.fromEntries(h.map((x, i) => [x, r[i]])));
}
function closed_(week) {
  return rows_("Cierres").some((x) => String(x.Semana) === String(week));
}
function list_(week, s) {
  ensureSheets_();
  const works = rows_("Trabajos")
    .filter((x) => String(x.Semana) === week)
    .map((x) => ({
      id: x.ID,
      week: x.Semana,
      fecha: x.Fecha,
      clienta: x.Clienta,
      prenda: x.Prenda,
      tipo: x.Tipo,
      estado: x.Estado,
      valor: Number(x.Valor),
      nota: x.Nota,
      createdAt: x["Creado el"],
      createdBy: x["Creado por"],
    }));
  const payments = rows_("Abonos")
    .filter((x) => String(x.Semana) === week)
    .map((x) => ({
      id: x.ID,
      week: x.Semana,
      fecha: x.Fecha,
      valor: Number(x.Valor),
      medio: x.Medio,
      nota: x.Nota,
      createdAt: x["Creado el"],
      createdBy: x["Creado por"],
    }));
  const closes = rows_("Cierres")
    .map((x) => ({
      week: x.Semana,
      count: Number(x.Prendas),
      produced: Number(x.Producido),
      paid: Number(x.Abonado),
      balance: Number(x.Saldo),
      closedAt: x["Cerrado el"],
      closedBy: x["Cerrado por"],
    }))
    .reverse();
  const audit =
    s.role === "admin"
      ? rows_("Auditoria")
          .map((x) => ({
            at: x.Fecha,
            user: x.Usuario,
            event: x.Evento,
            detail: x.Detalle,
          }))
          .reverse()
          .slice(0, 300)
      : [];
  return {
    works: works,
    payments: payments,
    closes: closes,
    audit: audit,
    closed: closed_(week),
  };
}
function saveWork_(x, s) {
  validateWeek_(x.week);
  if (closed_(x.week)) throw Error("La semana está cerrada");
  if (!x.clienta || !x.prenda || Number(x.valor) < 0)
    throw Error("Completa los datos del trabajo");
  return locked_(() => {
    if (closed_(x.week)) throw Error("La semana está cerrada");
    SpreadsheetApp.getActive()
      .getSheetByName("Trabajos")
      .appendRow([
        Utilities.getUuid(),
        x.week,
        new Date(),
        x.clienta,
        x.prenda,
        x.tipo,
        x.estado,
        Number(x.valor),
        x.nota || "",
        new Date(),
        s.name,
      ]);
    audit_(
      s.name,
      "Registró trabajo",
      x.clienta + " · " + x.prenda + " · $" + Number(x.valor),
    );
    return true;
  });
}
function savePayment_(x, s) {
  admin_(s);
  validateWeek_(x.week);
  if (closed_(x.week)) throw Error("La semana está cerrada");
  if (Number(x.valor) <= 0) throw Error("El abono debe ser mayor que cero");
  return locked_(() => {
    if (closed_(x.week)) throw Error("La semana está cerrada");
    SpreadsheetApp.getActive()
      .getSheetByName("Abonos")
      .appendRow([
        Utilities.getUuid(),
        x.week,
        x.fecha,
        Number(x.valor),
        x.medio,
        x.nota || "",
        new Date(),
        s.name,
      ]);
    audit_(s.name, "Registró abono", x.week + " · $" + Number(x.valor));
    return true;
  });
}
function closeWeek_(week, s) {
  admin_(s);
  validateWeek_(week);
  return locked_(() => {
    if (closed_(week)) throw Error("La semana ya está cerrada");
    const w = rows_("Trabajos").filter((x) => String(x.Semana) === week),
      p = rows_("Abonos").filter((x) => String(x.Semana) === week),
      produced = w.reduce((a, x) => a + Number(x.Valor), 0),
      paid = p.reduce((a, x) => a + Number(x.Valor), 0);
    SpreadsheetApp.getActive()
      .getSheetByName("Cierres")
      .appendRow([
        week,
        w.length,
        produced,
        paid,
        produced - paid,
        new Date(),
        s.name,
      ]);
    audit_(s.name, "Cerró semana", week + " · saldo $" + (produced - paid));
    return true;
  });
}
function audit_(user, event, detail) {
  ensureSheets_();
  SpreadsheetApp.getActive()
    .getSheetByName("Auditoria")
    .appendRow([new Date(), user, event, detail]);
}
function locked_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(10000);
  try {
    return fn();
  } finally {
    l.releaseLock();
  }
}
function admin_(s) {
  if (s.role !== "admin")
    throw Error("Esta acción solo la puede realizar Karen");
}
function validateWeek_(w) {
  if (!/^\d{4}-W\d{2}$/.test(String(w || ""))) throw Error("Semana inválida");
}
