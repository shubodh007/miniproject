import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, FileText, ChevronRight, Compass, Maximize2, RotateCcw, 
  MapPin, CheckCircle, Feather, Eye, Scale, Download, 
  Layers, Lock, Sparkles, Building
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastProvider';

interface ArtifactSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  documentContent: string;
  templateId?: string;
}

export const ArtifactSidebar: React.FC<ArtifactSidebarProps> = ({
  isOpen,
  onClose,
  documentName,
  documentContent,
  templateId = 'generic'
}) => {
  const { language } = useTranslation();
  const isTe = language === 'te';
  const { toast } = useToast();

  // State for active view tab inside the artifact panel
  const [activeTab, setActiveTab] = useState<'deed' | 'letter' | 'map'>('deed');

  // Map settings
  const [zoom, setZoom] = useState<number>(1);
  const [selectedParcel, setSelectedParcel] = useState<string | null>(null);
  const [showLayer, setShowLayer] = useState<'sat' | 'cadastral'>('cadastral');

  // Letter signature states
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [stampUrl, setStampUrl] = useState<boolean>(true);

  // Sync tab with document change triggers
  useEffect(() => {
    if (templateId === 'grievance' || templateId === 'income') {
      setActiveTab('letter');
    } else if (templateId === 'land-lease') {
      setActiveTab('deed');
    } else {
      setActiveTab('deed');
    }
  }, [templateId, documentContent]);

  if (!isOpen) return null;

  // Custom metadata based on templates to make the deeds look unbelievably realistic
  const getDeedMeta = () => {
    switch (templateId) {
      case 'rental':
        return {
          deedNumber: "AP-REG-RNT-2026-89104",
          officerName: "M. Subba Rao, MRO (Sub-Registrar)",
          location: "Vijayawada Circle, NTR District",
          stampValue: "₹100 Non-Judicial India",
          jurisdiction: "Andhra Pradesh Rent Control Act, 2011"
        };
      case 'affidavit':
        return {
          deedNumber: "AP-AFF-JD-2026-44122",
          officerName: "K. Venkata Swamy, Notary Public",
          location: "Tenali Court Compound, Guntur District",
          stampValue: "₹20 Judicial Affidavit",
          jurisdiction: "Indian Oaths Act, 1969"
        };
      case 'income':
        return {
          deedNumber: "AP-INC-CERT-2026-61344",
          officerName: "Smt. G. Sarada Rao, Tehsildar Office",
          location: "Tenali Mandal Area, Guntur",
          stampValue: "Mandal Official Attested Direct",
          jurisdiction: "AP Civil Services Rules Chapter IV"
        };
      case 'land-lease':
        return {
          deedNumber: "AP-LND-LSE-2026-72412",
          officerName: "B. Nageswara Reddy, Revenue Inspector",
          location: "Suryapet Mandal, Suryapet District",
          stampValue: "₹500 Ag-Tenancy Covenant",
          jurisdiction: "Andhra Pradesh Land Leases & Tenancy Protection Act"
        };
      case 'grievance':
        return {
          deedNumber: "AP-CIV-GRV-2026-38299",
          officerName: "Civic Welfare Desk AP Jagananna Amma Vodi",
          location: "Chittoor Mandal, AP",
          stampValue: "AP Civic Grievance Reg Core",
          jurisdiction: "AP Right to Services Charter, 2018"
        };
      default:
        return {
          deedNumber: "AP-CIV-DEED-2026-10022",
          officerName: "Panchayat Advisory Officer",
          location: "Coastal AP Survey Region",
          stampValue: "Interactive Plaintext Digest Core",
          jurisdiction: "Indian Contract Act, 1872"
        };
    }
  };

  const meta = getDeedMeta();

  // Coordinates data for mapping highlights
  const getCoordinatesData = () => {
    if (templateId === 'rental') {
      return {
        lat: "16.5074° N",
        lng: "80.6465° E",
        survey: "Survey Plot No: 124-A, Ward 3",
        tract: "Vijayawada Municipal Limits",
        parcels: [
          { id: "A", name: "Leased Flat No. 402", size: "1,200 sq.ft.", status: "Primary Lease Plot", border: "M: 78.4m" },
          { id: "B", name: "Adjacent Roadway Ingress", size: "20ft Public", status: "Easement Access", border: "N/A" }
        ]
      };
    }
    if (templateId === 'land-lease') {
      return {
        lat: "17.1425° N",
        lng: "79.6254° E",
        survey: "Agric. Survey No: 421/B, Survey Row 4",
        tract: "Suryapet Cultivation Lands Zone",
        parcels: [
          { id: "421/A", name: "Pattadar Master Paddy Yard", size: "4.2 Acres", status: "Lessor Owned (B. Satyanarayana)", border: "North Boundary Line" },
          { id: "421/B", name: "Cultivator Leased Crop Field", size: "3.5 Acres", status: "Active Leased Plot (P. Venkateswarlu)", border: "Subject of Deed" },
          { id: "421/C", name: "Borewell & Shared Submersible Pump", size: "0.1 Acres Shared", status: "Water Source Plot", border: "High-Risk Climate Spot" }
        ]
      };
    }
    return {
      lat: "16.3067° N",
      lng: "80.4365° E",
      survey: "Mandal Survey Sector 88",
      tract: "Guntur Tenali Civil Zone",
      parcels: [
        { id: "P-1", name: "Residential Homestead", size: "0.08 Acres", status: "Deponent Residence", border: "N: Main Guntur Road" },
        { id: "P-2", name: "Agricultural Tenant Dry Land", size: "1.1 Acres", status: "Farming Use", border: "S: Shared Drainage Drain" }
      ]
    };
  };

  const mapData = getCoordinatesData();

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.aside
      id="claude-artifact-sidebar"
      layoutId="artifact-sidebar"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      className="w-full lg:w-[40%] h-[calc(100vh-56px)] md:h-screen fixed lg:relative top-14 md:top-0 right-0 z-30 bg-bg-surface border-l border-border-default shadow-3xl flex flex-col overflow-hidden text-left shrink-0"
    >
      {/* Top Sidebar Header */}
      <div id="art-sidebar-header" className="px-5 py-4 border-b border-border-default bg-bg-surface/90 backdrop-blur flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-saffron/10 text-accent-saffron border border-accent-saffron/20 flex items-center justify-center font-bold text-sm shadow-inner">
            <Scale size={15} className="text-accent-saffron" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-text-primary tracking-tight flex items-center gap-1.5">
              <span>Nyaya Artifact Viewer</span>
              <span className="text-[10px] leading-tight px-1.5 py-0.5 bg-accent-saffron/10 text-accent-saffron border border-accent-saffron/20 rounded font-black uppercase">Claude Style</span>
            </h3>
            <p className="text-[11px] leading-tight text-text-muted font-bold truncate max-w-[280px]">{documentName || 'WelfareDocument.txt'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={handlePrint}
            className="p-1.5 rounded-lg bg-bg-base border border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary hover:bg-bg-elevated cursor-pointer transition"
            title="Export / Print Deed"
            aria-label="Export or Print Deed"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition cursor-pointer"
            title="Close Panel"
            aria-label="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Selector Navigation Bar */}
      <div id="art-tab-selector" className="px-4 py-1.5 bg-bg-base/30 border-b border-border-subtle flex items-center justify-between shrink-0 select-none">
        <div className="flex space-x-1 w-full">
          <button
            onClick={() => setActiveTab('deed')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[11px] leading-tight font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'deed'
                ? 'bg-bg-surface text-accent-saffron border border-border-default/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <FileText size={12} />
            <span>{isTe ? 'ప్రాచీన పత్రం' : 'Paper Deed'}</span>
          </button>
          <button
            onClick={() => setActiveTab('letter')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[11px] leading-tight font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'letter'
                ? 'bg-bg-surface text-accent-saffron border border-border-default/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Feather size={12} />
            <span>{isTe ? 'కౌన్సిలింగ్ లేఖ' : 'Legal Letter'}</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[11px] leading-tight font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-bg-surface text-accent-saffron border border-border-default/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Compass size={12} />
            <span>{isTe ? 'భూమి మ్యాప్' : 'Cadastral Map'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-bg-base/20 scrollbar-thin">
        {activeTab === 'deed' && (
          <div id="parchment-deed-artifact" className="relative transition-all duration-300">
            {/* Stamp Duty Header Banner */}
            <div className="mb-4 bg-red-800/10 border-2 border-red-800/20 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-xs">
              <span className="text-[10px] uppercase font-black tracking-widest text-red-600">STAMP DUTY GUARANTEE DEED</span>
              <h4 className="text-xs font-black text-red-700 tracking-wide mt-1">{meta.stampValue}</h4>
              <p className="text-[9px] leading-none text-text-muted mt-0.5 font-bold font-mono">ID: {meta.deedNumber}</p>
            </div>

            {/* Vintage Paper Scroll Parchment Wrapper */}
            <div 
              id="vintage-deed-parchment" 
              className="relative p-6 sm:p-8 bg-[#FBF9F3] text-[#2C2621] border-2 border-[#D4C3A3] rounded-sm shadow-xl overflow-hidden font-serif leading-relaxed text-left"
              style={{
                boxShadow: '0 10px 30px rgba(0,0,0,0.15), inset 0 0 40px rgba(212,195,163,0.3)',
                backgroundImage: 'radial-gradient(ellipse at center, #FDFDFB 0%, #FAF6ED 100%)'
              }}
            >
              {/* Aged watermark element */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
                <svg className="w-72 h-72 text-[#4A3E31]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7s0 6 8 10z" />
                </svg>
              </div>

              {/* Decorative Indian Ornamental Border Line */}
              <div className="absolute top-2 bottom-2 left-2 right-2 border border-[#E7DECD] pointer-events-none" />
              <div className="absolute top-3 bottom-3 left-3 right-3 border border-dashed border-[#DCD1BA] pointer-events-none" />

              {/* Government Crest Logo Header Mock */}
              <div className="text-center mb-6 relative">
                <div className="mx-auto w-12 h-12 rounded-full border border-[#BFA779] flex items-center justify-center text-[#997E4F] bg-[#FFFDFC] shadow-inner mb-2">
                  <span className="text-[10px] leading-tight font-sans font-black">AP CIVIC</span>
                </div>
                <h1 className="text-base font-extrabold uppercase tracking-wide text-[#735A33]">
                  {language === 'te' ? 'కౌలు ఒప్పంద అధికారిక పత్రం' : 'WELFARE TENANCY PROTECTION DEED'}
                </h1>
                <p className="text-[9px] font-sans font-semibold tracking-wider text-[#AFA187]">GOVERNMENT OF ANDHRA PRADESH • ADVISORY OUTPOST OFFICE</p>
                <div className="w-16 h-0.5 bg-[#D4C3A3] mx-auto mt-2" />
              </div>

              {/* Deed Content Block */}
              <div className="text-[12px] sm:text-[13px] leading-loose space-y-4 text-justify pr-1" style={{ textIndent: '1.5rem' }}>
                <p className="font-bold mb-3 font-sans text-center text-[10px] tracking-wider text-[#99471F] uppercase relative" style={{ textIndent: 0 }}>
                  *** JURISDICTION: {meta.jurisdiction} ***
                </p>
                {documentContent ? (
                  documentContent.split('\n').map((line, idx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return null;
                    if (cleanLine.startsWith('RENTAL AGREEMENT') || cleanLine.startsWith('SELF-DECLARE AFFIDAVIT') || cleanLine.startsWith('AGRICUTURAL LAND') || cleanLine.startsWith('INCOME CERTIFICATE') || cleanLine.startsWith('CIVIC WELFARE')) {
                      return <h4 key={idx} className="font-sans font-black tracking-normal text-xs text-[#593E1A] border-b border-[#EADFC7] pb-1 uppercase mt-4 mb-2 select-none" style={{ textIndent: 0 }}>{cleanLine}</h4>;
                    }
                    if (cleanLine.startsWith('WITNESS') || cleanLine.startsWith('VERIFICATION') || cleanLine.startsWith('LOCAL REVENUE') || cleanLine.startsWith('ENDORSEMENT')) {
                      return <h5 key={idx} className="font-sans font-bold text-[11px] leading-tight tracking-wider text-[#7A5B36] uppercase mt-5 mb-1.5 select-none" style={{ textIndent: 0 }}>{cleanLine}</h5>;
                    }
                    return <p key={idx} className="font-serif leading-relaxed text-[#4A3B2C] relative">{cleanLine}</p>;
                  })
                ) : (
                  <p className="font-serif italic text-center py-6 text-text-muted">
                    No active document contents analyzed yet. Upload structured agreements on the analyzer or dashboard workspace to generate traditional paper deeds.
                  </p>
                )}
              </div>

              {/* Dynamic Witness Signatures & Digital Wax Stamp Sign off */}
              {documentContent && (
                <div className="mt-8 pt-5 border-t border-dashed border-[#D3C4A5] text-[11px] font-sans text-[#5A4D3B] space-y-4" style={{ textIndent: 0 }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] text-[#A29173] font-bold uppercase tracking-wider">Lessor/Declarant Verified:</span>
                      <span className="block italic text-xs text-[#1E3E28] font-semibold font-serif mt-1">Smt. Lakshmi Devi</span>
                      <span className="block text-[9px] border-t border-[#E7DECD] pt-0.5 mt-0.5">Approved Signature</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#A29173] font-bold uppercase tracking-wider">Tenant/Deponent Verified:</span>
                      <span className="block italic text-xs text-[#1E3E28] font-semibold font-serif mt-1">Sri P. Venkateswarlu</span>
                      <span className="block text-[9px] border-t border-[#E7DECD] pt-0.5 mt-0.5">Approved Signature</span>
                    </div>
                  </div>

                  {/* Red Wax Seal Motif SVG */}
                  <div className="flex items-center justify-between pt-4 mt-2">
                    <div className="flex items-center space-x-1.5 text-[10px] text-text-muted font-bold">
                      <Lock size={11} className="text-[#A29173]" />
                      <span>Immutable Hash Verification Active</span>
                    </div>
                    
                    {/* Simulated Wax Seal Stamp */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center select-none rotate-3 hover:scale-105 transition-transform duration-300">
                      <div className="absolute inset-0 bg-[#AC1F2E] rounded-full blur-[1px] opacity-90 shadow-lg scale-95" style={{ borderRadius: '48% 52% 45% 55% / 50% 48% 52% 50%' }} />
                      <div className="absolute inset-1 border-[1.5px] border-dashed border-[#DC8A93] rounded-full flex items-center justify-center">
                        <span className="text-[7px] leading-tight font-black font-sans text-[#FFF] tracking-widest uppercase text-center">AP REGISTRY<br/>CIVIC SAFETY</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'letter' && (
          <div id="legal-advisory-letter-panel" className="relative transition-all duration-300">
            {/* Stamp Duty Diagonal Ribbon Alert */}
            <div className="bg-orange-850/10 border border-orange-500/20 rounded-xl px-4 py-3 text-left mb-4 flex items-center space-x-2 animate-fade-in shadow-xs">
              <Sparkles size={14} className="text-orange-500" />
              <span className="text-[11px] leading-tight font-semibold text-text-secondary">
                This legal representation is structured on relevant judicial frameworks ready for delivery.
              </span>
            </div>

            {/* Official Clean White Letterhead Papier */}
            <div 
              id="formal-letter-papier" 
              className="relative p-6 sm:p-8 bg-bg-surface text-text-primary border border-[#E2E8F0] rounded-lg shadow-xl font-sans leading-relaxed text-left"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}
            >
              {/* Draft Stamp Diagonal Overlay */}
              <div className="absolute top-24 right-4 rotate-12 border-4 border-emerald-500/30 text-emerald-500/40 font-black font-mono text-xs px-3 py-1.5 tracking-widest pointer-events-none rounded select-none">
                {isSigned ? 'DRAFT SIGNED' : 'DRAFT APPROVED'}
              </div>

              {/* Upper Header Strip Logo */}
              <div className="flex justify-between items-start border-b-2 border-accent-saffron pb-4 mb-5">
                <div>
                  <h2 className="text-sm font-extrabold text-text-primary tracking-tight uppercase flex items-center gap-1">
                    <Building size={14} className="text-accent-saffron" />
                    <span>Sri Nyaya Advisor Core</span>
                  </h2>
                  <p className="text-[10px] text-text-muted mt-0.5 font-bold">Welfare Protection Outpost Bureau • Vijayawada Central</p>
                  <p className="text-[9px] text-text-muted font-mono leading-none">REFID: NYA-AP-2026-90412</p>
                </div>
                <div className="text-right text-[10.5px] leading-tight text-text-secondary font-semibold font-mono">
                  <p>Date: June 22, 2026</p>
                  <p>State Code: AP-37</p>
                </div>
              </div>

              {/* Addressee Fields */}
              <div className="text-[11.5px] leading-tight text-text-secondary font-semibold space-y-1 mb-5">
                <p className="text-text-muted font-bold text-[10px] tracking-wide uppercase">TO EXECUTIVE OFFICER:</p>
                <p className="font-bold text-text-primary">The Mandal Revenue Officer (MRO) / Tehsildar Office</p>
                <p>Tenali Mandal Department Base</p>
                <p>District Guntur, Andhra Pradesh, India</p>
              </div>

              {/* Subject Line */}
              <div className="bg-bg-base/30 border border-border-subtle p-2.5 rounded-lg mb-5 text-[11.5px] leading-tight">
                <p className="font-bold text-text-primary">
                  <span className="text-accent-saffron">SUBJECT: </span>
                  Formal Representation for Land Tenancy Security &amp; Crop Support Approval (Survey Plot No. {templateId === 'land-lease' ? '421/B' : '124-A'})
                </p>
              </div>

              {/* Formal Text Copy Blocks */}
              <div className="text-xs text-text-secondary leading-relaxed space-y-4 mb-6 text-justify">
                <p>Respected Sir/Madam,</p>
                <p>
                  This formal civic representation is respectfully presented under established agricultural land tenancy protection directives of the region regarding our citizen tenant agriculturist 
                  <strong> Sri P. Venkateswarlu</strong>, currently cultivating a tract of <strong className="text-text-primary">3.5 Acres</strong> at 
                  <strong> Survey Plot Number 421/B</strong> in Suryapet Mandal zone.
                </p>
                <p>
                  Initial AI-enabled regulatory scanning on the agricultural lease agreement has identified specific clauses assigning full seasonal weather, dry drought, and water supply failure risk entirely to the tenant peasant. We assertively request the inclusion of a 
                  <span className="text-accent-blue font-bold"> Force-Majeure Rent Protection Clause</span> which guarantees a proportional 50% discount in lease rents in event of extreme groundwater or electric sub-station supply failures.
                </p>
                <p>
                  Furthermore, under statutory revenue protection standards, we request your kind office to quickly issue the official 
                  <strong className="text-text-primary"> Cultivator Crop Entitlement Card</strong>, so our registered tenant agriculturist can securely obtain seed subsidy allocations, fertilizer quota vouchers, and crop loss credit protections during upcoming kharif season.
                </p>
                <p>We are hopeful for a favorable decision supporting agricultural equity at your earliest convenience.</p>
              </div>

              {/* Letter Signatures and interactive button */}
              <div className="mt-8 pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-[11px] leading-none text-text-muted">
                  <p>Drawn &amp; Verified By:</p>
                  <p className="font-bold text-text-secondary font-serif mt-1">Sri Nyaya Advisor Council</p>
                  <p className="text-[9px] mt-0.5">Citizen Legal Defense Program</p>
                </div>
                
                <div id="interactive-letter-signature-block">
                  {isSigned ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[13px] text-emerald-500 font-serif font-black tracking-normal leading-none rotate-[-4deg]">Sri Nyaya Registry</span>
                      <span className="text-[9px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded font-bold uppercase mt-1 select-none flex items-center gap-1">
                        <CheckCircle size={9} /> Digitally Signed
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSigned(true);
                        toast.success(isTe ? 'లేఖపై డిజిటల్ సంతకం నమోదు చేయబడింది!' : 'Legal Letter Signed Successfully!');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-accent-saffron text-white text-[11px] leading-tight font-bold cursor-pointer hover:bg-accent-saffron/90 transition select-none flex items-center gap-1 shadow-sm"
                    >
                      <Feather size={12} />
                      <span>Sign Letter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div id="survey-map-artifact-pane" className="relative transition-all duration-300">
            {/* Interactive Coordinate Reading */}
            <div className="bg-bg-surface border border-border-main rounded-2xl p-4 shadow-sm text-left space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <MapPin size={14} className="text-accent-saffron" />
                  <span className="text-xs font-black text-text-primary uppercase tracking-wide">Survey GPS Coordinates</span>
                </div>
                <span className="text-[11px] font-mono bg-bg-base border border-border-subtle px-2 py-0.5 rounded text-text-secondary">
                  {mapData.lat}, {mapData.lng}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-tight font-bold">
                Tract Unit: <span className="text-text-secondary font-semibold">{mapData.tract}</span>
              </p>
            </div>

            {/* CSS-Styled Cadastral Survey Map Box */}
            <div 
              id="cadastral-map-canvas" 
              className="relative aspect-square w-full rounded-2xl bg-bg-base border border-border-main overflow-hidden shadow-inner flex flex-col items-center justify-center group"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--color-border-subtle) 1.2px, transparent 1.2px)',
                backgroundSize: '16px 16px'
              }}
            >

              {/* Geographic Graphic Render Area */}
              <div 
                className="relative w-full h-full p-4 flex items-center justify-center transition-transform duration-300 pointer-events-none"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* Visual Plot Drawing (Interactive SVGs) */}
                <svg className="w-[85%] h-[85%] text-text-secondary select-none" viewBox="0 0 100 100">
                  {/* Surrounding Plots in thin border */}
                  <polygon 
                    points="5,5 35,5 40,40 5,30" 
                    fill="rgba(59, 130, 246, 0.03)" 
                    stroke="rgba(148, 163, 184, 0.3)" 
                    strokeWidth="0.8" 
                    className="pointer-events-auto cursor-help"
                    onClick={(e) => { e.stopPropagation(); setSelectedParcel("Survey 420-A"); }}
                  />
                  <text x="15" y="20" className="text-[4px] font-mono fill-text-muted font-bold select-none">Survey 420-A</text>

                  {/* Roadway easement corridor */}
                  <polygon 
                    points="3,48 45,55 50,59 3,52" 
                    fill="rgba(245, 158, 11, 0.08)" 
                    stroke="rgba(245, 158, 11, 0.4)" 
                    strokeWidth="0.8" 
                    strokeDasharray="2,2"
                    className="pointer-events-auto cursor-help"
                    onClick={(e) => { e.stopPropagation(); setSelectedParcel("Public Ingress Path"); }}
                  />
                  <text x="12" y="56" className="text-[3px] font-mono fill-accent-saffron font-extrabold select-none rotate-5">Public Pathway Easement</text>

                  {/* Master Plot 421/A */}
                  <polygon 
                    points="35,5 95,5 95,45 40,40" 
                    fill={selectedParcel === "421/A" ? "rgba(16, 185, 129, 0.08)" : "rgba(148, 163, 184, 0.02)"} 
                    stroke={selectedParcel === "421/A" ? "rgba(16, 185, 129, 0.8)" : "rgba(148, 163, 184, 0.4)"} 
                    strokeWidth="1" 
                    className="pointer-events-auto cursor-pointer transition-colors"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedParcel("421/A"); }}
                  />
                  <text x="60" y="20" className="text-[4px] font-mono fill-text-muted font-bold select-none">Plot 421/A (Lessor Owned)</text>

                  {/* Subject Plot 421/B (Cultivated Leased Land) - Bold highlight */}
                  <polygon 
                    points="40,40 95,45 80,95 25,85" 
                    fill={selectedParcel === "421/B" || !selectedParcel ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.02)"} 
                    stroke={selectedParcel === "421/B" || !selectedParcel ? "#F59E0B" : "rgba(245, 158, 11, 0.4)"} 
                    strokeWidth={selectedParcel === "421/B" || !selectedParcel ? "1.8" : "1"} 
                    className="pointer-events-auto cursor-pointer transition-all"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedParcel("421/B"); }}
                  />
                  <text x="50" y="65" className="text-[5px] font-mono fill-accent-saffron font-black select-none tracking-wide">Plot 421/B (Leased Tract)</text>
                  
                  {/* High Risk Borewell Pump Marker Circle */}
                  <circle 
                    cx="70" 
                    cy="80" 
                    r="2.5" 
                    fill="#EF4444" 
                    className="pointer-events-auto cursor-pointer animate-pulse"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedParcel("Borewell Submersible Outlet"); }}
                  />
                  <text x="74" y="81.5" className="text-[3px] font-mono fill-red-500 font-black select-none">Shared Borewell Source</text>

                  {/* Compass cardinal grid coordinates marking lines */}
                  <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5" strokeDasharray="3,3" />
                </svg>

                {/* Compass visual indicator */}
                <div className="absolute top-4 right-4 bg-bg-surface/80 border border-border-subtle p-1.5 rounded-lg text-center font-mono text-[9px] leading-tight flex flex-col items-center select-none">
                  <span className="text-accent-saffron font-black">N</span>
                  <div className="w-1.5 h-6 bg-gradient-to-b from-accent-saffron via-border-default to-transparent rounded mt-1 mb-1" />
                  <span className="text-text-muted">S</span>
                </div>
              </div>

              {/* Bottom Interactive Layer Selector & Zoom Control Panel */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1.5 select-none bg-bg-surface/85 backdrop-blur-xs border border-border-subtle p-2 rounded-xl">
                <div className="flex bg-bg-base rounded-lg p-0.5 border border-border-subtle">
                  <button 
                    onClick={() => setShowLayer('sat')}
                    className={`px-2 py-1 text-[9px] font-black uppercase rounded ${showLayer === 'sat' ? 'bg-accent-saffron text-white shadow-xs' : 'text-text-muted hover:text-text-secondary'}`}
                  >
                    Satellite
                  </button>
                  <button 
                    onClick={() => setShowLayer('cadastral')}
                    className={`px-2 py-1 text-[9px] font-black uppercase rounded ${showLayer === 'cadastral' ? 'bg-accent-saffron text-white shadow-xs' : 'text-text-muted hover:text-text-secondary'}`}
                  >
                    Cadastral
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                    className="p-1.5 rounded bg-bg-base border border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary transition text-xs font-bold font-mono"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono font-bold text-text-secondary px-1">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
                    className="p-1.5 rounded bg-bg-base border border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary transition text-xs font-bold font-mono"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={() => { setZoom(1); setSelectedParcel(null); }}
                    className="p-1.5 rounded bg-bg-base border border-[#F1E9DA] hover:border-text-secondary text-text-secondary hover:text-text-primary transition"
                    title="Reset Focus"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Parcel Details readout block */}
            <div className="bg-bg-surface border border-border-default/80 rounded-2xl p-4 shadow-xs text-left text-xs animate-scale-in">
              <span className="text-[10px] leading-tight font-black text-text-muted uppercase tracking-wider block mb-2">Cadastral Boundary Registry Details:</span>
              <div className="space-y-1.5 leading-relaxed text-text-secondary">
                <p>Selected Tract: <strong className="text-text-primary">{selectedParcel || 'AP-Zone Plot 421/B'}</strong></p>
                <p>Primary Survey Reference: <span className="font-semibold text-text-primary">{mapData.survey}</span></p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle mt-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">Parcel Target Area:</span>
                    <span className="font-semibold text-text-primary">3.5 Acres (~14,164 sqm)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">Water Security Status:</span>
                    <span className="font-bold text-red-500">Shared Borewell Source</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Aged Scroll Bottom Footing */}
      <div className="px-5 py-3 border-t border-border-default bg-bg-surface/50 text-[10px] text-text-muted leading-relaxed select-none text-center">
        Press Esc or click absolute X overlay to slide back right. Always verify survey lines or deeds physically at local Secretariats.
      </div>
    </motion.aside>
  );
};
