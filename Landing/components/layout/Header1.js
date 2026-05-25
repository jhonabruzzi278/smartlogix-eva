import Link from "next/link"

export default function Header1({ scroll, handleMobileMenuOpen }) {
    return (
        <>
            <div className="box-bar bg-grey-900">
                <div className="container position-relative">
                    <div className="row align-items-center">
                        <div className="col-lg-8 col-md-8 col-sm-6 col-6">
                            <Link className="phone-icon mr-30" href="tel:+56-9-1234-5678" style={{fontSize:13}}>
                                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{width:13,height:13}}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>+56 9 1234 5678
                            </Link>
                            <Link className="email-icon d-none d-sm-inline-block" href="mailto:contacto@smartlogix.cl" style={{fontSize:13}}>
                                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{width:13,height:13}}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>contacto@smartlogix.cl
                            </Link>
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-6 col-6 text-end">
                            <Link className="icon-socials icon-facebook2 d-none d-sm-inline-block" href="#" />
                            <Link className="icon-socials icon-instagram2 d-none d-sm-inline-block" href="#" />
                            <Link className="icon-socials icon-youtube2 d-none d-sm-inline-block" href="#" />
                        </div>
                    </div>
                </div>
            </div>
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
                                    <ul className="main-menu" style={{gap:8}}>
                                        <li><Link className="nav-link-custom" href="/">Inicio</Link></li>
                                        <li><a className="nav-link-custom" href="#caracteristicas">Características</a></li>
                                        <li><a className="nav-link-custom" href="#como-funciona">Cómo Funciona</a></li>
                                        <li><a className="nav-link-custom" href="#planes">Planes</a></li>
                                        <li><a className="nav-link-custom" href="#demo">Solicitar Demo</a></li>
                                        <li><a className="nav-link-custom" href="#faq">FAQ</a></li>
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
                                    <Link className="btn btn-default mr-10 hover-up" href="https://app.smartlogix.cl" style={{fontWeight:600,fontSize:14}}>Iniciar Sesión</Link>
                                    <Link className="btn btn-brand-1 d-none d-xl-inline-block hover-up" href="#demo" style={{fontWeight:600,fontSize:14}}>Solicitar Demo</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <style jsx global>{`
                .nav-link-custom {
                    position: relative;
                    font-weight: 600;
                    font-size: 15px;
                    color: #034460;
                    text-decoration: none;
                    padding: 6px 0;
                    transition: color 0.2s ease;
                }
                .nav-link-custom::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: #FEC201;
                    transition: width 0.25s ease;
                    border-radius: 1px;
                }
                .nav-link-custom:hover {
                    color: #FEC201;
                }
                .nav-link-custom:hover::after {
                    width: 100%;
                }
                .header-solid {
                    background: #fff;
                    box-shadow: 0 2px 20px rgba(3, 68, 96, 0.08);
                }
                @media (max-width: 767px) {
                    .box-bar {
                        padding-top: 4px;
                        padding-bottom: 4px;
                    }
                    .phone-icon {
                        margin-right: 10px !important;
                    }
                }
            `}</style>
        </>
    )
}
