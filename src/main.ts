// import { Telegraf, Markup } from 'telegraf';
// import LocalSession from 'telegraf-session-local';
// import express from 'express';
// import moment from 'moment';
// import 'dotenv/config';

// // Import modullar
// import { User, Attendance, Payment, Schedule, Homework } from './config/database';
// import { 
//   isTeacher, 
//   isRegistered, 
//   getLanguage, 
//   t, 
//   setMomentLocale, 
//   TEACHER_ID,
//   backButton 
// } from './utils/helpers';
// import {
//   showMainMenu,
//   showProfile,
//   showPaymentStatus,
//   showPaymentList,
//   showRating,
//   showUncheckedHomeworks,
//   showHomeworkPageHandler,
//   showPaymentHistory,
//   viewSchedule,
//   showStudentStats,
//   listStudents,
//   newDay,
//   addSchedule,
//   manualHomework,
//   takeAttendance,
//   attendancePageHandler,
//   attendanceStudentHandler,
//   markAttendanceHandler,
//   showStudentDetails,
//   setPaymentDay,
//   setPaymentAmount,
//   showAttendanceHistory,
//   showHomeworkHistory,
//   sendReceipt,
//   offlinePayment,
//   confirmPayment,
//   rejectReceipt,
//   changeLanguage,
//   setLanguage
// } from './handlers';

// // Botni ishga tushirish
// const BOT_TOKEN = process.env.BOT_TOKEN;
// if (!BOT_TOKEN) {
//   console.error('BOT_TOKEN belgilanmagan!');
//   process.exit(1);
// }

// const bot = new Telegraf(BOT_TOKEN);
// const localSession = new LocalSession({ database: 'session_db.json' });
// bot.use(localSession.middleware());

