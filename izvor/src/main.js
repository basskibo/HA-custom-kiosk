import "./style.css";
import { createIcons, icons } from "lucide";

const CONFIG = window.CONFIG;
const E = CONFIG.entities;
const states = {};
const reverseMap = {};
Object.entries(E).forEach(([key, id]) => {
  if (id) reverseMap[id] = key;
});

let ws = null;
let msgId = 1;
let currentCamera = "hd";
let hourlyForecastAvailable = false;
let forecastSubId = null;
let currentForecastType = "hourly";
let lastWeatherAttr = null;
const prev = {};
const pending = {};

function icon() {
  createIcons({ icons });
}

// ---------- WebSocket ----------

function connect() {
  ws = new WebSocket(`ws://${CONFIG.haHost}/api/websocket`);
  ws.onopen = () => console.log("[HA] websocket otvoren");
  ws.onclose = () => {
    setBanner("Veza sa Home Assistant-om je prekinuta, pokušavam ponovo...");
    setTimeout(connect, 3000);
  };
  ws.onerror = (e) => console.error("[HA] websocket greška", e);
  ws.onmessage = (ev) => {
    try {
      handleMessage(JSON.parse(ev.data));
    } catch (e) {
      console.error("[HA] loša poruka", e);
    }
  };
}

function send(obj, cb) {
  const id = msgId++;
  obj.id = id;
  if (cb) pending[id] = cb;
  ws.send(JSON.stringify(obj));
  return id;
}

function handleMessage(msg) {
  if (msg.type === "auth_required") {
    ws.send(JSON.stringify({ type: "auth", access_token: CONFIG.token }));
  } else if (msg.type === "auth_ok") {
    hideBanner();
    send({ type: "subscribe_events", event_type: "state_changed" });
    send({ type: "get_states" });
    subscribeForecast();
    refreshCamera();
  } else if (msg.type === "auth_invalid") {
    setBanner("Neispravan token u config.js — generiši novi i zalepi ga tamo.");
  } else if (msg.type === "event" && msg.event && msg.event.event_type === "state_changed") {
    const data = msg.event.data;
    states[data.entity_id] = data.new_state;
    applyState(data.entity_id, data.new_state);
  } else if (msg.type === "event" && msg.id === forecastSubId && msg.event && msg.event.forecast) {
    hourlyForecastAvailable = true;
    renderForecast(msg.event.forecast, currentForecastType === "hourly");
  } else if (msg.type === "result") {
    if (pending[msg.id]) {
      const cb = pending[msg.id];
      delete pending[msg.id];
      cb(msg);
      return;
    }
    if (msg.success && Array.isArray(msg.result)) {
      msg.result.forEach((s) => {
        states[s.entity_id] = s;
        applyState(s.entity_id, s);
      });
    }
  }
}

function callService(domain, service, entityId, extra = {}) {
  if (!entityId) return;
  send({
    type: "call_service",
    domain,
    service,
    service_data: { entity_id: entityId, ...extra },
  });
}

// ---------- Prikaz stanja ----------

