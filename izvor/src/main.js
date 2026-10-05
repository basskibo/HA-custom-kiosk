import "./style.css";
import {
  createIcons,
  Activity,
  AirVent,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  Battery,
  BatteryCharging,
  BellOff,
  Bot,
  Camera,
  Cctv,
  Cloud,
  CloudCheck,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  DatabaseBackup,
  Droplets,
  ExternalLink,
  Fan,
  Funnel,
  Gamepad2,
  Globe,
  HardDrive,
  Heater,
  House,
  Joystick,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Locate,
  MapPin,
  Mic,
  Minus,
  Moon,
  Music,
  Pause,
  PlugZap,
  Play,
  Plus,
  Power,
  Router,
  SkipBack,
  SkipForward,
  Snowflake,
  Sparkles,
  Speaker,
  Square,
  Sun,
  Thermometer,
  TriangleAlert,
  Tv,
  Volume2,
  WandSparkles,
  WashingMachine,
  Wind,
  X,
} from "lucide";

// Samo ikonice koje stvarno koristimo (manji bundle = brže na starom iPad-u).
const ICONS = {
  Activity, AirVent, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpFromLine,
  Battery, BatteryCharging, BellOff, Bot, Camera, Cctv, Cloud, CloudCheck, CloudFog, CloudHail,
  ChevronLeft, ChevronRight, CloudLightning, CloudRain, CloudRainWind, CloudSnow, CloudSun,
  DatabaseBackup, Droplets, ExternalLink, Fan, Funnel, Gamepad2, Globe, HardDrive, Heater, House,
  Joystick, ListMusic, Locate, MapPin, Mic, Minus, Moon, Music, Pause, PlugZap, Play, Plus, Power, Router,
  SkipBack, SkipForward, Snowflake, Sparkles, Speaker, Square, Sun, Thermometer, TriangleAlert, Tv,
  Volume2, WandSparkles, WashingMachine, Wind, X,
};

const CONFIG = window.CONFIG;

// Podrazumevani entity ID-jevi (isti kao u HA dashboard-u). Ono što stoji u
// config.js ih nadjačava, ali ne mora da ih navodi - stari config.js na Pi-ju
// i dalje radi.
const DEFAULT_ENTITIES = {
  weather: "weather.home",
  sonos: "media_player.living_room_living_room",
  tv: "media_player.yettel_tv_box",

  purifier: "fan.zhimi_de_436875919_mb3a_s_2_air_purifier",
  pm25: "sensor.zhimi_de_436875919_mb3a_pm2_5_density_p_3_6",
  temp: "sensor.zhimi_de_436875919_mb3a_temperature_p_3_8",
  humidity: "sensor.zhimi_de_436875919_mb3a_relative_humidity_p_3_7",
  filter: "sensor.zhimi_de_436875919_mb3a_filter_life_level_p_4_3",
  purifierMode: "button.zhimi_de_436875919_mb3a_toggle_mode_a_8_2",

  vacuum: "vacuum.xiaomi_de_1173620033_ov81gl",
  vacuumMop: "binary_sensor.xiaomi_de_1173620033_ov81gl_mop_status_p_2_11",
  vacuumSleep: "binary_sensor.xiaomi_de_1173620033_ov81gl_sleep_status_p_2_25",
  vacuumBattery: "sensor.xiaomi_de_1173620033_ov81gl_battery_level_p_3_1",
  vacuumCharging: "sensor.xiaomi_de_1173620033_ov81gl_charging_state_p_3_2",
  vacuumFilter: "sensor.xiaomi_de_1173620033_ov81gl_filter_life_level_p_14_1",
  vacuumBrush: "sensor.xiaomi_de_1173620033_ov81gl_brush_life_level_p_12_1",
  vacuumMopLife: "sensor.xiaomi_de_1173620033_ov81gl_mop_life_level_p_9_1",
  vacuumSuction: "select.xiaomi_de_1173620033_ov81gl_mode_p_2_9",
  vacuumCleanMode: "select.xiaomi_de_1173620033_ov81gl_sweep_mop_type_p_2_4",
  vacuumWater: "select.xiaomi_de_1173620033_ov81gl_mop_water_output_level_p_2_10",
  vacuumMopWash: "button.xiaomi_de_1173620033_ov81gl_back_mop_wash_a_2_36",
  vacuumDry: "button.xiaomi_de_1173620033_ov81gl_start_dry_a_2_20",
  vacuumDnd: "switch.xiaomi_de_1173620033_ov81gl_no_disturb_p_11_1",

  cameraQuality: "input_select.kvalitet_kamere",
  cameraHd: "camera.ipc_live_view_hd",
  cameraSd: "camera.ipc_live_view_sd",
  cameraMotion: "switch.ipc_motion_detection",
  cameraAudio: "switch.ipc_audio_recording",
  ptzLeft: "button.ipc_ptz_left",
  ptzUp: "button.ipc_ptz_up",
  ptzDown: "button.ipc_ptz_down",
  ptzRight: "button.ipc_ptz_right",
  cameraStatus: "sensor.ipc_status",
  cameraStorage: "sensor.ipc_storage_used",

  netDown: "sensor.upnp_igd_download_speed",
  netUp: "sensor.upnp_igd_upload_speed",
  netWan: "binary_sensor.upnp_igd_wan_status",
  netIp: "sensor.upnp_igd_external_ip",

  xboxStatus: "sensor.solokitten73264_status",
  xboxGame: "sensor.solokitten73264_now_playing",

  backupServer: "sensor.server_backup_last_success",
  backupHa: "sensor.backup_last_successful_automatic_backup",
};

const E = Object.assign({}, DEFAULT_ENTITIES, CONFIG.entities || {});
const states = {};
const reverseMap = {};
Object.keys(E).forEach((key) => {
  if (E[key]) reverseMap[E[key]] = key;
});

let ws = null;
let msgId = 1;
let forecastSubId = null;
let currentForecastType = "daily";
const pending = {};

