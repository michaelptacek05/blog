# blog

Osobní blog: Next.js (App Router) + Postgres + Drizzle, markdown v databázi,
obrázky na disku, deploy přes Docker Compose za Nginx Proxy Managerem.

## Lokální vývoj

```bash
cp .env.example .env
```

Vyplň `.env` (příkazy na vygenerování hodnot jsou v komentářích uvnitř souboru),
pak:

```bash
docker compose up --build
```

Aplikace běží na <http://localhost:3000>. Databáze není publikovaná na hostu —
běží jen na interní síti compose stacku.

Užitečné:

```bash
docker compose logs -f web
docker compose exec web sh
docker compose down          # zastaví, data zůstanou ve volumes
docker compose down -v       # smaže i data
```

## Databáze

Drizzle CLI se pouští uvnitř kontejneru, aby měl `DATABASE_URL` z compose:

```bash
docker compose exec web npm run db:generate   # nové migrace do ./drizzle (commituje se)
docker compose exec web npm run db:migrate    # aplikuje migrace
docker compose exec web npm run db:seed       # ukázkový post (idempotentní)
```

`db:push` je jen na lokální experimenty se schématem — do produkce nikdy,
tam běží výhradně `generate` + `migrate`.

## Admin heslo

```bash
docker compose exec web npm run hash-password
```

Skript se zeptá na heslo (čte ze stdin, takže nekončí v historii shellu) a
vypíše řádek `ADMIN_PASSWORD_HASH=...` pro `.env`. Hash je **base64** — raw
argon2 řetězec by cestu do aplikace nepřežil: Docker Compose interpoluje `$VAR`
uvnitř `env_file` a Next si navíc načte `.env` z bind mountu a přepíše jím
prostředí procesu. Po změně `.env`:

```bash
docker compose up -d --force-recreate web
```

Rate limit na přihlášení je in-memory (5 pokusů / 15 min na IP) — restart
kontejneru ho vynuluje.

## Veřejná část

Anglicky, layout podle Weblog šablony. Design tokeny a dark mode jsou převzaté
z michaelptacek.com — stejné barvy (`#ffffff`/`#171717`, `#191b25`/`#ededed`),
`next-themes` s `.dark` třídou a přepínač na klávesu `T`.

Logo (`public/mplogo.svg`) se vykresluje jako CSS maska obarvená
`currentColor` — soubor má ~36 KB path dat, takže inline v HTML každé stránky
by se nikdy nekešoval, a maska navíc řeší dark mode bez druhé varianty.
Komponenta je [src/components/logo.tsx](src/components/logo.tsx).

Typografie je rozdělená na dva fonty:

- **Geist Mono** (`--font-mono`, stejný jako na michaelptacek.com) nese celé
  veřejné rozhraní — homepage, výpisy, navigaci, hlavičku postu i patičku.
  Nastavuje se jednou na shellu v `(public)/layout.tsx`.
- **Helvetica Neue** (`--font-sans`) nese tělo článku (`.prose`), které se
  takhle čte líp. Je to systémový font na Apple zařízeních, jinde padá na
  Helvetica → Arial, takže se nic nestahuje. Kód uvnitř článku se přes
  `.prose :is(pre, code)` vrací zpět k mono.

- `/` — hero + posty seskupené po letech (titulek | kategorie | šipka)
- `/blog/<slug>` — detail s datem, perexem, badge kategorie a cover obrázkem;
  koncept i neznámý slug vrací 404
- `/categories` — přehled s počty, `/categories/<slug>` — filtr
- `/rss.xml` — feed bez plných textů, s `<category>`

Kategorie se spravují v adminu na `/admin/categories` — přidat, přejmenovat,
změnit ikonu, smazat. Žijí v tabulce `categories`, post na ni ukazuje přes
`posts.category_id`.

- **Smazání kategorie posty nemaže.** Cizí klíč je `ON DELETE SET NULL`, takže
  posty zůstanou publikované, jen bez kategorie. Potvrzovací dialog to říká.
