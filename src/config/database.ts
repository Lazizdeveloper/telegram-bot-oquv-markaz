// import mongoose, { Schema, Document, Types } from 'mongoose';
// import 'dotenv/config';

// const DB_URI = process.env.DB_URI;

// if (!DB_URI) {
//   console.error('DB_URI belgilanmagan!');
//   process.exit(1);
// }

// // MongoDB ulanish
// mongoose.connect(DB_URI);
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB xatosi:'));
// db.once('open', () => console.log('MongoDB ulandi'));

// // === INTERFACELAR ===
// export interface IUser extends Document {
//   telegramId: number;
//   fullName: string;
//   phone: string;
//   address: string;
//   role: 'student' | 'teacher';
//   group?: string;
//   registrationDate: Date;
//   paymentDay: number;
//   paymentAmount: number;
//   language: 'uz' | 'ru' | 'en';
// }

// export interface IAttendance extends Document {
//   userId: Types.ObjectId;
//   date: string;
//   status: 'present' | 'late' | 'absent';
//   reason?: string;
// }

// export interface IPayment extends Document {
//   userId: Types.ObjectId;
//   month: string;
//   amount: number;
//   paid: boolean;
//   paidAt?: Date;
//   method?: 'receipt' | 'offline';
// }

// export interface ISchedule extends Document {
//   day: string;
//   time: string;
//   group: string;
// }

// export interface IHomework extends Document {
//   studentId: Types.ObjectId;
//   date: string;
//   task: string;
//   answerText?: string;
//   answerPhoto?: string;
//   checked: boolean;
//   score?: number;
//   feedback?: string;
// }

// // === SCHEMALAR ===
// const UserSchema = new Schema<IUser>({
//   telegramId: { type: Number, required: true, unique: true },
//   fullName: { type: String, required: true },
//   phone: { type: String, required: true },
//   address: { type: String, required: true },
//   role: { type: String, default: 'student' },
//   group: String,
//   registrationDate: { type: Date, default: Date.now },
//   paymentDay: { type: Number, default: 1, min: 1, max: 31 },
//   paymentAmount: { type: Number, default: 500000 },
//   language: { type: String, default: 'uz' }
// });

// const AttendanceSchema = new Schema<IAttendance>({
//   userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: String, required: true },
//   status: { type: String, enum: ['present', 'late', 'absent'], required: true },
//   reason: String
// });

// const PaymentSchema = new Schema<IPayment>({
//   userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   month: { type: String, required: true },
//   amount: { type: Number, required: true },
//   paid: { type: Boolean, default: false },
//   paidAt: { type: Date },
//   method: { type: String, enum: ['receipt', 'offline'] }
// });

// const ScheduleSchema = new Schema<ISchedule>({
//   day: { type: String, required: true },
//   time: { type: String, required: true },
//   group: { type: String, required: true }
// });

// const HomeworkSchema = new Schema<IHomework>({
//   studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: String, required: true },
//   task: { type: String, required: true },
//   answerText: String,
//   answerPhoto: String,
//   checked: { type: Boolean, default: false },
//   score: { type: Number, min: 1, max: 5 },
//   feedback: String
// });

// // Indexlar
// AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// PaymentSchema.index({ userId: 1, month: 1 }, { unique: true });
// HomeworkSchema.index({ studentId: 1, date: 1 }, { unique: true });

// // === MODELLAR ===
// export const User = mongoose.model<IUser>('User', UserSchema);
// export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
// export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
// export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
// export const Homework = mongoose.model<IHomework>('Homework', HomeworkSchema);


// config/database.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_bot';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 soniya
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB ulandi');
  } catch (error) {
    console.error('❌ MongoDB ulanish xatosi:', error);
    console.log('MongoDB URI:', MONGODB_URI);
    process.exit(1);
  }
};

// Qolgan schema va modellar...
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  parentPhone: { type: String, required: true },
  studentPhone: { type: String, default: '' },
  address: { type: String, required: true },
  language: { type: String, default: 'uz' },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
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

// Attendance schema
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'late', 'absent'], required: true }
});

// Payment schema
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  method: { type: String, enum: ['receipt', 'offline'] }
});

// Schedule schema
const scheduleSchema = new mongoose.Schema({
  day: String,
  time: String,
  group: String
});

// Homework schema
const homeworkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  task: String,
  answerText: String,
  answerPhoto: String,
  checked: { type: Boolean, default: false },
  score: { type: Number, min: 0, max: 5 },
  feedback: String
});

export interface IHomework extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  date: string;
  task?: string;
  answerText?: string;
  answerPhoto?: string;
  checked: boolean;
  score?: number;
  feedback?: string;
}

export const User = mongoose.model<IUser>('User', userSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const Schedule = mongoose.model('Schedule', scheduleSchema);
export const Homework = mongoose.model<IHomework>('Homework', homeworkSchema);