import './VideoGrid.css';
import styled from 'styled-components';

const Conatiner = styled.nav`
  max-width: 100%;
  margin: auto;
`;

interface Match {
  id: number;
  title: string;
  iframeUrl: string;
  date: string;
}

interface VideoGridProps {
  matches: Match[];
}

interface VideoPlayerProps {
  iframeUrl: string;
  title?: string;
  date?: string;
}

export const VideoPlayer = ({ iframeUrl, title, date }: VideoPlayerProps) => {

  //console.log(title, date)

  return (
    <Conatiner>
      <div className="card">
        <div className="video-wrapper">
          <iframe
            src={iframeUrl}
            allowFullScreen
            title={title}
            loading="lazy"
          />
        </div>
        <div className="card-content">
          <h3 className="card-title">{title}</h3>
          <p className="card-date">📅 {date}</p>
        </div>
      </div>
    </Conatiner>
  );
};

export const VideoGrid = ({ matches }: VideoGridProps) => {
  return (
    <div className="container">
      <h1 className="title">⚽ Futebol Ao Vivo - Assista Agora</h1>
      <div className="grid">
        {matches.map((match) => (
          <VideoPlayer
            key={match.id}
            iframeUrl={match.iframeUrl}
            title={match.title}
            date={match.date}
          />
        ))}
      </div>
    </div>
  );
};
