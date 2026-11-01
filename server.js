import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Database Initialization & Migrations (SQLite via node:sqlite)
// -------------------------------------------------------------
const dbPath = path.join(__dirname, 'smart_care.sqlite');
const db = new DatabaseSync(dbPath);

// Create required tables
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    qualification TEXT,
    experience_years INTEGER,
    rating REAL DEFAULT 4.8,
    avatar TEXT,
    room_number TEXT,
    available_days TEXT,
    fee INTEGER DEFAULT 500,
    is_on_duty INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS queue_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_code TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    patient_age INTEGER,
    patient_gender TEXT,
    doctor_id INTEGER,
    specialty TEXT NOT NULL,
    symptoms TEXT,
    height_cm REAL,
    weight_kg REAL,
    bmi REAL,
    blood_sugar REAL,
    bp_sys INTEGER,
    bp_dia INTEGER,
    heart_rate INTEGER,
    spo2 INTEGER,
    temperature REAL,
    priority_level INTEGER DEFAULT 3, -- 1: Critical/Emergency, 2: Urgent, 3: Normal
    priority_reason TEXT,
    status TEXT DEFAULT 'WAITING', -- WAITING, IN_CONSULTATION, COMPLETED, SKIPPED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT,
    doctor_id INTEGER NOT NULL,
    specialty TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    consultation_type TEXT DEFAULT 'IN_PERSON', -- IN_PERSON, TELEMEDICINE
    status TEXT DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, CANCELLED
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER,
    doctor_id INTEGER NOT NULL,
    doctor_name TEXT,
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,
    diagnosis TEXT NOT NULL,
    medications TEXT NOT NULL, -- JSON string array of {name, dosage, frequency, food, duration}
    advice TEXT,
    follow_up_days INTEGER DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medicine_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency_time TEXT NOT NULL, -- Morning (08:00 AM), Afternoon (01:00 PM), Night (09:00 PM)
    food_timing TEXT DEFAULT 'After Food',
    status TEXT DEFAULT 'PENDING', -- PENDING, TAKEN, SNOOZED
    taken_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    doctor_name TEXT,
    patient_name TEXT NOT NULL,
    rating_doctor INTEGER NOT NULL,
    rating_wait_time INTEGER NOT NULL,
    rating_facility INTEGER NOT NULL,
    overall_rating REAL,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// -------------------------------------------------------------
