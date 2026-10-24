# Нөлөөллийн тоон хүснэгт / Impact spreadsheet

**MN —** Сайт дээр гарч буй бүх тоо зөвхөн энэ хүснэгтээс ирнэ. Кодонд, CMS-д,
орчуулгын файлд тоо бичих боломжгүй. Хүснэгтийн бүтэц эндээс өөрчлөгдвөл сайт
тоог **огт татахгүй** (хуучин хадгалсан хувилбараа үзүүлнэ), тиймээс баганын
нэр, дарааллыг бүү өөрчил.

**EN —** Every figure on the site comes from this spreadsheet and nowhere else.
If its structure changes, the site rejects the whole fetch and keeps serving the
last good snapshot, so do not rename or reorder the columns.

---

## Хоёр хүснэгт / Two spreadsheets

|                        | MN                                                                                                                            | EN                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **1. Хэргийн бүртгэл** | Байгууллагын хувийн хүснэгт. Хэрэг тус бүрийн мөр. **Сайттай хуваалцахгүй.**                                                  | The private case log, one row per case. Never shared with the site.                                     |
| **2. Нийтийн нийлбэр** | Эхнийхээс `IMPORTRANGE`/томьёогоор нийлбэрийг тооцно. Зөвхөн **үүнийг** сайтын үйлчилгээний хаягтай Viewer эрхээр хуваалцана. | Computes aggregates from the first. Only this one is shared with the site's service account, as Viewer. |

Сайт нь 2 дахь хүснэгтийн **зөвхөн хоёр таб**-ыг, зөвхөн доорх мужуудаар уншина:
`Totals!A:H`, `Monthly!A:D`. Scope нь `spreadsheets.readonly` — бичих эрх
байхгүй.

---

## Таб 1 — `Totals`

Нэг мөр = нэг гол үзүүлэлт. / One row per headline metric.

| Багана          | Жишээ / Example      | Тайлбар                                                                                     |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `metric_id`     | `cases-resolved`     | Хувиршгүй түлхүүр. Зөвхөн жижиг латин үсэг, тоо, `-`, `_`. Солихгүй — сайт үүгээр холбодог. |
| `label_mn`      | `Шийдвэрлэсэн хэрэг` | Монгол нэр                                                                                  |
| `label_en`      | `Cases resolved`     | Англи нэр                                                                                   |
| `value`         | `42`                 | Тоо. Хоосон бол тоо байхгүй гэсэн үг (0 гэж ойлгохгүй).                                     |
| `n_cases`       | `42`                 | Энэ тоо хэдэн хэрэг дээр тулгуурласан бэ                                                    |
| `as_of`         | `2026-09-30`         | `YYYY-MM-DD`. Хуудсан дээр тоо бүрийн хажууд харагдана.                                     |
| `method_anchor` | `counting-cases`     | Аргачлалын хуудсан дахь `anchorId`. `/mn/methodology#counting-cases` руу холбогдоно.        |
| `show_on_home`  | `TRUE`               | `TRUE` бол нүүр хуудсан дээр гарна                                                          |

**Жишээ мөр / Example row**

```
cases-resolved | Шийдвэрлэсэн хэрэг | Cases resolved | 42 | 42 | 2026-09-30 | counting-cases | TRUE
```

---

## Таб 2 — `Monthly`

Нэг мөр = нэг үзүүлэлтийн нэг сар. / One row per month per metric.

| Багана      | Жишээ / Example  | Тайлбар                          |
| ----------- | ---------------- | -------------------------------- |
| `month`     | `2026-09`        | `YYYY-MM`                        |
| `metric_id` | `cases-resolved` | `Totals`-д **заавал** байх ёстой |
| `value`     | `27`             | Тухайн сарын тоо                 |
| `n_cases`   | `27`             | Тухайн сарын хэргийн тоо         |

**Жишээ мөр / Example row**

```
2026-09 | cases-resolved | 27 | 27
```

---

## 5-аас цөөн бол нуух / Small-cell suppression

