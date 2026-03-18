# Backend Implementation Plan

## Phase 1: Security Overhaul (Day 1)

### 1.1 Fix Database Connection Race Condition
- **File:** `backend/server.js` | **Line:** 15
- **Issue:** `connectDB()` not awaited — server accepts requests before DB is ready
- **Fix:**
```javascript
// Wrap startup in async function
const startServer = async () => {
  try {
    await connectDB();
    // ... rest of app setup
    app.listen(PORT, () => { ... });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};
startServer();
```

### 1.2 Add Body Parser Size Limits
- **File:** `backend/server.js` | **Lines:** 27-28
- **Issue:** No size limits — DoS vulnerability
- **Fix:**
```javascript
// BEFORE:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// AFTER:
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

### 1.3 Sanitize Global Error Handler
- **File:** `backend/server.js` | **Lines:** 67-69
- **Issue:** Error messages exposed to clients
- **Fix:**
```javascript
// BEFORE:
res.status(err.status || 500).json({
  message: err.message || "Internal server error",
});

// AFTER:
res.status(err.status || 500).json({
  message: process.env.NODE_ENV === 'development' 
    ? err.message 
    : "Internal server error",
});
```

### 1.4 Remove Unused EJS Engine
- **File:** `backend/server.js` | **Line:** 30
- **Fix:** Delete `app.set("view engine", "ejs");`

### 1.5 Add Security Middleware
```bash
cd backend && npm install helmet cors express-rate-limit
```
- **File:** `backend/server.js`
- **Fix:**
```javascript
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Add after const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many authentication attempts." },
});
app.use("/api/v1/auth", authLimiter, authRoutes);
```

### 1.6 Fix JWT Middleware
- **File:** `backend/middleware/verifyToken.js` | **Line:** 14
- **Issue:** No algorithm restriction — algorithm confusion attack vulnerable
- **Fix:**
```javascript
// BEFORE:
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// AFTER:
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
});

// Add payload validation after line 14:
if (!decoded.userId || !decoded.role) {
  return res.status(401).json({ message: "Invalid token payload." });
}
```

### 1.7 Fix File Upload Storage
```bash
mkdir -p backend/uploads
```
- **File:** `backend/middleware/uploadReport.js` | **Line:** 3
- **Issue:** Memory storage — large files exhaust RAM
- **Fix:**
```javascript
const path = require('path');
const fs = require('fs');

const uploadDir = 'backend/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
});
```

### 1.8 Add Authorization to Notifications
- **File:** `backend/routes/notification.js` | **Line:** 15
- **Issue:** Missing role authorization
- **Fix:**
```javascript
// BEFORE:
router.use(verifyToken);

// AFTER:
const requireRole = require("../middleware/requireRole");
router.use(verifyToken, requireRole("patient", "doctor"));
```
- **Also:** Add ownership verification in controller for all notification operations

### 1.9 Add Rate Limiting to QR Emergency
- **File:** `backend/routes/qr.js` | **Line:** 19
- **Fix:**
```javascript
const qrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many QR scans, please try again later." },
});

router.get("/emergency/:qrToken", qrLimiter, validateQrEmergencyTokenParam, accessEmergencyProfile);
```

### 1.10 Remove .env from Git & Rotate Secrets
- **Actions:**
1. Add `.env` to `.gitignore`: `echo ".env" >> backend/.gitignore`
2. Remove from cache: `git rm --cached backend/.env`
3. Rotate MongoDB password
4. Generate new JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
5. Rotate Cloudinary API key and secret

---

## Phase 2: Data Integrity (Day 1-2)

### 2.1 Fix NoSQL Injection in Patient Search
- **File:** `backend/controllers/doctorPatientController.js` | **Line:** 31
- **Issue:** Unsanitized regex — NoSQL injection + ReDoS risk
- **Fix:**
```javascript
// Add at top of file:
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Use in search:
{ name: { $regex: escapeRegex(keyword), $options: 'i' } }
```

### 2.2 Add ObjectId Validation
- **Files:** `doctorPatientController.js`, `recordController.js`, `reportController.js`
- **Pattern:**
```javascript
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const handleInvalidId = (res) => {
  return res.status(400).json({ message: "Invalid ID format" });
};

// Before all findById/findOne with req.params IDs:
if (!isValidObjectId(patientId)) return handleInvalidId(res);
try {
  const patient = await User.findOne({ _id: patientId });
} catch (error) {
  if (error.name === 'CastError') return handleInvalidId(res);
  return res.status(500).json({ message: "Internal server error" });
}
```

### 2.3 Fix File Type Validation
- **File:** `backend/controllers/reportController.js`
- **Fix:**
```javascript
const ALLOWED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

