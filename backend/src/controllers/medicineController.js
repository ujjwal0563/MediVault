const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const DoseLog = require("../models/DoseLog");
const Notification = require("../models/Notification");
const streakService = require("../services/streakService");

// Course color palette for range bands
const COURSE_COLORS = [
	'#0D9488', // teal
	'#1A4FBA', // blue
	'#F97316', // orange
	'#DC2626', // red
	'#7C3AED', // purple
	'#059669', // emerald
	'#DB2777', // pink
	'#EA580C', // orange-600
	'#2563EB', // blue-600
	'#16A34A', // green-600
];

// Helper function to assign deterministic colors to medicine courses
const assignCourseColor = (index) => {
	return COURSE_COLORS[index % COURSE_COLORS.length];
};

const parseScheduledTime = (value) => {
	if (!value) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	parsed.setSeconds(0, 0);
	return parsed;
};

const buildTimeSlotDate = (baseDate, slot) => {
	if (typeof slot !== "string") {
		return null;
	}

	const match = slot.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		return null;
	}

	const date = new Date(baseDate);
	date.setHours(hours, minutes, 0, 0);
	return date;
};

const upsertDoseLog = async ({ patientId, medicineId, status, scheduledTime }) => {
	const normalizedScheduledTime = parseScheduledTime(scheduledTime);
	console.log('[UPSERT DEBUG] scheduledTime input:', scheduledTime, '-> normalized:', normalizedScheduledTime);
	if (!normalizedScheduledTime) {
		console.log('[UPSERT DEBUG] ERROR: scheduledTime is invalid, returning error');
		return { error: "scheduledTime must be a valid datetime." };
	}

	const medicine = await Medicine.findOne({ _id: medicineId, patientId });
	if (!medicine) {
		return { error: "Medicine not found for this patient.", status: 404 };
	}

	const existingLog = await DoseLog.findOne({
		patientId,
		medicineId: medicine._id,
		scheduledTime: normalizedScheduledTime,
	});

	if (existingLog) {
		const becameMissed = existingLog.status !== "missed" && status === "missed";
		existingLog.status = status;
		existingLog.loggedAt = new Date();

		if (status === "missed" && becameMissed) {
			await streakService.updateStreakOnMiss(patientId, medicine._id, existingLog);
		} else if (status === "taken") {
			await streakService.resetStreakOnTaken(patientId, medicine._id, existingLog);
		}

		await existingLog.save();
		return { doseLog: existingLog, updated: true, becameMissed, medicine };
	}

	const createdLog = await DoseLog.create({
		medicineId: medicine._id,
		patientId,
		status,
		scheduledTime: normalizedScheduledTime,
	});

	if (status === "missed") {
		await streakService.updateStreakOnMiss(patientId, medicine._id, createdLog);
	} else if (status === "taken") {
		await streakService.resetStreakOnTaken(patientId, medicine._id, createdLog);
	}

	return {
		doseLog: createdLog,
		updated: false,
		becameMissed: status === "missed",
		medicine,
	};
};

const createMissedDoseNotification = async ({ userId, medicine, scheduledTime }) => {
	await Notification.create({
		userId,
		type: "dose_missed",
		title: "Missed Dose Alert",
		message: `You missed a scheduled dose for ${medicine.name}.`,
		metadata: {
			medicineId: medicine._id,
			medicineName: medicine.name,
			scheduledTime,
		},
	});
};

const addMedicine = async (req, res, next) => {
	try {
		const { name, dosage, frequency, timeSlots, startDate, endDate, instructions, totalTablets, tabletsPerDose } =
			req.body;

		if (!name || !dosage) {
			return res
				.status(400)
				.json({ message: "name and dosage are required fields." });
		}

		const medicine = await Medicine.create({
			patientId: req.user.id,
			name,
			dosage,
			frequency: frequency || "daily",
			timeSlots: Array.isArray(timeSlots) ? timeSlots : [],
			startDate: startDate || Date.now(),
			endDate,
			instructions,
			...(totalTablets !== undefined && { totalTablets }),
			...(tabletsPerDose !== undefined && { tabletsPerDose }),
		});

		return res.status(201).json({
			message: "Medicine added successfully.",
			medicine,
		});
	} catch (error) {
		return next(error);
	}
};

