import { useState } from "react"

export default function Requestquote1() {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', business: '', message: '' })
    const [submitted, setSubmitted] = useState(false)

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

    const handleSubmit = (e) => {
        e.preventDefault()
        const mailto = `mailto:contacto@smartlogix.cl?subject=Solicitud de Demo - ${formData.business}&body=Nombre: ${formData.name}%0AEmail: ${formData.email}%0ATeléfono: ${formData.phone}%0ANegocio: ${formData.business}%0AMensaje: ${formData.message}`
        window.location.href = mailto
        setSubmitted(true)
    }

    return (
        <section className="py-24 bg-gradient-to-br from-brand-2 to-brand-5 relative overflow-hidden" id="demo">
            <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-brand-1/8 blur-3xl pointer-events-none"/>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row items-start gap-14">
                    <div className="lg:w-1/2 w-full">
                        <div className="inline-flex items-center gap-2 bg-brand-1/15 border border-brand-1/30 px-4 py-2 rounded-full mb-5 text-brand-1 text-sm font-semibold">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            ¿Listo para modernizar tu negocio?
                        </div>
                        <h2 className="text-white font-extrabold leading-tight mb-5" style={{fontSize: 'clamp(2rem, 4vw, 3rem)'}}>
                            Solicita una Demo<br/><span className="text-brand-1">Gratis</span>
                        </h2>
                        <p className="text-lg text-white/80 mb-10">Cuéntanos sobre tu negocio y te mostraremos cómo SmartLogix puede ayudarte. Sin compromiso, sin tarjeta de crédito.</p>
                        <div className="space-y-5">
                            {[["Demo personalizada","Adaptada a las necesidades de tu negocio"],["14 días de prueba gratis","Acceso completo a todas las funcionalidades"],["Sin compromiso","Cancela cuando quieras, sin preguntas"]].map(([title, desc], i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-brand-1 flex items-center justify-center shrink-0">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                    <div>
                                        <h5 className="text-white font-bold text-lg mb-1">{title}</h5>
                                        <p className="text-white/60 text-sm">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:w-1/2 w-full">
                        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/30">
                            {submitted ? (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16BA8F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                    <h4 className="text-brand-2 font-extrabold text-2xl mb-3">¡Gracias por tu interés!</h4>
                                    <p className="text-grey-500">Te contactaremos pronto para coordinar tu demo personalizada.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <h4 className="text-brand-2 font-extrabold text-2xl mb-2">Solicitar Demo</h4>
                                    <p className="text-grey-500 text-sm mb-8">Completa el formulario y te contactaremos</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {[
                                            { name:"name", type:"text", label:"Nombre completo *", placeholder:"Tu nombre" },
                                            { name:"email", type:"email", label:"Email *", placeholder:"tu@email.com" },
                                            { name:"phone", type:"tel", label:"Teléfono", placeholder:"+56 9 1234 5678" },
                                            { name:"business", type:"text", label:"Nombre del negocio *", placeholder:"Tu negocio" },
                                        ].map((f, i) => (
                                            <div key={i} className={f.name === "name" || f.name === "phone" ? "" : "sm:col-span-1"}>
                                                <label className="block text-brand-2 font-semibold text-sm mb-2">{f.label}</label>
                                                <input name={f.name} type={f.type} placeholder={f.placeholder} required={f.label.includes("*")} value={formData[f.name]} onChange={handleChange}
                                                    className="w-full px-4 py-3.5 border-2 border-grey-300 rounded-xl text-sm bg-grey-100 focus:border-brand-1 focus:bg-white focus:ring-4 focus:ring-brand-1/10 outline-none transition-all"/>
                                            </div>
                                        ))}
                                        <div className="sm:col-span-2">
                                            <label className="block text-brand-2 font-semibold text-sm mb-2">Cuéntanos sobre tu negocio</label>
                                            <textarea name="message" rows={4} placeholder="¿Qué tipo de productos vendes? ¿Cuántos empleados tienes?" value={formData.message} onChange={handleChange}
                                                className="w-full px-4 py-3.5 border-2 border-grey-300 rounded-xl text-sm bg-grey-100 focus:border-brand-1 focus:bg-white focus:ring-4 focus:ring-brand-1/10 outline-none transition-all resize-y min-h-[100px]"/>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-1 text-brand-2 font-bold py-4 rounded-xl hover:bg-yellow-400 hover:-translate-y-0.5 transition-all shadow-lg shadow-brand-1/30">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                        Enviar Solicitud
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