if (!ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
  return res.status(400).json({ message: "Only PDF, JPG, PNG, and WEBP files are allowed." });
}
const ext = path.extname(req.file.originalname).toLowerCase();
if (!ALLOWED_EXTENSIONS.includes(ext)) {
  return res.status(400).json({ message: "Invalid file extension." });
}
```

### 2.4 Fix Delete Transaction
- **File:** `backend/controllers/reportController.js` | **Lines:** 67-71
- **Issue:** Cloudinary and DB delete not transactional — orphaned files possible
- **Fix:**
```javascript
try {
  await cloudinary.uploader.destroy(report.cloudinaryPublicId);
} catch (cloudinaryError) {
  console.error('Cloudinary delete warning:', cloudinaryError.message);
}

try {
  await report.deleteOne();
} catch (dbError) {
  console.error('Database delete error:', dbError);
  return res.status(500).json({ message: "Failed to delete report" });
}
```

### 2.5 Fix authValidation Conditional Validation
- **File:** `backend/middleware/authValidation.js` | **Lines:** 89-93
- **Issue:** Incorrect `.if()` API — hospitalId validation doesn't work
- **Fix:**
```javascript
// Replace .if() chain with:
body("hospitalId")
  .custom((value, { req }) => {
    if (req.body.role === 'doctor' && (!value || value.trim() === '')) {
      throw new Error("Hospital ID is required for doctors");
    }
    return true;
  })
  .trim()
```

### 2.6 Add Password Complexity
- **File:** `backend/middleware/authValidation.js` | **Lines:** 62-67
- **Fix:**
```javascript
// Add to password validation chain:
.matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
.matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
.matches(/[0-9]/).withMessage("Password must contain at least one number")
.matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character")
```

### 2.7 Fix DoseLog Schema
- **File:** `backend/models/DoseLog.js` | **Lines:** 17-21
- **Issue:** `required: true` with `default: Date.now` — contradictory
- **Fix:**
```javascript
scheduledTime: {
  type: Date,
  default: Date.now,  // Remove required: true
},

status: {
  type: String,
  enum: ['taken', 'missed', 'skipped', 'pending', 'snoozed', 'refused'],
  default: 'pending',
}
```

### 2.8 Fix Time Validation Regex
- **File:** `backend/config/requestValidation.js` | **Line:** 4
- **Fix:**
```javascript
// BEFORE: /^([01]\d|2[0-3]):([0-5]\d)$/
// AFTER:  /^([01]?\d|2[0-3]):([0-5]\d)$/
```

---

## Phase 3: Missing Functionality (Day 2)

### 3.1 Fix Stub Patient Medicines Endpoint
- **File:** `backend/routes/patient.js` | **Lines:** 30-35
- **Issue:** Returns fake response, not real data
- **Fix:**
```javascript
// BEFORE: stub response
// AFTER:
const { getMyMedicines } = require("../controllers/medicineController");
router.get("/medicines", verifyToken, requireRole("patient"), getMyMedicines);
```

### 3.2 Fix parseScheduledTime
- **File:** `backend/controllers/medicineController.js` | **Line:** 8
- **Fix:**
```javascript
// BEFORE: if (!value) return new Date();
// AFTER:  if (!value) return null;
```

### 3.3 Add Pagination to All List Endpoints
- **Files:** `recordController.js`, `reportController.js`, `notificationController.js`, `symptomController.js`
- **Pattern:**
```javascript
// Add helper:
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// Apply in controllers:
const { page, limit, skip } = getPagination(req.query);
const [records, total] = await Promise.all([
  Model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
  Model.countDocuments(query),
]);
res.json({ data: records, page, totalPages: Math.ceil(total / limit), totalCount: total });
```

---

## Phase 4: Schema Improvements (Day 2-3)

### 4.1 User Schema Consolidation
- **File:** `backend/models/User.js`
- **Fixes:**
```javascript
// Add pre-save hook:
userSchema.pre('save', function(next) {
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  next();
});