function icon() {
  createIcons({ icons: ICONS });
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
  if (!ws || ws.readyState !== 1) return null;
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
  } else if (msg.type === "auth_invalid") {
    setBanner("Neispravan token u config.js — generiši novi i zalepi ga tamo.");
  } else if (msg.type === "event" && msg.event && msg.event.event_type === "state_changed") {
    const data = msg.event.data;
    states[data.entity_id] = data.new_state;
    applyState(data.entity_id, data.new_state);
  } else if (msg.type === "event" && msg.id === forecastSubId && msg.event && msg.event.forecast) {
    renderForecast(msg.event.forecast);
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

function callService(domain, service, entityId, extra, cb) {
  if (!entityId) return;
  send({
    type: "call_service",
    domain,
    service,
    service_data: Object.assign({ entity_id: entityId }, extra || {}),
  }, cb);
}

// ---------- Pomoćne ----------

function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function isUnknown(s) {
  return s == null || s === "unknown" || s === "unavailable" || s === "";
}

function withUnit(s, unit) {
  return isUnknown(s) ? "—" : `${s}${unit ? " " + unit : ""}`;
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

const DAYS_FULL = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
const DAYS_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];

function haUrl(path) {
  if (!path) return null;
  return /^https?:/.test(path) ? path : `http://${CONFIG.haHost}${path}`;
}

function flash(el) {
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 220);
}

// ---------- Prikaz stanja ----------

const SELECTS = [
  { key: "vacuumSuction", el: "sel-suction" },
  { key: "vacuumCleanMode", el: "sel-clean" },
  { key: "vacuumWater", el: "sel-water" },
];

const VACUUM_STATES = {
  cleaning: "Čisti",
  docked: "Na docku",
  idle: "Miruje",
  paused: "Pauzirano",
  returning: "Vraća se na dok",
  error: "Greška",
  unavailable: "Nedostupan",
};

function applyState(entityId, state) {
  if (!state) return;

  const personIdx = personIndex[entityId];
  if (personIdx != null) updatePerson(personIdx, state);

  const key = reverseMap[entityId];
  if (!key) return;
  const s = state.state;
  const attr = state.attributes || {};

  switch (key) {
    case "weather":
      setText("weather-temp", (attr.temperature != null ? Math.round(attr.temperature) : "--") + "°");
      setText("weather-desc", weatherText(s));
      $("weather-icon-wrap").innerHTML = `<i data-lucide="${weatherIconName(s)}"></i>`;
      icon();
      break;

    case "sonos":
      renderPlayer("sonos", s, attr);
      break;
    case "tv":
      renderPlayer("tv", s, attr);
      break;

    case "purifier": {
      const isOn = s === "on";
      const btn = $("purifier-toggle");
      btn.classList.toggle("active", isOn);
      btn.setAttribute("aria-checked", isOn ? "true" : "false");
      if (attr.percentage != null) {
        setText("purifier-speed-label", attr.percentage + "%");
        const presets = document.querySelectorAll("#purifier-speed-presets .fan-preset");
        for (let i = 0; i < presets.length; i++) {
          presets[i].classList.toggle("active", Math.abs(parseInt(presets[i].getAttribute("data-pct"), 10) - attr.percentage) <= 16);
        }
      }
      break;
    }
    case "pm25":
      setText("pm25-value", isUnknown(s) ? "—" : s);
      updateGauge(parseFloat(s));
      break;
    case "temp":
      setText("temp-value", withUnit(s, "°C"));
      setText("hero-temp", isUnknown(s) ? "--°" : Math.round(parseFloat(s)) + "°");
      paintClimateRoom();
      break;
    case "humidity":
      setText("humidity-value", withUnit(s, "%"));
      break;
    case "filter":
      setText("filter-value", withUnit(s, "%"));
      break;

    case "vacuum":
      setText("vacuum-state", VACUUM_STATES[s] || s);
      $("vacuum-startpause").classList.toggle("active", s === "cleaning");
      $("vacuum-startpause").innerHTML = `<span class="round-icon-circle"><i data-lucide="${s === "cleaning" ? "pause" : "play"}"></i></span>`;
      icon();
      break;
    case "vacuumMop":
      setText("vacuum-mop", s === "on" ? "Uključeno" : "Isključeno");
      break;
    case "vacuumSleep":
      setText("vacuum-sleep", s === "on" ? "Da" : "Ne");
      break;
    case "vacuumBattery":
      setText("vacuum-battery", withUnit(s, "%"));
      break;
    case "vacuumCharging":
      setText("vacuum-charging", isUnknown(s) ? "—" : s);
      break;
    case "vacuumFilter":
      setText("vacuum-filter", withUnit(s, "%"));
      break;
    case "vacuumBrush":
      setText("vacuum-brush", withUnit(s, "%"));
      break;
    case "vacuumMopLife":
      setText("vacuum-moplife", withUnit(s, "%"));
      break;
    case "vacuumSuction":
    case "vacuumCleanMode":
    case "vacuumWater":
      renderSelect(SELECTS.filter((x) => x.key === key)[0], s, attr.options);
      break;
    case "vacuumDnd":
      $("vacuum-dnd").classList.toggle("on", s === "on");
      break;

    case "cameraQuality":
      setText("cam-quality-label", isUnknown(s) ? "—" : s);
      showCamera();
      break;
    case "cameraHd":
    case "cameraSd":
      showCamera();
      break;
    case "cameraMotion":
      $("cam-motion").classList.toggle("on", s === "on");
      break;
    case "cameraAudio":
      $("cam-audio").classList.toggle("on", s === "on");
      break;
    case "cameraStatus":
      setText("cam-status", isUnknown(s) ? "—" : s);
      break;
    case "cameraStorage":
      setText("cam-storage", withUnit(s, attr.unit_of_measurement));
      break;

    case "netDown":
      setText("home-net-down", withUnit(s, attr.unit_of_measurement));
      break;
    case "netUp":
      setText("home-net-up", withUnit(s, attr.unit_of_measurement));
      break;
    case "netWan":
      setText("home-net-wan", s === "on" ? "Povezano" : s === "off" ? "Prekinuto" : "—");
      break;
    case "netIp":
      setText("home-net-ip", isUnknown(s) ? "—" : s);
      break;
    case "xboxStatus":
      setText("home-xbox-status", isUnknown(s) ? "—" : s);
      break;
    case "xboxGame":
      setText("home-xbox-game", isUnknown(s) ? "—" : s);
      break;
    case "backupServer":
      setText("home-backup-server", formatBackupTime(s));
      break;
    case "backupHa":
      setText("home-backup-ha", formatBackupTime(s));
      break;
  }
}

