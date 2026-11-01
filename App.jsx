import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Calendar, Check, CheckCircle2,
  ChevronRight, Clock, Eye, FileText, Heart, HelpCircle, Info, Lock,
  LogOut, Mail, MapPin, MessageSquare, Mic, MicOff, Phone, Pill,
  Plus, Printer, RefreshCw, Search, ShieldAlert, Sparkles, Star,
  Stethoscope, ThumbsUp, Trash2, User, UserCheck, Video, VideoOff,
  Volume2, X, Zap
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'nurse', 'triage', 'doctor', 'meds', 'telemed', 'appointments', 'feedback'
  const [toast, setToast] = useState(null);

  // Global Data
  const [doctors, setDoctors] = useState([]);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicineReminders, setMedicineReminders] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [appointmentReminders, setAppointmentReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activePrescriptionModal, setActivePrescriptionModal] = useState(null);
  const [tokenSlipModal, setTokenSlipModal] = useState(null);
  const [activeAlertReminder, setActiveAlertReminder] = useState(null);
  const [isTvMode, setIsTvMode] = useState(false);

  // Patient Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_care_patient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userProfile) => {
    localStorage.setItem('smart_care_patient', JSON.stringify(userProfile));
    setCurrentUser(userProfile);
    showToast(`Welcome back, ${userProfile.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('smart_care_patient');
    setCurrentUser(null);
    showToast('Signed out of patient portal', 'info');
  };

  // -------------------------------------------------------------
  // Data Fetching & Sync
  // -------------------------------------------------------------
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = async () => {
    try {
      const [docRes, queueRes, aptRes, rxRes, medRes, fbRes, aptRemRes] = await Promise.all([
        fetch(`${API_BASE}/doctors`).then(r => r.json()),
        fetch(`${API_BASE}/queue`).then(r => r.json()),
        fetch(`${API_BASE}/appointments`).then(r => r.json()),
        fetch(`${API_BASE}/prescriptions`).then(r => r.json()),
        fetch(`${API_BASE}/reminders/medicine`).then(r => r.json()),
        fetch(`${API_BASE}/feedbacks`).then(r => r.json()),
        fetch(`${API_BASE}/reminders/appointments`).then(r => r.json())
      ]);

      setDoctors(Array.isArray(docRes) ? docRes : []);
      setQueue(Array.isArray(queueRes) ? queueRes : []);
      setAppointments(Array.isArray(aptRes) ? aptRes : []);
      setPrescriptions(Array.isArray(rxRes) ? rxRes : []);
      setMedicineReminders(Array.isArray(medRes) ? medRes : []);
      setFeedbacks(Array.isArray(fbRes) ? fbRes : []);
      setAppointmentReminders(Array.isArray(aptRemRes) ? aptRemRes : []);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Could not sync with local database', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // Polling sync
    return () => clearInterval(interval);
  }, []);

  // Compute key real-time metrics
  const stats = useMemo(() => {
    const waiting = queue.filter(q => q.status === 'WAITING').length;
    const critical = queue.filter(q => q.status === 'WAITING' && q.priority_level === 1).length;
    const inConsult = queue.filter(q => q.status === 'IN_CONSULTATION').length;
    const completed = queue.filter(q => q.status === 'COMPLETED').length;
    const takenMeds = medicineReminders.filter(m => m.status === 'TAKEN').length;
    const totalMeds = medicineReminders.length || 1;
    const adherenceRate = Math.round((takenMeds / totalMeds) * 100);

    return { waiting, critical, inConsult, completed, adherenceRate };
  }, [queue, medicineReminders]);

  return (
    <div className={`min-h-screen flex flex-col ${isTvMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all">
          <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium ${
            toast.type === 'error' ? 'bg-rose-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Patient Entry Screen or Full Hospital System */}
      {!currentUser ? (
        <PatientLoginPage onLogin={handleLogin} showToast={showToast} />
      ) : (
        <>
          {/* Main Top Header */}
          {!isTvMode && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Brand Logo */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('queue')}>
                <div className="w-11 h-11 bg-gradient-to-tr from-sky-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">Smart Care Connect</span>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-800 rounded-full">v2.5 Live</span>
                  </div>
                  <p className="text-xs text-slate-500">Smart Hospital Scheduling & Priority Queue System</p>
                </div>
              </div>

              {/* Quick Clinical Status Summary */}
              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold">{stats.waiting}</span>
                    <span className="text-xs text-amber-700 ml-1">Waiting in Queue</span>
                  </div>
                </div>

                {stats.critical > 0 && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 animate-pulse">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <div>
                      <span className="font-bold">{stats.critical}</span>
                      <span className="text-xs text-rose-700 ml-1">Critical Escalation</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-900">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold">{stats.inConsult}</span>
                    <span className="text-xs text-emerald-700 ml-1">In Consultation</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsTvMode(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Switch to Full-Screen TV Queue Display"
                >
                  <Eye className="w-3.5 h-3.5" />
                  TV Waiting Mode
                </button>

                {currentUser && (
                  <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center font-bold text-xs shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="hidden xl:block text-left text-xs">
                      <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                      title="Sign Out / Switch Patient"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-3 pt-1 scrollbar-none border-t border-slate-100">
              <TabButton
                active={activeTab === 'queue'}
                onClick={() => setActiveTab('queue')}
                icon={<Activity className="w-4 h-4" />}
                label="Priority Queue Board"
                badge={stats.critical > 0 ? `${stats.critical} Critical` : stats.waiting}
                badgeColor={stats.critical > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}
              />
              <TabButton
                active={activeTab === 'nurse'}
                onClick={() => setActiveTab('nurse')}
                icon={<Heart className="w-4 h-4 text-rose-500" />}
                label="Nurse Vitals & Check-in"
                highlight
              />
              <TabButton
                active={activeTab === 'triage'}
                onClick={() => setActiveTab('triage')}
                icon={<Sparkles className="w-4 h-4 text-teal-600" />}
                label="Symptom Triage"
              />
              <TabButton
                active={activeTab === 'doctor'}
                onClick={() => setActiveTab('doctor')}
                icon={<Stethoscope className="w-4 h-4" />}
                label="Doctor Desk & Rx"
              />
              <TabButton
                active={activeTab === 'meds'}
                onClick={() => setActiveTab('meds')}
                icon={<Pill className="w-4 h-4 text-purple-600" />}
                label="Medicine Reminders"
                badge={`${stats.adherenceRate}% Adherence`}
                badgeColor="bg-purple-100 text-purple-700 font-semibold"
              />
              <TabButton
                active={activeTab === 'telemed'}
                onClick={() => setActiveTab('telemed')}
                icon={<Video className="w-4 h-4 text-blue-600" />}
                label="Telemedicine"
              />
              <TabButton
                active={activeTab === 'appointments'}
                onClick={() => setActiveTab('appointments')}
                icon={<Calendar className="w-4 h-4 text-emerald-600" />}
                label="Appointments & Alerts"
              />
              <TabButton
                active={activeTab === 'feedback'}
                onClick={() => setActiveTab('feedback')}
                icon={<Star className="w-4 h-4 text-amber-500" />}
                label="Patient Feedback"
              />
            </div>
          </div>
        </header>
      )}

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isTvMode ? (
          <TvWaitingRoomBoard queue={queue} doctors={doctors} onExit={() => setIsTvMode(false)} />
        ) : (
          <>
            {activeTab === 'queue' && (
              <QueueDashboard
                queue={queue}
                doctors={doctors}
                onUpdateStatus={fetchAllData}
                onOpenPrescription={(rx) => setActivePrescriptionModal(rx)}
                onPrintToken={(token) => setTokenSlipModal(token)}
                onSwitchToNurse={() => setActiveTab('nurse')}
                showToast={showToast}
              />
            )}

            {activeTab === 'nurse' && (
              <NurseVitalsStation
                doctors={doctors}
                appointments={appointments}
                onTokenCreated={(token) => {
                  fetchAllData();
                  setTokenSlipModal(token);
                  setActiveTab('queue');
                  showToast(`Token ${token.token_code} issued! Vitals logged.`, 'success');
                }}
                showToast={showToast}
              />
            )}

            {activeTab === 'triage' && (
              <SymptomTriageStation
                doctors={doctors}
                onTriageComplete={(data) => {
                  fetchAllData();
                  setActiveTab('nurse');
                }}
                onTokenCreated={(token) => {
                  fetchAllData();
                  setTokenSlipModal(token);
                  setActiveTab('queue');
                  showToast(`Triage Complete! Token ${token.token_code} created.`, 'success');
                }}
                showToast={showToast}
              />
            )}

            {activeTab === 'doctor' && (
              <DoctorConsultationDesk
                doctors={doctors}
                queue={queue}
                prescriptions={prescriptions}
                onPrescriptionIssued={(rx) => {
                  fetchAllData();
                  setActivePrescriptionModal(rx);
                  showToast('Digital Prescription saved and medicine reminders synced!', 'success');
                }}
                onUpdateQueueStatus={fetchAllData}
                showToast={showToast}
              />
            )}

            {activeTab === 'meds' && (
              <MedicineReminderView
                reminders={medicineReminders}
                onRefresh={fetchAllData}
                showToast={showToast}
              />
            )}

            {activeTab === 'telemed' && (
              <TelemedicineRoom
                doctors={doctors}
                onProceedToPrescription={() => setActiveTab('doctor')}
                showToast={showToast}
              />
            )}

            {activeTab === 'appointments' && (
              <AppointmentScheduler
                doctors={doctors}
                appointments={appointments}
                reminders={appointmentReminders}
                onAppointmentBooked={() => {
                  fetchAllData();
                  showToast('Appointment successfully confirmed! Reminders scheduled.', 'success');
                }}
                onTriggerAlertModal={(rem) => setActiveAlertReminder(rem)}
                showToast={showToast}
              />
            )}

            {activeTab === 'feedback' && (
              <PatientFeedbackPortal
                doctors={doctors}
                feedbacks={feedbacks}
                onFeedbackSubmitted={() => {
                  fetchAllData();
                  showToast('Thank you for rating your consultation!', 'success');
                }}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {!isTvMode && (
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Smart Care Connect – Clinical Queue Management & Triage Suite</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Local SQLite Engine: `smart_care.sqlite`</span>
              <span>•</span>
              <span>Node.js v24 + React + Tailwind</span>
            </div>
          </div>
        </footer>
      )}
        </>
      )}

      {/* Official Prescription Printable Modal */}
      {activePrescriptionModal && (
        <PrescriptionPrintModal
          prescription={activePrescriptionModal}
          onClose={() => setActivePrescriptionModal(null)}
        />
      )}

      {/* Patient Token Ticket Print Modal */}
      {tokenSlipModal && (
        <TokenSlipModal
          token={tokenSlipModal}
          onClose={() => setTokenSlipModal(null)}
        />
      )}

      {/* Simulated Automated Reminder Alert Notification Modal */}
      {activeAlertReminder && (
        <ReminderAlertModal
          reminder={activeAlertReminder}
          onClose={() => setActiveAlertReminder(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// 1. Priority Queue Dashboard Component
// ============================================================================
function QueueDashboard({ queue, doctors, onUpdateStatus, onOpenPrescription, onPrintToken, onSwitchToNurse, showToast }) {
  const [filterSpecialty, setFilterSpecialty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const specialties = ['ALL', ...new Set(doctors.map(d => d.specialty))];

  const filteredQueue = queue.filter(item => {
    const matchSpec = filterSpecialty === 'ALL' || item.specialty === filterSpecialty;
    const matchSearch = item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.token_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSpec && matchSearch;
  });

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Token status updated to ${status}`);
        onUpdateStatus();
      }
    } catch (err) {
      showToast('Status update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert Banner if Critical Patients are Waiting */}
      {queue.some(q => q.status === 'WAITING' && q.priority_level === 1) && (
        <div className="p-4 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">ABNORMAL VITALS ESCALATION ACTIVE</h3>
              <p className="text-xs text-rose-100">
                Patients with hypoxia, hypertensive crisis, or extreme vitals have been automatically moved to the top of the queue.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white text-rose-600 font-extrabold text-xs rounded-full uppercase tracking-wider">
            Immediate Doctor Attention
          </span>
        </div>
      )}

      {/* Control Bar: Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token code or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {specialties.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Specialties' : s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={onSwitchToNurse}
            className="w-full md:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-sky-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Early Check-In / Intake
          </button>
        </div>
      </div>

      {/* Tokens Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Active Queue Tokens</h2>
            <p className="text-xs text-slate-500">Auto-ranked by Clinical Priority Level & Waiting Time</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span> Priority 1: Emergency
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-semibold">
              Priority 2: Urgent
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
              Priority 3: Normal
            </span>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-slate-600">No active patients in the queue</p>
            <p className="text-xs mt-1">Use the Nurse Station or Symptom Triage to check in patients.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredQueue.map((item, index) => {
              const isCritical = item.priority_level === 1;
              const isUrgent = item.priority_level === 2;
              const isWaiting = item.status === 'WAITING';
              const isInConsult = item.status === 'IN_CONSULTATION';

              return (
                <div
                  key={item.id}
                  className={`p-5 transition-all hover:bg-slate-50/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                    isCritical && isWaiting ? 'bg-rose-50/40 border-l-4 border-l-rose-500' :
                    isInConsult ? 'bg-emerald-50/30 border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  {/* Left: Token info & Patient */}
                  <div className="flex items-start gap-4">
                    {/* Token Number Box */}
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm ${
                      isCritical && isWaiting ? 'bg-rose-600 text-white shadow-rose-500/30 animate-pulse' :
                      isUrgent && isWaiting ? 'bg-amber-500 text-white' :
                      isInConsult ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                      <span className="text-xs font-medium uppercase tracking-wider opacity-80">Token</span>
                      <span className="text-xl tracking-tight leading-none">{item.token_code}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{item.patient_name}</h3>
                        <span className="text-xs text-slate-500">
                          ({item.patient_age ? `${item.patient_age} yrs` : 'Age N/A'}, {item.patient_gender || 'Other'})
                        </span>

                        {/* Priority Badge */}
                        {isCritical && (
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full flex items-center gap-1 shadow-sm">
                            <ShieldAlert className="w-3 h-3" /> ESCALATED TO TOP
                          </span>
                        )}
                        {isUrgent && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                            Urgent Case
                          </span>
                        )}

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          item.status === 'WAITING' ? 'bg-sky-100 text-sky-800' :
                          item.status === 'IN_CONSULTATION' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                          item.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Doctor & Specialty */}
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">{item.specialty}</span>
                        <span>•</span>
                        <span>Doctor: {item.doctor_name || 'Assigned Specialist'}</span>
                        {item.room_number && (
                          <>
                            <span>•</span>
                            <span className="text-sky-700 font-medium">{item.room_number}</span>
                          </>
                        )}
                      </p>

                      {/* Symptoms & Vitals Rationale */}
                      {item.priority_reason && item.priority_reason !== 'Vitals within standard acceptable range' && (
                        <p className="text-xs font-semibold text-rose-700 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.priority_reason}</span>
                        </p>
                      )}

                      {item.symptoms && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                          "{item.symptoms}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Center: Nurse Vitals Badges (Height, Weight, BMI, Sugar, SpO2, BP) */}
                  <div className="flex items-center gap-2 flex-wrap py-2 px-3 rounded-xl bg-white/80 border border-slate-100 text-xs">
                    {item.spo2 && (
                      <span className={`px-2 py-1 rounded-md font-bold ${
                        item.spo2 < 92 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        SpO2: {item.spo2}%
                      </span>
                    )}

                    {item.blood_sugar && (
                      <span className={`px-2 py-1 rounded-md font-semibold ${
                        item.blood_sugar > 200 || item.blood_sugar < 70 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Sugar: {item.blood_sugar} mg/dL
                      </span>
                    )}

                    {item.bp_sys && item.bp_dia && (
                      <span className={`px-2 py-1 rounded-md font-semibold ${
                        item.bp_sys >= 140 || item.bp_dia >= 90 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        BP: {item.bp_sys}/{item.bp_dia}
                      </span>
                    )}

                    {item.bmi && (
                      <span className="px-2 py-1 rounded-md bg-sky-50 text-sky-800 font-medium">
                        BMI: {item.bmi}
                      </span>
                    )}

                    {item.heart_rate && (
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                        HR: {item.heart_rate} bpm
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      onClick={() => onPrintToken(item)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Print Token Slip"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {item.status === 'WAITING' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'IN_CONSULTATION')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Call In
                      </button>
                    )}

                    {item.status === 'IN_CONSULTATION' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete Visit
                      </button>
                    )}

                    {item.status === 'WAITING' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'SKIPPED')}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. Nurse Vitals & Early Check-In Station Component
// ============================================================================
function NurseVitalsStation({ doctors, appointments, onTokenCreated, showToast }) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || 1);
  const [symptoms, setSymptoms] = useState('');

  // Physical Nurse Measurements
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from early appointment arrival
  const handleSelectAppointment = (apt) => {
    setPatientName(apt.patient_name);
    setPatientPhone(apt.patient_phone);
    if (apt.doctor_id) setDoctorId(apt.doctor_id);
    showToast(`Loaded details for ${apt.patient_name}`);
  };

  // Real-time BMI calculation
  const computedBmi = useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (h > 0 && w > 0) {
      const hm = h / 100;
      return (w / (hm * hm)).toFixed(1);
    }
    return null;
  }, [heightCm, weightKg]);

  // Real-time risk preview
  const riskAnalysis = useMemo(() => {
    const alerts = [];
    let isEmergency = false;

    const s = Number(spo2);
    if (s && s < 92) {
      alerts.push(`Critical Hypoxia (SpO2 ${s}% < 92%)`);
      isEmergency = true;
    }
    const sugar = Number(bloodSugar);
    if (sugar && (sugar < 70 || sugar >= 250)) {
      alerts.push(`Abnormal Blood Glucose (${sugar} mg/dL)`);
      if (sugar < 60 || sugar >= 300) isEmergency = true;
    }
    const sys = Number(bpSys);
    const dia = Number(bpDia);
    if (sys >= 180 || dia >= 120) {
      alerts.push(`Hypertensive Crisis (${sys}/${dia} mmHg)`);
      isEmergency = true;
    }

    return { alerts, isEmergency };
  }, [spo2, bloodSugar, bpSys, bpDia]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showToast('Please enter patient name', 'error');
      return;
    }

    setSubmitting(true);
    const selectedDoc = doctors.find(d => Number(d.id) === Number(doctorId)) || doctors[0];

    try {
      const payload = {
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_age: patientAge ? parseInt(patientAge) : null,
        patient_gender: patientGender,
        doctor_id: selectedDoc?.id,
        specialty: selectedDoc?.specialty || 'General Medicine',
        symptoms,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        blood_sugar: bloodSugar ? parseFloat(bloodSugar) : null,
        bp_sys: bpSys ? parseInt(bpSys) : null,
        bp_dia: bpDia ? parseInt(bpDia) : null,
        heart_rate: heartRate ? parseInt(heartRate) : null,
        spo2: spo2 ? parseInt(spo2) : null,
        temperature: temperature ? parseFloat(temperature) : null
      };

      const res = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to register token');
      const tokenData = await res.json();
      onTokenCreated(tokenData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Station Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-700 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 bg-white/20 text-xs font-bold rounded-full uppercase tracking-wider">
              Nurse Station Pre-Check
            </span>
            <h1 className="text-2xl font-black mt-1">Early Arrival & Vitals Intake Station</h1>
            <p className="text-teal-100 text-xs mt-0.5">
              Record Height, Weight, Blood Sugar, SpO2 & Vitals. Abnormal vitals automatically escalate queue priority.
            </p>
          </div>
        </div>

        {/* Quick appointments picker */}
        {appointments.filter(a => a.status === 'SCHEDULED').length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-teal-100 mb-2">Patients Arrived Early for Appointments:</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {appointments.filter(a => a.status === 'SCHEDULED').slice(0, 5).map(apt => (
                <button
                  key={apt.id}
                  onClick={() => handleSelectAppointment(apt)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded-xl backdrop-blur-sm whitespace-nowrap transition-colors flex items-center gap-1.5 border border-white/15"
                >
                  <User className="w-3.5 h-3.5 text-teal-200" />
                  <span>{apt.patient_name}</span>
                  <span className="opacity-75">({apt.time_slot})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Section 1: Demographics */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" /> Patient Demographics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555-0199"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Age & Gender</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-20 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="flex-1 px-2 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Physical & Metabolic Measurements (Height, Weight, BMI, Sugar, SpO2) */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" /> Nurse Physical & Metabolic Vitals Record
            </h2>
            {computedBmi && (
              <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-lg">
                Calculated BMI: {computedBmi} kg/m²
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Height */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Stored in patient record</span>
            </div>

            {/* Weight */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 72"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Used for dosage & BMI</span>
            </div>

            {/* Blood Sugar Level */}
            <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-amber-900">Blood Sugar (mg/dL)</label>
              </div>
              <input
                type="number"
                placeholder="e.g. 110"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-amber-950"
              />
              <span className="text-[10px] text-amber-700 mt-1 block font-medium">Normal: 70-140 mg/dL</span>
            </div>

            {/* Oxygen Level (SpO2 %) */}
            <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-200/80">
              <label className="block text-xs font-semibold text-sky-900 mb-1">Oxygen SpO2 (%)</label>
              <input
                type="number"
                placeholder="e.g. 98"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:outline-none font-bold ${
                  spo2 && Number(spo2) < 92 ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : 'border-sky-300 text-sky-950 focus:ring-sky-500'
                }`}
              />
              <span className={`text-[10px] mt-1 block font-semibold ${
                spo2 && Number(spo2) < 92 ? 'text-rose-600 font-bold' : 'text-sky-700'
              }`}>
                {spo2 && Number(spo2) < 92 ? 'CRITICAL HYPOXIA' : 'Target: 95-100%'}
              </span>
            </div>

            {/* Blood Pressure (Systolic / Diastolic) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Sys"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                  className="w-full px-2 py-2 text-sm bg-white border border-slate-200 rounded-lg text-center font-semibold"
                />
                <span className="text-slate-400">/</span>
                <input
                  type="number"
                  placeholder="Dia"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                  className="w-full px-2 py-2 text-sm bg-white border border-slate-200 rounded-lg text-center font-semibold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Ideal: 120/80</span>
            </div>

            {/* Heart Rate */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Heart Rate (BPM)</label>
              <input
                type="number"
                placeholder="e.g. 74"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Resting: 60-100 bpm</span>
            </div>

            {/* Body Temperature */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 98.6"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Fever if &ge; 100.4°F</span>
            </div>

            {/* Assigned Doctor */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-2 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold focus:outline-none"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Consulting Room</span>
            </div>
          </div>
        </div>

        {/* Symptoms / Chief Complaints */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Chief Complaints & Nurse Observation Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. Arrived early complaining of chest tightness and cold sweats. Took random blood sugar and SpO2."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Live Risk Evaluation Callout */}
        {riskAnalysis.alerts.length > 0 && (
          <div className={`p-4 rounded-2xl flex items-start gap-3 ${
            riskAnalysis.isEmergency ? 'bg-rose-50 border border-rose-300 text-rose-900' : 'bg-amber-50 border border-amber-300 text-amber-900'
          }`}>
            <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${riskAnalysis.isEmergency ? 'text-rose-600' : 'text-amber-600'}`} />
            <div>
              <p className="font-bold text-sm">
                {riskAnalysis.isEmergency ? 'EMERGENCY ESCALATION DETECTED:' : 'ATTENTION: ABNORMAL VITALS DETECTED:'}
              </p>
              <p className="text-xs mt-0.5">{riskAnalysis.alerts.join(' • ')}</p>
              <p className="text-xs font-medium mt-1 underline">
                This token will automatically be boosted ahead of routine checkups.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Vitals & Issue Priority Queue Token
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 3. Symptom-Based Triage Station Component
// ============================================================================
function SymptomTriageStation({ doctors, onTokenCreated, showToast }) {
  const commonSymptoms = [
    { id: 'chest_pain', label: 'Chest Pain or Pressure', icon: '🫀', group: 'Cardiology' },
    { id: 'shortness_of_breath', label: 'Shortness of Breath', icon: '🫁', group: 'Pulmonology / Cardio' },
    { id: 'palpitations', label: 'Heart Palpitations / Racing', icon: '💓', group: 'Cardiology' },
    { id: 'severe_headache', label: 'Severe Sudden Headache / Migraine', icon: '🧠', group: 'Neurology' },
    { id: 'slurred_speech', label: 'Slurred Speech / Face Numbness', icon: '⚠️', group: 'Neurology' },
    { id: 'joint_pain', label: 'Severe Joint or Knee Pain', icon: '🦴', group: 'Orthopedics' },
    { id: 'back_pain', label: 'Acute Lumbar / Back Pain', icon: '⚡', group: 'Orthopedics' },
    { id: 'skin_rash', label: 'Skin Rash or Allergic Hives', icon: '🩹', group: 'Dermatology' },
    { id: 'persistent_cough', label: 'Persistent Cough / Wheezing', icon: '🗣️', group: 'Pulmonology' },
    { id: 'stomach_pain', label: 'Severe Stomach Ache / Gastric Acid', icon: '🤢', group: 'Gastroenterology' },
    { id: 'high_fever', label: 'High Fever & Chills', icon: '🌡️', group: 'General Medicine' },
    { id: 'pediatric_fever', label: 'Child / Infant High Fever', icon: '👶', group: 'Pediatrics' }
  ];

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [triageResult, setTriageResult] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const toggleSymptom = (label) => {
    if (selectedSymptoms.includes(label)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== label));
    } else {
      setSelectedSymptoms([...selectedSymptoms, label]);
    }
  };

  const handleRunTriage = async () => {
    if (selectedSymptoms.length === 0) {
      showToast('Please select at least one symptom', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          age: patientAge,
          is_child: patientAge && Number(patientAge) < 14
        })
      });
      const data = await res.json();
      setTriageResult(data);
      if (data.recommended_doctors && data.recommended_doctors.length > 0) {
        setSelectedDoctorId(data.recommended_doctors[0].id);
      }
      showToast(`Matched with ${data.specialty} department!`);
    } catch (err) {
      showToast('Triage calculation error', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateToken = async () => {
    if (!patientName.trim()) {
      showToast('Please provide patient name', 'error');
      return;
    }
    const doc = doctors.find(d => Number(d.id) === Number(selectedDoctorId)) || doctors[0];

    try {
      const res = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: patientAge ? parseInt(patientAge) : null,
          patient_gender: patientGender,
          doctor_id: doc.id,
          specialty: triageResult?.specialty || doc.specialty,
          symptoms: selectedSymptoms.join(', ')
        })
      });
      const token = await res.json();
      onTokenCreated(token);
    } catch (err) {
      showToast('Could not issue token', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black">AI & Rule-Based Clinical Triage</h1>
            <p className="text-sky-100 text-xs mt-0.5">
              Select symptoms to automatically match the appropriate medical department and clinical specialist.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Patient Information */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">1</span>
          Patient Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name *</label>
            <input
              type="text"
              placeholder="e.g. Priyamvada Joshi"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Age (Years)</label>
            <input
              type="number"
              placeholder="e.g. 34"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
            <select
              value={patientGender}
              onChange={(e) => setPatientGender(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Symptom Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">2</span>
          Select Chief Complaints & Symptoms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {commonSymptoms.map(item => {
            const isSelected = selectedSymptoms.includes(item.label);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSymptom(item.label)}
                className={`p-3.5 rounded-2xl text-left border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold">{item.label}</p>
                    <span className="text-[10px] text-slate-400">{item.group}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-sky-600" />}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRunTriage}
            disabled={analyzing}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze Symptoms & Match Specialty
          </button>
        </div>
      </div>

      {/* Step 3: Triage Recommendation Card */}
      {triageResult && (
        <div className="bg-white p-6 rounded-3xl border-2 border-teal-500 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-2xl text-teal-800">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Triage Diagnosis Match</span>
                <h3 className="text-xl font-black text-slate-900">{triageResult.specialty} Department</h3>
              </div>
            </div>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-extrabold rounded-full border border-teal-200">
              Confidence: {triageResult.match_confidence}
            </span>
          </div>

          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>Clinical Rationale:</strong> {triageResult.rationale}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Recommended Available Specialist:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {triageResult.recommended_doctors?.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                    Number(selectedDoctorId) === Number(doc.id)
                      ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <img src={doc.avatar} alt={doc.name} className="w-11 h-11 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-slate-900">{doc.name}</h4>
                    <p className="text-[10px] text-slate-500">{doc.qualification}</p>
                    <p className="text-[10px] font-semibold text-teal-700">{doc.room_number}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5 justify-end">
                      <Star className="w-3 h-3 fill-amber-500" /> {doc.rating}
                    </span>
                    <span className="text-[10px] text-slate-400">{doc.experience_years}y exp</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreateToken}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-teal-600/20"
            >
              <Check className="w-4 h-4" /> Confirm & Issue Token to Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. Doctor Consultation Desk & Digital Prescription Component
// ============================================================================
function DoctorConsultationDesk({ doctors, queue, prescriptions, onPrescriptionIssued, onUpdateQueueStatus, showToast }) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || 1);
  const activeDoctor = doctors.find(d => Number(d.id) === Number(selectedDoctorId)) || doctors[0];

  // Patients waiting or in consultation for this doctor
  const docQueue = queue.filter(q => Number(q.doctor_id) === Number(selectedDoctorId) || q.specialty === activeDoctor?.specialty);
  const inConsultationPatient = docQueue.find(q => q.status === 'IN_CONSULTATION') || null;

  // Prescription Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDays, setFollowUpDays] = useState(7);
  const [medications, setMedications] = useState([
    { name: '', dosage: '', frequency: '1-0-1', food: 'After Food', duration: '7 Days' }
  ]);

  const addMedRow = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '1-0-0', food: 'After Food', duration: '5 Days' }]);
  };

  const removeMedRow = (idx) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const updateMedRow = (idx, field, val) => {
    const updated = [...medications];
    updated[idx][field] = val;
    setMedications(updated);
  };

  const handleIssuePrescription = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      showToast('Please enter a clinical diagnosis', 'error');
      return;
    }
    if (medications.some(m => !m.name.trim())) {
      showToast('Please provide medication names', 'error');
      return;
    }

    try {
      const payload = {
        token_id: inConsultationPatient?.id || null,
        doctor_id: activeDoctor.id,
        doctor_name: activeDoctor.name,
        patient_name: inConsultationPatient?.patient_name || 'Walk-in Patient',
        patient_phone: inConsultationPatient?.patient_phone || '',
        patient_age: inConsultationPatient?.patient_age || 35,
        patient_gender: inConsultationPatient?.patient_gender || 'Other',
        diagnosis,
        medications,
        advice,
        follow_up_days: followUpDays
      };

      const res = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to issue prescription');
      const savedRx = await res.json();
      onPrescriptionIssued(savedRx);

      // Reset form
      setDiagnosis('');
      setAdvice('');
      setMedications([{ name: '', dosage: '', frequency: '1-0-1', food: 'After Food', duration: '7 Days' }]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Doctor Selector */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={activeDoctor?.avatar} alt={activeDoctor?.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">{activeDoctor?.name}</h2>
            <p className="text-xs text-slate-500">{activeDoctor?.qualification} • {activeDoctor?.specialty} ({activeDoctor?.room_number})</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Switch Doctor Desk:</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-none"
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Doctor's Queue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Patients in Waiting Line</h3>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-xs font-bold rounded-full">
              {docQueue.filter(q => q.status === 'WAITING').length} Waiting
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {docQueue.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No assigned patients in queue</p>
            ) : (
              docQueue.map(item => {
                const isCurrent = inConsultationPatient?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : item.priority_level === 1
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">{item.token_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'IN_CONSULTATION' ? 'bg-emerald-600 text-white' :
                        item.priority_level === 1 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="font-bold text-xs text-slate-900 mt-1">{item.patient_name}</p>
                    <p className="text-[10px] text-slate-500">
                      Age: {item.patient_age || 'N/A'} • SpO2: {item.spo2 || 98}% • Sugar: {item.blood_sugar || 100} mg/dL
                    </p>

                    {item.status === 'WAITING' && (
                      <button
                        onClick={async () => {
                          await fetch(`${API_BASE}/queue/${item.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'IN_CONSULTATION', doctor_id: activeDoctor.id })
                          });
                          onUpdateQueueStatus();
                        }}
                        className="w-full mt-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                      >
                        Call into Office
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Current Patient Vitals & Digital Prescription Creator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Patient Vitals Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Current In-Office Patient</span>
                <h3 className="text-xl font-black">
                  {inConsultationPatient ? inConsultationPatient.patient_name : 'No Patient Currently Called'}
                </h3>
              </div>
              {inConsultationPatient && (
                <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-xl">
                  Token: {inConsultationPatient.token_code}
                </span>
              )}
            </div>

            {inConsultationPatient && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Blood Sugar</span>
                  <span className="font-bold text-sm text-amber-300">{inConsultationPatient.blood_sugar || '--'} mg/dL</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Oxygen (SpO2)</span>
                  <span className="font-bold text-sm text-sky-300">{inConsultationPatient.spo2 || '--'}%</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
                  <span className="font-bold text-sm">{inConsultationPatient.bp_sys ? `${inConsultationPatient.bp_sys}/${inConsultationPatient.bp_dia}` : '--'}</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">BMI (Height/Weight)</span>
                  <span className="font-bold text-sm">{inConsultationPatient.bmi || '--'} ({inConsultationPatient.height_cm || '--'}cm, {inConsultationPatient.weight_kg || '--'}kg)</span>
                </div>
              </div>
            )}
          </div>

          {/* Digital Prescription Form */}
          <form onSubmit={handleIssuePrescription} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" /> Digital Prescription Generator
              </h3>
              <span className="text-xs text-slate-400">Auto-syncs to patient medicine reminders</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Diagnosis & Findings *</label>
              <input
                type="text"
                required
                placeholder="e.g. Type II Diabetes Mellitus with Mild Hypertension"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Dynamic Medication Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">Prescribed Medications</label>
                <button
                  type="button"
                  onClick={addMedRow}
                  className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Drug
                </button>
              </div>

              <div className="space-y-2.5">
                {medications.map((med, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Medicine name (e.g. Metformin)"
                        value={med.name}
                        onChange={(e) => updateMedRow(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Dosage (500mg)"
                        value={med.dosage}
                        onChange={(e) => updateMedRow(idx, 'dosage', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={med.frequency}
                        onChange={(e) => updateMedRow(idx, 'frequency', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="1-0-1 (Morning & Night)">1-0-1 (M & N)</option>
                        <option value="1-0-0 (Morning only)">1-0-0 (Morning)</option>
                        <option value="0-0-1 (Night only)">0-0-1 (Night)</option>
                        <option value="1-1-1 (TID)">1-1-1 (TID)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={med.food}
                        onChange={(e) => updateMedRow(idx, 'food', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="After Food">After Food</option>
                        <option value="Before Food">Before Food</option>
                        <option value="With Water">With Water</option>
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="7 Days"
                        value={med.duration}
                        onChange={(e) => updateMedRow(idx, 'duration', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice & Follow-up */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dietary & Lifestyle Advice</label>
                <input
                  type="text"
                  placeholder="e.g. Low sodium diet, 30 min brisk walk, monitor blood glucose"
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up In (Days)</label>
                <input
                  type="number"
                  value={followUpDays}
                  onChange={(e) => setFollowUpDays(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Submit & Generate */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-sky-600/30 transition-all"
              >
                <Check className="w-4 h-4" /> Issue Official Digital Prescription & Sync Reminders
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. Medicine Reminders & Patient Adherence Component
// ============================================================================
function MedicineReminderView({ reminders, onRefresh, showToast }) {
  const [filterPatient, setFilterPatient] = useState('');

  const filteredReminders = reminders.filter(r =>
    !filterPatient || r.patient_name.toLowerCase().includes(filterPatient.toLowerCase())
  );

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/reminders/medicine/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(status === 'TAKEN' ? 'Dose marked as taken! Great adherence!' : 'Reminder snoozed for 15 minutes.');
        onRefresh();
      }
    } catch (err) {
      showToast('Could not update reminder', 'error');
    }
  };

  const takenCount = filteredReminders.filter(r => r.status === 'TAKEN').length;
  const totalCount = filteredReminders.length || 1;
  const adherence = Math.round((takenCount / totalCount) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
            <Pill className="w-7 h-7" />
          </div>
          <div>
            <span className="px-3 py-1 bg-white/20 text-xs font-bold rounded-full uppercase tracking-wider">
              Smart Care Adherence Engine
            </span>
            <h1 className="text-2xl font-black mt-1">Automated Medication Reminders</h1>
            <p className="text-purple-100 text-xs mt-0.5">
              Tracks scheduled dosages, alarm reminders, and patient daily compliance score.
            </p>
          </div>
        </div>

        {/* Adherence Progress Dial */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Adherence Score</span>
          <div className="text-3xl font-black text-white mt-0.5">{adherence}%</div>
          <span className="text-[10px] text-purple-200">{takenCount} of {filteredReminders.length} doses taken</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by patient name..."
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">Auto-synced from Doctor Desk</span>
      </div>

      {/* Reminder Cards Grid */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400">
            <Pill className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-600" />
            <p className="text-sm font-bold text-slate-700">No active medicine reminders</p>
            <p className="text-xs text-slate-400 mt-1">
              Issue a prescription from the Doctor Desk to auto-populate patient medicine reminders.
            </p>
          </div>
        ) : (
          filteredReminders.map(item => {
            const isTaken = item.status === 'TAKEN';
            const isSnoozed = item.status === 'SNOOZED';

            return (
              <div
                key={item.id}
                className={`p-4 bg-white rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isTaken ? 'border-emerald-200 bg-emerald-50/20' : isSnoozed ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                    isTaken ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {isTaken ? <CheckCircle2 className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{item.medicine_name}</h4>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                        {item.dosage}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        isTaken ? 'bg-emerald-100 text-emerald-800' :
                        isSnoozed ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800 animate-pulse'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5">
                      Patient: <strong className="text-slate-800">{item.patient_name}</strong> • Scheduled: {item.frequency_time} ({item.food_timing})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isTaken ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'TAKEN')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark as Taken
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'SNOOZED')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" /> Snooze 15m
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Taken Today
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 6. Telemedicine Virtual Follow-Up Room Component
// ============================================================================
function TelemedicineRoom({ doctors, onProceedToPrescription, showToast }) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let timer;
    if (inCall) {
      timer = setInterval(() => setCallDuration(c => c + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    setInCall(true);
    showToast('Secure Telemedicine Consultation connected');
  };

  const handleEndCall = () => {
    setInCall(false);
    showToast('Virtual Consultation Completed. Redirecting to prescription generator.');
    onProceedToPrescription();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-600 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Virtual Clinic & Telemedicine</h1>
            <p className="text-blue-100 text-xs mt-0.5">
              Encrypted HD video consultation for remote patient follow-ups and triage.
            </p>
          </div>
        </div>

        {inCall && (
          <div className="px-4 py-2 bg-rose-600 text-white text-xs font-black rounded-full flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            LIVE: {formatTimer(callDuration)}
          </div>
        )}
      </div>

      {/* Main Video Stage */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative min-h-[460px] flex flex-col justify-between p-6">
        {/* Remote Patient Video Feed */}
        <div className="absolute inset-0 flex items-center justify-center">
          {inCall && !isVideoOff ? (
            <div className="relative w-full h-full">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800"
                alt="Patient Remote Stream"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Patient: Anjali Verma (Remote)</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-800 flex items-center justify-center text-slate-400">
                <Video className="w-10 h-10" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {inCall ? 'Camera is currently muted' : 'Virtual Consultation Room Ready'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {inCall ? 'Click camera toggle below to resume' : 'Click "Connect Call" to start follow-up consultation.'}
              </p>
            </div>
          )}
        </div>

        {/* Doctor Self-View PiP */}
        {inCall && (
          <div className="z-10 self-end w-36 h-28 sm:w-48 sm:h-36 bg-slate-800 rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300"
              alt="Doctor Self View"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded-md text-[10px] text-white font-medium">
              You (Dr. Rahul Sharma)
            </div>
          </div>
        )}

        {/* Bottom Call Controls */}
        <div className="z-10 w-full flex items-center justify-center gap-4 pt-4">
          {!inCall ? (
            <button
              onClick={handleStartCall}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-xl flex items-center gap-2.5 transition-all transform hover:scale-105"
            >
              <Video className="w-5 h-5" /> Connect Virtual Consultation
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl transition-all ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-3 rounded-xl transition-all ${
                  isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" /> End Call & Prescribe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Notes Sidebar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-600" /> Real-time Virtual Consultation Notes
        </h3>
        <textarea
          rows={3}
          placeholder="Type notes during the video call... These can be carried directly into the digital prescription."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// 7. Appointment Scheduler & Automated Reminder Component
// ============================================================================
function AppointmentScheduler({ doctors, appointments, reminders, onAppointmentBooked, onTriggerAlertModal, showToast }) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || 1);
  const [appointmentDate, setAppointmentDate] = useState('2026-10-31');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [consultType, setConsultType] = useState('IN_PERSON');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:30 AM', '02:00 PM', '03:00 PM', '04:30 PM'];

  const handleBook = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }

    setBooking(true);
    const selectedDoc = doctors.find(d => Number(d.id) === Number(doctorId)) || doctors[0];

    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_email: patientEmail,
          doctor_id: selectedDoc.id,
          specialty: selectedDoc.specialty,
          appointment_date: appointmentDate,
          time_slot: timeSlot,
          consultation_type: consultType,
          notes
        })
      });

      if (!res.ok) throw new Error('Booking failed');
      onAppointmentBooked();

      // Reset
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setNotes('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Automated Reminder Telemetry Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Automated Dispatch Engine
            </span>
            <h2 className="text-xl font-black mt-0.5">Automated SMS & Email Reminders Active</h2>
            <p className="text-xs text-emerald-100">
              Patients receive auto-reminders 24 hours and 1 hour before scheduled consultations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reminders.length > 0 && (
            <button
              onClick={() => onTriggerAlertModal(reminders[0])}
              className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-md hover:bg-emerald-50 transition-all flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              Simulate Live Reminder Alert
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Book Appointment Form */}
        <form onSubmit={handleBook} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" /> Schedule Consultation
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Aryan Kapoor"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
              <input
                type="tel"
                required
                placeholder="+91 98765 12345"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="aryan.kapoor@example.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Visit Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConsultType('IN_PERSON')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  consultType === 'IN_PERSON'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                In-Person Visit
              </button>
              <button
                type="button"
                onClick={() => setConsultType('TELEMEDICINE')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  consultType === 'TELEMEDICINE'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Telemedicine
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={booking}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
          >
            {booking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirm Appointment & Schedule Alert
          </button>
        </form>

        {/* Right: Upcoming Appointments & Reminder Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Confirmed Hospital Bookings</h3>
            <div className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No appointments scheduled</p>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{apt.patient_name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          apt.consultation_type === 'TELEMEDICINE' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {apt.consultation_type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        With {apt.doctor_name} ({apt.specialty}) • {apt.appointment_date} at {apt.time_slot}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. Patient Feedback & Post-Visit Portal Component
// ============================================================================
function PatientFeedbackPortal({ doctors, feedbacks, onFeedbackSubmitted, showToast }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || 1);
  const [patientName, setPatientName] = useState('');
  const [ratingDoctor, setRatingDoctor] = useState(5);
  const [ratingWaitTime, setRatingWaitTime] = useState(4);
  const [ratingFacility, setRatingFacility] = useState(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient_name: patientName,
          rating_doctor: ratingDoctor,
          rating_wait_time: ratingWaitTime,
          rating_facility: ratingFacility,
          comments
        })
      });

      if (!res.ok) throw new Error('Feedback submission failed');
      onFeedbackSubmitted();

      setPatientName('');
      setComments('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Star className="w-7 h-7 fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Patient Care & Experience Feedback</h1>
            <p className="text-amber-100 text-xs mt-0.5">
              Rate your consulting physician, queue wait time, and nurse care to maintain high clinical standards.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Submit Post-Visit Review</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Aisha Khan"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Consulted Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          {/* Star Sliders */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Doctor Treatment Quality</span>
                <span className="text-amber-600 font-bold">{ratingDoctor} / 5 Stars</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={ratingDoctor}
                onChange={(e) => setRatingDoctor(e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Queue Wait Time Experience</span>
                <span className="text-amber-600 font-bold">{ratingWaitTime} / 5 Stars</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={ratingWaitTime}
                onChange={(e) => setRatingWaitTime(e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Nurse Station & Facility Cleanliness</span>
                <span className="text-amber-600 font-bold">{ratingFacility} / 5 Stars</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={ratingFacility}
                onChange={(e) => setRatingFacility(e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Comments & Suggestions</label>
            <textarea
              rows={3}
              placeholder="Tell us about your experience..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
            Submit Patient Review
          </button>
        </form>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Recent Verified Patient Reviews</h3>
            <div className="space-y-3">
              {feedbacks.map(fb => (
                <div key={fb.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{fb.patient_name}</h4>
                      <p className="text-[10px] text-slate-500">Consulted with {fb.doctor_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-white px-2 py-1 rounded-lg border border-slate-200">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{fb.overall_rating} / 5</span>
                    </div>
                  </div>
                  {fb.comments && (
                    <p className="text-xs text-slate-600 italic">"{fb.comments}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TV Mode Display Component (For Waiting Room Monitors)
// ============================================================================
function TvWaitingRoomBoard({ queue, doctors, onExit }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const inConsult = queue.filter(q => q.status === 'IN_CONSULTATION');
  const waiting = queue.filter(q => q.status === 'WAITING');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center font-bold">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SMART CARE CONNECT - PATIENT QUEUE</h1>
            <p className="text-xs text-slate-400">Main Waiting Room Display • Priority Vitals Active</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-2xl font-mono font-bold text-sky-400">{time}</span>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl"
          >
            Exit TV Mode
          </button>
        </div>
      </div>

      {/* Main Grid: Now Serving vs Next in Line */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 flex-1">
        {/* Left: Now Serving */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-emerald-500/30 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span> NOW CALLING / IN CONSULTATION
            </h2>
            <span className="text-xs text-slate-400">{inConsult.length} In Room</span>
          </div>

          <div className="space-y-4 flex-1">
            {inConsult.length === 0 ? (
              <p className="text-center text-slate-500 py-12">No patient currently called into room</p>
            ) : (
              inConsult.map(c => (
                <div key={c.id} className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-white bg-emerald-600 px-4 py-2 rounded-xl">
                      {c.token_code}
                    </div>
                    <div>
                      <h3 className="text-lg font-black">{c.patient_name}</h3>
                      <p className="text-xs text-emerald-300">Proceed to: {c.room_number || 'OPD Room 101'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{c.doctor_name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Next Up */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-sky-400">NEXT IN QUEUE</h2>
            <span className="text-xs text-slate-400">{waiting.length} Waiting</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {waiting.slice(0, 6).map((w, idx) => (
              <div key={w.id} className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                w.priority_level === 1 ? 'bg-rose-950/40 border-rose-500/50' : 'bg-slate-800/40 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-sky-300">{w.token_code}</span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{w.patient_name}</h4>
                    <p className="text-[10px] text-slate-400">{w.specialty}</p>
                  </div>
                </div>
                {w.priority_level === 1 && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full animate-pulse">
                    PRIORITY #1
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 border-t border-slate-800 pt-4">
        Please watch the monitor for your token call. For emergency vitals or severe chest discomfort, inform the triage nurse immediately.
      </div>
    </div>
  );
}

// ============================================================================
// Modals: Printable Prescription & Token Slip
// ============================================================================
function PrescriptionPrintModal({ prescription, onClose }) {
  const medications = typeof prescription.medications === 'string'
    ? JSON.parse(prescription.medications || '[]')
    : (prescription.medications || []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>

        {/* Printable Document Body */}
        <div id="printable-prescription" className="space-y-6 border border-slate-200 p-6 rounded-2xl bg-white">
          {/* Clinic Header */}
          <div className="flex items-center justify-between border-b-2 border-sky-600 pb-4">
            <div>
              <h2 className="text-2xl font-black text-sky-700">SMART CARE CONNECT CLINIC</h2>
              <p className="text-xs text-slate-500">Comprehensive Outpatient Department & Diagnostic Center</p>
              <p className="text-[10px] text-slate-400">100 Health Sciences Way • Tel: +1 800-SMARTCARE</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800">Rx No: #RX-{prescription.id}</span>
              <p className="text-xs text-slate-500">Date: {prescription.created_at?.substring(0, 10) || new Date().toISOString().substring(0, 10)}</p>
            </div>
          </div>

          {/* Doctor & Patient Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p><strong className="text-slate-700">Doctor:</strong> {prescription.doctor_name}</p>
              <p><strong className="text-slate-700">Specialty:</strong> {prescription.specialty || 'General Physician'}</p>
            </div>
            <div>
              <p><strong className="text-slate-700">Patient:</strong> {prescription.patient_name}</p>
              <p><strong className="text-slate-700">Age/Gender:</strong> {prescription.patient_age} yrs, {prescription.patient_gender}</p>
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Chief Diagnosis:</h4>
            <p className="text-sm font-semibold text-slate-900 bg-sky-50/50 p-2.5 rounded-lg border border-sky-100">
              {prescription.diagnosis}
            </p>
          </div>

          {/* Medications Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Rx Medications:</h4>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2 px-2 font-bold text-slate-700">Medicine</th>
                  <th className="py-2 px-2 font-bold text-slate-700">Dosage</th>
                  <th className="py-2 px-2 font-bold text-slate-700">Frequency</th>
                  <th className="py-2 px-2 font-bold text-slate-700">Timing</th>
                  <th className="py-2 px-2 font-bold text-slate-700">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((m, i) => (
                  <tr key={i}>
                    <td className="py-2 px-2 font-bold text-slate-900">{m.name}</td>
                    <td className="py-2 px-2 text-slate-600">{m.dosage}</td>
                    <td className="py-2 px-2 text-slate-600">{m.frequency}</td>
                    <td className="py-2 px-2 text-slate-600">{m.food}</td>
                    <td className="py-2 px-2 text-slate-600">{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advice & Signature */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
            <div className="text-xs text-slate-600 max-w-sm">
              <p><strong>Clinical Advice:</strong> {prescription.advice || 'Follow medication schedule strictly.'}</p>
              <p className="mt-1 text-slate-500">Review consultation in: {prescription.follow_up_days} days.</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-1"></div>
              <p className="text-[10px] font-bold text-slate-700">Digitally Signed By</p>
              <p className="text-[10px] text-slate-500">{prescription.doctor_name}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Official Prescription
          </button>
        </div>
      </div>
    </div>
  );
}

function TokenSlipModal({ token, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-sky-100 text-sky-700 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl">
          {token.token_code}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hospital Queue Token</span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{token.patient_name}</h3>
          <p className="text-xs text-slate-500">{token.specialty} • {token.room_number || 'Room 101'}</p>
        </div>

        {token.priority_level === 1 && (
          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-700">
            EMERGENCY PRIORITY ESCALATION ACTIVE
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
          <p className="text-slate-600">Please take a seat in the main waiting area.</p>
          <p className="text-slate-600">Watch the overhead TV monitor for your token call.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-sky-700"
        >
          Done / Close Ticket
        </button>
      </div>
    </div>
  );
}

function ReminderAlertModal({ reminder, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-emerald-500">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl animate-bounce">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Automated Push Notification
            </span>
            <h3 className="font-extrabold text-base text-slate-900 mt-1">Upcoming Consultation Alert</h3>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
          <p><strong>SMS Dispatch:</strong> {reminder.sms_text}</p>
          <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
            Triggered automatically via background notification dispatcher.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-md"
        >
          Acknowledge Simulated Reminder
        </button>
      </div>
    </div>
  );
}

// Tab Button Helper Component
function TabButton({ active, onClick, icon, label, badge, badgeColor, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
          : highlight
          ? 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`px-2 py-0.5 text-[10px] rounded-full ${badgeColor || 'bg-slate-200 text-slate-700'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// 0. Patient Login & Gateway Component
// ============================================================================
function PatientLoginPage({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/patient-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: fullName.trim() })
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (patientEmail, patientName) => {
    setEmail(patientEmail);
    setFullName(patientName);
    onLogin({
      email: patientEmail,
      name: patientName,
      phone: '+91 98765 43210',
      role: 'PATIENT'
    });
  };

  const handleStaffMode = () => {
    onLogin({
      name: 'Duty Doctor / Clinical Staff',
      email: 'staff@smartcare.org',
      role: 'STAFF'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-teal-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">Smart Care Connect</span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">Patient Gateway</span>
          </div>
        </div>

        <button
          onClick={handleStaffMode}
          className="px-3.5 py-1.5 text-xs font-semibold text-teal-200 bg-teal-900/40 hover:bg-teal-800/60 rounded-xl border border-teal-500/30 transition-all flex items-center gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Staff / Doctor Desk</span>
        </button>
      </div>

      {/* Main Login Card Container */}
      <div className="max-w-md w-full mx-auto my-auto py-8 z-10">
        <div className="bg-white/95 backdrop-blur-xl text-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Sign In</h1>
            <p className="text-xs text-slate-500">
              Enter your email to access token queue, nurse vitals, prescription records, and medicine alarms.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. anjali@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name (Optional)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Anjali Gupta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Enter Patient Dashboard
            </button>
          </form>

          {/* Quick Demo Login Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
              Or 1-Click Quick Demo Sign-In
            </span>
          </div>

          {/* Quick Patient Cards */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickLogin('anjali@example.com', 'Anjali Gupta')}
              className="p-2.5 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                  AG
                </span>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-700">Anjali Gupta</p>
                  <p className="text-[10px] text-slate-400 truncate">Queue Token G-102</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ritik@example.com', 'Ritik Mehra')}
              className="p-2.5 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 border border-slate-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">
                  RM
                </span>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-700">Ritik Mehra</p>
                  <p className="text-[10px] text-rose-500 font-semibold truncate">Priority 1 Case</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('aryan@example.com', 'Aryan Saxena')}
              className="p-2.5 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                  AS
                </span>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-700">Aryan Saxena</p>
                  <p className="text-[10px] text-slate-400 truncate">OPD Token O-103</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('priyamvada@example.com', 'Priyamvada Singh')}
              className="p-2.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                  PS
                </span>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-purple-700">Priyamvada Singh</p>
                  <p className="text-[10px] text-slate-400 truncate">Derma Token D-104</p>
                </div>
              </div>
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleStaffMode}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
            >
              Bypass to Hospital Admin & Doctor Desk
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Features Strip */}
      <div className="max-w-4xl mx-auto w-full flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 py-3 z-10 border-t border-white/10">
        <span className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-teal-400" /> Live Priority Queue
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-rose-400" /> Nurse Vitals Check-in
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-purple-400" /> Automated Medicine Alarms
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-sky-400" /> Instant Email Verification
        </span>
      </div>
    </div>
  );
}
