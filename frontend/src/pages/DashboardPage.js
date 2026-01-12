import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, Plus, Trash2, Eye, Download, Calendar, Building2,
  Briefcase, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${API}/applications`);
      setApplications(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`${API}/applications/${deleteId}`);
      setApplications(applications.filter(app => app.id !== deleteId));
      toast.success('Bewerbung gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleteId(null);
    }
  };

  const downloadPdf = async (app) => {
    try {
      const response = await axios.post(
        `${API}/generate-pdf`,
        {
          job_url: app.job_url,
          job_analysis: {},
          resume_data: {},
          cover_letter: app.cover_letter,
          company_name: app.company_name,
          job_title: app.job_title
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bewerbung_${app.company_name || 'Dokument'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF heruntergeladen!');
    } catch (error) {
      toast.error('Fehler beim PDF-Download');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

      {/* Main Content */}
      <main className="pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Meine Bewerbungen</h1>
              <p className="text-slate-600 mt-1">
                {applications.length} {applications.length === 1 ? 'Bewerbung' : 'Bewerbungen'} gespeichert
              </p>
            </div>
            <Button
              onClick={() => navigate('/generator')}
              className="rounded-full bg-amber-600 hover:bg-amber-700"
              data-testid="new-application-btn"
            >
              <Plus className="mr-2 w-5 h-5" />
              Neue Bewerbung
            </Button>
          </div>

          {/* Applications Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Noch keine Bewerbungen
              </h2>
              <p className="text-slate-600 mb-6">
                Erstellen Sie jetzt Ihre erste Bewerbung
              </p>
              <Button
                onClick={() => navigate('/generator')}
                className="rounded-full bg-amber-600 hover:bg-amber-700"
                data-testid="create-first-btn"
              >
                <Plus className="mr-2 w-5 h-5" />
                Erste Bewerbung erstellen
              </Button>
            </motion.div>
          ) : (
            <div className="bento-grid" data-testid="applications-grid">
              {applications.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 group" data-testid={`application-card-${index}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 line-clamp-1">
                              {app.company_name || 'Unbekanntes Unternehmen'}
                            </h3>
                            <p className="text-sm text-slate-500 line-clamp-1">
                              {app.job_title || 'Position'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(app.created_at)}</span>
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                        {app.cover_letter.substring(0, 150)}...
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-full"
                          onClick={() => setSelectedApp(app)}
                          data-testid={`view-btn-${index}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ansehen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => downloadPdf(app)}
                          data-testid={`download-btn-${index}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-red-500 hover:bg-red-50"
                          onClick={() => setDeleteId(app.id)}
                          data-testid={`delete-btn-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Bewerbung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Bewerbung wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" data-testid="cancel-delete-btn">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteApplication}
              className="rounded-full bg-red-500 hover:bg-red-600"
              data-testid="confirm-delete-btn"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedApp(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="preview-modal"
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{selectedApp.company_name}</h3>
                <p className="text-sm text-slate-500">{selectedApp.job_title}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApp(null)}
                data-testid="close-preview-btn"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="pdf-preview">
                {selectedApp.cover_letter.split('\n').map((line, i) => (
                  <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-4">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setSelectedApp(null)}
                data-testid="close-modal-btn"
              >
                Schließen
              </Button>
              <Button
                className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700"
                onClick={() => downloadPdf(selectedApp)}
                data-testid="download-modal-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF Download
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