function applyState(entityId, state) {
  if (!state) return;

  const roomIdx = roomEntityIndex[entityId];
  if (roomIdx) updateLightRow(roomIdx.ri, roomIdx.li, state);

  const personIdx = personIndex[entityId];
  if (personIdx != null) updatePersonChip(personIdx, state);

  const key = reverseMap[entityId];
  if (!key) return;
  const s = state.state;
  const attr = state.attributes || {};

  switch (key) {
    case "weather": {
      setText("weather-temp", (attr.temperature != null ? Math.round(attr.temperature) : "--") + "°");
      setText("weather-desc", s);
      const iconWrap = document.getElementById("weather-icon-wrap");
      if (iconWrap) {
        iconWrap.innerHTML = `<i data-lucide="${weatherIconName(s)}"></i>`;
        icon();
      }
      lastWeatherAttr = attr;
      renderWeatherExtra(attr);
      if (!hourlyForecastAvailable) renderForecast(attr.forecast, false);
      break;
    }

    case "sonos": {
      setText("sonos-title", attr.media_title || "Ništa ne svira");
      setText("sonos-sub", attr.media_artist || (s === "playing" ? "Svira" : s === "paused" ? "Pauzirano" : s));
      if (attr.volume_level != null) {
        document.getElementById("sonos-volume").value = Math.round(attr.volume_level * 100);
      }
      const btn = document.getElementById("sonos-playpause");
      if (btn) btn.innerHTML = s === "playing" ? `<i data-lucide="pause"></i>` : `<i data-lucide="play"></i>`;
      icon();
      break;
    }

    case "tv":
      setText("tv-sub", s === "playing" ? (attr.media_title || "Aktivan") : s === "off" ? "Isključen" : s);
      break;

    case "purifier": {
      const isOn = s === "on";
      const btn = document.getElementById("purifier-toggle");
      if (btn) {
        btn.classList.toggle("active", isOn);
        btn.setAttribute("aria-checked", isOn ? "true" : "false");
      }
      if (attr.percentage != null) {
        const speed = document.getElementById("purifier-speed");
        if (speed) speed.value = attr.percentage;
        setText("purifier-speed-label", attr.percentage + "%");
        document.querySelectorAll("#purifier-speed-presets .fan-preset").forEach((b) => {
          b.classList.toggle("active", Math.abs(parseInt(b.dataset.pct, 10) - attr.percentage) <= 16);
        });
      }
      break;
    }

    case "pm25": {
      setText("pm25-value", s);
      updateAqiGauge(parseFloat(s));
      const val = parseFloat(s);
      if (!isNaN(val)) {
        if (val > 35 && prev.pm25 !== "bad") {
          addNotification("wind", `Kvalitet vazduha je loš (PM2.5: ${s} µg/m³)`);
          prev.pm25 = "bad";
        } else if (val <= 35) {
          prev.pm25 = "ok";
        }
      }
      break;
    }
    case "temp":
      setText("temp-value", s + " °C");
      break;
    case "humidity":
      setText("humidity-value", s + " %");
      if (lastWeatherAttr && lastWeatherAttr.humidity == null) renderWeatherExtra(lastWeatherAttr);
      break;
    case "filter": {
      setText("filter-value", s + "%");
      const val = parseFloat(s);
      if (!isNaN(val)) {
        if (val <= 15 && prev.filter !== "low") {
          addNotification("alert-triangle", `Filter prečišćivača je skoro pri kraju (${s}%)`);
          prev.filter = "low";
        } else if (val > 15) {
          prev.filter = "ok";
        }
      }
      break;
    }

    case "vacuumMop":
      setText("vacuum-mop", s === "on" ? "Uključeno" : "Isključeno");
      break;
    case "vacuumSleep":
      setText("vacuum-sleep", s === "on" ? "Da" : "Ne");
      if (s === "on" && prev.vacuumSleep === "off") {
        addNotification("bot", "Robot usisivač je završio čišćenje i vratio se na dok");
      }
      prev.vacuumSleep = s;
      break;

    case "netDown":
      setText("home-net-down", formatValue(s, attr.unit_of_measurement));
      break;
    case "netUp":
      setText("home-net-up", formatValue(s, attr.unit_of_measurement));
      break;
    case "netWan": {
      setText("home-net-wan", s === "on" ? "Povezano" : "Prekinuto");
      if (prev.netWan === "on" && s === "off") addNotification("wifi-off", "Internet veza je prekinuta");
      else if (prev.netWan === "off" && s === "on") addNotification("wifi", "Internet veza je ponovo uspostavljena");
      prev.netWan = s;
      break;
    }
    case "netIp":
      setText("home-net-ip", s);
      break;

    case "xboxStatus":
      setText("home-xbox-status", s);
      break;
    case "xboxGame":
      setText("home-xbox-game", s);
      break;

    case "backupServer":
      setText("home-backup-server", s);
      break;
    case "backupHa": {
      const formatted = formatBackupTime(s);
      setText("home-backup-ha", formatted);
      if (prev.backupHa && prev.backupHa !== s && !["unknown", "unavailable", ""].includes(s)) {
        addNotification("database-backup", "Novi Home Assistant backup je uspešno završen");
      }
      prev.backupHa = s;
      break;
    }
  }
}

