import { useState, useEffect, useRef } from 'react';
import { KioskLayout } from './components/KioskLayout';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LiveScreen } from './components/LiveScreen';
import { RepSelectScreen } from './components/RepSelectScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { fetchPoseSequence, BASE_URL } from './services/apiClient';

export default function App() {
  const [screen, setScreen]               = useState('welcome');
  const [appMode, setAppMode]             = useState('live'); // 'live' | 'batch'
  const [repData, setRepData]             = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const retryRef  = useRef(null);
  const esRef     = useRef(null);
  const modeRef   = useRef('live');         // readable inside SSE closure without re-subscribing

  const handleMode = (mode) => {
    setAppMode(mode);
    modeRef.current = mode;
    setScreen(mode === 'live' ? 'live' : 'repselect');
  };

  const handleAnalyze = (data) => {
    setRepData(data);
    setScreen('analysis');
  };

  const handleReset = () => {
    setScreen('welcome');
    setRepData(null);
  };

  // Live mode: subscribe to SSE and auto-navigate when a new rep is captured.
  // Reconnects automatically on error so a backend restart doesn't break the session.
  useEffect(() => {
    function connect() {
      const es = new EventSource(`${BASE_URL}/events`);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'connected') {
            setLiveConnected(true);
          }
          if (event.type === 'new_rep' && modeRef.current === 'live') {
            fetchPoseSequence(event.id)
              .then(poseSequence => {
                setRepData({ poseSequence, repLabel: event.id, repId: event.id });
                setScreen('analysis');
              })
              .catch(err => console.warn('[SSE] Failed to fetch pose:', err));
          }
        } catch { /* ignore malformed events */ }
      };

      es.onerror = () => {
        setLiveConnected(false);
        es.close();
        retryRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryRef.current);
      if (esRef.current) esRef.current.close();
    };
  }, []);

  return (
    <KioskLayout liveConnected={liveConnected}>
      {screen === 'welcome'   && <WelcomeScreen onMode={handleMode} liveConnected={liveConnected} />}
      {screen === 'live'      && <LiveScreen onBack={() => setScreen('welcome')} />}
      {screen === 'repselect' && (
        <RepSelectScreen
          onAnalyze={handleAnalyze}
          onBack={() => setScreen('welcome')}
          scope="all"
        />
      )}
      {screen === 'analysis'  && (
        <AnalysisScreen
          onReset={handleReset}
          userInfo={null}
          poseSequence={repData?.poseSequence}
          repLabel={repData?.repLabel}
          repId={repData?.repId}
        />
      )}
    </KioskLayout>
  );
}
