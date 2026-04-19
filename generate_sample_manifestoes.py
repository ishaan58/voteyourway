"""
generate_sample_manifestoes.py
Creates sample manifesto PDFs for BJP and INC for years 2009, 2014, 2019
Run this once to populate /data/manifestoes/ with sample PDFs.
"""
import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY

DATA_DIR = Path(__file__).parent / "data" / "manifestoes"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_MANIFESTOES = {
    "bjp_2009": {
        "title": "BJP Election Manifesto 2009",
        "party": "Bharatiya Janata Party",
        "content": """
BHARATIYA JANATA PARTY ELECTION MANIFESTO 2009
VISION FOR A STRONG AND PROSPEROUS INDIA

ECONOMY
We will ensure India achieves 9% GDP growth through targeted investments in manufacturing and services.
We shall reduce fiscal deficit to 3% of GDP within three years of assuming power.
We will implement comprehensive tax reforms including GST to create a unified national market.
We commit to doubling agricultural exports by 2014 through market liberalization.
We shall provide zero-interest loans to small and medium enterprises to boost employment.
We will create 5 crore new jobs through industrial expansion and skill development programs.
We commit to reducing inflation below 5% through prudent monetary and fiscal policies.
We shall establish 50 new Special Economic Zones across the country to attract foreign investment.

INFRASTRUCTURE
We will build 5000 km of new National Highways every year under Bharatmala project.
We shall construct 100 new bridges over major rivers to improve connectivity.
We commit to electrifying all villages within two years of coming to power.
We will invest Rs 10 lakh crore in railway modernisation over the next five years.
We shall develop 20 new world-class airports in tier-2 and tier-3 cities.
We commit to providing piped water supply to every household by 2015.
We will build 50 lakh new affordable houses for the urban poor.

EDUCATION
We shall increase public expenditure on education to 6% of GDP.
We will build 1000 new Kendriya Vidyalayas across India in underserved areas.
We commit to universalising secondary education by 2014.
We shall establish 30 new IITs and IIMs across all states.
We will provide free laptops to all students in classes 9 to 12.
We commit to paying teachers a minimum salary of Rs 25000 per month.
We shall make skill development mandatory in all schools and colleges.

HEALTHCARE
We will ensure universal healthcare coverage for all citizens below poverty line.
We shall increase health budget to 3% of GDP within five years.
We commit to establishing a primary health centre in every panchayat.
We will provide free essential medicines to all government hospital patients.
We shall train 10 lakh new doctors and nurses to bridge the healthcare gap.
We commit to making India polio-free and reducing infant mortality to 20 per 1000 by 2015.

AGRICULTURE
We shall ensure minimum support price covers cost of production plus 50% profit.
We will implement comprehensive crop insurance scheme covering all farmers.
We commit to doubling irrigation coverage from 40% to 80% by 2014.
We shall provide zero-interest kisan credit cards to 5 crore farmers.
We will establish cold storage chains in every district to reduce post-harvest losses.
We commit to increasing agricultural research funding by 200%.

WOMEN AND CHILDREN
We shall enact strict laws against dowry, domestic violence and child marriage.
We will reserve 33% seats for women in all government jobs.
We commit to establishing crèches in every government office and large factory.
We shall ensure maternity benefits of 6 months paid leave for all working women.

NATIONAL SECURITY
We will maintain military spending at 3% of GDP to ensure national security.
We shall modernise armed forces with indigenous weapons by 2015.
We commit to establishing a National Counter Terrorism Centre.
We will strengthen border security along all international borders.
"""
    },
    "bjp_2014": {
        "title": "BJP Election Manifesto 2014",
        "party": "Bharatiya Janata Party",
        "content": """
BJP SANKALP PATRA 2014
NATION FIRST, GOOD GOVERNANCE, DEVELOPMENT

ECONOMIC DEVELOPMENT
We will make India a 10 trillion dollar economy by 2030 through aggressive growth policies.
We shall launch Make in India initiative to transform India into a global manufacturing hub.
We commit to implementing GST within the first year to unify the Indian market.
We will create 2 crore jobs every year through MSME growth and startup ecosystem development.
We shall reduce corporate tax to 25% to attract domestic and foreign investment.
We commit to building 100 smart cities with modern infrastructure and digital connectivity.
We will ensure Jan Dhan Yojana provides bank accounts to every household.
We shall privatise loss-making public sector enterprises through a transparent divestment process.

INFRASTRUCTURE AND ENERGY
We shall build 30 km of National Highways per day through accelerated Bharatmala program.
We will construct metro rail networks in all cities with population over 10 lakh.
We commit to providing 24-hour electricity supply to all citizens by 2017.
We shall establish 100 GW of solar power capacity by 2022 under National Solar Mission.
We will complete the dedicated freight corridors to reduce logistics costs by 30%.
We commit to building a national gas grid connecting all states within 5 years.
We shall digitise land records across India to reduce disputes and improve credit access.

EDUCATION AND SKILL DEVELOPMENT
We will launch Skill India program to train 40 crore youth in various vocations by 2022.
We shall establish National Education Policy to overhaul the curriculum for 21st century.
We commit to IIT quality education in all states through National Institutes of Technology.
We will provide digital literacy to 10 crore citizens in rural areas.
We shall link teacher salaries to student outcomes to improve accountability.
We commit to making India the global leader in higher education within 15 years.

HEALTHCARE
We will launch Swachh Bharat Mission to eliminate open defecation by 2019.
We shall establish AIIMS in every state to provide quality tertiary healthcare.
We commit to implementing a National Health Protection Scheme covering 50 crore citizens.
We will provide free medicines under Jan Aushadhi scheme in all government hospitals.
We shall ensure polio and measles elimination by 2016 through expanded immunisation.
We commit to increasing AYUSH budget to promote traditional medicine systems.

AGRICULTURE
We will implement PM KISAN to provide direct income support to farmers.
We shall double farmer income by 2022 through improved MSP and market reforms.
We commit to soil health card scheme for all 14 crore farmer families.
We will connect every agri market through eNAM digital platform.
We shall expand irrigation through PM Sinchai Yojana covering all farm land.
We commit to providing Kisan Credit Cards with interest subvention to all eligible farmers.

WOMEN EMPOWERMENT
We shall launch Beti Bachao Beti Padhao to address falling child sex ratio.
We will provide free education to girls up to graduation level.
We commit to establishing 1000 new one-stop crisis centres for women in distress.
We shall ensure 50% reservation for women in village panchayat leadership.
We will provide Ujjwala LPG connections to 5 crore BPL households free of cost.

DIGITAL INDIA
We commit to providing broadband internet to all 2.5 lakh panchayats by 2017.
We will launch Digital India to transform India into a digitally empowered society.
We shall establish common service centres in every village for digital access.
We commit to enabling cashless transactions and digital payments nationwide.
"""
    },
    "bjp_2019": {
        "title": "BJP Sankalp Patra 2019",
        "party": "Bharatiya Janata Party",
        "content": """
BJP SANKALP PATRA 2019
SANKALPIT BHARAT, SASHAKT BHARAT

ECONOMY
We will make India a 5 trillion dollar economy by 2024-25.
We shall invest Rs 100 lakh crore in infrastructure over the next five years.
We commit to doubling farmer income through PM KISAN and MSP reforms.
We will provide startup capital to 20 lakh startups through Fund of Funds.
We shall reduce number of compliance requirements for businesses by 50%.
We commit to achieving zero tax burden for taxpayers earning below Rs 5 lakh per year.
We will privatise Air India and other loss-making PSUs transparently.

PM KISAN AND AGRICULTURE
We will expand PM KISAN to cover all 14 crore farmer families with Rs 6000 per year.
We shall provide pension of Rs 3000 per month to all small and marginal farmers.
We commit to implementing the Swaminathan Commission recommendations on MSP.
We will establish 10000 Farmer Producer Organisations to improve bargaining power.
We shall achieve zero hunger by 2030 through targeted interventions.
We commit to crop loss compensation within 72 hours through parametric insurance.

INFRASTRUCTURE
We shall build 60 km of National Highways per day by 2024.
We will complete construction of 1.25 lakh km of roads under PM Gram Sadak Yojana.
We commit to making India number 1 in ease of doing business by 2022.
We shall provide tap water connections to all rural households under Jal Jeevan Mission.
We will build 10 crore new toilets under Swachh Bharat Mission Phase 2.
We commit to making all railway tracks broad gauge and electrified by 2023.
We shall complete Bullet Train between Mumbai and Ahmedabad by 2023.

HEALTHCARE
We will expand Ayushman Bharat to cover all 50 crore citizens with Rs 5 lakh cover.
We shall establish 1.5 lakh Health and Wellness Centres by 2022.
We commit to reducing out-of-pocket health expenditure by 50% within five years.
We will make India TB-free by 2025 through aggressive treatment and prevention.
We shall ensure no child dies of malnutrition under Mission Poshan 2.0.
We commit to building 75 new medical colleges in underserved districts.

EDUCATION
We shall implement National Education Policy 2019 for holistic development.
We will provide quality education through PM SHRI schools in every block.
We commit to achieving 100% gross enrolment ratio in higher education by 2035.
We shall provide scholarships to all SC, ST and OBC students for higher studies.
We will make India a knowledge superpower by 2030 through research and innovation.

NATIONAL SECURITY AND DEFENCE
We commit to maintaining military superiority through indigenous defence production.
We shall operationalise Chief of Defence Staff for integrated military command.
We will establish Agnipath scheme for youthful recruitment in armed forces.
We commit to abrogating Article 370 to fully integrate Jammu and Kashmir.
We shall build the Ram Temple in Ayodhya after Supreme Court verdict.

ENVIRONMENT
We will plant 2 billion trees and expand forest cover to 33% of land area by 2030.
We shall achieve 450 GW renewable energy capacity by 2030.
We commit to eliminating single-use plastic by 2022 through Plastic Waste Management Rules.
We will make India a global leader in electric vehicles with 30% EV penetration by 2030.

WOMEN
We shall extend Ujjwala Yojana to 8 crore beneficiaries from BPL households.
We will reserve 33% seats for women in Parliament and state assemblies.
We commit to zero tolerance for crimes against women through fast-track courts.
We shall ensure 100% institutional delivery for all pregnant women by 2022.
"""
    },
    "inc_2009": {
        "title": "INC Election Manifesto 2009",
        "party": "Indian National Congress",
        "content": """
INDIAN NATIONAL CONGRESS MANIFESTO 2009
AN INCLUSIVE INDIA, A PROGRESSIVE INDIA

INCLUSIVE GROWTH
We commit to maintaining 8-9% GDP growth with focus on inclusive development.
We will extend MGNREGA to all districts ensuring 100 days employment to rural households.
We shall implement Right to Education Act making free education mandatory for ages 6-14.
We commit to Food Security Act providing subsidised grain to 67% of population.
We will implement NRLM to lift 7 crore families out of poverty by 2017.
We shall provide Rs 50000 annual insurance cover to all BPL families.
We commit to establishing national social security for unorganised sector workers.

AGRICULTURE
We shall implement comprehensive debt waiver scheme for all farmers.
We will increase agricultural credit flow to Rs 7 lakh crore by 2014.
We commit to bringing irrigation to all rain-fed farmlands by 2017.
We shall establish price stabilisation fund to protect farmers from market volatility.
We will extend crop insurance to cover all farmers at subsidised premium.
We commit to increasing MSP every year above cost of production.

EDUCATION
We will increase education budget to 6% of GDP within 5 years.
We shall establish 6000 new model schools in educationally backward blocks.
We commit to universalising secondary education for all children by 2017.
We will provide free textbooks and mid-day meals to all primary school children.
We shall ensure 100% enrolment and zero dropouts through incentive schemes.
We commit to 25% reservation for EWS students in all private unaided schools.

HEALTHCARE
We shall establish Jan Arogya programme providing healthcare to all BPL families.
We will increase public health expenditure to 2-3% of GDP by 2017.
We commit to establishing community health centres within 5 km of every village.
We shall provide free essential drugs and diagnostics at all government hospitals.
We commit to reducing maternal mortality to 100 per lakh live births by 2017.
We will train 1 lakh new ASHA workers for last-mile healthcare delivery.

INFRASTRUCTURE
We shall build 7000 km of National Highways per year under NHDP programme.
We will provide electricity to all villages by 2012 under Rajiv Gandhi Grameen Vidyut Yojana.
We commit to providing safe drinking water to all habitations by 2014.
We shall construct 60 lakh units of affordable housing for urban poor.
We will extend rail connectivity to all district headquarters in Northeast by 2014.

WOMEN
We shall introduce Women's Reservation Bill reserving 33% seats in Parliament.
We will strengthen laws against dowry, domestic violence and sexual harassment.
We commit to Maternity Benefit Act for all women in organised and unorganised sectors.
We shall provide microcredit at 4% interest rate to women self-help groups.
We commit to 50% women representation in all gram panchayats.

ENVIRONMENT
We will achieve 20% renewable energy by 2020 under National Solar Mission.
We shall implement National Action Plan on Climate Change with Rs 5000 crore fund.
We commit to Compensatory Afforestation for every hectare of forest diverted.
We will bring 25 lakh km under watershed development by 2017.
"""
    },
    "inc_2014": {
        "title": "INC Election Manifesto 2014",
        "party": "Indian National Congress",
        "content": """
CONGRESS MANIFESTO 2014
YOUR VOICE, YOUR FUTURE

ECONOMY AND EMPLOYMENT
We will create 10 crore new jobs over the next 5 years through targeted growth policies.
We commit to maintaining 8% GDP growth while controlling inflation below 6%.
We shall implement a comprehensive National Food Security Act covering 82 crore people.
We will provide MNREGA employment guarantee of 200 days in drought-affected areas.
We commit to establishing 50 new industrial corridors to generate manufacturing employment.
We shall provide free land to landless agricultural labourers under land reform act.
We commit to raising minimum wage to Rs 10000 per month for unskilled workers.

AGRICULTURE
We will implement a comprehensive farm income protection scheme.
We shall provide zero-interest crop loans to all small and marginal farmers.
We commit to doubling agricultural output through Green Revolution 2.0.
We will establish Krishi Vigyan Kendras in every district for modern farming.
We shall ensure MSP covers full cost plus 50% return on all 23 crops.
We commit to implementing Pradhan Mantri Fasal Bima Yojana comprehensively.

EDUCATION
We commit to Right to Education being extended to cover ages 3-18 years.
We will train 20 lakh new teachers through Mission Mode teacher training programme.
We shall establish Rashtriya Uchhatar Shiksha Abhiyan for quality higher education.
We commit to making India literacy rate 100% by 2020 through Saakshar Bharat.
We will provide scholarships worth Rs 75000 per year to all meritorious SC/ST students.
We shall link all schools to broadband internet by 2017 under Digital School India.

HEALTHCARE
We commit to Universal Health Coverage providing free healthcare to all Indians.
We will establish Pradhan Mantri Jan Swasthya Yojana with Rs 1 lakh cashless cover.
We shall build 3000 new community health centres over the next 5 years.
We commit to making essential medicines free in all government facilities.
We will train 5 lakh new doctors, nurses and paramedics by 2019.
We shall eliminate TB and malaria by 2025 through intensified disease control.

INFRASTRUCTURE
We will invest Rs 65 lakh crore in infrastructure from 2014 to 2019.
We commit to completing the dedicated freight corridors by 2018.
We shall provide 24x7 electricity to all citizens within 5 years.
We will connect every village with paved roads under PMGSY Phase 2.
We commit to expanding metro rail to 25 cities with population over 10 lakh.
We shall provide broadband to all gram panchayats by 2016.

WOMEN EMPOWERMENT
We shall pass the Women's Reservation Bill as top legislative priority.
We commit to equal pay for equal work through amendment of Equal Remuneration Act.
We will establish 500 new fast-track courts exclusively for crimes against women.
We shall provide startup capital of Rs 2 lakh to women entrepreneurs at zero interest.
We commit to universal institutional delivery with free transport for all pregnant women.

RURAL DEVELOPMENT
We will implement PURA programme bringing urban amenities to rural areas.
We commit to providing drinking water to all rural households by 2017.
We shall establish e-governance in all gram panchayats through Common Service Centres.
We will provide housing to all rural homeless through Indira Awaas Yojana expansion.
"""
    },
    "inc_2019": {
        "title": "INC Manifesto 2019 - Hum Nibhayenge",
        "party": "Indian National Congress",
        "content": """
CONGRESS MANIFESTO 2019
HUM NIBHAYENGE

ECONOMIC JUSTICE
We will provide NYAY minimum income guarantee of Rs 72000 per year to 20% poorest families.
We commit to creating 22 lakh government jobs in unfilled vacancies within one year.
We shall reduce GST slabs to three rates for simplification and reducing burden on poor.
We will reverse all privatisation of profit-making public sector enterprises.
We commit to establishing Separate Farmers Budget to focus on agricultural needs.
We shall implement Loan Waiver within 10 days for all farmers in distress.
We will abolish angel tax and restore 80-G exemptions to promote philanthropic giving.
We commit to separate ministry for MSMEs to give focused attention to small businesses.

EMPLOYMENT GUARANTEE
We shall launch Urban Employment Guarantee providing 100 days work in cities.
We commit to filling all 40 lakh vacancies in central government within one year.
We will establish State Employment Guarantee Fund for states to create local jobs.
We shall extend apprenticeship scheme to all establishments with over 25 workers.
We commit to free skill training for 1 crore youth every year through PMKVY expansion.

AGRICULTURE AND FARMER WELFARE
We will ensure MSP is fixed at 50% profit over comprehensive cost C2 method.
We commit to separate Pradhan Mantri Kisan Budget of Rs 1 lakh crore annually.
We shall repeal all laws that reduce MSP protection for farmers.
We will establish Price Deficiency Payment system so farmers always get minimum price.
We commit to completing river-linking projects to provide irrigation to all farmers.
We shall provide crop insurance through redesigned PMFBY with state co-payment.
We commit to creating agri-entrepreneur ecosystem with 25000 new agri-markets.

EDUCATION
We shall increase education spending to 6% of GDP from current 3.4%.
We commit to hiring 10 lakh teachers in government schools in first year.
We will establish 100 new central universities in underserved states and regions.
We shall abolish NEET for medical admissions and restore state autonomy.
We commit to making all government school education free from kindergarten to Class 12.
We will provide Rs 1 crore research fellowship to 10000 top students every year.

HEALTHCARE
We shall establish Right to Healthcare Act guaranteeing free treatment for all illnesses.
We commit to increasing health budget to 3% of GDP within three years.
We will build 500 new district hospitals and upgrade all existing ones.
We shall provide free diagnosis and medicines for 300 common ailments in all govt hospitals.
We commit to salary parity between government and private sector doctors.
We will establish National Health Regulatory Authority for quality and price control.

WOMEN AND GENDER JUSTICE
We shall pass Women's Reservation Bill in first session of new Parliament.
We commit to gender budgeting with 33% of all government schemes benefiting women.
We will make sexual harassment law stronger with mandatory reporting and fast investigation.
We shall establish 1000 new one-stop crisis centres for women in distress across India.
We commit to equal inheritance rights for all women under a Uniform Civil Code framework.
We will double maternity benefit to 26 weeks for all women in organised sector.

ENVIRONMENT
We commit to achieving 100% renewable energy by 2030.
We shall establish National Ganga Council with statutory powers for river rejuvenation.
We will plant 1 billion trees every year through community participation programmes.
We commit to banning all single-use plastics by 2020 with government leading by example.
We shall declare a National Climate Emergency and create a National Climate Action Fund.
We will protect all wetlands under Ramsar Convention and restore degraded ecosystems.

SOCIAL JUSTICE
We shall increase SC/ST sub-plan allocation to be proportional to population share.
We commit to filling all SC/ST backlog vacancies in government jobs within two years.
We will create OBC commission with constitutional status to ensure reservation benefits.
We commit to giving reservation benefits to all economically backward sections.
We shall enact Communal Violence Prevention Act for faster response to riots.
"""
    }
}


def create_pdf(filename: str, data: dict):
    """Create a PDF manifesto file."""
    path = DATA_DIR / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4,
                             rightMargin=72, leftMargin=72,
                             topMargin=72, bottomMargin=72)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=18, spaceAfter=20)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10.5, leading=16, spaceAfter=6, alignment=TA_JUSTIFY)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=13, spaceBefore=16, spaceAfter=8)

    story = []
    story.append(Paragraph(data['title'], title_style))
    story.append(Paragraph(f"Published by: {data['party']}", styles['Normal']))
    story.append(Spacer(1, 0.3 * inch))

    lines = data['content'].strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.1 * inch))
        elif line.isupper() and len(line) < 60:
            story.append(Paragraph(line, heading_style))
        else:
            story.append(Paragraph(line, body_style))

    doc.build(story)
    print(f"Created: {path}")


if __name__ == '__main__':
    print(f"Generating sample manifesto PDFs in {DATA_DIR}...")
    for name, data in SAMPLE_MANIFESTOES.items():
        create_pdf(f"{name}.pdf", data)
    print(f"\nDone! Created {len(SAMPLE_MANIFESTOES)} PDFs.")
    print("Now run the pipeline from the frontend or using: uvicorn main:app --reload")
