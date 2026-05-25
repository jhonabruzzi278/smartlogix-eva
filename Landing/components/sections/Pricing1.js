import Link from "next/link"

const plans = [
    { name: "Emprendedor", desc: "Perfecto para negocios que están comenzando.", price: "19", year: "199", features: ["POS básico","Hasta 50 productos","Gestión de pedidos","Dashboard básico","1 sucursal","Soporte por email"], popular: false },
    { name: "Negocio", desc: "La opción más completa para tu negocio en crecimiento.", price: "39", year: "399", features: ["POS completo + carrito","Productos ilimitados","Despachos con QR + repartidor","Dashboard avanzado + reportes","Alertas de stock crítico","Soporte prioritario"], popular: true },
    { name: "Empresa", desc: "Para negocios con múltiples sucursales y equipo.", price: "79", year: "799", features: ["Todo lo del plan Negocio","Múltiples sucursales","Roles y permisos personalizados","API y exportación de datos","Gerente de cuenta dedicado","Soporte 24/7"], popular: false },
]

export default function Pricing1() {
    return (
        <section className="py-24 bg-grey-100" id="planes">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-brand-2 font-extrabold mb-4" style={{fontSize: 'clamp(1.8rem, 3vw, 2.5rem)'}}>Elige el Plan Ideal</h2>
                    <p className="text-grey-500 text-lg">Todos los planes incluyen prueba gratuita de 14 días.<br className="hidden lg:block"/>Sin compromiso, cancela cuando quieras.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {plans.map((plan, i) => (
                        <div key={i} className={`rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${plan.popular ? 'bg-brand-2 border-2 border-brand-1 relative shadow-lg shadow-brand-1/20' : 'bg-white border border-grey-300 shadow-sm'}`}>
                            {plan.popular && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-1 text-brand-2 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">Más Popular</span>}
                            <h3 className={`font-bold text-xl mb-2 ${plan.popular ? 'text-brand-1' : 'text-brand-2'}`}>{plan.name}</h3>
                            <p className={`text-sm mb-6 ${plan.popular ? 'text-white/70' : 'text-grey-500'}`}>{plan.desc}</p>
                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className={`font-extrabold ${plan.popular ? 'text-brand-1' : 'text-brand-2'}`} style={{fontSize: '2.5rem'}}>${plan.price}</span>
                                    <span className={`text-sm ${plan.popular ? 'text-white/60' : 'text-grey-500'}`}>/mes</span>
                                </div>
                                <div className="flex items-baseline gap-1 -mt-1">
                                    <span className={`font-bold text-lg ${plan.popular ? 'text-brand-1' : 'text-brand-2'}`}>${plan.year}</span>
                                    <span className={`text-xs ${plan.popular ? 'text-white/60' : 'text-grey-500'}`}>/año</span>
                                </div>
                            </div>
                            <div className="border-t border-grey-200 mb-6"/>
                            <ul className="space-y-3 flex-1">
                                {plan.features.map((feat, j) => (
                                    <li key={j} className={`flex items-start gap-2 text-sm ${plan.popular ? 'text-white/80' : 'text-grey-700'}`}>
                                        <svg className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-brand-1' : 'text-brand-3'}`} fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/></svg>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8">
                                <Link href="#demo"
                                    className={`block text-center font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 ${plan.popular ? 'bg-brand-1 text-brand-2 hover:bg-yellow-400' : 'bg-brand-2 text-white hover:bg-brand-5'}`}>
                                    {plan.name === "Empresa" ? "Contactar Ventas" : "Comenzar Prueba"}
                                    <svg className="w-4 h-4 inline ml-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
