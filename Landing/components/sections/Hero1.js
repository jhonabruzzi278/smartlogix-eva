export default function Hero1() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-2 via-brand-5 to-brand-4 min-h-[600px] lg:min-h-[700px] flex items-center pt-20 lg:pt-0">
            <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-brand-1/10 blur-3xl pointer-events-none"/>
            <div className="absolute bottom-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full bg-brand-3/10 blur-3xl pointer-events-none"/>
            <div className="absolute top-1/2 right-[10%] w-[200px] h-[200px] rounded-full bg-brand-1/5 blur-2xl pointer-events-none animate-float"/>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-brand-1/15 border border-brand-1/30 px-4 py-2 rounded-full mb-5 text-brand-1 text-sm font-semibold">
                        <span className="w-2 h-2 rounded-full bg-brand-1 animate-pulse-dot"/>
                        Nuevo: Dashboard con IA integrada
                    </div>
                    <h1 className="text-white font-extrabold leading-[1.05] mb-6" style={{fontSize: 'clamp(2rem, 5vw, 3.5rem)'}}>
                        POS, Inventario y Despachos<br className="hidden lg:block"/>
                        <span className="text-brand-1">en un solo lugar</span>
                    </h1>
                    <p className="text-lg text-white/85 leading-relaxed mb-8 max-w-lg">
                        SmartLogix simplifica la gestión de tu pequeño comercio. Vende, controla stock, gestiona pedidos y coordina despachos desde un solo panel.
                    </p>
                    <div className="flex flex-wrap gap-3 mb-10">
                        <a href="#demo" className="inline-flex items-center gap-2 bg-brand-1 text-brand-2 font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-1/30">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            Solicitar Demo Gratis
                        </a>
                        <a href="#caracteristicas" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-4 rounded-xl hover:bg-white/10 transition-all">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                            Ver cómo funciona
                        </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex -space-x-2">
                            {["#FEC201","#16BA8F","#28A7E6","#F69D30"].map((bg, i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-[3px] border-brand-2 flex items-center justify-center text-[11px] font-bold text-brand-2" style={{background: bg}}>
                                    {["JR","ML","CP","AS"][i]}
                                </div>
                            ))}
                        </div>
                        <div>
                            <span className="text-white text-base font-medium block">+500 comercios ya usan SmartLogix</span>
                            <div className="flex items-center gap-2 text-brand-1 text-sm mt-0.5">
                                <span>★★★★★</span><span className="text-white">4.9/5 satisfacción</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
