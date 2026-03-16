export const medicinesData = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    dosage: '500mg',
    freq: 'Twice Daily',
    times: ['8:00 AM', '8:00 PM'],
    startDate: 'Mar 10',
    endDate: 'Mar 20',
    adherence: 95,
    streak: 7,
    doses: [true, true, true, true, true, true, true],
  },
  {
    id: 2,
    name: 'Vitamin C',
    dosage: '1000mg',
    freq: 'Once Daily',
    times: ['2:00 PM'],
    startDate: 'Mar 10',
    endDate: 'Mar 31',
    adherence: 90,
    streak: 5,
    doses: [true, true, false, true, true, true, true],
  },
  {
    id: 3,
    name: 'Antibiotic',
    dosage: '250mg',
    freq: 'Thrice Daily',
    times: ['8:00 AM', '2:00 PM', '8:00 PM'],
    startDate: 'Mar 12',
    endDate: 'Mar 17',
    adherence: 78,
    streak: 3,
    doses: [true, false, true, true, false, true, true],
  },
];

export const todayScheduleData = [
  { time: '8:00 AM', med: 'Paracetamol 500mg', status: 'taken', color: '#DC2626' },
  { time: '8:00 AM', med: 'Antibiotic 250mg', status: 'taken', color: '#16A34A' },
  { time: '2:00 PM', med: 'Vitamin C 1000mg', status: 'due', color: '#D97706' },
  { time: '2:00 PM', med: 'Antibiotic 250mg', status: 'due', color: '#16A34A' },
  { time: '8:00 PM', med: 'Paracetamol 500mg', status: 'upcoming', color: '#DC2626' },
  { time: '8:00 PM', med: 'Antibiotic 250mg', status: 'upcoming', color: '#16A34A' },
];

export const allPatients = [
  { id: 1, name: 'Rahul Singh', age: 32, condition: 'Dengue', doctor: 'Dr. Meera Kapoor', streak: 7, adherence: 92, status: 'Critical', lastSeen: 'Today', blood: 'O+', phone: '+91 98765 43210' },
  { id: 2, name: 'Anita Rao', age: 45, condition: 'Diabetes', doctor: 'Dr. Meera Kapoor', streak: 10, adherence: 87, status: 'Stable', lastSeen: 'Yesterday', blood: 'B+', phone: '+91 91234 56789' },
  { id: 3, name: 'Vikram Patel', age: 28, condition: 'Asthma', doctor: 'Dr. Arun Sharma', streak: 3, adherence: 71, status: 'Monitor', lastSeen: '2 days ago', blood: 'A+', phone: '+91 99887 76655' },
  { id: 4, name: 'Priya Sharma', age: 36, condition: 'Hypertension', doctor: 'Dr. Meera Kapoor', streak: 14, adherence: 95, status: 'Stable', lastSeen: 'Today', blood: 'AB+', phone: '+91 77665 54433' },
  { id: 5, name: 'Amit Verma', age: 55, condition: 'Chest Pain', doctor: 'Dr. Arun Sharma', streak: 1, adherence: 60, status: 'Critical', lastSeen: '3 hrs ago', blood: 'O-', phone: '+91 88990 11223' },
];

export const doctorAlerts = [
  { id: 1, severity: 'critical', patient: 'Rahul Singh', initials: 'RS', issue: 'High Fever (104°F)', detail: 'Temperature spiked to 104°F. Patient reports severe headache and body aches.', time: '2 min ago', phone: '+91 98765 43210', doctor: 'Dr. Meera Kapoor', responded: false },
  { id: 2, severity: 'critical', patient: 'Amit Verma', initials: 'AV', issue: 'Chest Pain', detail: 'Patient reports persistent chest tightness and difficulty breathing.', time: '15 min ago', phone: '+91 88990 11223', doctor: 'Dr. Arun Sharma', responded: false },
  { id: 3, severity: 'warning', patient: 'Vikram Patel', initials: 'VP', issue: '3 Missed Doses', detail: 'Antibiotic 250mg missed for 3 consecutive doses.', time: '1 hr ago', phone: '+91 99887 76655', doctor: 'Dr. Arun Sharma', responded: false },
];