// // Start komandasi
// bot.start(async (ctx: any) => {
//   setMomentLocale(ctx);
  
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (user) {
//     await showMainMenu(ctx);
//   } else {
//     await ctx.reply(t('welcome', ctx), Markup.inlineKeyboard([
//       [Markup.button.callback("🇺🇿 O'zbek", "set_language_uz")],
//       [Markup.button.callback("🇷🇺 Русский", "set_language_ru")],
//       [Markup.button.callback("🇺🇸 English", "set_language_en")]
//     ]));
//   }
// });

// // === TEXT HANDLERLAR ===
// bot.on('text', async (ctx: any) => {
//   if (!ctx.session?.step) return;

//   const userLanguage = getLanguage(ctx);

//   if (ctx.session.step === 'reg_fullName') {
//     ctx.session.fullName = ctx.message.text.trim();
//     ctx.session.step = 'reg_phone';
//     return ctx.reply(t('enter_phone', ctx));
//   }
  
//   if (ctx.session.step === 'reg_phone') {
//     if (!/^\+998\d{9}$/.test(ctx.message.text)) {
//       return ctx.reply(t('enter_phone', ctx));
//     }
//     ctx.session.phone = ctx.message.text;
//     ctx.session.step = 'reg_address';
//     return ctx.reply(t('enter_address', ctx));
//   }
  
//   if (ctx.session.step === 'reg_address') {
//     await new User({
//       telegramId: ctx.from.id,
//       fullName: ctx.session.fullName,
//       phone: ctx.session.phone,
//       address: ctx.message.text,
//       role: isTeacher(ctx) ? 'teacher' : 'student',
//       paymentDay: 1,
//       paymentAmount: 500000,
//       language: userLanguage
//     }).save();
    
//     delete ctx.session.step;
//     ctx.reply(t('registration_success', ctx), Markup.removeKeyboard());
//     await showMainMenu(ctx);
//     return;
//   }

//   // Jadval qo'shish
//   if (ctx.session.step === 'sched_time') {
//     ctx.session.time = ctx.message.text;
//     ctx.session.step = 'sched_group';
//     ctx.reply("Guruh (A-guruh):");
//     return;
//   }
  
//   if (ctx.session.step === 'sched_group') {
//     await new Schedule({ day: ctx.session.day, time: ctx.session.time, group: ctx.message.text }).save();
//     delete ctx.session.step;
//     ctx.reply("✅ Jadval qo'shildi! /schedule");
//     return;
//   }

//   // Vazifa yuborish
//   if (ctx.session.step === 'send_homework_content' && isTeacher(ctx)) {
//     const taskText = ctx.message.text;
//     const today = moment().format('YYYY-MM-DD');
//     const students = await User.find({ role: 'student' });
//     for (const s of students) {
//       const studentLang = s.language || 'uz';
//       const homeworkMsg = t('homework_assigned', { session: { language: studentLang } }, { task: taskText });
//       await bot.telegram.sendMessage(s.telegramId, homeworkMsg);
//       await Homework.findOneAndUpdate(
//         { studentId: s._id, date: today },
//         { task: taskText },
//         { upsert: true }
//       );
//     }
//     delete ctx.session.step;
//     return ctx.reply("✅ Vazifa barcha o'quvchilarga yuborildi!");
//   }

//   // O'quvchi vazifa topshirish
//   if (ctx.session.answering_homework) {
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     const today = moment().format('YYYY-MM-DD');
//     await Homework.findOneAndUpdate(
//       { studentId: user!._id, date: today },
//       { answerText: ctx.message.text, checked: false },
//       { upsert: true, new: true }
//     );
//     ctx.reply(t('homework_submitted', ctx));
//     delete ctx.session.answering_homework;
//     return;
//   }

//   // To'lov kunini o'zgartirish
//   if (ctx.session.step === 'set_payment_day' && isTeacher(ctx)) {
//     const day = parseInt(ctx.message.text.trim());
//     if (isNaN(day) || day < 1 || day > 31) return ctx.reply("1-31 oralig'ida son kiriting.");
//     await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
//     const studentId = ctx.session.studentId;
//     delete ctx.session.step;
//     delete ctx.session.studentId;
//     ctx.reply("✅ To'lov sanasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`, ctx)]]));
//     return;
//   }

//   // To'lov summasini o'zgartirish
//   if (ctx.session.step === 'set_payment_amount' && isTeacher(ctx)) {
//     const amount = parseInt(ctx.message.text.trim().replace(/\s/g, ''));
//     if (isNaN(amount) || amount <= 0) return ctx.reply("Musbat son kiriting.");
//     await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
//     const studentId = ctx.session.studentId;
//     delete ctx.session.step;
//     delete ctx.session.studentId;
//     ctx.reply("✅ To'lov summasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`, ctx)]]));
//     return;
//   }
// });

// // === PHOTO HANDLER (CHEK QABUL QILISH) ===
// bot.on('photo', async (ctx: any) => {
//   if (ctx.session?.waitingForReceipt) {
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

//     const currentMonth = moment().format('YYYY-MM');
//     const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
//     if (!payment) {
//       delete ctx.session.waitingForReceipt;
//       return ctx.reply("Bu oy uchun to'lov topilmadi.");
//     }

//     const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
//     const caption = `
// *YANGI CHEK*

// O'quvchi: *${user.fullName}*
// Telefon: \`${user.phone}\`
// Oy: *${moment().format('MMMM YYYY')}*
// Summa: *${payment.amount.toLocaleString()} so'm*
// Vaqt: \`${moment().format('DD.MM.YYYY HH:mm')}\`
// `.trim();

//     try {
//       await bot.telegram.sendPhoto(TEACHER_ID, fileId, {
//         caption,
//         parse_mode: 'Markdown',
//         reply_markup: Markup.inlineKeyboard([
//           [
//             Markup.button.callback("✅ Tasdiqlash", `confirm_receipt_${payment._id}`),
//             Markup.button.callback("❌ Rad etish", `reject_receipt_${payment._id}`)
//           ]
//         ]).reply_markup
//       });

//       await ctx.replyWithHTML(`
// <b>Chek muvaffaqiyatli yuborildi!</b>

// O'qituvchi tekshirib, tasdiqlaydi.
// Sabr qiling...
//       `.trim(), {
//         reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
//       });
//     } catch (e) {
//       await ctx.reply("Xatolik yuz berdi. Qayta urining.");
//     }

//     delete ctx.session.waitingForReceipt;
//     return;
//   }

//   // O'qituvchi vazifa yuborish (rasm)
//   if (ctx.session?.step === 'send_homework_content' && isTeacher(ctx)) {
//     const caption = ctx.message.caption || "Uyga vazifa (rasm).";
//     const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
//     const today = moment().format('YYYY-MM-DD');
//     const students = await User.find({ role: 'student' });
//     for (const s of students) {
//       const studentLang = s.language || 'uz';
//       const homeworkMsg = t('homework_assigned', { session: { language: studentLang } }, { task: caption });
//       await bot.telegram.sendPhoto(s.telegramId, photoId, { caption: homeworkMsg });
//       await Homework.findOneAndUpdate(
//         { studentId: s._id, date: today },
//         { task: caption },
//         { upsert: true }
//       );
//     }
//     delete ctx.session.step;
//     return ctx.reply("✅ Rasmli vazifa yuborildi!");
//   }

//   // O'quvchi vazifa topshirish (rasm)
//   if (ctx.session?.answering_homework) {
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     const today = moment().format('YYYY-MM-DD');
//     const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
//     await Homework.findOneAndUpdate(
//       { studentId: user!._id, date: today },
//       { answerPhoto: photoId, checked: false },
//       { upsert: true }
//     );
//     ctx.reply(t('homework_submitted', ctx));
//     delete ctx.session.answering_homework;
//     return;
//   }
// });

// // === ACTION HANDLERLAR ===
// bot.action('back_to_menu', showMainMenu);
// bot.action('profile', showProfile);
// bot.action('payment_status', showPaymentStatus);
// bot.action('payment_list', showPaymentList);
// bot.action('rating', showRating);
// bot.action('check_homework', showUncheckedHomeworks);
// bot.action(/hw_page_(.+)/, showHomeworkPageHandler);
// bot.action('payment_history', showPaymentHistory);
// bot.action('view_schedule', viewSchedule);
// bot.action('student_stats', showStudentStats);

// // === TO'LOV HANDLERLARI ===
// bot.action('send_receipt', sendReceipt);
// bot.action('offline_payment', offlinePayment);
// bot.action(/confirm_(receipt|offline)_(.+)/, confirmPayment);
// bot.action(/reject_receipt_(.+)/, rejectReceipt);

// // === YANGI HANDLERLAR ===
// bot.action('list_students', listStudents);
// bot.action('new_day', newDay);
// bot.action('add_schedule', addSchedule);
// bot.action('manual_homework', manualHomework);
// bot.action('take_attendance', takeAttendance);
// bot.action(/attendance_page_(.+)/, attendancePageHandler);
// bot.action(/attendance_student_(.+)/, attendanceStudentHandler);
// bot.action(/mark_(present|late|absent)_(.+)/, markAttendanceHandler);

// // === O'QUVCHI MA'LUMOTLARI HANDLERLARI ===
// bot.action(/student_(.+)/, showStudentDetails);
// bot.action(/set_payment_day_(.+)/, setPaymentDay);
// bot.action(/set_payment_amount_(.+)/, setPaymentAmount);
// bot.action(/attendance_history_(.+)/, showAttendanceHistory);
// bot.action(/homework_history_(.+)/, showHomeworkHistory);

// // === TIL HANDLERLARI ===
// bot.action('change_language', changeLanguage);
// bot.action(/set_language_(.+)/, setLanguage);

// // Jadval kunini tanlash
// bot.action(/sched_day_(.+)/, async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const day = ctx.match[1];
//   ctx.session.day = day;
//   ctx.session.step = 'sched_time';
  
//   await ctx.reply(`🕒 ${day} kuni uchun vaqtni kiriting (masalan: 09:00-10:30):`);
// });

// // O'quvchi vazifa topshirish
// bot.action('submit_homework', (ctx: any) => {
//   ctx.session.answering_homework = true;
//   ctx.reply("Javobingizni yozing yoki rasm yuboring:", {
//     reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
//   });
// });

// // === SERVER ===
// const port = parseInt(process.env.PORT || '10000');
// const app = express();
// app.get('/', (req, res) => res.json({ 
//   status: 'Bot ishlayapti!', 
//   time: new Date().toISOString(),
//   features: 'Multi-language support (UZ/RU/EN)'
// }));
// app.listen(port, '0.0.0.0', () => console.log(`Server ${port}-portda ishga tushdi`));

// // === AVTOMATIK TO'LOV YARATISH ===
// setInterval(async () => {
//   const today = moment().format('YYYY-MM-DD');
//   if (today.endsWith('-01')) {
//     const students = await User.find({ role: 'student' });
//     const currentMonth = moment().format('YYYY-MM');
//     for (const s of students) {
//       const exists = await Payment.findOne({ userId: s._id, month: currentMonth });
//       if (!exists) {
//         await new Payment({ userId: s._id, month: currentMonth, amount: s.paymentAmount }).save();
//       }
//     }
//     console.log(`Yangi oy: ${currentMonth} uchun to'lovlar yaratildi`);
//   }
// }, 24 * 60 * 60 * 1000);

// // === TO'LOV ESLATMA ===
// setInterval(async () => {
//   const today = moment().date();
//   const currentMonth = moment().format('YYYY-MM');
//   const students = await User.find({ role: 'student' });

//   for (const student of students) {
//     const paymentDay = student.paymentDay;
//     const daysUntil = paymentDay - today;

//     let payment = await Payment.findOne({ userId: student._id, month: currentMonth });
//     if (!payment) continue;

//     let message = '';
//     let sent = false;

//     // 3 kun oldin
//     if (daysUntil === 3 && !payment.paid) {
//       message = `
// *To'lov muddati yaqinlashmoqda!*

// 3 kun ichida to'lang: *${paymentDay}-sana*
// Summa: *${payment.amount.toLocaleString()} so'm*
// /payment → hozir to'lash
//       `.trim();
//       sent = true;
//     }

//     // 1 kun oldin
//     if (daysUntil === 1 && !payment.paid) {
//       message = `
// *ERTAGA TO'LOV KUNI!*

// Oxirgi imkoniyat: *${paymentDay}-sana*
// Summa: *${payment.amount.toLocaleString()} so'm*
// /payment → hozir to'lash
//       `.trim();
//       sent = true;
//     }

//     // To'lov kuni
//     if (daysUntil === 0 && !payment.paid) {
//       message = `
// *BUGUN TO'LOV KUNI!*

// Summa: *${payment.amount.toLocaleString()} so'm*
// /payment → hozir to'lash
//       `.trim();
//       sent = true;
//     }

//     if (sent) {
//       try {
//         await bot.telegram.sendMessage(student.telegramId, message, { parse_mode: 'Markdown' });
//       } catch (e) {
//         console.log(`Eslatma yuborilmadi: ${student.fullName}`);
//       }
//     }
//   }
// }, 24 * 60 * 60 * 1000);

// // Botni ishga tushirish
// bot.launch().then(() => console.log('Bot ishga tushdi!'));
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));


