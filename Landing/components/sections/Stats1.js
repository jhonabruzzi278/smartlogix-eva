export default function Stats1() {
    return (
        <section className="section pt-80 pb-80 bg-brand-2 stats-section">
            <div className="container">
                <div className="row align-items-center justify-content-center">
                    <div className="col-lg-3 col-md-6 mb-30 wow animate__animated animate__fadeIn" data-wow-delay=".0s">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                                    <polyline points="9 22 9 12 15 12 15 22"/>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <h2 className="stat-number">+<span className="count">500</span></h2>
                                <p className="stat-label">Comercios Activos</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-30 wow animate__animated animate__fadeIn" data-wow-delay=".1s">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <h2 className="stat-number">+<span className="count">50</span>k</h2>
                                <p className="stat-label">Pedidos Gestionados</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-30 wow animate__animated animate__fadeIn" data-wow-delay=".2s">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <h2 className="stat-number">+<span className="count">120</span>k</h2>
                                <p className="stat-label">Productos Vendidos</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-30 wow animate__animated animate__fadeIn" data-wow-delay=".3s">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <h2 className="stat-number"><span className="count">99</span>%</h2>
                                <p className="stat-label">Satisfacción Cliente</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .stats-section {
                    position: relative;
                }
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 24px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(254,194,1,0.2);
                    border-radius: 16px;
                    transition: all 0.3s ease;
                    height: 100%;
                }
                .stat-card:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(254,194,1,0.4);
                    transform: translateY(-4px);
                }
                .stat-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 12px;
                    background: rgba(254,194,1,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .stat-content {
                    flex: 1;
                }
                .stat-number {
                    color: #FEC201;
                    font-size: 2.5rem;
                    font-weight: 800;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                .stat-label {
                    color: rgba(255,255,255,0.8);
                    font-size: 15px;
                    font-weight: 500;
                    margin: 0;
                }
                @media (max-width: 768px) {
                    .stat-card {
                        padding: 20px;
                        gap: 16px;
                    }
                    .stat-icon {
                        width: 56px;
                        height: 56px;
                    }
                    .stat-number {
                        font-size: 2rem;
                    }
                }
            `}</style>
        </section>
    )
}
