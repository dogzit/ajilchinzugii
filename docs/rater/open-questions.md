# Open questions

Each was resolved for now in the direction that protects the worker ("doubt
is never green") and the build continued. Owner: **Lawyer**, **Eba** or
**CTO**.

## Lawyer

1. **Official hourly minimum wage.** The engine divides the monthly minimum
   by 168 hours (792,000 → ≈ 4,714 ₮/h until 2026-12-31; 1,000,000 → ≈ 5,952
   ₮/h from 2027-01-01). Confirm the official hourly rate and basis.
2. **Every rule and every `explain_mn` text** is a draft (`lawyer_verified:
   false`). Articles come from the unofficial English translation; check each
   against the official Mongolian text.
3. **In-kind-only pay** (a herding helper paid in food and lodging) is rated
   as unpaid in money: Q01 red (P1) and G04 red. Confirm whether in-kind-only
   pay is "unpaid" under 107.4 or only "below minimum wage".
4. **Assistant herders' rest (G09, 71.6).** The spec says "more than one
   24-hour rest day a week". Read as two rest days (not necessarily
   consecutive). Confirm.
5. **G11 fixed term "only for allowed cases".** The allowed cases (50.1) are
   not encoded. The engine checks the 2-year limit only and every fixed-term
   result tells the reader to check whether a fixed term is allowed for the
   job. Provide the list if it should be checked in code.
6. **G13 article.** The spec says "lawyer assigns".
7. **Q02 can't quit / Q03 injured** are added as red P1 rules (see ADR §10).
   Assign articles and approve the wording.
8. **G08 "unless days off are given"** cannot be verified from a contract;
   the engine ignores the exception. Confirm that is acceptable.
9. **M02 in the questionnaire.** Without a document the engine cannot see
   whether the date of birth is stated or an ID copy attached, so a 15–17
   year old's M02 is at best yellow from the questionnaire. Confirm.
10. **Consent and storage texts, privacy notice, guardian consent wording**:
    review against Mongolia's personal data protection law.
11. **Clerk stores account data outside Mongolia** (US/EU). Check against the
    personal data protection law before production.
12. **G09 lunch break on short shifts.** The spec's "lunch 1 h min" is
    applied to every stated break, so a 4-hour shift with a 15-minute break
    is red. Confirm whether the minimum applies to short or part-time shifts.
13. **CV rules** (`cv-rules.yaml`, `staff_verified: false`): staff review,
    and lawyer review of the over-sharing rule for minors.
14. **Overtime and night rates written as percentages.** Code reads a rate
    up to 3 as a multiplier (1.5), 100 or more as a total percentage (150%),
    and anything between as an extra on top (50% нэмэгдэл → 1.5). So
    "100% нэмэгдэл" (double pay) reads as 1.0 and fails — a false red, never
    a false green. Confirm, or add a unit to the extraction.
15. **M10 when the AI finds no non-compete clause** in a document: green,
    labelled "checked by AI", as for G13. A clause the model names but cannot
    quote is yellow. Confirm the AI-checked green is acceptable for a red rule.
16. **Monthly pay against the minimum** is pro-rated by weekly hours over 40,
    so exactly the monthly minimum at 40 hours passes; hourly figures use
    the 168-hour basis. Confirm both.
17. **Names are not redacted** before the model (rule 4 says "redacted
    before the LLM"; the spec lists register numbers, phones, emails and
    accounts). Decide whether names must go too.
18. **A minor's file without guardian consent** is not stored; the case
    still opens. Confirm, or hold the file until a caseworker confirms
    consent on the call.

## Eba

1. **Order A/122** (jobs prohibited to minors), in full — spec data item 2.
   Until then every job category is `[ХҮЛЭЭГДЭЖ БУЙ / TBD]` and M08 is
   yellow for every minor.
2. **Light-work list for ages 13–15** (Art. 142.4) — spec data item 3. Until
   then M01 for ages 13–14 is yellow unless the guardian did not consent.
3. **The job-category pick list** used by the questionnaire and the CV
   rater: confirm the categories and their Mongolian names.
4. **Caseworker on-duty rota** and who receives P1 alerts.
5. **Self-help kit wording** for P3 cases over capacity.

## CTO

1. **OCR engine** after the benchmark (spec data item 6).
2. **Rate limits** are per isolate on Workers; move to the Rate Limiting
   binding if abuse appears.
3. **Key rotation** for `CASE_FILES_KEY` (re-encryption script not built).
4. **LLM provider terms**: zero data retention and no training, in writing.
