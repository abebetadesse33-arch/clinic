# NiniMed Habitat Medium Clinic — Business Plan

**Planning basis:** Habitat, Debre Birhan, Amhara Region, Ethiopia (medium-clinic model; exact address and licensing jurisdiction still require verification)  
**Model:** One privately operated, outpatient-focused medium clinic  
**Financial currency:** Ethiopian birr (ETB)  
**Status:** Feasibility plan for validation; not a government-approved design, license application, or vendor quotation

## 1. Executive summary

NiniMed is planning the Habitat facility as a **medium-size clinic**, not as a hospital. The app and this plan now use an outpatient-clinic model: primary and scheduled specialist consultations, chronic-disease follow-up, and selected family, preventive, nutrition, rehabilitation, and basic nursing services. The actual service list, exact premises, staffing, and room requirements must still be checked against the current Amhara licensing checklist and the specific site's approvals.

The recommended opening package is outpatient primary and scheduled specialist consultation, follow-up for common chronic conditions, preventive care, and basic nursing procedures, all within the scope confirmed by the licensing authority. Maternal/child outpatient care, nutrition, physiotherapy, immunization, point-of-care testing, an on-site laboratory, and a dispensary/pharmacy are staged services: offer each only after confirming the applicable license, staffing, premises, and equipment requirements. Refer imaging, complex diagnostics, delivery, surgery, inpatient care, and emergencies requiring hospital capability to appropriately licensed facilities.

Hospital-level services such as 24/7 emergency/trauma care, ICU and inpatient care, CT, a blood bank, and a central hospital pharmacy are excluded from this medium-clinic model. Adding them would materially change the facility category, premises, staffing, capital needs, and approvals.

### Investment view

- **Planning startup capital:** approximately **ETB 12.0–21.4 million**, including an initial working-capital reserve. This is an internal planning range, not an official fee schedule or supplier quote.
- **Illustrative mature-month target:** 55 patient encounters per open day, 26 days per month, plus associated diagnostics, dispensary sales if licensed, and procedures.
- **Illustrative monthly revenue at that volume:** approximately **ETB 1.82 million**.
- **Illustrative monthly operating break-even:** approximately **ETB 1.27 million in revenue**, equivalent to about **39 encounters per open day** under the assumed service mix.
- **Ramp-up:** the illustrative first year is loss-making; the model reaches positive operating earnings in year two as utilization improves. Funding for ramp-up is essential.

The investment should proceed only after the local health authority confirms the facility category, service scope, room schedule, staffing matrix, and the suitability of the actual premises in writing.

## 2. App scan and planning implications

The repository is for NiniMed, a Next.js clinic and clinical-operations platform. It includes appointment and patient flows, clinician workspaces, triage, clinical orders, billing/POS, pricing administration, clinic locations, and a finance interface. These features can support a clinic operating model but do not establish that the clinic, staff, service, payment integration, or license exists.

The Habitat location page, clinic administration labels, map marker, signup and booking labels, patient/provider clinic references, public landing page, service tiles, footer, FAQ, and patient-case consent copy have been adjusted from the former hospital/24-hour presentation to the medium-clinic outpatient model and away from unsupported US compliance assertions. The fallback location list now contains Habitat only. The public location API also replaces the known legacy Habitat hospital seed presentation with unconfirmed-medium-clinic details; database-managed locations still need an admin content review. The app's location schema records branch type but does not define an Ethiopian facility-level standard or automatically validate medium-clinic licenses.

The Habitat fallback in [locations/page.tsx](./src/app/locations/page.tsx) no longer promises hospital-level services, opening hours, or appointment availability. The phone number and email were removed as unverified; the exact street address and GPS pin are intentionally left for confirmation. The guest page and [ServiceCards.tsx](./src/components/landing/ServiceCards.tsx) now describe outpatient services and mark selected services as approval-dependent. The [FAQSection.tsx](./src/components/landing/FAQSection.tsx) now avoids claims of 24/7 care, HIPAA or 21 CFR Part 11 compliance, and unverified payment arrangements.

Still requiring review: database-managed Habitat rows can retain the previous name, services, and hours; correct them through [the clinic locations admin page](./src/app/admin/locations/page.tsx). [PricingCards.tsx](./src/components/landing/PricingCards.tsx) remains available as a standalone membership component but has been removed from the public landing page; it still contains subscription fallback content and US-specific HSA/FSA and CLIA references. Do not present these as a Habitat clinic tariff or Ethiopian approval; validate or replace before enabling public checkout. The finance dashboard in [finance/page.tsx](./src/app/admin/finance/page.tsx) uses illustrative/mock revenue, claims, ledger, payroll, and vendor data; it is not evidence of clinic performance, payer agreements, or achievable reimbursement.

