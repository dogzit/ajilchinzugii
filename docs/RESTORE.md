# Сэргээх заавар / Restore runbook

Өгөгдлийн сан ба зургийг нөөцөөс сэргээх алхмууд. **Энэ журмыг бодитоор
туршсан** — доорх «Туршилтын бүртгэл» хэсгийг үз.

Steps to restore the database and the media from backup. This procedure was
actually run, not just written; see the test log at the end.

---

## 0. Юу хаана байдаг вэ / What is where

| Юу                            | Хаана                                                |
| ----------------------------- | ---------------------------------------------------- |
| Өгөгдлийн сан (өдөр тутам)    | `s3://$R2_BACKUP_BUCKET/db/daily/YYYY-MM-DD.dump.gz` |
| Өгөгдлийн сан (сар бүр)       | `s3://$R2_BACKUP_BUCKET/db/monthly/YYYY-MM.dump.gz`  |
| Зураг, файл (долоо хоног бүр) | `s3://$R2_BACKUP_BUCKET/media/...`                   |
| Ажиллаж буй зургийн bucket    | `s3://$R2_BUCKET/...`                                |

Хадгалах хугацаа: **30 өдрийн өдөр тутмын**, **12 сарын сар тутмын**.
Нөөц нь **тусдаа bucket**-д байна — үндсэн bucket устсан ч нөөц үлдэнэ.

Нөөцлөлт: `.github/workflows/backup.yml`, UTC 19:00 (Улаанбаатарын 03:00).

---

## 1. Бэлтгэл / Prerequisites

```bash
# Postgres 18-ийн клиент (Neon 18 дээр ажилладаг — 17 нь татгалзана)
brew install postgresql@18      # macOS
# эсвэл Docker-оор, юу ч суулгахгүйгээр:
#   docker run --rm -v "$PWD:/out" postgres:18-alpine pg_dump ...

# R2 рүү хандах
brew install awscli
export AWS_ACCESS_KEY_ID=...        # R2_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=...    # R2_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=auto
export R2_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

---

## 2. Нөөцөө олох / Find the backup

```bash
aws s3 ls "s3://$R2_BACKUP_BUCKET/db/daily/" --endpoint-url "$R2_ENDPOINT" | tail -5
aws s3 cp "s3://$R2_BACKUP_BUCKET/db/daily/2026-10-25.dump.gz" . \
  --endpoint-url "$R2_ENDPOINT"
gunzip -k 2026-10-25.dump.gz        # → 2026-10-25.dump
```

---

## 3. Эхлээд ХУУЛБАР дээр сэргээ / Restore to a copy first

> **Шууд ажиллаж буй сан руу бүү сэргээ.** Эхлээд Neon дээр branch үүсгэ
> (Neon console → Branches → New branch). Branch нь тусдаа холболтын мөртэй,
> үндсэн санд огт хүрэхгүй.

```bash
# Branch-ийн DIRECT холболтын мөр (-pooler-гүй)
export TARGET="postgresql://USER:PASS@HOST.REGION.aws.neon.tech/neondb?sslmode=verify-full&sslrootcert=system"

pg_restore --no-owner --no-privileges --clean --if-exists \
  --dbname="$TARGET" 2026-10-25.dump
```

Шалга / verify:

```bash
psql "$TARGET" -c "select count(*) from information_schema.tables where table_schema='public';"
psql "$TARGET" -c "select count(*) from users;"
psql "$TARGET" -c "select left(title,40) from methodology_sources_locales where _locale='mn' limit 3;"
```

Монгол текст зөв харагдаж байвал сэргээлт бүтэн.

---

## 4. Сайтыг түр branch руу чиглүүлэх / Point the site at the branch

Vercel → Settings → Environment Variables:

- `DATABASE_URL` → branch-ийн **pooled** мөр
- `DATABASE_URL_UNPOOLED` → branch-ийн **direct** мөр

Дараа нь **Redeploy**. Сайт зөв ажиллаж байгааг нүдээр шалга (нүүр, нөлөөлөл,
`/admin` дээр нэвтрэх).

Бүх зүйл сайн бол branch-ийг үндсэн болгож болно (Neon → Branches → Promote),
эсвэл үндсэн сан руугаа 3-р алхмыг давтаж сэргээнэ.

---

## 5. Зураг, файл сэргээх / Restore the media

```bash
# Нөөцөөс ажиллаж буй bucket руу
aws s3 sync "s3://$R2_BACKUP_BUCKET/media/" "s3://$R2_BUCKET/" \
  --endpoint-url "$R2_ENDPOINT"
```

Нэг л файл сэргээх бол:

```bash
aws s3 cp "s3://$R2_BACKUP_BUCKET/media/9f2a71c4.webp" "s3://$R2_BUCKET/9f2a71c4.webp" \
  --endpoint-url "$R2_ENDPOINT"
```

> Зургийн нэр өгөгдлийн санд бичигдсэн байдаг. Хоёуланг нь **ойролцоо цагийн**
> нөөцөөс сэргээ, эс бөгөөс өгөгдлийн сан байхгүй файл руу заана.

---

## 6. Сэргээсний дараа / After a restore

```bash
pnpm migrate:status          # migration бүгд орсон эсэх
curl -X POST https://<домэйн>/api/revalidate -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

`/admin` дээр нэвтэрч нэг хуудас хараад баталгаажуул.

---

## 7. Нөөцлөлт ажиллаж байгаа эсэхийг шалгах / Check the backup is alive

Сард нэг удаа:

```bash
aws s3 ls "s3://$R2_BACKUP_BUCKET/db/daily/" --endpoint-url "$R2_ENDPOINT" | tail -3
```

Сүүлийн файл өчигдрийнх байх ёстой. Үгүй бол GitHub → Actions → «Nightly
backup» дээрээс алдааг хар. Алдаа гарвал GitHub өөрөө репо эзэмшигч рүү
и-мэйл илгээнэ, мөн `BACKUP_ALERT_EMAIL` хаяг руу мэдэгдэнэ.

---

## Туршилтын бүртгэл / Test log

**2026-10-25.** Журмыг бодит өгөгдөл дээр гүйцэтгэв:

```
pg_dump (postgres:18-alpine) → db.dump.gz        24.5 KB
docker run postgres:18-alpine (цэвэр сан)
pg_restore --no-owner --no-privileges            алдаагүй
```

Сэргээсний дараа:

| Шалгасан              | Үр дүн                                                   |
| --------------------- | -------------------------------------------------------- |
| Хүснэгтийн тоо        | **53**                                                   |
| `users`               | 1                                                        |
| `methodology_sources` | 3                                                        |
| `policy_history`      | 1                                                        |
| `payload_migrations`  | 1                                                        |
| Монгол текст          | «Хүүхдийн хөдөлмөрийн судалгаа 2021–2022 (ҮСХ…)» — бүтэн |

**Туршилтаас гарсан хоёр олдвор** (хоёулаа workflow-д зассан):

1. Neon нь **Postgres 18.6** ажиллуулдаг. `pg_dump` 17 нь _«aborting because of
   server version mismatch»_ гэж зогсоно — клиент 18 байх ёстой.
2. Холболтын мөр `sslmode=verify-full` тул `sslrootcert=system` нэмэхгүй бол
   _«root certificate file does not exist»_ гэж унана.

Эдгээрийг урьдчилж тулгаагүй бол шөнийн нөөцлөлт чимээгүйхэн ажиллахгүй
байх байсан.
