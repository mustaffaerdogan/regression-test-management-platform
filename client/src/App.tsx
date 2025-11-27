import { useEffect, useState } from 'react';
import './App.css';

type ApiStatus = {
  service: string;
  status: string;
  timestamp: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        if (!response.ok) {
          throw new Error('API yanıtı başarısız oldu');
        }
        const data = (await response.json()) as ApiStatus;
        setApiStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">MERN STACK</p>
        <h1>Regression Test Management Platform</h1>
        <p className="subtitle">
          Backend Express + MongoDB, frontend React + Vite. Bu temel yapı üzerinden özellikleri hızla
          geliştirebilirsiniz.
        </p>
      </section>

      <section className="status-panel">
        <header>
          <h2>API Sağlık Durumu</h2>
          <span className={`badge ${apiStatus?.status === 'online' ? 'online' : 'offline'}`}>
            {loading ? 'Kontrol ediliyor…' : apiStatus?.status ?? 'offline'}
          </span>
        </header>
        {error && <p className="error">{error}</p>}
        {!error && (
          <ul>
            <li>
              <strong>Servis:</strong> {apiStatus?.service ?? '—'}
            </li>
            <li>
              <strong>Zaman damgası:</strong> {apiStatus?.timestamp ?? '—'}
            </li>
            <li>
              <strong>Endpoint:</strong> {`${API_BASE_URL}/status`}
            </li>
          </ul>
        )}
      </section>

      <section className="next-steps">
        <h2>Sonraki Adımlar</h2>
        <ol>
          <li>MongoDB üzerinde ihtiyaç duyduğunuz koleksiyon şemalarını tanımlayın.</li>
          <li>Kimlik doğrulama/rol tabanlı erişim için Express middleware ekleyin.</li>
          <li>React bileşenlerini sayfalara ayırıp test yönetim akışınızı oluşturun.</li>
        </ol>
      </section>
    </main>
  );
}

export default App;
