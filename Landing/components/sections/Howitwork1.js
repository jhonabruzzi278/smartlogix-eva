export default function Howitwork1() {
    return (
        <section className="section pt-85 pb-100 bg-worldmap howitwork-section" id="como-funciona">
            <div className="container">
                <div className="text-center">
                    <img className="mb-15" src="/assets/imgs/template/icons/favicon.svg" alt="smartlogix" />
                    <h2 className="color-brand-2 mb-20 wow animate__animated animate__fadeIn" data-wow-delay=".0s">¿Cómo Funciona?</h2>
                    <p className="font-md color-grey-700 wow animate__animated animate__fadeIn" data-wow-delay=".1s">
                        En solo 4 pasos puedes tener tu negocio funcionando con SmartLogix.
                    </p>
                </div>
                <div className="row mt-50">
                    <div className="col-lg-6 mb-30">
                        <div className="box-image-how">
                            <svg width="100%" height="350" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg" style={{maxWidth:500}}>
                                <rect x="20" y="20" width="460" height="310" rx="16" fill="#E0F0F6" />
                                <rect x="40" y="40" width="420" height="50" rx="8" fill="#034460" />
                                <text x="60" y="70" fontFamily="Arial" fontWeight="bold" fontSize="16" fill="white">Flujo de Trabajo SmartLogix</text>
                                <rect x="50" y="110" width="80" height="60" rx="8" fill="#FEC201" />
                                <text x="78" y="148" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="#034460" textAnchor="middle">🏪</text>
                                <text x="90" y="162" fontFamily="Arial" fontSize="9" fill="#034460" textAnchor="middle">Registro</text>
                                <path d="M130 140h20" stroke="#034460" strokeWidth="2" strokeDasharray="4" />
                                <rect x="155" y="110" width="80" height="60" rx="8" fill="#034460" />
                                <text x="195" y="148" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="#FEC201" textAnchor="middle">🛒</text>
                                <text x="195" y="162" fontFamily="Arial" fontSize="9" fill="white" textAnchor="middle">Ventas</text>
                                <path d="M235 140h20" stroke="#034460" strokeWidth="2" strokeDasharray="4" />
                                <rect x="260" y="110" width="80" height="60" rx="8" fill="#FEC201" />
                                <text x="300" y="148" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="#034460" textAnchor="middle">🚚</text>
                                <text x="300" y="162" fontFamily="Arial" fontSize="9" fill="#034460" textAnchor="middle">Despacho</text>
                                <path d="M340 140h20" stroke="#034460" strokeWidth="2" strokeDasharray="4" />
                                <rect x="365" y="110" width="80" height="60" rx="8" fill="#16BA8F" />
                                <text x="405" y="148" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="white" textAnchor="middle">📊</text>
                                <text x="405" y="162" fontFamily="Arial" fontSize="9" fill="white" textAnchor="middle">Dashboard</text>
                                <rect x="50" y="200" width="400" height="45" rx="8" fill="white" stroke="#CDE2E7" />
                                <text x="65" y="220" fontFamily="Arial" fontWeight="bold" fontSize="12" fill="#034460">Dashboard en Tiempo Real</text>
                                <text x="65" y="237" fontFamily="Arial" fontSize="10" fill="#5B647C">Ventas del día · Pedidos activos · Alertas de stock · Reportes</text>
                                <rect x="50" y="260" width="400" height="45" rx="8" fill="white" stroke="#CDE2E7" />
                                <text x="65" y="280" fontFamily="Arial" fontWeight="bold" fontSize="12" fill="#034460">Notificaciones Inteligentes</text>
                                <text x="65" y="297" fontFamily="Arial" fontSize="10" fill="#5B647C">Alertas de stock crítico · Cambios de estado · Seguimiento en tiempo real</text>
                            </svg>
                        </div>
                    </div>
                    <div className="col-lg-6 mb-30">
                        <ul className="list-how-works">
                            <li className="wow animate__animated animate__fadeIn" data-wow-delay=".0s">
                                <div className="image-how">
                                    <span className="img"><span className="emoji-step">🏪</span></span>
                                </div>
                                <div className="info-how">
                                    <h5 className="color-brand-2">Regístrate y configura</h5>
                                    <p className="font-md color-grey-700">Crea tu cuenta en minutos. Agrega productos, categorías y precios. Todo listo para vender.</p>
                                </div>
                            </li>
                            <li className="wow animate__animated animate__fadeIn" data-wow-delay=".1s">
                                <div className="image-how">
                                    <span className="img"><span className="emoji-step">🛒</span></span>
                                </div>
                                <div className="info-how">
                                    <h5 className="color-brand-2">Vende desde el POS</h5>
                                    <p className="font-md color-grey-700">Punto de venta rápido e intuitivo. Stock se descuenta automáticamente con cada venta.</p>
                                </div>
                            </li>
                            <li className="wow animate__animated animate__fadeIn" data-wow-delay=".2s">
                                <div className="image-how">
                                    <span className="img"><span className="emoji-step">🚚</span></span>
                                </div>
                                <div className="info-how">
                                    <h5 className="color-brand-2">Gestiona pedidos y despachos</h5>
                                    <p className="font-md color-grey-700">Confirma pedidos, asigna repartidores y sigue cada entrega con código QR en tiempo real.</p>
                                </div>
                            </li>
                            <li className="wow animate__animated animate__fadeIn" data-wow-delay=".3s">
                                <div className="image-how">
                                    <span className="img"><span className="emoji-step">📊</span></span>
                                </div>
                                <div className="info-how">
                                    <h5 className="color-brand-2">Analiza y crece</h5>
                                    <p className="font-md color-grey-700">Dashboard completo con métricas de ventas, pedidos y stock. Toma decisiones con datos reales.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <style jsx>{`
                .emoji-step {
                    font-size: 40px;
                    line-height: 1;
                    display: block;
                    text-align: center;
                }
            `}</style>
            <style jsx global>{`
                .howitwork-section {
                    position: relative;
                }
                .howitwork-section .list-how-works li {
                    padding: 20px 0;
                    transition: all 0.3s ease;
                }
                .howitwork-section .list-how-works li:hover {
                    transform: translateX(8px);
                }
                .howitwork-section .list-how-works li .image-how .img {
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 16px rgba(254,194,1,0.2);
                }
                .howitwork-section .list-how-works li:hover .image-how .img {
                    transform: scale(1.05);
                    box-shadow: 0 8px 24px rgba(254,194,1,0.3);
                }
                .howitwork-section .box-image-how {
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(3,68,96,0.15);
                }
            `}</style>
        </section>
    )
}
