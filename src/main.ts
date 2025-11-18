import { Telegraf, Markup } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import express from 'express';
import moment from 'moment';
import 'dotenv/config';

import { User, Attendance, Payment, Schedule, Homework, connectDB } from './config/database';
import { 
  isTeacher, 
  t, 
  TEACHER_ID,
  backButton 
} from './utils/helpers';

import {
  showMainMenu,
  showProfile,
  showPaymentStatus,
  showPaymentList,
  showRating,
  showUncheckedHomeworks,
  showHomeworkPageHandler,
  showPaymentHistory,
  viewSchedule,
  showStudentStats,
  listStudents,
  addSchedule,
  manualHomework,
  takeAttendance,
  attendancePageHandler,
  attendanceStudentHandler,
  markAttendanceHandler,
  showStudentDetails,
  setPaymentDay,
  setPaymentAmount,
  showAttendanceHistory,
  showHomeworkHistory,
  sendReceipt,
  offlinePayment,
  confirmPayment,
  rejectReceipt,
  changeLanguage,
  setLanguage,
  startCommand,
  handleRegistration,
  handlePhoneShare,

  // O'QUVCHINI CHIQARISH
  removeStudentStart,
  confirmRemoveStudent,
  finalRemoveStudent,
  cancelRemoveStudent
} from './handlers';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

connectDB()
  .then(() => console.log('Bot va MongoDB tayyor'))
  .catch(err => {
    console.error('MongoDB ulanishda xatolik:', err);
    process.exit(1);
  });

// ==================== RO'YXATDAN O'TISH ====================
bot.start(startCommand);
bot.on('contact', handlePhoneShare);

