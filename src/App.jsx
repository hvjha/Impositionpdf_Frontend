import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import WorkflowSteps from './components/WorkflowSteps';
import UploadSection from './components/UploadSection';
import ConsoleDrawer from './components/ConsoleDrawer';
import { checkBackendHealth, getJobDetails } from './services/api';

// Code-splitting via React.lazy for optimized initial bundle loading & rapid startup
const AnalysisSection = lazy(() => import('./components/AnalysisSection'));
const ValidationSection = lazy(() => import('./components/ValidationSection'));
const CropSection = lazy(() => import('./components/CropSection'));
const ImpositionSection = lazy(() => import('./components/ImpositionSection'));
const PdfCanvasViewer = lazy(() => import('./components/PdfCanvasViewer'));
const LoginView = lazy(() => import('./components/LoginView'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));

// Premium Skeleton Fallback Loader
function PrepressSuspenseFallback({ label = "Loading workflow module..." }) {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center space-y-3">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-cyan-400/80 animate-pulse">{label}</p>
    </div>
  );
}

export default function App() {
  // ─── Authentication State ───────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const isSessionActive = sessionStorage.getItem('prepress_session_active');
      const saved = localStorage.getItem('prepress_auth_user');
      if (isSessionActive && saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  // ─── Workflow Stepper State ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [maxAllowedStep, setMaxAllowedStep] = useState(1);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // ─── Dual History Modal State ───────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ─── Active Job State ───────────────────────────────────────────────────
  const [activeJob, setActiveJob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [impositionData, setImpositionData] = useState(null);

  // ─── Telemetry Logs ─────────────────────────────────────────────────────
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'INFO', message: 'Prepress Studio initialized. Ready for PDF ingestion.' }
  ]);

  const addLog = useCallback((type, message) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), type, message }
    ]);
  }, []);

  // Backend Health Ping
  useEffect(() => {
    let isMounted = true;
    const verifyHealth = async () => {
      const healthy = await checkBackendHealth();
      if (isMounted) setIsBackendOnline(healthy);
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Login handler
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    addLog('SUCCESS', `Operator authenticated: ${userData.username} (${userData.role})`);
  }, [addLog]);

  // Step Handlers with useCallback optimization
  const handleUploadSuccess = useCallback((job, file) => {
    setActiveJob(job);
    setUploadedFile(file);
    addLog('SUCCESS', `PDF Uploaded: ${file.name} (Job ID: #${job.jobId}) stored in GridFS`);
    setMaxAllowedStep(2);
    setCurrentStep(2);
  }, [addLog]);

  const handleAnalysisSuccess = useCallback((analysis) => {
    setAnalysisData(analysis);
    addLog('SUCCESS', `Preflight Analysis complete: ${analysis.pageCount || 1} pages parsed`);
    setMaxAllowedStep((prev) => (prev < 3 ? 3 : prev));
  }, [addLog]);

  const handleValidationSuccess = useCallback((validation) => {
    setValidationData(validation);
    addLog('SUCCESS', `Preflight Validation complete. Status: ${validation.valid ? 'VALIDATED' : 'WARNING'}`);
    setMaxAllowedStep((prev) => (prev < 4 ? 4 : prev));
  }, [addLog]);

  const handleCropSuccess = useCallback((cropResult) => {
    setCropData(cropResult);
    if (cropResult.outputFileId) {
      setActiveJob((prev) => ({ ...prev, outputFileId: cropResult.outputFileId, status: 'CROPPED' }));
    }
    addLog('SUCCESS', `Precision Crop applied to job`);
    setMaxAllowedStep((prev) => (prev < 5 ? 5 : prev));
  }, [addLog]);

  const handleImpositionSuccess = useCallback((res) => {
    setImpositionData(res);
    if (res.outputFileId) {
      setActiveJob((prev) => ({ ...prev, outputFileId: res.outputFileId, status: 'COMPLETED' }));
    }
    addLog('SUCCESS', `N-Up Imposition sheet generated (Output File ID: #${res.outputFileId?.slice(-6)})`);
    setMaxAllowedStep(6);
    setCurrentStep(6);
  }, [addLog]);

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setMaxAllowedStep(1);
    setActiveJob(null);
    setUploadedFile(null);
    setAnalysisData(null);
    setValidationData(null);
    setCropData(null);
    setImpositionData(null);
    addLog('INFO', 'Reset workspace. Prepared for new PDF job.');
  }, [addLog]);

  // Logout handler
  const handleLogout = useCallback(() => {
    if (window.confirm("Are you sure you want to sign out of Prepress Studio?")) {
      sessionStorage.removeItem('prepress_session_active');
      localStorage.removeItem('prepress_auth_token');
      localStorage.removeItem('prepress_auth_user');
      setUser(null);
      handleReset();
    }
  }, [handleReset]);

  // Load Job from Archives (Upload History)
  const handleLoadJob = useCallback((job) => {
    setActiveJob({
      jobId: job.jobId,
      originalFileName: job.originalFileName,
      fileSize: job.fileSize,
      status: job.status,
      outputFileId: job.outputFileId
    });
    setUploadedFile(null);
    setAnalysisData(job.analysis || null);
    setValidationData(job.validation || null);
    setCropData(job.productionConfig?.crop || null);
    setImpositionData(job.productionConfig?.imposition || null);

    addLog('SUCCESS', `Loaded archived job #${job.jobId.slice(-6).toUpperCase()}: ${job.originalFileName}`);

    if (job.status === 'COMPLETED' && job.outputFileId) {
      setMaxAllowedStep(6);
      setCurrentStep(6);
    } else if (job.status === 'VALIDATED') {
      setMaxAllowedStep(5);
      setCurrentStep(5);
    } else if (job.status === 'ANALYZED') {
      setMaxAllowedStep(3);
      setCurrentStep(3);
    } else {
      setMaxAllowedStep(2);
      setCurrentStep(2);
    }
  }, [addLog]);

  // Inspect Output from Archives (Output History)
  const handleInspectOutput = useCallback((outputItem) => {
    setActiveJob({
      jobId: outputItem.jobId,
      originalFileName: outputItem.originalFileName,
      fileSize: outputItem.fileSize,
      status: outputItem.status || 'COMPLETED',
      outputFileId: outputItem.outputFileId
    });
    setUploadedFile(null);
    setMaxAllowedStep(6);
    setCurrentStep(6);
    addLog('SUCCESS', `Inspecting imposed output #${outputItem.outputFileId.slice(-6).toUpperCase()}`);
  }, [addLog]);

  // Reimpose Job from Output History
  const handleReimposeJob = useCallback(async (outputItem) => {
    try {
      const res = await getJobDetails(outputItem.jobId);
      if (res.success && res.job) {
        handleLoadJob(res.job);
        setMaxAllowedStep(5);
        setCurrentStep(5);
        addLog('INFO', `Opened job #${outputItem.jobId.slice(-6).toUpperCase()} in Imposition Studio`);
      }
    } catch (err) {
      addLog('ERROR', `Could not reload job for re-imposition: ${err.message}`);
    }
  }, [handleLoadJob, addLog]);

  // Memoized user info
  const userHeader = useMemo(() => user, [user]);

  // If user is not authenticated, show Login Screen via Suspense
  if (!user) {
    return (
      <Suspense fallback={<PrepressSuspenseFallback label="Loading Secure Prepress Login..." />}>
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans pb-16">
      {/* Unified Navigation Header */}
      <Navbar
        isBackendOnline={isBackendOnline}
        activeJob={activeJob}
        currentStep={currentStep}
        user={userHeader}
        onReset={handleReset}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLogout={handleLogout}
      />

      {/* Workflow Stepper Bar */}
      <WorkflowSteps
        currentStep={currentStep}
        setStep={setCurrentStep}
        maxAllowedStep={maxAllowedStep}
      />

      {/* Main Dynamic Viewport with Suspense Lazy Loading */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 py-3">
        <Suspense fallback={<PrepressSuspenseFallback label="Initializing prepress module..." />}>
          {currentStep === 1 && (
            <UploadSection
              onUploadSuccess={handleUploadSuccess}
              onOpenHistory={() => setIsHistoryOpen(true)}
            />
          )}

          {currentStep === 2 && activeJob && (
            <AnalysisSection
              jobId={activeJob.jobId}
              analysisData={analysisData}
              onAnalysisSuccess={handleAnalysisSuccess}
              onProceedToValidation={() => {
                setMaxAllowedStep((prev) => (prev < 3 ? 3 : prev));
                setCurrentStep(3);
              }}
            />
          )}

          {currentStep === 3 && activeJob && (
            <ValidationSection
              jobId={activeJob.jobId}
              validationData={validationData}
              onValidationSuccess={handleValidationSuccess}
              onProceedToCrop={() => {
                setMaxAllowedStep((prev) => (prev < 4 ? 4 : prev));
                setCurrentStep(4);
              }}
              onProceedToImposition={() => {
                setMaxAllowedStep((prev) => (prev < 5 ? 5 : prev));
                setCurrentStep(5);
              }}
            />
          )}

          {currentStep === 4 && activeJob && (
            <CropSection
              jobId={activeJob.jobId}
              analysisData={analysisData}
              onCropSuccess={handleCropSuccess}
              onProceedToImposition={() => {
                setMaxAllowedStep((prev) => (prev < 5 ? 5 : prev));
                setCurrentStep(5);
              }}
            />
          )}

          {currentStep === 5 && activeJob && (
            <ImpositionSection
              jobId={activeJob.jobId}
              analysisData={analysisData}
              uploadedFile={uploadedFile}
              activeJob={activeJob}
              onImpositionSuccess={handleImpositionSuccess}
              onProceedToOutput={() => setCurrentStep(6)}
            />
          )}

          {currentStep === 6 && activeJob && (
            <PdfCanvasViewer
              jobId={activeJob.jobId}
              outputFileId={activeJob.outputFileId || impositionData?.outputFileId}
              activeJob={activeJob}
              onReset={handleReset}
            />
          )}
        </Suspense>
      </main>

      {/* Telemetry Log Drawer */}
      <ConsoleDrawer logs={logs} />

      {/* Dual Column History Modal (Lazy Loaded) */}
      {isHistoryOpen && (
        <Suspense fallback={<PrepressSuspenseFallback label="Loading Job Archives..." />}>
          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onLoadJob={handleLoadJob}
            onInspectOutput={handleInspectOutput}
            onReimposeJob={handleReimposeJob}
          />
        </Suspense>
      )}
    </div>
  );
}
