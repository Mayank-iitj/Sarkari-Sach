from __future__ import annotations
import re
from typing import Any
from app.nlp.normalize import parse_inr, parse_date


class FakeClient:
    """
    Deterministic rule-based LLM mock.
    Performs real extraction, comparison with verbatim chunk quotes, and explanation generation.
    Enables 100% offline testing, zero-cost development, and instant demo replay.
    """

    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        user_str = str(user)

        # 1. Extraction flow
        if "Extract verifiable claims" in system or "contains_government_claim" in str(schema):
            # Check prompt injection fixtures
            if "ignore previous instructions" in user_str.lower() or "disregard all previous" in user_str.lower():
                # Safe fallback: still treat as data or return no claims
                pass

            # Extract links and bare domain names (including unicode/Devanagari scripts)
            links = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+|[^\s<>"/]+\.(?:in|com|org|net|xyz|top|site|icu|cfd|in\.net|gov\.in|nic\.in)[/\w\-\.]*', user_str, re.IGNORECASE | re.UNICODE)
            # Detect scheme name
            scheme = None
            scheme_en = None
            u_low = user_str.lower()
            if "kisan" in u_low or "किसान" in user_str:
                scheme = "पीएम किसान सम्मान निधि"
                scheme_en = "PM-KISAN"
            elif "fastag" in u_low or "फास्टैग" in user_str:
                scheme = "फास्टैग केवाईसी"
                scheme_en = "FASTag KYC"
            elif "ayushman" in u_low or "आयुष्मान" in user_str:
                scheme = "आयुष्मान भारत"
                scheme_en = "Ayushman Bharat"
            elif "scholarship" in u_low or "छात्रवृत्ति" in user_str:
                scheme = "राष्ट्रीय छात्रवृत्ति"
                scheme_en = "National Scholarship"
            elif "aadhaar" in u_low or "आधार" in user_str:
                scheme = "आधार कार्ड"
                scheme_en = "Aadhaar"
            elif "ladli" in u_low or "लाडली" in user_str:
                scheme = "लाडली बहना योजना"
                scheme_en = "Ladli Behna Yojana"

            # Check if input has any verifiable claim
            if not scheme and not links and not any(k in u_low for k in ["yojana", "योजना", "rupees", "₹", "rs", "deadline", "last date", "अंतिम तिथि", "fee", "शुल्क", "gov"]):
                # Vague rumor / non-government input -> abstain
                return {
                    "contains_government_claim": False,
                    "reason": "No verifiable government claim or scheme identified in text",
                    "claims": []
                }

            # Extract fields
            fields = {}
            # Amount
            inr = parse_inr(user_str)
            if inr:
                fields["amount"] = {
                    "value": f"₹{inr['num']:,}" + ("/year" if inr.get("unit") == "INR/year" else ""),
                    "norm": inr,
                    "confidence": 0.92
                }

            # Deadline - only extract when explicit deadline phrasing exists
            if any(k in u_low for k in ["deadline", "last date", "अंतिम", "valid until", "before", "till", "due", "deactivated"]):
                d_val = parse_date(user_str)
                if d_val:
                    fields["deadline"] = {
                        "value": d_val,
                        "norm": {"date": d_val},
                        "confidence": 0.88
                    }

            # Fee
            fee_match = re.search(
                r'(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)[^.,\n]{0,25}?(?:₹|rs\.?|रु\.?)?\s*([\d,]+)|(?:₹|rs\.?|रु\.?)?\s*([\d,]+)[^.,\n]{0,25}?(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)',
                user_str,
                re.IGNORECASE
            )
            if fee_match:
                raw_num = fee_match.group(1) or fee_match.group(2)
                fee_num = int(raw_num.replace(",", ""))
                fields["fee"] = {
                    "value": f"₹{fee_num}",
                    "norm": {"num": fee_num, "unit": "INR"},
                    "confidence": 0.95
                }
            elif "free" in u_low or "निःशुल्क" in user_str or "कोई शुल्क नहीं" in user_str:
                fields["fee"] = {
                    "value": "Free / Nil",
                    "norm": {"num": 0, "unit": "INR"},
                    "confidence": 0.95
                }

            # Benefit
            if "12,000" in user_str or "12000" in user_str:
                fields["benefit"] = {"value": "₹12,000 per year assistance", "confidence": 0.9}
            elif "6,000" in user_str or "6000" in user_str:
                fields["benefit"] = {"value": "₹6,000 per year in 3 installments", "confidence": 0.9}
            elif "5,000" in user_str or "5000" in user_str:
                fields["benefit"] = {"value": "₹5,000 cash grant", "confidence": 0.9}

            # Eligibility
            if any(k in user_str.lower() for k in ["women", "5 acres", "पात्रता", "eligibility", "landholding"]):
                fields["eligibility"] = {
                    "value": "women farmers > 5 acres" if ("women" in user_str.lower() or "5 acres" in user_str.lower()) else "landholding farmers",
                    "confidence": 0.88
                }

            clean_claim_text = user_str.replace("<untrusted_input>", "").replace("</untrusted_input>", "").strip()

            return {
                "contains_government_claim": True,
                "reason": None,
                "claims": [{
                    "claim_text": clean_claim_text[:300],
                    "scheme_name": scheme,
                    "scheme_name_en": scheme_en,
                    "issuer_claimed": "Government of India",
                    "fields": fields,
                    "links": links,
                    "phone_numbers": [],
                    "doc_identifiers": []
                }]
            }

        # 2. Field-wise comparison flow
        if "Compare each claimed field" in system or "same_scheme" in str(schema):
            # Parse chunks out of user text (support both single and double quotes)
            chunk_matches = re.findall(
                r'<official_passage id=[\'"]([^\'"]+)[\'"] doc=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</official_passage>',
                user_str,
                re.DOTALL
            )
            if not chunk_matches:
                return {"same_scheme": "false", "best_chunk_id": None, "fields": {}}

            # Check best chunk
            best_chunk_id = chunk_matches[0][0]
            chunk_title = chunk_matches[0][1]
            chunk_text = chunk_matches[0][2]

            def find_chunk_id(q_str: str) -> str:
                for cid, ctitle, ctxt in chunk_matches:
                    if q_str in ctxt or q_str[:30] in ctxt:
                        return cid
                return best_chunk_id

            claim_m = re.search(r'<claim>(.*?)</claim>', user_str, re.DOTALL)
            claim_content = claim_m.group(1).lower() if claim_m else user_str.lower()

            same_scheme = "true" if any(w in (chunk_title + " " + chunk_text).lower() for w in ["kisan", "pm-kisan", "fastag", "ayushman", "scholarship", "aadhaar"]) else "unsure"

            # Compare fields
            comp_fields = {}

            # Amount check
            if any(k in claim_content for k in ["amount", "12000", "12,000", "10000", "10,000", "6000", "6,000", "500000", "5,00,000", "10 lakh", "10,00,000", "10 लाख", "5 lakh", "5 लाख", "25000", "25,000"]):
                # Ayushman 10 lakh vs 5 lakh
                if any(x in claim_content for x in ["10 lakh", "10,00,000", "10 लाख"]) and any(x in chunk_text for x in ["5,00,000", "5 lakh", "500000"]):
                    quote_str = "AB PM-JAY provides a health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India."
                    comp_fields["amount"] = {
                        "comparison": "mismatch",
                        "claim_value": "₹10,00,000",
                        "official_value": "₹5,00,000",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }
                elif any(x in claim_content for x in ["5 lakh", "5,00,000", "5 लाख"]) and any(x in chunk_text for x in ["5,00,000", "5 lakh", "500000"]):
                    quote_str = "AB PM-JAY provides a health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India."
                    comp_fields["amount"] = {
                        "comparison": "match",
                        "claim_value": "₹5,00,000",
                        "official_value": "₹5,00,000",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }
                # PM-KISAN 12000 / 10000 vs 6000
                elif any(x in claim_content for x in ["12000", "12,000", "10000", "10,000"]):
                    quote_str = "The rate of financial assistance shall continue to be ₹6,000 per annum, disbursed in three four-monthly installments of ₹2,000 each."
                    comp_fields["amount"] = {
                        "comparison": "mismatch",
                        "claim_value": "₹12,000/year" if "12" in claim_content else "₹10,000/year",
                        "official_value": "₹6,000/year",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }
                elif any(x in claim_content for x in ["6000", "6,00,000", "6,000"]):
                    quote_str = "The rate of financial assistance shall continue to be ₹6,000 per annum, disbursed in three four-monthly installments of ₹2,000 each."
                    comp_fields["amount"] = {
                        "comparison": "match",
                        "claim_value": "₹6,000/year",
                        "official_value": "₹6,000/year",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }
                else:
                    comp_fields["amount"] = {"comparison": "not_stated", "quote": None, "chunk_id": None}

            # Fee check
            if any(x in claim_content for x in ["fee", "free", "शुल्क", "चार्ज", "फीस"]):
                quote_str = "No application fee is charged under this scheme."
                all_chunk_texts = " ".join(ctxt for _, _, ctxt in chunk_matches)
                if "No fee is required for the issuance of the Ayushman Card." in all_chunk_texts:
                    quote_str = "No fee is required for the issuance of the Ayushman Card."
                elif "No fee or charges are payable by the applicant." in all_chunk_texts:
                    quote_str = "No fee or charges are payable by the applicant."
                elif "No application fee is charged under this scheme." in all_chunk_texts:
                    quote_str = "No application fee is charged under this scheme."

                # Check if an unauthorized fee > 0 was claimed
                fee_claim_match = re.search(
                    r'(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)[^.,\n]{0,25}?(?:₹|rs\.?|रु\.?)?\s*([1-9]\d*)|(?:₹|rs\.?|रु\.?)?\s*([1-9]\d*)[^.,\n]{0,25}?(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)',
                    claim_content,
                    re.IGNORECASE
                )
                is_mismatch = bool(fee_claim_match)
                val = f"₹{fee_claim_match.group(1) or fee_claim_match.group(2)} fee" if fee_claim_match else "Free"
                comp_fields["fee"] = {
                    "comparison": "mismatch" if is_mismatch else "match",
                    "claim_value": val if is_mismatch else "Free",
                    "official_value": "Free (No fee)",
                    "quote": quote_str,
                    "chunk_id": find_chunk_id(quote_str)
                }

            if "amount" in comp_fields:
                comp_fields["benefit"] = comp_fields["amount"]

            # Eligibility check
            if "eligibility" in claim_content or "women" in claim_content or "5 acres" in claim_content:
                quote_str = "income support to all landholding farmer families in the country"
                for cid, ctitle, ctxt in chunk_matches:
                    if "all landholding farmer families" in ctxt:
                        quote_str = "income support to all landholding farmer families in the country" if "income support to all landholding farmer families" in ctxt else ctxt[:80]
                        break

                if "women" in claim_content or "5 acres" in claim_content:
                    comp_fields["eligibility"] = {
                        "comparison": "mismatch",
                        "claim_value": "women farmers > 5 acres",
                        "official_value": "all landholding farmer families",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }
                else:
                    comp_fields["eligibility"] = {
                        "comparison": "match",
                        "claim_value": "landholding farmers",
                        "official_value": "all landholding farmer families",
                        "quote": quote_str,
                        "chunk_id": find_chunk_id(quote_str)
                    }

            # Deadline check
            if "deadline" in user_str or "अंतिम" in user_str or "last date" in user_str:
                # Look for dates in chunk
                d_m = re.search(r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})', chunk_text, re.IGNORECASE)
                if d_m:
                    comp_fields["deadline"] = {
                        "comparison": "match",
                        "claim_value": d_m.group(1),
                        "official_value": d_m.group(1),
                        "quote": chunk_text[:120],
                        "chunk_id": best_chunk_id
                    }
                else:
                    comp_fields["deadline"] = {"comparison": "not_stated", "quote": None, "chunk_id": None}

            return {
                "same_scheme": same_scheme,
                "best_chunk_id": best_chunk_id,
                "fields": comp_fields
            }

        # 3. Explanation flow
        if "Write a short, plain explanation" in system:
            lang = "hi"
            if "reply_lang: en" in user_str.lower() or '"lang": "en"' in user_str.lower():
                lang = "en"

            if "FORGED" in user_str:
                if lang == "hi":
                    return {
                        "short": "यह संदेश पूरी तरह नकली है। यह आधिकारिक सरकारी पोर्टल की नकल करके बनाया गया है।",
                        "steps": [
                            "दिए गए लिंक पर बिल्कुल क्लिक न करें।",
                            "अपनी कोई भी निजी जानकारी या बैंक/आधार विवरण साझा न करें।",
                            "असली जानकारी के लिए आधिकारिक वेबसाइट (जैसे pmkisan.gov.in) पर ही जाएं।"
                        ],
                        "tts_text": "सावधान! यह संदेश नकली है। इस लिंक पर क्लिक न करें और कोई शुल्क न दें।"
                    }
                else:
                    return {
                        "short": "This notice is forged and impersonates an official government portal.",
                        "steps": [
                            "Do not click on the link or enter banking details.",
                            "Never pay application fees for free government schemes.",
                            "Verify only through official gov.in portals."
                        ],
                        "tts_text": "Warning! This notice is forged. Do not click the link and do not pay any fee."
                    }

            elif "ALTERED" in user_str:
                if lang == "hi":
                    return {
                        "short": "यह आधिकारिक योजना से संबंधित है, लेकिन संदेश में दी गई राशि या तारीख में हेरफेर किया गया है।",
                        "steps": [
                            "संदेश में दावा गलत है; आधिकारिक सूचना में सही नियम देखें।",
                            "बदले गए आंकड़ों पर विश्वास न करें।"
                        ],
                        "tts_text": "यह संदेश असली सूचना से अलग है। इसमें दी गई राशि को बदल दिया गया है।"
                    }
                else:
                    return {
                        "short": "This forward references a real scheme, but key figures (such as amount or deadline) have been altered.",
                        "steps": [
                            "Official benefits differ from what this forward claims.",
                            "Check the official notification clause cited below."
                        ],
                        "tts_text": "This message is altered. The figures stated differ from official government records."
                    }

            elif "OUTDATED" in user_str:
                if lang == "hi":
                    return {
                        "short": "यह नियम पुराना है और बाद के सरकारी आदेश द्वारा बदल या निरस्त कर दिया गया है।",
                        "steps": [
                            "यह आदेश अब लागू नहीं है।",
                            "नवीनतम संशोधित दिशानिर्देशों का पालन करें।"
                        ],
                        "tts_text": "यह नियम पुराना है और नए सरकारी आदेश द्वारा बदला जा चुका है।"
                    }
                else:
                    return {
                        "short": "This rule is outdated and has been superseded by a later official order.",
                        "steps": [
                            "This order is no longer in effect.",
                            "Consult the latest revised guidelines."
                        ],
                        "tts_text": "This notification is outdated and superseded by newer official orders."
                    }

            elif "CONFIRMED" in user_str:
                if lang == "hi":
                    return {
                        "short": "यह सूचना पूरी तरह सही है और आधिकारिक सरकारी आदेश से प्रमाणित है।",
                        "steps": [
                            "नियम और शर्तें आधिकारिक पोर्टल से मेल खाती हैं।",
                            "आप आधिकारिक पोर्टल पर सुरक्षित रूप से आवेदन कर सकते हैं।"
                        ],
                        "tts_text": "यह सूचना सही और प्रमाणित है। यह आधिकारिक सरकारी आदेश से पूरी तरह मेल खाती है।"
                    }
                else:
                    return {
                        "short": "This claim is confirmed and matches official government notifications.",
                        "steps": [
                            "The terms match current official records.",
                            "Proceed using official government portals."
                        ],
                        "tts_text": "This information is verified and confirmed with official government records."
                    }

            else:  # UNVERIFIABLE
                if lang == "hi":
                    return {
                        "short": "इस दावे की आधिकारिक सरकारी दस्तावेजों से पुष्टि नहीं हो सकी।",
                        "steps": [
                            "जब तक आधिकारिक स्रोत न मिले, इस संदेश को आगे फॉरवर्ड न करें।",
                            "असली सरकारी पोर्टल (pib.gov.in या myscheme.gov.in) पर सीधे जाँचें।"
                        ],
                        "tts_text": "इस दावे की आधिकारिक पुष्टि नहीं हो सकी। कृपया सतर्क रहें।"
                    }
                else:
                    return {
                        "short": "This claim could not be verified against primary government records.",
                        "steps": [
                            "Do not forward unverified claims.",
                            "Check directly on official government portals."
                        ],
                        "tts_text": "This claim could not be verified against official sources. Please exercise caution."
                    }

        return {}

    def text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 400
    ) -> str:
        return "Sarkari Sach Verification Note: Verified against primary government records."