function renderSelect(cfg, value, options) {
  const sel = $(cfg.el);
  if (!sel) return;
  if (Array.isArray(options)) {
    const sig = options.join("|");
    if (sel.getAttribute("data-sig") !== sig) {
      sel.innerHTML = "";
      options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        sel.appendChild(opt);
      });
      sel.setAttribute("data-sig", sig);
    }
  }
  sel.value = value;
}

function renderPlayer(prefix, s, attr) {
  const card = $(`card-${prefix}`);
  const active = s !== "off" && s !== "unavailable" && s !== "unknown" && s !== "standby";
  card.classList.toggle("is-on", active);
  $(`${prefix}-power`).classList.toggle("active", active);

  const stateText = s === "playing" ? "Svira" : s === "paused" ? "Pauzirano" : s === "idle" ? "Spreman" : s === "off" ? "Isključen" : s === "unavailable" ? "Nedostupan" : s;
  setText(`${prefix}-title`, attr.media_title || (prefix === "sonos" ? "Ništa ne svira" : active ? "Aktivan" : "Isključen"));
  setText(`${prefix}-sub`, attr.media_artist || attr.app_name || stateText);

  const pic = active ? haUrl(attr.entity_picture) : null;
  const bg = $(`${prefix}-bg`);
  if (bg.getAttribute("data-pic") !== (pic || "")) {
    bg.setAttribute("data-pic", pic || "");
    bg.style.backgroundImage = pic ? `url("${pic}")` : "none";
  }

  if (prefix === "sonos") {
    if (attr.volume_level != null) $("sonos-volume").value = Math.round(attr.volume_level * 100);
    $("sonos-playpause").innerHTML = s === "playing" ? `<i data-lucide="pause"></i>` : `<i data-lucide="play"></i>`;
    icon();
  }
}

// ---------- Gauge (polukrug, kao HA "gauge" kartica sa segmentima) ----------

const GAUGE_MAX = 100;
const GAUGE_COLORS = [
  { from: 0, color: "#4ade80", label: "Odličan" },
  { from: 12, color: "#facc15", label: "Dobar" },
  { from: 35, color: "#fb923c", label: "Umeren" },
  { from: 55, color: "#f87171", label: "Loš" },
];

function qualityFor(v) {
  // Isti pragovi kao u HA markdown kartici (<=12, <=35, <=55).
  if (v <= 12) return GAUGE_COLORS[0];
  if (v <= 35) return GAUGE_COLORS[1];
  if (v <= 55) return GAUGE_COLORS[2];
  return GAUGE_COLORS[3];
}

function updateGauge(pm25) {
  const fill = $("purifier-gauge-fill");
  const label = $("purifier-quality-label");
  if (!fill) return;
  if (isNaN(pm25)) {
    fill.style.strokeDasharray = "0 200";
    label.textContent = "—";
    label.style.color = "";
    return;
  }
  const len = Math.PI * 40;
  const pct = Math.max(0, Math.min(1, pm25 / GAUGE_MAX));
  const q = qualityFor(pm25);
  fill.style.strokeDasharray = `${(len * pct).toFixed(2)} ${len.toFixed(2)}`;
  fill.style.stroke = q.color;
  label.textContent = q.label;
  label.style.color = q.color;
}

// ---------- Vreme ----------

const WEATHER_TEXT = {
  "clear-night": "Vedra noć",
  cloudy: "Oblačno",
  fog: "Magla",
  hail: "Grad",
  lightning: "Grmljavina",
  "lightning-rainy": "Grmljavina i kiša",
  partlycloudy: "Delimično oblačno",
  pouring: "Pljusak",
  rainy: "Kiša",
  snowy: "Sneg",
  "snowy-rainy": "Susnežica",
  sunny: "Sunčano",
  windy: "Vetrovito",
  "windy-variant": "Vetrovito",
  exceptional: "Izuzetno",
};

function weatherText(state) {
  return WEATHER_TEXT[state] || state;
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
    exceptional: "triangle-alert",
  };
  return map[state] || "cloud-sun";
}

// Prognoza ide kroz WebSocket (weather/subscribe_forecast) - ne traži CORS.
function subscribeForecastType(type) {
  currentForecastType = type;
  return send({ type: "weather/subscribe_forecast", entity_id: E.weather, forecast_type: type }, (msg) => {
    if (!msg.success) {
      console.warn(`[weather] subscribe_forecast (${type}) nije podržan:`, msg.error);
      if (type === "daily") forecastSubId = subscribeForecastType("hourly");
    }
  });
}

function subscribeForecast() {
  if (!E.weather) return;
  forecastSubId = subscribeForecastType("daily");
}

function renderForecast(forecast) {
  const el = $("forecast");
  if (!el || !forecast || !forecast.length) return;
  const hourly = currentForecastType === "hourly";
  const today = new Date();

  const first = forecast[0];
  if (first && first.temperature != null) {
    const lo = first.templow != null ? ` / ${Math.round(first.templow)}°` : "";
    setText("weather-hilo", `${Math.round(first.temperature)}°${lo}`);
  }

  el.innerHTML = forecast
    .slice(0, 5)
    .map((f) => {
      const d = new Date(f.datetime);
      let label;
      if (hourly) label = `${pad2(d.getHours())}:00`;
      else if (d.toDateString() === today.toDateString()) label = "Danas";
      else label = DAYS_SHORT[d.getDay()];
      const temp = f.temperature != null ? Math.round(f.temperature) + "°" : "--";
      const low = f.templow != null ? Math.round(f.templow) + "°" : "";
      return `<div class="forecast-row">
        <span class="forecast-label">${label}</span>
        <span class="forecast-icon"><i data-lucide="${weatherIconName(f.condition)}"></i></span>
        <span class="forecast-low">${low}</span>
        <span class="forecast-temp">${temp}</span>
      </div>`;
    })
    .join("");
  icon();
}

