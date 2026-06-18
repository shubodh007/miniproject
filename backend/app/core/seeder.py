import logging
from app.services.rag import rag_service
from app.models.ingest import BaseSchemeIngest

logger = logging.getLogger("schemeconnect.seeder")

# Complete detailed datasets for the 10 welfare schemes
SCHEMES_TO_SEED = [
    BaseSchemeIngest(
        name="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        name_te="పీఎం-కిసాన్ (ప్రధానమంత్రి కిసాన్ సమ్మాన్ నిధి)",
        description=(
            "PM-KISAN is a central sector scheme with 100% funding from Government of India. "
            "It provides critical financial assistance to all landholding farmer families across India "
            "to support their agricultural input costs and household needs. The scheme transfers a "
            "direct income support of Rs. 6,000 per year in three equal installments directly into the "
            "bank accounts of eligible landholding farmers."
        ),
        description_te=(
            "పీఎం-కిసాన్ అనేది భారత ప్రభుత్వం యొక్క 100% నిధులతో కూడిన వ్యవసాయ ఆర్థిక మద్దతు పథకం. "
            "ఇది దేశవ్యాప్తంగా సాగు భూమి ఉన్న రైతు కుటుంబాలకు వ్యవసాయ పెట్టుబడులు మరియు గృహ అవసరాల కోసం ఏటా రూ. 6,000 ఆర్థిక సహాయం అందిస్తుంది."
        ),
        benefit_details="Rs. 6,000 per year transferred in three equal installments of Rs. 2,000 each directly via Aadhaar-enabled DBT every year.",
        benefit_details_te="ఏటా రూ. 6,000 ఆర్థిక సాయం, మూడు విడతల్లో తలా రూ. 2,000 చొప్పున నేరుగా తల్లులు లేదా రైతుల ఆధార్ లింక్డ్ బ్యాంక్ ఖాతాల్లో జమ చేయబడుతుంది.",
        eligibility_rules={
            "requires_land": True,
            "min_age": 18,
            "max_age": 110,
            "max_income": 1500000,
            "applicable_states": ["Andhra Pradesh", "Telangana"],
            "government_employees_excluded": True,
            "tax_payers_excluded": True
        },
        docs_required=["Aadhaar Card", "Bank Passbook with verified accounts", "Land Records (Pahani/Adangal) or CCRC Certificate", "Aadhaar-linked Mobile Number"],
        docs_required_te=["ఆధార్ కార్డు", "బ్యాంక్ పాస్ పుస్తకం", "పట్టాదారు పాస్ బుక్ లేదా అడంగల్ / సిసిఆర్‌సి పత్రం", "ఆధార్ తో అనుసంధానించబడిన మొబైల్ నంబర్"],
        state="Central",
        category="Agriculture",
        external_url="https://pmkisan.gov.in/"
    ),
    BaseSchemeIngest(
        name="Jagananna Amma Vodi",
        name_te="జగనన్న అమ్మ ఒడి",
        description=(
            "The flagship Jagananna Amma Vodi scheme is designed to support poor and vulnerable mothers "
            "in Andhra Pradesh, encouraging them to send their children to schools. It helps meet study "
            "needs from classes 1st and up to Intermediate (Class 12) across recognized schools. "
            "The program enforces the Right to Education and aims to eliminate child labor by assuring direct financial support."
        ),
        description_te=(
            "ఆంధ్రప్రదేశ్ ప్రభుత్వం ప్రతిష్టాత్మకంగా పేద తల్లుల కోసమై చేపట్టిన పథకం 'అమ్మ ఒడి'. "
            "ఈ పథకం ద్వారా ఒకటో తరగతి నుండి ఇంటర్మీడియట్ (12వ తరగతి) వరకు చదువుతున్న పిల్లలను బడులకు పంపే ప్రతీ పేద తల్లికి ఏటా రూ. 15,000 అందిస్తారు."
        ),
        benefit_details="Direct financial support of Rs. 15,000 per year deposited directly into the bank account of the mother or guardian.",
        benefit_details_te="తల్లి లేదా సంరక్షకురాలి బ్యాంకు ఖాతాలోకి నేరుగా ప్రతి సంవత్సరం రూ. 15,000 నగదు బదిలీ చేయబడుతుంది.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 5,
            "max_age": 18,
            "min_school_attendance": "75%",
            "max_income": 144000,
            "applicable_states": ["Andhra Pradesh"],
            "electricity_limit": "300 units/mo",
            "government_employees_excluded": True
        },
        docs_required=["Mother's Aadhaar Card", "Child's Aadhaar Card", "White Household Rice Card (Ration Card)", "School Study Certificate with 75% attendance", "Aadhaar-linked Bank Passbook"],
        docs_required_te=["తల్లి ఆధార్ కార్డు", "విద్యార్థి ఆధార్ కార్డు", "బిపిఎల్ రైస్ కార్డ్ (వైట్ రేషన్ కార్డు)", "పాఠశాల 75 శాతం హాజరు ధ్రువీకరణ పత్రం", "బ్యాంక్ ఖాతా వివరాలు"],
        state="Andhra Pradesh",
        category="Education",
        external_url="https://jaganannaammavodi.ap.gov.in/"
    ),
    BaseSchemeIngest(
        name="Telangana Rythu Bharosa (formerly Rythu Bandhu)",
        name_te="తెలంగాణ రైతు భరోసా (రైతు బంధు)",
        description=(
            "Telangana Rythu Bharosa is a flagship land support initiative by the Telangana State Government. "
            "It assists farmers with seed, pesticide, fertilizer and overall farm development investment support. "
            "The scheme has been significantly expanded to protect small and marginal farmers from predatory private moneylenders "
            "and encourage modern high-yield output crops."
        ),
        description_te=(
            "తెలంగాణ రైతు భరోసా అనేది తెలంగాణ రాష్ట్ర రైతుల పెట్టుబడి మద్దతు పథకం. "
            "రైతులకు విత్తనాలు, ఎరువులు మరియు వ్యవసాయ పెట్టుబడుల రక్షణగా ప్రతి సంవత్సరం ఎకరాకు నిర్దేశిత ఆర్థిక సహాయం అందిస్తుంది."
        ),
        benefit_details="Financial relief of Rs. 12,000 per acre per year transferred to landholders and tenant farmers alike.",
        benefit_details_te="ఎకరాకు ఏటా రూ. 12,000 నేరుగా అర్హులైన రైతుల బ్యాంకు ఖాతాలలో రెండు దఫాలుగా డిపాజిట్ చేయబడుతుంది.",
        eligibility_rules={
            "requires_land": True,
            "min_age": 18,
            "max_age": 110,
            "max_income": 99999999,
            "applicable_states": ["Telangana"],
            "requires_pattadar_passbook": True
        },
        docs_required=["Pattadar Passbook or tenant cultivation CRCC Agreement", "Aadhaar Card", "Bank Account Details", "Forest Rights Record (for tribal farmers)"],
        docs_required_te=["పట్టాదారు పాస్ పుస్తకం లేదా కౌలు రైతు సాగు ఒప్పందపత్రం", "ఆధార్ కార్డు", "బ్యాంక్ పాస్ బుక్", "పరిధి అటవీ హక్కుల ధృవీకరణ పత్రం"],
        state="Telangana",
        category="Agriculture",
        external_url="https://rythubandhu.telangana.gov.in/"
    ),
    BaseSchemeIngest(
        name="AP Aarogyasri Health Care Trust",
        name_te="ఆంధ్రప్రదేశ్ ఆరోగ్యశ్రీ హెల్త్ కేర్ ట్రస్ట్",
        description=(
            "AP YSR Aarogyasri is a comprehensive cashless family healthcare program. "
            "It covers standard, super-specialty, surgical and therapeutic procedures for low and middle-income families "
            "across major recognized government and private network hospitals. This prevents families from entering debt traps during emergencies."
        ),
        description_te=(
            "వైఎస్సార్ ఆరోగ్యశ్రీ అనేది ఆంధ్రప్రదేశ్ లోని పేద మరియు మధ్యతరగతి కుటుంబాలకు పూర్తి ఉచిత వైద్య సహాయాన్ని అందించే పథకం. "
            "ఇది గుర్తింపు పొందిన సూపర్ స్పెషాలిటీ ఆసుపత్రులలో నగదు రహిత చికిత్సను అందిస్తుంది."
        ),
        benefit_details="Cashless medical treatment insurance coverage of up to Rs. 15,000,000 per family per year, spanning more than 2,000 health ailments.",
        benefit_details_te="కుటుంబానికి సంవత్సరానికి రూ. 15 లక్షల వరకు ఉచిత క్యాష్‌ లెస్ వైద్య చికిత్స మరియు శస్త్రచికిత్సల బీమా సౌకర్యం.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 0,
            "max_age": 110,
            "max_income": 500000,
            "applicable_states": ["Andhra Pradesh"],
            "must_be_bpl_cardholder": True
        },
        docs_required=["Aadhaar Card", "White / BPL Ration Card", "Income Certificate for proof", "State Residence Proof"],
        docs_required_te=["ఆధార్ కార్డు", "వైట్ రైస్ కార్డ్", "ఆదాయ ధ్రువీకరణ పత్రం", "నివాస ధృవీకరణ పత్రం"],
        state="Andhra Pradesh",
        category="Health",
        external_url="https://aarogyasri.ap.gov.in/"
    ),
    BaseSchemeIngest(
        name="Telangana Aarogyasri Health Scheme",
        name_te="తెలంగాణ ఆరోగ్యశ్రీ హెల్త్ స్కీమ్",
        description=(
            "Telangana Aarogyasri Health Program provides cashless multi-specialty care and dynamic health "
            "insurance for economically backward classes. Eligible families receive high-quality tertiary surgeries "
            "and long-term clinical treatments in accredited corporate hospitals absolutely free."
        ),
        description_te=(
            "తెలంగాణ ఆరోగ్యశ్రీ పథకం ద్వారా ఆర్థికంగా వెనుకబడిన కుటుంబాలకు నగదు రహిత వైద్య సహాయాన్ని లభిస్తుంది. "
            "గుర్తింపు పొందిన నెట్‌వర్క్ కార్పొరేట్ ఆసుపత్రులలో ఉచిత శస్త్రచికిత్సలు మరియు చికిత్స లభిస్తుంది."
        ),
        benefit_details="Comprehensive cashless health service limit of up to Rs. 1,000,000 annually per family for clinical support and post-surgery care.",
        benefit_details_te="ప్రతి కుటుంబానికి ఏటా రూ. 10 లక్షల వరకు ఉచిత క్యాష్‌ లెస్ కార్పొరేట్ వైద్య బీమా రక్షణ.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 0,
            "max_age": 110,
            "max_income": 500000,
            "applicable_states": ["Telangana"],
            "bpl_ration_card_required": True
        },
        docs_required=["Aadhaar Card", "Food Security Card (Ration Card)", "Income Certificate from Mandal development offices", "Active Residence Proof"],
        docs_required_te=["ఆధార్ కార్డు", "ఆహార భద్రత కార్డు (రేషన్ కార్డ్)", "ఆదాయ ధ్రువీకరణ పత్రం", "స్థానిక నివాస నిరూపణ ప్రతాలు"],
        state="Telangana",
        category="Health",
        external_url="https://aarogyasri.telangana.gov.in/"
    ),
    BaseSchemeIngest(
        name="PMAY-Gramin (Pradhan Mantri Awaas Yojana - Rural)",
        name_te="పీఎం ఆవాస్ యోజన - గ్రామీణ్",
        description=(
            "Pradhan Mantri Awaas Yojana - Gramin is a social welfare program aiming to provide environmental "
            "and structural pucca houses with safe toilets and water layouts to all rural homeless families "
            "or families living in dilapidated houses."
        ),
        description_te=(
            "ప్రధానమంత్రి ఆవాస్ యోజన - గ్రామీణ్ పథకం ద్వారా గ్రామీణ ప్రాంతాల్లో ఇళ్లు లేని పేదలకు రూ. 1.20 లక్షల ఆర్థిక నిర్మాణ సహాయాన్ని అందిస్తారు."
        ),
        benefit_details="Direct financial support of Rs. 120,000 for rural area house construction, coupled with toilet construction assistance from Swachh Bharat.",
        benefit_details_te="గ్రామీణ ప్రాంతాల్లో పక్కా గృహాల నిర్మాణం కొరకై నేరుగా రూ. 1.20 లక్షల నగదు బదిలీ మరియు ఉపాధి హామీ పథకంతో అనుసంధానించబడిన శ్రామిక సహాయం.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 18,
            "max_age": 110,
            "max_income": 300000,
            "applicable_states": ["Andhra Pradesh", "Telangana"],
            "must_not_own_pucca_house": True
        },
        docs_required=["Aadhaar Card", "Rural BPL Ration Card / SECC list verification", "Aadhaar linked Bank Account", "Land Title Deeds (Possession Certificate)"],
        docs_required_te=["ఆధార్ కార్డు", "బిపిఎల్ రేషన్ కార్డు", "బ్యాంక్ ఖాతా వివరాలు", "స్థలం సాగు/పట్టా యాజమాన్య పత్రాలు"],
        state="Central",
        category="Housing",
        external_url="https://pmayg.nic.in/"
    ),
    BaseSchemeIngest(
        name="Kalyana Lakshmi / Shaadi Mubarak (AP)",
        name_te="కళ్యాణ లక్ష్మీ పథకం (ఆంధ్రప్రదేశ్)",
        description=(
            "AP Chandranna Pelli Kanuka or Kalyana Lakshmi scheme provides financial marriage gift grants "
            "to brides from low income communities, including schedule castes, tribes, minorities and backward classes. "
            "This targets preventing child marriages by enforcing age checks during mandatory registration."
        ),
        description_te=(
            "హేతుబద్ధమైన బాల్య వివాహాల నిరోధానికి మరియు సమాజంలో పేద ఆడపడుచుల వివాహ ఖర్చులకు ఆర్థిక సహాయంగా ఆంధ్రప్రదేశ్ ప్రభుత్వం ఈ కళ్యాణ కానుకను అందజేస్తుంది."
        ),
        benefit_details="One-time cash relief support of Rs. 75,116 for wedding arrangements transferred into the bride's verified bank account.",
        benefit_details_te="ఆడబిడ్డల పెళ్లి ఖర్చుల నిమిత్తం నేరుగా రూ. 75,116 ఏకమొత్తం ఆర్థిక ప్రోత్సాహకం బదిలీ చేయబడుతుంది.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 18,
            "max_age": 110,
            "max_income": 200000,
            "applicable_states": ["Andhra Pradesh"],
            "female_only": True,
            "requires_marriage_registration": True
        },
        docs_required=["Bride & Bridegroom Aadhaar Cards", "Official Caste Certificate", "Household Income Proof Certificate", "Registration application with wedding card", "Bride's Bank Account Book"],
        docs_required_te=["వధూవరుల ఆధార్ కార్డులు", "కుల ధృవీకరణ పత్రం", "ఆదాయ ధ్రువీకరణ పత్రం", "లగ్నపత్రిక మరియు దరఖాస్తు పత్రం", "వధువు బ్యాంక్ పాస్ బుక్"],
        state="Andhra Pradesh",
        category="Women & Child",
        external_url="https://anantapur.ap.gov.in/kalyanam"
    ),
    BaseSchemeIngest(
        name="Kalyana Lakshmi / Shaadi Mubarak (Telangana)",
        name_te="కళ్యాణ లక్ష్మీ పథకం (తెలంగాణ)",
        description=(
            "This scheme provides crucial financial support for marriage expenditures to brides belonging "
            "to SC, ST, OBC and backward classes in Telangana. The program’s rules assist families "
            "and eliminate illegal debt burdens during wedding planning."
        ),
        description_te=(
            "తెలంగాణ కళ్యాణ లక్ష్మి మరియు షాదీ ముబారక్ పథకం ద్వారా పేద ఆడపిల్లల పెళ్లిళ్లకు ఆర్థిక భరోసా కల్పిస్తూ ఏకమొత్తంగా నగదు సాయాన్ని అందజేస్తున్న ప్రముఖ ప్రభుత్వ సామాజిక పథకం."
        ),
        benefit_details="Direct financial assist of Rs. 101,116 deposited as a gift directly into the bride's mother's or bride's active bank account.",
        benefit_details_te="అర్హులైన ఆడబిడ్డల పెళ్లి కొరకై ప్రభుత్వ వివాహ మద్దతు బహుమతిగా ఏకమొత్తంగా రూ. 1,01,116 చెల్లించబడుతుంది.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 18,
            "max_age": 110,
            "max_income": 200000,
            "applicable_states": ["Telangana"],
            "female_only": True
        },
        docs_required=["Aadhaar Card of Bride and Mother", "Official Caste Verification Certificate", "Income Certificate from legal Tehsildar", "Wedding invitation card with wedding photos", "Mother's bank book photocopy"],
        docs_required_te=["వధువు మరియు తల్లి ఆధార్ కార్డులు", "కుల ధృవీకరణ పత్రం", "తహశీల్దార్ నమోదు చేసిన ఆదాయ ధ్రువీకరణ", "లగ్నపత్రిక మరియు ఫోటోలు", "తల్లి బ్యాంక్ పాస్ బుక్"],
        state="Telangana",
        category="Women & Child",
        external_url="https://telanganaepass.cgg.gov.in/"
    ),
    BaseSchemeIngest(
        name="NTR Bharosa Pension",
        name_te="ఎన్టీఆర్ భరోసా పెన్షన్",
        description=(
            "The NTR Bharosa Pension program provides security, dignity and living financial help to "
            "vulnerable classes in Andhra Pradesh, including senior citizens (Old Age Pensioners), "
            "widows, single women, disabled individuals and weavers."
        ),
        description_te=(
            "ఆంధ్రప్రదేశ్ సామాజిక రక్షణ పింఛను పథకం ద్వారా వృద్ధులు, వితంతువులు, ఒంటరి మహిళలు మరియు చేనేత కార్మికులకు సామాజిక భద్రత కల్పిస్తూ ప్రతి నెలా పింఛను సరఫరా చేస్తారు."
        ),
        benefit_details="Monthly cash assistance of Rs. 2,750 delivered directly via village ward volunteer services to ensure hassle-free support.",
        benefit_details_te="వృద్ధాప్య లేదా వితంతువుల పింఛను క్రింద ప్రతి నెలా రూ. 2,750 నగదు నేరుగా స్వచ్ఛంద లబ్ధిదారు సచివాలయాల ద్వారా పంపిణీ చేయబడుతుంది.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 60,
            "max_age": 110,
            "max_income": 120000,
            "applicable_states": ["Andhra Pradesh"],
            "must_be_state_resident": True
        },
        docs_required=["Aadhaar Card", "Age Proof (Birth Certificate or school registration)", "Mandal Income validation card", "Active local Residential certificate / voter list proof"],
        docs_required_te=["ఆధార్ కార్డు", "వయస్సు నిర్ధారణ పత్రం (జనన ధ్రువీకరణ పత్రం)", "ఆదాయ ధృవీకరణ", "నివాస స్థల రేషన్ పత్రాలు"],
        state="Andhra Pradesh",
        category="Social Security",
        external_url="https://navaratnalu.ap.gov.in/"
    ),
    BaseSchemeIngest(
        name="Gruha Jyothi Free Electricity (Telangana)",
        name_te="గృహ జ్యోతి ఉచిత విద్యుత్ (తెలంగాణ)",
        description=(
            "Gruha Jyothi Free Domestic Electricity scheme provides relief from monthly utilities costs "
            "for poor households in Telangana. Families consuming less than 200 units a month "
            "are fully exempt from electricity bill payments."
        ),
        description_te=(
            "తెలంగాణ గృహ జ్యోతి పథకం ద్వారా పేద మధ్యతరగతి గృహాలకు ప్రతి నెలా 200 యూనిట్ల వరకు ఉచిత గృహ విద్యుత్తు ప్రయోజనాన్ని అందజేస్తుంది."
        ),
        benefit_details="Free zero-electricity bill benefits up to 200 units of domestic consumption per household.",
        benefit_details_te="నెలవారి గృహ విద్యుత్ వినియోగం 200 యూనిట్ల లోపు ఉన్న అర్హులైన కుటుంబాలకు పూర్తి ఉచిత కరెంట్ బిల్లు మినహాయింపు.",
        eligibility_rules={
            "requires_land": False,
            "min_age": 18,
            "max_age": 110,
            "max_income": 250000,
            "applicable_states": ["Telangana"],
            "consumption_limit_monthly": 200
        },
        docs_required=["Aadhaar Card", "Recent raw Electricity Bill containing USC number", "Telangana Food Security Card (Ration Card)", "Property tax receipt or active lease deed"],
        docs_required_te=["ఆధార్ కార్డు", "ఇంటి విద్యుత్ కనెక్షన్ కరెంట్ బిల్లు", "ఉచిత మద్దతు రేషన్ కార్డు", "ఇంటి యాజమాన్య పత్రాలు లేదా కౌలు పత్రం"],
        state="Telangana",
        category="Social Security",
        external_url="https://telanganaepass.cgg.gov.in/"
    )
]

