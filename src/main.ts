import { Telegraf, Context, Markup } from 'telegraf';
import mongoose, { Schema, Document, Types } from 'mongoose';
import LocalSession from 'telegraf-session-local';
import moment from 'moment';
import 'moment/locale/uz';
import 'dotenv/config';
import express from 'express';

// .env
const BOT_TOKEN = process.env.BOT_TOKEN;
const TEACHER_ID = Number(process.env.TEACHER_ID);
const DB_URI = process.env.DB_URI;
const PAYMENT_CARD_NUMBER = "4073 4200 2998 1648";
const PAYMENT_CARD_NAME = "Anvar G'aniyev";

if (!BOT_TOKEN || !TEACHER_ID || !DB_URI) {
  console.error('BOT_TOKEN, TEACHER_ID yoki DB_URI belgilanmagan!');
  process.exit(1);
}

// MongoDB
mongoose.connect(DB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB xatosi:'));
db.once('open', () => console.log('MongoDB ulandi'));

// === YORDAMCHI FUNKSIYA ===
const backButton = (callbackData: string) => Markup.button.callback("Orqaga", callbackData);

// === MODELLAR ===
interface IUser extends Document {
  telegramId: number;
  fullName: string;
  phone: string;
  address: string;
  role: 'student' | 'teacher';
  group?: string;
  registrationDate: Date;
  paymentDay: number;
  paymentAmount: number;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, default: 'student' },
  group: String,
  registrationDate: { type: Date, default: Date.now },
  paymentDay: { type: Number, default: 1, min: 1, max: 31 },
  paymentAmount: { type: Number, default: 500000 }
});

interface IAttendance extends Document {
  userId: Types.ObjectId;
  date: string;
  status: 'present' | 'late' | 'absent';
  reason?: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'late', 'absent'], required: true },
  reason: String
});

interface IPayment extends Document {
  userId: Types.ObjectId;
  month: string;
  amount: number;
  paid: boolean;
  paidAt?: Date;
  method?: 'receipt' | 'offline';
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  method: { type: String, enum: ['receipt', 'offline'] }
});

interface ISchedule extends Document {
  day: string;
  time: string;
  group: string;
}

const ScheduleSchema = new Schema<ISchedule>({
  day: { type: String, required: true },
  time: { type: String, required: true },
  group: { type: String, required: true }
});

interface IHomework extends Document {
  studentId: Types.ObjectId;
  date: string;
  task: string;
  answerText?: string;
  answerPhoto?: string;
  checked: boolean;
  score?: number;
  feedback?: string;
}

const HomeworkSchema = new Schema<IHomework>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  task: { type: String, required: true },
  answerText: String,
  answerPhoto: String,
  checked: { type: Boolean, default: false },
  score: { type: Number, min: 1, max: 5 },
  feedback: String
});

// Indexlar
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, month: 1 }, { unique: true });
HomeworkSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Modellar
const User = mongoose.model<IUser>('User', UserSchema);
const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
const Homework = mongoose.model<IHomework>('Homework', HomeworkSchema);

// Bot
const bot = new Telegraf(BOT_TOKEN);
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// Helper
const isTeacher = (ctx: Context) => ctx.from?.id === TEACHER_ID;
const isRegistered = async (ctx: Context) => !!(await User.findOne({ telegramId: ctx.from?.id }));
moment.locale('uz');

// === OYLIK TO'LOV ===
setInterval(async () => {
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
    console.log(`Yangi oy: ${currentMonth} uchun to'lovlar yaratildi`);
  }
}, 24 * 60 * 60 * 1000);

// === TO'LOV ESLATMA ===
setInterval(async () => {
  const today = moment().date();
  const students = await User.find({ role: 'student', paymentDay: today });
  for (const student of students) {
    try {
      await bot.telegram.sendMessage(
        student.telegramId,
        `To'lov muddatingiz (${today}-sana) yetib keldi!\n` +
        `Summa: ${student.paymentAmount.toLocaleString()} so'm\n` +
        `/payment — to'lov qilish\n/homework — vazifalarni ko'rish`
      );
    } catch (e) {
      console.log(`Xabar yuborilmadi: ${student.fullName}`);
    }
  }
}, 24 * 60 * 60 * 1000);

