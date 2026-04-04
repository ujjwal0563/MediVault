const DoseLog = require("../models/DoseLog");
const Medicine = require("../models/Medicine");
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const MISS_THRESHOLD = 3;

// Milestone definitions for adherence streaks
const MILESTONE_DEFINITIONS = [
	{ days: 7, name: 'Week Warrior' },
	{ days: 14, name: 'Two Week Champion' },
	{ days: 30, name: 'Monthly Master' },
	{ days: 60, name: 'Consistency King' },
	{ days: 90, name: 'Streak Legend' },
	{ days: 180, name: 'Half Year Hero' },
	{ days: 365, name: 'Year Long Achiever' }
];

// Helper function to group dose logs by date
const groupDoseLogsByDate = (doseLogs) => {
	const grouped = {};
	
	doseLogs.forEach(log => {
		const dateKey = log.scheduledTime.toISOString().split('T')[0];
		if (!grouped[dateKey]) {
			grouped[dateKey] = [];
		}
		grouped[dateKey].push(log);
	});
	
	return grouped;
};

// Helper function to get previous date
const getPreviousDate = (dateString) => {
	const date = new Date(dateString);
	date.setDate(date.getDate() - 1);
	return date.toISOString().split('T')[0];
};

// Calculate milestones based on current streak
const calculateMilestones = (currentStreak) => {
	return MILESTONE_DEFINITIONS.map(milestone => ({
		days: milestone.days,
		achieved: currentStreak >= milestone.days,
		name: milestone.name
	}));
};

// Get next milestone information
const getNextMilestone = (currentStreak) => {
	const nextMilestone = MILESTONE_DEFINITIONS.find(m => m.days > currentStreak);
	if (!nextMilestone) return null;
	
	return {
		days: nextMilestone.days,
		daysRemaining: nextMilestone.days - currentStreak,
		name: nextMilestone.name
	};
};

// Check if a streak is current (includes today or yesterday, with timezone tolerance)
const isStreakCurrent = (endDate) => {
	const now = new Date();
	const today = now.toISOString().split('T')[0];
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = yesterday.toISOString().split('T')[0];
	const twoDaysAgo = new Date(now);
	twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
	const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
	
	// Allow up to 2 days ago to handle timezone differences
	return endDate === today || endDate === yesterdayStr || endDate === twoDaysAgoStr;
};

// NEW: Calculate adherence streak (consecutive perfect adherence days)
const calculateAdherenceStreak = async (patientId, fromDate = null) => {
	const endDate = fromDate || new Date();
	const startDate = new Date(endDate);
	startDate.setDate(startDate.getDate() - 90); // Look back 90 days max
	
	// Get all dose logs for the period
	const doseLogs = await DoseLog.find({
		patientId: new mongoose.Types.ObjectId(patientId),
		scheduledTime: { $gte: startDate, $lte: endDate }
	}).sort({ scheduledTime: -1 });

	console.log('[STREAK DEBUG] patientId:', patientId);
	console.log('[STREAK DEBUG] date range:', startDate.toISOString(), '->', endDate.toISOString());
	console.log('[STREAK DEBUG] total dose logs found:', doseLogs.length);
	doseLogs.forEach(l => console.log(`  log: ${l.scheduledTime.toISOString().split('T')[0]} status=${l.status}`));

	// Extra debug: check if any logs exist for this patient at all (no date filter)
	const totalLogsForPatient = await DoseLog.countDocuments({ patientId: new mongoose.Types.ObjectId(patientId) });
	const totalLogsRaw = await DoseLog.countDocuments({ patientId: patientId });
	console.log('[STREAK DEBUG] total logs (ObjectId query):', totalLogsForPatient);
	console.log('[STREAK DEBUG] total logs (string query):', totalLogsRaw);
	
	// Group by date and calculate daily adherence
	const dailyAdherence = groupDoseLogsByDate(doseLogs);
	
	// Calculate consecutive perfect days
	let currentStreak = 0;
	let streakHistory = [];
	let currentStreakStart = null;
	
	// Process dates oldest-to-newest so startDate < endDate naturally
	const sortedDates = Object.keys(dailyAdherence).sort();
	
	for (const date of sortedDates) {
		const dayLogs = dailyAdherence[date];
		const isPerfectDay = dayLogs.every(log => log.status === 'taken');
		
		if (isPerfectDay) {
			if (currentStreak === 0) {
				currentStreakStart = date;
			}
			currentStreak++;
		} else {
			if (currentStreak > 0) {
				// endDate is the date before the current non-perfect day
				const prevDate = sortedDates[sortedDates.indexOf(date) - 1];
				streakHistory.push({
					startDate: currentStreakStart,
					endDate: prevDate || currentStreakStart,
					length: currentStreak,
					isActive: false
				});
			}
			currentStreak = 0;
			currentStreakStart = null;
		}
	}
	
	// Handle active streak (still going at end of date range)
	if (currentStreak > 0) {
		const streakEndDate = sortedDates[sortedDates.length - 1]; // Most recent date
		const isActive = isStreakCurrent(streakEndDate);
		streakHistory.push({
			startDate: currentStreakStart,
			endDate: streakEndDate,
			length: currentStreak,
			isActive
		});
	}
	
	// Only count active streak if it's current (today or yesterday)
	const activeStreak = streakHistory.find(s => s.isActive);
	const finalCurrentStreak = activeStreak ? activeStreak.length : 0;

	console.log('[STREAK DEBUG] sortedDates:', sortedDates);
	console.log('[STREAK DEBUG] streakHistory:', JSON.stringify(streakHistory));
	console.log('[STREAK DEBUG] finalCurrentStreak:', finalCurrentStreak);
	console.log('[STREAK DEBUG] today UTC:', new Date().toISOString().split('T')[0]);
	
	return {
		currentStreak: finalCurrentStreak,
		streakHistory,
		milestones: calculateMilestones(finalCurrentStreak),
		nextMilestone: getNextMilestone(finalCurrentStreak),
		lastCalculated: new Date().toISOString()
	};
};