- **Přejmenování mění slug, a tím i veřejnou URL** `/categories/<slug>`. Staré
  odkazy na kategorii přestanou fungovat (posty se nedotknou).
- Ikony nemůžou být v databázi, takže řádek drží jen klíč do sady v
  [src/lib/category-icons.ts](src/lib/category-icons.ts). Nová ikona = nový
  `case` v [src/components/category-icon.tsx](src/components/category-icon.tsx).

Stránky čtou z databáze při každém requestu (`dynamic = 'force-dynamic'`),
protože produkční build v Dockeru běží bez databáze. Server actions volají
`revalidatePath()`, takže přechod na ISR je otázkou jednoho řádku.

Zvýrazňování kódu běží výhradně na serveru — v klientském bundlu není žádný
highlighter, jen CSS proměnné `--shiki-light` / `--shiki-dark`.

## Média

Obrázek se do postu dostane přetažením do textarey (nebo přes „Nahrát
obrázek"). Upload projde `sharp`: rotace podle EXIF, zmenšení na max 1600 px
šířky, převod na WebP q80, zahození všech metadat. Soubor se uloží do
`UPLOAD_DIR` pod náhodným UUID, řádek jde do tabulky `media` a do textu se na
pozici kurzoru vloží `![alt](/media/<id>)`.

Limity: 15 MB v aplikaci, 20 MB v `serverActions.bodySizeLimit`, 20 MB
v `client_max_body_size` na NPM (fáze 7). Aplikační limit je nejnižší schválně
— soubor přes něj dostane srozumitelnou hlášku místo holého 413 z proxy.

Titulní obrázek postu (`posts.cover_media_id`) se vybírá v editoru a zobrazuje
se na detailu v poměru 16:9.

## Zobrazení

Soukromé počítadlo zobrazení je vidět jen v adminu, na detailu postu
(celkem / 30 dní / 7 dní / dnes). Veřejně se nikde neukazuje.

- Počítá se v prohlížeči: `<ViewBeacon>` po vykreslení článku pošle
  `POST /api/views`. Crawlery bez JavaScriptu se tak nepočítají, známé boty a
  headless prohlížeče odfiltruje user-agent a `navigator.webdriver`.
- Endpoint vrací vždycky prázdné `204` — nikdy neprozradí počet ani to, jestli
  se zobrazení započítalo.
- **Bez cookies a bez osobních údajů v databázi.** Tabulka `post_views` drží
  jen `(post_id, day, views)`, den podle `Europe/Prague`. Deduplikace (stejný
  návštěvník = hash IP + user-agent, nejvýš jednou za 30 minut na post) běží
  in-memory jako rate limit loginu, takže ji restart kontejneru vynuluje.
- Přihlášený admin se nepočítá.

## Nasazení (Portainer + Nginx Proxy Manager)

### 1. Build a push image

Image se staví lokálně a posílá do GHCR — Portainer ho pak jen stahuje.
`--platform linux/amd64` je povinné: VPS je amd64, Mac arm64, a bez toho by
kontejner na serveru nenaběhl.

```bash
npm run docker:build
```

```bash
npm run docker:push
```

Push vyžaduje přihlášení do GitHub Container Registry (stačí jednou):

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u michaelptacek05 --password-stdin
```

Token je *classic* personal access token s právem `write:packages`.

### 2. Secrets pro Portainer

Vygeneruj si je před založením stacku:

```bash
openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32; echo
```

```bash
openssl rand -base64 48
```

Hash admin hesla vznikne až po prvním startu kontejneru:

```bash
docker exec -it blog npm run hash-password
```

Do prvního nasazení tam dej cokoliv (třeba `x`) — login prostě nepůjde, dokud
hash nedoplníš. Skript vypíše base64, které vložíš do proměnné a stack
přenasadíš.

### 3. Stack v Portaineru

Stacks → **Add stack** → *Web editor* → vlož obsah `docker-compose.prod.yml`.
Image je privátní, takže v **Registries** musí být GHCR s tvým tokenem
(`read:packages` stačí), jinak pull skončí na `denied`.

V sekci **Environment variables** přidej čtyři proměnné:

| Proměnná | Hodnota |
| --- | --- |
| `POSTGRES_PASSWORD` | vygenerované heslo; `DATABASE_URL` se z něj složí samo |
| `SESSION_SECRET` | vygenerovaný klíč |
| `ADMIN_PASSWORD_HASH` | base64 výstup z `hash-password` |
| `SITE_URL` | `https://tvoje-domena` bez lomítka na konci |

`UPLOAD_DIR` a `NODE_ENV` nastavovat nemusíš — jsou v compose a v Dockerfile.

Deploy. Migrace se pustí samy při startu (`docker-entrypoint.sh` →
`scripts/migrate.mjs`), takže databáze se založí bez zásahu.

### 4. Proxy host v NPM

| Pole | Hodnota |
| --- | --- |
| Domain Names | tvoje doména |
| Scheme | `http` |
| Forward Hostname | `blog` (= `container_name` z compose) |
| Forward Port | `3000` |
| Block Common Exploits | zapnuto |
| Websockets Support | zapnuto |

Záložka **SSL**: Request a new SSL Certificate → Force SSL, HTTP/2, HSTS.

Záložka **Advanced** — bez tohohle skončí každý větší upload na 413:

```
client_max_body_size 20m;
```

Session cookie se nastavuje se `Secure` podle `NODE_ENV`, ne podle protokolu
requestu. NPM terminuje TLS a dovnitř posílá plain HTTP, takže detekce
z requestu by cookie chybně označila za nezabezpečenou.

### 5. Aktualizace

```bash
npm run docker:build && npm run docker:push
```

Pak v Portaineru u stacku **Update** se zaškrtnutým *Re-pull image*. Data
přežijí — jsou ve volumes `blog_pgdata` a `blog_uploads`, ne v kontejneru.

## Zálohy

```bash
STACK=blog BACKUP_DIR=/srv/backups/blog ./scripts/backup.sh
```

Skript hledá kontejner `<STACK>-db` a volume `<STACK>_uploads`; když si stack
pojmenuješ jinak, přebij to přes `DB_CONTAINER` a `UPLOADS_VOLUME`.

Vytvoří `db-<timestamp>.sql.gz` (pg_dump) a `uploads-<timestamp>.tar.gz`
(archiv volume) a smaže zálohy starší než 7 dní (`KEEP_DAYS`). Cron:

```
0 3 * * * cd /srv/blog && STACK=blog BACKUP_DIR=/srv/backups/blog ./scripts/backup.sh >> /var/log/blog-backup.log 2>&1
```

Obnova (ověřeno smazáním a obnovením kompletních dat):

```bash
gzip -dc backups/db-20260101-030000.sql.gz | docker exec -i blog-db psql -U blog -d blog
```

```bash
docker run --rm -v blog_uploads:/uploads -v "$PWD/backups:/backup:ro" alpine:3 tar xzf /backup/uploads-20260101-030000.tar.gz -C /uploads
```

Dump obsahuje i schema `drizzle` s journalem migrací, takže po obnově se
migrace nepouštějí znovu.

## Známé zádrhely

`next build` nespouštěj uvnitř běžícího dev kontejneru — sdílí `.next` volume
s dev serverem a build na tom padne. Stavěj na hostu (`npx next build`) nebo
produkčním Dockerfilem.

## Stav

- [x] Fáze 1 — scaffold, TypeScript, Tailwind, dev compose
- [x] Fáze 2 — Drizzle schema, migrace, seed
- [x] Fáze 3 — auth (login, session, `requireAdmin()`, rate limit)
- [x] Fáze 4 — admin CRUD
- [x] Fáze 5 — veřejné stránky, typografie, RSS
- [x] Fáze 6 — média (upload, sharp, servírovací route, drag & drop)
- [x] Fáze 7 — produkční Dockerfile, Portainer, NPM, zálohy
