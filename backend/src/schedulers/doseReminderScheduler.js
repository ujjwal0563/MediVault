const cron = require('node-cron');
const express = require('express');
const Medicine = require('../models/Medicine.js');
const DoseLog = require('../models/DoseLog.js');
const Notification = require('../models/Notification.js');

const router = express.Router();

// How many minutes before the dose to fire each reminder
const REMINDER_WINDOWS = [
	{ minutesBefore: 10, label: '10 minutes' },
	{ minutesBefore: 2,  label: '2 minutes'  },
];

/**
 * Build a Date for today at the given HH:MM slot.
 */
const buildTimeSlotDate = (baseDate, slot) => {
	if (typeof slot !== 'string') return null;
	const match = slot.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	const date = new Date(baseDate);
	date.setHours(hours, minutes, 0, 0);
	return date;
};

/**
 * Dedup key stored in notification metadata so we never fire the same
 * reminder twice for the same medicine + slot + window.
 */
const buildDedupKey = (medicineId, slot, minutesBefore) =>
	`${medicineId}|${slot}|${minutesBefore}min`;

const checkUpcomingDoses = async () => {
	const now = new Date();
	const dayStart = new Date(now);
	dayStart.setHours(0, 0, 0, 0);

	try {
		const medicines = await Medicine.find({
			isActive: true,
			startDate: { $lte: now },
			$or: [
				{ endDate: { $exists: false } },
				{ endDate: null },
				{ endDate: { $gte: dayStart } },
			],
		});

		let reminderCount = 0;

		for (const medicine of medicines) {
			const slots = medicine.timeSlots?.length ? medicine.timeSlots : ['09:00'];

			for (const slot of slots) {
				const scheduledDate = buildTimeSlotDate(now, slot);
				if (!scheduledDate) continue;

				// Skip slots that are in the past
				if (scheduledDate <= now) continue;

				// Skip if already taken today
				const existingLog = await DoseLog.findOne({
					medicineId: medicine._id,
					patientId: medicine.patientId,
					scheduledTime: scheduledDate,
					status: 'taken',
				});
				if (existingLog) continue;

				for (const { minutesBefore, label } of REMINDER_WINDOWS) {
					const diffMs = scheduledDate - now;
					const diffMin = diffMs / 60000;

					// Fire when we're within a 1-minute window of the target offset
					// e.g. for 10-min reminder: fire when diffMin is between 9.5 and 10.5
					if (diffMin < minutesBefore - 0.5 || diffMin > minutesBefore + 0.5) continue;

					const dedupKey = buildDedupKey(medicine._id, slot, minutesBefore);

					// Check if we already sent this reminder today
					const alreadySent = await Notification.findOne({
						userId: medicine.patientId,
						type: 'dose_reminder',
						'metadata.dedupKey': dedupKey,
						createdAt: { $gte: dayStart },
					});
					if (alreadySent) continue;

					await Notification.create({
						userId: medicine.patientId,
						type: 'dose_reminder',
						title: 'Upcoming Dose Reminder',
						message: `Time to prepare: ${medicine.name} (${medicine.dosage}) is due in ${label}.`,
						metadata: {
							medicineId: medicine._id.toString(),
							medicineName: medicine.name,
							dosage: medicine.dosage,
							scheduledTime: scheduledDate.toISOString(),
							minutesBefore,
							dedupKey,
						},
					});

					reminderCount++;
					console.log(
						`[DoseReminder] Sent ${minutesBefore}-min reminder for ${medicine.name} ` +
						`(patient: ${medicine.patientId}) at slot ${slot}`
					);
				}
			}
		}

		return { reminderCount };
	} catch (error) {
		console.error('[DoseReminder] Error checking upcoming doses:', error);
		throw error;
	}
};

// Manual trigger endpoint for testing
router.post('/check-dose-reminders', async (req, res) => {
	try {
		const result = await checkUpcomingDoses();
		res.json({ success: true, message: 'Dose reminder check completed', ...result });
	} catch (error) {
		console.error('[DoseReminder] Manual trigger failed:', error);
		res.status(500).json({ success: false, message: 'Failed to check dose reminders', error: error.message });
	}
});

// Run every minute
cron.schedule('* * * * *', async () => {
	try {
		await checkUpcomingDoses();
	} catch (error) {
		console.error('[DoseReminder] Scheduled check failed:', error);
	}
});

module.exports = { router, checkUpcomingDoses };