// NEW: Calculate daily adherence for a date range
const calculateDailyAdherence = async (patientId, startDate, endDate) => {
	const pipeline = [
		{
			$match: {
				patientId: new mongoose.Types.ObjectId(patientId),
				scheduledTime: { $gte: startDate, $lte: endDate }
			}
		},
		{
			$group: {
				_id: {
					date: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledTime" } },
					medicineId: "$medicineId"
				},
				totalScheduled: { $sum: 1 },
				totalTaken: { 
					$sum: { $cond: [{ $eq: ["$status", "taken"] }, 1, 0] }
				},
				doses: { $push: { status: "$status", scheduledTime: "$scheduledTime" } }
			}
		},
		{
			$group: {
				_id: "$_id.date",
				medicines: {
					$push: {
						medicineId: "$_id.medicineId",
						totalScheduled: "$totalScheduled",
						totalTaken: "$totalTaken",
						doses: "$doses"
					}
				},
				dayTotalScheduled: { $sum: "$totalScheduled" },
				dayTotalTaken: { $sum: "$totalTaken" }
			}
		},
		{
			$project: {
				_id: 0,
				date: "$_id",
				medicines: 1,
				totalScheduled: "$dayTotalScheduled",
				totalTaken: "$dayTotalTaken",
				isPerfectDay: { $eq: ["$dayTotalScheduled", "$dayTotalTaken"] }
			}
		},
		{ $sort: { date: -1 } }
	];
	
	return await DoseLog.aggregate(pipeline);
};

// EXISTING FUNCTIONS (unchanged for backward compatibility)
const getConsecutiveMissCount = async (patientId, medicineId) => {
	const logs = await DoseLog.find({
		patientId,
		medicineId,
		status: "missed",
	}).sort({ scheduledTime: -1 });

	let count = 0;
	for (const log of logs) {
		if (log.status === "missed") {
			count++;
		} else {
			break;
		}
	}

	return count;
};

const calculateStreak = async (patientId, medicineId) => {
	const logs = await DoseLog.find({
		patientId,
		medicineId,
	}).sort({ scheduledTime: -1 }).limit(50);

	let streak = 0;
	for (const log of logs) {
		if (log.status === "missed") {
			streak++;
		} else if (log.status === "taken") {
			break;
		}
	}

	return streak;
};

const updateStreakOnMiss = async (patientId, medicineId, doseLog) => {
	const streak = await calculateStreak(patientId, medicineId);
	const newStreak = streak;

	doseLog.consecutiveMissCount = newStreak;
	await doseLog.save();

	if (newStreak >= MISS_THRESHOLD) {
		await triggerCaregiverAlert(patientId, medicineId, newStreak);
	}

	return newStreak;
};

const resetStreakOnTaken = async (patientId, medicineId, doseLog) => {
	doseLog.consecutiveMissCount = 0;
	await doseLog.save();

	return 0;
};

const triggerCaregiverAlert = async (patientId, medicineId, streakCount) => {
	const patient = await User.findById(patientId);
	if (!patient || !patient.assignedDoctorId) {
		return null;
	}

	const medicine = await Medicine.findById(medicineId);
	if (!medicine) {
		return null;
	}

	const existingAlert = await Notification.findOne({
		userId: patient.assignedDoctorId,
		type: "dose_missed_caregiver",
		"metadata.patientId": patientId.toString(),
		"metadata.medicineId": medicineId.toString(),
		createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
	});

	if (existingAlert) {
		return existingAlert;
	}

	const notification = await Notification.create({
		userId: patient.assignedDoctorId,
		type: "dose_missed_caregiver",
		title: "Patient Missed Dose Alert",
		message: `${patient.name || "Your patient"} has missed ${streakCount} consecutive doses of ${medicine.name}.`,
		metadata: {
			patientId: patientId.toString(),
			patientName: patient.name,
			medicineId: medicineId.toString(),
			medicineName: medicine.name,
			streakCount,
		},
	});

	return notification;
};

module.exports = {
	// Existing exports (unchanged)
	getConsecutiveMissCount,
	calculateStreak,
	updateStreakOnMiss,
	resetStreakOnTaken,
	triggerCaregiverAlert,
	MISS_THRESHOLD,
	
	// New exports for adherence streaks
	calculateAdherenceStreak,
	calculateDailyAdherence,
	calculateMilestones,
	getNextMilestone,
	MILESTONE_DEFINITIONS,
};
