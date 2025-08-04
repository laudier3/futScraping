import styled from 'styled-components';

const Nav = styled.nav`
  background: #1f1f1f;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
`;

const NavLinks = styled.div`
  a {
    color: #ccc;
    margin-left: 1.5rem;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: #fff;
    }
  }
`;

export const Navbar = () => {
  return (
    <Nav>
      <Logo>🎥 Vídeos ao Vivo</Logo>
      <NavLinks>
        <a href="http://localhost:3000/scrape">Atualiza</a>
        <a href="http://localhost:3000/scrape-streams">Jogos</a>
      </NavLinks>
    </Nav>
  );
};
