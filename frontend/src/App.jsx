import { useState, useEffect } from 'react';
import { KioskLayout } from './components/KioskLayout';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UserInfoScreen } from './components/UserInfoScreen';
import { RepSelectScreen } from './components/RepSelectScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { fetchPoseSequence, BASE_URL } from './services/apiClient';

export default function App() {
  const [screen, setScreen]     = useState('welcome');
  const [userInfo, setUserInfo] = useState(null);
  // repData: { poseSequence, repLabel, repId }
  const [repData, setRepData]   = useState(null);

  const handleUserInfo = (info) => {
    setUserInfo(info);
    setScreen('repselect');
  };

  const handleAnalyze = (data) => {
    setRepData(data);
    setScreen('analysis');
  };

  const handleReset = () => {
    setScreen('welcome');
    setUserInfo(null);
    setRepData(null);
  };

  // Live mode: subscribe to SSE and auto-navigate when a new rep is captured
  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/events`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'new_rep') {
          fetchPoseSequence(event.id)
            .then(poseSequence => {
              setRepData({ poseSequence, repLabel: event.id, repId: event.id });
              setScreen('analysis');
            })
            .catch(err => console.warn('[SSE] Failed to fetch pose:', err));
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, []);

  return (
    <KioskLayout>
      {screen === 'welcome'   && <WelcomeScreen onStart={() => setScreen('userinfo')} />}
      {screen === 'userinfo'  && <UserInfoScreen onContinue={handleUserInfo} onBack={() => setScreen('welcome')} />}
      {screen === 'repselect' && <RepSelectScreen onAnalyze={handleAnalyze} onBack={() => setScreen('userinfo')} />}
      {screen === 'analysis'  && (
        <AnalysisScreen
          onReset={handleReset}
          userInfo={userInfo}
          poseSequence={repData?.poseSequence}
          repLabel={repData?.repLabel}
          repId={repData?.repId}
        />
      )}
    </KioskLayout>
  );
}
