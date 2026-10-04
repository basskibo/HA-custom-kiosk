# homepi-dashboard

Custom Home Assistant dashboard (vidi `izvor/` za ceo Vite projekat).

**Ko šta radi:**
- **Ovaj računar** (tvoj desktop, na kom pričaš sa Claude-om) — ovde se
  nove verzije primenjuju i **pushuju** na GitHub.
- **Raspberry Pi** — samo **pull**-uje (povlači) sa GitHub-a i deploy-uje.
  Pi nikad ne pushuje ništa.

## Struktura repo-a

```
homepi-dashboard/
├── izvor/              Ceo Vite projekat (kod koji Claude menja/gradi)
│   ├── src/             JS i CSS
│   ├── public/          config.js PLACEHOLDER (ne pravi token!)
│   └── package.json
├── dashboard/           Gotovi, već izgrađeni fajlovi (ono što nginx
│                        stvarno servira) — index.html + assets/
└── scripts/
    ├── update.sh         Pull + deploy — OVO POKREĆE RASPBERRY PI
    └── apply-package.sh  Primeni novi paket + commit + push — OVO
                           POKREĆE OVAJ RAČUNAR (ne Pi)
```

**Tvoj pravi Home Assistant token NIKAD nije u ovom repo-u.** On živi
samo u `~/dashboard/html/config.js` na Raspberry Pi-ju — izvan repo-a —
i `update.sh` ga nikad ne dira.

## Gde je šta

```
Ovaj računar:
  ~/homepi-setup/dashboard-repo/   <- ovaj repo, OVDE SE PUSHUJE
                                       (već podešeno: git remote origin
                                       = git@github.com:basskibo/HA-custom-kiosk.git,
                                       initial commit je već urađen)

Raspberry Pi:
  ~/dashboard-repo/                <- isti repo, klon SAMO ZA ČITANJE
                                       (read-only deploy key, vidi ispod)
  ~/dashboard/html/                <- folder koji nginx kontejner stvarno
                                       servira (ovde živi tvoj pravi config.js)
```

## Jednokratno podešavanje — prvi push sa ovog računara

Repo je već napravljen i commit-ovan u `~/homepi-setup/dashboard-repo`,
sa `origin` podešenim na `git@github.com:basskibo/HA-custom-kiosk.git`.
Samo treba da ga pošalješ na GitHub prvi put, iz svog pravog terminala
(ne preko Claude-a — Claude radi u bezbednosnom sandboxu na ovom
računaru koji nema internet pristup, samo fajl-sistem, pa ovaj korak
moraš ti):

```bash
cd ~/homepi-setup/dashboard-repo
git push -u origin main
```

Koristi tvoj već podešen SSH ključ za GitHub (isti kao za ostale repoe).

## Jednokratno podešavanje — Raspberry Pi (read-only pristup)

Pi treba da može da *povuče* repo, ali ne i da pushuje. Najčistiji način
je GitHub **Deploy Key** sa read-only pravima (po difoltu je read-only,
osim ako ne čekiraš "Allow write access" — tako Pi fizički ne može da
pošalje izmene na GitHub, čak i ako neko greškom pokrene push skriptu
na njemu):

```bash
# na Raspberry Pi-ju:
ssh-keygen -t ed25519 -C "homepi-pi-readonly" -f ~/.ssh/homepi_dashboard_deploy -N ""
cat ~/.ssh/homepi_dashboard_deploy.pub
```

Kopiraj ispis → GitHub repo (`basskibo/HA-custom-kiosk`) → **Settings**
→ **Deploy keys** → **Add deploy key** → zalepi ključ → **NEMOJ**
čekirati "Allow write access" → Add key.

Zatim na Pi-ju podesi da git koristi baš taj ključ za ovaj repo:

```bash
mkdir -p ~/.ssh
cat >> ~/.ssh/config <<'EOF'
Host github-homepi-dashboard
    HostName github.com
    User git
    IdentityFile ~/.ssh/homepi_dashboard_deploy
    IdentitiesOnly yes
EOF

git clone github-homepi-dashboard:basskibo/HA-custom-kiosk.git ~/dashboard-repo
chmod +x ~/dashboard-repo/scripts/update.sh
```

### Prvi deploy na Pi-ju

Tvoj pravi `config.js` već treba da postoji u `~/dashboard/html/` od
ranije:

```bash
~/dashboard-repo/scripts/update.sh
```

## Kako ide svako sledeće ažuriranje

1. Claude ti pošalje izmene (ili ih primeni direktno u
   `~/homepi-setup/dashboard-repo` na ovom računaru).
2. Ti, na **ovom računaru**, u pravom terminalu:
   ```bash
   cd ~/homepi-setup/dashboard-repo
   git push
   ```
   (Jedini ručni korak koji je preostao — zato što Claude-ov sandbox na
   ovom računaru nema internet.)
3. Na **Raspberry Pi-ju**:
   ```bash
   ~/dashboard-repo/scripts/update.sh
   ```

Ako ikad dobiješ paket kao zip i želiš da ga sam primeniš (umesto da
Claude direktno menja fajlove), na ovom računaru:

```bash
~/homepi-setup/dashboard-repo/scripts/apply-package.sh ~/Downloads/dashboard-vN.zip
```

Ova skripta (pokrenuta u tvom terminalu, sa internetom) radi sve u
jednom koraku: primeni paket, commit, i push.

## Vraćanje na stariju verziju (rollback)

Na **ovom računaru**:

```bash
cd ~/homepi-setup/dashboard-repo
git log --oneline                  # vidi listu verzija
git checkout <commit-hash> -- dashboard/
git commit -m "Rollback na <commit-hash>"
git push
```

Pa na Pi-ju: `~/dashboard-repo/scripts/update.sh`
