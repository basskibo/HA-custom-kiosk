// ====================================================================
// PODESAVANJA - ovde unosis svoje podatke. Ovaj fajl se NE builduje,
// menjas ga direktno na Raspberry Pi-ju i samo refreshujes stranicu.
// ====================================================================
window.CONFIG = {
  // Adresa tvog Home Assistant-a, BEZ "http://" i bez završnog "/"
  haHost: "192.168.1.20:8123",

  // Long-Lived Access Token:
  // HA -> klikni na svoj avatar dole levo -> skroluj do "Long-lived access tokens"
  // -> "Create Token" -> daj mu ime (npr. "custom-dashboard") -> KOPIRAJ ODMAH
  // (prikaze se samo jednom!)
  token: "PASTE_YOUR_LONG_LIVED_TOKEN_HERE",

  // Koliko cesto da se osvezi slika kamere (u milisekundama)
  cameraRefreshMs: 2000,

  // Entity ID-jevi - ako promenis uredjaj ili dodas novi, menjas samo ovde
  entities: {
    weather: "weather.home",

    sonos: "media_player.living_room_living_room",
    tv: "media_player.yettel_tv_box",

    cameraHd: "camera.ipc_live_view_hd",
    cameraSd: "camera.ipc_live_view_sd",

    purifier: "fan.zhimi_de_436875919_mb3a_s_2_air_purifier",
    pm25: "sensor.zhimi_de_436875919_mb3a_pm2_5_density_p_3_6",
    temp: "sensor.zhimi_de_436875919_mb3a_temperature_p_3_8",
    humidity: "sensor.zhimi_de_436875919_mb3a_relative_humidity_p_3_7",
    filter: "sensor.zhimi_de_436875919_mb3a_filter_life_level_p_4_3",
    purifierMode: "button.zhimi_de_436875919_mb3a_toggle_mode_a_8_2",

    vacuumStart: "button.xiaomi_de_1173620033_ov81gl_start_sweep_mop_a_2_6",
    vacuumStop: "button.xiaomi_de_1173620033_ov81gl_stop_working_a_2_51",
    vacuumSpot: "button.xiaomi_de_1173620033_ov81gl_spot_cleaning_a_2_59",
    vacuumMop: "binary_sensor.xiaomi_de_1173620033_ov81gl_mop_status_p_2_11",
    vacuumSleep: "binary_sensor.xiaomi_de_1173620033_ov81gl_sleep_status_p_2_25",

    netDown: "sensor.upnp_igd_download_speed",
    netUp: "sensor.upnp_igd_upload_speed",
    netWan: "binary_sensor.upnp_igd_wan_status",
    netIp: "sensor.upnp_igd_external_ip",

    xboxStatus: "sensor.solokitten73264_status",
    xboxGame: "sensor.solokitten73264_now_playing",

    backupServer: "sensor.server_backup_last_success",
    backupHa: "sensor.backup_last_successful_automatic_backup",
  },

  // ------------------------------------------------------------------
  // LJUDI (gornji levi ugao - avatar + "Kod kuce/Odsutan").
  // Ovo radi samo ako person entitet ima pravo pracenje lokacije
  // (HA Companion app na telefonu). Ako nemas to podeseno, entitet ce
  // uvek pokazivati "Nepoznato" - sto je ok, samo ces znati da nije
  // greska dashboarda.
  // ------------------------------------------------------------------
  people: [
    { name: "Bojan", entity: "person.bojan_jagetic" },
    // { name: "Partner", entity: "person.ime_prezime" },
  ],

  // ------------------------------------------------------------------
  // SOBE / SVETLA - dodaj onoliko soba i uredjaja koliko imas.
  // Entity ID nadjes u HA: Settings -> Devices & services -> Entities ->
  // ikonica pored "Filters" -> ukljuci kolonu "Entity ID".
  //
  // "dimmable: true" dodaje klizac za jacinu svetla (radi samo za
  // light.* uredjaje koji podrzavaju brightness).
  // ------------------------------------------------------------------
  rooms: [
    {
      id: "dnevna",
      name: "Dnevna soba",
      // temp/humidity senzori za ovu sobu (opciono - ostavi null ako nemas)
      tempEntity: "sensor.zhimi_de_436875919_mb3a_temperature_p_3_8",
      humidityEntity: "sensor.zhimi_de_436875919_mb3a_relative_humidity_p_3_7",
      lights: [
        // Primeri - OBRISI ih i zameni svojim pravim entity ID-jevima:
        // { name: "Plafonjera", entity: "light.dnevna_plafonjera", dimmable: true },
        // { name: "Pod lampa", entity: "switch.dnevna_pod_lampa", dimmable: false },
      ],
    },
    {
      id: "spavaca",
      name: "Spavaća soba",
      tempEntity: null,
      humidityEntity: null,
      lights: [],
    },
  ],

  // ------------------------------------------------------------------
  // SCENE - prvo napravi scene u HA (Settings -> Automations & Scenes ->
  // Scenes -> Add Scene), pa upisi njihov pravi entity ID ispod.
  // Dok god entity sadrzi "TODO", dugme radi ali te samo podseti da
  // scenu jos nisi podesio.
  // ------------------------------------------------------------------
  scenes: [
    { name: "Večera", icon: "utensils", entity: "scene.TODO_vecera" },
    { name: "Kuvanje", icon: "chef-hat", entity: "scene.TODO_kuvanje" },
    { name: "Film", icon: "clapperboard", entity: "scene.TODO_film" },
    { name: "Noć", icon: "moon", entity: "scene.TODO_noc" },
    { name: "Gosti", icon: "users", entity: "scene.TODO_gosti" },
  ],
};