// === BUYRUQLAR ===
bot.command('start', async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) {
    return ctx.reply("Assalom alaykum! Ro'yxatdan o'ting:", Markup.keyboard([["Ro'yxatdan o'tish"]]).resize());
  }
  await showMainMenu(ctx);
});

bot.command('profile', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showProfile(ctx);
});

bot.command('schedule', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await viewSchedule(ctx);
});

bot.command('homework', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  if (isTeacher(ctx)) {
    await listUncheckedHomework(ctx);
  } else {
    await submitHomework(ctx);
  }
});

bot.command('rating', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showStudentStats(ctx);
});

bot.command('payment', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showPaymentStatus(ctx);
});

bot.command('payment_history', async (ctx: any) => {
  if (!await isRegistered(ctx)) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showPaymentHistory(ctx);
});

bot.command('delete_data', async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Siz ro'yxatdan o'tmagansiz.");
  await User.deleteOne({ telegramId: ctx.from.id });
  await Attendance.deleteMany({ userId: user._id });
  await Payment.deleteMany({ userId: user._id });
  await Homework.deleteMany({ studentId: user._id });
  ctx.reply("Barcha ma'lumotlaringiz o'chirildi. Xayr!");
});

// === MENU ===
const showMainMenu = async (ctx: any) => {
  if (isTeacher(ctx)) {
    return ctx.reply("O'qituvchi paneli:", Markup.inlineKeyboard([
      [Markup.button.callback("O'quvchilar", 'list_students')],
      [Markup.button.callback("To'lovlar", 'payment_list')],
      [Markup.button.callback("Yangi kun", 'new_day')],
      [Markup.button.callback("Jadval qo'shish", 'add_schedule')],
      [Markup.button.callback("Vazifa yuborish", 'manual_homework')],
      [Markup.button.callback("Tekshirilmagan vazifalar", 'check_homework')],
      [Markup.button.callback("Dars boshlandi", 'lesson_started')],
      [Markup.button.callback("Reyting", 'rating')]
    ]));
  } else {
    return ctx.reply("Menu:", Markup.inlineKeyboard([
      [Markup.button.callback("Profil", 'profile')],
      [Markup.button.callback("To'lov", 'payment_status')],
      [Markup.button.callback("To'lov tarixi", 'payment_history')],
      [Markup.button.callback("Jadval", 'view_schedule')],
      [Markup.button.callback("Vazifa yuborish", 'submit_homework')],
      [Markup.button.callback("O'quvchilar statistikasi", 'student_stats')]
    ]));
  }
};

bot.action('manual_homework', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");
  ctx.session.step = 'send_homework_content';
  ctx.reply("O'quvchilarga uyga vazifa yuboring (matn yoki rasm):");
});

// === RO'YXATDAN O'TISH ===
bot.hears("Ro'yxatdan o'tish", async (ctx: any) => {
  if (await isRegistered(ctx)) return ctx.reply("Siz ro'yxatdan o'tgansiz! /profile");
  ctx.session.step = 'reg_fullName';
  return ctx.reply("Ism va familiyangiz:");
});