def seed_initial_schemes():
    """
    Idempotent check and seed procedure: Ingests missing schemes from the 10 core schemes.
    """
    logger.info("Verifying existing database schemes registration status...")
    try:
        supabase = rag_service.supabase
        logger.info("Comparing local welfare policies list against active database registrations...")
        for idx, sc_item in enumerate(SCHEMES_TO_SEED):
            try:
                # Check if this specific scheme already exists in database
                existing = supabase.table("schemes").select("id").eq("name", sc_item.name).limit(1).execute()
                if existing.data:
                    logger.info(f"Scheme '{sc_item.name}' already registered ({idx+1}/10). Skipping duplicate ingestion.")
                    continue

                logger.info(f"Seeding '{sc_item.name}' [{idx+1}/10] with automated embedding generation...")
                rag_service.ingest_scheme(sc_item)
            except Exception as inner_e:
                logger.error(f"Failed to seed scheme '{sc_item.name}': {str(inner_e)}")
        logger.info("✔ Seed synchronization procedure completed successfully.")
    except Exception as e:
        import traceback
        logger.error("SEEDER FAILURE START")
        logger.error(f"Exception Type: {type(e).__name__}")
        logger.error(f"Exception Message: {str(e)}")
        logger.error(traceback.format_exc())
        logger.error("SEEDER FAILURE END")
