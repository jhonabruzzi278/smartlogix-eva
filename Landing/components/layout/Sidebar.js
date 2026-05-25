import Link from "next/link"

export default function Sidebar({ openClass, handleMobileMenuClose }) {
    return (
        <div className={openClass ? "mobile-header-active mobile-menu-active" : "mobile-header-active"}>
            <div className="sidebar-content">
                <div className="mobile-header-logo mb-30">
                    <div className="d-flex align-items-center justify-content-between">
                        <Link href="/" onClick={handleMobileMenuClose}>
                            <svg width="150" height="36" viewBox="0 0 150 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="4" width="28" height="28" rx="7" fill="#FEC201"/>
                                <text x="9" y="23" fontFamily="Arial" fontWeight="900" fontSize="16" fill="#034460">S</text>
                                <text x="37" y="24" fontFamily="Arial" fontWeight="800" fontSize="18" fill="#034460">SmartLogix</text>
                            </svg>
                        </Link>
                        <button className="off-canvas-close" onClick={handleMobileMenuClose} style={{width:40,height:40,borderRadius:8,border:'1px solid #CDE2E7',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
                <nav className="mobile-menu">
                    <ul className="menu-accordion">
                        <li><Link href="/" onClick={handleMobileMenuClose} className="menu-link-mobile">Inicio</Link></li>
                        <li><a href="#caracteristicas" onClick={handleMobileMenuClose} className="menu-link-mobile">Características</a></li>
                        <li><a href="#como-funciona" onClick={handleMobileMenuClose} className="menu-link-mobile">Cómo Funciona</a></li>
                        <li><a href="#planes" onClick={handleMobileMenuClose} className="menu-link-mobile">Planes</a></li>
                        <li><a href="#demo" onClick={handleMobileMenuClose} className="menu-link-mobile">Solicitar Demo</a></li>
                        <li><a href="#faq" onClick={handleMobileMenuClose} className="menu-link-mobile">FAQ</a></li>
                        <li className="mt-30">
                            <Link href="https://app.smartlogix.cl" className="btn btn-brand-1 w-100 text-center" onClick={handleMobileMenuClose}>
                                Iniciar Sesión
                            </Link>
                        </li>
                        <li className="mt-10">
                            <a href="#demo" className="btn btn-brand-2-full w-100 text-center" onClick={handleMobileMenuClose}>
                                Solicitar Demo
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            <style jsx global>{`
                .menu-link-mobile {
                    display: block;
                    padding: 14px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #034460;
                    border-bottom: 1px solid #F2F3F4;
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                .menu-link-mobile:hover {
                    color: #FEC201;
                }
                .mobile-header-logo {
                    padding-bottom: 16px;
                    border-bottom: 1px solid #CDE2E7;
                }
                .menu-accordion {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
            `}</style>
        </div>
    )
}
