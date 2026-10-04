# homepi-dashboard

Custom Home Assistant dashboard za kuću (vidi `izvor/` za ceo Vite
projekat). Ovaj repo je napravljen da ti Raspberry Pi update-uje sam,
jednom komandom — bez ručnog `scp`-ovanja fajlova.

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
    ├── update.sh         Povuci + deploy (ovo pokrećeš redovno)
    └── apply-package.sh  Primeni novi zip koji ti Claude pošalje
```

**Tvoj pravi Home Assistant token NIKAD nije u ovom repo-u.** On živi
samo u `~/dashboard/html/config.js` na samom Raspberry Pi-ju — izvan
repo-a — i `update.sh` ga nikad ne dira.

## Gde je šta na Raspberry Pi-ju

```
~/dashboard-repo/        <- ovaj git repo (klonirano sa GitHub-a)
~/dashboard/html/        <- folder koji nginx kontejner stvarno servira
                             (ovde živi tvoj pravi config.js)
```

Ništa se više ne šalje ručno preko `scp` — `update.sh` radi tu kopiju
umesto tebe.

## Jednokratno podešavanje (samo prvi put)

### 1. Napravi prazan repo na GitHub-u

Idi na github.com → "New repository" → daj mu ime (npr.
`homepi-dashboard`) → **nemoj** čekirati "Add README" → Create.
Zapamti link, izgleda ovako: `https://github.com/TVOJE-IME/homepi-dashboard.git`

### 2. Napravi Personal Access Token (da bi Pi mogao da radi push)

GitHub → klikni na svoj avatar (gore desno) → Settings → skroluj skroz
dole do "Developer settings" → "Personal access tokens" → "Tokens
(classic)" → "Generate new token (classic)" → čekiraj samo `repo` →
Generate → **kopiraj token odmah** (prikaže se samo jednom).

### 3. Na Raspberry Pi-ju: izbaci ovaj paket i poveži sa GitHub-om

```bash
cd ~
unzip homepi-dashboard.zip -d dashboard-repo-tmp
mv dashboard-repo-tmp/homepi-dashboard dashboard-repo
rm -rf dashboard-repo-tmp
cd dashboard-repo

git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TVOJE-IME/homepi-dashboard.git
git push -u origin main
```

Kad zatraži username/password: username je tvoje GitHub korisničko ime,
a za password **zalepi Personal Access Token** iz koraka 2 (ne svoju
pravu GitHub lozinku). Da ne mora svaki put da pita, sačuvaj ga:

```bash
git config --global credential.helper store
```

(posle prvog push-a, token se čuva lokalno i više se ne pita)

### 4. Učini skripte izvršnim

```bash
chmod +x scripts/update.sh scripts/apply-package.sh
```

### 5. Prvi deploy

```bash
./scripts/update.sh
```

Ovo bi trebalo da prođe bez greške (tvoj pravi `config.js` već postoji
u `~/dashboard/html/` od ranije, i `update.sh` ga neće dirati).

## Kako ide svako sledeće ažuriranje

Kad ti Claude pošalje novi zip (npr. `dashboard-v7.zip`), samo:

```bash
~/dashboard-repo/scripts/apply-package.sh ~/Downloads/dashboard-v7.zip
```

Ova jedna komanda: snimi novu verziju u git, pošalje je na GitHub (tako
imaš istoriju svih verzija), i odmah je deploy-uje — bez `scp`-a, bez
pamćenja koji fajl ide gde.

Ako ikad samo želiš da ponovo deploy-uješ ono što već stoji u repo-u
(npr. posle reinstalacije Pi-ja), koristi:

```bash
~/dashboard-repo/scripts/update.sh
```

## Vraćanje na stariju verziju (rollback)

Pošto je sve u git-u, možeš da se vratiš na bilo koju prethodnu verziju:

```bash
cd ~/dashboard-repo
git log --oneline          # vidi listu verzija
git checkout <commit-hash> -- dashboard/
./scripts/update.sh
```
