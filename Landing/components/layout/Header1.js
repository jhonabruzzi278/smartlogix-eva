import Link from "next/link"

export default function Header1({ scroll, handleMobileMenuOpen }) {
    return (
        <>
            <header className={scroll ? "header sticky-bar stick header-solid" : "header sticky-bar"}>
                <div className="container">
                    <div className="main-header">
                        <div className="header-left">
                            <div className="header-logo">
                                <Link className="d-flex" href="/">
                                    <svg width="170" height="42" viewBox="0 0 170 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="2" y="5" width="32" height="32" rx="8" fill="#FEC201"/>
                                        <text x="10" y="27" fontFamily="Arial" fontWeight="900" fontSize="18" fill="#034460">S</text>
                                        <text x="42" y="28" fontFamily="Arial" fontWeight="800" fontSize="20" fill="#034460">SmartLogix</text>
                                    </svg>
                                </Link>
                            </div>
                            <div className="header-nav">
                                <nav className="nav-main-menu d-none d-xl-block">
                                    <ul className="main-menu">
                                        <li><Link href="/">Inicio</Link></li>
                                        <li><a href="#caracteristicas">Características</a></li>
                                        <li><a href="#como-funciona">Cómo Funciona</a></li>
                                        <li><a href="#planes">Planes</a></li>
                                        <li><a href="#demo">Solicitar Demo</a></li>
                                        <li><a href="#faq">FAQ</a></li>
                                    </ul>
                                </nav>
                                <div className="burger-icon burger-icon-white" onClick={handleMobileMenuOpen}>
                                    <span className="burger-icon-top" />
                                    <span className="burger-icon-mid" />
                                    <span className="burger-icon-bottom" />
                                </div>
                            </div>
                            <div className="header-right">
                                <div className="d-none d-sm-inline-block">
                                    <Link className="btn btn-default mr-10 hover-up" href="https://app.smartlogix.cl">Iniciar Sesión</Link>
                                    <Link className="btn btn-brand-1 d-none d-xl-inline-block hover-up" href="#demo">Solicitar Demo</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <style jsx global>{`
                .header-solid {
                    background: #fff;
                    box-shadow: 0 2px 20px rgba(3, 68, 96, 0.08);
                }
            `}</style>
        </>
    )
}