bot.on('text', async (ctx: any) => {
  if (!ctx.session?.step) return;

  // ----- registration -----
  if (ctx.session.step === 'reg_fullName') {
    ctx.session.fullName = ctx.message.text.trim();
    ctx.session.step = 'reg_phone';
    return ctx.reply("Telefon (+998901234567):");
  }
  if (ctx.session.step === 'reg_phone') {
    if (!/^\+998\d{9}$/.test(ctx.message.text)) return ctx.reply("Noto'g'ri format! /start");
    ctx.session.phone = ctx.message.text;
    ctx.session.step = 'reg_address';
    return ctx.reply("Manzil:");
  }
  if (ctx.session.step === 'reg_address') {
    await new User({
      telegramId: ctx.from.id,
      fullName: ctx.session.fullName,
      phone: ctx.session.phone,
      address: ctx.message.text,
      role: isTeacher(ctx) ? 'teacher' : 'student',
      paymentDay: 1,
      paymentAmount: 500000
    }).save();
    delete ctx.session.step;
    return ctx.reply("Ro'yxatdan o'tdingiz! /profile", Markup.removeKeyboard()).then(() => showMainMenu(ctx));
  }

  // ----- homework answer (text) -----
  if (ctx.session.answering_homework) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const today = moment().format('YYYY-MM-DD');
    await Homework.findOneAndUpdate(
      { studentId: user!._id, date: today },
      { answerText: ctx.message.text, checked: false },
      { upsert: true, new: true }
    );
    ctx.reply("Javob qabul qilindi! /homework");
    delete ctx.session.answering_homework;
    return;
  }

  // ----- edit profile -----
  if (ctx.session.edit) {
    if (ctx.session.step === 'edit_phone') {
      if (!/^\+998\d{9}$/.test(ctx.message.text)) return ctx.reply("Noto'g'ri telefon!");
      ctx.session.phone = ctx.message.text;
      ctx.session.step = 'edit_address';
      return ctx.reply("Yangi manzil:");
    }
    if (ctx.session.step === 'edit_address') {
      await User.updateOne(
        { telegramId: ctx.from.id },
        { phone: ctx.session.phone, address: ctx.message.text }
      );
      delete ctx.session.edit;
      delete ctx.session.step;
      return ctx.reply("Yangilandi! /profile").then(() => showMainMenu(ctx));
    }
  }

  // ----- schedule add -----
  if (ctx.session.step === 'sched_time') {
    ctx.session.time = ctx.message.text;
    ctx.session.step = 'sched_group';
    ctx.reply("Guruh (A-guruh):");
    return;
  }
  if (ctx.session.step === 'sched_group') {
    await new Schedule({ day: ctx.session.day, time: ctx.session.time, group: ctx.message.text }).save();
    delete ctx.session.step;
    ctx.reply("Jadval qo'shildi! /schedule");
    return;
  }

  // ----- send homework (teacher) -----
  if (ctx.session.step === 'send_homework_content' && isTeacher(ctx)) {
    const taskText = ctx.message.text;
    const today = moment().format('YYYY-MM-DD');
    const students = await User.find({ role: 'student' });
    for (const s of students) {
      await bot.telegram.sendMessage(s.telegramId, `Uyga vazifa (${today}):\n${taskText}\n\nJavob yuboring: /homework`);
      await Homework.findOneAndUpdate(
        { studentId: s._id, date: today },
        { task: taskText },
        { upsert: true }
      );
    }
    delete ctx.session.step;
    return ctx.reply("Vazifa barcha o'quvchilarga yuborildi!");
  }

  // ----- set payment day (teacher) -----
  if (ctx.session.step === 'set_payment_day' && isTeacher(ctx)) {
    const day = parseInt(ctx.message.text.trim());
    if (isNaN(day) || day < 1 || day > 31) return ctx.reply("1–31 oralig'ida son kiriting.");
    await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
    const studentId = ctx.session.studentId;
    delete ctx.session.step;
    delete ctx.session.studentId;
    ctx.reply("To'lov sanasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`)]]));
    return;
  }

  // ----- set payment amount (teacher) -----
  if (ctx.session.step === 'set_payment_amount' && isTeacher(ctx)) {
    const amount = parseInt(ctx.message.text.trim().replace(/\s/g, ''));
    if (isNaN(amount) || amount <= 0) return ctx.reply("Musbat son kiriting.");
    await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
    const studentId = ctx.session.studentId;
    delete ctx.session.step;
    delete ctx.session.studentId;
    ctx.reply("To'lov summasi yangilandi!", Markup.inlineKeyboard([[backButton(`student_${studentId}`)]]));
    return;
  }

  // ----- grade homework (teacher) -----
  if (ctx.session.step === 'grade_score' && isTeacher(ctx)) {
    const score = parseInt(ctx.message.text.trim());
    if (isNaN(score) || score < 1 || score > 5) {
      return ctx.reply("1-5 oralig'ida baho kiriting:");
    }
    const hw = await Homework.findById(ctx.session.homeworkId);
    if (!hw) return ctx.reply("Vazifa topilmadi.");
    await Homework.findByIdAndUpdate(ctx.session.homeworkId, { score, checked: true });
    ctx.session.step = 'grade_feedback';
    ctx.session.score = score;
    ctx.reply("Baholandi! Ixtiyoriy izoh (yoki “yo'q”):");
    return;
  }

  if (ctx.session.step === 'grade_feedback' && isTeacher(ctx)) {
    const feedback = ctx.message.text.trim().toLowerCase() === 'yo\'q' ? undefined : ctx.message.text;
    await Homework.findByIdAndUpdate(ctx.session.homeworkId, { feedback });
    const hw = await Homework.findById(ctx.session.homeworkId).populate<{ studentId: IUser }>('studentId');
    try {
      await bot.telegram.sendMessage(
        hw!.studentId.telegramId,
        `Vazifangiz baholandi!\n\nBaho: ${ctx.session.score}/5\n${feedback ? `Izoh: ${feedback}` : ''}`
      );
    } catch (e) {}
    delete ctx.session.step;
    delete ctx.session.homeworkId;
    delete ctx.session.score;
    ctx.reply("Baholash yakunlandi!", Markup.inlineKeyboard([[backButton('check_homework')]]));
    return;
  }
});