import { Telegraf, Markup } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import express from 'express';
import moment from 'moment';
import 'dotenv/config';

// Import modullar
import { User, Attendance, Payment, Schedule, Homework, connectDB } from './config/database';
import { 
  isTeacher, 
  getLanguage, 
  t, 
  setMomentLocale, 
  TEACHER_ID,
  PAYMENT_CARD_NUMBER,
  PAYMENT_CARD_NAME,
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
  // Yangi ro'yxatdan o'tish handlerlari
  startCommand,
  handleRegistration,
  handlePhoneShare,
  sharePhoneButton
} from './handlers';

// Botni ishga tushirish
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN belgilanmagan!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// MongoDB ulanish
connectDB().then(() => {
  console.log('✅ Bot va MongoDB tayyor');
}).catch(error => {
  console.error('❌ MongoDB ulanishida xatolik:', error);
});

// ==================== RO'YXATDAN O'TISH TIZIMI ====================

// Start komandasi
bot.start(startCommand);

// Telefon ulashish tugmasi
bot.action('share_phone', sharePhoneButton);

// ==================== MATNLI XABARLAR ====================

bot.on('text', async (ctx: any) => {
  try {
    // Avval ro'yxatdan o'tish handlerini tekshiramiz
    const existingUser = await User.findOne({ telegramId: ctx.from.id });
    if (!existingUser) {
      return handleRegistration(ctx);
    }

    // Agar foydalanuvchi ro'yxatdan o'tgan bo'lsa, boshqa handlerlarni ishlatamiz
    if (!ctx.session?.step) return;

    // Jadval qo'shish
    if (ctx.session.step === 'sched_time') {
      ctx.session.time = ctx.message.text;
      ctx.session.step = 'sched_group';
      ctx.reply("Guruh (A-guruh):");
      return;
    }
    
    if (ctx.session.step === 'sched_group') {
      await new Schedule({ day: ctx.session.day, time: ctx.session.time, group: ctx.message.text }).save();
      delete ctx.session.step;
      ctx.reply("✅ Jadval qo'shildi!");
      return;
    }

    // Vazifa yuborish
    if (ctx.session.step === 'send_homework_content' && isTeacher(ctx)) {
      const taskText = ctx.message.text;
      const today = moment().format('YYYY-MM-DD');
      const students = await User.find({ role: 'student' });
      for (const s of students) {
        const studentLang = s.language || 'uz';
        const homeworkMsg = t('homework_assigned', { session: { language: studentLang } }, { task: taskText });
        await bot.telegram.sendMessage(s.telegramId, homeworkMsg);
        await Homework.findOneAndUpdate(
          { studentId: s._id, date: today },
          { task: taskText },
          { upsert: true }
        );
      }
      delete ctx.session.step;
      return ctx.reply("✅ Vazifa barcha o'quvchilarga yuborildi!");
    }

    // O'quvchi vazifa topshirish
    if (ctx.session.answering_homework) {
      const user = await User.findOne({ telegramId: ctx.from.id });
      const today = moment().format('YYYY-MM-DD');
      await Homework.findOneAndUpdate(
        { studentId: user!._id, date: today },
        { answerText: ctx.message.text, checked: false },
        { upsert: true, new: true }
      );
      ctx.reply(t('homework_submitted', ctx));
      delete ctx.session.answering_homework;
      return;
    }

    // To'lov kunini o'zgartirish
    if (ctx.session.step === 'set_payment_day' && isTeacher(ctx)) {
      const day = parseInt(ctx.message.text.trim());
      if (isNaN(day) || day < 1 || day > 31) return ctx.reply("1-31 oralig'ida son kiriting.");
      await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
      const studentId = ctx.session.studentId;
      delete ctx.session.step;
      delete ctx.session.studentId;
      ctx.reply("✅ To'lov sanasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`, ctx)]]));
      return;
    }

    // To'lov summasini o'zgartirish
    if (ctx.session.step === 'set_payment_amount' && isTeacher(ctx)) {
      const amount = parseInt(ctx.message.text.trim().replace(/\s/g, ''));
      if (isNaN(amount) || amount <= 0) return ctx.reply("Musbat son kiriting.");
      await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
      const studentId = ctx.session.studentId;
      delete ctx.session.step;
      delete ctx.session.studentId;
      ctx.reply("✅ To'lov summasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`, ctx)]]));
      return;
    }
  } catch (error) {
    console.error('Text handler xatosi:', error);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
  }
});

// ==================== KONTAKT ULASHISH ====================

bot.on('contact', handlePhoneShare);

// ==================== PHOTO HANDLER (CHEK QABUL QILISH) ====================

bot.on('photo', async (ctx: any) => {
  try {
    if (ctx.session?.waitingForReceipt) {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

      const currentMonth = moment().format('YYYY-MM');
      const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
      if (!payment) {
        delete ctx.session.waitingForReceipt;
        return ctx.reply("Bu oy uchun to'lov topilmadi.");
      }

      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const caption = `
*YANGI CHEK*

O'quvchi: *${user.fullName}*
Ota-ona raqami: \`${user.parentPhone}\`
Oy: *${moment().format('MMMM YYYY')}*
Summa: *${payment.amount.toLocaleString()} so'm*
Vaqt: \`${moment().format('DD.MM.YYYY HH:mm')}\`
`.trim();

      try {
        await bot.telegram.sendPhoto(TEACHER_ID(), fileId, {
          caption,
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Tasdiqlash", `confirm_receipt_${payment._id}`),
              Markup.button.callback("❌ Rad etish", `reject_receipt_${payment._id}`)
            ]
          ]).reply_markup
        });

        await ctx.replyWithHTML(`
<b>Chek muvaffaqiyatli yuborildi!</b>

O'qituvchi tekshirib, tasdiqlaydi.
Sabr qiling...
        `.trim(), {
          reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
        });
      } catch (e) {
        await ctx.reply("Xatolik yuz berdi. Qayta urining.");
      }

      delete ctx.session.waitingForReceipt;
      return;
    }

    // O'qituvchi vazifa yuborish (rasm)
    if (ctx.session?.step === 'send_homework_content' && isTeacher(ctx)) {
      const caption = ctx.message.caption || "Uyga vazifa (rasm).";
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const today = moment().format('YYYY-MM-DD');
      const students = await User.find({ role: 'student' });
      for (const s of students) {
        const studentLang = s.language || 'uz';
        const homeworkMsg = t('homework_assigned', { session: { language: studentLang } }, { task: caption });
        await bot.telegram.sendPhoto(s.telegramId, photoId, { caption: homeworkMsg });
        await Homework.findOneAndUpdate(
          { studentId: s._id, date: today },
          { task: caption },
          { upsert: true }
        );
      }
      delete ctx.session.step;
      return ctx.reply("✅ Rasmli vazifa yuborildi!");
    }

    // O'quvchi vazifa topshirish (rasm)
    if (ctx.session?.answering_homework) {
      const user = await User.findOne({ telegramId: ctx.from.id });
      const today = moment().format('YYYY-MM-DD');
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await Homework.findOneAndUpdate(
        { studentId: user!._id, date: today },
        { answerPhoto: photoId, checked: false },
        { upsert: true }
      );
      ctx.reply(t('homework_submitted', ctx));
      delete ctx.session.answering_homework;
      return;
    }
  } catch (error) {
    console.error('Photo handler xatosi:', error);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
  }
});