const getMyMedicines = async (req, res, next) => {
	try {
		const medicines = await Medicine.find({
			patientId: req.user.id,
			isActive: true,
		}).sort({ createdAt: -1 });

		// Add color assignment for course range bands
		const medicinesWithColors = medicines.map((medicine, index) => ({
			...medicine.toObject(),
			courseColor: assignCourseColor(index)
		}));

		return res.status(200).json({ medicines: medicinesWithColors });
	} catch (error) {
		return next(error);
	}
};

const logDose = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { status, scheduledTime } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "Invalid medicine id." });
		}

		if (!["taken", "missed"].includes(status)) {
			return res
				.status(400)
				.json({ message: "status must be either taken or missed." });
		}

		const result = await upsertDoseLog({
			patientId: req.user.id,
			medicineId: id,
			status,
			scheduledTime,
		});

		if (result.error) {
			return res.status(result.status || 400).json({ message: result.error });
		}

		if (result.becameMissed) {
			await createMissedDoseNotification({
				userId: req.user.id,
				medicine: result.medicine,
				scheduledTime: result.doseLog.scheduledTime,
			});
		}

		return res.status(201).json({
			message: result.updated ? "Dose updated successfully." : "Dose logged successfully.",
			doseLog: result.doseLog,
		});
	} catch (error) {
		return next(error);
	}
};

const markDoseStatus = async (req, res, next) => {
	try {
		const { medicineId, status, scheduledTime } = req.body;
		console.log('[MARK DOSE DEBUG] body:', { medicineId, status, scheduledTime });
		console.log('[MARK DOSE DEBUG] patientId:', req.user.id);

		if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
			return res.status(400).json({ message: "Valid medicineId is required." });
		}

		if (!["taken", "missed"].includes(status)) {
			return res.status(400).json({ message: "status must be either taken or missed." });
		}

		const result = await upsertDoseLog({
			patientId: req.user.id,
			medicineId,
			status,
			scheduledTime,
		});

		if (result.error) {
			return res.status(result.status || 400).json({ message: result.error });
		}

		if (result.becameMissed) {
			await createMissedDoseNotification({
				userId: req.user.id,
				medicine: result.medicine,
				scheduledTime: result.doseLog.scheduledTime,
			});
		}

		return res.status(201).json({
			message: result.updated ? "Dose updated successfully." : "Dose logged successfully.",
			doseLog: result.doseLog,
		});
	} catch (error) {
		return next(error);
	}
};