// === RASMLAR ===
bot.on('photo', async (ctx: any) => {
  if (ctx.session?.step === 'waiting_for_receipt') {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply("Foydalanuvchi topilmadi.");
    const currentMonth = moment().format('YYYY-MM');
    const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
    if (!payment) {
      delete ctx.session.step;
      return ctx.reply("To'lov allaqachon tasdiqlangan.");
    }
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    try {
      await bot.telegram.sendPhoto(TEACHER_ID, photoId, { caption: `Chek: ${user.fullName}\n${user.phone}` });
      await bot.telegram.sendMessage(
        TEACHER_ID,
        `Onlayn to'lov tasdiqlash:\nO'quvchi: ${user.fullName}\nSumma: ${user.paymentAmount.toLocaleString()} so'm`,
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback("Tasdiqlash", `pay_confirm_${payment._id}`)],
            [Markup.button.callback("Rad etish", `pay_reject_${payment._id}`)]
          ]).reply_markup
        }
      );
      ctx.reply("Chek yuborildi! O'qituvchi tasdiqlashini kuting.");
    } catch (e) {
      ctx.reply("Xatolik yuz berdi.");
    }
    delete ctx.session.step;
    return;
  }

  if (ctx.session?.step === 'send_homework_content' && isTeacher(ctx)) {
    const caption = ctx.message.caption || "Uyga vazifa (rasm).";
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const today = moment().format('YYYY-MM-DD');
    const students = await User.find({ role: 'student' });
    for (const s of students) {
      await bot.telegram.sendPhoto(s.telegramId, photoId, { caption: `${caption}\n\nJavob: /homework` });
      await Homework.findOneAndUpdate(
        { studentId: s._id, date: today },
        { task: caption },
        { upsert: true }
      );
    }
    delete ctx.session.step;
    return ctx.reply("Rasmli vazifa yuborildi!");
  }

  if (ctx.session?.answering_homework) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const today = moment().format('YYYY-MM-DD');
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    await Homework.findOneAndUpdate(
      { studentId: user!._id, date: today },
      { answerPhoto: photoId, checked: false },
      { upsert: true }
    );
    ctx.reply("Rasm qabul qilindi! /homework");
    delete ctx.session.answering_homework;
    return;
  }
});

// === TO'LOV (Onlayn / Ofline) ===
const showPaymentStatus = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Ro'yxatdan o'tmadingiz.");
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user._id, month: currentMonth });
  if (!payment) {
    return ctx.reply("Bu oy uchun to'lov hali yaratilmagan.", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
  }
  const status = payment.paid ? "To'landi" : "To'lanmagan";
  const method = payment.method ? `(${payment.method === 'receipt' ? 'Onlayn (Chek)' : 'Ofline'})` : "";
  const msg = `*To'lov (${moment().format('MMMM YYYY')})*\nHolati: ${status} ${method}\nSana: ${user.paymentDay}-kuni\nSumma: ${user.paymentAmount.toLocaleString()} so'm\n\nKarta: \`${PAYMENT_CARD_NUMBER}\`\nIsm: ${PAYMENT_CARD_NAME}`;

  const buttons: any[][] = [];
  if (!payment.paid) {
    buttons.push([Markup.button.callback("Onlayn to'lov", 'send_receipt')]);
    buttons.push([Markup.button.callback("Ofline to'lov", 'offline_payment')]);
  }
  buttons.push([backButton('back_to_menu')]);

  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), { reply_markup: Markup.inlineKeyboard(buttons).reply_markup });
};

bot.action('payment_status', showPaymentStatus);