// ==================== ACTION HANDLERLAR ====================

// Callback query xatolarini bartaraf qilish uchun wrapper funksiya
const safeActionHandler = (handler: Function) => {
  return async (ctx: any) => {
    try {
      // Avval tezda callback query ga javob beramiz
      try {
        await ctx.answerCbQuery();
      } catch (error) {
        console.log('Callback query already expired, continuing...');
      }
      await handler(ctx);
    } catch (error) {
      console.error('Action handler xatosi:', error);
      try {
        await ctx.reply("❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      } catch (e) {
        // Xabar yuborish ham xato bersa, hech narsa qilmaymiz
      }
    }
  };
};

// Asosiy menyu va boshqa handlerlar
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

// To'lov handlerlari
bot.action('send_receipt', safeActionHandler(sendReceipt));
bot.action('offline_payment', safeActionHandler(offlinePayment));
bot.action(/confirm_(receipt|offline)_(.+)/, safeActionHandler(confirmPayment));
bot.action(/reject_receipt_(.+)/, safeActionHandler(rejectReceipt));

// O'qituvchi handlerlari
bot.action('list_students', safeActionHandler(listStudents));
bot.action('add_schedule', safeActionHandler(addSchedule));
bot.action('manual_homework', safeActionHandler(manualHomework));
bot.action('take_attendance', safeActionHandler(takeAttendance));
bot.action(/attendance_page_(.+)/, safeActionHandler(attendancePageHandler));
bot.action(/attendance_student_(.+)/, safeActionHandler(attendanceStudentHandler));
bot.action(/mark_(present|late|absent)_(.+)/, safeActionHandler(markAttendanceHandler));

// O'quvchi ma'lumotlari handlerlari
bot.action(/student_(.+)/, safeActionHandler(showStudentDetails));
bot.action(/set_payment_day_(.+)/, safeActionHandler(setPaymentDay));
bot.action(/set_payment_amount_(.+)/, safeActionHandler(setPaymentAmount));
bot.action(/attendance_history_(.+)/, safeActionHandler(showAttendanceHistory));
bot.action(/homework_history_(.+)/, safeActionHandler(showHomeworkHistory));

// Til handlerlari
bot.action('change_language', safeActionHandler(changeLanguage));
bot.action(/set_language_(.+)/, safeActionHandler(setLanguage));

// Jadval kunini tanlash
bot.action(/sched_day_(.+)/, safeActionHandler(async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const day = ctx.match[1];
  ctx.session.day = day;
  ctx.session.step = 'sched_time';
  
  await ctx.reply(`🕒 ${day} kuni uchun vaqtni kiriting (masalan: 09:00-10:30):`);
}));

