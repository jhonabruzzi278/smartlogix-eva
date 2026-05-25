import { useState } from "react"

export default function Requestquote1() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        business: '',
        message: ''
    })
    const [submitted, setSubmitted] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const mailto = `mailto:contacto@smartlogix.cl?subject=Solicitud de Demo - ${formData.business}&body=Nombre: ${formData.name}%0AEmail: ${formData.email}%0ATeléfono: ${formData.phone}%0ANegocio: ${formData.business}%0AMensaje: ${formData.message}`
        window.location.href = mailto
        setSubmitted(true)
    }

    return (
        <section className="section pt-110 pb-110 demo-section" id="demo">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-lg-6 mb-30">
                        <div className="demo-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FEC201" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                            <span>¿Listo para modernizar tu negocio?</span>
                        </div>
                        <h2 className="demo-title wow animate__animated animate__fadeIn">
                            Solicita una<br/>
                            <span className="demo-highlight">Demo Gratis</span>
                        </h2>
                        <p className="demo-subtitle wow animate__animated animate__fadeIn" data-wow-delay=".1s">
                            Cuéntanos sobre tu negocio y te mostraremos cómo SmartLogix puede ayudarte.
                            Sin compromiso, sin tarjeta de crédito.
                        </p>
                        <div className="demo-features mt-40">
                            <div className="demo-feature-item wow animate__animated animate__fadeInUp" data-wow-delay=".2s">
                                <div className="demo-feature-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <div className="demo-feature-text">
                                    <h5>Demo personalizada</h5>
                                    <p>Adaptada a las necesidades de tu negocio</p>
                                </div>
                            </div>
                            <div className="demo-feature-item wow animate__animated animate__fadeInUp" data-wow-delay=".3s">
                                <div className="demo-feature-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <div className="demo-feature-text">
                                    <h5>14 días de prueba gratis</h5>
                                    <p>Acceso completo a todas las funcionalidades</p>
                                </div>
                            </div>
                            <div className="demo-feature-item wow animate__animated animate__fadeInUp" data-wow-delay=".4s">
                                <div className="demo-feature-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#034460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <div className="demo-feature-text">
                                    <h5>Sin compromiso</h5>
                                    <p>Cancela cuando quieras, sin preguntas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 mb-30">
                        <div className="demo-form-card wow animate__animated animate__fadeInRight">
                            {submitted ? (
                                <div className="demo-success">
                                    <div className="demo-success-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16BA8F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    </div>
                                    <h4>¡Gracias por tu interés!</h4>
                                    <p>Te contactaremos pronto para coordinar tu demo personalizada.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <h4 className="demo-form-title">Solicitar Demo</h4>
                                    <p className="demo-form-subtitle">Completa el formulario y te contactaremos</p>
                                    <div className="row">
                                        <div className="col-lg-6">
                                            <div className="demo-form-group">
                                                <label>Nombre completo *</label>
                                                <input className="demo-input" name="name" placeholder="Tu nombre" required value={formData.name} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-lg-6">
                                            <div className="demo-form-group">
                                                <label>Email *</label>
                                                <input className="demo-input" name="email" type="email" placeholder="tu@email.com" required value={formData.email} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-lg-6">
                                            <div className="demo-form-group">
                                                <label>Teléfono</label>
                                                <input className="demo-input" name="phone" placeholder="+56 9 1234 5678" value={formData.phone} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-lg-6">
                                            <div className="demo-form-group">
                                                <label>Nombre del negocio *</label>
                                                <input className="demo-input" name="business" placeholder="Tu negocio" required value={formData.business} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="demo-form-group">
                                                <label>Cuéntanos sobre tu negocio</label>
                                                <textarea className="demo-input demo-textarea" name="message" rows={4} placeholder="¿Qué tipo de productos vendes? ¿Cuántos empleados tienes?" value={formData.message} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <button type="submit" className="demo-submit-btn hover-up">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8}}>
                                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                                </svg>
                                                Enviar Solicitud
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .demo-section {
                    background: linear-gradient(135deg, #034460 0%, #1C6180 100%);
                    position: relative;
                    overflow: hidden;
                }
                .demo-section::before {
                    content: '';
                    position: absolute;
                    top: -200px;
                    right: -200px;
                    width: 600px;
                    height: 600px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(254,194,1,0.1) 0%, transparent 70%);
                    pointer-events: none;
                }
                .demo-badge {
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
                .demo-title {
                    color: #fff;
                    font-size: clamp(2.5rem, 5vw, 3.5rem);
                    font-weight: 800;
                    line-height: 1.1;
                    margin-bottom: 20px;
                }
                .demo-highlight {
                    color: #FEC201;
                    position: relative;
                }
                .demo-subtitle {
                    color: rgba(255,255,255,0.85);
                    font-size: 18px;
                    line-height: 1.7;
                    margin: 0;
                }
                .demo-features {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .demo-feature-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                }
                .demo-feature-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: #FEC201;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .demo-feature-text h5 {
                    color: #fff;
                    font-size: 17px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .demo-feature-text p {
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    margin: 0;
                }
                .demo-form-card {
                    background: #fff;
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                }
                .demo-form-title {
                    color: #034460;
                    font-size: 28px;
                    font-weight: 800;
                    margin-bottom: 8px;
                }
                .demo-form-subtitle {
                    color: #6B7280;
                    font-size: 15px;
                    margin-bottom: 30px;
                }
                .demo-form-group {
                    margin-bottom: 20px;
                }
                .demo-form-group label {
                    display: block;
                    color: #034460;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }
                .demo-input {
                    width: 100%;
                    padding: 14px 18px;
                    border: 2px solid #E5E7EB;
                    border-radius: 12px;
                    font-size: 15px;
                    transition: all 0.3s ease;
                    background: #F9FAFB;
                }
                .demo-input:focus {
                    outline: none;
                    border-color: #FEC201;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(254,194,1,0.1);
                }
                .demo-textarea {
                    resize: vertical;
                    min-height: 100px;
                }
                .demo-submit-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #FEC201;
                    color: #034460;
                    padding: 16px 32px;
                    border: none;
                    border-radius: 12px;
                    font-size: 17px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 24px rgba(254,194,1,0.3);
                }
                .demo-submit-btn:hover {
                    background: #ffd700;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px rgba(254,194,1,0.4);
                }
                .demo-success {
                    text-align: center;
                    padding: 40px 20px;
                }
                .demo-success-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(22,186,143,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }
                .demo-success h4 {
                    color: #034460;
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 12px;
                }
                .demo-success p {
                    color: #6B7280;
                    font-size: 16px;
                    margin: 0;
                }
                @media (max-width: 768px) {
                    .demo-form-card {
                        padding: 30px 24px;
                    }
                    .demo-title {
                        font-size: 2.5rem;
                    }
                }
            `}</style>
        </section>
    )
}
