# Байршуулах шалгах хуудас / Deploy checklist

Энэ бол **таны** гүйцэтгэх алхмууд. Програмист ямар ч данс руу нэвтрээгүй,
юу ч байршуулаагүй — бүхнийг бэлдээд, яг дараалал нь энд бичив.

Every step below is yours to run: nothing was deployed and no account was
touched on your behalf.

---

## Одоогийн байдал / Where this stands (2026-10-25)

Сайт **амьд болсон**: <https://ajilchinzugii.vercel.app>

| Хийгдсэн                                                             | Тайлбар                                |
| -------------------------------------------------------------------- | -------------------------------------- |
| Vercel төсөл `kenomus-projects/ajilchinzugii`, GitHub-тай холбогдсон | `main` руу push хийх бүрт шинэчлэгдэнэ |
| Орчны хувьсагчид (Production + Preview)                              | Neon, R2, Payload, canonical host      |
| `REVALIDATE_SECRET`, `CRON_SECRET`                                   | шинээр үүсгэв, `.env.local`-д бас бий  |
| Өгөгдлийн сан                                                        | migration орсон, админ данс ажиллана   |
| HTTPS, HSTS, CSP, sitemap, canonical, OG зураг                       | шалгагдсан                             |

**Дутуу үлдсэн** (бүгд танай данс дээрх алхмууд, доорх хэсгүүдэд дэлгэрэнгүй):

- Домэйн авч холбох → `NEXT_PUBLIC_SITE_URL`, `SITE_CANONICAL_HOST` солих (5-р хэсэг)
- `NEXT_PUBLIC_CONTACT_EMAIL` одоогоор `info@example.org` — жинхэнэ хаягаар солих
- Google Sheet-ийг service account-тай хуваалцах → жинхэнэ тоо урсана
- Search Console, Plausible
- Нөөцлөлтийн GitHub secrets
- SMTP холбох → «Forgot password» ажиллана (`SMTP_*`, `.env.example`-ийн 8-р хэсэг)
- Нээхийн өмнө `pnpm seed:demo:clear`

> `R2_PUBLIC_URL` хоосон байна. Зураг Payload-ийн `/api/media/file/...` замаар
> гарч байгаа тул **ажиллаж байна**; R2-гийн нийтийн хаягийг асаавал зураг
> шууд CDN-ээс үйлчлэгдэж, бага зэрэг хурдасна.

---

## 0. Урьдчилсан нөхцөл / Before you start

- [ ] GitHub репо танд байгаа: `github.com/dogzit/ajilchinzugii`
- [ ] Neon дээр project үүссэн, холболтын хоёр мөрийг нь мэдэж байна
- [ ] Cloudflare R2 дээр **хоёр** bucket: нэг нь зураг, нэг нь нөөц
- [ ] Домэйн худалдаж авсан, DNS-ийг нь удирдах эрхтэй

---

## 1. Vercel төсөл үүсгэх

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   `dogzit/ajilchinzugii`
2. Framework: **Next.js** (өөрөө танина)
3. Build command / Output: **өөрчлөхгүй**
4. **Deploy дарахаас ӨМНӨ** доорх орчны хувьсагчдыг оруул — `NEXT_PUBLIC_*`
   утгууд build хийх үед кодод шигтгэгддэг тул дараа нэмэхэд хүрэлцэхгүй.

---

## 2. Орчны хувьсагчид (Vercel → Settings → Environment Variables)

Production, Preview хоёуланд нь тавь. Утга бүрийн тайлбар: `.env.example`.

| Хувьсагч                                                      | Утга                                   |
| ------------------------------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                        | `https://<домэйн>` (зураасгүй төгсөнө) |
| `NEXT_PUBLIC_CONTACT_EMAIL`                                   | байгууллагын и-мэйл                    |
| `SITE_CANONICAL_HOST`                                         | `<домэйн>` эсвэл `www.<домэйн>`        |
| `PAYLOAD_SECRET`                                              | `openssl rand -hex 32`                 |
| `DATABASE_URL`                                                | Neon **pooled** (`-pooler`)            |
| `DATABASE_URL_UNPOOLED`                                       | Neon **direct**                        |
| `R2_ACCOUNT_ID`, `R2_ENDPOINT`                                | Cloudflare R2                          |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                    | R2 API token                           |
| `R2_BUCKET`                                                   | зургийн bucket                         |
| `R2_PUBLIC_URL`                                               | bucket-ийн нийтийн хаяг (байвал)       |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `IMPACT_SHEET_ID` | Google Sheets                          |
| `REVALIDATE_SECRET`                                           | `openssl rand -hex 24`                 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`        | нууц үг сэргээх захидал илгээх         |
| `CRON_SECRET`                                                 | `openssl rand -hex 24`                 |
| `NEXT_PUBLIC_GSC_VERIFICATION`                                | Search Console-оос (3-р алхмын дараа)  |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`                                | `<домэйн>`                             |

> `NEXT_PUBLIC_SITE_URL` дутвал build **зориуд унана** — тохируулаагүй бол
> сайт localhost хаягийг canonical болгон нийтлэх байсан.

