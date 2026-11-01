# Smart Care Connect 🏥

A smart hospital appointment scheduling and intelligent priority queue management system with symptom-based triage, automated abnormal vitals queue escalation, nurse early arrival check-in, doctor prescription generation, automated medicine reminders, telemedicine virtual room, and post-visit patient feedback.

---

## ⚡ Architectural Blueprint (Ultra-Minimal Structure)

The entire full-stack application is consolidated into an ultra-minimal structure with zero complex folder hierarchies:

```
smart care connect/
├── package.json         # Unified dependencies and scripts
├── vite.config.js       # Vite dev configuration with Express API proxy
├── index.html           # HTML shell embedding Tailwind CSS & typography
├── server.js            # Consolidated Express server, SQLite DB setup, seeds, and REST API
├── src/
│   ├── main.jsx         # Minimal React 18 DOM mount
│   └── App.jsx          # Consolidated full-stack React UI (Queue, Nurse, Triage, Doctor, Meds, Telemed)
├── smart_care.sqlite    # Local SQLite database (auto-created & seeded upon first run)
└── README.md            # Complete user and setup documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (Node.js v24 is recommended and pre-tested with zero native compilation dependencies).
- **NPM**: v9+.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application

You have two simple options to run the application:

#### Option A: Unified Full-Stack Dev Mode (Recommended for development)
Starts both the Express API server (port `5000`) and the Vite React frontend (port `3000`) with hot module reloading:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Option B: Production Single-Port Server (All-in-one port 5000)
Build the frontend and run the Express backend on a single port:
```bash
npm run build
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 🌟 Core Features Walkthrough

### 0. 🔐 Patient Email Login & Gateway (Entry Screen)
- Seamless entry gateway before accessing the clinical system.
- **Custom Email Login**: Patients enter their email address (and optional name) to sign in or register instantly.
- **Auto-Profile Detection**: Automatically detects patient records, appointments, and active queue tokens associated with the email.
- **1-Click Demo Patient Quick Logins**:
  - 👩 **Anjali Gupta** (`anjali@example.com` – Active in Queue Token `G-102`)
  - 👨 **Ritik Mehra** (`ritik@example.com` – Priority #1 Critical Vitals Case)
  - 👨 **Aryan Saxena** (`aryan@example.com` – Orthopedics Routine OPD)
  - 👩 **Priyamvada Singh** (`priyamvada@example.com` – Dermatology OPD)
- **Staff / Doctor Mode**: One-click bypass button for clinical staff and duty doctors.
- **Session Persistence**: Stored securely in `localStorage` with a persistent top-header profile pill and **Sign Out** button.

### 1. 🩺 Nurse Vitals & Early Arrival Station
- Specifically designed for when patients arrive early for an appointment or walk-in.
- **Physical & Metabolic Inputs**:
  - **Height (cm)** and **Weight (kg)**: Automatically calculates **BMI (Body Mass Index)** with status category.
  - **Blood Sugar Level (mg/dL)**: Tracks fasting/random glucose. Flags severe hyperglycemia (> 250 mg/dL) or hypoglycemia (< 70 mg/dL).
  - **Oxygen Saturation (SpO2 %)**: Critical hypoxia warning (< 92%) triggers priority escalation.
  - **Blood Pressure (Systolic / Diastolic mmHg)**, **Heart Rate (BPM)**, and **Body Temp (°F)**.
- **Permanent Record**: Automatically stored in the SQLite database and made available on the doctor's desk.

### 2. ⚡ Priority Queue System (Vitals Escalation)
- Live queue board displaying token codes (e.g. `C-101`, `G-102`), patient details, specialty, and doctor.
- **Abnormal Vitals Escalation Algorithm**:
  - Any patient with critical vitals ($\text{SpO}_2 < 92\%$, BP $\ge 180/120$, $\text{Heart Rate} > 125$ or $< 45$, extreme blood sugar $< 70$ or $\ge 300$, Fever $\ge 103^\circ\text{F}$) is automatically assigned **Priority 1 (Emergency)** and **jumps to the top of the queue** ahead of routine checkups.
- **Queue Actions**: "Call Next", "In-Consultation", "Complete Visit", "Skip", and "Print Token Slip".
- **Waiting Room TV Mode**: Click "TV Waiting Mode" on the top right for a dark-mode, monitor-friendly display showing *Now Serving* and *Next in Queue*.

### 3. 🧠 Symptom-Based Triage Matcher
- Interactive symptom selector (Chest pain, Shortness of breath, Palpitations, High fever, Migraine, Joint pain, Rash, Acid reflux, Pediatric fever, etc.).
- Evaluates clinical rules and matches patients to the right medical department (Cardiology, Pulmonology, Neurology, Orthopedics, Dermatology, Gastroenterology, Pediatrics, General Medicine).
- Suggests available on-duty specialists with experience, room number, and consultation fee.

### 4. 👨‍⚕️ Doctor Consultation Desk & Digital Prescription Generator
- Select from on-duty doctors (e.g., Dr. Robert Chen, Dr. Sarah Al-Mansoor).
- View current in-office patient with full nurse vitals breakdown.
- **Digital Prescription Builder**:
  - Chief diagnosis and clinical advice.
  - Add/remove medication rows: Medicine Name, Dosage, Frequency (Morning, Afternoon, Night), Food Timing, Duration.
  - Generates an official, printable medical prescription sheet with doctor's digital signature and clinic stamp.
  - **Auto-Sync**: Automatically populates the patient's medicine reminders!

### 5. 💊 Medicine Reminders & Patient Adherence Tracker
- Schedules daily dosages generated directly from the digital prescription.
- Interactive actions: "Mark as Taken" and "Snooze 15m".
- Displays real-time **Adherence Score** percentage ring.
- Dispatches simulated reminder toast alerts and console notification telemetry.

### 6. 📹 Telemedicine Virtual Consultation Room
- Interactive remote follow-up room with simulated video streams for doctor and patient.
- Mic mute/unmute, video feed toggle, call timer, and real-time clinical notes sidebar.
- "End Call & Prescribe" button directly transfers notes into the digital prescription workflow.

### 7. 📅 Appointment Scheduling & Automated Alerts
- Book in-person or telemedicine follow-up appointments by doctor, date, and time slot.
- Automated reminder engine: Simulates 24-hour and 1-hour SMS/Email alerts for upcoming visits with interactive simulation modal.

### 8. ⭐ Patient Post-Visit Feedback Portal
- Multi-dimensional star ratings: Doctor Care, Queue Wait Time, and Nurse Station / Facility Cleanliness.
- Stores reviews in SQLite and updates the doctor's verified rating scorecard in real-time.

---

## 🛠️ Tech Stack Details

- **Frontend**: React 18, Tailwind CSS (via optimized CDN with hospital-grade theme palette), Lucide-React icons.
- **Backend**: Node.js, Express.js (REST API consolidated in `server.js`).
- **Database**: SQLite via Node.js native `DatabaseSync` (`node:sqlite`). Zero third-party C++ compilation tools required on Windows.
- **Build Tool**: Vite 6.
