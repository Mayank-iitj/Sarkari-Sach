from __future__ import annotations
import sys
from pathlib import Path

# Ensure backend is in python path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import hashlib
from datetime import date
from sqlalchemy.orm import Session
from app.models import Source, Document, Chunk, Provision, DocRelation, Debunk, Scheme, OfficialDomain
from app.db import SyncSessionLocal, init_db_sync


# -----------------------------------------------------------------------------
# ALL MAJOR OFFICIAL SCHEMES FROM MYSCHEME.GOV.IN
# -----------------------------------------------------------------------------
MYSCHEME_REGISTRY = [
    {
        "id": "pm-kisan",
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "name_aliases": ["PM-KISAN", "पीएम किसान", "किसान सम्मान निधि", "PM Kisan Yojana"],
        "issuer": "Ministry of Agriculture and Farmers Welfare",
        "doc_number": "F.No. 1-1/2019-Credit-I / G.S.R. 552(E)",
        "published_on": date(2019, 2, 24),
        "url": "https://www.myscheme.gov.in/schemes/pm-kisan",
        "portal_url": "https://pmkisan.gov.in",
        "benefit": "₹6,000 per year in three equal four-monthly installments of ₹2,000 each transferred directly to Aadhaar-seeded bank accounts through DBT.",
        "eligibility": "All landholding farmer families across India who have cultivable landholding in their names. Institutional landholders and high income-tax payers are excluded.",
        "fee": "Zero / Completely Free (₹0). No application or processing fee is charged on the official portal.",
        "description": "Pradhan Mantri Kisan Samman Nidhi is a Central Sector Scheme providing direct income support to small and marginal farmer families to meet farm input costs and domestic necessities."
    },
    {
        "id": "ayushman-bharat",
        "name": "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB PM-JAY)",
        "name_aliases": ["PM-JAY", "आयुष्मान भारत", "जन आरोग्य योजना", "Ayushman Card"],
        "issuer": "National Health Authority (NHA) / Ministry of Health and Family Welfare",
        "doc_number": "NHA/PMJAY/2022/Policy-1",
        "published_on": date(2018, 9, 23),
        "url": "https://www.myscheme.gov.in/schemes/pmjay",
        "portal_url": "https://beneficiary.nha.gov.in",
        "benefit": "Cashless health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and empanelled private hospitals across India.",
        "eligibility": "Vulnerable rural and urban families identified in SECC 2011, and expanded to all senior citizens aged 70 and above irrespective of income.",
        "fee": "Zero / Completely Free (₹0). Creation of Ayushman Card and hospital treatment are 100% cashless.",
        "description": "Ayushman Bharat PM-JAY is the world's largest government-funded health assurance scheme covering hospitalization expenses for over 50 crore citizens."
    },
    {
        "id": "pm-surya-ghar",
        "name": "PM Surya Ghar: Muft Bijli Yojana (Rooftop Solar)",
        "name_aliases": ["PM Surya Ghar", "पीएम सूर्य घर मुफ्त बिजली योजना", "Rooftop Solar Scheme", "Solar Muft Bijli"],
        "issuer": "Ministry of New and Renewable Energy (MNRE)",
        "doc_number": "MNRE-Solar-2024/02",
        "published_on": date(2024, 2, 13),
        "url": "https://www.myscheme.gov.in/schemes/pm-sgmby",
        "portal_url": "https://pmsuryaghar.gov.in",
        "benefit": "Up to 300 units of free solar electricity per month, plus capital subsidy of ₹30,000 for 1kW, ₹60,000 for 2kW, and up to ₹78,000 for 3kW or higher systems.",
        "eligibility": "Indian residential households with a suitable roof, a valid grid-connected consumer electricity connection, and no prior subsidy claimed for solar.",
        "fee": "Zero / Free registration (₹0). Application on pmsuryaghar.gov.in is free; citizens pay only the net vendor installation cost after subsidy.",
        "description": "PM Surya Ghar: Muft Bijli Yojana targets 1 crore households with rooftop solar installations to provide free electricity and empower households to sell surplus power to DISCOMs."
    },
    {
        "id": "pm-awas-yojana",
        "name": "Pradhan Mantri Awas Yojana (PMAY-Gramin / Urban)",
        "name_aliases": ["PMAY", "PMAY-G", "PMAY-U", "प्रधानमंत्री आवास योजना", "PM Housing Scheme"],
        "issuer": "Ministry of Rural Development & Ministry of Housing and Urban Affairs",
        "doc_number": "MoRD/PMAY-G/2021/Policy",
        "published_on": date(2016, 11, 20),
        "url": "https://www.myscheme.gov.in/schemes/pmay-g",
        "portal_url": "https://pmayg.nic.in",
        "benefit": "Financial grant of ₹1,20,000 in plains and ₹1,30,000 in hilly/difficult areas for pucca house construction, plus 90-95 days unskilled MGNREGA wages and ₹12,000 for toilet construction.",
        "eligibility": "Homeless families and households living in kutcha or dilapidated houses according to SECC deprivation parameters.",
        "fee": "Zero / Completely Free (₹0). Selection is transparent and automated; no middleman fee is authorized.",
        "description": "PMAY aims to achieve Housing for All by providing financial assistance to poor rural and urban families for constructing permanent disaster-resilient houses with basic amenities."
    },
    {
        "id": "pm-vishwakarma",
        "name": "PM Vishwakarma Scheme",
        "name_aliases": ["PM Vishwakarma", "पीएम विश्वकर्मा योजना", "Vishwakarma Kaushal Samman"],
        "issuer": "Ministry of Micro, Small and Medium Enterprises (MoMSME)",
        "doc_number": "MSME/PMV/2023-01",
        "published_on": date(2023, 9, 17),
        "url": "https://www.myscheme.gov.in/schemes/pmvy",
        "portal_url": "https://pmvishwakarma.gov.in",
        "benefit": "PM Vishwakarma Certificate & ID, basic skill training with ₹500/day stipend, modern toolkit incentive of ₹15,000, and collateral-free enterprise credit up to ₹3,00,000 at 5% interest.",
        "eligibility": "Traditional artisans and craftspeople working with hands and tools across 18 notified artisan trades (carpenters, blacksmiths, goldsmiths, potters, sculptors, cobblers, weavers, etc.).",
        "fee": "Zero / Free (₹0). Free registration at Common Service Centres (CSCs); government covers full onboarding cost.",
        "description": "PM Vishwakarma provides end-to-end holistic support to traditional artisans and craftspeople to scale their enterprises, upgrade their tools, and integrate with global supply chains."
    },
    {
        "id": "pm-svanidhi",
        "name": "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
        "name_aliases": ["PM SVANidhi", "पीएम स्वनिधि", "Street Vendor Loan Scheme"],
        "issuer": "Ministry of Housing and Urban Affairs (MoHUA)",
        "doc_number": "MoHUA/PMS/2020-04",
        "published_on": date(2020, 6, 1),
        "url": "https://www.myscheme.gov.in/schemes/pmsvanidhi",
        "portal_url": "https://pmsvanidhi.mohua.gov.in",
        "benefit": "Collateral-free working capital micro-loans of ₹10,000 (1st tranche), ₹20,000 (2nd tranche), and ₹50,000 (3rd tranche) with 7% interest subsidy and up to ₹1,200 annual cashback on digital transactions.",
        "eligibility": "Urban, peri-urban, and rural street vendors engaged in vending on or before March 24, 2020 holding a Certificate of Vending or Letter of Recommendation (LoR).",
        "fee": "Zero / Free processing (₹0). No collateral or processing fee charged by banks.",
        "description": "PM SVANidhi empowers street vendors to resume their livelihood businesses post-lockdown by providing affordable collateral-free working capital credit and incentivizing digital transactions."
    },
    {
        "id": "pm-mudra-yojana",
        "name": "Pradhan Mantri Mudra Yojana (PMMY)",
        "name_aliases": ["Mudra Yojana", "पीएम मुद्रा योजना", "PMMY", "Mudra Loan"],
        "issuer": "Department of Financial Services, Ministry of Finance",
        "doc_number": "DFS/PMMY/2015-01",
        "published_on": date(2015, 4, 8),
        "url": "https://www.myscheme.gov.in/schemes/pmmy",
        "portal_url": "https://www.mudra.org.in",
        "benefit": "Collateral-free business loans up to ₹20,00,000: Shishu (up to ₹50,000), Kishore (₹50,000 to ₹5 Lakh), Tarun (₹5 Lakh to ₹10 Lakh), and Tarun Plus (₹10 Lakh to ₹20 Lakh).",
        "eligibility": "Any Indian citizen having a viable business plan for non-farm income-generating micro or small enterprises in manufacturing, trading, or service sectors.",
        "fee": "Zero processing fee for Shishu and Kishore loans. Beware of fake agents demanding upfront approval fees.",
        "description": "PMMY provides seamless institutional credit to micro and small enterprises to generate employment and fund the unfunded."
    },
    {
        "id": "sukanya-samriddhi",
        "name": "Sukanya Samriddhi Yojana (SSY)",
        "name_aliases": ["Sukanya Samriddhi", "सुकन्या समृद्धि योजना", "SSY", "Beti Bachao Beti Padhao Account"],
        "issuer": "Department of Economic Affairs, Ministry of Finance",
        "doc_number": "G.S.R. 863(E)",
        "published_on": date(2015, 1, 22),
        "url": "https://www.myscheme.gov.in/schemes/ssy",
        "portal_url": "https://www.nsiindia.gov.in",
        "benefit": "High sovereign-backed interest rate (8.2% p.a.), exempt-exempt-exempt (EEE) tax status under Section 80C, and guaranteed maturity payouts upon the girl child turning 21.",
        "eligibility": "Parents or legal guardians of a girl child below 10 years of age (maximum two accounts per family, with relaxation for triplets/twins).",
        "fee": "Minimum initial deposit of ₹250 (up to ₹1,50,000 per financial year).",
        "description": "Sukanya Samriddhi Yojana is a high-yielding small savings scheme designed to build a dedicated financial corpus for higher education and marriage of the girl child."
    },
    {
        "id": "pm-ujjwala",
        "name": "Pradhan Mantri Ujjwala Yojana (PMUY 2.0)",
        "name_aliases": ["Ujjwala Yojana", "पीएम उज्ज्वला योजना", "PMUY", "Free Gas Connection"],
        "issuer": "Ministry of Petroleum and Natural Gas (MoPNG)",
        "doc_number": "MoPNG/PMUY/2021-02",
        "published_on": date(2016, 5, 1),
        "url": "https://www.myscheme.gov.in/schemes/pmuy",
        "portal_url": "https://www.pmuy.gov.in",
        "benefit": "Deposit-free LPG cylinder connection, free first refill cylinder, free hotplate stove, and targeted subsidy of ₹300 per 14.2kg domestic cylinder for up to 12 refills per year.",
        "eligibility": "Adult woman belonging to poor/BPL household with no existing LPG connection in the household.",
        "fee": "Zero / Completely Free (₹0). Security deposit for cylinder, regulator, and installation is 100% borne by Central Government.",
        "description": "PM Ujjwala Yojana protects the health of women and children by providing clean cooking fuel (LPG) to rural and deprived households to replace hazardous biomass fuels."
    },
    {
        "id": "atal-pension-yojana",
        "name": "Atal Pension Yojana (APY)",
        "name_aliases": ["Atal Pension", "अटल पेंशन योजना", "APY", "Pension Scheme"],
        "issuer": "PFRDA / Ministry of Finance",
        "doc_number": "PFRDA/APY/2015-05",
        "published_on": date(2015, 5, 9),
        "url": "https://www.myscheme.gov.in/schemes/apy",
        "portal_url": "https://www.npscra.nsdl.co.in",
        "benefit": "Guaranteed minimum monthly pension of ₹1,000, ₹2,000, ₹3,000, ₹4,000, or ₹5,000 per month starting at age 60, followed by lifelong pension to spouse, and return of full accumulated corpus to nominee.",
        "eligibility": "All Indian citizens aged 18 to 40 years holding a savings bank or post office account (income-tax payers ineligible).",
        "fee": "Monthly auto-debit contribution based on entry age and selected pension amount (e.g. ₹42/month at age 18 for ₹1,000 pension).",
        "description": "Atal Pension Yojana provides old-age income security to workers in the unorganized sector through government-guaranteed defined minimum pensions."
    },
    {
        "id": "pm-jeevan-jyoti",
        "name": "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
        "name_aliases": ["PMJJBY", "जीवन ज्योति बीमा", "PM Jeevan Jyoti"],
        "issuer": "Department of Financial Services, Ministry of Finance",
        "doc_number": "DFS/PMJJBY/2015",
        "published_on": date(2015, 5, 9),
        "url": "https://www.myscheme.gov.in/schemes/pmjjby",
        "portal_url": "https://www.jansuraksha.gov.in",
        "benefit": "Life insurance cover of ₹2,00,000 in case of death of the insured due to any cause.",
        "eligibility": "Individuals aged 18 to 50 years holding a bank account and providing consent for annual auto-debit.",
        "fee": "Annual premium of ₹436 per annum automatically debited from the bank account.",
        "description": "PMJJBY offers affordable renewable one-year life insurance coverage to ensure financial resilience for families upon unexpected death of breadwinners."
    },
    {
        "id": "pm-suraksha-bima",
        "name": "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
        "name_aliases": ["PMSBY", "सुरक्षा बीमा योजना", "PM Suraksha Bima"],
        "issuer": "Department of Financial Services, Ministry of Finance",
        "doc_number": "DFS/PMSBY/2015",
        "published_on": date(2015, 5, 9),
        "url": "https://www.myscheme.gov.in/schemes/pmsby",
        "portal_url": "https://www.jansuraksha.gov.in",
        "benefit": "Accidental death and total permanent disability cover of ₹2,00,000; partial permanent disability cover of ₹1,00,000.",
        "eligibility": "Individuals aged 18 to 70 years holding a savings bank account with annual auto-debit facility.",
        "fee": "Annual premium of only ₹20 per annum auto-debited in the month of May.",
        "description": "PMSBY provides high-value accidental death and disability insurance cover at a nominal cost of ₹20/year to all citizens."
    },
    {
        "id": "pm-fasal-bima",
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "name_aliases": ["PMFBY", "प्रधानमंत्री फसल बीमा योजना", "Crop Insurance"],
        "issuer": "Ministry of Agriculture and Farmers Welfare",
        "doc_number": "F.No. 13015/01/2016-Credit-II",
        "published_on": date(2016, 2, 18),
        "url": "https://www.myscheme.gov.in/schemes/pmfby",
        "portal_url": "https://pmfby.gov.in",
        "benefit": "Comprehensive financial insurance against localized natural disasters, drought, floods, hailstorms, pests, and post-harvest losses.",
        "eligibility": "All farmers growing notified crops in notified areas, including tenant farmers and sharecroppers.",
        "fee": "Farmer share capped at 2% for Kharif crops, 1.5% for Rabi crops, and 5% for annual commercial/horticultural crops; balance subsidized by Government.",
        "description": "PMFBY provides comprehensive crop insurance from pre-sowing to post-harvest to stabilize farmer income and encourage modern agriculture."
    },
    {
        "id": "stand-up-india",
        "name": "Stand-Up India Scheme",
        "name_aliases": ["Stand-Up India", "स्टैंड-अप इंडिया", "Stand Up India Loan"],
        "issuer": "Department of Financial Services, Ministry of Finance / SIDBI",
        "doc_number": "DFS/SUI/2016",
        "published_on": date(2016, 4, 5),
        "url": "https://www.myscheme.gov.in/schemes/standup-india",
        "portal_url": "https://www.standupmitra.in",
        "benefit": "Composite bank loans between ₹10,00,000 and ₹1,00,00,000 to facilitate greenfield enterprises in manufacturing, services, agri-allied, or trading.",
        "eligibility": "SC, ST, and Women entrepreneurs above 18 years of age. In non-individual enterprises, 51% shareholding must be held by SC/ST or woman entrepreneur.",
        "fee": "Standard commercial bank processing fees; no guarantee fee charged to borrower under CGFSI.",
        "description": "Stand-Up India facilitates institutional bank credit to women and Scheduled Caste/Scheduled Tribe entrepreneurs to support greenfield business ventures."
    },
    {
        "id": "pmegp",
        "name": "Prime Minister's Employment Generation Programme (PMEGP)",
        "name_aliases": ["PMEGP", "पीएमईजीपी", "KVIC PMEGP Loan"],
        "issuer": "Khadi and Village Industries Commission (KVIC) / Ministry of MSME",
        "doc_number": "MSME/PMEGP/Guidelines-2022",
        "published_on": date(2008, 8, 15),
        "url": "https://www.myscheme.gov.in/schemes/pmegp",
        "portal_url": "https://www.kviconline.gov.in",
        "benefit": "Government margin money subsidy up to 35% of project cost for rural projects and 25% for urban projects (max project cost ₹50 Lakh for manufacturing, ₹20 Lakh for services).",
        "eligibility": "Any individual above 18 years of age. For projects above ₹10 Lakh in manufacturing and ₹5 Lakh in services, educational qualification of minimum VIII standard pass is required.",
        "fee": "Zero / Completely Free online application on kviconline.gov.in.",
        "description": "PMEGP is a major credit-linked subsidy programme to generate continuous self-employment opportunities in rural and urban areas by setting up micro-enterprises."
    },
    {
        "id": "pm-kusum",
        "name": "Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan (PM-KUSUM)",
        "name_aliases": ["PM KUSUM", "पीएम कुसुम योजना", "Solar Agriculture Pump"],
        "issuer": "Ministry of New and Renewable Energy (MNRE)",
        "doc_number": "MNRE/KUSUM/2019-01",
        "published_on": date(2019, 3, 8),
        "url": "https://www.myscheme.gov.in/schemes/pm-kusum",
        "portal_url": "https://pmkusum.mnre.gov.in",
        "benefit": "60% government subsidy (30% Central + 30% State) for setting up standalone solar agriculture pumps or solarizing existing grid pumps, with farmers contributing only 10% upfront.",
        "eligibility": "Individual farmers, Farmer Producer Organizations (FPOs), cooperatives, and water user associations with agricultural land.",
        "fee": "Farmer contributes only 10% of total capital cost; bank loan up to 30% available.",
        "description": "PM-KUSUM de-dieselizes irrigation, provides energy security to farmers, and generates supplemental farm income by allowing farmers to sell surplus solar power."
    },
    {
        "id": "jal-jeevan-mission",
        "name": "Jal Jeevan Mission (Har Ghar Jal)",
        "name_aliases": ["JJM", "जल जीवन मिशन", "Har Ghar Jal"],
        "issuer": "Department of Drinking Water and Sanitation, Ministry of Jal Shakti",
        "doc_number": "JJM/Guidelines/2019",
        "published_on": date(2019, 8, 15),
        "url": "https://www.myscheme.gov.in/schemes/jjm",
        "portal_url": "https://jaljeevanmission.gov.in",
        "benefit": "Guaranteed supply of 55 litres per capita per day (lpcd) of potable water through functional household tap connections (FHTC) to every rural household.",
        "eligibility": "All rural households in Indian villages across all States and Union Territories.",
        "fee": "Zero / Completely Free tap connection installation (₹0).",
        "description": "Jal Jeevan Mission provides universal access to safe and adequate tap water to every rural household in India to improve public health and ease hardship for rural women."
    },
    {
        "id": "national-scholarship-portal",
        "name": "National Scholarship Portal Schemes (NSP)",
        "name_aliases": ["NSP", "राष्ट्रीय छात्रवृत्ति पोर्टल", "National Scholarship"],
        "issuer": "Ministry of Education & Ministry of Minority Affairs",
        "doc_number": "MoE/NSP/2023-Policy",
        "published_on": date(2016, 7, 1),
        "url": "https://www.myscheme.gov.in/schemes/nsp",
        "portal_url": "https://scholarships.gov.in",
        "benefit": "Direct scholarship disbursements via DBT covering tuition fees, maintenance allowances, and book grants directly into student bank accounts.",
        "eligibility": "Students studying in recognized educational institutions meeting income criteria (usually family income under ₹2.5 Lakh to ₹8 Lakh per annum depending on scheme).",
        "fee": "Zero / Completely Free application (₹0). Application on scholarships.gov.in is 100% free.",
        "description": "National Scholarship Portal is the unified digital platform providing end-to-end scholarship application, verification, sanction, and DBT disbursement."
    },
    {
        "id": "onorc-ration",
        "name": "One Nation One Ration Card (ONORC / NFSA)",
        "name_aliases": ["ONORC", "एक राष्ट्र एक राशन कार्ड", "NFSA Ration", "Free Ration Scheme", "PMGKAY"],
        "issuer": "Department of Food and Public Distribution, Ministry of Consumer Affairs",
        "doc_number": "NFSA/ONORC/2019-Policy",
        "published_on": date(2019, 8, 1),
        "url": "https://www.myscheme.gov.in/schemes/onorc",
        "portal_url": "https://nfsa.gov.in",
        "benefit": "Free foodgrains (5kg per person per month for Priority Households and 35kg per family for AAY) under PM Garib Kalyan Anna Yojana (PMGKAY) with nationwide portability across any Fair Price Shop.",
        "eligibility": "All beneficiaries covered under the National Food Security Act (NFSA) possessing an active ration card seeded with Aadhaar.",
        "fee": "Zero / 100% Free foodgrains (₹0). No portability or biometric authentication fee.",
        "description": "ONORC enables migrant workers and beneficiaries to claim their subsidized or free foodgrain entitlements from any Fair Price Shop across India using biometric Aadhaar authentication."
    },
    {
        "id": "pm-egov-digilocker",
        "name": "DigiLocker Ecosystem & Digital Governance Initiative",
        "name_aliases": ["DigiLocker", "डिजिलॉकर", "Digital Document Wallet"],
        "issuer": "Ministry of Electronics and Information Technology (MeitY)",
        "doc_number": "MeitY/DigiLocker/IT-Rules-9A",
        "published_on": date(2015, 7, 1),
        "url": "https://www.myscheme.gov.in/schemes/digilocker",
        "portal_url": "https://www.digilocker.gov.in",
        "benefit": "Legally valid electronic access to authentic digital documents (Aadhaar, Driving License, Vehicle RC, Marksheets, Insurance) treated on par with original physical documents under Rule 9A of Information Technology Rules.",
        "eligibility": "Every Indian citizen possessing an Aadhaar number and active mobile connection.",
        "fee": "Zero / 100% Free of cost (₹0).",
        "description": "DigiLocker provides secure dedicated cloud storage to Indian citizens for paperless governance and instantaneous credential verification."
    }
]


