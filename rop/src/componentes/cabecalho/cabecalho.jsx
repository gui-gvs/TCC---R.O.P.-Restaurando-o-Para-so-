import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PerfilUsuario from "../perfilUsuario/perfilUsuario.jsx";
import BotaoTema from "../botaoTema/BotaoTema.jsx";
import { HashLink } from "react-router-hash-link";

import "./cabecalho.scss";

function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const { pathname, hash } = useLocation();

  function linkAtivo(destino) {
    const [caminho, secao] = destino.split("#");
    if (pathname !== caminho) return false;
    if (secao) return hash === `#${secao}`;
    return caminho !== "/inicio" || !["#impactos", "#projetos", "#apadrinhe"].includes(hash);
  }

  function propsLink(destino) {
    const ativo = linkAtivo(destino);
    return {
      className: `comp-link${ativo ? " comp-link--ativo" : ""}`,
      "aria-current": ativo ? (destino.includes("#") ? "location" : "page") : undefined,
    };
  }

  useEffect(() => {
    function aoRolar() {
      setRolou(window.scrollY > 10);
    }

    aoRolar();

    window.addEventListener("scroll", aoRolar, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", aoRolar);
    };
  }, []);

  return (
    <>
      <header
        className={`comp-cabecalho ${rolou ? "rolou" : ""}`}
      >
        <div className="comp-corpo">
          <Link
            to="/inicio"
            className="comp-logo"
            aria-label="R.O.P. — Ir para o início"
          >
            <img
              src="/assets/img/componentes/cabecalho/logo.png"
              alt="R.O.P. — Restaurando o Paraíso"
            />
          </Link>

          <nav
            className="comp-botoes"
            aria-label="Navegação principal"
          >
            <Link to="/inicio" {...propsLink("/inicio")}>
              Início
            </Link>

            <Link to="/especies" {...propsLink("/especies")}>
              Espécies
            </Link>

            <Link to="/orientacoes" {...propsLink("/orientacoes")}>
              Orientações
            </Link>

            <Link to="/denuncia" {...propsLink("/denuncia")}>
              Denunciar
            </Link>

            <Link to="/noticias" {...propsLink("/noticias")}>
              Notícias
            </Link>

            <HashLink
              smooth
              to="/inicio#impactos"
              {...propsLink("/inicio#impactos")}
            >
              Impactos
            </HashLink>

            <HashLink
              smooth
              to="/inicio#projetos"
              {...propsLink("/inicio#projetos")}
            >
              Projetos
            </HashLink>

            <HashLink
              smooth
              to="/inicio#apadrinhe"
              {...propsLink("/inicio#apadrinhe")}
            >
              Apadrinhe
            </HashLink>

            <Link to="/loja" {...propsLink("/loja")}>
              Loja
            </Link>
          </nav>

          <div className="comp-acoes">
    <BotaoTema />
    <PerfilUsuario />

            <div className="comp-doe-div">
              <Link to="/doe" className={`comp-doe${linkAtivo("/doe") ? " comp-doe--ativo" : ""}`} aria-current={linkAtivo("/doe") ? "page" : undefined}>
                <img
                  src="/assets/img/componentes/cabecalho/coracao.png"
                  alt=""
                  className="icone-coracao"
                />

                <span>Doe agora</span>
              </Link>
            </div>
          </div>
        </div>

        <div
          className="comp-aviso"
          role="note"
          aria-hidden={rolou}
        >
          <b>Projeto fictício.</b>

          <span className="comp-aviso-longo">
            A R.O.P. não existe de verdade.
            Este site foi criado para um TCC.
          </span>

          <span className="comp-aviso-curto">
            Site criado para um TCC.
          </span>
        </div>
      </header>

      <div className="comp-espaco" aria-hidden="true" />
    </>
  );
}

export default Cabecalho;