// ---------- AQI gauge (luk od 270°, stil HA "gauge" kartice) ----------

function updateAqiGauge(pm25) {
  const gaugeEl = document.getElementById("purifier-gauge");
  const labelEl = document.getElementById("purifier-quality-label");
  if (!gaugeEl) return;
  if (isNaN(pm25)) {
    gaugeEl.style.setProperty("--pct", 0);
    return;
  }
  // Vizuelna popuna luka: manji PM2.5 = veća popuna (bolji vazduh).
  const pct = Math.max(6, Math.min(100, 100 - pm25 * 1.8));
  gaugeEl.style.setProperty("--pct", pct);

  let quality = "Odličan";
  let color = "var(--good)";
  if (pm25 > 55) {
    quality = "Loš";
    color = "var(--bad)";
  } else if (pm25 > 35) {
    quality = "Umeren";
    color = "var(--gold)";
  } else if (pm25 > 12) {
    quality = "Dobar";
    color = "var(--good)";
  }
  gaugeEl.style.setProperty("--fill", color);
  if (labelEl) labelEl.textContent = quality;
}

function weatherIconName(state) {
  const map = {
    "clear-night": "moon",
    cloudy: "cloud",
    fog: "cloud-fog",
    hail: "cloud-hail",
    lightning: "cloud-lightning",
    "lightning-rainy": "cloud-lightning",
    partlycloudy: "cloud-sun",
    pouring: "cloud-rain-wind",
    rainy: "cloud-rain",
    snowy: "snowflake",
    "snowy-rainy": "cloud-snow",
    sunny: "sun",
    windy: "wind",
    "windy-variant": "wind",
    exceptional: "alert-triangle",
  };
  return map[state] || "cloud-sun";
}

function windDirection(deg) {
  if (deg == null) return "";
  const dirs = ["S", "SI", "I", "JI", "J", "JZ", "Z", "SZ"];
  return dirs[Math.round(deg / 45) % 8];
}