**MN —** `n_cases` нь **5-аас бага**, эсвэл **хоосон** бол сайт тоог харуулахгүй:
«5-аас цөөн / Fewer than 5» гэж бичнэ. Хэргийн тоог нь ч харуулахгүй (3 гэдгийг
харуулах нь өөрөө жижиг тоог задруулна).

**EN —** A figure whose `n_cases` is below 5, or blank, is never rendered as a
number; the label "5-аас цөөн / Fewer than 5" is shown instead, and the case
count itself is withheld.

Чухал зарчим:

1. **Нүд бүрийг тусад нь шалгана.** Жилийн нийлбэр харагдаж байхад нэг сар нь
   нуугдаж болно. / Every cell is judged on its own `n_cases`.
2. **Сайт нийлбэрийг өөрөө тооцдоггүй.** `Totals`-ын тоог хүснэгтээс яг байгаагаар
   нь авна. Хэрэв сайт сарууд нэмж нийлбэр гаргадаг байсан бол, уншигч
   харагдаж буй саруудыг нийлбэрээс хасаад нуусан сарыг олчихно. /
   The site never sums the months: the total comes from the sheet, so a
   suppressed month cannot be recovered by subtraction.

| `n_cases`      | Үр дүн / Result                                              |
| -------------- | ------------------------------------------------------------ |
| `42`           | Тоо харагдана / shown                                        |
| `5`            | Тоо харагдана (5 нь босго, түүнээс доош нь нуугдана) / shown |
| `4`            | Нуугдана / suppressed                                        |
| хоосон / blank | Нуугдана / suppressed                                        |

---

## Хүснэгт эвдэрвэл юу болох вэ / What happens when the sheet breaks

**MN —** Дараах тохиолдолд сайт **бүх татацыг хүчингүй болгож**, хамгийн сүүлийн
амжилттай хувилбараа («stale») үзүүлнэ:

- багана нэр солигдсон, эсвэл дараалал өөрчлөгдсөн
- `as_of` нь `YYYY-MM-DD` биш
- `value` эсвэл `n_cases` дотор текст байгаа (жишээ: «олон»)
- нэг `metric_id` хоёр удаа орсон
- `Monthly`-д `Totals`-д байхгүй `metric_id` байгаа

**EN —** Any of the above rejects the whole fetch; the site serves the last good
snapshot and marks it stale. Nothing partial is ever published.

Алдааны бүртгэлд **зөвхөн алдааны төрөл, цаг** бичигдэнэ — нүдний утга хэзээ ч
бичигдэхгүй. / The log records only the error type and a timestamp, never a cell.

---

## Хэзээ шинэчлэгддэг вэ / Refresh schedule

|                |                                                                                |
| -------------- | ------------------------------------------------------------------------------ |
| Автоматаар     | Өдөрт нэг удаа, **06:00 Улаанбаатарын цагаар** (22:00 UTC, `vercel.json` cron) |
| Кэшийн хугацаа | 86 400 секунд (24 цаг), tag: `impact`                                          |
| Шууд шинэчлэх  | `POST /api/revalidate` + `x-revalidate-secret` толгой                          |

```bash
curl -X POST https://<сайтын-хаяг>/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

---

## Тохиргоо / Setup

1. Google Cloud дээр service account үүсгэ, JSON түлхүүр ав.
2. **Нийтийн нийлбэр** хүснэгтээ тэр хаягтай **Viewer** эрхээр хуваалц
   (хэргийн бүртгэлээ **бүү** хуваалц).
3. Орчны хувьсагчдыг бөглө: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`,
   `IMPACT_SHEET_ID` (хүснэгтийн URL дэх `/d/<id>/` хэсэг).
4. `REVALIDATE_SECRET` болон Vercel дээр `CRON_SECRET` тавь.

Код: `src/lib/impact/` — `client.ts` (унших), `schema.ts` (шалгах),
`suppress.ts` (нуух), `index.ts` (`getImpact`).
