const APP_KEY = "taller-kv-2026";
const SHEETS = {
  works: {
    name: "Trabajos",
    headers: [
      "ID",
      "Semana",
      "Clienta",
      "Vestido",
      "Tipo",
      "Estado",
      "Valor",
      "Nota",
      "Creado el",
      "Creado por",
    ],
  },
  payments: {
    name: "Abonos",
    headers: [
      "ID",
      "Semana",
      "Fecha",
      "Valor",
      "Medio",
      "Nota",
      "Creado el",
      "Creado por",
    ],
  },
  closes: {
    name: "Cierres",
    headers: [
      "Semana",
      "Vestidos",
      "Total",
      "Abonado",
      "Saldo",
      "Cerrado el",
      "Cerrado por",
    ],
  },
  audit: {
    name: "Auditoria",
    headers: ["Fecha", "Usuario", "Evento", "Detalle"],
  },
};

function doGet(e) {
  try {
    const payload = JSON.parse(e.parameter.payload || "{}");
    if (payload.appKey !== APP_KEY) throw Error("Acceso no autorizado");
    const data = route_(payload.action, payload);
    return output_({ ok: true, data: data }, e.parameter.callback);
  } catch (error) {
    return output_({ ok: false, error: error.message }, e.parameter.callback);
  }
}

function output_(value, callback) {
  const json = JSON.stringify(value);
  return ContentService.createTextOutput(
    callback ? callback + "(" + json + ")" : json,
  ).setMimeType(
    callback
      ? ContentService.MimeType.JAVASCRIPT
      : ContentService.MimeType.JSON,
  );
}

function setup() {
  Object.keys(SHEETS).forEach(function (key) {
    const definition = SHEETS[key];
    let sheet = SpreadsheetApp.getActive().getSheetByName(definition.name);
    if (!sheet) sheet = SpreadsheetApp.getActive().insertSheet(definition.name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(definition.headers);
      sheet.setFrozenRows(1);
      sheet
        .getRange(1, 1, 1, definition.headers.length)
        .setFontWeight("bold")
        .setBackground("#5b3046")
        .setFontColor("#ffffff");
    }
  });
}

function route_(action, payload) {
  setup();
  if (action === "list") return list_(payload.week);
  if (action === "saveWork") return saveWork_(payload.item);
  if (action === "savePayment") return savePayment_(payload.item);
  if (action === "closeWeek") return closeWeek_(payload.week);
  throw Error("Acción no disponible");
}

function values_(key) {
  const definition = SHEETS[key];
  const sheet = SpreadsheetApp.getActive().getSheetByName(definition.name);
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, definition.headers.length)
    .getValues();
}
function isClosed_(week) {
  return values_("closes").some(function (row) {
    return String(row[0]) === String(week);
  });
}
function assertWeek_(week) {
  if (!/^\d{4}-W\d{2}$/.test(String(week || "")))
    throw Error("Semana inválida");
}
function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
function audit_(user, event, detail) {
  SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.audit.name)
    .appendRow([new Date(), user, event, detail]);
}

function list_(week) {
  assertWeek_(week);
  const works = values_("works")
    .filter(function (row) {
      return String(row[1]) === week;
    })
    .map(function (row) {
      return {
        id: row[0],
        week: row[1],
        client: row[2],
        garment: row[3],
        type: row[4],
        status: row[5],
        value: Number(row[6]),
        note: row[7],
        createdAt: row[8],
        createdBy: row[9],
      };
    });
  const payments = values_("payments")
    .filter(function (row) {
      return String(row[1]) === week;
    })
    .map(function (row) {
      return {
        id: row[0],
        week: row[1],
        date: row[2],
        value: Number(row[3]),
        method: row[4],
        note: row[5],
        createdAt: row[6],
        createdBy: row[7],
      };
    });
  const closes = values_("closes")
    .map(function (row) {
      return {
        week: row[0],
        count: Number(row[1]),
        total: Number(row[2]),
        paid: Number(row[3]),
        balance: Number(row[4]),
        closedAt: row[5],
        closedBy: row[6],
      };
    })
    .reverse();
  const audit = values_("audit")
    .map(function (row) {
      return { at: row[0], user: row[1], event: row[2], detail: row[3] };
    })
    .reverse()
    .slice(0, 300);
  return {
    works: works,
    payments: payments,
    closes: closes,
    audit: audit,
    closed: isClosed_(week),
  };
}

function saveWork_(item) {
  assertWeek_(item.week);
  if (!item.client || !item.garment || Number(item.value) < 0)
    throw Error("Completa los datos del vestido");
  return withLock_(function () {
    if (isClosed_(item.week)) throw Error("La semana está cerrada");
    SpreadsheetApp.getActive()
      .getSheetByName(SHEETS.works.name)
      .appendRow([
        Utilities.getUuid(),
        item.week,
        item.client,
        item.garment,
        item.type,
        item.status,
        Number(item.value),
        item.note || "",
        new Date(),
        item.createdBy || "Taller",
      ]);
    audit_(
      item.createdBy || "Taller",
      "Registró vestido",
      item.client + " · " + item.garment,
    );
    return true;
  });
}
function savePayment_(item) {
  assertWeek_(item.week);
  if (Number(item.value) <= 0) throw Error("El abono debe ser mayor que cero");
  return withLock_(function () {
    if (isClosed_(item.week)) throw Error("La semana está cerrada");
    SpreadsheetApp.getActive()
      .getSheetByName(SHEETS.payments.name)
      .appendRow([
        Utilities.getUuid(),
        item.week,
        item.date,
        Number(item.value),
        item.method,
        item.note || "",
        new Date(),
        item.createdBy || "Karen",
      ]);
    audit_(
      item.createdBy || "Karen",
      "Registró abono",
      item.week + " · $" + Number(item.value),
    );
    return true;
  });
}
function closeWeek_(week) {
  assertWeek_(week);
  return withLock_(function () {
    if (isClosed_(week)) throw Error("La semana ya está cerrada");
    const works = values_("works").filter(function (row) {
      return String(row[1]) === week;
    });
    const payments = values_("payments").filter(function (row) {
      return String(row[1]) === week;
    });
    const total = works.reduce(function (sum, row) {
      return sum + Number(row[6]);
    }, 0);
    const paid = payments.reduce(function (sum, row) {
      return sum + Number(row[3]);
    }, 0);
    SpreadsheetApp.getActive()
      .getSheetByName(SHEETS.closes.name)
      .appendRow([
        week,
        works.length,
        total,
        paid,
        total - paid,
        new Date(),
        "Karen",
      ]);
    audit_("Karen", "Cerró semana", week);
    return true;
  });
}
