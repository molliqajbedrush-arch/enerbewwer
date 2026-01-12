import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Upload, Sparkles, Download, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/generator');
    } else {
      setAuthMode('register');
      setShowAuth(true);
    }
  };

  const features = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Stellenanalyse',
      description: 'Automatische Analyse der Stellenausschreibung und Erkennung des Unternehmenstons'
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: 'PDF-Import',
      description: 'Laden Sie Ihren Lebenslauf und Zeugnisse hoch für personalisierte Bewerbungen'
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'KI-Generierung',
      description: 'Professionelle Anschreiben mit modernster KI-Technologie'
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'PDF-Export',
      description: 'Fertige Bewerbung sofort als PDF herunterladen'
    }
  ];

  const steps = [
    { number: '01', title: 'Link einfügen', description: 'Kopieren Sie den Link zur Stellenausschreibung' },
    { number: '02', title: 'PDFs hochladen', description: 'Laden Sie Lebenslauf und Zeugnisse hoch' },
    { number: '03', title: 'Generieren', description: 'Die KI erstellt Ihr Anschreiben' },
    { number: '04', title: 'Herunterladen', description: 'Vorschau ansehen und PDF exportieren' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Bewerbungsgenerator</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/dashboard')}
                  data-testid="dashboard-nav-btn"
                >
                  Dashboard
                </Button>
                <Button 
                  className="rounded-full bg-slate-900 hover:bg-slate-800"
                  onClick={() => navigate('/generator')}
                  data-testid="start-nav-btn"
                >
                  Neue Bewerbung
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                  data-testid="login-nav-btn"
                >
                  Anmelden
                </Button>
                <Button 
                  className="rounded-full bg-slate-900 hover:bg-slate-800"
                  onClick={() => { setAuthMode('register'); setShowAuth(true); }}
                  data-testid="register-nav-btn"
                >
                  Registrieren
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section pt-32 pb-24 px-6">
        <div className="hero-pattern" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div 
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
              Perfekte Bewerbungen.
              <br />
              <span className="text-amber-600">In Sekunden.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-xl">
              Lassen Sie unsere KI ein maßgeschneidertes Anschreiben erstellen, 
              das perfekt zur Stelle und zum Unternehmen passt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="rounded-full bg-amber-600 hover:bg-amber-700 text-lg px-8 py-6"
                onClick={handleGetStarted}
                data-testid="hero-cta-btn"
              >
                Jetzt starten
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full text-lg px-8 py-6"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                data-testid="learn-more-btn"
              >
                So funktioniert's
              </Button>
            </div>
          </motion.div>

          <motion.div 
            className="absolute top-0 right-0 hidden lg:block w-[500px]"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img 
              src="https://images.unsplash.com/photo-1765371513492-264506c3ad09?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd29ya3NwYWNlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2ODE4MDgyMXww&ixlib=rb-4.1.0&q=85&w=600"
              alt="Workspace"
              className="rounded-2xl shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Alles was Sie brauchen
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Von der Analyse bis zum fertigen PDF — unser Tool erledigt alles für Sie
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`feature-${index}`}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              So einfach geht's
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              In vier einfachen Schritten zu Ihrer perfekten Bewerbung
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`step-${index}`}
              >
                <div className="text-6xl font-bold text-amber-200 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-amber-200" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Bereit für Ihre nächste Bewerbung?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Starten Sie jetzt kostenlos und erstellen Sie professionelle Bewerbungen in Minuten.
            </p>
            <Button 
              size="lg" 
              className="rounded-full bg-amber-600 hover:bg-amber-700 text-lg px-8 py-6"
              onClick={handleGetStarted}
              data-testid="cta-btn"
            >
              Kostenlos starten
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Bewerbungsgenerator</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2025 Bewerbungsgenerator. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        initialMode={authMode}
      />
    </div>
  );
};

export default LandingPage;