// O'quvchi vazifa topshirish
bot.action('submit_homework', safeActionHandler(async (ctx: any) => {
  ctx.session.answering_homework = true;
  ctx.reply("Javobingizni yozing yoki rasm yuboring:", {
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
  });
}));

// ==================== SERVER ====================

const port = parseInt(process.env.PORT || '10000');
const app = express();
app.get('/', (req, res) => res.json({ 
  status: 'Bot ishlayapti!', 
  time: new Date().toISOString(),
  features: 'O\'quv markazi boshqaruv tizimi'
}));
app.listen(port, '0.0.0.0', () => console.log(`✅ Server ${port}-portda ishga tushdi`));

// ==================== AVTOMATIK TO'LOV YARATISH ====================

setInterval(async () => {
  try {
    const today = moment().format('YYYY-MM-DD');
    if (today.endsWith('-01')) {
      const students = await User.find({ role: 'student' });
      const currentMonth = moment().format('YYYY-MM');
      for (const s of students) {
        const exists = await Payment.findOne({ userId: s._id, month: currentMonth });
        if (!exists) {
          await new Payment({ userId: s._id, month: currentMonth, amount: s.paymentAmount }).save();
        }
      }
      console.log(`✅ Yangi oy: ${currentMonth} uchun to'lovlar yaratildi`);
    }
  } catch (error) {
    console.error('Avtomatik to\'lov yaratish xatosi:', error);
  }
}, 24 * 60 * 60 * 1000);

