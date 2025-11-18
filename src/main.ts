import { Telegraf, Markup } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import express from 'express';
import moment from 'moment';
import 'moment/locale/uz';
import 'dotenv/config';

import { User, Attendance, Payment, Schedule, Homework, connectDB } from './config/database';
import { 
  isTeacher, 
  t, 
  TEACHER_ID,
  backButton,
  escapeMarkdownV2,
  safeAnswerCbQuery
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
  // viewSchedule olib tashlandi (handlers da yo‘q)
  showStudentStats,
  listStudents,
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

  // PROFIL TAHRIRLASH
  editProfile,
  handleProfileEdit,
  cancelEdit,

  // O'QUVCHINI CHIQARISH
  removeStudentStart,
  confirmRemoveStudent,
  finalRemoveStudent,
  cancelRemoveStudent,

  // JADVAL BOSHQARUV
  manageSchedule,
  addSchedule,
  editScheduleStart,
  deleteScheduleStart,
  handleScheduleText
} from './handlers';

// ==================== BOT SOZLASH ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN .env faylida topilmadi!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// ==================== DB ULASH ====================
connectDB()
  .then(() => console.log('MongoDB ulandi'))
  .catch(err => {
    console.error('MongoDB ulanishda xatolik:', err);
    process.exit(1);
  });

// ==================== START & RO'YXATDAN O'TISH ====================
bot.start(startCommand);
bot.on('contact', handlePhoneShare);

// ==================== XAVFSIZ ACTION ====================
const safeAction = (handler: Function) => async (ctx: any) => {
  try {
    await safeAnswerCbQuery(ctx);
    await handler(ctx);
  } catch (error: any) {
    if (error?.description?.includes('query is too old')) return;
    console.error('Action xatosi:', error);
    try { await ctx.reply("Xatolik yuz berdi."); } catch {}
  }
};

// ==================== TEXT HANDLER ====================
bot.on('text', async (ctx: any) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return handleRegistration(ctx);

    // 1. Profil tahrirlash
    if (ctx.session?.editStep) {
      await handleProfileEdit(ctx);
      return;
    }

    // 2. Jadval kiritish/tahrirlash
    if (ctx.session?.scheduleStep) {
      await handleScheduleText(ctx);
      return;
    }

    // 3. To'lov kuni yoki summasi
    if (ctx.session?.step === 'set_payment_day' || ctx.session?.step === 'set_payment_amount') {
      const text = ctx.message.text.trim();

      if (ctx.session.step === 'set_payment_day') {
        const day = parseInt(text);
        if (isNaN(day) || day < 1 || day > 31) return ctx.reply("1-31 oralig'ida raqam kiriting:");
        await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
        await ctx.reply(`To'37lov kuni ${day}-kunga o'zgartirildi!`, {
          reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
        });
      }

      if (ctx.session.step === 'set_payment_amount') {
        const amount = parseInt(text.replace(/\D/g, ''));
        if (isNaN(amount) || amount < 10000) return ctx.reply("To'g'ri summa kiriting:");
        await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
        await ctx.reply(`Oylik to'lov ${amount.toLocaleString()} so'm ga o'zgartirildi!`, {
          reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
        });
      }

      delete ctx.session.step;
      delete ctx.session.studentId;
      return;
    }

    // 4. Vazifa yuborish
    if (ctx.session?.step === 'send_homework_content') {
      const students = await User.find({ role: 'student' });
      for (const s of students) {
        await bot.telegram.sendMessage(s.telegramId, `Yangi uyga vazifa:\n\n${ctx.message.text}`);
      }
      delete ctx.session.step;
      await ctx.reply("Vazifa hammaga yuborildi!", {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
    }
  } catch (err) {
    console.error('Text handler xatosi:', err);
  }
});

// ==================== CHEK (RASMLI TO'LOV) ====================
bot.on('photo', async (ctx: any) => {
  if (!ctx.session?.waitingForReceipt) return;

  try {
    const fileId = ctx.message.photo.at(-1)!.file_id;
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;

    const month = moment().format('YYYY-MM');
    const payment = await Payment.findOne({ userId: user._id, month, paid: false });
    if (!payment) return ctx.reply("Bu oy to'lovi topilmadi yoki allaqachon to'langan.");

    await bot.telegram.sendPhoto(TEACHER_ID(), fileId, {
      caption: escapeMarkdownV2(
        `Yangi chek\n\nO'quvchi: *${user.fullName}*\nTelefon: \`${user.parentPhone}\`\nOy: *${moment().format('MMMM YYYY')}*\nSumma: *${payment.amount.toLocaleString()} so'm*`
      ),
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("Tasdiqlash", `confirm_receipt_${payment._id}`),
          Markup.button.callback("Rad etish", `reject_receipt_${payment._id}`)
        ]
      ]).reply_markup
    });

    delete ctx.session.waitingForReceipt;
    await ctx.reply("Chek yuborildi!", {
      reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
    });
  } catch (err) {
    console.error('Chek qabul qilishda xato:', err);
  }
});

// ==================== BARCHA ACTIONLAR ====================
bot.action('back_to_menu', safeAction(showMainMenu));
bot.action('profile', safeAction(showProfile));
bot.action('edit_profile', safeAction(editProfile));
bot.action('cancel_edit', safeAction(cancelEdit));