function formatBackupTime(iso) {
  if (isUnknown(iso)) return "nema podataka";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}. ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ---------- Ljudi ----------

const personIndex = {};

function renderPeople() {
  const el = $("people-row");
  const people = CONFIG.people || [];
  el.innerHTML = "";
  people.forEach((p, i) => {
    personIndex[p.entity] = i;
    const row = document.createElement("div");
    row.className = "hero-person";
    row.id = "person-" + i;
    const avatar = document.createElement("span");
    avatar.className = "hero-avatar";
    avatar.id = "person-avatar-" + i;
    avatar.textContent = (p.name || "?").charAt(0);
    const text = document.createElement("span");
    text.innerHTML = '<span class="hero-person-name"></span><span class="hero-person-where"></span><span class="hero-person-when"></span>';
    row.appendChild(avatar);
    row.appendChild(text);
    el.appendChild(row);
    if (states[p.entity]) updatePerson(i, states[p.entity]);
    else {
      row.querySelector(".hero-person-name").textContent = p.name;
      row.querySelector(".hero-person-where").textContent = "Nema lokacije";
    }
  });
}

function presenceWhere(state) {
  const s = state.state;
  if (s === "home") return "Kod kuće";
  if (s === "not_home") return "Odsutan";
  if (s === "unknown" || s === "unavailable" || !s) return "Nema lokacije";
  return s;
}