function renderWeatherExtra(attr) {
  const el = document.getElementById("weather-extra-row");
  if (!el) return;
  const chips = [];

  const feelsLike = attr.apparent_temperature != null ? attr.apparent_temperature : attr.feels_like;
  if (feelsLike != null) {
    chips.push({ icon: "thermometer", label: "Oseća se", value: `${Math.round(feelsLike)}°` });
  }

  let humidity = attr.humidity;
  let humiditySource = "Vlažnost";
  if (humidity == null && E.humidity && states[E.humidity] && states[E.humidity].state != null) {
    humidity = states[E.humidity].state;
    humiditySource = "Vlažnost (soba)";
  }
  if (humidity != null) {
    chips.push({ icon: "droplets", label: humiditySource, value: `${Math.round(humidity)}%` });
  }

  const windSpeed = attr.wind_speed != null ? attr.wind_speed : attr.wind_speed_kmh;
  if (windSpeed != null) {
    const dir = windDirection(attr.wind_bearing);
    chips.push({ icon: "wind", label: "Vetar", value: `${Math.round(windSpeed)} km/h${dir ? " " + dir : ""}` });
  }

  if (attr.pressure != null) {
    chips.push({ icon: "gauge", label: "Pritisak", value: `${Math.round(attr.pressure)} hPa` });
  }

  if (attr.uv_index != null) {
    chips.push({ icon: "sun-medium", label: "UV", value: `${attr.uv_index}` });
  }

  if (!chips.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = chips
    .map(
      (c) => `
      <div class="weather-chip">
        <i data-lucide="${c.icon}"></i>
        <div class="weather-chip-text"><span>${c.label}</span><strong>${c.value}</strong></div>
      </div>`
    )
    .join("");
  icon();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderForecast(forecast, isHourly) {
  const el = document.getElementById("forecast");
  if (!el || !forecast) return;
  el.innerHTML = forecast
    .slice(0, 5)
    .map((f) => {
      const d = new Date(f.datetime);
      const label = isHourly
        ? d.toLocaleTimeString("sr-RS", { hour: "2-digit" })
        : d.toLocaleDateString("sr-RS", { weekday: "short" });
      const temp = f.temperature != null ? Math.round(f.temperature) : "--";
      const low = f.templow != null ? Math.round(f.templow) : null;
      const iconName = weatherIconName(f.condition);
      return `<div class="forecast-item">
        <span class="forecast-label">${label}</span>
        <span class="forecast-icon"><i data-lucide="${iconName}"></i></span>
        <span class="forecast-temp">${temp}°</span>
        ${low != null ? `<span class="forecast-temp-low">${low}°</span>` : ""}
      </div>`;
    })
    .join("");
  icon();
}

function formatValue(value, unit) {
  return `${value} ${unit || ""}`.trim();
}

function formatBackupTime(iso) {
  if (!iso || iso === "unknown" || iso === "unavailable" || iso === "") return "nema podataka";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

// ---------- Prognoza (satna, sa prelaskom na dnevnu) ----------
// Ide kroz WebSocket (weather/subscribe_forecast) umesto REST fetch-a,
// zato CORS podešavanje u Home Assistant-u uopšte nije potrebno za ovo —
// isti kanal koji već radi za temperaturu/Sonos/backup itd.

function subscribeForecastType(type) {
  currentForecastType = type;
  return send({ type: "weather/subscribe_forecast", entity_id: E.weather, forecast_type: type }, (msg) => {
    if (!msg.success) {
      console.warn(`[weather] subscribe_forecast (${type}) nije podržan:`, msg.error);
      if (type === "daily") {
        // Integracija ne podržava dnevnu prognozu - probaj satnu.
        forecastSubId = subscribeForecastType("hourly");
      }
    }
  });
}

function subscribeForecast() {
  if (!E.weather || !ws || ws.readyState !== WebSocket.OPEN) return;
  forecastSubId = subscribeForecastType("daily");
}

// ---------- Notifikacije ----------

let notifications = [];

function addNotification(iconName, text) {
  notifications.unshift({ id: Date.now() + Math.random(), icon: iconName, text, time: new Date() });
  notifications = notifications.slice(0, 15);
  renderNotifications();
}

function dismissNotification(id) {
  notifications = notifications.filter((n) => n.id !== id);
  renderNotifications();
}

function renderNotifications() {
  const el = document.getElementById("notif-list");
  if (!el) return;
  if (!notifications.length) {
    el.innerHTML = `<div class="notif-empty">Nema novih obaveštenja</div>`;
    return;
  }
  el.innerHTML = notifications
    .map(
      (n) => `
      <div class="notif-item" data-id="${n.id}">
        <div class="notif-dot"><i data-lucide="${n.icon}"></i></div>
        <div class="notif-body">
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${n.time.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <button class="notif-close" aria-label="Ukloni"><i data-lucide="x"></i></button>
      </div>`
    )
    .join("");
  el.querySelectorAll(".notif-item").forEach((item) => {
    const id = parseFloat(item.dataset.id);
    item.querySelector(".notif-close").addEventListener("click", () => dismissNotification(id));
  });
  icon();
}

// ---------- Scene ----------

function renderScenes() {
  const el = document.getElementById("scene-row");
  if (!el) return;
  const scenes = CONFIG.scenes || [];
  el.innerHTML = scenes
    .map((sc, i) => {
      const configured = sc.entity && !sc.entity.includes("TODO");
      return `<button class="scene-btn ${configured ? "" : "disabled"}" data-index="${i}">
        <span class="scene-icon"><i data-lucide="${sc.icon || "sparkles"}"></i></span>
        <span>${sc.name}</span>
      </button>`;
    })
    .join("");
  el.querySelectorAll(".scene-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sc = scenes[parseInt(btn.dataset.index, 10)];
      if (!sc.entity || sc.entity.includes("TODO")) {
        addNotification("alert-triangle", `Scena "${sc.name}" još nije podešena — napravi je u HA i upiši ID u config.js`);
        return;
      }
      callService("scene", "turn_on", sc.entity);
    });
  });
  icon();
}

// ---------- Ljudi (prisustvo) ----------

const personIndex = {};

