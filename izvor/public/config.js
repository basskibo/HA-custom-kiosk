// ====================================================================
// PODESAVANJA - ovde unosis svoje podatke. Ovaj fajl se NE builduje,
// menjas ga direktno na Raspberry Pi-ju i samo refreshujes stranicu.
//
// Entity ID-jevi NISU obavezni: dashboard ima ugradjene podrazumevane
// (isti kao u HA dashboard-u). Dovoljno je da ovde navedes samo one koje
// zelis da promenis - ostali ostaju podrazumevani.
// ====================================================================
window.CONFIG = {
  // Adresa tvog Home Assistant-a, BEZ "http://" i bez završnog "/"
  haHost: "192.168.1.20:8123",

  // Long-Lived Access Token:
  // HA -> klikni na svoj avatar dole levo -> skroluj do "Long-lived access tokens"
  // -> "Create Token" -> daj mu ime (npr. "custom-dashboard") -> KOPIRAJ ODMAH
  // (prikaze se samo jednom!)
  token: "PASTE_YOUR_LONG_LIVED_TOKEN_HERE",

  // Opciono: nadjacavanje entity ID-jeva (kljuc -> entity_id).
  // Svi kljucevi sa podrazumevanim vrednostima su u izvor/src/main.js
  // (DEFAULT_ENTITIES). Primer:
  //   entities: { weather: "weather.forecast_home" },
  entities: {},

  // Broadlink daljinski (remote.universal_remote). Dugmad šalju
  // remote.send_command. Imena device/command moraju biti ista kao
  // naučene komande u HA. Klima je +/− od 16° do 30°; komanda za 24°
  // je ukljuci_24. Ako su kod tebe drugačija, zameni ovde
  // i samo osveži stranicu — ne mora novi build.
  // remotes: {
  //   entity: "remote.universal_remote",
  //   devices: [
  //     { id: "tv", title: "TV", device: "tv", buttons: [
  //       { label: "Napajanje", command: "power", icon: "power", wide: true },
  //     ]},
  //   ],
  // },

  // LJUDI (kartica sa satom: "Ime · Kod kuće/Odsutan").
  // Radi samo ako person entitet ima pracenje lokacije (HA Companion app).
  people: [
    { name: "Bojan", entity: "person.bojan_jagetic" },
    // { name: "Partner", entity: "person.ime_prezime" },
  ],
};