bot.action('send_receipt', (ctx: any) => {
  ctx.session.step = 'waiting_for_receipt';
  ctx.reply("To'lov chekini rasm sifatida yuboring:");
});

bot.action('offline_payment', async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Foydalanuvchi topilmadi.");
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
  if (!payment) return ctx.reply("To'lov allaqachon mavjud.");
  try {
    await bot.telegram.sendMessage(
      TEACHER_ID,
      `Ofline to'lov so'rovi:\nO'quvchi: ${user.fullName}\nTelefon: ${user.phone}\nSumma: ${user.paymentAmount.toLocaleString()} so'm`,
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Tasdiqlash", `pay_confirm_${payment._id}`)],
          [Markup.button.callback("Rad etish", `pay_reject_${payment._id}`)]
        ]).reply_markup
      }
    );
    ctx.reply("Ofline to'lov so'rovi o'qituvchiga yuborildi!");
  } catch (e) {
    ctx.reply("Xatolik yuz berdi.");
  }
});

// === TO'LOV TARIXI ===
const showPaymentHistory = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Ro'yxatdan o'tmadingiz.");
  const payments = await Payment.find({ userId: user._id, paid: true }).sort({ paidAt: -1 });
  if (payments.length === 0) {
    return ctx.reply("Siz hali to'lov qilmagansiz.", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
  }
  const lines = payments.map(p => {
    const date = p.paidAt ? moment(p.paidAt).format('YYYY-MM-DD') : 'Noma\'lum';
    const method = p.method === 'receipt' ? 'Onlayn' : 'Ofline';
    const month = moment(p.month, 'YYYY-MM').format('MMMM YYYY');
    return `${date} | ${month} | ${p.amount.toLocaleString()} so'm | ${method}`;
  }).join('\n');
  ctx.reply(`To'lov tarixi:\n\n${lines}`, { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
};

bot.action('payment_history', showPaymentHistory);

// === PROFIL ===
const showProfile = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Ro'yxatdan o'ting: /start");
  const stats = await Attendance.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const statsMap = { present: 0, late: 0, absent: 0 };
  stats.forEach((s: any) => statsMap[s._id] = s.count);
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user._id, month: currentMonth });
  const msg = `*Profil*\nIsm: ${user.fullName}\nTelefon: ${user.phone}\nManzil: ${user.address}\nTo'lov: ${user.paymentDay}-kuni\nSumma: ${user.paymentAmount.toLocaleString()} so'm\nKelish: ${statsMap.present} | Kechikib: ${statsMap.late} | Kelmagan: ${statsMap.absent}\nTo'lov: ${payment?.paid ? 'To\'landi' : 'To\'lanmagan'}`;
  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("Tahrirlash", 'edit_profile')],
      [backButton('back_to_menu')]
    ]).reply_markup
  });
};

bot.action('profile', showProfile);
bot.action('edit_profile', (ctx: any) => {
  ctx.session = { edit: true, step: 'edit_phone' };
  ctx.reply("Yangi telefon:");
});

// === JADVAL ===
const viewSchedule = async (ctx: any) => {
  const schedules = await Schedule.find();
  if (schedules.length === 0) return ctx.reply("Jadval yo'q.");
  const lines = schedules.map((s: any) => `${s.day} | ${s.time} | ${s.group}`).join('\n');
  ctx.reply(`Dars jadvali:\n${lines}`, { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
};

bot.action('view_schedule', viewSchedule);
bot.command('schedule', viewSchedule);

bot.action('add_schedule', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");
  ctx.session.step = 'sched_day';
  ctx.reply("Kunni tanlang:", {
    reply_markup: Markup.inlineKeyboard([
      ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(d => Markup.button.callback(d, `sched_day_${d}`)),
      [backButton('back_to_menu')]
    ]).reply_markup
  });
});

['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].forEach(day => {
  bot.action(`sched_day_${day}`, (ctx: any) => {
    ctx.session.day = day;
    ctx.session.step = 'sched_time';
    ctx.reply("Vaqt (18:00):", { reply_markup: Markup.inlineKeyboard([[backButton('add_schedule')]]).reply_markup });
  });
});

// === VAZIFA JAVOBI ===
const submitHomework = (ctx: any) => {
  ctx.session.answering_homework = true;
  ctx.reply("Javobingizni yozing yoki rasm yuboring:", {
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup
  });
};