function renderPeople() {
  const el = document.getElementById("people-row");
  if (!el) return;
  const people = CONFIG.people || [];
  el.innerHTML = people
    .map((p, i) => {
      const initials = p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const hue = (hashCode(p.name) % 360 + 360) % 360;
      personIndex[p.entity] = i;
      return `
        <div class="person-chip">
          <div class="person-avatar" id="person-avatar-${i}" style="background: hsl(${hue},55%,55%)">${initials}</div>
          <div>
            <div class="person-name">${p.name}</div>
            <div class="person-state" id="person-state-${i}">—</div>
          </div>
        </div>`;
    })
    .join("");
  // hidrata ako vec imamo stanje
  people.forEach((p, i) => {
    const st = states[p.entity];
    if (st) updatePersonChip(i, st);
  });
}

function updatePersonChip(i, state) {
  const avatar = document.getElementById(`person-avatar-${i}`);
  const stateEl = document.getElementById(`person-state-${i}`);
  if (!avatar || !stateEl) return;
  const isHome = state.state === "home";
  avatar.classList.toggle("home", isHome);
  stateEl.textContent = isHome ? "Kod kuće" : state.state === "not_home" ? "Odsutan" : "Nepoznato";
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h;
}

// ---------- Sobe / svetla ----------

let activeRoom = 0;
let roomEntityIndex = {};

function rebuildRoomEntityIndex() {
  roomEntityIndex = {};
  (CONFIG.rooms || []).forEach((r, ri) => {
    (r.lights || []).forEach((l, li) => {
      if (l.entity) roomEntityIndex[l.entity] = { ri, li };
    });
  });
}

function lightIconFor(entity, name) {
  const n = (name || "").toLowerCase();
  if (entity.startsWith("switch.")) return "toggle-left";
  if (n.includes("tv")) return "tv";
  if (n.includes("lampa") || n.includes("svetlo") || n.includes("light") || n.includes("led")) return "lightbulb";
  return "zap";
}

function renderRooms() {
  const rooms = CONFIG.rooms || [];
  // Ima dve kopije (home bento mini-verzija i puna "Sobe" stranica) - renderuju se identicno
  ["", "-2"].forEach((suffix) => {
    const tabsEl = document.getElementById(`room-tabs${suffix}`);
    const contentEl = document.getElementById(`room-content${suffix}`);
    const climateEl = document.getElementById(`room-climate${suffix}`);
    if (!tabsEl || !contentEl) return;

    tabsEl.innerHTML = rooms
      .map((r, i) => `<button class="room-tab ${i === activeRoom ? "active" : ""}" data-index="${i}">${r.name}</button>`)
      .join("");
    tabsEl.querySelectorAll(".room-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeRoom = parseInt(btn.dataset.index, 10);
        renderRooms();
      });
    });

    const room = rooms[activeRoom];
    if (!room) {
      contentEl.innerHTML = "";
      return;
    }

    if (climateEl) {
      const t = room.tempEntity && states[room.tempEntity];
      const h = room.humidityEntity && states[room.humidityEntity];
      if (t || h) {
        climateEl.textContent = [t ? `${t.state}°C` : null, h ? `${h.state}%` : null].filter(Boolean).join(" · ");
      } else {
        climateEl.textContent = "";
      }
    }

    if (!room.lights || !room.lights.length) {
      contentEl.innerHTML = `<div class="room-empty">Nema dodatih uređaja za "${room.name}". Dodaj svetla/prekidače u <code>config.js</code> (sekcija <code>rooms</code>).</div>`;
      return;
    }

    contentEl.innerHTML = room.lights
      .map(
        (l, i) => `
        <div class="light-row">
          <div class="light-icon" id="light-icon-${suffix || "a"}-${activeRoom}-${i}"><i data-lucide="${lightIconFor(l.entity, l.name)}"></i></div>
          <div class="light-info">
            <span class="light-name">${l.name}</span>
            <span class="light-state" id="light-state-${suffix || "a"}-${activeRoom}-${i}">—</span>
          </div>
          ${l.dimmable ? `<input type="range" min="1" max="100" class="light-slider" id="light-slider-${suffix || "a"}-${activeRoom}-${i}" />` : ""}
          <label class="switch">
            <input type="checkbox" id="light-toggle-${suffix || "a"}-${activeRoom}-${i}" />
            <span class="slider-ui"></span>
          </label>
        </div>`
      )
      .join("");

    room.lights.forEach((l, i) => {
      const tag = suffix || "a";
      const cb = document.getElementById(`light-toggle-${tag}-${activeRoom}-${i}`);
      if (cb) {
        cb.addEventListener("change", () => {
          const domain = l.entity.split(".")[0];
          callService(domain, cb.checked ? "turn_on" : "turn_off", l.entity);
        });
      }
      const sl = document.getElementById(`light-slider-${tag}-${activeRoom}-${i}`);
      if (sl) {
        sl.addEventListener("change", () => {
          callService("light", "turn_on", l.entity, { brightness_pct: parseInt(sl.value, 10) });
        });
      }
      const st = states[l.entity];
      if (st) updateLightRow(activeRoom, i, st);
    });
    icon();
  });
}

