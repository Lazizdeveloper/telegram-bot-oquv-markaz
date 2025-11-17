import { User, Attendance, Payment, Homework, Schedule } from '../config/database';
import moment from 'moment';

export class DatabaseHelper {
  static async findUser(telegramId: number): Promise<any> {
    return await User.findOne({ telegramId });
  }

  static async createUser(userData: any): Promise<any> {
    return await User.create(userData);
  }

  static async updateUser(userId: string, updateData: any): Promise<any> {
    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  static async getAllStudents(): Promise<any[]> {
    return await User.find({ role: 'student' }).sort({ fullName: 1 });
  }

  static async getUserById(userId: string): Promise<any> {
    return await User.findById(userId);
  }

  static async getAttendanceStats(userId: string): Promise<any> {
    return { present: 0, late: 0, absent: 0 };
  }

  static async getCurrentPayment(userId: string): Promise<any> {
    const currentMonth = moment().format('YYYY-MM');
    return await Payment.findOne({ 
      userId, 
      month: currentMonth 
    }) || { paid: false, amount: 500000 };
  }

  static async createMonthlyPayments(): Promise<void> {
    // Implement later
  }

  static async confirmPayment(paymentId: string, method: 'receipt' | 'offline'): Promise<any> {
    return await Payment.findByIdAndUpdate(
      paymentId,
      { 
        paid: true, 
        paidAt: new Date(),
        method: method
      },
      { new: true }
    ).populate('userId');
  }

  static async markAttendance(studentId: string, date: string, status: string): Promise<void> {
    await Attendance.findOneAndUpdate(
      { userId: studentId, date },
      { status },
      { upsert: true, new: true }
    );
  }

  static async getTodayAttendance(date: string): Promise<any[]> {
    return await Attendance.find({ date }).populate('userId');
  }

  static async getMonthlyPayments(month: string): Promise<any[]> {
    return await Payment.find({ month }).populate('userId');
  }

  static async getPaymentHistory(userId: string): Promise<any[]> {
    return await Payment.find({ userId }).sort({ month: -1 });
  }

  static async getUncheckedHomeworks(): Promise<any[]> {
    return await Homework.find({ reviewed: false }).populate('studentId');
  }

  static async getAllSchedules(): Promise<any[]> {
    return await Schedule.find().sort({ day: 1 });
  }

  static async getAttendanceHistory(userId: string): Promise<any[]> {
    return await Attendance.find({ userId }).sort({ date: -1 });
  }

  static async getHomeworkHistory(userId: string): Promise<any[]> {
    return await Homework.find({ studentId: userId }).sort({ date: -1 });
  }

  static async getHomeworkStats(userId: string): Promise<any> {
    return { completed: 0, total: 0 };
  }

  static async initializeDailyAttendance(): Promise<void> {
    // Implement later
  }
}