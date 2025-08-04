import { useEffect, useState } from "react";
import { VideoPlayer } from "./pages/VideoPlayer";
import { Navbar } from "./pages/Navbar";
import styled from 'styled-components';

const ConainerApp = styled.nav`
  max-width: 80%;
  margin: auto;
  margin-bottom: 60px;
  margin-top: 60px
`;


interface Stream {
  iframeUrl: string;
  title: string;
  date?: string;
}

interface Match {
  title: string;
  date: string | null;
  streams: Stream[];
}

interface VideoInfo {
  title: string;
  date: string | null;
  iframeUrl: string;
}

function App() {
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/futeboldehoje")
      .then((res) => res.json())
      .then((matches: Match[]) => {
        // Para cada partida, pegar os streams embedflix e criar objeto com título e data
        const vids: VideoInfo[] = matches.flatMap(match => 
          match.streams
            .filter(s => s.iframeUrl.includes("https://embedflix.top/tv/player.php?id="))
            .map(s => ({
              title: match.title,
              date: match.date,
              iframeUrl: s.iframeUrl,
            }))
        );

        setVideos(vids);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar dados:", err);
        setError("Falha ao carregar vídeos");
        setLoading(false);
      });
  }, []);

  return (
   <>
   <Navbar/>
     <ConainerApp>

      {loading && <p className="text-center text-gray-600">Carregando vídeos...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}

      {!loading && !error && videos.length === 0 && (
        <p className="text-center text-gray-500">Nenhum vídeo disponível no momento.</p>
      )}

      {/* Grid responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            {/*<h2 style={{fontSize: 20}}>{video.title}</h2>*/}
            {video.date && <p className="text-sm text-gray-500 mb-3">📅 {video.date}</p>}
            <VideoPlayer iframeUrl={video.iframeUrl} title={video.title} date={video.date ?? undefined} />
          </div>
        ))}
      </div>
    </ConainerApp>
   </>
  );
}

export default App;