Treat all seeded contact details, opening hours, capacity/availability, payment methods, prices, insurance relationships, and finance figures as unverified demo data until an accountable owner validates them. Keep online booking limited to real provider schedules and approved services.

## 3. Location and market hypothesis

The location record suggests Habitat in Debre Birhan, but “Habitat” by itself does not establish an official administrative locality or licensing jurisdiction. Before committing to a lease, document the city/region, sub-city or woreda, kebele, plot/building number, GPS pin, title/lease rights, and the responsible health office.

### Customer segments to test

- Nearby households seeking accessible first-contact outpatient care.
- People needing routine follow-up for hypertension, diabetes, respiratory conditions, and other common chronic conditions.
- Parents seeking general child health consultations, where within the licensed scope.
- Employers, schools, and community organizations seeking scheduled screening or health education.
- Patients who need specimen collection and basic diagnostics, if approved and appropriately staffed.

These are target segments, not verified demand. Before signing a long-term lease, conduct a local catchment survey: competitor and public-facility mapping, population and foot-traffic checks, interviews with residents/employers, price sensitivity, referral mapping, and a 2–4 week pilot booking/interest test. Obtain current local rent and wage quotations.

### Positioning

“A dependable neighborhood outpatient clinic: qualified Ethiopian-licensed professionals, clear ETB prices, timely appointments, respectful care, and safe referral when a patient needs a higher level of service.”

## 4. Recommended service and operating model

### Phase 1 — opening scope (medium-clinic outpatient model; each service subject to approval)

- General outpatient assessment and treatment by appropriately licensed professionals.
- Scheduled specialist outpatient consultations only for specialties with approved scope and credentialed providers.
- Follow-up and education for common chronic conditions.
- Preventive health education, maternal/child outpatient consultations, nutrition counseling, or physiotherapy only where confirmed as within the clinic's license and staffing.
- Nursing assessment, vital signs, wound care, injections, and other basic procedures only where permitted, with appropriate equipment and protocols.
- Point-of-care testing, specimen collection, or laboratory work only after the health authority confirms the permitted scope and any separate laboratory license, premises, staffing, equipment, and quality requirements.
- Referral coordination and documented escalation for emergencies and services outside the clinic’s capability.
- Vaccination/immunization only after confirming authorization, cold-chain arrangements, staffing, and required equipment.

### Staged services — add only after written approval and a business case

- A pharmacy/dispensary, with applicable EFDA and local approvals, a licensed responsible professional, secure storage, temperature control where needed, and stock controls.
- Broader laboratory capability or any imaging service only after facility-scope and separate authorization, staffing, premises, equipment, quality, and safety requirements are confirmed.

### Explicitly excluded from the base plan

24/7 emergency/trauma service, ICU, inpatient beds, delivery, surgery, blood bank, CT/X-ray, and hospital pharmacy. Do not advertise or provide these as clinic services under the present medium-clinic plan. Any future proposal requires written authority direction on facility reclassification, separate licenses, and a rebuilt hospital-level premises, staffing, equipment, and financing plan.

## 5. Premises and facility-readiness brief

Do not choose a floor area from this plan. Obtain the current medium-clinic room/area schedule and approved service checklist from the licensing authority, and get the drawings reviewed before construction or fit-out. The final layout must support safe, private, accessible patient flow and the approved service list.

Use the following as a **design brief for authority review**, not as a claim that every item or room is a fixed Ethiopian minimum:

- Reception/registration, waiting, patient circulation, and secure records/administration.
- Consultation/examination rooms sized and equipped for approved services.
- Treatment/procedure space and hand-hygiene points where procedures are offered.
- Accessible entrance/circulation and toilet provision confirmed against applicable building requirements.
- Clean supplies and equipment storage; cleaning/utility space.
- If laboratory work is approved: appropriate specimen collection, processing/work areas, handwashing, equipment, storage, waste segregation, and quality controls for the authorized scope.
- If medicines are dispensed: secure, appropriately stored stock, temperature monitoring as applicable, and controlled access.
- Safe healthcare-waste segregation at point of generation and secure temporary holding pending authorized collection/treatment.
- Reliable water, sanitation/drainage, ventilation, lighting, electricity, and a backup arrangement for critical needs.
- Fire-safety provisions, visible and unobstructed exits, emergency access, and a fire inspection/certificate as required.
- Separation of clean/dirty flows and adequate privacy, infection prevention, and accessibility.