// ==================== TO'LOV ESLATMA ====================

setInterval(async () => {
  try {
    const today = moment().date();
    const currentMonth = moment().format('YYYY-MM');
    const students = await User.find({ role: 'student' });

    for (const student of students) {
      const paymentDay = student.paymentDay;
      const daysUntil = paymentDay - today;

      let payment = await Payment.findOne({ userId: student._id, month: currentMonth });
      if (!payment) continue;

      let message = '';
      let sent = false;

      // 3 kun oldin
      if (daysUntil === 3 && !payment.paid) {
        message = `
*To'lov muddati yaqinlashmoqda!*

3 kun ichida to'lang: *${paymentDay}-sana*
Summa: *${payment.amount.toLocaleString()} so'm*
/payment → hozir to'lash
        `.trim();
        sent = true;
      }

      // 1 kun oldin
      if (daysUntil === 1 && !payment.paid) {
        message = `
*ERTAGA TO'LOV KUNI!*

Oxirgi imkoniyat: *${paymentDay}-sana*
Summa: *${payment.amount.toLocaleString()} so'm*
/payment → hozir to'lash
        `.trim();
        sent = true;
      }

      // To'lov kuni
      if (daysUntil === 0 && !payment.paid) {
        message = `
*BUGUN TO'LOV KUNI!*

Summa: *${payment.amount.toLocaleString()} so'm*
/payment → hozir to'lash
        `.trim();
        sent = true;
      }

      if (sent) {
        try {
          await bot.telegram.sendMessage(student.telegramId, message, { parse_mode: 'Markdown' });
        } catch (e) {
          console.log(`Eslatma yuborilmadi: ${student.fullName}`);
        }
      }
    }
  } catch (error) {
    console.error('To\'lov eslatma xatosi:', error);
  }
}, 24 * 60 * 60 * 1000);

// ==================== BOTNI ISHGA TUSHIRISH ====================

bot.launch().then(() => console.log('✅ Bot ishga tushdi!')).catch(error => {
  console.error('❌ Bot ishga tushirishda xatolik:', error);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Umumiy xatolarni qayta ishlash
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});