bot.action('submit_homework', submitHomework);

// === TEKSHIRILMAGAN VAZIFALAR (teacher) ===
const listUncheckedHomework = async (ctx: any) => {
  const homeworks = await Homework.find({ checked: false }).populate<{ studentId: IUser }>('studentId');
  if (homeworks.length === 0) {
    return ctx.reply("Tekshirilmagan vazifa yo'q.", Markup.inlineKeyboard([[backButton('back_to_menu')]]));
  }
  const buttons = homeworks.map(hw => [
    Markup.button.callback(`${hw.studentId.fullName} — ${moment(hw.date).format('DD.MM')}`, `view_hw_${hw._id}`)
  ]);
  ctx.reply("Tekshirilmagan vazifalar:", Markup.inlineKeyboard([...buttons, [backButton('back_to_menu')]]));
};

bot.action('check_homework', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");
  await listUncheckedHomework(ctx);
});

// === O'QUVCHILAR STATISTIKASI (student & teacher) ===
const showStudentStats = async (ctx: any) => {
  const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");

  const buttons = students.map(s => [
    Markup.button.callback(`${s.fullName}`, `student_detail_${s._id}`)
  ]);
  ctx.reply("O'quvchilar statistikasi:", Markup.inlineKeyboard([...buttons, [backButton('back_to_menu')]]));
};

bot.action('student_stats', showStudentStats);

// === O'QUVCHI DETAY (30 kun) ===
bot.action(/student_detail_(.+)/, async (ctx: any) => {
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
    return { date, short: moment(date).format('DD.MM') };
  }).reverse();

  const attendance = await Attendance.find({ userId: studentId });
  const homework = await Homework.find({ studentId: studentId });

  const attMap = new Map(attendance.map(a => [a.date, a.status]));
  const hwMap = new Map(homework.map(h => [h.date, h.checked]));

  const lines = last30Days.map(d => {
    const att = attMap.get(d.date);
    const hw = hwMap.get(d.date);
    const attStatus = att === 'present' ? 'Kelgan' : att === 'late' ? 'Kechikib' : att === 'absent' ? 'Kelmagan' : '—';
    const hwStatus = hw === true ? 'Bajarilgan' : hw === false ? 'Bajarilmagan' : '—';
    return `${d.short} | ${attStatus} | ${hwStatus}`;
  }).join('\n');

  const totalPresent = attendance.filter(a => a.status === 'present').length;
  const totalLate = attendance.filter(a => a.status === 'late').length;
  const totalAbsent = attendance.filter(a => a.status === 'absent').length;
  const totalDone = homework.filter(h => h.checked).length;
  const totalNotDone = homework.filter(h => !h.checked).length;

  const msg = `<b>${student.fullName}</b>\n` +
    `Kelgan: ${totalPresent} | Kechikib: ${totalLate} | Kelmagan: ${totalAbsent}\n` +
    `Vazifa: ${totalDone} bajarilgan, ${totalNotDone} bajarilmagan\n\n` +
    `<pre>${lines}</pre>`;

  ctx.replyWithHTML(msg, { reply_markup: Markup.inlineKeyboard([[backButton('student_stats')]]).reply_markup });
});

// === VAZIFA KO'RISH (teacher) ===
bot.action(/view_hw_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");

  const hwId = ctx.match[1];
  const hw = await Homework.findById(hwId).populate<{ studentId: IUser }>('studentId');
  if (!hw) return ctx.reply("Vazifa topilmadi.");

  let msg = `<b>${hw.studentId.fullName}</b>\nVazifa: ${hw.task}\nSana: ${moment(hw.date).format('DD.MM.YYYY')}\n\n`;
  const buttons: any[][] = [];

  if (hw.answerText) msg += `Javob: ${hw.answerText}\n`;
  if (hw.answerPhoto) {
    msg += `Rasm javob mavjud.\n`;
    await bot.telegram.sendPhoto(ctx.chat.id, hw.answerPhoto, { caption: msg });
    msg = "";
  }

  if (!hw.checked) {
    buttons.push([Markup.button.callback("Baholash", `grade_hw_${hwId}`)]);
  } else {
    msg += `\nBaho: ${hw.score}/5\n${hw.feedback ? `Izoh: ${hw.feedback}\n` : ''}`;
  }
  buttons.push([backButton('check_homework')]);

  ctx.replyWithHTML(msg || "Ma'lumotlar ko'rsatildi.", { reply_markup: Markup.inlineKeyboard(buttons).reply_markup });
});

