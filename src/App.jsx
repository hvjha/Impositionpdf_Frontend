import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WorkflowSteps from './components/WorkflowSteps';
import UploadSection from './components/UploadSection';
import AnalysisSection from './components/AnalysisSection';
import ValidationSection from './components/ValidationSection';
import CropSection from './components/CropSection';
import ImpositionSection from './components/ImpositionSection';
import PdfCanvasViewer from './components/PdfCanvasViewer';
import ConsoleDrawer from './components/ConsoleDrawer';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxAllowedStep, setMaxAllowedStep] = useState(1);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // Active Job State
  const [activeJob, setActiveJob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [impositionData, setImpositionData] = useState(null);

  // System Logs
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'INFO', message: 'Prepress Studio initialized. Ready for PDF ingestion.' }
  ]);

  const addLog = (type, message) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), type, message }
    ]);
  };

  // Backend Health Ping
  useEffect(() => {
    const verifyHealth = async () => {
      const healthy = await checkBackendHealth();
      setIsBackendOnline(healthy);
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Step Handlers
  const handleUploadSuccess = (job, file) => {
    setActiveJob(job);
    setUploadedFile(file);
    addLog('SUCCESS', `PDF Uploaded: ${file.name} (Job ID: #${job.jobId}) stored in GridFS`);
    setMaxAllowedStep(2);
    setCurrentStep(2);
  };

  const handleAnalysisSuccess = (analysis) => {
    setAnalysisData(analysis);
    addLog('SUCCESS', `Preflight Analysis complete: ${analysis.pageCount || 1} pages parsed`);
    if (maxAllowedStep < 3) setMaxAllowedStep(3);
  };

  const handleValidationSuccess = (validation) => {
    setValidationData(validation);
    addLog('SUCCESS', `Preflight Validation complete. Status: ${validation.valid ? 'VALIDATED' : 'WARNING'}`);
    if (maxAllowedStep < 4) setMaxAllowedStep(4);
  };

  const handleCropSuccess = (cropResult) => {
    setCropData(cropResult);
    if (cropResult.outputFileId) {
      setActiveJob((prev) => ({ ...prev, outputFileId: cropResult.outputFileId, status: 'CROPPED' }));
    }
    addLog('SUCCESS', `Precision Crop applied to job #${activeJob?.jobId.slice(-6)}`);
    if (maxAllowedStep < 5) setMaxAllowedStep(5);
  };

  const handleImpositionSuccess = (res) => {
    setImpositionData(res);
    if (res.outputFileId) {
      setActiveJob((prev) => ({ ...prev, outputFileId: res.outputFileId, status: 'COMPLETED' }));
    }
    addLog('SUCCESS', `N-Up Imposition sheet generated (Output File ID: #${res.outputFileId?.slice(-6)})`);
    setMaxAllowedStep(6);
    setCurrentStep(6);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setMaxAllowedStep(1);
    setActiveJob(null);
    setUploadedFile(null);
    setAnalysisData(null);
    setValidationData(null);
    setCropData(null);
    setImpositionData(null);
    addLog('INFO', 'Reset workspace. Prepared for new PDF job.');
  };

  return (
    <div className="min-[#100%] min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans pb-16">
      
      {/* Unified Navigation Header */}
      <Navbar
        isBackendOnline={isBackendOnline}
        activeJob={activeJob}
        currentStep={currentStep}
        onReset={handleReset}
      />

      {/* Workflow Stepper Bar */}
      <WorkflowSteps
        currentStep={currentStep}
        setStep={setCurrentStep}
        maxAllowedStep={maxAllowedStep}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {currentStep === 1 && (
          <UploadSection onUploadSuccess={handleUploadSuccess} />
        )}

        {currentStep === 2 && activeJob && (
          <AnalysisSection
            jobId={activeJob.jobId}
            analysisData={analysisData}
            onAnalysisSuccess={handleAnalysisSuccess}
            onProceedToValidation={() => {
              if (maxAllowedStep < 3) setMaxAllowedStep(3);
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
              if (maxAllowedStep < 4) setMaxAllowedStep(4);
              setCurrentStep(4);
            }}
            onProceedToImposition={() => {
              if (maxAllowedStep < 5) setMaxAllowedStep(5);
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
              if (maxAllowedStep < 5) setMaxAllowedStep(5);
              setCurrentStep(5);
            }}
          />
        )}

        {currentStep === 5 && activeJob && (
          <ImpositionSection
            jobId={activeJob.jobId}
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
      </main>

      {/* Telemetry Log Drawer */}
      <ConsoleDrawer logs={logs} />
    </div>
  );
}
