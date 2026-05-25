import Link from "next/link"

export default function Cta1() {
    return (
        <section className="section pt-100 pb-100 cta-section">
            <div className="container">
                <div className="cta-card wow animate__animated animate__fadeIn">
                    <div className="cta-decoration-1"></div>
                    <div className="cta-decoration-2"></div>
                    <div className="row align-items-center position-relative" style={{zIndex: 2}}>
                        <div className="col-lg-8 mb-30">
                            <div className="cta-badge">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                                <span>Oferta por tiempo limitado</span>
                            </div>
                            <h2 className="cta-title wow animate__animated animate__fadeInUp">
                                ¿Listo para transformar<br className="d-none d-lg-block" />
                                <span className="cta-highlight">tu negocio?</span>
                            </h2>
                            <p className="cta-subtitle wow animate__animated animate__fadeInUp" data-wow-delay=".1s">
                                Únete a los cientos de comercios que ya confían en SmartLogix.
                                Prueba gratis por 14 días, sin compromiso.
                            </p>
                        </div>
                        <div className="col-lg-4 mb-30 text-lg-end">
                            <Link className="btn btn-cta-primary hover-up wow animate__animated animate__fadeInUp" data-wow-delay=".2s" href="#demo">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 10}}>
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                                Solicitar Demo Gratis
                            </Link>
                            <p className="cta-note mt-15">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                                Sin tarjeta de crédito
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .cta-section {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                }
                .cta-card {
                    background: linear-gradient(135deg, #034460 0%, #1C6180 100%);
                    border-radius: 24px;
                    padding: 60px 50px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(3, 68, 96, 0.3);
                }
                .cta-decoration-1 {
                    position: absolute;
                    top: -80px;
                    right: -80px;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(254,194,1,0.2) 0%, transparent 70%);
                    pointer-events: none;
                }
                .cta-decoration-2 {
                    position: absolute;
                    bottom: -100px;
                    left: -100px;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(22,186,143,0.15) 0%, transparent 70%);
                    pointer-events: none;
                }
                .cta-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(254,194,1,0.15);
                    border: 1px solid rgba(254,194,1,0.3);
                    padding: 8px 16px;
                    border-radius: 50px;
                    margin-bottom: 20px;
                    color: #FEC201;
                    font-size: 13px;
                    font-weight: 600;
                }
                .cta-title {
                    color: #fff;
                    font-size: clamp(2rem, 4vw, 3rem);
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 16px;
                }
                .cta-highlight {
                    color: #FEC201;
                    position: relative;
                }
                .cta-subtitle {
                    color: rgba(255,255,255,0.85);
                    font-size: 18px;
                    line-height: 1.6;
                    margin: 0;
                }
                .btn-cta-primary {
                    display: inline-flex;
                    align-items: center;
                    background: #FEC201;
                    color: #034460;
                    padding: 18px 36px;
                    border-radius: 12px;
                    font-size: 17px;
                    font-weight: 700;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 24px rgba(254,194,1,0.4);
                }
                .btn-cta-primary:hover {
                    background: #ffd700;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px rgba(254,194,1,0.5);
                    color: #034460;
                }
                .cta-note {
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    display: inline-flex;
                    align-items: center;
                    margin: 0;
                }
                @media (max-width: 768px) {
                    .cta-card {
                        padding: 40px 30px;
                    }
                    .btn-cta-primary {
                        padding: 16px 28px;
                        font-size: 16px;
                    }
                }
            `}</style>
        </section>
    )
}
