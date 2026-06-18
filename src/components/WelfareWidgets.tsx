import React, { useState } from 'react';
import { 
  Sparkles, Sliders, RefreshCw, UserCheck, CheckCircle2, 
  MapPin, DollarSign, Calendar, ArrowUpDown, FileText, 
  ExternalLink, CheckSquare, Square, Building2
} from 'lucide-react';

interface LanguageProp {
  language: 'en' | 'te';
}

// ----------------------------------------------------
// WIDGET 1: ELIGIBILITY CHECKER CARD
// ----------------------------------------------------
export function EligibilityChecker({ language }: LanguageProp) {
  const isTe = language === 'te';
  const [answers, setAnswers] = useState({
    resident: false,
    bpl: false,
    age: false,
    aadhaar: false,
    nonGovt: false,
  });

  const toggleAnswer = (key: keyof typeof answers) => {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalPoints = Object.values(answers).filter(Boolean).length;
  const scorePercent = (totalPoints / 5) * 100;

  return (
    <div className="bg-bg-elevated border-2 border-accent-saffron/30 rounded-2xl p-5 shadow-lg space-y-4 max-w-md animate-fade-in" id="eligibility-widget">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <UserCheck className="text-accent-saffron" size={18} />
          <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
            {isTe ? 'అర్హత తనిఖీ సాధనం' : 'Eligibility Self-Checker'}
          </h4>
        </div>
        <span className="text-[11px] leading-tight bg-accent-saffron/10 text-accent-saffron px-2 py-0.5 rounded-full font-bold">
          {scorePercent}% {isTe ? 'సరిపోయింది' : 'Matched'}
        </span>
      </div>

      <p className="text-[11px] text-text-secondary leading-relaxed font-normal">
        {isTe 
          ? 'అధికారిక పథక నిబంధనల ఆధారంగా మీ అర్హత శాతాన్ని లెక్కించడానికి కింద ఉన్న నిబంధనలను టిక్ చేయండి:' 
          : 'Tick the criteria below representing your current household conditions to evaluate eligibility against key welfare programs:'}
      </p>

      {/* Checklist Grid */}
      <div className="space-y-2.5">
        {[
          { key: 'resident', te: 'ఆంధ్రప్రదేశ్ లేదా తెలంగాణ శాశ్వత నివాసి', en: 'Permanent Resident of AP or TS' },
          { key: 'bpl', te: 'తెల్ల రేషన్ కార్డ్ లేదా ఆదాయం రూ. 1.2 లక్షల లోపు ఉంది', en: 'BPL White Ration Cardholder' },
          { key: 'age', te: 'కుటుంబంలో 18-60 సంవత్సరాల వయస్సు గల సభ్యులు ఉన్నారు', en: 'Active household ages (18-60 yrs)' },
          { key: 'aadhaar', te: 'ఆధార్ కార్డ్ బ్యాంక్ ఖాతాతో అనుసంధానం చేయబడింది', en: 'Aadhaar fully linked to Bank Account (DBT active)' },
          { key: 'nonGovt', te: 'కుటుంబంలో ప్రభుత్వ ఉద్యోగులు గాని, సొంత కారు గాని లేవు', en: 'No govt employees or four-wheeler owners in family' },
        ].map((item) => {
          const isChecked = answers[item.key as keyof typeof answers];
          return (
            <button
              key={item.key}
              onClick={() => toggleAnswer(item.key as keyof typeof answers)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                isChecked 
                  ? 'bg-accent-saffron/5 border-accent-saffron/40 text-text-primary' 
                  : 'bg-bg-base hover:bg-bg-surface border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="text-accent-saffron" size={15} />
                ) : (
                  <Square size={15} />
                )}
              </span>
              <span className="text-[11px] font-bold leading-normal">
                {isTe ? item.te : item.en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress display ring */}
      <div className="bg-bg-base/60 p-3 rounded-xl border border-border-subtle/50 space-y-2 text-center">
        <div className="h-2 w-full bg-border-subtle rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-saffron transition-all duration-500 rounded-full"
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        {scorePercent === 100 ? (
          <p className="text-[11px] text-[#10B981] font-black uppercase">
            🎉 {isTe ? 'అన్ని అర్హతలు సరిపోయాయి! అమరావతి సచివాలయంలో నేరుగా అప్లై చేయొచ్చు.' : 'Fully Eligible! Ready for direct Secretariat onboarding.'}
          </p>
        ) : scorePercent >= 60 ? (
          <p className="text-[11px] text-accent-gold font-bold">
            💡 {isTe ? 'పాక్షికంగా సరిపోయింది. ఆదాయం మరియు నివాస దృవీకరణ సరిచూసుకోండి.' : 'High probability! Standard verification criteria passed.'}
          </p>
        ) : (
          <p className="text-[11px] text-text-muted font-bold">
            ⚠️ {isTe ? 'పథకానికి దరఖాస్తు చేయడానికి కనీసం 3 విభాగాలు అర్హత కలిగి ఉండాలి.' : 'Keep marking checkboxes to evaluate welfare scheme compliance.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// WIDGET 2: BENEFIT CALCULATOR CARD
// ----------------------------------------------------
export function BenefitCalculator({ language }: LanguageProp) {
  const isTe = language === 'te';
  const [scheme, setScheme] = useState<'rythu_bharosa' | 'rythu_bandhu' | 'pm_kisan'>('rythu_bharosa');
  const [acres, setAcres] = useState<number>(3);

  // Scheme math
  let ratePerAcre = 0;
  let flatBenefit = 0;
  let schemeName = '';

  if (scheme === 'rythu_bharosa') {
    ratePerAcre = 12000;
    schemeName = 'Rythu Bharosa (AP rename, 2025)';
  } else if (scheme === 'rythu_bandhu') {
    ratePerAcre = 10000;
    schemeName = 'Rythu Bandhu (TS, now Rythu Bharosa)';
  } else {
    flatBenefit = 6000;
    schemeName = 'PM Kisan Samman Nidhi (Central)';
  }

  const annualPayout = flatBenefit > 0 ? flatBenefit : acres * ratePerAcre;
  const installments = flatBenefit > 0 ? 3 : 2;
  const perInstallment = annualPayout / installments;

  return (
    <div className="bg-bg-elevated border-2 border-accent-blue/30 rounded-2xl p-5 shadow-lg space-y-4 max-w-md animate-fade-in" id="calculator-widget">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="text-accent-blue" size={18} />
          <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
            {isTe ? 'వ్యవసాయ పెట్టుబడి కాలిక్యులేటర్' : 'Seasonal Welfare Payout Calculator'}
          </h4>
        </div>
        <span className="text-[11px] leading-tight bg-accent-blue/10 text-accent-blue px-2.5 py-0.5 rounded-full font-bold">
          {isTe ? 'లైవ్ గణన' : 'Bi-Annual Projections'}
        </span>
      </div>

      {/* Scheme selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">
          {isTe ? 'రైతు పథకాన్ని ఎంచుకోండి:' : 'Select Farming Assistance Program:'}
        </label>
        <div className="grid grid-cols-3 gap-1.5" id="calc-scheme-tabs">
          {[
            { id: 'rythu_bharosa', te: 'రైతు భరోసా', en: 'Rythu Bharosa' },
            { id: 'rythu_bandhu', te: 'రైతు బంధు', en: 'Rythu Bandhu' },
            { id: 'pm_kisan', te: 'PM కిసాన్', en: 'PM Kisan' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setScheme(item.id as any)}
              className={`py-2 px-1 text-[11px] leading-tight font-extrabold rounded-lg text-center border cursor-pointer transition-all ${
                scheme === item.id 
                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm' 
                  : 'bg-bg-base text-text-secondary border-border-subtle hover:bg-bg-surface'
              }`}
            >
              {isTe ? item.te : item.en}
            </button>
          ))}
        </div>
      </div>

      {/* Acres slider if not flat scheme */}
      {flatBenefit === 0 ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] leading-tight font-black uppercase text-text-secondary">
            <span>{isTe ? 'సాగు భూమి వైశాల్యం (ఎకరాలలో):' : 'Land acreage under cultivation:'}</span>
            <span className="text-accent-blue text-xs font-black bg-accent-blue/10 px-2 py-0.5 rounded">
              {acres} {isTe ? 'ఎకరాలు' : 'Acres'}
            </span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="15.0" 
            step="0.5"
            value={acres}
            onChange={(e) => setAcres(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-border-main accent-accent-blue rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] leading-tight text-text-muted font-bold">
            <span>0.5 Acres</span>
            <span>7.5 Acres</span>
            <span>15.0 Acres (Capped Limit)</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-bg-base rounded-xl border border-border-subtle text-center text-[11px] leading-tight font-bold text-text-secondary">
          📌 {isTe ? 'పి.ఎం కిసాన్ పథకం సాగు భూమి వైశాల్యంతో సంబంధం లేకుండా సంవత్సరానికి స్థిరంగా ₹6,000 చెల్లిస్తుంది.' : 'PM-KISAN pays a guaranteed flat incentive of ₹6,000 annually to all eligible registered pathholders.'}
        </div>
      )}

      {/* Yield Display */}
      <div className="bg-gradient-to-br from-bg-base to-bg-surface border border-border-strong rounded-2xl p-4 text-center space-y-2">
        <p className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider">
          {isTe ? 'మొత్తం వార్షిక ఊహిత పెట్టుబడి సాయం' : 'Projected Total Annual Payout'}
        </p>
        <p className="text-3xl font-black text-text-primary tracking-tight font-mono">
          ₹{annualPayout.toLocaleString('en-IN')}
        </p>
        <div className="border-t border-border-subtle/50 my-2 pt-2 grid grid-cols-2 gap-2 text-left">
          <div>
            <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'వాయిదాల సంఖ్య' : 'Installments'}</p>
            <p className="text-xs font-bold text-text-secondary">{installments} Tranches / Year</p>
          </div>
          <div>
            <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'చేపట్టే ఒక విడత నిధులు' : 'Amount Per Tranche'}</p>
            <p className="text-xs font-black text-[#10B981]">₹{perInstallment.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// WIDGET 3: PAYMENT STATUS TRACKER WIDGET
// ----------------------------------------------------
export function PaymentStatusTracker({ language }: LanguageProp) {
  const isTe = language === 'te';
  const [aadhaar, setAadhaar] = useState('');
  const [scheme, setScheme] = useState('pm_kisan');
  const [loading, setLoading] = useState(false);
  const [trackedData, setTrackedData] = useState<any | null>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.replace(/\s/g, '').length !== 12) {
      alert(isTe ? 'దయచేసి సరైన 12 అంకెల ఆధార్ సంఖ్యను ప్రవేశపెట్టండి' : 'Please provide a valid 12-digit Aadhaar Number');
      return;
    }

    setLoading(true);
    setTrackedData(null);

    // Simulate treasury DBT server delay
    setTimeout(() => {
      setLoading(false);
      setTrackedData({
        refNo: `DBT-AP-${Math.floor(100000 + Math.random() * 900000)}-2026`,
        bank: 'State Bank of India (SBI)',
        acEnding: Math.floor(1000 + Math.random() * 9000),
        status: 'APPROVED & DISPATCHED',
        date: 'May 18, 2026',
        amount: scheme === 'pm_kisan' ? '₹2,000' : scheme === 'amma_vodi' ? '₹15,000' : '₹5,000'
      });
    }, 1200);
  };

  const formatAadhaar = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 12);
    const matched = raw.match(/.{1,4}/g);
    setAadhaar(matched ? matched.join(' ') : raw);
  };

  return (
    <div className="bg-bg-elevated border-2 border-accent-gold/30 rounded-2xl p-5 shadow-lg space-y-4 max-w-md animate-fade-in" id="payment-tracker-widget">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <RefreshCw className="text-accent-gold animate-spin" size={17} />
          <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
            {isTe ? 'లైవ్ సాయం బదిలీ స్టేటస్' : 'Real-time DBT Payment Tracker'}
          </h4>
        </div>
        <span className="text-[11px] leading-tight bg-accent-gold/10 text-accent-gold px-2.5 py-0.5 rounded-full font-bold">
          {isTe ? 'ట్రెజరీ సర్వర్' : 'NIC Ledger Link'}
        </span>
      </div>

      <form onSubmit={handleTrack} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">
            {isTe ? 'పథకాన్ని ఎంచుకోండి:' : 'Select Scheme to Query:'}
          </label>
          <select 
            value={scheme} 
            onChange={(e) => setScheme(e.target.value)}
            className="w-full bg-bg-base border border-border-subtle p-2 rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold"
          >
            <option value="pm_kisan">PM Kisan Samman Nidhi</option>
            <option value="amma_vodi">Jagananna Amma Vodi</option>
            <option value="aarogyasri">YSR Aarogyasri Hospitalization</option>
            <option value="pension">NTR Pension Bharosa</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">
            {isTe ? 'ఆధార్ నంబర్ ప్రవేశపెట్టండి (12 అంకెలు):' : 'Enter 12-Digit Aadhaar Identifier:'}
          </label>
          <input 
            type="text" 
            placeholder="XXXX XXXX XXXX"
            value={aadhaar}
            onChange={(e) => formatAadhaar(e.target.value)}
            className="w-full bg-bg-base border border-border-subtle p-2.5 rounded-xl text-xs text-center font-bold tracking-widest text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent-gold"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-accent-gold hover:bg-accent-gold/90 text-bg-surface text-[11px] leading-tight font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="animate-spin text-bg-surface" size={13} />
              <span>{isTe ? 'ట్రెజరీ లెడ్జర్ శోధిస్తోంది...' : 'Syncing DBT Ledger Database...'}</span>
            </>
          ) : (
            <span>{isTe ? 'సమీక్షించు / స్థితి తనిఖీ' : 'Verify & Poll Payment Ledger'}</span>
          )}
        </button>
      </form>

      {/* Loading state indicator */}
      {loading && (
        <div className="py-3 text-center space-y-1 animate-pulse">
          <div className="w-1.5 h-1.5 bg-accent-gold rounded-full mx-auto animate-ping" />
          <p className="text-[11px] leading-tight text-text-muted font-bold font-mono">ENCRYPTED SHIELDS SECURED... FETCHING NIC-AP-LEDGER...</p>
        </div>
      )}

      {/* Result presentation box */}
      {trackedData && (
        <div className="p-4 bg-[#10B981]/5 border border-[#10B981]/35 rounded-2xl space-y-3 animate-fade-in" id="dbt-tracking-results">
          <div className="flex items-center justify-between border-b border-[#10B981]/20 pb-2">
            <span className="text-[11px] leading-tight font-black text-text-primary uppercase tracking-wide">
              {isTe ? 'ట్రాకింగ్ ఫలశ్రుతి:' : 'DBT Transaction Ledger:'}
            </span>
            <span className="px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] font-black text-[11px] leading-tight rounded-full">
              {trackedData.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight font-bold">
            <div>
              <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'విరాళం మొత్తం' : 'Amount Transferred'}</p>
              <p className="text-sm font-black text-text-primary">{trackedData.amount}</p>
            </div>
            <div>
              <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'లావాదేవీ తేదీ' : 'Transfer Date'}</p>
              <p className="text-xs text-text-secondary">{trackedData.date}</p>
            </div>
            <div>
              <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'చెల్లింపు జరిగిన బ్యాంకు' : 'Nodal Bank Account'}</p>
              <p className="text-[11px] leading-tight text-text-secondary truncate">{trackedData.bank} (*{trackedData.acEnding})</p>
            </div>
            <div>
              <p className="text-[11px] leading-tight font-black text-text-muted uppercase">{isTe ? 'ప్రభుత్వ సూచన సంఖ్య' : 'Govt Reference Id'}</p>
              <p className="text-[11px] leading-tight text-text-secondary font-mono truncate">{trackedData.refNo}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// WIDGET 4: SCHEME COMPARISON CARD
// ----------------------------------------------------
export function SchemeComparison({ language }: LanguageProp) {
  const isTe = language === 'te';
  const [metric, setMetric] = useState<'benefit' | 'eligibility' | 'exclusions' | 'tranches'>('benefit');

  const categories = [
    { id: 'benefit', te: 'సహాయ ధనం', en: 'Payout Volume' },
    { id: 'tranches', te: 'విడతల క్రమం', en: 'Installment Frequency' },
    { id: 'eligibility', te: 'పట్టా అర్హత', en: 'Owner Tenancy Rules' },
    { id: 'exclusions', te: 'నిషేధాలు', en: 'Disbarment Metrics' },
  ];

  return (
    <div className="bg-bg-elevated border-2 border-[#10B981]/30 rounded-2xl p-5 shadow-lg space-y-4 max-w-lg overflow-hidden animate-fade-in" id="comparison-widget">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="text-[#10B981]" size={18} />
          <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
            {isTe ? 'వ్యవసాయ పథకాల పోలిక' : 'Farmer Assistance Scheme Head-to-Head'}
          </h4>
        </div>
        <span className="text-[11px] leading-tight bg-[#10B981]/15 text-[#10B981] px-2.5 py-0.5 rounded-full font-bold">
          Side-By-Side Comparison
        </span>
      </div>

      {/* Metric selection handles */}
      <div className="flex flex-wrap gap-1.5" id="comp-metric-pills">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setMetric(c.id as any)}
            className={`px-3 py-1.5 text-[11px] leading-tight font-black uppercase rounded-lg transition-all cursor-pointer ${
              metric === c.id 
                ? 'bg-[#10B981] text-white shadow-sm' 
                : 'bg-bg-base text-text-secondary hover:bg-bg-surface border border-border-subtle'
            }`}
          >
            {isTe ? c.te : c.en}
          </button>
        ))}
      </div>

      {/* Dynamic Grid Side-by-Side */}
      <div className="grid grid-cols-2 gap-3.5 border-t border-border-subtle/40 pt-3.5">
        {/* PM KISAN COLUMN */}
        <div className="space-y-2.5 p-3 rounded-2xl bg-bg-base border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 border-b border-border-subtle/50 pb-1.5">
              <Building2 size={13} className="text-[#10B981] shrink-0" />
              <span className="text-[11px] leading-tight font-black text-text-primary uppercase truncate">PM Kisan</span>
            </div>
            <p className="text-[11px] leading-tight font-bold text-text-muted uppercase tracking-wide mt-1">Central Scheme</p>
          </div>

          <div className="py-2">
            {metric === 'benefit' && (
              <div className="space-y-1">
                <p className="text-lg font-black text-text-primary tracking-tight font-mono">₹6,000 / Year</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'భూమి విస్తీర్ణంతో నిమిత్తం లేకుండా దేశవ్యాప్తంగా స్థిర సాయం.' : 'Fixed relief incentive distributed equally without landholding limits.'}</p>
              </div>
            )}
            {metric === 'tranches' && (
              <div className="space-y-1">
                <p className="text-sm font-black text-text-primary">3 Installments</p>
                <p className="text-[11px] leading-tight text-[#10B981] font-bold">₹2,000 + ₹2,000 + ₹2,000</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'నగదు నేరుగా నాలుగు నెలలకు ఒకసారి ఆధార్ లింక్డ్ బ్యాంక్ ఖాతాలో జమ.' : 'Disbursed every 4 months directly through PFMS router nodes.'}</p>
              </div>
            )}
            {metric === 'eligibility' && (
              <div className="space-y-1">
                <p className="text-sm font-black text-text-primary">{isTe ? 'పట్టాదారు రైతుకు మాత్రమే' : 'Landholding Owners Only'}</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'కచ్చితంగా పట్టా పాస్ బుక్ కలిగి ఉండాలి. కౌలు రైతులకు లబ్ధి చేకూరదు.' : 'Must hold active Pattadar land deeds. Tenant farmers and oral lessees are excluded.'}</p>
              </div>
            )}
            {metric === 'exclusions' && (
              <div className="space-y-1">
                <p className="text-[11px] leading-tight text-error font-extrabold uppercase">🚫 Taxpayers & Govt Jobholders</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'ఆదాయ పన్ను చెల్లించేవారు, వ్యవసాయేతర స్థలాలు గలవారు అనర్హులు.' : 'Institutional landowners, serving officers, and tax filing groups are barred.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* RYTHU BHAROSA / RYTHU BANDHU COLUMN */}
        <div className="space-y-2.5 p-3 rounded-2xl bg-bg-base border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 border-b border-border-subtle/50 pb-1.5">
              <MapPin size={13} className="text-accent-saffron shrink-0" />
              <span className="text-[11px] leading-tight font-black text-text-primary uppercase truncate">Rythu Bharosa</span>
            </div>
            <p className="text-[11px] leading-tight font-bold text-accent-saffron uppercase tracking-wide mt-1">State Scheme (AP/TS)</p>
          </div>

          <div className="py-2">
            {metric === 'benefit' && (
              <div className="space-y-1">
                <p className="text-lg font-black text-text-primary tracking-tight font-mono">₹12,000 / Year</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'తెలంగాణ మరియు ఆంధ్రాలో ఏడాదికి ఎకరాకు ₹10,000 - ₹12,000 సాయం.' : 'Calculated per acre; Telangana pays ₹10,000, Andhra paying ₹12,000.'}</p>
              </div>
            )}
            {metric === 'tranches' && (
              <div className="space-y-1">
                <p className="text-sm font-black text-text-primary">2 Installments</p>
                <p className="text-[11px] leading-tight text-accent-saffron font-bold">Kharif & Rabi Seasons</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'వానాకాలం మరియు యాసంగి పంటలు వేసే మునుపు నేరుగా జమ.' : 'Distributed at the start of sowing cycles to fund seeds and fertilizers.'}</p>
              </div>
            )}
            {metric === 'eligibility' && (
              <div className="space-y-1">
                <p className="text-sm font-black text-text-primary">{isTe ? 'కౌలు రైతులకు కూడా వర్తిస్తుంది' : 'Cover Tenant Farmers'}</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'సీసీఆర్‌సీ కార్డ్ (CCRC Card) కలిగిన కౌలు రైతులకు పధకం లభిస్తుంది.' : 'Valid for landholders AND registered tenant farmers holding CCRC cards.'}</p>
              </div>
            )}
            {metric === 'exclusions' && (
              <div className="space-y-1">
                <p className="text-[11px] leading-tight text-error font-extrabold uppercase">🚫 Large Corporates Capped</p>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal">{isTe ? 'గరిష్టంగా 15-20 ఎకరాల లోపు వారికి మాత్రమే సాయం పరిమితం.' : 'Capped up to a sliding ceiling of 15-20 acres to avoid corporate pooling.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// WIDGET 5: DOCUMENT CHECKLIST WIDGET
// ----------------------------------------------------
export function DocumentChecklist({ language }: LanguageProp) {
  const isTe = language === 'te';
  const [scheme, setScheme] = useState('talliki_vandanam');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  const schemesDocs: Record<string, { teName: string; enName: string; docs: { id: string; te: string; en: string }[] }> = {
    talliki_vandanam: {
      teName: 'తల్లికి వందనం',
      enName: 'Talliki Vandanam',
      docs: [
        { id: 'av_mother_aadhaar', te: 'తల్లి యొక్క అసలు ఆధార్ కార్డ్', en: 'Mother Aadhaar Card' },
        { id: 'av_child_aadhaar', te: 'విద్యార్థి ఆధార్ కార్డ్', en: 'Student Aadhaar Card' },
        { id: 'av_ration', te: 'వైట్ బిపిఎల్ రేషన్ కార్డ్ నకలు', en: 'White BPL Ration Card Copy' },
        { id: 'av_school', te: 'పాఠశాల హెడ్మాస్టర్ ధృవీకరించిన 75% హాజరు రిపోర్ట్', en: '75% Attendance Report Signed by HM' },
        { id: 'av_bank', te: 'తల్లి క్రియాశీల బ్యాంక్ పాస్ బుక్ (ఆధార్ లింక్డ్)', en: 'Mothers Bank Passbook (Aadhaar linked)' },
      ]
    },
    rythu_bharosa: {
      teName: 'రైతు భరోసా',
      enName: 'Rythu Bharosa',
      docs: [
        { id: 'rb_passbook', te: 'పట్టాదారు పాస్ బుక్ (వెబ్ ల్యాండ్ ఆధారంగా)', en: 'Pattadar Passbook Document' },
        { id: 'rb_adangal', te: 'వ్యవసాయ భూమి అడంగల్ / 1-బి రికార్డ్స్', en: 'Land Adangal / 1-B Record Copy' },
        { id: 'rb_ccrc', te: 'కౌలు రైతులకు: సీసీఆర్‌సీ ఒప్పంద పత్రం', en: 'For Tenant: CCRC Tenancy Card' },
        { id: 'rb_aadhaar', te: 'బ్యాంక్ లింక్డ్ ఆధార్ మరియు ఇ-కెవైసి రిపోర్ట్', en: 'Aadhaar copy with physical e-KYC status' },
        { id: 'rb_bank', te: 'సక్రియ ఎస్.బి.ఐ / జాతీయ బ్యాంకు ఖాతా బుక్', en: 'Savings Bank Account Passbook' },
      ]
    },
    pm_kisan: {
      teName: 'పి.ఎం కిసాన్ సమ్మాన్ నిధి',
      enName: 'PM Kisan Samman Nidhi',
      docs: [
        { id: 'pmk_passbook', te: 'సమగ్ర భూ యాజమాన్య పత్రాలు', en: 'Land registry documentation' },
        { id: 'pmk_aadhaar', te: 'మొబైల్ ఓటీపీ అనుసంధానిత ఆధార్ కార్డు', en: 'Mobile OTP-Linked Aadhaar Card' },
        { id: 'pmk_dbt', te: 'పి.ఎఫ్.ఎమ్.ఎస్ ఆమోదించబడిన బ్యాంకు పాస్ బుక్', en: 'PFMS-Compliant Bank Details' },
        { id: 'pmk_declaration', te: 'కుటుంబంలో ప్రభుత్వ శ్రేణులు లేరని స్వీయ ప్రమాణ పత్రం', en: 'Self-declaration pattern of non-govt limits' },
      ]
    },
    aarogyasri: {
      teName: 'డాక్టర్ ఎన్టీఆర్ ఆరోగ్యశ్రీ',
      enName: 'Dr. NTR Aarogyasri Health',
      docs: [
        { id: 'as_ration', te: 'निवासा తెల్ల బిపిఎల్ ఆహార భద్రతా కార్డ్', en: 'White BPL Food Security Card' },
        { id: 'as_aadhaar', te: 'సర్వ పౌరుల సమగ్ర ఆధార్ సాక్ష్యం', en: 'Household member Aadhaar Cards' },
        { id: 'as_referral', te: 'ప్రభుత్వ వైద్యాధికారి రిఫరెల్ లెటర్', en: 'Government Doctor Referral Slip' },
        { id: 'as_income', te: 'వార్షిక ఆదాయం రూ. 5 లక్షల లోపు గల ఆదాయ పత్రం', en: 'Family Income Certificate under ₹5 Lakhs' },
      ]
    },
    pension: {
      teName: 'ఎన్టీఆర్ పెన్షన్ భరోసా',
      enName: 'NTR Pension Bharosa',
      docs: [
        { id: 'pen_age', te: 'వయసు ధృవీకరణ పత్రం (కనీసం 60 ఏళ్లు నిండినట్లు రుజువు)', en: 'Age Proof Certificate (min 60 yrs)' },
        { id: 'pen_aadhaar', te: 'నివాసి గుర్తింపు కోసం బయోమెట్రిక్ ఆధార్ కార్డ్', en: 'Biometric Aadhaar Identity Card' },
        { id: 'pen_ration', te: 'దరిద్ర రేఖకు దిగువున ఉన్న రేషన్ కార్డ్', en: 'BPL Ration Card for family mapping' },
        { id: 'pen_photo', te: 'తాజా పాస్‌పోర్ట్ సైజు ఫోటోగ్రాఫ్', en: 'Recent passport-size photo of applicant' },
      ]
    },
  };

  const activeScheme = schemesDocs[scheme];
  const totalDocs = activeScheme.docs.length;
  const tickedDocs = activeScheme.docs.filter((d) => checkedDocs[d.id]).length;
  const isCompleted = tickedDocs === totalDocs;

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-bg-elevated border-2 border-accent-saffron/30 rounded-2xl p-5 shadow-lg space-y-4 max-w-md animate-fade-in" id="document-checklist-widget">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <FileText className="text-accent-saffron" size={18} />
          <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
            {isTe ? 'అవసరమైన పత్రాల చెక్ లిస్ట్' : 'Required Documents Checklist'}
          </h4>
        </div>
        <span className="text-[11px] leading-tight bg-accent-saffron/10 text-accent-saffron px-2.5 py-0.5 rounded-full font-bold">
          {tickedDocs} / {totalDocs} {isTe ? 'సిద్ధం' : 'Ready'}
        </span>
      </div>

      {/* Selector dropdown */}
      <div className="space-y-1">
        <label className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">
          {isTe ? 'సంక్షేమ పథకాన్ని మార్చండి:' : 'Toggle Target Welcome Scheme:'}
        </label>
        <select 
          value={scheme} 
          onChange={(e) => {
            setScheme(e.target.value);
            setCheckedDocs({});
          }}
          className="w-full bg-bg-base border border-border-subtle p-2 rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
        >
          {Object.entries(schemesDocs).map(([key, val]) => (
            <option key={key} value={key}>
              {language === 'te' ? val.teName : val.enName}
            </option>
          ))}
        </select>
      </div>

      {/* Docs List */}
      <div className="space-y-2">
        {activeScheme.docs.map((doc) => {
          const isChecked = !!checkedDocs[doc.id];
          return (
            <button
              key={doc.id}
              onClick={() => toggleDoc(doc.id)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                isChecked 
                  ? 'bg-accent-saffron/5 border-[#10B981]/50 text-text-primary' 
                  : 'bg-bg-base hover:bg-bg-surface border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {isChecked ? (
                  <span className="text-[#10B981] font-bold text-xs">✓</span>
                ) : (
                  <Square size={13} />
                )}
              </span>
              <span className="text-[11px] font-bold leading-normal">
                {isTe ? doc.te : doc.en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress display bar */}
      <div className="p-3 bg-bg-base rounded-xl border border-border-subtle flex items-center justify-between">
        <span className="text-[11px] leading-tight text-text-secondary font-bold">
          {isTe ? 'పత్రాల గుర్తింపు స్థాయి:' : 'Application completeness:'}
        </span>
        <span className={`text-[11px] leading-tight font-black uppercase ${isCompleted ? 'text-[#10B981]' : 'text-accent-gold'}`}>
          {isCompleted ? (isTe ? '🎉 దరఖాస్తుకు సిద్ధ సిద్ధం!' : 'Ready to Submit!') : (isTe ? 'పెండింగ్ లో ఉన్నాయి' : 'Pending files')}
        </span>
      </div>
    </div>
  );
}