// ==================== TEXT HANDLER — ENG MUHIM! ====================
bot.on('text', async (ctx: any) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const text = ctx.message?.text?.trim();
    const step = ctx.session?.step;

    // Ro'yxatdan o'tmagan bo'lsa
    if (!user) return handleRegistration(ctx);

    // === 1. To'lov kunini o'zgartirish ===
    if (step === 'set_payment_day') {
      const day = parseInt(text);
      if (isNaN(day) || day < 1 || day > 31) {
        return ctx.reply("Iltimos, 1-31 oralig'ida raqam kiriting:");
      }
      await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
      delete ctx.session.step;
      delete ctx.session.studentId;

      const student = await User.findById(ctx.session.lastStudentId || ctx.session.studentId);
      await ctx.reply(`To'lov kuni ${day}-kunga o'zgartirildi!`, {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
      return;
    }

    // === 2. To'lov summasini o'zgartirish ===
    if (step === 'set_payment_amount') {
      const amount = parseInt(text.replace(/\D/g, ''));
      if (isNaN(amount) || amount < 10000) {
        return ctx.reply("Iltimos, to'g'ri summa kiriting (masalan: 600000):");
      }
      await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
      delete ctx.session.step;
      delete ctx.session.studentId;

      await ctx.reply(`Oylik to'lov summasi ${amount.toLocaleString()} so'm ga o'zgartirildi!`, {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
      return;
    }

    // === 3. Jadval vaqti kiritish ===
    if (step === 'sched_time') {
      const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
      if (!timeRegex.test(text)) {
        return ctx.reply("Iltimos, vaqtni quyidagi formatda kiriting: 09:00-10:30");
      }
      await new Schedule({
        day: ctx.session.day,
        time: text,
        group: "Umumiy" // agar guruh bo'lsa keyin qo'shiladi
      }).save();

      delete ctx.session.step;
      delete ctx.session.day;

      await ctx.reply(`{ctx.session.day} kuni uchun jadval qo'shildi: ${text}`, {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
      return;
    }

    // === 4. Vazifa yuborish (o'qituvchi) ===
    if (step === 'send_homework_content') {
      const students = await User.find({ role: 'student' });
      for (const s of students) {
        await bot.telegram.sendMessage(s.telegramId, `Yangi uyga vazifa:\n\n${text}`);
      }
      delete ctx.session.step;
      await ctx.reply("Vazifa barcha o'quvchilarga yuborildi!", {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
      return;
    }

    // === 5. Boshqa holatlarda (masalan, oddiy xabarlar) ===
    // Agar hech qanday step bo'lmasa — hech narsa qilmasin
    // Yoki kerak bo'lsa: await showMainMenu(ctx);

  } catch (err) {
    console.error('Text handler xatosi:', err);
    await ctx.reply("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
  }
});

// ==================== PHOTO HANDLER (Chek va vazifa javobi) ====================
bot.on('photo', async (ctx: any) => {
  try {
    if (ctx.session?.waitingForReceipt) {
      // Chek yuborilgan
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return;

      const currentMonth = moment().format('YYYY-MM');
      const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
      if (!payment) {
        await ctx.reply("Bu oy uchun to'lov topilmadi yoki allaqachon to'langan.");
        return;
      }

      await bot.telegram.sendPhoto(TEACHER_ID(), fileId, {
        caption: `
Yangi chek keldi

O'quvchi: *${user.fullName}*
Telefon: \`${user.parentPhone}\`
Oy: *${moment().format('MMMM YYYY')}*
Summa: *${payment.amount.toLocaleString()} so'm*
        `.trim(),
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("Tasdiqlash", `confirm_receipt_${payment._id}`),
            Markup.button.callback("Rad etish", `reject_receipt_${payment._id}`)
          ]
        ]).reply_markup
      });

      delete ctx.session.waitingForReceipt;
      await ctx.reply("Chekingiz o'qituvchiga yuborildi. Tez orada tasdiqlanadi!", {
        reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
      });
    }
  } catch (err) {
    console.error('Photo handler xatosi:', err);
  }
});

// ==================== ACTION HANDLERLAR ====================
const safeActionHandler = (handler: Function) => {
  return async (ctx: any) => {
    try {
      await ctx.answerCbQuery();
      await handler(ctx);
    } catch (error) {
      console.error('Action handler xatosi:', error);
      try { await ctx.reply("Xatolik yuz berdi."); } catch (_) {}
    }
  };
};

bot.action('back_to_menu', safeActionHandler(showMainMenu));
bot.action('profile', safeActionHandler(showProfile));
bot.action('payment_status', safeActionHandler(showPaymentStatus));
bot.action('payment_list', safeActionHandler(showPaymentList));
bot.action('rating', safeActionHandler(showRating));
bot.action('check_homework', safeActionHandler(showUncheckedHomeworks));
bot.action(/hw_page_(.+)/, safeActionHandler(showHomeworkPageHandler));
bot.action('payment_history', safeActionHandler(showPaymentHistory));
bot.action('view_schedule', safeActionHandler(viewSchedule));
bot.action('student_stats', safeActionHandler(showStudentStats));

bot.action('send_receipt', safeActionHandler(sendReceipt));
bot.action('offline_payment', safeActionHandler(offlinePayment));
bot.action(/confirm_(receipt|offline)_(.+)/, safeActionHandler(confirmPayment));
bot.action(/reject_receipt_(.+)/, safeActionHandler(rejectReceipt));

bot.action('list_students', safeActionHandler(listStudents));
bot.action('add_schedule', safeActionHandler(addSchedule));
bot.action('manual_homework', safeActionHandler(manualHomework));
bot.action('take_attendance', safeActionHandler(takeAttendance));
bot.action(/attendance_page_(.+)/, safeActionHandler(attendancePageHandler));
bot.action(/attendance_student_(.+)/, safeActionHandler(attendanceStudentHandler));
bot.action(/mark_(present|late|absent)_(.+)/, safeActionHandler(markAttendanceHandler));

bot.action(/^student_([0-9a-fA-F]{24})$/, safeActionHandler(showStudentDetails));

bot.action('remove_student', safeActionHandler(removeStudentStart));
bot.action(/^remove_student_([0-9a-fA-F]{24})$/, safeActionHandler(confirmRemoveStudent));
bot.action(/^final_remove_([0-9a-fA-F]{24})$/, safeActionHandler(finalRemoveStudent));
bot.action('remove_student_cancel', safeActionHandler(cancelRemoveStudent));

bot.action(/set_payment_day_(.+)/, safeActionHandler(setPaymentDay));
bot.action(/set_payment_amount_(.+)/, safeActionHandler(setPaymentAmount));
bot.action(/attendance_history_(.+)/, safeActionHandler(showAttendanceHistory));
bot.action(/homework_history_(.+)/, safeActionHandler(showHomeworkHistory));

bot.action('change_language', safeActionHandler(changeLanguage));
bot.action(/set_language_(.+)/, safeActionHandler(setLanguage));

bot.action(/sched_day_(.+)/, safeActionHandler(async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  ctx.session.day = ctx.match[1];
  ctx.session.step = 'sched_time';
  await ctx.reply(`${ctx.session.day} kuni uchun vaqtni kiriting (masalan: 09:00-10:30):`);
}));

// ==================== SERVER ====================
const port = parseInt(process.env.PORT || '10000');
const app = express();
app.get('/', (req, res) => res.json({ 
  status: 'Bot ishlayapti!', 
  time: new Date().toISOString(),
  project: "O'quv markazi boshqaruv boti"
}));
app.listen(port, '0.0.0.0', () => console.log(`Server ${port}-portda ishga tushdi`));

// ==================== AVTO TO'LOV VA ESLATMA ====================
setInterval(async () => {
  try {
    if (moment().date() === 1) {
      const month = moment().format('YYYY-MM');
      const students = await User.find({ role: 'student' });
      for (const s of students) {
        const exists = await Payment.findOne({ userId: s._id, month });
        if (!exists) {
          await new Payment({ userId: s._id, month, amount: s.paymentAmount }).save();
        }
      }
      console.log(`Yangi oy to'lovlari yaratildi: ${month}`);
    }
  } catch (e) { console.error('Avto to\'lov xatosi:', e); }
}, 24 * 60 * 60 * 1000);

setInterval(async () => {
  try {
    const today = moment().date();
    const month = moment().format('YYYY-MM');
    const students = await User.find({ role: 'student' });
    for (const s of students) {
      if ([today, today + 1, today + 3].includes(s.paymentDay)) {
        const p = await Payment.findOne({ userId: s._id, month, paid: false });
        if (p) {
          const days = s.paymentDay - today;
          const text = days === 0 ? "BUGUN TO'LOV KUNI!" : days === 1 ? "ERTAGA TO'LOV KUNI!" : "3 kun ichida to'lov qiling!";
          await bot.telegram.sendMessage(s.telegramId, `${text}\nSumma: ${p.amount.toLocaleString()} so'm`, { parse_mode: 'Markdown' });
        }
      }
    }
  } catch (e) { console.error('Eslatma xatosi:', e); }
}, 24 * 60 * 60 * 1000);

// ==================== BOTNI ISHGA TUSHIRISH ====================
bot.launch().then(() => console.log('Bot muvaffaqiyatli ishga tushdi!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));