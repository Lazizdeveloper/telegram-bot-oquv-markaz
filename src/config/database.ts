// config/database.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_bot';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      // 5 soniya
    });
    console.log('MongoDB ulandi');
  } catch (error) {
    console.error('MongoDB ulanish xatosi:', error);
    console.log('MongoDB URI:', MONGODB_URI);
    process.exit(1);
  }
};

// ===================== USER =====================
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  parentPhone: { type: String, required: true },
  studentPhone: { type: String, default: '' },
  address: { type: String, required: true },
  language: { type: String, default: 'uz' },
  role: { type: String, enum: ['student', 'teacher','admin'], default: 'student' },
  paymentDay: { type: Number, default: 10 },
  paymentAmount: { type: Number, default: 500000 },
  createdAt: { type: Date, default: Date.now }
});

export interface IUser extends mongoose.Document {
  telegramId: number;
  fullName: string;
  phone: string;
  parentPhone: string;
  studentPhone: string;
  address: string;
  language: string;
  role: string;
  paymentDay: number;
  paymentAmount: number;
  createdAt: Date;
}

// ===================== ATTENDANCE =====================
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },                    // YYYY-MM-DD
  status: { type: String, enum: ['present', 'late', 'absent'], required: true }
});

// ===================== PAYMENT =====================
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },                   // YYYY-MM
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  method: { type: String, enum: ['receipt', 'offline', null], default: null }
});

// ===================== SCHEDULE =====================
const scheduleSchema = new mongoose.Schema({
  day: { type: String, required: true },     // Dushanba, Seshanba ...
  time: { type: String, required: true },    // 18:30
  group: { type: String, required: true }
});

// ===================== HOMEWORK =====================
const homeworkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },        // YYYY-MM-DD
  task: { type: String },                        // o‘qituvchi yozgan vazifa (ixtiyoriy)
  answerText: { type: String },                   // o‘quvchi matnli javobi
  answerPhoto: { type: String },                 // file_id
  checked: { type: Boolean, default: false },
  score: { type: Number, min: 0, max: 5 },
  checkedAt: { type: Date },                     // YANGI QO‘ShILDI
  submittedAt: { type: Date },                   // topshirilgan vaqt
  feedback: { type: String }                     // o‘qituvchi izohi
});

export interface IHomework extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  date: string;
  task?: string;
  answerText?: string;
  answerPhoto?: string;
  checked: boolean;
  score?: number;
  checkedAt?: Date;        // YANGI
  submittedAt?: Date;
  feedback?: string;
}

// ===================== MODELLAR =====================
export const User = mongoose.model<IUser>('User', userSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const Schedule = mongoose.model('Schedule', scheduleSchema);
export const Homework = mongoose.model<IHomework>('Homework', homeworkSchema);