const getDueDoses = async (req, res, next) => {
	try {
		const now = new Date();
		const dayStart = new Date(now);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(now);
		dayEnd.setHours(23, 59, 59, 999);

		console.log('DEBUG getDueDoses - user.id:', req.user.id);
		console.log('DEBUG getDueDoses - dayStart:', dayStart);
		console.log('DEBUG getDueDoses - dayEnd:', dayEnd);

		const medicines = await Medicine.find({
			patientId: req.user.id,
			isActive: true,
			startDate: { $lte: dayEnd },
			$or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: dayStart } }],
		}).sort({ createdAt: -1 });

		console.log('DEBUG getDueDoses - found medicines:', medicines.length);

		const medicineIds = medicines.map((m) => m._id);
		const todayLogs = await DoseLog.find({
			patientId: req.user.id,
			medicineId: { $in: medicineIds },
			scheduledTime: { $gte: dayStart, $lte: dayEnd },
		}).sort({ createdAt: -1 });

		const logMap = new Map();
		for (const log of todayLogs) {
			const date = new Date(log.scheduledTime);
			const slotKey = `${date.getHours().toString().padStart(2, "0")}:${date
				.getMinutes()
				.toString()
				.padStart(2, "0")}`;
			const key = `${String(log.medicineId)}|${slotKey}`;
			if (!logMap.has(key)) {
				logMap.set(key, log);
			}
		}

		const dueDoses = [];
		for (const medicine of medicines) {
			const slots = medicine.timeSlots && medicine.timeSlots.length ? medicine.timeSlots : ["09:00"];
			for (const slot of slots) {
				const scheduledDate = buildTimeSlotDate(now, slot);
				if (!scheduledDate) {
					continue;
				}

				const medStartDay = new Date(medicine.startDate);
				medStartDay.setHours(0, 0, 0, 0);
				if (scheduledDate < medStartDay) {
					continue;
				}

				if (medicine.endDate && scheduledDate > medicine.endDate) {
					continue;
				}

				const key = `${String(medicine._id)}|${slot}`;
				const log = logMap.get(key);
				dueDoses.push({
					medicineId: medicine._id,
					medicineName: medicine.name,
					dosage: medicine.dosage,
					slot,
					scheduledTime: scheduledDate,
					status: log ? log.status : "pending",
					isOverdue: !log && scheduledDate < now,
				});
			}
		}

		const summary = {
			total: dueDoses.length,
			taken: dueDoses.filter((dose) => dose.status === "taken").length,
			missed: dueDoses.filter((dose) => dose.status === "missed").length,
			pending: dueDoses.filter((dose) => dose.status === "pending").length,
			overdue: dueDoses.filter((dose) => dose.isOverdue).length,
		};

		return res.status(200).json({ date: dayStart, summary, dueDoses });
	} catch (error) {
		return next(error);
	}
};

const updateMedicine = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "Invalid medicine ID." });
		}

		const SAFE_FIELDS = ["isActive", "endDate", "instructions", "totalTablets", "tabletsPerDose"];
		const updates = {};
		for (const field of SAFE_FIELDS) {
			if (req.body[field] !== undefined) {
				updates[field] = req.body[field];
			}
		}

		const medicine = await Medicine.findOneAndUpdate(
			{ _id: id, patientId: req.user.id },
			{ $set: updates },
			{ new: true, runValidators: true }
		);

		if (!medicine) {
			return res.status(404).json({ message: "Medicine not found." });
		}

		return res.status(200).json({ message: "Medicine updated successfully.", medicine });
	} catch (error) {
		return next(error);
	}
};

const deleteMedicine = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "Invalid medicine ID." });
		}
		const medicine = await Medicine.findOneAndDelete({ _id: id, patientId: req.user.id });
		if (!medicine) {
			return res.status(404).json({ message: "Medicine not found." });
		}
		return res.status(200).json({ message: "Medicine deleted successfully." });
	} catch (error) {
		return next(error);
	}
};