bot.action('payment_status', safeAction(showPaymentStatus));
bot.action('payment_list', safeAction(showPaymentList));
bot.action('rating', safeAction(showRating));
bot.action('check_homework', safeAction(showUncheckedHomeworks));
bot.action(/hw_page_(.+)/, safeAction(showHomeworkPageHandler));
bot.action('payment_history', safeAction(showPaymentHistory));
bot.action('student_stats', safeAction(showStudentStats));

bot.action('send_receipt', safeAction(sendReceipt));
bot.action('offline_payment', safeAction(offlinePayment));
bot.action(/confirm_(receipt|offline)_(.+)/, safeAction(confirmPayment));
bot.action(/reject_receipt_(.+)/, safeAction(rejectReceipt));

bot.action('list_students', safeAction(listStudents));
bot.action('manual_homework', safeAction(manualHomework));
bot.action('take_attendance', safeAction(takeAttendance));
bot.action(/attendance_page_(.+)/, safeAction(attendancePageHandler));
bot.action(/attendance_student_(.+)/, safeAction(attendanceStudentHandler));
bot.action(/mark_(present|late|absent)_(.+)/, safeAction(markAttendanceHandler));

bot.action(/^student_([0-9a-fA-F]{24})$/, safeAction(showStudentDetails));

bot.action('remove_student', safeAction(removeStudentStart));
bot.action(/^remove_student_([0-9a-fA-F]{24})$/, safeAction(confirmRemoveStudent));
bot.action(/^final_remove_([0-9a-fA-F]{24})$/, safeAction(finalRemoveStudent));
bot.action('remove_student_cancel', safeAction(cancelRemoveStudent));

bot.action(/set_payment_day_(.+)/, safeAction(setPaymentDay));
bot.action(/set_payment_amount_(.+)/, safeAction(setPaymentAmount));
bot.action(/attendance_history_(.+)/, safeAction(showAttendanceHistory));
bot.action(/homework_history_(.+)/, safeAction(showHomeworkHistory));

bot.action('change_language', safeAction(changeLanguage));
bot.action(/set_language_(.+)/, safeAction(setLanguage));

// ==================== JADVAL BOSHQARUV ACTIONLARI ====================
bot.action('manage_schedule', safeAction(manageSchedule));
bot.action('add_schedule', safeAction(addSchedule));
bot.action('edit_schedule', safeAction(editScheduleStart));
bot.action('delete_schedule', safeAction(deleteScheduleStart));

// Hafta kuni tanlash
bot.action(/^sched_day_(.+)$/, safeAction(async (ctx: any) => {
  const day = ctx.match[1];
  ctx.session.newSchedule = { day };
  ctx.session.scheduleStep = 'input_time';

  await ctx.reply(escapeMarkdownV2(`*${day}* uchun vaqtni kiriting (masalan: 18:30):`), {
    parse_mode: 'MarkdownV2',
    reply_markup: Markup.inlineKeyboard([[Markup.button.callback("Bekor qilish", "manage_schedule")]]).reply_markup
  });
}));

// Tahrirlash
bot.action(/^edit_sched_(.+)$/, safeAction(async (ctx: any) => {
  const id = ctx.match[1];
  const sched = await Schedule.findById(id);
  if (!sched) return ctx.reply("Jadval topilmadi.");

  ctx.session.editingSchedule = id;
  ctx.session.scheduleStep = 'edit_time';

  await ctx.reply(
    escapeMarkdownV2(`Joriy jadval:\n${sched.day} | ${sched.time} | ${sched.group}\n\nYangi vaqtni kiriting:`),
    { parse_mode: 'MarkdownV2' }
  );
}));

// O‘chirish
bot.action(/^confirm_delete_(.+)$/, safeAction(async (ctx: any) => {
  const id = ctx.match[1];
  const sched = await Schedule.findById(id);
  if (!sched) return;

  await Schedule.findByIdAndDelete(id);
  await ctx.editMessageText(escapeMarkdownV2(`Jadval o‘chirildi!\n${sched.day} | ${sched.time} | ${sched.group}`), {
    reply_markup: Markup.inlineKeyboard([[Markup.button.callback("Jadval", "manage_schedule")]]).reply_markup
  });
}));

// ==================== SERVER ====================
const port = Number(process.env.PORT) || 10000;
const app = express();
app.get('/', (req, res) => res.json({ status: 'Bot ishlayapti!', time: new Date().toISOString() }));
app.listen(port, '0.0.0.0', () => console.log(`Server ${port}-portda ishga tushdi`));

// ==================== AVTO TO'LOV (1-kun) ====================
setInterval(async () => {
  try {
    if (moment().date() === 1) {
      const month = moment().format('YYYY-MM');
      const students = await User.find({ role: 'student' });

      for (const student of students) {
        const exists = await Payment.findOne({ userId: student._id, month });
        if (!exists) {
          await new Payment({
            userId: student._id,
            month,
            amount: student.paymentAmount || 600000
          }).save();
        }
      }
      console.log(`Yangi oy to'lovlari yaratildi: ${month}`);
    }
  } catch (e) {
    console.error('Avto to\'lov xatosi:', e);
  }
}, 24 * 60 * 60 * 1000);

// ==================== BOT ISHGA TUSHIRISH ====================
bot.launch().then(() => console.log('Bot muvaffaqiyatli ishga tushdi!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));