Before lease/build-out, verify healthcare use/zoning and occupancy approval, structural safety, landlord consent for clinical fit-out/signage, water and power reliability, drainage, internet, waste contractor access, ambulance/referral access, parking/transport, and building/fire approvals. Make the lease conditional on the required change-of-use/health approvals wherever possible.

## 6. Staffing and management

The following is an **operating-model estimate**, not a government minimum staffing schedule. The licensing office must confirm minimum qualifications, headcount, hours, and on-site/shift coverage for the selected classification and each service.

| Function | Indicative opening coverage |
|---|---|
| Clinical leadership | 1 physician clinical lead/responsible person, if required by the authority |
| Outpatient medical care | 2–3 licensed physicians/medical practitioners across the approved schedule |
| Nursing | 3–5 appropriately licensed nurses/health professionals, adjusted to service scope and opening hours |
| Reception and records | 2 registration/billing staff |
| Finance and operations | 1 clinic administrator/accountant (may be combined only where practical and controlled) |
| Laboratory | 1–2 licensed laboratory professionals only if an on-site laboratory is approved |
| Pharmacy | 1 licensed pharmacy professional plus support only if a pharmacy is approved |
| Support | 2 cleaners/waste handlers and 1 security/attendant, with safe staffing/outsourcing arrangements |
| Additional disciplines | Contract/part-time cover only after service scope, credentialing, and demand are confirmed |

Maintain copies of current Ethiopian professional registration and practice licenses, credentials, contracts, duty rosters, job descriptions, and continuing-training records. Assign named responsibility for infection prevention, waste, equipment, medicine handling, incident reporting, patient complaints, emergency/referral protocols, and financial reconciliation.

## 7. Compliance and approvals

There is no verified, current, single online government checklist in the research reviewed that settles every “medium clinic” requirement. Classification and checklists can depend on the region, services, and current directives. Do not use this business plan as a substitute for the applicable directive or inspection.

### Confirm with the competent regional/local health authority before design

1. Exact facility classification and currently valid medium-clinic directive/checklist.
2. Permitted service scope and any separate approvals for laboratory, pharmacy, imaging, maternity, procedures, beds, or other services.
3. Required room schedule, minimum areas, equipment list, staff matrix, shift coverage, and professional qualifications.
4. Application documents, inspection sequence, renewal rules, validity period, current fees, and processing timeline.
5. The office responsible for the exact Habitat address and any local operating restrictions.

### Other compliance workstreams to confirm

- Business registration, tax registration, premises rights, construction/change-of-use, and occupancy approvals.
- Building accessibility and safety, fire inspection/certificate, and emergency access.
- EFDA requirements for medicines, pharmacy/dispensing, medical devices, and any regulated ancillary establishment.
- Applicable professional registration and licensing for every clinician.
- Laboratory authorization, quality assurance, biosafety, and personnel requirements if testing is offered.
- Radiation authorization, shielding, and specialist staffing if imaging is proposed (excluded from the base case).
- Ministry of Health/local requirements for infection prevention and healthcare waste, plus documented collection/treatment arrangements.
- Patient consent, confidentiality, records retention, data security, incident response, and applicable Ethiopian data/privacy obligations.
- Payer/insurance contracts: do not recognize insurance revenue until a signed contract and payment terms exist.