const getAdherenceSummary = async (req, res, next) => {
	try {
		const { medicineId } = req.query;
		const matchStage = { patientId: new mongoose.Types.ObjectId(req.user.id) };

		if (medicineId) {
			if (!mongoose.Types.ObjectId.isValid(medicineId)) {
				return res.status(400).json({ message: "Invalid medicineId query value." });
			}
			matchStage.medicineId = new mongoose.Types.ObjectId(medicineId);
		}

		const summary = await DoseLog.aggregate([
			{ $match: matchStage },
			{
				$group: {
					_id: "$medicineId",
					total: { $sum: 1 },
					taken: {
						$sum: {
							$cond: [{ $eq: ["$status", "taken"] }, 1, 0],
						},
					},
					missed: {
						$sum: {
							$cond: [{ $eq: ["$status", "missed"] }, 1, 0],
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					medicineId: "$_id",
					total: 1,
					taken: 1,
					missed: 1,
					adherencePercent: {
						$round: [
							{
								$multiply: [
									{
										$cond: [
											{ $eq: ["$total", 0] },
											0,
											{ $divide: ["$taken", "$total"] },
										],
									},
									100,
								],
							},
							2,
						],
					},
				},
			},
		]);

		return res.status(200).json({ summary });
	} catch (error) {
		return next(error);
	}
};

const getWeeklyAdherenceTrend = async (req, res, next) => {
	try {
		const { medicineId } = req.query;
		const now = new Date();
		const start = new Date(now);
		start.setHours(0, 0, 0, 0);
		start.setDate(start.getDate() - 6);

		const matchStage = {
			patientId: new mongoose.Types.ObjectId(req.user.id),
			scheduledTime: { $gte: start, $lte: now },
		};

		if (medicineId) {
			if (!mongoose.Types.ObjectId.isValid(medicineId)) {
				return res.status(400).json({ message: "Invalid medicineId query value." });
			}
			matchStage.medicineId = new mongoose.Types.ObjectId(medicineId);
		}

		const aggregated = await DoseLog.aggregate([
			{ $match: matchStage },
			{
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$scheduledTime",
						},
					},
					total: { $sum: 1 },
					taken: { $sum: { $cond: [{ $eq: ["$status", "taken"] }, 1, 0] } },
					missed: { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
				},
			},
			{ $sort: { _id: 1 } },
		]);

		const trendMap = new Map(aggregated.map((item) => [item._id, item]));
		const trend = [];

		for (let i = 0; i < 7; i += 1) {
			const day = new Date(start);
			day.setDate(start.getDate() + i);
			const key = day.toISOString().slice(0, 10);
			const row = trendMap.get(key) || { total: 0, taken: 0, missed: 0 };
			const adherencePercent = row.total
				? Number(((row.taken / row.total) * 100).toFixed(2))
				: 0;

			trend.push({
				date: key,
				total: row.total,
				taken: row.taken,
				missed: row.missed,
				adherencePercent,
			});
		}

		return res.status(200).json({ from: start, to: now, trend });
	} catch (error) {
		return next(error);
	}
};

const getMonthlyAdherence = async (req, res, next) => {
	try {
		const patientId = req.user.id;
		const { year, month } = req.query;

		// Validate required parameters
		if (!year || !month) {
			return res.status(400).json({ message: "year and month parameters are required" });
		}

		const yearNum = parseInt(year);
		const monthNum = parseInt(month);

		// Validate year and month values
		if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
			return res.status(400).json({ message: "Invalid year or month value" });
		}

		// Calculate month boundaries
		const monthStart = new Date(yearNum, monthNum - 1, 1);
		const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
		const today = new Date();
		
		// For current month, only count doses up to today
		const isFutureMonth = yearNum > today.getFullYear() || 
			(yearNum === today.getFullYear() && monthNum > today.getMonth() + 1);
		
		const effectiveEnd = (yearNum === today.getFullYear() && monthNum === today.getMonth() + 1) 
			? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
			: monthEnd;

		// If it's a future month, return empty data
		if (isFutureMonth) {
			return res.status(200).json({
				year: yearNum,
				month: monthNum,
				totalScheduled: 0,
				takenDoses: 0,
				missedDoses: 0,
				adherencePercent: 0,
				isFutureMonth: true,
				weeklyBreakdown: []
			});
		}

		// Aggregation pipeline for monthly adherence
		const monthlyStats = await DoseLog.aggregate([
			{
				$match: {
					patientId: new mongoose.Types.ObjectId(patientId),
					scheduledTime: { $gte: monthStart, $lte: effectiveEnd }
				}
			},
			{
				$group: {
					_id: null,
					totalScheduled: { $sum: 1 },
					takenDoses: { 
						$sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] }
					},
					missedDoses: { 
						$sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] }
					}
				}
			},
			{
				$project: {
					_id: 0,
					totalScheduled: 1,
					takenDoses: 1,
					missedDoses: 1,
					adherencePercent: {
						$round: [
							{
								$multiply: [
									{ $cond: [
										{ $eq: ['$totalScheduled', 0] },
										0,
										{ $divide: ['$takenDoses', '$totalScheduled'] }
									]},
									100
								]
							},
							1
						]
					}
				}
			}
		]);

		// Weekly breakdown aggregation
		const weeklyBreakdown = await DoseLog.aggregate([
			{
				$match: {
					patientId: new mongoose.Types.ObjectId(patientId),
					scheduledTime: { $gte: monthStart, $lte: effectiveEnd }
				}
			},
			{
				$group: {
					_id: {
						week: { $week: '$scheduledTime' },
						year: { $year: '$scheduledTime' }
					},
					totalDoses: { $sum: 1 },
					takenDoses: { 
						$sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] }
					},
					weekStart: { $min: '$scheduledTime' },
					weekEnd: { $max: '$scheduledTime' }
				}
			},
			{
				$project: {
					_id: 0,
					weekStart: { $dateToString: { format: '%Y-%m-%d', date: '$weekStart' } },
					weekEnd: { $dateToString: { format: '%Y-%m-%d', date: '$weekEnd' } },
					totalDoses: 1,
					takenDoses: 1,
					adherencePercent: {
						$round: [
							{
								$multiply: [
									{ $cond: [
										{ $eq: ['$totalDoses', 0] },
										0,
										{ $divide: ['$takenDoses', '$totalDoses'] }
									]},
									100
								]
							},
							1
						]
					}
				}
			},
			{ $sort: { weekStart: 1 } }
		]);

		// Get the first result or default values
		const stats = monthlyStats[0] || {
			totalScheduled: 0,
			takenDoses: 0,
			missedDoses: 0,
			adherencePercent: 0
		};

		return res.status(200).json({
			year: yearNum,
			month: monthNum,
			...stats,
			isFutureMonth: false,
			weeklyBreakdown
		});

	} catch (error) {
		return next(error);
	}
};

