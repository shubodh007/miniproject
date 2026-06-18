import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class component ErrorBoundary to catch rendering/lifecycle errors in targeted sections.
 * Displays localized Telugu/English advisory notices and permits clean session recovery.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in [${this.props.sectionName || 'Unknown Section'}]:`, error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const section = this.props.sectionName || 'This section';
      
      // Determine approximate Telugu localization for the section name if possible
      let teluguSection = 'ఈ విభాగం';
      if (section === 'Legal Analyzer') teluguSection = 'చట్టపరమైన విశ్లేషణ విభాగం';
      else if (section === 'Smart Chat') teluguSection = 'వార్తాపూర్వక సహాయ కేంద్రీకృతం (స్మార్ట్ చాట్)';
      else if (section === 'Eligibility Results') teluguSection = 'అర్హత ఫలితాల విభాగం';
      else if (section === 'Dashboard') teluguSection = 'డాష్‌బోర్డ్ విభాగం';
      else if (section === 'Profile Wizard') teluguSection = 'ప్రొఫైల్ విజార్డ్ విభాగం';

      return (
        <div 
          className="w-full flex items-center justify-center p-6 md:p-12 min-h-[350px]"
          id={`error-boundary-${(section).toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="w-full max-w-lg p-6 md:p-8 bg-bg-surface border border-accent-saffron/30 rounded-2xl shadow-lg text-center flex flex-col items-center">
            <div className="p-3 bg-accent-saffron/10 rounded-full text-accent-saffron mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-lg font-bold text-text-primary mb-2">
              {section} encountered an error
            </h2>
            
            <p className="text-sm text-text-secondary mb-1">
              Try refreshing the page or restarting the session.
            </p>
            <p className="text-xs text-text-muted mb-6 font-medium">
              {teluguSection} లో లోపం ఏర్పడింది. పేజీని రిఫ్రెష్ చేయండి.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-accent-saffron hover:bg-accent-saffron/90 rounded-xl transition-all cursor-pointer shadow-sm scale-100 active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <a
                href={`mailto:support@schemeconnect-ap.gov.in?subject=Error Report in ${encodeURIComponent(section)}`}
                className="w-full sm:w-auto px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-text-primary hover:bg-bg-elevated border border-border-default rounded-xl transition-all"
              >
                <Mail className="w-4 h-4 text-text-muted" />
                Report Issue
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