function presenceWhen(state) {
  const raw = state.last_updated || state.last_changed;
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.getDate() + "." + (d.getMonth() + 1) + ". " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function updatePerson(i, state) {
  const p = (CONFIG.people || [])[i];
  const el = $(`person-${i}`);
  if (!el || !p) return;
  const name = (state.attributes && state.attributes.friendly_name) || p.name;
  const first = name.split(" ")[0] || name;
  el.querySelector(".hero-person-name").textContent = first;
  el.querySelector(".hero-person-where").textContent = presenceWhere(state);
  el.querySelector(".hero-person-when").textContent = presenceWhen(state);
  const avatar = $("person-avatar-" + i);
  const pic = state.attributes && state.attributes.entity_picture;
  if (avatar && pic) {
    avatar.style.backgroundImage = 'url("' + haUrl(pic) + '")';
    avatar.textContent = "";
  } else if (avatar) {
    avatar.style.backgroundImage = "none";
    avatar.textContent = first.charAt(0);
  }
}

// ---------- Sat ----------

function tickClock() {
  const now = new Date();
  setText("clock", `${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
  setText("date", `${DAYS_FULL[now.getDay()]}, ${now.getDate()}. ${now.getMonth() + 1}.`);
}

// ---------- Banner ----------

function setBanner(text) {
  const b = $("connection-banner");
  b.textContent = text;
  b.classList.remove("hidden");
}
function hideBanner() {
  $("connection-banner").classList.add("hidden");
}

// ---------- Sonos: izbor šta svira (biblioteka / favoriti) ----------

let pickerLevel = { mode: "favorites", id: "", type: "", title: "Sonos favoriti" };
const pickerStack = [];
let pickerItems = [];
let pickerVisible = [];
let pickerReq = 0;
let pickerLoading = false;
let libraryAvailable = false;

function itemPlayable(item) {
  return !!(item.can_play || item.source || (item.media_content_id && !item.can_expand));
}

function pickerMessage(text) {
  const list = $("sonos-picker-list");
  list.innerHTML = "";
  const el = document.createElement("div");
  el.className = "picker-empty";
  el.textContent = text;
  list.appendChild(el);
}

function syncPickerChrome() {
  setText("sonos-picker-title", pickerLevel.title || "Sonos favoriti");
  $("sonos-picker-back").classList.toggle("is-slot", pickerStack.length === 0);
}

function closePicker() {
  pickerReq++;
  $("sonos-picker").classList.add("hidden");
}

function browseSonos(mediaContentId, mediaContentType, cb) {
  const payload = {
    type: "media_player/browse_media",
    entity_id: E.sonos,
  };
  // Prazan id se mora poslati: bez njega HA vrati ceo media browser
  // (kamere, TTS, DLNA), a ne Sonos favorite.
  if (mediaContentId != null) payload.media_content_id = mediaContentId;
  if (mediaContentType != null) payload.media_content_type = mediaContentType;
  return send(payload, cb);
}

function sonosChildren(msg) {
  const children = (msg && msg.success && msg.result && msg.result.children) || [];
  const kept = [];
  for (let i = 0; i < children.length; i++) {
    const id = children[i].media_content_id || "";
    if (id.indexOf("media-source://") === 0) continue;
    kept.push(children[i]);
  }
  return kept;
}

function renderSourceFallback() {
  const st = states[E.sonos];
  const sources = st && st.attributes && st.attributes.source_list;
  pickerLevel = { mode: "sources", id: "", type: "", title: "Sonos favoriti" };
  syncPickerChrome();
  if (!sources || !sources.length) {
    pickerMessage("Sonos nema sačuvane favorite.");
    return;
  }
  pickerItems = sources.map(function (name) {
    return { title: name, source: name, can_play: true, can_expand: false };
  });
  renderPickerList();
}

function loadFlatFavorites() {
  const req = ++pickerReq;
  pickerLoading = true;
  pickerLevel = { mode: "favorites", id: "", type: "favorites", title: "Sonos favoriti" };
  syncPickerChrome();
  pickerMessage("Učitavam Sonos favorite...");
  const sent = browseSonos("", "favorites", function (msg) {
    if (req !== pickerReq) return;
    const folders = sonosChildren(msg);
    if (!msg.success || !folders.length) {
      pickerLoading = false;
      if (libraryAvailable) {
        pickerLevel = { mode: "browse", id: "", type: "library", title: "Muzička biblioteka" };
        loadPickerLevel();
      } else {
        renderSourceFallback();
      }
      return;
    }
    const playable = [];
    const expandable = [];
    for (let i = 0; i < folders.length; i++) {
      if (folders[i].can_expand) expandable.push(folders[i]);
      else playable.push(folders[i]);
    }
    if (!expandable.length) {
      pickerLoading = false;
      pickerItems = playable;
      renderPickerList();
      return;
    }
    let left = expandable.length;
    function finished() {
      left--;
      if (left > 0 || req !== pickerReq) return;
      pickerLoading = false;
      playable.sort(function (a, b) {
        return (a.title || "").localeCompare(b.title || "", "sr");
      });
      pickerItems = playable;
      renderPickerList();
    }
    for (let i = 0; i < expandable.length; i++) {
      const folder = expandable[i];
      const sentSub = browseSonos(folder.media_content_id || "", folder.media_content_type || "favorites_folder", function (sub) {
        if (req !== pickerReq) return;
        const kids = sonosChildren(sub);
        for (let k = 0; k < kids.length; k++) playable.push(kids[k]);
        finished();
      });
      if (sentSub == null) finished();
    }
  });
  if (sent == null) {
    pickerLoading = false;
    pickerMessage("Nema veze sa Home Assistant-om.");
  }
}

function loadPickerLevel() {
  const req = ++pickerReq;
  pickerLoading = true;
  syncPickerChrome();
  pickerMessage("Učitavam...");
  const sent = browseSonos(
    pickerLevel.id != null ? pickerLevel.id : null,
    pickerLevel.type != null ? pickerLevel.type : null,
    function (msg) {
      if (req !== pickerReq) return;
      pickerLoading = false;
      if (!msg.success || !msg.result) {
        pickerMessage("Ne mogu da učitam ovaj folder.");
        return;
      }
      const children = sonosChildren(msg);
      if (!children.length) {
        pickerMessage("Nema ništa ovde");
        return;
      }
      pickerItems = children;
      renderPickerList();
    }
  );
  if (sent == null) {
    pickerLoading = false;
    pickerMessage("Nema veze sa Home Assistant-om.");
  }
}

function openPicker() {
  pickerStack.length = 0;
  libraryAvailable = false;
  pickerLevel = { mode: "favorites", id: "", type: "favorites", title: "Sonos favoriti" };
  $("sonos-picker-search").value = "";
  $("sonos-picker").classList.remove("hidden");
  const req = ++pickerReq;
  pickerLoading = true;
  syncPickerChrome();
  pickerMessage("Učitavam Sonos...");
  const sent = browseSonos(null, null, function (msg) {
    if (req !== pickerReq) return;
    const children = sonosChildren(msg);
    for (let i = 0; i < children.length; i++) {
      if (children[i].media_content_type === "library") libraryAvailable = true;
    }
    let hasFav = false;
    for (let i = 0; i < children.length; i++) {
      if (children[i].media_content_type === "favorites") hasFav = true;
    }
    if (!msg.success) {
      pickerLoading = false;
      renderSourceFallback();
      return;
    }
    if (hasFav) {
      loadFlatFavorites();
      return;
    }
    if (libraryAvailable) {
      pickerLevel = { mode: "browse", id: "", type: "library", title: "Muzička biblioteka" };
      loadPickerLevel();
      return;
    }
    pickerLoading = false;
    renderSourceFallback();
  });
  if (sent == null) {
    pickerLoading = false;
    pickerMessage("Nema veze sa Home Assistant-om.");
  }
}

function openLibrary() {
  pickerStack.push({ mode: "favorites", id: "", type: "favorites", title: "Sonos favoriti" });
  pickerLevel = { mode: "browse", id: "", type: "library", title: "Muzička biblioteka" };
  $("sonos-picker-search").value = "";
  loadPickerLevel();
}

function openPickerFolder(item) {
  if (item.library) {
    openLibrary();
    return;
  }
  pickerStack.push(pickerLevel);
  pickerLevel = {
    mode: "browse",
    id: item.media_content_id != null ? item.media_content_id : "",
    type: item.media_content_type || "",
    title: item.title || "Sonos",
  };
  $("sonos-picker-search").value = "";
  loadPickerLevel();
}

function pickerBack() {
  const prev = pickerStack.pop();
  if (!prev) return;
  pickerLevel = prev;
  $("sonos-picker-search").value = "";
  if (prev.mode === "favorites") loadFlatFavorites();
  else loadPickerLevel();
}

function playSonosItem(item) {
  if (item.source) {
    callService("media_player", "select_source", E.sonos, { source: item.source });
  } else if (item.media_content_id) {
    callService("media_player", "play_media", E.sonos, {
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type || "music",
    });
  } else {
    return;
  }
  setText("sonos-title", item.title || "Puštam");
  setText("sonos-sub", "Puštam...");
  closePicker();
}

function pickerArt(item) {
  const art = document.createElement("span");
  art.className = "picker-art";
  const thumb = item.thumbnail ? haUrl(item.thumbnail) : "";
  if (thumb) {
    art.style.backgroundImage = 'url("' + String(thumb).replace(/"/g, "") + '")';
  } else {
    const iconName = item.can_expand ? "list-music" : "music";
    art.innerHTML = '<i data-lucide="' + iconName + '"></i>';
  }
  return art;
}

function buildPickerRow(item, index) {
  const row = document.createElement("div");
  row.className = "picker-row";
  row.setAttribute("data-idx", String(index));

  const main = document.createElement("button");
  main.type = "button";
  main.className = "picker-main";
  main.appendChild(pickerArt(item));
  const title = document.createElement("span");
  title.className = "picker-row-title";
  title.textContent = item.title || "Bez naslova";
  main.appendChild(title);
  row.appendChild(main);

  const playable = itemPlayable(item);
  const side = document.createElement("button");
  side.type = "button";
  side.className = "picker-side" + (playable ? "" : " ghost");
  if (playable) side.classList.add("picker-play");
  side.innerHTML = '<i data-lucide="' + (item.can_expand && !playable ? "chevron-right" : "play") + '"></i>';
  side.setAttribute("aria-label", playable ? "Pusti" : "Otvori");
  row.appendChild(side);
  return row;
}

function renderPickerList() {
  if (pickerLoading) return;
  const raw = ($("sonos-picker-search").value || "").trim().toLowerCase();
  pickerVisible = pickerItems.filter(function (it) {
    return !raw || (it.title || "").toLowerCase().indexOf(raw) !== -1;
  });
  if (pickerLevel.mode === "favorites" && libraryAvailable && (!raw || "muzička biblioteka".indexOf(raw) !== -1)) {
    pickerVisible = [{ title: "Muzička biblioteka", library: true, can_expand: true, can_play: false }].concat(pickerVisible);
  }
  const list = $("sonos-picker-list");
  list.innerHTML = "";
  if (!pickerVisible.length) {
    pickerMessage(pickerItems.length ? "Nema rezultata" : "Nema ništa ovde");
    return;
  }
  for (let i = 0; i < pickerVisible.length; i++) {
    list.appendChild(buildPickerRow(pickerVisible[i], i));
  }
  icon();
}

function onPickerClick(ev) {
  let node = ev.target;
  let playBtn = null;
  let row = null;
  const list = $("sonos-picker-list");
  while (node && node !== list) {
    if (node.classList && node.classList.contains("picker-play")) playBtn = node;
    if (node.classList && node.classList.contains("picker-row")) row = node;
    node = node.parentNode;
  }
  if (!row) return;
  const item = pickerVisible[parseInt(row.getAttribute("data-idx"), 10)];
  if (!item) return;
  if (item.library) {
    openLibrary();
    return;
  }
  if (playBtn || (!item.can_expand && itemPlayable(item))) {
    playSonosItem(item);
    return;
  }
  if (item.can_expand) openPickerFolder(item);
}

// ---------- Broadlink daljinski (TV + klima) ----------

const DEFAULT_REMOTES = {
  entity: "remote.universal_remote",
  devices: [
    {
      id: "tv",
      title: "TV",
      device: "tv",
      buttons: [
        { label: "Napajanje", command: "power", icon: "power", wide: true },
        { label: "Jače", command: "volume_up", icon: "plus" },
        { label: "Tiše", command: "volume_down", icon: "minus" },
        { label: "Bez zvuka", command: "mute", icon: "volume-2" },
        { label: "Kanal +", command: "channel_up", icon: "arrow-up" },
        { label: "Kanal −", command: "channel_down", icon: "arrow-down" },
        { label: "Izvor", command: "source", icon: "tv" },
      ],
    },
    {
      id: "klima",
      title: "Klima",
      device: "klima",
      buttons: [
        { label: "Uključi", action: "setpoint", icon: "power" },
        { label: "Isključi", command: "iskljuci", icon: "power" },
        { label: "Režim", command: "mode", icon: "wind" },
        { label: "Ventilator", command: "fan", icon: "fan" },
      ],
      climate: { min: 16, max: 30, step: 1, value: 24, prefix: "ukljuci_" },
    },
  ],
};

const REMOTES = (CONFIG.remotes && CONFIG.remotes.devices) ? CONFIG.remotes : DEFAULT_REMOTES;
let remoteIndex = 0;
let remoteLearning = false;

function remoteStatus(text) {
  const el = $("remote-status");
  if (el) el.textContent = text || "";
}

function remoteErrorText(msg) {
  const err = msg && msg.error;
  const text = err ? String(err.message || err) : "nije uspelo";
  if (text.indexOf("not found") !== -1) {
    return "Ova komanda još nije naučena. Uključi Nauči, uperi pravi daljinski u Broadlink i pritisni isto dugme.";
  }
  return text.slice(0, 160);
}

function remoteIconName(name) {
  return /^[a-z0-9-]+$/.test(name || "") ? name : "power";
}

function climateRange(device) {
  const c = device.climate || {};
  return {
    min: c.min != null ? c.min : 16,
    max: c.max != null ? c.max : 30,
    step: c.step || 1,
    value: c.value != null ? c.value : 24,
    prefix: c.prefix || "ukljuci_",
  };
}

function climateStorageKey(device) {
  return "klima-set-" + (device.id || device.device || "klima");
}

function readSetpoint(device) {
  const cfg = climateRange(device);
  let n = cfg.value;
  try {
    const saved = localStorage.getItem(climateStorageKey(device));
    if (saved != null && saved !== "") n = parseInt(saved, 10);
  } catch (e) { /* privatni režim */ }
  if (isNaN(n)) n = cfg.value;
  if (n < cfg.min) n = cfg.min;
  if (n > cfg.max) n = cfg.max;
  return n;
}

function writeSetpoint(device, n) {
  try { localStorage.setItem(climateStorageKey(device), String(n)); } catch (e) { /* ignore */ }
}

function paintSetpoint(n) {
  setText("klima-set", n + "°");
}

function paintClimateRoom() {
  const el = $("klima-room");
  if (!el) return;
  const st = states[E.temp];
  const s = st && st.state;
  el.textContent = isUnknown(s) ? "Soba —" : "Soba " + Math.round(parseFloat(s)) + "°";
}

function fireRemote(device, command, label, learnHint) {
  const entity = REMOTES.entity || DEFAULT_REMOTES.entity;
  const data = { device: device.device, command: [command] };
  if (remoteLearning) {
    remoteStatus(learnHint || ("Čekam „" + label + "“ — pritisni to dugme na pravom daljinskom, ka Broadlinku."));
    callService("remote", "learn_command", entity, Object.assign({ command_type: "ir" }, data), function (msg) {
      if (msg && msg.success) {
        remoteLearning = false;
        const learnBtn = $("remote-learn");
        if (learnBtn) learnBtn.classList.remove("active");
        remoteStatus("Naučeno: " + label + ". Sad dugme šalje komandu.");
      } else {
        remoteStatus(remoteErrorText(msg));
      }
    });
    return;
  }
  callService("remote", "send_command", entity, data, function (msg) {
    if (msg && msg.success) remoteStatus("Poslato: " + label);
    else remoteStatus(remoteErrorText(msg));
  });
}

function setpointCommand(device, n) {
  return climateRange(device).prefix + n;
}

function stepClimate(device, delta) {
  const cfg = climateRange(device);
  const current = readSetpoint(device);
  const next = current + delta;
  if (next < cfg.min || next > cfg.max) {
    remoteStatus(next < cfg.min ? "Najniže je " + cfg.min + "°." : "Najviše je " + cfg.max + "°.");
    return;
  }
  writeSetpoint(device, next);
  paintSetpoint(next);
  fireRemote(
    device,
    setpointCommand(device, next),
    next + "°",
    "Čekam " + next + "° — na pravom daljinskom podesi " + next + "° i pritisni, ka Broadlinku."
  );
}

function appendClimate(pad, device) {
  const current = readSetpoint(device);
  const wrap = document.createElement("div");
  wrap.className = "remote-climate";

  const down = document.createElement("button");
  down.type = "button";
  down.className = "remote-key remote-step";
  down.setAttribute("aria-label", "Smanji temperaturu");
  down.innerHTML = '<i data-lucide="minus"></i>';
  down.addEventListener("click", function () {
    flash(down);
    stepClimate(device, -climateRange(device).step);
  });

  const mid = document.createElement("div");
  mid.className = "remote-climate-mid";
  mid.innerHTML = '<div class="remote-climate-value" id="klima-set"></div>'
    + '<div class="remote-climate-label">Podešeno</div>'
    + '<div class="remote-climate-room" id="klima-room"></div>';

  const up = document.createElement("button");
  up.type = "button";
  up.className = "remote-key remote-step";
  up.setAttribute("aria-label", "Povećaj temperaturu");
  up.innerHTML = '<i data-lucide="plus"></i>';
  up.addEventListener("click", function () {
    flash(up);
    stepClimate(device, climateRange(device).step);
  });

  wrap.appendChild(down);
  wrap.appendChild(mid);
  wrap.appendChild(up);
  pad.appendChild(wrap);
  paintSetpoint(current);
  paintClimateRoom();
}

function renderRemote() {
  const tabs = $("remote-tabs");
  const pad = $("remote-pad");
  const device = REMOTES.devices[remoteIndex];
  if (!tabs || !pad || !device) return;

  tabs.innerHTML = "";
  for (let i = 0; i < REMOTES.devices.length; i++) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "remote-tab" + (i === remoteIndex ? " active" : "");
    tab.textContent = REMOTES.devices[i].title;
    tab.addEventListener("click", function () {
      remoteIndex = i;
      renderRemote();
    });
    tabs.appendChild(tab);
  }

  pad.innerHTML = "";
  pad.className = device.climate ? "remote-pad remote-pad-split" : "remote-pad";
  const buttons = device.buttons || [];
  let climatePlaced = !device.climate;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "remote-key" + (btn.wide ? " wide" : "");
    el.innerHTML = '<i data-lucide="' + remoteIconName(btn.icon) + '"></i>';
    const label = document.createElement("span");
    label.textContent = btn.label || btn.command;
    el.appendChild(label);
    el.addEventListener("click", function () {
      flash(el);
      let command = btn.command;
      let name = btn.label || btn.command;
      let learnHint = null;
      if (btn.action === "setpoint" && device.climate) {
        const n = readSetpoint(device);
        command = setpointCommand(device, n);
        name = n + "°";
        learnHint = "Čekam " + n + "° — na pravom daljinskom podesi " + n + "° i pritisni, ka Broadlinku.";
      }
      fireRemote(device, command, name, learnHint);
    });
    pad.appendChild(el);
    if (device.climate && i === 1) {
      appendClimate(pad, device);
      climatePlaced = true;
    }
  }
  if (!climatePlaced) appendClimate(pad, device);
  icon();
}

// ---------- Kontrole ----------

function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener("click", fn);
}

function press(id, key) {
  on(id, () => {
    flash($(id));
    callService("button", "press", E[key]);
  });
}

function wireControls() {
  // Prečišćivač
  on("purifier-toggle", () => {
    const isOn = states[E.purifier] && states[E.purifier].state === "on";
    callService("fan", isOn ? "turn_off" : "turn_on", E.purifier);
  });
  const presets = document.querySelectorAll("#purifier-speed-presets .fan-preset");
  for (let i = 0; i < presets.length; i++) {
    presets[i].addEventListener("click", () => {
      const pct = parseInt(presets[i].getAttribute("data-pct"), 10);
      if (pct === 0) callService("fan", "turn_off", E.purifier);
      else callService("fan", "set_percentage", E.purifier, { percentage: pct });
    });
  }
  press("purifier-mode", "purifierMode");

  // Zvučnik
  on("sonos-power", () => callService("media_player", "toggle", E.sonos));
  on("tv-power", () => callService("media_player", "toggle", E.tv));
  $("sonos-volume").addEventListener("change", (e) => {
    callService("media_player", "volume_set", E.sonos, { volume_level: e.target.value / 100 });
  });
  const tbtns = document.querySelectorAll("#card-sonos .round-btn");
  for (let i = 0; i < tbtns.length; i++) {
    tbtns[i].addEventListener("click", () => {
      const action = tbtns[i].getAttribute("data-action");
      if (action === "playpause") callService("media_player", "media_play_pause", E.sonos);
      if (action === "next") callService("media_player", "media_next_track", E.sonos);
      if (action === "prev") callService("media_player", "media_previous_track", E.sonos);
    });
  }
  on("sonos-library", openPicker);
  on("remote-learn", () => {
    remoteLearning = !remoteLearning;
    const learnBtn = $("remote-learn");
    if (learnBtn) learnBtn.classList.toggle("active", remoteLearning);
    remoteStatus(remoteLearning
      ? "Režim učenja. Pritisni dugme ovde, pa isto dugme na pravom daljinskom."
      : "");
  });
  on("sonos-picker-close", closePicker);
  on("sonos-picker-backdrop", closePicker);
  on("sonos-picker-back", pickerBack);
  $("sonos-picker-search").addEventListener("input", renderPickerList);
  $("sonos-picker-list").addEventListener("click", onPickerClick);

  // Usisivač
  on("vacuum-startpause", () => {
    const cleaning = states[E.vacuum] && states[E.vacuum].state === "cleaning";
    callService("vacuum", cleaning ? "pause" : "start", E.vacuum);
  });
  on("vacuum-stop", () => callService("vacuum", "stop", E.vacuum));
  on("vacuum-spot", () => callService("vacuum", "clean_spot", E.vacuum));
  on("vacuum-locate", () => callService("vacuum", "locate", E.vacuum));
  on("vacuum-home", () => callService("vacuum", "return_to_base", E.vacuum));
  press("vacuum-mopwash", "vacuumMopWash");
  press("vacuum-dry", "vacuumDry");
  on("vacuum-dnd", () => callService("switch", "toggle", E.vacuumDnd));
  SELECTS.forEach((cfg) => {
    $(cfg.el).addEventListener("change", (e) => {
      callService("select", "select_option", E[cfg.key], { option: e.target.value });
    });
  });

  on("cam-quality", () => callService("input_select", "select_next", E.cameraQuality));
  on("cam-motion", () => callService("switch", "toggle", E.cameraMotion));
  on("cam-audio", () => callService("switch", "toggle", E.cameraAudio));
  press("ptz-left", "ptzLeft");
  press("ptz-up", "ptzUp");
  press("ptz-down", "ptzDown");
  press("ptz-right", "ptzRight");
  bindCamera();
}

// Slika ide direktno u <img>, bez fetch-a, pa CORS ne važi.
// Token je access_token same kamere, ne long-lived token.
var cameraLive = "stream";
var cameraSrc = "";
var cameraSnapTimer = null;

function cameraEntityId() {
  const st = states[E.cameraQuality];
  const q = st && st.state ? String(st.state).toLowerCase() : "";
  if (q.indexOf("sd") !== -1) return E.cameraSd;
  return E.cameraHd;
}

function cameraFeedUrl(id, live) {
  const st = states[id];
  const pic = st && st.attributes && st.attributes.entity_picture;
  if (!pic) return "";
  const path = live ? String(pic).replace("/api/camera_proxy/", "/api/camera_proxy_stream/") : pic;
  const url = haUrl(path);
  if (live) return url;
  return url + (url.indexOf("?") >= 0 ? "&" : "?") + "_t=" + Date.now();
}

function stopSnaps() {
  if (cameraSnapTimer) {
    clearInterval(cameraSnapTimer);
    cameraSnapTimer = null;
  }
}

function pauseCamera() {
  stopSnaps();
  const img = $("camera-feed");
  if (img && img.getAttribute("src")) img.removeAttribute("src");
  cameraSrc = "";
}

function showCamera() {
  if (document.body.getAttribute("data-view") !== "camera") return;
  const img = $("camera-feed");
  const ph = $("camera-fallback");
  if (!img) return;
  const src = cameraFeedUrl(cameraEntityId(), cameraLive === "stream");
  if (!src) {
    if (ph) ph.classList.remove("hidden");
    return;
  }
  if (cameraLive === "stream" && cameraSrc === src && img.getAttribute("src")) return;
  cameraSrc = src;
  img.src = src;
}

function useSnapshots() {
  if (cameraLive === "snap") return;
  cameraLive = "snap";
  cameraSrc = "";
  stopSnaps();
  const text = document.querySelector("#camera-fallback .camera-placeholder-text");
  if (text) text.textContent = "Osvežavam sliku kamere...";
  showCamera();
  cameraSnapTimer = setInterval(showCamera, 1000);
}

function bindCamera() {
  const img = $("camera-feed");
  if (!img) return;
  img.addEventListener("load", () => {
    const ph = $("camera-fallback");
    if (ph) ph.classList.add("hidden");
  });
  img.addEventListener("error", () => {
    if (document.body.getAttribute("data-view") !== "camera") return;
    if (!img.getAttribute("src")) return;
    const ph = $("camera-fallback");
    if (cameraLive === "stream") {
      useSnapshots();
      return;
    }
    if (ph) ph.classList.remove("hidden");
  });
}

// ---------- Start ----------

function setView(name) {
  document.body.setAttribute("data-view", name);
  const tabs = document.querySelectorAll("#tabbar button");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle("active", tabs[i].getAttribute("data-tab") === name);
  }
  const blocks = document.querySelectorAll("[data-screen]");
  for (let i = 0; i < blocks.length; i++) {
    const screens = blocks[i].getAttribute("data-screen").split(" ");
    blocks[i].classList.toggle("screen-off", screens.indexOf(name) === -1);
  }
  const cols = document.querySelectorAll(".col");
  let visibleCols = 0;
  for (let i = 0; i < cols.length; i++) {
    const left = cols[i].querySelectorAll("[data-screen]:not(.screen-off)");
    const on = left.length > 0;
    cols[i].classList.toggle("col-off", !on);
    if (on) visibleCols++;
  }
  const board = document.querySelector(".cols");
  if (board) board.setAttribute("data-cols", String(visibleCols || 1));
  if (name === "camera") showCamera();
  else pauseCamera();
}

renderPeople();
renderRemote();
wireControls();
const tabButtons = document.querySelectorAll("#tabbar button");
for (let i = 0; i < tabButtons.length; i++) {
  tabButtons[i].addEventListener("click", function () {
    setView(tabButtons[i].getAttribute("data-tab"));
  });
}
setView("home");
icon();
tickClock();
setInterval(tickClock, 1000);
connect();