// Realistic Clinical Seed Data (Auto-seed if empty)
// -------------------------------------------------------------
const doctorsCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get();
if (doctorsCount.count === 0) {
  console.log('[DATABASE] Seeding clinical staff and realistic hospital data...');
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (name, specialty, qualification, experience_years, rating, avatar, room_number, available_days, fee, is_on_duty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialDoctors = [
    ['Dr. Rahul Sharma', 'Cardiology', 'MD, DM (Cardiology), AIIMS New Delhi', 16, 4.9, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150', 'Room 101 (Heart Wing)', 'Mon - Fri', 800, 1],
    ['Dr. Anjali Verma', 'Pulmonology', 'MD, FCCP (Chest Specialist)', 12, 4.8, 'https://images.unsplash.com/photo-1594824813515-779836798083?w=150', 'Room 104 (Respiratory Care)', 'Mon - Sat', 700, 1],
    ['Dr. Priyamvada Joshi', 'Neurology', 'MD, DM (Neurology), NIMHANS', 19, 4.9, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150', 'Room 205 (Neuro Center)', 'Tue, Thu, Sat', 900, 1],
    ['Dr. Aryan Kapoor', 'Orthopedics', 'MS (Ortho), Fellowship Joint Replacement', 11, 4.7, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150', 'Room 108 (Ortho Clinic)', 'Mon - Fri', 650, 1],
    ['Dr. Ananya Mukherjee', 'Dermatology', 'MD (Dermatology, Venereology)', 9, 4.8, 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150', 'Room 210 (Derma Suite)', 'Mon, Wed, Fri', 600, 1],
    ['Dr. Ritik Mehta', 'Gastroenterology', 'MD, DNB (Gastroenterology)', 14, 4.8, 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150', 'Room 112 (Digestive Health)', 'Mon - Sat', 750, 1],
    ['Dr. Aisha Khan', 'General Medicine', 'MBBS, MD (Internal Medicine)', 15, 4.9, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150', 'Room 102 (OPD General)', 'All Days', 500, 1],
    ['Dr. Rohan Deshmukh', 'Pediatrics', 'MD (Pediatrics), DCH (Mumbai)', 10, 4.9, 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=150', 'Room 115 (Child Care Wing)', 'Mon - Sat', 550, 1]
  ];

  for (const doc of initialDoctors) {
    insertDoctor.run(...doc);
  }

  // Seed sample queue tokens (including one abnormal vital case demonstrating escalation)
  const insertToken = db.prepare(`
    INSERT INTO queue_tokens (
      token_code, patient_name, patient_phone, patient_age, patient_gender,
      doctor_id, specialty, symptoms, height_cm, weight_kg, bmi, blood_sugar,
      bp_sys, bp_dia, heart_rate, spo2, temperature, priority_level, priority_reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Token 1: Emergency Hypoxia + High BP patient (Priority 1: Escalated to top)
  insertToken.run(
    'C-101', 'Ritik Mehra', '+91 98765 43210', 62, 'Male',
    1, 'Cardiology', 'Severe crushing chest pain, diaphoresis, shortness of breath',
    175, 88, 28.7, 185,
    188, 114, 128, 88, 101.4, 1,
    'CRITICAL: Severe Hypoxia (SpO2 88%), Hypertensive Crisis (BP 188/114), Tachycardia (128 bpm)', 'WAITING'
  );

  // Token 2: Urgent High Sugar patient (Priority 2)
  insertToken.run(
    'G-102', 'Anjali Gupta', '+91 98450 11223', 48, 'Female',
    7, 'General Medicine', 'Extreme thirst, severe fatigue, blurred vision',
    162, 70, 26.7, 310,
    145, 92, 94, 96, 99.1, 2,
    'URGENT: Severe Hyperglycemia (Blood Sugar 310 mg/dL)', 'WAITING'
  );

  // Token 3: Normal routine checkup patient (Priority 3)
  insertToken.run(
    'O-103', 'Aryan Saxena', '+91 94480 33445', 35, 'Male',
    4, 'Orthopedics', 'Mild knee ache after weekend jogging',
    180, 76, 23.5, 98,
    120, 78, 72, 99, 98.4, 3,
    'Normal vitals - Routine OPD checkup', 'WAITING'
  );

  // Token 4: Normal dermatology patient (Priority 3)
  insertToken.run(
    'D-104', 'Priyamvada Singh', '+91 97410 55667', 27, 'Female',
    5, 'Dermatology', 'Dry skin patch on forearm, mild itchiness',
    165, 54, 19.8, 92,
    115, 75, 76, 99, 98.6, 3,
    'Normal vitals - Standard skin assessment', 'WAITING'
  );

  // Seed sample appointment
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (patient_name, patient_phone, patient_email, doctor_id, specialty, appointment_date, time_slot, consultation_type, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAppointment.run('Aisha Khan', '+91 98200 66778', 'aisha.khan@example.com', 2, 'Pulmonology', '2026-10-31', '10:00 AM', 'IN_PERSON', 'SCHEDULED', 'Follow-up for seasonal asthma');
  insertAppointment.run('Ritik Verma', '+91 98110 77889', 'ritik.verma@example.com', 3, 'Neurology', '2026-10-31', '11:30 AM', 'TELEMEDICINE', 'SCHEDULED', 'Virtual follow-up for chronic migraine');
  insertAppointment.run('Ananya Roy', '+91 98330 88990', 'ananya.roy@example.com', 7, 'General Medicine', '2026-10-31', '02:00 PM', 'IN_PERSON', 'SCHEDULED', 'Early arrival check-in requested for routine blood panel');

  // Seed sample prescription and medicine reminders
  const insertPrescription = db.prepare(`
    INSERT INTO prescriptions (token_id, doctor_id, doctor_name, patient_name, patient_age, patient_gender, diagnosis, medications, advice, follow_up_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialMeds = JSON.stringify([
    { name: 'Metformin HCl', dosage: '500 mg', frequency: '1-0-1 (Morning & Night)', food: 'After Food', duration: '30 Days' },
    { name: 'Atorvastatin', dosage: '20 mg', frequency: '0-0-1 (Night only)', food: 'After Food', duration: '30 Days' },
    { name: 'Telmisartan', dosage: '40 mg', frequency: '1-0-0 (Morning)', food: 'Before Food', duration: '15 Days' }
  ]);

  insertPrescription.run(1, 1, 'Dr. Rahul Sharma', 'Ritik Mehra', 62, 'Male', 'Hypertensive Heart Disease & Type II Diabetes Management', initialMeds, 'Maintain low sodium diet, avoid strenuous exertion, monitor BP and sugar daily.', 7);

  // Seed sample medicine reminders for the patient
  const insertReminder = db.prepare(`
    INSERT INTO medicine_reminders (patient_name, patient_phone, medicine_name, dosage, frequency_time, food_timing, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReminder.run('Ritik Mehra', '+91 98765 43210', 'Telmisartan', '40 mg', 'Morning (08:00 AM)', 'Before Food', 'TAKEN');
  insertReminder.run('Ritik Mehra', '+91 98765 43210', 'Metformin HCl', '500 mg', 'Morning (08:30 AM)', 'TAKEN');
  insertReminder.run('Ritik Mehra', '+91 98765 43210', 'Metformin HCl', '500 mg', 'Night (08:30 PM)', 'After Food', 'PENDING');
  insertReminder.run('Ritik Mehra', '+91 98765 43210', 'Atorvastatin', '20 mg', 'Night (09:00 PM)', 'After Food', 'PENDING');

  // Seed initial feedbacks
  const insertFeedback = db.prepare(`
    INSERT INTO feedbacks (doctor_id, doctor_name, patient_name, rating_doctor, rating_wait_time, rating_facility, overall_rating, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFeedback.run(1, 'Dr. Rahul Sharma', 'Anjali Nair', 5, 5, 5, 5.0, 'Incredible response time! My father was escalated immediately due to low oxygen and Dr. Rahul saved his life.');
  insertFeedback.run(7, 'Dr. Aisha Khan', 'Priyamvada Joshi', 5, 4, 5, 4.7, 'Smooth queue system and the nurse took all vitals including sugar before seeing the doctor.');
  console.log('[DATABASE] Seeding completed successfully.');
}

// -------------------------------------------------------------
// Helper: Evaluate Vitals & Priority Escalation
// -------------------------------------------------------------
function evaluateTriagePriority({ spo2, bp_sys, bp_dia, heart_rate, temperature, blood_sugar }) {
  const reasons = [];
  let priority = 3; // 3: Normal, 2: Urgent, 1: Emergency/Critical

  const s = Number(spo2) || 98;
  const sys = Number(bp_sys) || 120;
  const dia = Number(bp_dia) || 80;
  const hr = Number(heart_rate) || 75;
  const temp = Number(temperature) || 98.6;
  const sugar = Number(blood_sugar) || 100;

  // Level 1 - Critical / Emergency Conditions
  if (s < 92) {
    priority = 1;
    reasons.push(`Critical Hypoxia (SpO2 ${s}% < 92%)`);
  }
  if (sys >= 180 || dia >= 120) {
    priority = 1;
    reasons.push(`Hypertensive Crisis (BP ${sys}/${dia} mmHg)`);
  }
  if (hr > 125 || hr < 45) {
    priority = 1;
    reasons.push(`Critical Heart Rate (${hr} bpm)`);
  }
  if (temp >= 103) {
    priority = 1;
    reasons.push(`Hyperpyrexia Fever (${temp}°F)`);
  }
  if (sugar < 70) {
    priority = 1;
    reasons.push(`Severe Hypoglycemia (Sugar ${sugar} mg/dL)`);
  } else if (sugar >= 300) {
    priority = 1;
    reasons.push(`Critical Hyperglycemia (Sugar ${sugar} mg/dL)`);
  }

  // Level 2 - Urgent Conditions (if not already Level 1)
  if (priority > 1) {
    if (s >= 92 && s <= 94) {
      priority = 2;
      reasons.push(`Borderline Low Oxygen (SpO2 ${s}%)`);
    }
    if ((sys >= 140 && sys < 180) || (dia >= 90 && dia < 120)) {
      priority = 2;
      reasons.push(`Stage 2 Hypertension (BP ${sys}/${dia} mmHg)`);
    }
    if ((hr >= 105 && hr <= 125) || (hr >= 45 && hr <= 50)) {
      priority = 2;
      reasons.push(`Abnormal Heart Rate (${hr} bpm)`);
    }
    if (temp >= 100.4 && temp < 103) {
      priority = 2;
      reasons.push(`High Fever (${temp}°F)`);
    }
    if (sugar >= 200 && sugar < 300) {
      priority = 2;
      reasons.push(`High Blood Sugar (${sugar} mg/dL)`);
    }
  }

  if (reasons.length === 0) {
    reasons.push('Vitals within standard acceptable range');
  }

  return {
    priority_level: priority,
    priority_reason: reasons.join(' • ')
  };
}

// Helper: Symptom specialty match rules
const specialtyRules = [
  {
    specialty: 'Cardiology',
    keywords: ['chest pain', 'chest tightness', 'palpitations', 'shortness of breath', 'high blood pressure', 'irregular heartbeat', 'dizziness'],
    rationale: 'Symptoms indicate potential cardiac or cardiovascular distress.'
  },
  {
    specialty: 'Pulmonology',
    keywords: ['asthma', 'persistent cough', 'wheezing', 'coughing blood', 'shallow breathing', 'breathlessness', 'bronchitis'],
    rationale: 'Symptoms suggest respiratory tract or pulmonary involvement.'
  },
  {
    specialty: 'Neurology',
    keywords: ['headache', 'severe migraine', 'seizure', 'numbness', 'tingling', 'facial drooping', 'slurred speech', 'vertigo', 'loss of consciousness'],
    rationale: 'Symptoms indicate possible neurological or central nervous system evaluation required.'
  },
  {
    specialty: 'Orthopedics',
    keywords: ['joint pain', 'knee pain', 'fracture', 'bone pain', 'back pain', 'stiffness', 'shoulder dislocation', 'sprain', 'swollen ankle'],
    rationale: 'Symptoms point to musculoskeletal, joint, or bone pathology.'
  },
  {
    specialty: 'Dermatology',
    keywords: ['skin rash', 'itching', 'hives', 'acne', 'eczema', 'skin lesion', 'blister', 'psoriasis', 'allergic rash'],
    rationale: 'Symptoms match dermatological and cutaneous conditions.'
  },
  {
    specialty: 'Gastroenterology',
    keywords: ['stomach pain', 'acid reflux', 'heartburn', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'jaundice', 'abdominal cramps'],
    rationale: 'Symptoms suggest gastrointestinal or digestive tract dysfunction.'
  },
  {
    specialty: 'Pediatrics',
    keywords: ['infant fever', 'child ear pain', 'child vomiting', 'baby cough', 'vaccination check', 'growth check'],
    rationale: 'Patient requires specialized pediatric care.'
  },
  {
    specialty: 'General Medicine',
    keywords: ['fever', 'fatigue', 'weakness', 'body ache', 'chills', 'cold', 'sore throat', 'loss of appetite', 'routine checkup'],
    rationale: 'Symptoms best suited for primary care / internal medicine assessment.'
  }
];

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 0. Patient Email Authentication
app.post('/api/auth/patient-login', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Look for matching patient record in appointments or queue
    const apt = db.prepare('SELECT patient_name, patient_phone, patient_email FROM appointments WHERE LOWER(patient_email) = ? LIMIT 1').get(cleanEmail);
    const token = db.prepare('SELECT patient_name, patient_phone FROM queue_tokens WHERE LOWER(patient_name) LIKE ? LIMIT 1').get(`%${cleanEmail.split('@')[0]}%`);

    const detectedName = name || apt?.patient_name || token?.patient_name || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const patientProfile = {
      email: cleanEmail,
      name: detectedName,
      phone: apt?.patient_phone || token?.patient_phone || '+91 98765 43210',
      role: 'PATIENT',
      login_time: new Date().toISOString()
    };

    console.log(`[AUTH] Patient logged in: ${patientProfile.name} (${cleanEmail})`);
    res.json(patientProfile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Doctors List & Details
app.get('/api/doctors', (req, res) => {
  try {
    const doctors = db.prepare('SELECT * FROM doctors ORDER BY specialty ASC, rating DESC').all();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Intelligent Symptom Triage Matcher
app.post('/api/triage', (req, res) => {
  try {
    const { symptoms = [], notes = '', age, is_child } = req.body;
    const combinedText = `${symptoms.join(' ')} ${notes}`.toLowerCase();

    let matchedSpecialty = 'General Medicine';
    let highestScore = 0;
    let rationale = 'Routine internal medicine assessment recommended.';

    if (is_child || (age && Number(age) < 14)) {
      matchedSpecialty = 'Pediatrics';
      rationale = 'Patient is under 14 years old; pediatric evaluation recommended.';
    } else {
      for (const rule of specialtyRules) {
        let score = 0;
        for (const kw of rule.keywords) {
          if (combinedText.includes(kw.toLowerCase())) {
            score += 2;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          matchedSpecialty = rule.specialty;
          rationale = rule.rationale;
        }
      }
    }

    // Fetch doctors for this matched specialty
    const matchingDoctors = db.prepare('SELECT * FROM doctors WHERE specialty = ?').all(matchedSpecialty);

    res.json({
      specialty: matchedSpecialty,
      rationale,
      match_confidence: highestScore > 0 ? 'High' : 'Standard',
      recommended_doctors: matchingDoctors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Priority Queue: Get Live Tokens (Sorted by Priority 1 -> 2 -> 3, then ID)
app.get('/api/queue', (req, res) => {
  try {
    const tokens = db.prepare(`
      SELECT q.*, d.name as doctor_name, d.room_number, d.avatar as doctor_avatar
      FROM queue_tokens q
      LEFT JOIN doctors d ON q.doctor_id = d.id
      ORDER BY 
        CASE q.status 
          WHEN 'IN_CONSULTATION' THEN 1 
          WHEN 'WAITING' THEN 2 
          WHEN 'SKIPPED' THEN 3 
          ELSE 4 
        END ASC,
        q.priority_level ASC,
        q.id ASC
    `).all();
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Priority Queue: Register / Nurse Check-In Intake
app.post('/api/queue', (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_age,
      patient_gender,
      doctor_id,
      specialty,
      symptoms,
      height_cm,
      weight_kg,
      blood_sugar,
      bp_sys,
      bp_dia,
      heart_rate,
      spo2,
      temperature
    } = req.body;

    // Auto-calculate BMI if height and weight are provided
    let bmi = null;
    if (height_cm && weight_kg && Number(height_cm) > 0) {
      const hM = Number(height_cm) / 100;
      bmi = Math.round((Number(weight_kg) / (hM * hM)) * 10) / 10;
    }

    // Evaluate Vitals for Priority Escalation
    const { priority_level, priority_reason } = evaluateTriagePriority({
      spo2,
      bp_sys,
      bp_dia,
      heart_rate,
      temperature,
      blood_sugar
    });

    // Generate unique Token Code: Prefix by specialty initial + ID
    const countRow = db.prepare('SELECT COUNT(*) as count FROM queue_tokens').get();
    const tokenIndex = (countRow.count + 101);
    const prefix = (specialty || 'GEN').substring(0, 1).toUpperCase();
    const token_code = `${prefix}-${tokenIndex}`;

    const stmt = db.prepare(`
      INSERT INTO queue_tokens (
        token_code, patient_name, patient_phone, patient_age, patient_gender,
        doctor_id, specialty, symptoms, height_cm, weight_kg, bmi, blood_sugar,
        bp_sys, bp_dia, heart_rate, spo2, temperature, priority_level, priority_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING')
    `);

    const result = stmt.run(
      token_code,
      patient_name || 'Anonymous Patient',
      patient_phone || '',
      patient_age || null,
      patient_gender || 'Other',
      doctor_id || null,
      specialty || 'General Medicine',
      symptoms || '',
      height_cm || null,
      weight_kg || null,
      bmi,
      blood_sugar || null,
      bp_sys || null,
      bp_dia || null,
      heart_rate || null,
      spo2 || null,
      temperature || null,
      priority_level,
      priority_reason
    );

    const createdToken = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(result.lastInsertRowid);
    console.log(`[QUEUE_LOG] Token Issued: ${token_code} | Patient: ${patient_name} | Priority Level: ${priority_level} (${priority_reason})`);
    
    res.status(201).json(createdToken);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Queue Status (Call Patient, In-Consultation, Complete, Skip)
app.patch('/api/queue/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctor_id } = req.body;

    if (doctor_id) {
      db.prepare('UPDATE queue_tokens SET status = ?, doctor_id = ? WHERE id = ?').run(status, doctor_id, id);
    } else {
      db.prepare('UPDATE queue_tokens SET status = ? WHERE id = ?').run(status, id);
    }

    const updated = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Appointments: Get List
app.get('/api/appointments', (req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty, d.room_number
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.appointment_date ASC, a.time_slot ASC
    `).all();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Appointments: Schedule New
app.post('/api/appointments', (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_email,
      doctor_id,
      specialty,
      appointment_date,
      time_slot,
      consultation_type,
      notes
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO appointments (
        patient_name, patient_phone, patient_email, doctor_id, specialty,
        appointment_date, time_slot, consultation_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
    `);

    const result = stmt.run(
      patient_name,
      patient_phone,
      patient_email || '',
      doctor_id,
      specialty || 'General Medicine',
      appointment_date,
      time_slot,
      consultation_type || 'IN_PERSON',
      notes || ''
    );

    const doctor = db.prepare('SELECT name FROM doctors WHERE id = ?').get(doctor_id);

    // Automated Reminder Logic: Simulated dispatch logs
    console.log(`[AUTOMATED_REMINDER_CRON] Scheduled 24h & 1h notification triggers for ${patient_name} (${patient_phone}). Doctor: ${doctor?.name || 'Assigned Specialist'} on ${appointment_date} at ${time_slot}.`);

    const created = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Automated Appointment Reminders: Fetch Active Reminder Alerts
app.get('/api/reminders/appointments', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.room_number 
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.status = 'SCHEDULED'
      ORDER BY a.appointment_date ASC
      LIMIT 10
    `).all();

    const reminders = list.map(apt => ({
      id: apt.id,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      doctor_name: apt.doctor_name,
      date: apt.appointment_date,
      time_slot: apt.time_slot,
      type: apt.consultation_type,
      reminder_status: 'DISPATCHED_SIMULATED',
      sms_text: `[SmartCare Alert] Reminder: Your appointment with ${apt.doctor_name} is scheduled on ${apt.appointment_date} at ${apt.time_slot}. Please arrive 15m early for vitals check-in.`,
      email_text: `Dear ${apt.patient_name}, your ${apt.consultation_type} consultation with ${apt.doctor_name} is confirmed for ${apt.appointment_date} at ${apt.time_slot}.`
    }));

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Prescriptions: Get List
app.get('/api/prescriptions', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT p.*, d.name as doctor_name, d.specialty, d.qualification
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      ORDER BY p.id DESC
    `).all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Prescriptions: Issue Digital Prescription & Auto-Sync Medicine Reminders
app.post('/api/prescriptions', (req, res) => {
  try {
    const {
      token_id,
      doctor_id,
      doctor_name,
      patient_name,
      patient_phone,
      patient_age,
      patient_gender,
      diagnosis,
      medications, // Array of { name, dosage, frequency, food, duration }
      advice,
      follow_up_days
    } = req.body;

    const medsString = typeof medications === 'string' ? medications : JSON.stringify(medications || []);

    const stmt = db.prepare(`
      INSERT INTO prescriptions (
        token_id, doctor_id, doctor_name, patient_name, patient_age, patient_gender,
        diagnosis, medications, advice, follow_up_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      token_id || null,
      doctor_id,
      doctor_name || 'Consulting Physician',
      patient_name,
      patient_age || null,
      patient_gender || 'Other',
      diagnosis,
      medsString,
      advice || '',
      follow_up_days || 7
    );

    // If token_id provided, mark token as COMPLETED
    if (token_id) {
      db.prepare("UPDATE queue_tokens SET status = 'COMPLETED' WHERE id = ?").run(token_id);
    }

    // Auto-generate Medicine Reminders from the prescription line items!
    const parsedMeds = Array.isArray(medications) ? medications : JSON.parse(medsString || '[]');
    const insertReminder = db.prepare(`
      INSERT INTO medicine_reminders (patient_name, patient_phone, medicine_name, dosage, frequency_time, food_timing, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    for (const med of parsedMeds) {
      const times = [];
      const freq = (med.frequency || '').toLowerCase();
      if (freq.includes('morning') || freq.startsWith('1-')) times.push('Morning (08:00 AM)');
      if (freq.includes('afternoon') || freq.includes('-1-')) times.push('Afternoon (01:00 PM)');
      if (freq.includes('night') || freq.endsWith('-1')) times.push('Night (09:00 PM)');
      if (times.length === 0) times.push('Morning (08:00 AM)'); // Default fallback

      for (const t of times) {
        insertReminder.run(
          patient_name,
          patient_phone || '',
          med.name,
          med.dosage || '1 unit',
          t,
          med.food || 'After Food'
        );
      }
    }

    console.log(`[PRESCRIPTION_LOG] Digital prescription issued for ${patient_name} by ${doctor_name}. ${parsedMeds.length} medications synced to automated reminders.`);

    const created = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Medicine Reminders: Get List & Adherence
app.get('/api/reminders/medicine', (req, res) => {
  try {
    const { patient_name } = req.query;
    let query = 'SELECT * FROM medicine_reminders';
    const params = [];

    if (patient_name) {
      query += ' WHERE LOWER(patient_name) LIKE ?';
      params.push(`%${patient_name.toLowerCase()}%`);
    }

    query += ' ORDER BY id DESC LIMIT 50';
    const reminders = db.prepare(query).all(...params);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Medicine Reminders: Mark as Taken or Snoozed
app.patch('/api/reminders/medicine/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'TAKEN', 'SNOOZED', 'PENDING'

    const taken_at = status === 'TAKEN' ? new Date().toISOString() : null;
    db.prepare('UPDATE medicine_reminders SET status = ?, taken_at = ? WHERE id = ?').run(status, taken_at, id);

    const updated = db.prepare('SELECT * FROM medicine_reminders WHERE id = ?').get(id);
    console.log(`[MED_REMINDER] Medicine ${updated.medicine_name} for ${updated.patient_name} updated to: ${status}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Patient Feedback: Get List & Doctor Aggregate
app.get('/api/feedbacks', (req, res) => {
  try {
    const feedbacks = db.prepare(`
      SELECT f.*, d.name as doctor_name, d.specialty
      FROM feedbacks f
      LEFT JOIN doctors d ON f.doctor_id = d.id
      ORDER BY f.id DESC
    `).all();
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Patient Feedback: Submit Feedback
app.post('/api/feedbacks', (req, res) => {
  try {
    const {
      doctor_id,
      patient_name,
      rating_doctor,
      rating_wait_time,
      rating_facility,
      comments
    } = req.body;

    const overall = (Number(rating_doctor) + Number(rating_wait_time) + Number(rating_facility)) / 3;
    const overall_rating = Math.round(overall * 10) / 10;

    const doctor = db.prepare('SELECT name FROM doctors WHERE id = ?').get(doctor_id);

    const stmt = db.prepare(`
      INSERT INTO feedbacks (
        doctor_id, doctor_name, patient_name, rating_doctor, rating_wait_time, rating_facility, overall_rating, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      doctor_id,
      doctor?.name || 'General Doctor',
      patient_name || 'Anonymous Patient',
      rating_doctor,
      rating_wait_time,
      rating_facility,
      overall_rating,
      comments || ''
    );

    // Update doctor's overall rating
    const avgRow = db.prepare('SELECT AVG(overall_rating) as avg_score FROM feedbacks WHERE doctor_id = ?').get(doctor_id);
    if (avgRow && avgRow.avg_score) {
      const roundedRating = Math.round(avgRow.avg_score * 10) / 10;
      db.prepare('UPDATE doctors SET rating = ? WHERE id = ?').run(roundedRating, doctor_id);
    }

    const created = db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Serve static client build if present in production
// -------------------------------------------------------------
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Smart Care Connect API Server is running. Launch Vite dev server to view frontend.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏥 SMART CARE CONNECT - BACKEND READY`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`💾 SQLite Database connected: ${dbPath}`);
  console.log(`=======================================================`);
});