bot.action(/grade_hw_(.+)/, async (ctx: any) => {
  const hwId = ctx.match[1];
  ctx.session.step = 'grade_score';
  ctx.session.homeworkId = hwId;
  ctx.reply("Bahoni kiriting (1-5):", Markup.inlineKeyboard([[backButton(`view_hw_${hwId}`)]]));
});

// === O'QITUVCHI PANELI ===
bot.action('payment_list', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");
  const currentMonth = moment().format('YYYY-MM');
  const payments = await Payment.find({ month: currentMonth }).populate<{ userId: IUser }>('userId');
  const paid = payments.filter(p => p.paid).map(p => `${p.userId.fullName} — ${p.amount.toLocaleString()} so'm`).join('\n') || "Yo'q";
  const unpaid = payments.filter(p => !p.paid).map(p => `${p.userId.fullName} — ${p.amount.toLocaleString()} so'm`).join('\n') || "Yo'q";
  ctx.replyWithHTML(`<b>To'lovlar (${moment().format('MMMM YYYY')})</b>\n\n<b>To'langan:</b>\n<pre>${paid}</pre>\n\n<b>To'lanmagan:</b>\n<pre>${unpaid}</pre>`, {
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup
  });
});

bot.action('back_to_menu', showMainMenu);

bot.action('list_students', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");
  const buttons = students.map(s => [Markup.button.callback(`${s.fullName} — ${s.address}`, `student_${s._id}`)]);
  ctx.reply("O'quvchilar:", { reply_markup: Markup.inlineKeyboard([...buttons, [backButton('back_to_menu')]]).reply_markup });
});

// === O'QUVCHI KARTASI (faqat student_123 formatida) ===
bot.action(/^student_[^_]+$/, async (ctx: any) => {
  const studentId = ctx.match[0].split('_')[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  const today = moment().format('YYYY-MM-DD');
  const att = await Attendance.findOne({ userId: studentId, date: today });
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: studentId, month: currentMonth });

  const statusMap: any = { present: 'Kelgan', late: 'Kechikib', absent: 'Kelmagan' };
  const status = att ? statusMap[att.status] : 'Belgilanmagan';
  const paid = payment?.paid ? 'To\'landi' : 'To\'lanmagan';

  const buttons: any[][] = [
    [
      Markup.button.callback('Kelgan', `att_present_${studentId}`),
      Markup.button.callback('Kechikib', `att_late_${studentId}`),
      Markup.button.callback('Kelmagan', `att_absent_${studentId}`)
    ]
  ];

  buttons.push([Markup.button.callback("To'lov sanasi", `set_payment_day_${studentId}`)]);
  buttons.push([Markup.button.callback("To'lov summasi", `set_payment_amount_${studentId}`)]);

  if (!payment) {
    buttons.push([Markup.button.callback("To'lov yaratish", `create_payment_${studentId}`)]);
  }

  buttons.push([Markup.button.callback("O'chirish", `delete_student_${studentId}`)]);
  buttons.push([backButton('list_students')]);

  ctx.replyWithHTML(
    `<b>${student.fullName}</b>\n` +
    `Manzil: ${student.address}\n` +
    `Bugun: ${status}\n` +
    `To'lov: ${paid}\n` +
    `Sana: <b>${student.paymentDay}-kuni</b>\n` +
    `Summa: <b>${student.paymentAmount.toLocaleString()} so'm</b>`,
    { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
  );

  ctx.answerCbQuery();
});

// === TO'LOV YARATISH ===
bot.action(/^create_payment_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;

  const studentId = ctx.match[1];
  const currentMonth = moment().format('YYYY-MM');
  const existing = await Payment.findOne({ userId: studentId, month: currentMonth });
  if (existing) {
    return ctx.answerCbQuery("Bu oy uchun to'lov allaqachon mavjud!");
  }

  const student = await User.findById(studentId);
  if (!student) return ctx.answerCbQuery("O'quvchi topilmadi.");

  await new Payment({
    userId: studentId,
    month: currentMonth,
    amount: student.paymentAmount
  }).save();

  ctx.answerCbQuery(`To'lov yaratildi: ${student.paymentAmount.toLocaleString()} so'm`);
  
  ctx.editMessageText(ctx.callbackQuery.message.text, {
    reply_markup: Markup.inlineKeyboard([
      [backButton(`student_${studentId}`)]
    ]).reply_markup
  });
});

