# Synthetic contracts

Every contract here is invented for testing: no real person, employer,
register number, phone number or document. Names are placeholders
("Жишээ" means "example"), register numbers are `ЖШ 00000000`-style and
phone numbers are `9900 00xx`.

| File | Format it stands for | Sector | Lawful? |
| --- | --- | --- | --- |
| `01-cafe-printed.txt` | printed | café | yes (minor, 16) |
| `02-retail-printed.txt` | printed | retail | no |
| `03-delivery-chat.txt` | chat screenshot (OCR text) | delivery | no |
| `04-construction-handwritten.txt` | handwriting (OCR text, with OCR errors) | construction helper | no (minor) |
| `05-herding-latin.txt` | typed in Latin-script Mongolian | herding helper | no (paid in kind) |
| `06-tutoring.pdf` (from `06-tutoring.txt`) | PDF | tutoring | yes |
| `07-summer-job.docx` (from `07-summer-job.txt`) | Word | summer job | no |
| `08-internship.pdf` (from `08-internship.txt`) | PDF | internship | no |
| `09-service-contract.docx` (from `09-service-contract.txt`) | Word | service contract that is a job | no |
| `10-phone-photo.txt` | phone photo (OCR text) | café, night shift | no (minor) |

`answer-key.json` holds the correct value, as written, of the fields the
spec's accuracy target is measured on: date of birth, pay amount and unit,
hours, and start and end times. `recorded/` holds the extractor's responses
that CI replays (`pnpm eval:extraction`). **The recordings were made with the
deterministic mock extractor, not with a model** — no API key was available
when they were made. Re-record with a key (`pnpm eval:extraction --live
--record`) and replace these with real anonymised contracts and a
lawyer-made answer key before trusting the number (spec, data items 6–7).

The PDF and DOCX files are generated from their `.txt` source by
`node scripts/make-contract-fixtures.ts`.
