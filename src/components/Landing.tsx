import { useState } from 'react';
import { Bot, Zap, Shield, Sparkles, CheckCircle2, ArrowRight, Users, TrendingUp, MessageSquare, Clock, Star, ChevronDown } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showFaq, setShowFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">AgentHub</span>
          </div>
          <button
            onClick={onGetStarted}
            className="bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/20"
          >
            Acceder
          </button>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Tu asistente digital en minutos</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Crea Agentes de IA que{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Trabajan Para Ti
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto">
              Sin código. Sin complicaciones. Solo responde unas preguntas y tu agente personalizado estará listo para atender a tus clientes, gestionar consultas y hacer crecer tu negocio 24/7.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-cyan-500/30 flex items-center space-x-2"
              >
                <span>Crea tu Primer Agente Gratis</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span>Configuración en 2 minutos</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span>Cancela cuando quieras</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-600">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-600" />
              <span className="font-semibold">+1,200 empresas confían en nosotros</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
              <span className="font-semibold">+50,000 consultas respondidas</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-cyan-600" />
              <span className="font-semibold">4.9/5 valoración promedio</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Tu Agente Listo en 3 Simples Pasos
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              No necesitas ser experto en tecnología. Nuestro proceso guiado lo hace todo por ti.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Regístrate Gratis</h3>
              <p className="text-slate-600 leading-relaxed">
                Crea tu cuenta en 30 segundos. Sin tarjeta de crédito, sin compromisos.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Configura tu Agente</h3>
              <p className="text-slate-600 leading-relaxed">
                Responde preguntas sencillas, sube documentos para entrenar tu IA. En 2 minutos, listo.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">¡Ya Está Funcionando!</h3>
              <p className="text-slate-600 leading-relaxed">
                Tu agente empieza a trabajar inmediatamente. Atiende consultas, responde preguntas, 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Casos Reales, Resultados Reales
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Descubre cómo profesionales como tú están revolucionando su atención al cliente
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Restaurante "La Tradición"</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                "Nuestro agente responde al instante sobre alérgenos, ingredientes y opciones veganas. Los clientes están encantados y nosotros podemos centrarnos en cocinar."
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">40% menos llamadas al local</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">✂️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Peluquería "Style Studio"</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                "Mientras corto el pelo, mi agente gestiona reservas, responde precios y horarios. Es como tener una recepcionista trabajando sin parar."
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">+60% más reservas online</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🏋️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Gimnasio "FitZone"</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                "Nuestro agente responde horarios, tarifas y disponibilidad de clases. Hemos liberado 5 horas semanales de nuestro equipo."
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span className="font-semibold text-cyan-600">Disponible 24/7 para consultas</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🏠</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Inmobiliaria "TuCasa"</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                "Con 3 agentes especializados (ventas, alquileres, consultas), atendemos leads mientras visitamos propiedades. Genial."
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">+85% tasa de respuesta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Tecnología Premium al Alcance de Todos
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Potencia, velocidad y fiabilidad que normalmente solo tienen las grandes empresas
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all">
              <Zap className="w-12 h-12 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">Velocidad Extrema</h3>
              <p className="text-slate-300 leading-relaxed">
                Powered by Cloudflare Workers. Respuestas en milisegundos desde cualquier parte del mundo.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all">
              <Shield className="w-12 h-12 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">Máxima Seguridad</h3>
              <p className="text-slate-300 leading-relaxed">
                Tus datos y los de tus clientes protegidos con infraestructura de nivel empresarial.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all">
              <Bot className="w-12 h-12 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">IA Avanzada</h3>
              <p className="text-slate-300 leading-relaxed">
                Acceso a los mejores modelos mediante OpenRouter. Flexibilidad y potencia sin límites.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Elige el Plan Perfecto para Ti
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Empieza gratis y escala cuando lo necesites. Sin sorpresas, sin letra pequeña.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border-2 border-slate-200 hover:shadow-xl transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Gratis</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">0€</div>
                <p className="text-slate-600">Para siempre</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">1 agente personalizado</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Hasta 5 consultas al día</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Modelo básico de IA</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-semibold transition-all"
              >
                Empezar Gratis
              </button>
            </div>

            <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-8 border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30 transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                MÁS POPULAR
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Premium Básico</h3>
                <div className="text-4xl font-bold text-white mb-1">29€</div>
                <p className="text-cyan-100">al mes</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white">Hasta 3 agentes personalizados</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white">Consultas ilimitadas</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white">Modelos avanzados de IA</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full bg-white hover:bg-slate-50 text-cyan-600 py-3 rounded-xl font-bold transition-all shadow-lg"
              >
                Comenzar Ahora
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-slate-900 hover:shadow-xl transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium Ultra</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">99€</div>
                <p className="text-slate-600">al mes</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Hasta 10 agentes personalizados</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Sistema de créditos flexible</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Todos los modelos disponibles</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Potencia Máxima
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-12 text-center">
              Preguntas Frecuentes
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: '¿Necesito conocimientos técnicos para crear un agente?',
                  a: 'No. Nuestro proceso es completamente guiado. Solo respondes preguntas sencillas sobre tu negocio y nosotros hacemos el resto.',
                },
                {
                  q: '¿Cuánto tiempo tarda en estar listo mi agente?',
                  a: 'Aproximadamente 2-3 minutos. El proceso es: crear cuenta (30 segundos), completar formulario (1 minuto), subir documentos opcionales (1 minuto).',
                },
                {
                  q: '¿Puedo cambiar o mejorar mi agente después de crearlo?',
                  a: 'Sí, completamente. Puedes editar las respuestas, añadir más información y ajustar el comportamiento en cualquier momento.',
                },
              ].map((faq, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setShowFaq(showFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-600 flex-shrink-0 transition-transform ${
                        showFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showFaq === idx && (
                    <div className="px-6 pb-5 text-slate-600 leading-relaxed">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              El Futuro de la Atención al Cliente Empieza Hoy
            </h2>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Únete a más de 1,200 empresas que ya están automatizando su atención y liberando tiempo para lo que realmente importa.
            </p>
            <button
              onClick={onGetStarted}
              className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-flex items-center space-x-2"
            >
              <span>Crear Mi Agente Ahora</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Bot className="w-6 h-6 text-cyan-400" />
              <span className="text-lg font-bold text-white">AgentHub</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <a href="#" className="hover:text-cyan-400 transition-colors">
                Términos
              </a>
              <a href="#" className="hover:text-cyan-400 transition-colors">
                Privacidad
              </a>
              <a href="#" className="hover:text-cyan-400 transition-colors">
                Soporte
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            © 2025 AgentHub. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