function updateLightRow(ri, li, state) {
  if (ri !== activeRoom) return;
  const room = CONFIG.rooms[ri];
  if (!room) return;
  const light = room.lights[li];
  if (!light) return;
  const isOn = state.state === "on";

  ["a", "-2"].forEach((tag) => {
    const stateEl = document.getElementById(`light-state-${tag}-${ri}-${li}`);
    if (stateEl) {
      let txt = isOn ? "Uključeno" : "Isključeno";
      if (isOn && state.attributes && state.attributes.current_power_w != null) {
        txt += ` · ${state.attributes.current_power_w} W`;
      }
      stateEl.textContent = txt;
    }
    const iconEl = document.getElementById(`light-icon-${tag}-${ri}-${li}`);
    if (iconEl) iconEl.classList.toggle("on", isOn);

    const cb = document.getElementById(`light-toggle-${tag}-${ri}-${li}`);
    if (cb) cb.checked = isOn;

    if (light.dimmable) {
      const sl = document.getElementById(`light-slider-${tag}-${ri}-${li}`);
      if (sl && state.attributes && state.attributes.brightness != null) {
        sl.value = Math.round((state.attributes.brightness / 255) * 100);
      }
    }
  });
}

// ---------- Kamera ----------

function setCameraError(message) {
  ["camera-error", "camera-error-mini"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.classList.add("hidden");
      el.textContent = "";
    } else {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  });
}

function applyCameraImage(url) {
  ["camera-feed", "camera-feed-mini"].forEach((id) => {
    const img = document.getElementById(id);
    if (!img) return;
    const old = img.src;
    img.src = url;
    if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
  });
  setCameraError(null);
}

function refreshCameraViaRest(entityId) {
  fetch(`http://${CONFIG.haHost}/api/camera_proxy/${entityId}`, {
    headers: { Authorization: `Bearer ${CONFIG.token}` },
  })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.blob();
    })
    .then((blob) => applyCameraImage(URL.createObjectURL(blob)))
    .catch((e) => {
      console.error("[camera] REST fallback greška:", e);
      const isNetworkError = e instanceof TypeError;
      const msg = isNetworkError
        ? "Kamera nedostupna — nedostaje CORS dozvola u Home Assistant-u (vidi README)."
        : `Kamera nedostupna (${e.message}).`;
      setCameraError(msg);
    });
}

function refreshCamera() {
  const entityId = currentCamera === "hd" ? E.cameraHd : E.cameraSd;
  if (!entityId) return;
  // Prvo pokušaj kroz WebSocket (camera_thumbnail) — ne traži CORS, isti
  // kanal koji već radi za sve ostalo (temperatura, Sonos, backup...).
  // Ako to HA ne podržava (starija/novija verzija), vrati se na REST.
  if (ws && ws.readyState === WebSocket.OPEN) {
    send({ type: "camera_thumbnail", entity_id: entityId }, (msg) => {
      if (msg.success && msg.result && msg.result.content) {
        applyCameraImage(`data:${msg.result.content_type};base64,${msg.result.content}`);
      } else {
        console.warn("[camera] WS camera_thumbnail nije podržan, probam REST:", msg.error);
        refreshCameraViaRest(entityId);
      }
    });
  } else {
    refreshCameraViaRest(entityId);
  }
}

