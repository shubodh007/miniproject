import React from 'react';
import { Sparkles, ArrowRight, Search, ListTodo, ShieldAlert, HeartHandshake } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useTypewriter } from '../hooks/useTypewriter';

interface EmptyStateProps {
  onSelectSuggestion: (prompt: string) => void;
  userRegion?: string;
  userOccupation?: string;
  userAge?: number;
  profileSnapshot?: any | null;
  user?: any | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  onSelectSuggestion,
  userRegion,
  userOccupation,
  userAge,
  profileSnapshot,
  user
}) => {
  const { language } = useTranslation();

  const getCtaText = () => {
    // If we have profileSnapshot, prioritize its dynamic inputs
    const region = userRegion || profileSnapshot?.state;
    const occupation = userOccupation || profileSnapshot?.occupation;

    if (occupation && region) {
      return language === 'te'
        ? `${region}లో ${occupation} పథకాలను కనుగొనండి`
        : `Find ${occupation} schemes in ${region}`;
    } else if (occupation) {
      return language === 'te'
        ? `${occupation} సంక్షేమ కార్యక్రమాలను కనుగొనండి`
        : `Find ${occupation} welfare programs`;
    } else if (region) {
      return language === 'te'
        ? `${region}లో పథకాలను అన్వేషించండి`
        : `Explore schemes in ${region}`;
    }
    return language === 'te' 
      ? 'నన్ను ఏదైనా అడగండి, లేదా ప్రత్యక్ష సమాచారం కోసం శోధన అమర్పును ఆన్ చేయండి.'
      : 'Ask me anything, or enable Pro Search to grounding on live policy portals.';
  };

  const isTelangana = (profileSnapshot?.state || userRegion) === 'Telangana';
  const occupation = (profileSnapshot?.occupation || userOccupation || '').toLowerCase();
  
  const isFarmer = occupation.includes('farm') || 
                   occupation.includes('agri') || 
                   occupation.includes('రైతు') || 
                   occupation.includes('వ్యవసాయ');
                   
  const isHealthWorkerOrQuery = occupation.includes('health') || 
                                 occupation.includes('doctor') || 
                                 occupation.includes('nurse') || 
                                 occupation.includes('patient') ||
                                 occupation.includes('ఆరోగ్య') ||
                                 occupation.includes('వైద్య') ||
                                 occupation.includes('చికిత్స');

  let chips = [];

  if (isFarmer) {
    if (isTelangana) {
      chips = [
        {
          text: 'Check Rythu Bandhu eligibility',
          textTe: 'రైతు బందు అర్హతను పరిశీలించండి',
          icon: <HeartHandshake className="text-accent w-4 h-4" />,
          tag: 'Eligibility'
        },
        {
          text: 'PM-Kisan vs Rythu Bandhu comparison',
          textTe: 'పీఎం కిసాన్ మరియు రైతు బంధు ప్రయోజనాల పోలిక',
          icon: <ShieldAlert className="text-accent w-4 h-4" />,
          tag: 'Compare'
        }
      ];
    } else {
      chips = [
        {
          text: 'Check Rythu Bharosa eligibility',
          textTe: 'రైతు భరోసా అర్హతను పరిశీలించండి',
          icon: <HeartHandshake className="text-accent w-4 h-4" />,
          tag: 'Eligibility'
        },
        {
          text: 'PM-Kisan vs Rythu Bharosa comparison',
          textTe: 'పీఎం కిసాన్ మరియు రైతు భరోసా ప్రయోజనాల పోలిక',
          icon: <ShieldAlert className="text-accent w-4 h-4" />,
          tag: 'Compare'
        }
      ];
    }
    // Add two more farmer-relevant or agricultural chips
    chips.push(
      {
        text: 'Calculate investment benefit payouts for my land acreage',
        textTe: 'నా భూమి విస్తీర్ణానికి పెట్టుబడి ప్రయోజన చెల్లింపును లెక్కించండి',
        icon: <Search className="text-accent w-4 h-4" />,
        tag: 'Calculator'
      },
      {
        text: isTelangana 
          ? 'Required documents for Rythu Bima farmer insurance' 
          : 'Required documents for YSR Rythu Bharosa registration',
        textTe: isTelangana 
          ? 'రైతు బీమా రైతు భీమా పథకానికి కావలసిన పత్రాలు' 
          : 'వైఎస్ఆర్ రైతు భరోసా నమోదుకు కావలసిన పత్రాలు',
        icon: <ListTodo className="text-accent w-4 h-4" />,
        tag: 'Checklists'
      }
    );
  } else if (isHealthWorkerOrQuery) {
    chips = [
      {
        text: isTelangana ? 'Aarogyasri coverage check in Telangana' : 'YSR Aarogyasri coverage check',
        textTe: isTelangana ? 'తెలంగాణ ఆరోగ్యశ్రీ కవరేజ్ పరిశీలన' : 'వైఎస్ఆర్ ఆరోగ్యశ్రీ కవరేజ్ పరిశీలన',
        icon: <HeartHandshake className="text-accent w-4 h-4" />,
        tag: 'Health'
      },
      {
        text: 'Hospital cashless process under Aarogyasri scheme',
        textTe: 'ఆరోగ్యశ్రీ పథకం కింద హాస్పిటల్ క్యాష్‌లెస్ ప్రక్రియ',
        icon: <Search className="text-accent w-4 h-4" />,
        tag: 'Process'
      },
      {
        text: isTelangana ? 'Check Telangana Employee Health Scheme (EHS)' : 'Check AP Employee Health Scheme benefits',
        textTe: isTelangana ? 'తెలంగాణ ఉద్యోగుల ఆరోగ్య పథకం వివరాలు' : 'ఏపీ ఉద్యోగుల ఆరోగ్య పథకం ప్రయోజనాలు',
        icon: <ListTodo className="text-accent w-4 h-4" />,
        tag: 'Benefits'
      },
      {
        text: 'Emergency health helpline and sub-center tracking',
        textTe: 'అత్యవసర ఆరోగ్య హెల్ప్‌లైన్ మరియు సబ్‌సెంటర్ ట్రాకింగ్',
        icon: <ShieldAlert className="text-accent w-4 h-4" />,
        tag: 'Helpline'
      }
    ];
  } else {
    // General or Default fallback with dynamic state details if available
    chips = [
      {
        text: isTelangana
          ? 'Check Rythu Bandhu and welfare eligibility in Telangana'
          : 'Am I eligible for Andhra Pradesh or Telangana welfare schemes?',
        textTe: isTelangana
          ? 'తెలంగాణలో రైతు బంధు మరియు ఇతర పథకాల అర్హతను పరిశీలించండి'
          : 'నేను ఆంధ్రప్రదేశ్ లేదా తెలంగాణ సంక్షేమ పథకాలకు అర్హుడినా?',
        icon: <HeartHandshake className="text-accent w-4 h-4" />,
        tag: 'Eligibility'
      },
      {
        text: 'Calculate investment benefit payouts for my land acreage',
        textTe: 'నా భూమి విస్తీర్ణానికి పెట్టుబడి ప్రయోజన చెల్లింపును లెక్కించండి',
        icon: <Search className="text-accent w-4 h-4" />,
        tag: 'Calculator'
      },
      {
        text: 'Compare PM Kisan vs Rythu Bharosa benefits side-by-side',
        textTe: 'పీఎం కిసాన్ మరియు రైతు భరోసా ప్రయోజనాలను ప్రక్కప్రక్కనే వివరించండి',
        icon: <ShieldAlert className="text-accent w-4 h-4" />,
        tag: 'Compare'
      },
      {
        text: 'Load required document checklist for Jagananna Amma Vodi',
        textTe: 'జగనన్న అమ్మ ఒడి పథకానికి కావలసిన పత్రాల జాబితాను చూపించు',
        icon: <ListTodo className="text-accent w-4 h-4" />,
        tag: 'Checklists'
      }
    ];
  }

  const welcomeText = (user?.name || profileSnapshot?.name) 
    ? `Welcome back, ${(user?.name || profileSnapshot?.name).split(' ')[0]}. How can I guide you?`
    : language === 'te' 
    ? 'నేడు మీకు ఏ విధంగా సహాయపడగలను?'
    : 'How can I guide you today?';

  const { displayText, isDone } = useTypewriter(welcomeText, 35);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 max-w-3xl mx-auto space-y-8 select-none" id="empty-state-container">
      
      {/* Centered Logo with breathing pulse effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-accent-glow rounded-3xl blur-2xl animate-[pulse_3s_infinite]" />
        <div 
          className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-accent to-accent/80 rounded-[24px] flex items-center justify-center border border-white/10 shadow-[0_12px_40px_var(--color-accent-glow)] animate-[pulse_4s_infinite_ease-in-out]"
          id="breathing-logo-badge"
          style={{ animationDuration: '3s' }}
        >
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-surface)] animate-pulse" />
        </div>
      </div>

      {/* Primary Titles Content */}
      <div className="space-y-2">
        <h2 className="font-heading font-black text-2xl sm:text-3xl text-text-primary tracking-tight" id="empty-state-welcome-headline">
          {displayText}
          {!isDone && <span className="animate-[pulse_0.8s_infinite] ml-1 text-accent">|</span>}
        </h2>
        <p className="text-sm sm:text-base text-text-muted max-w-lg leading-relaxed">
          {getCtaText()}
        </p>
      </div>

      {/* Bento suggestions Chips selection grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4" id="suggestion-chips-grid">
        {chips.map((chip, idx) => {
          const text = language === 'te' ? chip.textTe : chip.text;
          return (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(text)}
              className="p-4 text-left bg-surface-raised hover:bg-surface border border-border hover:border-accent/30 rounded-card cursor-pointer transition-all duration-[var(--transition-smooth)] hover:-translate-y-1 hover:shadow-[0_4px_20px_var(--color-accent-glow)] group flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-accent/5 rounded-xl border border-border group-hover:border-accent/20 transition-colors">
                  {chip.icon}
                </div>
                <span className="text-[11px] leading-tight font-black uppercase tracking-wider text-text-muted bg-surface-raised px-2 py-0.5 rounded-full border border-border">
                  {chip.tag}
                </span>
              </div>
              
              <div className="flex justify-between items-end w-full">
                <p className="text-xs font-bold text-text-muted group-hover:text-text-primary leading-snug line-clamp-3 transition-colors max-w-[88%]">
                  {text}
                </p>
                <ArrowRight size={12} className="text-text-muted group-hover:text-accent transform group-hover:translate-x-1.5 transition-all shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