**Deploy** дар.

---

## 3. Өгөгдлийн сангийн migration

Vercel нь migration-ыг автоматаар ажиллуулдаггүй. Нэг удаа, өөрийн
компьютерээс:

```bash
git clone https://github.com/dogzit/ajilchinzugii && cd ajilchinzugii
pnpm install
cp .env.example .env.local      # production утгуудаа бөглө
pnpm migrate                    # direct URL-ээр ажиллана
pnpm migrate:status             # бүгд "Yes" байх ёстой
```

Дараа нь эхний админ дансаа `https://<домэйн>/admin` дээр үүсгэ (систем өөрөө
«Create first user» хуудас гаргана).

Сонголт: жишээ агуулга суулгах — `pnpm seed` (зөвхөн `[ХҮЛЭЭГДЭЖ БУЙ / TBD]`
орлуулагч бичнэ, хуурамч нэр, тоо үүсгэхгүй).

---

## 4. Домэйн холбох

1. Vercel → Settings → **Domains** → `<домэйн>` нэм
2. Vercel-ийн заасан DNS бичлэгийг домэйн бүртгэгч дээрээ оруул
   (ихэвчлэн `A 76.76.21.21` эсвэл `CNAME cname.vercel-dns.com`)
3. `www.<домэйн>` -г бас нэм — `SITE_CANONICAL_HOST` нь аль нь үндсэн болохыг
   шийднэ, нөгөө нь 301-ээр шилжинэ
4. 10–60 минут хүлээ

**Шалгах:**

```bash
curl -I https://<домэйн>            # 200, HTTPS
curl -I http://<домэйн>             # 301 → https
curl -I https://www.<домэйн>        # 301 → каноник хост
curl -sI https://<домэйн> | grep -i strict-transport   # HSTS байх ёстой
```

---

## 5. Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
   → **Add property** → **URL prefix** → `https://<домэйн>`
2. Баталгаажуулалт: **HTML tag** аргыг сонго, `content="..."` доторх утгыг
   хуул
3. Vercel → `NEXT_PUBLIC_GSC_VERIFICATION` = тэр утга → **Redeploy**
4. Search Console дээр **Verify** дар
5. **Sitemaps** → `sitemap.xml` илгээ

---

## 6. Plausible

1. [plausible.io](https://plausible.io) → **Add website** → `<домэйн>`
2. Vercel → `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` = `<домэйн>` → **Redeploy**
3. Сайтаа нээгээд Plausible дээр зочлолт харагдаж байгааг шалга

> Cookie тавьдаггүй тул зөвшөөрлийн самбар хэрэггүй. PDF татах, гадагш гарах
> холбоос дарах нь автоматаар event болж бүртгэгдэнэ.

---

## 7. Шөнийн нөөцлөлт асаах

GitHub → репо → Settings → **Secrets and variables** → **Actions** → New
repository secret:

| Secret                                                 | Утга                       |
| ------------------------------------------------------ | -------------------------- |
| `DATABASE_URL_UNPOOLED`                                | Neon direct мөр            |
| `R2_ACCOUNT_ID`                                        | Cloudflare account id      |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`             | R2 API token               |
| `R2_BUCKET`                                            | зургийн bucket             |
| `R2_BACKUP_BUCKET`                                     | **нөөцийн тусдаа** bucket  |
| `BACKUP_ALERT_EMAIL`                                   | алдааны мэдэгдэл очих хаяг |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | мэдэгдэл илгээх шуудан     |

Дараа нь **Actions → Nightly backup → Run workflow** дарж гар аргаар нэг удаа
ажиллуулж шалга. Амжилттай бол:

```bash
aws s3 ls "s3://<нөөцийн-bucket>/db/daily/" --endpoint-url https://<account>.r2.cloudflarestorage.com
```

---

## 8. Эцсийн шалгалт

- [ ] `https://<домэйн>` нээгдэж, HTTPS ногоон
- [ ] `https://<домэйн>/en` англи хувилбар руу очно
- [ ] Хэл сэлгэхэд **ижил хуудсан дээр** үлдэнэ
- [ ] `/admin` дээр нэвтэрч, нэг текст засаад хадгалсан
- [ ] Засвар сайт дээр харагдсан
- [ ] `/sitemap.xml`, `/robots.txt` нээгдэнэ
- [ ] Search Console баталгаажиж, sitemap «Success»
- [ ] Plausible дээр зочлолт бүртгэгдсэн
- [ ] Эхний шөнийн нөөц R2 дээр орсон
- [ ] Google Rich Results Test дээр алдаагүй:
      [search.google.com/test/rich-results](https://search.google.com/test/rich-results)

---

## 9. Дараа нь

- Google Sheet-ээ service account-тай хуваалцаж, тоо урсаж эхлэхийг шалга
- `docs/HANDOVER.md`-ийг агуулга оруулах хүнд уншуул
- `docs/audit.md` дотор **нээлттэй үлдсэн** нэг асуудал бий: client JS 177 KB
  (зорилт 100 KB). Шийдвэр гаргах хэрэгтэй — тэнд гурван хувилбар бичсэн.
