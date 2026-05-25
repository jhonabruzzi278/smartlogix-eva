import { useState } from "react"

const features = [
    {
        icon: "🏪",
        title: "Punto de Venta (POS)",
        short: "Vende de forma rápida e intuitiva. Agrega productos al carrito, calcula vueltos y genera comprobantes al instante.",
        detail: "El POS de SmartLogix está diseñado para que tu cajero aprenda en segundos. Agrega productos con búsqueda rápida, calcula el vuelto automáticamente, y el stock se descuenta al instante. Compatible con lectores de código de barras y básculas.",
        bullets: ["Carrito de compras rápido", "Cálculo automático de vuelto", "Descuento automático de stock", "Comprobante de venta digital"]
    },
    {
        icon: "📦",
        title: "Control de Inventario",
        short: "Gestiona tu stock con alertas de inventario crítico. Por producto, por categoría y por proveedor.",
        detail: "Mantén el control total de tu bodega. Registra cada producto con SKU, precio, costo y categoría. SmartLogix te avisa automáticamente cuando un producto llega a nivel crítico, para que nunca te quedes sin stock de lo que más vendes.",
        bullets: ["Alertas de stock crítico y warning", "Seguimiento por proveedor", "Costos y precios por producto", "Categorías personalizables"]
    },
    {
        icon: "📋",
        title: "Gestión de Pedidos",
        short: "Crea, confirma y da seguimiento a cada pedido. Desde la creación hasta la entrega final.",
        detail: "Cada pedido pasa por 5 etapas claras: Creado → En Preparación → En Reparto → Entregado. Puedes confirmar pedidos (descontando stock automáticamente) y cancelarlos con un motivo. El historial completo de cada pedido queda registrado.",
        bullets: ["5 estados de pedido (CREATED → ENTREGADO)", "Validación de stock antes de crear", "Cancelación con motivo", "Historial completo por cliente"]
    },
    {
        icon: "🚚",
        title: "Despachos y Reparto",
        short: "Coordina entregas con código QR, asigna repartidores y registra la entrega con código de cliente y RUT.",
        detail: "Cada pedido confirmado genera un despacho automático con código QR único. El repartidor usa ese QR para retirar el pedido. La entrega se confirma en destino con el código del cliente y el RUT de quien recibe. Se puede agregar foto como prueba de entrega.",
        bullets: ["QR único por despacho", "Retiro con código QR", "Entrega con código cliente + RUT", "Foto de prueba de entrega"]
    },
    {
        icon: "📊",
        title: "Dashboard y Reportes",
        short: "Visualiza tus ventas del día, pedidos activos, productos con stock crítico y genera reportes exportables.",
        detail: "El dashboard te muestra de un vistazo ¿cuánto vendiste hoy?, pedidos activos, productos con stock bajo y más. Puedes filtrar por fecha y exportar reportes detallados en CSV para usarlos en Excel u otras herramientas de análisis.",
        bullets: ["Ventas del día en CLP", "Pedidos activos por estado", "Top productos más vendidos", "Exportación CSV de reportes"]
    },
    {
        icon: "👥",
        title: "Clientes e Historial",
        short: "Mantén un registro completo de tus clientes con su historial de pedidos, contactos y estadísticas.",
        detail: "Cada cliente tiene su perfil con historial completo de pedidos: cuántos ha hecho, cuáles fueron entregados, cuáles están activos y cuáles cancelados. Toda la trazabilidad desde el primer pedido hasta el último, en un solo lugar.",
        bullets: ["Perfil por cliente con historial", "Estadísticas de pedidos", "Datos de contacto", "Búsqueda y filtro de clientes"]
    }
]

export default function Services1() {
    const [openIndex, setOpenIndex] = useState(null)

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section className="section mt-100" id="caracteristicas">
            <div className="container">
                <div className="text-center mb-40">
                    <h2 className="title-favicon mb-20 wow animate__animated animate__fadeIn">Todo lo que tu negocio necesita</h2>
                    <p className="font-md color-grey-700 wow animate__animated animate__fadeIn">
                        Una plataforma completa para gestionar tu pequeño comercio de forma eficiente.
                    </p>
                </div>
                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        {features.map((feature, index) => (
                            <div key={index} className={`accordion-item-custom wow animate__animated animate__fadeIn ${openIndex === index ? 'open' : ''}`} data-wow-delay={`.${index}s`}>
                                <div className="accordion-header-custom" onClick={() => toggleAccordion(index)}>
                                    <div className="accordion-icon-custom">
                                        <span className="emoji-icon-custom">{feature.icon}</span>
                                    </div>
                                    <div className="accordion-title-custom">
                                        <h5 className="color-brand-2">{feature.title}</h5>
                                        <p className="font-sm color-grey-700 accordion-short">{feature.short}</p>
                                    </div>
                                    <div className={`accordion-arrow ${openIndex === index ? 'rotate' : ''}`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="accordion-body-custom">
                                    <p className="font-md color-grey-700 mb-20">{feature.detail}</p>
                                    <ul className="feature-bullets-custom">
                                        {feature.bullets.map((bullet, j) => (
                                            <li key={j} className="font-sm color-grey-700">
                                                <svg className="icon-16" fill="currentColor" viewBox="0 0 20 20" style={{marginRight:8,flexShrink:0}}>
                                                    <path clipRule="evenodd" fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
                                                </svg>
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .accordion-item-custom {
                    border: 1px solid #CDE2E7;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    overflow: hidden;
                    background: #fff;
                    transition: all 0.3s ease;
                }
                .accordion-item-custom:hover {
                    box-shadow: 0 2px 12px rgba(3, 68, 96, 0.06);
                }
                .accordion-item-custom.open {
                    border-color: #FEC201;
                    box-shadow: 0 4px 16px rgba(254, 194, 1, 0.15);
                }
                .accordion-header-custom {
                    display: flex;
                    align-items: center;
                    padding: 20px 24px;
                    cursor: pointer;
                    gap: 16px;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .emoji-icon-custom {
                    font-size: 36px;
                    display: block;
                }
                .accordion-title-custom {
                    flex: 1;
                }
                .accordion-title-custom h5 {
                    margin-bottom: 4px;
                }
                .accordion-short {
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .accordion-item-custom.open .accordion-short {
                    -webkit-line-clamp: unset;
                }
                .accordion-arrow {
                    transition: transform 0.3s ease;
                    flex-shrink: 0;
                    opacity: 0.5;
                }
                .accordion-arrow.rotate {
                    transform: rotate(180deg);
                    opacity: 1;
                }
                .accordion-body-custom {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.4s ease, padding 0.4s ease;
                    padding: 0 24px;
                }
                .accordion-item-custom.open .accordion-body-custom {
                    max-height: 600px;
                    padding: 0 24px 24px 24px;
                }
                .feature-bullets-custom {
                    list-style: none;
                    padding: 0;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .feature-bullets-custom li {
                    display: flex;
                    align-items: center;
                }
                @media (max-width: 767px) {
                    .accordion-header-custom {
                        padding: 16px;
                        gap: 12px;
                    }
                    .accordion-body-custom {
                        padding: 0 16px;
                    }
                    .accordion-item-custom.open .accordion-body-custom {
                        padding: 0 16px 20px 16px;
                    }
                    .feature-bullets-custom {
                        grid-template-columns: 1fr;
                    }
                    .emoji-icon-custom {
                        font-size: 28px;
                    }
                }
            `}</style>
        </section>
    )
}