const getStreakData = async (req, res, next) => {
	try {
		const patientId = req.user.id;
		const { fromDate } = req.query;
		
		const streakData = await streakService.calculateAdherenceStreak(
			patientId, 
			fromDate ? new Date(fromDate) : null
		);
		
		return res.status(200).json(streakData);
	} catch (error) {
		return next(error);
	}
};

const getMonthlyStreakHistory = async (req, res, next) => {
	try {
		const patientId = req.user.id;
		const { year, month } = req.query;
		
		// Validate required parameters
		if (!year || !month) {
			return res.status(400).json({ message: "year and month parameters are required" });
		}
		
		const yearNum = parseInt(year);
		const monthNum = parseInt(month);
		
		// Validate year and month values
		if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
			return res.status(400).json({ message: "Invalid year or month value" });
		}
		
		// Calculate month boundaries
		const monthStart = new Date(yearNum, monthNum - 1, 1);
		const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
		
		// Get daily adherence data for the month
		const dailyAdherence = await streakService.calculateDailyAdherence(
			patientId, 
			monthStart, 
			monthEnd
		);
		
		// Get overall streak data
		const streakData = await streakService.calculateAdherenceStreak(patientId);
		
		// Filter streak history for visible month
		const monthlyStreaks = streakData.streakHistory.filter(streak => {
			const streakStart = new Date(streak.startDate);
			const streakEnd = new Date(streak.endDate);
			
			// Check if streak overlaps with the requested month
			return (streakStart <= monthEnd && streakEnd >= monthStart);
		});
		
		return res.status(200).json({
			year: yearNum,
			month: monthNum,
			dailyAdherence,
			monthlyStreaks,
			currentStreak: streakData.currentStreak,
			milestones: streakData.milestones,
			nextMilestone: streakData.nextMilestone
		});
	} catch (error) {
		return next(error);
	}
};

module.exports = {
	addMedicine,
	getMyMedicines,
	logDose,
	markDoseStatus,
	getDueDoses,
	getAdherenceSummary,
	getWeeklyAdherenceTrend,
	getMonthlyAdherence,
	getStreakData,
	getMonthlyStreakHistory,
	deleteMedicine,
	updateMedicine,
};