// Remove duplicate 'mobile' field, keep only 'phone'
// Add index:
userSchema.index({ role: 1 });
```

### 4.2 Add AI Summary Verification
- **File:** `backend/models/MedRecord.js`
- **Add:**
```javascript
aiSummaryVerified: {
  type: Boolean,
  default: false,
},
```

### 4.3 Add Symptom Advice Verification
- **File:** `backend/models/SymptomLog.js`
- **Add:**
```javascript
adviceVerified: {
  type: Boolean,
  default: false,
},
adviceDisclaimer: {
  type: String,
  default: "AI-generated advice is not a substitute for medical consultation.",
},
```

### 4.4 Fix Notification Metadata
- **File:** `backend/models/Notification.js`
- **Fix:** Replace `Schema.Types.Mixed` with typed subdocument

### 4.5 Sanitize Report Filename
- **File:** `backend/models/Report.js`
- **Fix:**
```javascript
originalName: {
  type: String,
  required: true,
  set: function(v) {
    return v.replace(/[\/\\..]/g, '_').substring(0, 255);
  }
},
```

---

## Phase 5: Logging & Connection Reliability (Day 3)

### 5.1 Add Winston Logger
```bash
cd backend && npm install winston
```
- **File:** `backend/middleware/logger.js` (new)
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

module.exports = { logger };
```
- **Update:** Replace `console.error` with `logger.error` throughout

### 5.2 Improve MongoDB Connection
- **File:** `backend/config/db.js`
- **Fix:**
```javascript
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
```

### 5.3 Validate Environment Strength
- **File:** `backend/config/validateEnv.js`
- **Fix:**
```javascript
// Add after JWT_SECRET check:
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

// Add NODE_ENV validation:
if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, production, or test");
}

// Return success:
return true;
```

---

## Files to Modify Summary

| Priority | File | Changes |
|----------|------|---------|
| **CRITICAL** | `server.js` | await connectDB, body limits, helmet, cors, rate-limit |
| **CRITICAL** | `middleware/verifyToken.js` | Algorithm restriction, payload validation |
| **CRITICAL** | `middleware/uploadReport.js` | Disk storage |
| **CRITICAL** | `routes/notification.js` | Add requireRole middleware |
| **CRITICAL** | `routes/qr.js` | Add QR rate limiting |
| **CRITICAL** | `.env` | Remove from git, rotate secrets |
| **HIGH** | `controllers/doctorPatientController.js` | Regex sanitization, ObjectId validation |
| **HIGH** | `controllers/recordController.js` | ObjectId validation, pagination |
| **HIGH** | `controllers/reportController.js` | File validation, delete fix |
| **HIGH** | `middleware/authValidation.js` | Fix conditional, password complexity |
| **HIGH** | `routes/patient.js` | Fix stub endpoint |
| **MEDIUM** | `models/DoseLog.js` | Fix schema, add statuses |
| **MEDIUM** | `controllers/medicineController.js` | Fix parseScheduledTime |
| **MEDIUM** | `config/requestValidation.js` | Fix regex |
| **MEDIUM** | `models/User.js` | Consolidate fields |
| **MEDIUM** | `models/MedRecord.js` | AI verification fields |
| **MEDIUM** | `models/SymptomLog.js` | Verification fields |
| **MEDIUM** | `models/Notification.js` | Fix metadata type |
| **MEDIUM** | `models/Report.js` | Sanitize filename |
| **MEDIUM** | `config/validateEnv.js` | Strength validation |
| **MEDIUM** | `config/db.js` | Connection options, retry |
| **NEW** | `middleware/logger.js` | Winston logging |

---

## Implementation Checklist

- [ ] `server.js` - await connectDB()
- [ ] `server.js` - body parser limits
- [ ] `server.js` - helmet, cors, rate-limit
- [ ] `server.js` - error handler sanitization
- [ ] `server.js` - remove EJS engine
- [ ] `middleware/verifyToken.js` - algorithm restriction
- [ ] `middleware/uploadReport.js` - disk storage
- [ ] `routes/notification.js` - add requireRole
- [ ] `routes/qr.js` - add rate limiting
- [ ] `.gitignore` - add .env
- [ ] `controllers/doctorPatientController.js` - regex sanitization
- [ ] `controllers/doctorPatientController.js` - ObjectId validation
- [ ] `controllers/recordController.js` - ObjectId validation
- [ ] `controllers/reportController.js` - file type validation
- [ ] `controllers/reportController.js` - delete transaction
- [ ] `middleware/authValidation.js` - fix conditional validation
- [ ] `middleware/authValidation.js` - password complexity
- [ ] `routes/patient.js` - fix stub endpoint
- [ ] `models/DoseLog.js` - fix schema
- [ ] `controllers/medicineController.js` - fix parseScheduledTime
- [ ] `config/requestValidation.js` - fix regex
- [ ] All list controllers - add pagination
- [ ] `models/User.js` - consolidate fields
- [ ] `models/MedRecord.js` - add AI verification
- [ ] `models/SymptomLog.js` - add verification
- [ ] `models/Notification.js` - fix metadata type
- [ ] `models/Report.js` - sanitize filename
- [ ] `config/validateEnv.js` - strength validation
- [ ] `middleware/logger.js` - create winston logger
- [ ] Run lint and typecheck
- [ ] Test all endpoints
