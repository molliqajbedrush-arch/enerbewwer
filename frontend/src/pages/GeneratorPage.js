import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, Upload, Sparkles, Download, ArrowLeft, ArrowRight, 
  FileText, CheckCircle2, Loader2, AlertCircle, X, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const steps = [
  { id: 1, title: 'Link einfügen', icon: Link2 },
  { id: 2, title: 'PDFs hochladen', icon: Upload },
  { id: 3, title: 'Generieren', icon: Sparkles },
  { id: 4, title: 'Vorschau & Download', icon: Download }
];

const GeneratorPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  // Form state
  const [jobUrl, setJobUrl] = useState('');
  const [jobAnalysis, setJobAnalysis] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');

  // Step 1: Analyze Job URL
  const analyzeJob = async () => {
    if (!jobUrl) {
      toast.error('Bitte geben Sie eine URL ein');
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressText('Analysiere Stellenausschreibung...');

    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 200);

      const response = await axios.post(`${API}/analyze-job`, { url: jobUrl });
      clearInterval(interval);
      setProgress(100);
      setJobAnalysis(response.data);
      toast.success('Stellenausschreibung analysiert!');
      setCurrentStep(2);
    } catch (error) {
      const message = error.response?.data?.detail || 'Fehler bei der Analyse';
      toast.error(message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Step 2: Upload Resume
  const handleFileUpload = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Nur PDF-Dateien werden akzeptiert');
      return;
    }

    setResumeFile(file);
    setLoading(true);
    setProgressText('Analysiere Lebenslauf...');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 200);

      const response = await axios.post(`${API}/analyze-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      setProgress(100);
      setResumeData(response.data);
      toast.success('Lebenslauf analysiert!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Fehler bei der PDF-Analyse';
      toast.error(message);
      setResumeFile(null);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Step 3: Generate Cover Letter
  const generateCoverLetter = async () => {
    setLoading(true);
    setCurrentStep(3);
    setProgress(0);
    setProgressText('Erstelle Bewerbungsanschreiben...');

    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 90));
      }, 300);

      const response = await axios.post(`${API}/generate-cover-letter`, {
        job_analysis: jobAnalysis,
        resume_data: resumeData
      });

      clearInterval(interval);
      setProgress(100);
      setCoverLetter(response.data.cover_letter);
      toast.success('Anschreiben erstellt!');
      setCurrentStep(4);
    } catch (error) {
      const message = error.response?.data?.detail || 'Fehler bei der Generierung';
      toast.error(message);
      setCurrentStep(2);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Step 4: Download PDF
  const downloadPdf = async () => {
    setLoading(true);
    setProgressText('Erstelle PDF...');

    try {
      const response = await axios.post(
        `${API}/generate-pdf`,
        {
          job_url: jobUrl,
          job_analysis: jobAnalysis,
          resume_data: resumeData,
          cover_letter: coverLetter,
          company_name: jobAnalysis?.company_name,
          job_title: jobAnalysis?.job_title
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bewerbung_${jobAnalysis?.company_name || 'Dokument'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF heruntergeladen!');
    } catch (error) {
      toast.error('Fehler beim PDF-Download');
    } finally {
      setLoading(false);
    }
  };

  // Save application
  const saveApplication = async () => {
    setLoading(true);

    try {
      await axios.post(`${API}/applications`, {
        job_url: jobUrl,
        job_analysis: jobAnalysis,
        resume_data: resumeData,
        cover_letter: coverLetter,
        company_name: jobAnalysis?.company_name,
        job_title: jobAnalysis?.job_title
      });

      toast.success('Bewerbung gespeichert!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Stellenausschreibung</h2>
              <p className="text-slate-600">Fügen Sie den Link zur Stellenausschreibung ein</p>
            </div>

            <div className="space-y-4">
              <Input
                type="url"
                placeholder="https://beispiel.de/stellenangebot"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="h-14 rounded-xl text-lg"
                data-testid="job-url-input"
              />

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-slate-500 text-center">{progressText}</p>
                </div>
              )}

              <Button
                onClick={analyzeJob}
                disabled={loading || !jobUrl}
                className="w-full h-14 rounded-full bg-amber-600 hover:bg-amber-700 text-lg"
                data-testid="analyze-job-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Analysieren
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Dokumente hochladen</h2>
              <p className="text-slate-600">Laden Sie Ihren Lebenslauf als PDF hoch</p>
            </div>

            {/* Job Analysis Summary */}
            {jobAnalysis && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-900">Stelle analysiert</p>
                    <p className="text-sm text-emerald-700">
                      {jobAnalysis.job_title} bei {jobAnalysis.company_name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`upload-zone ${resumeFile ? 'active' : ''}`}
              data-testid="upload-zone"
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="resume-upload"
                data-testid="resume-upload-input"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-10 h-10 text-amber-600" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{resumeFile.name}</p>
                      <p className="text-sm text-slate-500">Klicken zum Ändern</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      PDF hierher ziehen oder klicken
                    </p>
                    <p className="text-sm text-slate-500">Unterstützt: Lebenslauf (PDF)</p>
                  </>
                )}
              </label>
            </div>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-slate-500 text-center">{progressText}</p>
              </div>
            )}

            {resumeData && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-900">Lebenslauf analysiert</p>
                    <p className="text-sm text-emerald-700">
                      {resumeData.full_name || 'Bereit zur Generierung'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 h-14 rounded-full"
                data-testid="back-btn"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Zurück
              </Button>
              <Button
                onClick={generateCoverLetter}
                disabled={loading || !resumeData}
                className="flex-1 h-14 rounded-full bg-amber-600 hover:bg-amber-700"
                data-testid="generate-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Generieren
                    <Sparkles className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">KI erstellt Ihr Anschreiben</h2>
            <p className="text-slate-600 mb-8">{progressText}</p>
            <Progress value={progress} className="h-3 max-w-md mx-auto" />
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Bewerbung fertig!</h2>
              <p className="text-slate-600">Vorschau ansehen und herunterladen</p>
            </div>

            {/* Preview */}
            <div className="pdf-preview max-h-[400px] overflow-y-auto" data-testid="cover-letter-preview">
              {coverLetter.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
                  {line}
                </p>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1 h-14 rounded-full"
                data-testid="edit-btn"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Bearbeiten
              </Button>
              <Button
                onClick={saveApplication}
                disabled={loading}
                variant="outline"
                className="flex-1 h-14 rounded-full border-amber-600 text-amber-600 hover:bg-amber-50"
                data-testid="save-btn"
              >
                Speichern
              </Button>
              <Button
                onClick={downloadPdf}
                disabled={loading}
                className="flex-1 h-14 rounded-full bg-amber-600 hover:bg-amber-700"
                data-testid="download-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-2 w-5 h-5" />
                    PDF Download
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            data-testid="logo-btn"
          >
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Bewerbungsgenerator</span>
          </button>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              data-testid="dashboard-btn"
            >
              Dashboard
            </Button>
            <span className="text-slate-500">{user?.name}</span>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="text-slate-500"
              data-testid="logout-btn"
            >
              Abmelden
            </Button>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="pt-24 pb-8 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="step-indicator justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`step ${
                    currentStep === step.id ? 'active' : 
                    currentStep > step.id ? 'completed' : 'pending'
                  }`}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`connector ${currentStep > step.id ? 'completed' : 'pending'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-sm text-slate-500">
              Schritt {currentStep} von {steps.length}: {steps[currentStep - 1].title}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-8">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeneratorPage;
