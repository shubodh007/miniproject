import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { SchemeResult } from '../types';
import { IndianRupee, Sparkles, TrendingUp, Award, Layers } from 'lucide-react';

interface WelfareDashboardProps {
  schemes: SchemeResult[];
  language?: string;
}

// Extract benefit amounts numerically with smart annualization
export function extractBenefitAmount(benefitStr: string | undefined): number {
  if (!benefitStr) return 0;
  
  // Check if it is a monthly payment
  const isMonthly = /month|నెల|ప్రతినెలా/i.test(benefitStr);
  
  // Remove commas to join split number parts
  const cleanStr = benefitStr.replace(/,/g, '');
  
  // Find first continuous group of digits
  const matches = cleanStr.match(/\d+/);
  if (matches) {
    let parsed = parseInt(matches[0], 10);
    
    // Scale lakhs/crores safely
    if (/lakh|లక్ష/i.test(benefitStr) && parsed < 100) {
      parsed = parsed * 100000;
    } else if (/crore|కోటి/i.test(benefitStr) && parsed < 100) {
      parsed = parsed * 10000000;
    }
    
    if (isMonthly && parsed < 25000) {
      return parsed * 12;
    }
    return parsed;
  }
  return 0;
}

export const WelfareDashboard: React.FC<WelfareDashboardProps> = ({ schemes, language = 'en' }) => {
  const isTe = language === 'te';

  // Format utility for Indian Rupee currency
  const formatCurrencyValue = (num: number) => {
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)} Lakh`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // 1. Calculate KPI Metrics
  const calculatedStats = useMemo(() => {
    let rawTotal = 0;
    let monetizedCount = 0;
    const items = schemes.map((s) => {
      const amt = extractBenefitAmount(s.benefit_amount);
      if (amt > 0) {
        rawTotal += amt;
        monetizedCount++;
      }
      return {
        ...s,
        numericBenefit: amt
      };
    });

    const averageMatch = schemes.length > 0 
      ? Math.round(schemes.reduce((acc, s) => acc + (s.similarity_score || 0), 0) / schemes.length * 100)
      : 0;

    return {
      totalEstimatedAid: rawTotal,
      averageMatchScore: averageMatch,
      totalMatchedCount: schemes.length,
      monetizedCount,
      nonMonetizedCount: schemes.length - monetizedCount,
      enrichedSchemes: items
    };
  }, [schemes]);

  // 2. Bar Chart Data: Welfare aid value comparison per scheme
  const barChartData = useMemo(() => {
    return calculatedStats.enrichedSchemes
      .filter((s) => s.numericBenefit > 0)
      // Sort in descending order to put highest benefits first
      .sort((a, b) => b.numericBenefit - a.numericBenefit)
      .slice(0, 7) // Take top 7 schemes
      .map((s) => {
        const titleEn = s.name_en || 'Scheme';
        const titleTe = s.name_te || titleEn;
        // Truncate name for charts
        const nameToUse = isTe ? titleTe : titleEn;
        const displayName = nameToUse.length > 22 ? `${nameToUse.slice(0, 20)}...` : nameToUse;
        return {
          name: displayName,
          full_name: nameToUse,
          amountValue: s.numericBenefit,
          rawString: s.benefit_amount || ''
        };
      });
  }, [calculatedStats.enrichedSchemes, isTe]);

  // 3. Category pie chart distribution helper
  const categoryChartData = useMemo(() => {
    const categoriesMap: Record<string, { count: number; totalAmount: number }> = {};
    
    calculatedStats.enrichedSchemes.forEach((s) => {
      const cat = s.category || 'Other';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { count: 0, totalAmount: 0 };
      }
      categoriesMap[cat].count += 1;
      categoriesMap[cat].totalAmount += s.numericBenefit;
    });

    return Object.entries(categoriesMap).map(([title, stats]) => ({
      name: title,
      value: stats.count,
      financialAid: stats.totalAmount
    }));
  }, [calculatedStats.enrichedSchemes]);

  // Colors for Pie Cells
  const CHART_PALETTE_COLORS = [
    '#f59e0b', // Saffron / Gold Amber
    '#3b82f6', // Premium Blue
    '#10b981', // Emerald Success
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#64748b', // Slate
    '#06b6d4', // Cyan
  ];

  if (schemes.length === 0) return null;

  return (
    <div 
      id="welfare-visual-dashboard"
      className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 md:p-8 rounded-3xl shadow-xl space-y-8 relative overflow-hidden animate-fade-in"
    >
      {/* Absolute Glow Spot */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-saffron-bg)] rounded-full blur-3xl opacity-35 pointer-events-none" />

      {/* Grid: Headline KPI summary cards */}
      <div 
        id="dashboard-kpis-grid"
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {/* KPI 1: Estimated Total Annualized Welfare Benefits */}
        <div className="bg-bg-base/65 border border-[var(--border-subtle)] p-5.5 rounded-2xl relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-[var(--accent-saffron)]">
            <span className="text-[11px] leading-tight font-black uppercase tracking-widest text-[var(--text-muted)]">
              {isTe ? 'అంచనా వేసిన మొత్తం వార్షిక ప్రయోజనాలు' : 'Estimated Annual Aid Potential'}
            </span>
            <div className="w-8 h-8 rounded-full bg-[var(--accent-saffron-bg)] flex items-center justify-center">
              <IndianRupee size={15} />
            </div>
          </div>
          <div>
            <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight block">
              {formatCurrencyValue(calculatedStats.totalEstimatedAid)}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold mt-1 block">
              {isTe 
                ? `${calculatedStats.monetizedCount} పథకాల నుండి నేరుగా బ్యాంకు ఖాతాకు` 
                : `Direct cash benefits calculated from ${calculatedStats.monetizedCount} schemes`}
            </span>
          </div>
        </div>

        {/* KPI 2: Number of Scheme Qualifications */}
        <div className="bg-bg-base/65 border border-[var(--border-subtle)] p-5.5 rounded-2xl relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-[var(--accent-primary)]">
            <span className="text-[11px] leading-tight font-black uppercase tracking-widest text-[var(--text-muted)]">
              {isTe ? 'అర్హత సాధించిన పథకాలు' : 'QUALIFIED SCHEMES AUDITED'}
            </span>
            <div className="w-8 h-8 rounded-full bg-[var(--accent-primary-bg)] flex items-center justify-center">
              <Award size={15} />
            </div>
          </div>
          <div>
            <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight block">
              {calculatedStats.totalMatchedCount} {isTe ? 'పథకాలు' : 'Programs'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold mt-1 block">
              {isTe 
                ? `${calculatedStats.nonMonetizedCount} సామాజిక/ఉచిత సేవలు కూడా ఉన్నాయి` 
                : `Includes ${calculatedStats.nonMonetizedCount} non-monetary public services`}
            </span>
          </div>
        </div>

        {/* KPI 3: Average Eligibility Match Strength */}
        <div className="bg-bg-base/65 border border-[var(--border-subtle)] p-5.5 rounded-2xl relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-emerald-500">
            <span className="text-[11px] leading-tight font-black uppercase tracking-widest text-[var(--text-muted)]">
              {isTe ? 'సగటు అర్హత నిర్ధారణ శాతం' : 'AVG PORTFOLIO MATCH STRENGTH'}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <span className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tight block">
              {calculatedStats.averageMatchScore}%
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold mt-1 block">
              {calculatedStats.averageMatchScore > 80 
                ? (isTe ? 'అత్యంత బలమైన సరిపోలిక నివేదిక' : 'Highly secure match reliability') 
                : (isTe ? 'తగిన అర్హత రికార్డులు' : 'Optimal qualification threshold')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section Container */}
      <div 
        id="dashboard-dual-charts-grid"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2"
      >
        {/* Left Chart: Benefit distribution map (Bar Chart) - takes 7 out of 12 columns */}
        <div 
          id="bar-chart-card-container"
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                <Sparkles size={14} className="text-accent-gold mr-1.5" />
                <span>{isTe ? 'అత్యధిక ఆర్థిక విలువ గల పథకాల ప్రయోజనాలు' : 'Welfare Aid Allocation Profile'}</span>
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isTe ? 'మీ ప్రొఫైల్ అర్హత కలిగిన పథకాల అంచనా వార్షిక ఆర్థిక విలువ పోలిక' : 'Comparison of potential annualized values across matching high-yield schemes'}
              </p>
            </div>
          </div>

          <div className="bg-bg-base/45 border border-[var(--border-subtle)]/70 p-4 rounded-2xl h-80">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={9} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={9} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 100000 ? `${val/100000}L` : val.toLocaleString('en-IN')}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-elevated)', opacity: 0.25 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-xl shadow-xl max-w-xs text-left">
                            <p className="text-xs font-black text-[var(--text-primary)] leading-tight mb-1">{data.full_name}</p>
                            <p className="text-xs font-extrabold text-[var(--accent-saffron)]">{isTe ? 'వార్షిక విలువ:' : 'Annualized Value:'} ₹{data.amountValue.toLocaleString('en-IN')}</p>
                            <p className="text-[11px] leading-tight text-[var(--text-secondary)] mt-1.5 border-t border-[var(--border-subtle)] pt-1">{data.rawString}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="amountValue" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? 'var(--accent-saffron)' : 'var(--accent-primary)'}
                        opacity={0.85 - (index * 0.08)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  {isTe ? 'ఆర్థిక మద్దతు ఉన్న పథకాల వివరాలు లేవు (అన్ని ఉచిత సామాజిక పథకాలు)' : 'No monetary schemes currently matched for numerical representation'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Category Distribution (Pie Chart) - takes 5 out of 12 columns */}
        <div 
          id="pie-chart-card-container"
          className="lg:col-span-5 space-y-4"
        >
          <div>
            <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center">
              <Layers size={14} className="text-[var(--accent-primary)] mr-1.5" />
              <span>{isTe ? 'సంక్షేమ రంగాలు మరియు విస్తరణ' : 'Category Welfare Coverage'}</span>
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {isTe ? 'వివిధ ప్రజా రంగాలలో మీ అర్హత పొందిన పథకాల పంపిణీ' : 'Distribution of matched schemes across government civic departments'}
            </p>
          </div>

          <div className="bg-bg-base/45 border border-[var(--border-subtle)]/70 p-4 rounded-2xl h-80 flex flex-col justify-between">
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_PALETTE_COLORS[index % CHART_PALETTE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-lg shadow-lg">
                            <p className="text-xs font-bold text-[var(--text-primary)]">{data.name}</p>
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">
                              {isTe ? `పథకాల సంఖ్య: ${data.value}` : `Matched Schemes: ${data.value}`}
                            </p>
                            {data.financialAid > 0 && (
                              <p className="text-[11px] font-bold text-[var(--success)] mt-0.5">
                                {isTe ? `ఆర్థిక నిధి: ₹${data.financialAid.toLocaleString('en-IN')}/ఏడు` : `Calculated Aid: ₹${data.financialAid.toLocaleString('en-IN')}/yr`}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Center Label inside donut */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-lg font-black text-[var(--text-primary)]">
                  {calculatedStats.totalMatchedCount}
                </span>
                <span className="text-[11px] leading-tight uppercase tracking-wider text-[var(--text-muted)] font-bold">
                  {isTe ? 'సెక్టార్లు' : 'Sectors'}
                </span>
              </div>
            </div>

            {/* Custom Responsive Legend Elements */}
            <div 
              id="category-pie-legend"
              className="grid grid-cols-2 gap-2 text-[11px] leading-tight border-t border-[var(--border-subtle)]/40 pt-2 h-20 overflow-y-auto"
            >
              {categoryChartData.map((entry, index) => {
                const color = CHART_PALETTE_COLORS[index % CHART_PALETTE_COLORS.length];
                return (
                  <div key={entry.name} className="flex items-center space-x-1.5 min-w-[70px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[var(--text-secondary)] truncate font-semibold" title={entry.name}>
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
