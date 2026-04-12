import { useEffect, useState } from 'react';

export interface MMILoaderState {
  error: string | null;
  isLoaded: boolean;
  status: 'idle' | 'loading' | 'ready' | 'missing_key' | 'error';
}

const MAP_CONFIG_ERROR = 'Map preview is unavailable until the Mappls key is configured.';
const MAP_LOAD_ERROR = 'Map preview is unavailable right now. You can still continue without it.';

export function useMMILoader(): MMILoaderState {
  const [state, setState] = useState<MMILoaderState>({
    error: null,
    isLoaded: false,
    status: 'idle'
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.mappls) {
      setState({
        error: null,
        isLoaded: true,
        status: 'ready'
      });
      return;
    }

    const key = import.meta.env.VITE_MMI_KEY?.trim();
    if (!key) {
      setState({
        error: MAP_CONFIG_ERROR,
        isLoaded: false,
        status: 'missing_key'
      });
      return;
    }

    setState((current) => {
      if (current.status === 'ready') {
        return current;
      }

      return {
        error: null,
        isLoaded: false,
        status: 'loading'
      };
    });

    const existing = document.getElementById('mmi-script') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      setState({
        error: null,
        isLoaded: true,
        status: 'ready'
      });
    };

    const handleError = () => {
      setState({
        error: MAP_LOAD_ERROR,
        isLoaded: false,
        status: 'error'
      });
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    if (!existing) {
      script.id = 'mmi-script';
      script.src = `https://apis.mappls.com/advancedmaps/v1/${key}/map_load?v=1.5&plugins=search`;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, []);

  return state;
}
