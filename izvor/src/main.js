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
  Moon,
  Music,
  Pause,
  PlugZap,
  Play,
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
  Joystick, ListMusic, Locate, MapPin, Mic, Moon, Music, Pause, PlugZap, Play, Power, Router,
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

function callService(domain, service, entityId, extra) {
  if (!entityId) return;
  send({
    type: "call_service",
    domain,
    service,
    service_data: Object.assign({ entity_id: entityId }, extra || {}),
  });
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
  el.innerHTML = people.map((p, i) => `<div class="hero-person" id="person-${i}">${p.name}</div>`).join("");
  people.forEach((p, i) => {
    personIndex[p.entity] = i;
    if (states[p.entity]) updatePerson(i, states[p.entity]);
  });
}

function updatePerson(i, state) {
  const p = (CONFIG.people || [])[i];
  const el = $(`person-${i}`);
  if (!el || !p) return;
  const name = (state.attributes && state.attributes.friendly_name) || p.name;
  const where = state.state === "home" ? "Kod kuće" : state.state === "not_home" ? "Odsutan" : state.state;
  el.textContent = `${name} · ${where}`;
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

let pickerLevel = { id: "", type: "", title: "Biblioteka" };
const pickerStack = [];
let pickerItems = [];
let pickerVisible = [];
let pickerReq = 0;
let pickerLoading = false;

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
  setText("sonos-picker-title", pickerLevel.title || "Biblioteka");
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
  if (mediaContentId) payload.media_content_id = mediaContentId;
  if (mediaContentType) payload.media_content_type = mediaContentType;
  return send(payload, cb);
}

function renderSourceFallback() {
  const st = states[E.sonos];
  const sources = st && st.attributes && st.attributes.source_list;
  if (!sources || !sources.length) {
    pickerMessage("Sonos nema omiljene ni biblioteku.");
    return;
  }
  pickerItems = sources.map(function (name) {
    return { title: name, source: name, can_play: true, can_expand: false };
  });
  renderPickerList();
}

function loadPickerLevel() {
  const req = ++pickerReq;
  pickerLoading = true;
  syncPickerChrome();
  pickerMessage("Učitavam...");
  const sent = browseSonos(pickerLevel.id, pickerLevel.type, function (msg) {
    if (req !== pickerReq) return;
    pickerLoading = false;
    if (!msg.success || !msg.result) {
      if (pickerStack.length === 0) renderSourceFallback();
      else pickerMessage("Ne mogu da učitam ovaj folder.");
      return;
    }
    const children = msg.result.children || [];
    if (!children.length && pickerStack.length === 0) {
      renderSourceFallback();
      return;
    }
    pickerItems = children;
    renderPickerList();
  });
  if (sent == null) {
    pickerLoading = false;
    pickerMessage("Nema veze sa Home Assistant-om.");
  }
}

function openPicker() {
  pickerStack.length = 0;
  pickerLevel = { id: "", type: "", title: "Biblioteka" };
  $("sonos-picker-search").value = "";
  $("sonos-picker").classList.remove("hidden");
  loadPickerLevel();
}

function openPickerFolder(item) {
  pickerStack.push(pickerLevel);
  pickerLevel = {
    id: item.media_content_id || "",
    type: item.media_content_type || "",
    title: item.title || "Biblioteka",
  };
  $("sonos-picker-search").value = "";
  loadPickerLevel();
}

function pickerBack() {
  const prev = pickerStack.pop();
  if (!prev) return;
  pickerLevel = prev;
  $("sonos-picker-search").value = "";
  loadPickerLevel();
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
  if (playBtn || (!item.can_expand && itemPlayable(item))) {
    playSonosItem(item);
    return;
  }
  if (item.can_expand) openPickerFolder(item);
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

  // Kamera (samo kontrole - slika ne radi zbog CORS-a)
  on("cam-quality", () => callService("input_select", "select_next", E.cameraQuality));
  on("cam-motion", () => callService("switch", "toggle", E.cameraMotion));
  on("cam-audio", () => callService("switch", "toggle", E.cameraAudio));
  press("ptz-left", "ptzLeft");
  press("ptz-up", "ptzUp");
  press("ptz-down", "ptzDown");
  press("ptz-right", "ptzRight");
  $("camera-open").setAttribute("href", `http://${CONFIG.haHost}/`);
}

// ---------- Start ----------

renderPeople();
wireControls();
icon();
tickClock();
setInterval(tickClock, 1000);
connect();