Relevant government sources to request current instruments from: [Ethiopian Ministry of Health](https://www.moh.gov.et/), [Ethiopian Food and Drug Authority](https://www.efda.gov.et/) and its [i-License portal](https://www.eris.efda.gov.et/). Proclamation titles identified for authority/legal verification include Food and Medicine Administration Proclamation No. 1112/2019 and Health Professionals Registration and Licensing Proclamation No. 661/2009. Obtain official current texts and implementing directives; this plan does not certify their applicability or quote specific clauses.

## 8. Marketing and patient acquisition

- Build trusted referral relationships with nearby health posts, hospitals, pharmacies, employers, schools, and community organizations, without implying formal affiliation until agreed.
- Promote clinician credentials, hours, approved services, ETB price transparency, appointment access, patient feedback, and referral pathways.
- Use local languages appropriate to the catchment; validate language and health-literacy needs with patients.
- Offer scheduled chronic-care follow-up and employer screening days only within the licensed service scope.
- Use the app for appointment requests, reminders, and clinic information after replacing demo locations, services, and contact details with verified data.
- Track source of first visit, repeat visits, appointment no-shows, referral completion, complaints, and patient satisfaction.

Do not advertise “24/7,” “emergency,” “hospital,” “ICU,” “CT,” laboratory accreditation, insurance coverage, or guaranteed response times without operational evidence and the relevant approvals.

## 9. Financial plan — illustrative best-execution case

All prices, volumes, costs, and startup amounts below are **planning assumptions only**. They are not sourced Ethiopian tariffs, government fees, local quotations, audited NiniMed results, or a forecast guarantee. Validate them with local market research, supplier quotes, payroll offers, tax/accounting advice, and the licensed tariff rules.

### Monthly operating assumptions at mature utilization

- 55 patient encounters per open day.
- 26 open days per month: 1,430 encounters/month.
- Weighted consultation revenue: ETB 600 per encounter.
- 40% of encounters purchase/receive an average ETB 650 of approved diagnostics.
- 45% purchase an average ETB 800 of dispensary products, only if separately approved.
- 10% receive an average ETB 500 of procedures/ancillary services.
- Assumed direct costs: consultations 0%; diagnostics 40% of diagnostic sales; dispensary goods 72% of dispensary sales; procedures 10% of procedure revenue.
- Fixed operating costs: ETB 900,000/month, including illustrative payroll, rent, utilities, software/admin, cleaning/security, maintenance, and local marketing.
- No debt service, depreciation, tax, owner distributions, or major equipment replacement in the EBITDA illustration.

| Monthly line at mature utilization | ETB |
|---|---:|
| Consultations: 1,430 × 600 | 858,000 |
| Diagnostics: 1,430 × 40% × 650 | 371,800 |
| Dispensary: 1,430 × 45% × 800 | 514,800 |
| Procedures/ancillary: 1,430 × 10% × 500 | 71,500 |
| **Total revenue** | **1,816,100** |
| Direct costs of diagnostics, dispensary, and procedures | (526,526) |
| Fixed operating costs | (900,000) |
| **Illustrative operating earnings before interest, tax, depreciation and amortization (EBITDA)** | **389,574** |

If no dispensary or on-site diagnostics are approved, the revenue mix and break-even change substantially; rebuild the forecast rather than assuming those revenues will occur.

### Three-year utilization ramp

| Year | Average utilization versus mature target | Revenue (ETB) | Direct costs (ETB) | Fixed operating costs (ETB) | Illustrative EBITDA (ETB) |
|---|---:|---:|---:|---:|---:|
| 1 | 65% | 14,165,580 | 4,106,903 | 10,800,000 | **(741,323)** |
| 2 | 85% | 18,524,220 | 5,370,565 | 10,800,000 | **2,353,655** |
| 3 | 100% | 21,793,200 | 6,318,312 | 10,800,000 | **4,674,888** |

This is a simplified constant-price, constant-cost model; it excludes inflation, taxes, financing, and changes in payer mix. A downside case should be stress-tested for slower patient uptake, lower consultation prices, higher wages/rent, lower diagnostic/pharmacy attachment, stock losses, and delayed approvals.

### Break-even

At the assumed mature service mix, direct costs are about 29.0% of revenue, leaving a 71.0% contribution margin. ETB 900,000 monthly fixed costs therefore require approximately **ETB 1.27 million monthly revenue** to cover operating costs. Under the same service mix, that is about **39 encounters per open day** at 26 operating days per month. This is clinic-level operating break-even before financing, taxes, depreciation, and owner returns.

### Preliminary startup capital envelope

| Use of funds | Planning range (ETB) |
|---|---:|
| Lease deposit and legal/site due diligence | 600,000–1,500,000 |
| Fit-out, plumbing, electrical, accessibility, and safety improvements | 2,000,000–4,000,000 |
| Clinical furniture and approved opening equipment | 4,000,000–7,000,000 |
| IT, network, security, and furnishings | 600,000–1,000,000 |
| Registration, design/professional support, and approvals allowance | 200,000–500,000 |
| Initial approved medical/lab/office supplies | 600,000–1,200,000 |
| Recruitment, training, and launch | 400,000–800,000 |
| Working capital reserve (approximately 4–6 months of fixed costs) | 3,600,000–5,400,000 |
| **Indicative total** | **12,000,000–21,400,000** |

Ranges are placeholders for early feasibility only, exclude land/building purchase and any hospital-level services, and must be replaced with quotations and an architect’s/engineer’s scope. The approval allowance is not an official fee estimate. Keep contingency within the final approved financing plan.

## 10. Implementation sequence and decision gates

### Gate 1 — jurisdiction and service scope (before lease)

- Confirm exact address and competent health authority.
- Obtain the current medium-clinic licensing packet in writing.
- Obtain written confirmation of the intended service scope and ancillary licenses.
- Screen land use, occupancy, fire/building status, landlord consent, access, utilities, waste, and neighbor/site constraints.
- Stop if the site cannot be legally used or adapted for the approved clinic category.

### Gate 2 — feasibility and design

- Complete catchment/competitor/demand research and local price testing.
- Obtain room schedule, equipment and staffing lists from authority.
- Secure architect/engineer drawings and health-authority pre-review.
- Obtain firm rent, construction, equipment, payroll, consumables, waste, insurance, and IT quotations.
- Rebuild base/downside/upside cash-flow scenarios and secure startup plus working-capital funding.

### Gate 3 — licensing and readiness

- Complete fit-out only against approved drawings and written scope.
- Hire and credential the responsible professional and required opening team.
- Procure approved equipment; document ownership, service, calibration, and maintenance where applicable.
- Implement IPC, waste, emergency/referral, consent/privacy, records, complaints, medicine handling, and incident policies.
- Complete inspections and obtain every required license/certificate before seeing patients.

### Gate 4 — controlled opening and growth

- Soft-open with scheduled outpatient capacity and daily safety/operations huddles.
- Review patient volumes, waiting time, stock-outs, referrals, cash reconciliation, complaints, and cash runway weekly.
- Add a service only after separate approval, verified demand, appropriately licensed staffing, and a positive incremental business case.

## 11. Key performance indicators

- Encounters per open day and completed appointments.
- New-to-returning patient mix and 30/90-day follow-up completion.
- Waiting time, no-show rate, and patient complaints/resolution.
- Revenue and contribution per encounter by approved service.
- Diagnostic completion and referral completion rates.
- Medication stock-outs, expiries, and inventory variance (if dispensary approved).
- Direct cost ratio, payroll/rent as a share of revenue, receivable days, and weekly cash runway.
- IPC audit performance, waste collection records, equipment maintenance, and reportable incidents.

## 12. Principal risks and mitigations

| Risk | Mitigation |
|---|---|
| “Medium clinic” category or service scope differs from assumptions | Get current stamped checklist and written scope determination before lease/design |
| Habitat address is ambiguous or falls under a different jurisdiction | Verify official address, woreda/kebele, GPS, and responsible authority |
| App overstates facilities/services or publishes fictional contact details | Remove or gate unverified claims; appoint a content owner and approval workflow |
| Demand or prices are below plan | Conduct local research and pilot; maintain 4–6 months working capital; stage hiring/capex |
| Delayed license, fit-out approval, fire or building clearance | Make lease/fit-out conditional; obtain pre-inspection and realistic time/cost buffers |
| Staff credential, coverage, or retention gaps | Verify credentials and authority staffing rules; recruit before inspection; create coverage/retention plan |
| Lab/pharmacy revenues assumed but ancillary approvals are not secured | Exclude from opening revenue until authorized; model a no-lab/no-pharmacy downside case |
| Clinical harm, infection, waste, or referral failure | Written IPC, emergency/referral, waste, incident, and quality systems; staff training and audits |
| Payer, payment, privacy, or software claims unsupported | Use only verified payment rails/contracts; review Ethiopian data/privacy obligations and security before launch |

## 13. Go/no-go recommendation

**Conditional go** for an outpatient-first medium-clinic feasibility and licensing phase in Habitat. **No-go** for representing the proposed facility as a 24/7 emergency center, hospital, ICU/inpatient facility, CT center, blood bank, or central hospital pharmacy based solely on current app content.

Release major capital only when: (1) the precise site and licensing authority are verified, (2) the clinic category and service scope are confirmed in writing, (3) premises and room plans pass pre-review, (4) local demand and vendor/payroll costs support the revised cash-flow case, and (5) financing covers fit-out plus ramp-up working capital.
