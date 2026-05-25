import Link from "next/link"

export default function Hero1() {
    return (
        <section className="section d-block hero-section">
            <div className="box-swiper">
                <div className="swiper-container swiper-group-1 swiper-banner-1">
                    <div className="banner-1" style={{ background: 'linear-gradient(135deg, #034460 0%, #1C6180 50%, #2C7DA1 100%)', position: 'relative', overflow: 'hidden' }}>
                        <div className="hero-decoration-1"></div>
                        <div className="hero-decoration-2"></div>
                        <div className="hero-decoration-3"></div>
                        <div className="container position-relative" style={{zIndex: 2}}>
                            <div className="row align-items-center">
                                <div className="col-lg-12">
                                    <div className="hero-badge wow animate__animated animate__fadeIn" data-wow-delay=".0s">
                                        <span className="badge-dot"></span>
                                        <span>Nuevo: Dashboard con IA integrada</span>
                                    </div>
                                    <h1 className="color-white mb-25 wow animate__animated animate__fadeInUp" data-wow-delay=".1s" style={{fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1}}>
                                        POS, Inventario y Despachos<br className="d-none d-lg-block" />
                                        <span style={{color: '#FEC201'}}>en un solo lugar</span>
                                    </h1>
                                    <div className="row">
                                        <div className="col-lg-7">
                                            <p className="font-lg color-white mb-30 wow animate__animated animate__fadeInUp" data-wow-delay=".2s" style={{opacity: 0.9, lineHeight: 1.7}}>
                                                SmartLogix simplifica la gestión de tu pequeño comercio.
                                                Vende, controla stock, gestiona pedidos y coordina despachos desde un solo panel.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="box-button mt-30 wow animate__animated animate__fadeInUp" data-wow-delay=".3s">
                                        <Link className="btn btn-brand-1-big hover-up mr-20 btn-hero-primary" href="#demo">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8}}>
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                            Solicitar Demo Gratis
                                        </Link>
                                        <Link className="btn btn-link-white hover-up" href="#caracteristicas">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8}}>
                                                <circle cx="12" cy="12" r="10"/>
                                                <polygon points="10 8 16 12 10 16 10 8"/>
                                            </svg>
                                            Ver cómo funciona
                                        </Link>
                                    </div>
                                    <div className="hero-trust mt-40 wow animate__animated animate__fadeInUp" data-wow-delay=".4s">
                                        <div className="trust-avatars">
                                            <div className="trust-avatar" style={{background: '#FEC201'}}>JR</div>
                                            <div className="trust-avatar" style={{background: '#16BA8F'}}>ML</div>
                                            <div className="trust-avatar" style={{background: '#28A7E6'}}>CP</div>
                                            <div className="trust-avatar" style={{background: '#F69D30'}}>AS</div>
                                        </div>
                                        <div className="trust-text">
                                            <span className="color-white font-md">+500 comercios ya usan SmartLogix</span>
                                            <div className="trust-stars">
                                                <span>★★★★★</span>
                                                <span className="color-white font-sm ml-10">4.9/5 satisfacción</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .hero-section {
                    position: relative;
                }
                .hero-decoration-1 {
                    position: absolute;
                    top: -100px;
                    right: -100px;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(254,194,1,0.15) 0%, transparent 70%);
                    pointer-events: none;
                }
                .hero-decoration-2 {
                    position: absolute;
                    bottom: -150px;
                    left: -150px;
                    width: 500px;
                    height: 500px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(22,186,143,0.1) 0%, transparent 70%);
                    pointer-events: none;
                }
                .hero-decoration-3 {
                    position: absolute;
                    top: 50%;
                    right: 10%;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(254,194,1,0.08) 0%, transparent 70%);
                    pointer-events: none;
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(254,194,1,0.15);
                    border: 1px solid rgba(254,194,1,0.3);
                    padding: 8px 16px;
                    border-radius: 50px;
                    margin-bottom: 20px;
                    color: #FEC201;
                    font-size: 14px;
                    font-weight: 600;
                }
                .badge-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #FEC201;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .btn-hero-primary {
                    display: inline-flex !important;
                    align-items: center;
                    padding: 16px 32px !important;
                    font-size: 16px !important;
                    font-weight: 700 !important;
                }
                .hero-trust {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .trust-avatars {
                    display: flex;
                }
                .trust-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 3px solid #034460;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: #034460;
                    margin-left: -8px;
                }
                .trust-avatar:first-child {
                    margin-left: 0;
                }
                .trust-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .trust-stars {
                    color: #FEC201;
                    font-size: 14px;
                }
                @media (max-width: 768px) {
                    .hero-trust {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .btn-hero-primary {
                        padding: 14px 24px !important;
                        font-size: 15px !important;
                    }
                }
            `}</style>
        </section>
    )
}