function switchCamera(quality) {
  currentCamera = quality;
  document.getElementById("btn-hd").classList.toggle("active", quality === "hd");
  document.getElementById("btn-sd").classList.toggle("active", quality === "sd");
  refreshCamera();
}

// ---------- Banner ----------

function setBanner(text) {
  const b = document.getElementById("connection-banner");
  b.textContent = text;
  b.classList.remove("hidden");
}
function hideBanner() {
  document.getElementById("connection-banner").classList.add("hidden");
}

// ---------- Sat ----------

function tickClock() {
  const now = new Date();
  setText("clock", now.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" }));
  setText("clock-sec", now.getSeconds().toString().padStart(2, "0"));
  setText("date", now.toLocaleDateString("sr-RS", { weekday: "long", day: "numeric", month: "long" }));
}

// ---------- Navigacija ----------

const VIEWS = ["sec-home", "sec-kamera"];

function setView(id) {
  VIEWS.forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.classList.toggle("active-view", v === id);
  });
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.target === id));
  try {
    localStorage.setItem("activeView", id);
  } catch (e) {
    /* ignorisi */
  }
}

function wireNav() {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.addEventListener("click", () => setView(b.dataset.target));
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.addEventListener("click", () => setView(b.dataset.goto));
  });
  let initial = "sec-home";
  try {
    const saved = localStorage.getItem("activeView");
    if (saved && VIEWS.includes(saved)) initial = saved;
  } catch (e) {
    /* ignorisi */
  }
  setView(initial);
}

// ---------- Kontrole ----------

function wireControls() {
  document.getElementById("purifier-toggle").addEventListener("click", () => {
    const isOn = states[E.purifier] && states[E.purifier].state === "on";
    callService("fan", isOn ? "turn_off" : "turn_on", E.purifier);
  });

  document.getElementById("purifier-speed").addEventListener("change", (e) => {
    callService("fan", "set_percentage", E.purifier, { percentage: parseInt(e.target.value, 10) });
  });

  document.getElementById("purifier-mode").addEventListener("click", () => {
    callService("button", "press", E.purifierMode);
  });

  document.getElementById("vacuum-start").addEventListener("click", () => callService("button", "press", E.vacuumStart));
  document.getElementById("vacuum-stop").addEventListener("click", () => callService("button", "press", E.vacuumStop));
  document.getElementById("vacuum-spot").addEventListener("click", () => callService("button", "press", E.vacuumSpot));

  document.querySelectorAll("#purifier-speed-presets .fan-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pct = parseInt(btn.dataset.pct, 10);
      callService("fan", "set_percentage", E.purifier, { percentage: pct });
    });
  });

  document.getElementById("sonos-volume").addEventListener("change", (e) => {
    callService("media_player", "volume_set", E.sonos, { volume_level: e.target.value / 100 });
  });
  document.querySelectorAll('[data-entity="sonos"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "playpause") callService("media_player", "media_play_pause", E.sonos);
      if (action === "next") callService("media_player", "media_next_track", E.sonos);
      if (action === "prev") callService("media_player", "media_previous_track", E.sonos);
    });
  });

  const tvBtn = document.querySelector('[data-entity="tv"]');
  if (tvBtn) tvBtn.addEventListener("click", () => callService("media_player", "toggle", E.tv));

  document.getElementById("btn-hd").addEventListener("click", () => switchCamera("hd"));
  document.getElementById("btn-sd").addEventListener("click", () => switchCamera("sd"));

  document.querySelectorAll(".mtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mtab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("pane-sonos").classList.toggle("hidden", tab.dataset.tab !== "sonos");
      document.getElementById("pane-tv").classList.toggle("hidden", tab.dataset.tab !== "tv");
    });
  });
}

// ---------- Start ----------

rebuildRoomEntityIndex();
renderRooms();
renderScenes();
renderPeople();
renderNotifications();
wireNav();
wireControls();
icon();
tickClock();
setInterval(tickClock, 1000);
connect();
setInterval(refreshCamera, CONFIG.cameraRefreshMs);