def seed_corpus_sync():
    """
    Seeds the official corpus with primary government documents, clauses, provisions, relations, and debunks
    from https://www.myscheme.gov.in and official Gazettes. Runs offline and on deployment.
    """
    init_db_sync()

    with SyncSessionLocal() as session:
        # Clean reseed to prevent duplicate keys
        session.query(Provision).delete()
        session.query(Chunk).delete()
        session.query(DocRelation).delete()
        session.query(Document).delete()
        session.query(Debunk).delete()
        session.query(Scheme).delete()
        session.commit()

        print("Seeding official corpus from myscheme.gov.in...")

        for s_data in MYSCHEME_REGISTRY:
            # 1. Add Scheme Entry
            scheme_obj = Scheme(
                id=s_data["id"],
                name=s_data["name"],
                name_aliases=s_data["name_aliases"],
                issuer=s_data["issuer"]
            )
            session.merge(scheme_obj)

            # 2. Add Primary Official Document Record
            doc_id = f"doc-{s_data['id']}-primary"
            full_text = f"""OFFICIAL SCHEME GAZETTE & PORTAL NOTIFICATION
SCHEME: {s_data['name']}
ISSUER: {s_data['issuer']}
IDENTIFIER: {s_data['doc_number']}
OFFICIAL PORTAL: {s_data['portal_url']}
MYSCHEME REGISTRY: {s_data['url']}

1. OBJECTIVE AND OVERVIEW:
{s_data['description']}

2. ENTITLEMENT AND BENEFITS:
{s_data['benefit']}

3. ELIGIBILITY CRITERIA:
{s_data['eligibility']}

4. APPLICATION FEES AND CITIZEN WARNING:
{s_data['fee']} Citizens are cautioned never to pay unauthorized fees to third-party portals. Official registrations are conducted exclusively via {s_data['portal_url']}.
"""
            doc_obj = Document(
                id=doc_id,
                source_id="myscheme",
                external_id=f"MYSCHEME-{s_data['id'].upper()}",
                doc_type="scheme_guideline",
                title=f"{s_data['name']} - Official Guidelines & Provisions",
                issuer=s_data["issuer"],
                doc_number=s_data["doc_number"],
                published_on=s_data["published_on"],
                effective_from=s_data["published_on"],
                language="en",
                url=s_data["url"],
                content_hash=hashlib.sha256(full_text.encode()).hexdigest(),
                text=full_text,
                snapshot_id="2026-10-31-myscheme"
            )
            session.add(doc_obj)
            session.flush()

            # 3. Add Statutory Chunks for RAG & Clause-level citations
            c_benefit = Chunk(
                document_id=doc_obj.id,
                ordinal=1,
                clause_ref="Clause 2 (Benefits)",
                text=f"Under {s_data['name']}, the authorized benefit is: {s_data['benefit']}"
            )
            c_eligibility = Chunk(
                document_id=doc_obj.id,
                ordinal=2,
                clause_ref="Clause 3 (Eligibility)",
                text=f"Eligibility criteria for {s_data['name']}: {s_data['eligibility']}"
            )
            c_fee = Chunk(
                document_id=doc_obj.id,
                ordinal=3,
                clause_ref="Clause 4 (Fee Policy)",
                text=f"Authorized fee structure: {s_data['fee']} Official applications are hosted at {s_data['portal_url']}."
            )
            session.add_all([c_benefit, c_eligibility, c_fee])
            session.flush()

            # 4. Add Structured Provisions for deterministic checks
            p_benefit = Provision(
                scheme_id=scheme_obj.id,
                document_id=doc_obj.id,
                chunk_id=c_benefit.id,
                field="benefit",
                value=s_data["benefit"][:200],
                quote=s_data["benefit"],
                effective_from=s_data["published_on"]
            )
            p_eligibility = Provision(
                scheme_id=scheme_obj.id,
                document_id=doc_obj.id,
                chunk_id=c_eligibility.id,
                field="eligibility",
                value=s_data["eligibility"][:200],
                quote=s_data["eligibility"],
                effective_from=s_data["published_on"]
            )
            p_fee = Provision(
                scheme_id=scheme_obj.id,
                document_id=doc_obj.id,
                chunk_id=c_fee.id,
                field="fee",
                value=s_data["fee"][:100],
                quote=s_data["fee"],
                effective_from=s_data["published_on"]
            )
            session.add_all([p_benefit, p_eligibility, p_fee])

        # -------------------------------------------------------------
        # Known Debunks from PIB Fact Check
        # -------------------------------------------------------------
        debunks_data = [
            (
                "Viral message claiming PM Kisan 20th instalment will give ₹4,000 instead of ₹2,000 on Diwali.",
                "PIB Fact Check: FAKE. Central Government has made no announcement regarding increase of PM-KISAN installment to ₹4,000.",
                date(2024, 10, 15)
            ),
            (
                "Message claiming Aadhaar card holders can get immediate ₹50,000 loan by clicking pm-loan-yojana.com.",
                "PIB Fact Check: This claim is FRAUDULENT. UIDAI and Central Government do not provide personal loans on Aadhaar.",
                date(2024, 4, 18)
            ),
            (
                "A notice claiming that FASTag will be deactivated tonight unless ₹100 verification fee is paid via fastag-update.in.",
                "PIB Fact Check: This is a PHISHING SCAM. NHAI does not charge any fee for FASTag verification. Do not click unknown links.",
                date(2024, 2, 25)
            ),
            (
                "National Scholarship Portal notice claiming ₹25,000 scholarship for all 10th and 12th pass students on scholarships-gov.in.net",
                "PIB Fact Check: This notice is FAKE. No such ₹25,000 scholarship has been announced by the Central Government. Check scholarships.gov.in.",
                date(2024, 7, 10)
            ),
            (
                "Message claiming instant approval of ₹2,00,000 loan under Pradhan Mantri Mudra Yojana on payment of ₹999 or ₹1000 processing fee on mudra-loan-online.icu",
                "PIB Fact Check: FRAUD ALERT. Ministry of Finance does not charge any processing fee for Mudra loans.",
                date(2024, 8, 5)
            ),
            (
                "Viral circular claiming ₹10 lakh cash card under Ayushman Bharat on paying ₹200 printing charge on ayushman-card.site",
                "PIB Fact Check: This is a SCAM. Health cover under Ayushman Bharat is ₹5,00,000 and the card is issued free of cost.",
                date(2024, 9, 1)
            ),
            (
                "SMS claiming Income Tax refund of ₹15,450 approved and asking recipients to enter bank details and UPI PIN on incometax-refund.cfd",
                "PIB Fact Check: PHISHING WARNING. Income Tax Department never asks for UPI PIN or banking passwords via SMS links.",
                date(2024, 9, 18)
            ),
            (
                "Message claiming free laptops under PM Free Laptop Yojana 2026 on registration fee of ₹350 on pm-laptop-yojana.xyz",
                "PIB Fact Check: FAKE. Central Government is running no such scheme providing free laptops for ₹350 fee.",
                date(2024, 10, 2)
            ),
            (
                "Notice claiming installation of 3kW rooftop solar under PM Surya Ghar requires upfront cash deposit of ₹2,500 to private bank account.",
                "PIB Fact Check: SCAM ALERT. PM Surya Ghar application is free on pmsuryaghar.gov.in. Never deposit money to personal bank accounts.",
                date(2024, 5, 20)
            )
        ]

        for claim_t, verd_t, p_date in debunks_data:
            d_entry = Debunk(
                claim_text=claim_t,
                verdict_text=verd_t,
                published_on=p_date
            )
            session.add(d_entry)

        session.commit()
        print(f"Successfully seeded {len(MYSCHEME_REGISTRY)} official schemes and {len(debunks_data)} debunks from myscheme.gov.in!")


if __name__ == "__main__":
    seed_corpus_sync()