// === O'CHIRISH ===
bot.action(/^delete_student_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;

  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.answerCbQuery("O'quvchi topilmadi.");

  await User.deleteOne({ _id: studentId });
  await Attendance.deleteMany({ userId: studentId });
  await Payment.deleteMany({ userId: studentId });
  await Homework.deleteMany({ studentId: studentId });

  try {
    await bot.telegram.sendMessage(student.telegramId, "Siz o'quv markazidan chiqarib tashlandingiz.");
  } catch (e) {}

  ctx.editMessageText(`<b>${student.fullName}</b> muvaffaqiyatli o'chirildi.`, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([[backButton('list_students')]]).reply_markup
  });

  ctx.answerCbQuery("O'quvchi o'chirildi!");
});

// === TO'LOV SANASI & SUMMASI ===
bot.action(/^set_payment_day_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  ctx.session.step = 'set_payment_day';
  ctx.session.studentId = studentId;
  ctx.editMessageText("To'lov sanasini kiriting (1–31):", {
    reply_markup: Markup.inlineKeyboard([[backButton(`student_${studentId}`)]]).reply_markup
  });
  ctx.answerCbQuery();
});

bot.action(/^set_payment_amount_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  ctx.session.step = 'set_payment_amount';
  ctx.session.studentId = studentId;
  ctx.editMessageText("To'lov summasini kiriting:", {
    reply_markup: Markup.inlineKeyboard([[backButton(`student_${studentId}`)]]).reply_markup
  });
  ctx.answerCbQuery();
});

// === TO'LOV TASDIQLASH / RAD ETISH ===
bot.action(/pay_confirm_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const paymentId = ctx.match[1];
  const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
  if (!payment || payment.paid) return;
  await Payment.updateOne({ _id: paymentId }, { paid: true, paidAt: new Date(), method: payment.method || 'offline' });
  try {
    await bot.telegram.sendMessage(payment.userId.telegramId, `To'lovingiz tasdiqlandi!\nSumma: ${payment.amount.toLocaleString()} so'm`);
  } catch (e) {}
  ctx.reply("To'lov tasdiqlandi!", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
  ctx.answerCbQuery();
});

bot.action(/pay_reject_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const paymentId = ctx.match[1];
  const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
  if (!payment || payment.paid) return;
  try {
    await bot.telegram.sendMessage(payment.userId.telegramId, `To'lovingiz rad etildi. Iltimos, qayta urinib ko'ring yoki o'qituvchi bilan bog'laning.`);
  } catch (e) {}
  ctx.reply("To'lov rad etildi!", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
  ctx.answerCbQuery();
});

bot.action(/att_(present|late|absent)_(.+)/, async (ctx: any) => {
  const [_, status, studentId] = ctx.match;
  const today = moment().format('YYYY-MM-DD');
  await Attendance.updateOne({ userId: studentId, date: today }, { status }, { upsert: true });
  ctx.reply("Belgilandi!", { reply_markup: Markup.inlineKeyboard([[backButton(`student_${studentId}`)]]).reply_markup });
  ctx.answerCbQuery();
});

bot.action('new_day', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  const today = moment().format('YYYY-MM-DD');
  for (const s of students) {
    const exists = await Attendance.findOne({ userId: s._id, date: today });
    if (!exists) {
      await new Attendance({ userId: s._id, date: today, status: 'absent' }).save();
    }
  }
  ctx.reply("Yangi kun boshlandi!", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
});

bot.action('lesson_started', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    await bot.telegram.sendMessage(s.telegramId, "Dars boshlandi! Tez keling!");
  }
  ctx.reply("Xabar yuborildi!", { reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu')]]).reply_markup });
});

// === SERVER ===
const port = parseInt(process.env.PORT || '10000');
const app = express();
app.get('/', (req, res) => res.json({ status: 'Bot ishlayapti!', time: new Date().toISOString() }));
app.listen(port, '0.0.0.0', () => console.log(`Server ${port}-portda ishga tushdi`));

bot.launch().then(() => console.log('Bot ishga tushdi!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));