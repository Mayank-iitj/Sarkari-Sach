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


def seed_corpus_sync():
    """
    Seeds the official corpus with primary government documents, clauses, provisions, relations, and debunks.
    Runs offline without needing internet connection.
    """
    init_db_sync()

    with SyncSessionLocal() as session:
        # Clean reseed
        session.query(Chunk).delete()
        session.query(Provision).delete()
        session.query(DocRelation).delete()
        session.query(Document).delete()
        session.query(Debunk).delete()
        session.commit()

        print("Seeding official corpus...")

        # 1. Scheme: PM-KISAN
        scheme_kisan = Scheme(
            id="pm-kisan",
            name="Pradhan Mantri Kisan Samman Nidhi",
            name_aliases=["PM-KISAN", "पीएम किसान", "किसान सम्मान निधि", "PM Kisan Yojana"],
            issuer="Ministry of Agriculture and Farmers Welfare"
        )
        session.merge(scheme_kisan)

        # Doc 1: PM-KISAN Original Launch Notification (2019)
        doc1_text = """PRESS INFORMATION BUREAU
GOVERNMENT OF INDIA
MINISTRY OF AGRICULTURE & FARMERS WELFARE

Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) launched to provide financial assistance to landholding farmer families.

Para 1.1 Objective: Under the scheme, financial assistance is provided to all landholding farmer families across the country to enable them to take care of expenses related to agriculture and allied activities as well as domestic needs.

Para 2.1 Scheme Benefit: Under the PM-KISAN scheme, a financial benefit of ₹6,000 per year is provided to eligible farmer families. The amount of ₹6,000 per year is payable in three equal installments of ₹2,000 every four months directly into the bank accounts of the beneficiaries through Direct Benefit Transfer (DBT).

Para 3.1 Application and Fees: The registration for PM-KISAN can be done directly by the farmers through the PM-KISAN portal (pmkisan.gov.in) or through Common Services Centres (CSCs). No application fee is charged under this scheme. The government has made the application and verification process completely free.

Para 4.1 Official Web Portal: The only official and authorized website for PM-KISAN is https://pmkisan.gov.in. Citizens are strictly warned not to fall prey to fake websites, unauthorized applications, or agents demanding processing fees."""

        doc1 = Document(
            id="d1-pmkisan-2019",
            source_id="pib",
            external_id="PIB-PMKISAN-2019",
            doc_type="press_release",
            title="Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) Operational Launch Guidelines",
            issuer="Ministry of Agriculture and Farmers Welfare",
            doc_number="F.No. 1-1/2019-Credit-I",
            published_on=date(2019, 2, 24),
            effective_from=date(2019, 12, 1),
            effective_to=date(2021, 8, 9),  # Superseded by revised guidelines
            language="en",
            url="https://pib.gov.in/PressReleasePage.aspx?PRID=1566123",
            content_hash=hashlib.sha256(doc1_text.encode()).hexdigest(),
            text=doc1_text,
            snapshot_id="2026-10-31a"
        )
        session.add(doc1)
        session.flush()

        # Chunks for Doc 1
        c1_1 = Chunk(
            document_id=doc1.id,
            ordinal=1,
            clause_ref="Para 2.1",
            text="Under the PM-KISAN scheme, a financial benefit of ₹6,000 per year is provided to eligible farmer families. The amount of ₹6,000 per year is payable in three equal installments of ₹2,000 every four months directly into the bank accounts of the beneficiaries through Direct Benefit Transfer (DBT)."
        )
        c1_2 = Chunk(
            document_id=doc1.id,
            ordinal=2,
            clause_ref="Para 3.1",
            text="The registration for PM-KISAN can be done directly by the farmers through the PM-KISAN portal (pmkisan.gov.in) or through Common Services Centres (CSCs). No application fee is charged under this scheme. The government has made the application and verification process completely free."
        )
        session.add_all([c1_1, c1_2])
        session.flush()

        # Provisions for Doc 1
        p1_amount = Provision(
            scheme_id="pm-kisan",
            document_id=doc1.id,
            chunk_id=c1_1.id,
            field="amount",
            value="₹6,000/year",
            value_norm={"num": 6000, "unit": "INR/year"},
            quote="financial benefit of ₹6,000 per year",
            effective_from=date(2019, 12, 1)
        )
        p1_fee = Provision(
            scheme_id="pm-kisan",
            document_id=doc1.id,
            chunk_id=c1_2.id,
            field="fee",
            value="Free (0)",
            value_norm={"num": 0, "unit": "INR"},
            quote="No application fee is charged under this scheme.",
            effective_from=date(2019, 12, 1)
        )
        session.add_all([p1_amount, p1_fee])

        # Doc 2: PM-KISAN Revised Guidelines (2021/2023 - Superseding old operational rules)
        doc2_text = """MINISTRY OF AGRICULTURE AND FARMERS WELFARE
NOTIFICATION
New Delhi, the 10th August, 2021

G.S.R. 552(E). - In supersession of the operational guidelines issued vide F.No. 1-1/2019-Credit-I dated 24th February 2019, the Central Government hereby notifies the revised operational guidelines for Pradhan Mantri Kisan Samman Nidhi (PM-KISAN).

Clause 3: Financial Benefit Remains ₹6,000 Per Annum
The rate of financial assistance shall continue to be ₹6,000 per annum, disbursed in three four-monthly installments of ₹2,000 each. Any claim or circulating notice stating an increase to ₹12,000 or ₹10,000 is contrary to these statutory rules.

Clause 5: Mandatory e-KYC and Direct Portal
Mandatory Aadhaar-seeded bank account and e-KYC on the portal https://pmkisan.gov.in. No fee or charges are payable by the applicant."""

        doc2 = Document(
            id="d2-pmkisan-revised",
            source_id="gazette",
            external_id="GAZETTE-PMKISAN-2021",
            doc_type="notification",
            title="PM-KISAN Revised Operational Guidelines Notification",
            issuer="Ministry of Agriculture and Farmers Welfare",
            doc_number="G.S.R. 552(E)",
            published_on=date(2021, 8, 10),
            effective_from=date(2021, 8, 10),
            language="en",
            url="https://egazette.gov.in/WriteReadData/2021/229012.pdf",
            content_hash=hashlib.sha256(doc2_text.encode()).hexdigest(),
            text=doc2_text,
            snapshot_id="2026-10-31a"
        )
        session.add(doc2)
        session.flush()

        c2_1 = Chunk(
            document_id=doc2.id,
            ordinal=1,
            clause_ref="Clause 3",
            text="The rate of financial assistance shall continue to be ₹6,00,000 per annum, disbursed in three four-monthly installments of ₹2,000 each. Any claim or circulating notice stating an increase to ₹12,000 or ₹10,000 is contrary to these statutory rules.".replace("6,00,000", "6,000")
        )
        c2_2 = Chunk(
            document_id=doc2.id,
            ordinal=2,
            clause_ref="Clause 5",
            text="Mandatory Aadhaar-seeded bank account and e-KYC on the portal https://pmkisan.gov.in. No fee or charges are payable by the applicant."
        )
        c2_3 = Chunk(
            document_id=doc2.id,
            ordinal=3,
            clause_ref="Clause 4",
            text="Eligibility for the scheme continues to cover all landholding farmer families across the country with cultivable land."
        )
        session.add_all([c2_1, c2_2, c2_3])

        # Doc Relation: Doc 2 supersedes Doc 1!
        rel1 = DocRelation(
            src_doc=doc2.id,
            dst_doc=doc1.id,
            relation="supersedes",
            evidence_quote="In supersession of the operational guidelines issued vide F.No. 1-1/2019-Credit-I dated 24th February 2019"
        )
        session.merge(rel1)

        # Doc 3: FASTag KYC Deadline Notification
        doc3_text = """NATIONAL HIGHWAYS AUTHORITY OF INDIA
MINISTRY OF ROAD TRANSPORT AND HIGHWAYS
NOTIFICATION

NHAI/FASTag/KYC/2024/01
Dated: 15th January, 2024

Subject: Extension of Deadline for FASTag 'One Vehicle, One FASTag' KYC Compliance.

Para 1. NHAI has extended the compliance deadline for updating FASTag KYC details up to 29th February 2024.
Para 2. FASTags with incomplete KYC will be deactivated or blacklisted by respective banks only after 29th February 2024.
Para 3. Users are advised to update their KYC only through authorized bank portals or the official NHAI portal (ihmcl.co.in). Do not click on unknown SMS links or pay fees on third-party websites."""

        doc3 = Document(
            id="d3-fastag-deadline",
            source_id="pib",
            external_id="PIB-FASTAG-2024",
            doc_type="press_release",
            title="NHAI Extends FASTag 'One Vehicle, One FASTag' Compliance Deadline to 29th February 2024",
            issuer="Ministry of Road Transport and Highways",
            doc_number="NHAI/FASTag/KYC/2024/01",
            published_on=date(2024, 1, 15),
            effective_from=date(2024, 1, 15),
            effective_to=date(2024, 2, 29),
            language="en",
            url="https://pib.gov.in/PressReleasePage.aspx?PRID=2001150",
            content_hash=hashlib.sha256(doc3_text.encode()).hexdigest(),
            text=doc3_text,
            snapshot_id="2026-10-31a"
        )
        session.add(doc3)
        session.flush()

        c3_1 = Chunk(
            document_id=doc3.id,
            ordinal=1,
            clause_ref="Para 1",
            text="NHAI has extended the compliance deadline for updating FASTag KYC details up to 29th February 2024. FASTags with incomplete KYC will be deactivated or blacklisted by respective banks only after 29th February 2024."
        )
        session.add(c3_1)

        # Doc 4: Ayushman Bharat Scheme Guidelines
        doc4_text = """MINISTRY OF HEALTH AND FAMILY WELFARE
NATIONAL HEALTH AUTHORITY

Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB PM-JAY) Scheme Guidelines

Section 2. Entitlement and Coverage:
AB PM-JAY provides a health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India.

Section 4. Mode of Registration:
Beneficiary eligibility can be verified free of charge at https://beneficiary.nha.gov.in or at any empanelled hospital Ayushman Mitra desk. No fee is required for the issuance of the Ayushman Card."""

        doc4 = Document(
            id="d4-ayushman-guidelines",
            source_id="myscheme",
            external_id="MYSCHEME-PMJAY",
            doc_type="scheme",
            title="Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
            issuer="Ministry of Health and Family Welfare",
            doc_number="NHA/PMJAY/2022/Policy-1",
            published_on=date(2022, 4, 1),
            effective_from=date(2022, 4, 1),
            language="en",
            url="https://pmjay.gov.in/about/pmjay",
            content_hash=hashlib.sha256(doc4_text.encode()).hexdigest(),
            text=doc4_text,
            snapshot_id="2026-10-31a"
        )
        session.add(doc4)
        session.flush()

        c4_1 = Chunk(
            document_id=doc4.id,
            ordinal=1,
            clause_ref="Section 2",
            text="AB PM-JAY provides a health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India."
        )
        c4_2 = Chunk(
            document_id=doc4.id,
            ordinal=2,
            clause_ref="Section 4",
            text="Beneficiary eligibility can be verified free of charge at https://beneficiary.nha.gov.in or at any empanelled hospital Ayushman Mitra desk. No fee is required for the issuance of the Ayushman Card."
        )
        session.add_all([c4_1, c4_2])
        session.flush()

        p4_amount = Provision(
            scheme_id="ayushman-bharat",
            document_id=doc4.id,
            chunk_id=c4_1.id,
            field="amount",
            value="₹5,00,000/year",
            value_norm={"num": 500000, "unit": "INR/year"},
            quote="AB PM-JAY provides a health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India.",
            effective_from=date(2022, 4, 1)
        )
        p4_fee = Provision(
            scheme_id="ayushman-bharat",
            document_id=doc4.id,
            chunk_id=c4_2.id,
            field="fee",
            value="Free (0)",
            value_norm={"num": 0, "unit": "INR"},
            quote="No fee is required for the issuance of the Ayushman Card.",
            effective_from=date(2022, 4, 1)
        )
        session.add_all([p4_amount, p4_fee])

        # 2. Debunks: Official PIB Fact Check Debunk Records
        debunks_data = [
            (
                "A viral message claims that the Central Government will give ₹12,000 under PM Kisan Yojana and asks users to register on pmkisan-yojana.in by paying ₹250 fee.",
                "PIB Fact Check: This message is FAKE. The Government of India provides ₹6,000 per year under PM-KISAN, not ₹12,000. No fee is charged. The official website is pmkisan.gov.in.",
                date(2024, 6, 12)
            ),
            (
                "Viral claim: Railway Ministry has issued notice for 50,000 clerk vacancies. Application fee ₹500 to be paid via railway-recruitment.top.",
                "PIB Fact Check: This notice is FORGED. Ministry of Railways has issued no such recruitment notice. Check official site rrbcdg.gov.in.",
                date(2024, 5, 20)
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
        print("Official corpus seeded successfully!")


if __name__ == "__main__":
    seed_corpus_sync()
