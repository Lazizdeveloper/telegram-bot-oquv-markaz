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

if (!BOT_TOKEN || !TEACHER_ID || !DB_URI) {
  console.error('❌ BOT_TOKEN, TEACHER_ID yoki DB_URI muhit o\'zgaruvchilari belgilanmagan!');
  process.exit(1);
}

// MongoDB
mongoose.connect(DB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB xatosi:'));
db.once('open', () => console.log('MongoDB ulandi'));

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
  method?: 'card' | 'cash' | 'offline';
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  method: String
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
  answer?: string;
  checked: boolean;
  correct?: boolean;
}

const HomeworkSchema = new Schema<IHomework>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  task: { type: String, required: true },
  answer: String,
  checked: { type: Boolean, default: false },
  correct: Boolean
});

// Indexlar
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, month: 1 }, { unique: true });

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

// === OYLIK TO'LOV YARATISH (1-kun) ===
setInterval(async () => {
  const today = moment().format('YYYY-MM-DD');
  if (today.endsWith('-01')) {
    const students = await User.find({ role: 'student' });
    const currentMonth = moment().format('YYYY-MM');
    for (const s of students) {
      const exists = await Payment.findOne({ userId: s._id, month: currentMonth });
      if (!exists) {
        await new Payment({
          userId: s._id,
          month: currentMonth,
          amount: s.paymentAmount // 👈 Alo-hida summa
        }).save();
      }
    }
    console.log(`Yangi oy: ${currentMonth} uchun to'lovlar yaratildi`);
  }
}, 24 * 60 * 60 * 1000);

// === TO'LOV ESLATMA (HAR OY PAYMENTDAY KELGANDA) ===
setInterval(async () => {
  const today = moment().date(); // 1–31
  const students = await User.find({ role: 'student', paymentDay: today });

  for (const student of students) {
    try {
      await bot.telegram.sendMessage(
        student.telegramId,
        `❗ To'lov muddatingiz (${today}-sana) yetib keldi!\n` +
        `Summa: ${student.paymentAmount.toLocaleString()} so'm\n` +
        `/payment — to'lov qilish\n/homework — vazifalarni ko'rish`
      );
    } catch (e) {
      console.log(`Xabar yuborilmadi: ${student.fullName} (${student.telegramId})`);
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
  const registered = await isRegistered(ctx);
  if (!registered) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showProfile(ctx);
});

bot.command('schedule', async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await viewSchedule(ctx);
});

bot.command('homework', async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  
  if (isTeacher(ctx)) {
    ctx.session.step = 'send_homework_content';
    return ctx.reply("O'quvchilarga uyga vazifa yuboring (matn yoki rasm):");
  } else {
    await submitHomework(ctx);
  }
});

bot.command('rating', async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showRating(ctx);
});

bot.command('payment', async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) return ctx.reply("Avval ro'yxatdan o'ting: /start");
  await showPaymentStatus(ctx);
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
      [Markup.button.callback("Dars boshlandi", 'lesson_started')],
      [Markup.button.callback("Reyting", 'rating')]
    ]));
  } else {
    return ctx.reply("Menu:", Markup.inlineKeyboard([
      [Markup.button.callback("Profil", 'profile')],
      [Markup.button.callback("To'lov", 'payment_status')],
      [Markup.button.callback("Jadval", 'view_schedule')],
      [Markup.button.callback("Vazifa yuborish", 'submit_homework')],
      [Markup.button.callback("Reyting", 'rating')]
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

  if (ctx.session.answering_homework) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    await new Homework({
      studentId: user!._id,
      date: moment().format('YYYY-MM-DD'),
      task: ctx.session.current_task || "Uyga vazifa",
      answer: ctx.message.text
    }).save();
    ctx.reply("Javob qabul qilindi! /homework");
    delete ctx.session.answering_homework;
    return;
  }

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
      delete ctx.session.edit; delete ctx.session.step;
      return ctx.reply("Yangilandi! /profile").then(() => showMainMenu(ctx));
    }
  }

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

  if (ctx.session.step === 'send_homework_content' && isTeacher(ctx)) {
    const taskText = ctx.message.text;
    const students = await User.find({ role: 'student' });
    for (const s of students) {
      await bot.telegram.sendMessage(s.telegramId, `Uyga vazifa:\n${taskText}\n\nJavob yuboring: /homework`);
    }
    delete ctx.session.step;
    return ctx.reply("Vazifa barcha o'quvchilarga yuborildi!");
  }

  // To'lov sanasini sozlash
  if (ctx.session.step === 'set_payment_day' && isTeacher(ctx)) {
    const day = parseInt(ctx.message.text.trim());
    if (isNaN(day) || day < 1 || day > 31) {
      return ctx.reply("Noto'g'ri sana! 1–31 oralig'ida son kiriting.");
    }
    await User.findByIdAndUpdate(ctx.session.studentId, { paymentDay: day });
    delete ctx.session.step;
    delete ctx.session.studentId;
    return ctx.reply("To'lov sanasi yangilandi!");
  }

  // To'lov summasini sozlash
  if (ctx.session.step === 'set_payment_amount' && isTeacher(ctx)) {
    const amountStr = ctx.message.text.trim().replace(/\s/g, '');
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("Noto'g'ri summa! Faqat musbat son kiriting.");
    }
    await User.findByIdAndUpdate(ctx.session.studentId, { paymentAmount: amount });
    delete ctx.session.step;
    delete ctx.session.studentId;
    return ctx.reply("To'lov summasi yangilandi!");
  }
});

bot.on('photo', async (ctx: any) => {
  if (ctx.session?.step === 'send_homework_content' && isTeacher(ctx)) {
    const caption = ctx.message.caption || "Uyga vazifa (rasm).\nJavob yuboring: /homework";
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    const students = await User.find({ role: 'student' });
    for (const s of students) {
      await bot.telegram.sendPhoto(s.telegramId, photoId, { caption });
    }
    delete ctx.session.step;
    return ctx.reply("Rasmli vazifa barcha o'quvchilarga yuborildi!");
  }
});

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

  const msg = `
*Profil*
Ism: ${user.fullName}
Telefon: ${user.phone}
Manzil: ${user.address}
To'lov sanasi: har oyning ${user.paymentDay}-kuni
To'lov summasi: ${user.paymentAmount.toLocaleString()} so'm

Kelish:
Kelgan: ${statsMap.present}
Kechikib: ${statsMap.late}
Kelmagan: ${statsMap.absent}

To'lov: ${payment?.paid ? 'To\'landi' : 'To\'lanmagan'}
  `.trim();

  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), Markup.inlineKeyboard([
    [Markup.button.callback("Tahrirlash", 'edit_profile')]
  ]));
};

bot.action('profile', showProfile);
bot.action('edit_profile', (ctx: any) => {
  ctx.session = { edit: true, step: 'edit_phone' };
  ctx.reply("Yangi telefon:");
});

// === JADVAL ===
const viewSchedule = async (ctx: any) => {
  const schedules = await Schedule.find();
  if (schedules.length === 0) return ctx.reply("Jadval yo'q. O'qituvchi qo'shsin.");
  const lines = schedules.map(s => `${s.day} | ${s.time} | ${s.group}`).join('\n');
  ctx.reply(`Dars jadvali:\n${lines}`);
};

bot.action('view_schedule', viewSchedule);
bot.command('schedule', viewSchedule);

bot.action('add_schedule', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");
  ctx.session.step = 'sched_day';
  ctx.reply("Kunni tanlang:", Markup.inlineKeyboard([
    ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(d => Markup.button.callback(d, `sched_day_${d}`))
  ]));
});

['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].forEach(day => {
  bot.action(`sched_day_${day}`, (ctx: any) => {
    ctx.session.day = day;
    ctx.session.step = 'sched_time';
    ctx.reply("Vaqt (18:00):");
  });
});

// === O'QUVCHI UYGA VAZIFA JAVOBI ===
const submitHomework = (ctx: any) => {
  ctx.session.answering_homework = true;
  ctx.session.current_task = "Uyga vazifa";
  ctx.reply("Javobingizni yozing:");
};

bot.action('submit_homework', submitHomework);

// === REYTING ===
const showRating = async (ctx: any) => {
  const top = await Attendance.aggregate([
    { $match: { status: 'present' } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
  ]);

  const lines = top.map((t: any, i: number) => {
    const user = t.user[0];
    const name = user?.fullName || 'Noma\'lum';
    return `${i + 1}. ${name} — ${t.count} kun`;
  }).join('\n');
  ctx.reply(`Top reyting:\n${lines || "Reyting bo'sh"}`);
};

bot.action('rating', showRating);

// === TO'LOV (O'QUVCHI) ===
const showPaymentStatus = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user!._id, month: currentMonth });

  if (!payment) {
    return ctx.reply("Bu oy uchun to'lov hali yaratilmagan.");
  }

  const status = payment.paid ? "To'landi" : "To'lanmagan";
  const method = payment.method ? `(${payment.method})` : "";

  const msg = `
*To'lov holati (${moment().format('MMMM YYYY')})*

Summasi: ${user!.paymentAmount.toLocaleString()} so'm
Holati: ${status} ${method}

To'lash uchun:
Karta: \`8600 1234 5678 9012\`
Izoh: \`${user!.phone}\`

To'lov qilgandan keyin o'qituvchi tasdiqlaydi.
  `.trim();

  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'));
};

bot.action('payment_status', showPaymentStatus);

// === TO'LOVLAR RO'YXATI (O'QITUVCHI) ===
bot.action('payment_list', async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply("Faqat o'qituvchi!");

  const currentMonth = moment().format('YYYY-MM');
  const payments = await Payment.find({ month: currentMonth }).populate<{ userId: IUser }>('userId');

  const paid = payments.filter(p => p.paid);
  const unpaid = payments.filter(p => !p.paid);

  const paidList = paid.length > 0
    ? paid.map(p => `${p.userId.fullName} — ${p.amount.toLocaleString()} so'm`).join('\n')
    : "Yo'q";

  const unpaidList = unpaid.length > 0
    ? unpaid.map(p => `${p.userId.fullName} — ${p.amount.toLocaleString()} so'm`).join('\n')
    : "Yo'q";

  ctx.replyWithHTML(`
<b>To'lovlar (${moment().format('MMMM YYYY')})</b>

<b>To'langan (${paid.length}):</b>
<pre>${paidList}</pre>

<b>To'lanmagan (${unpaid.length}):</b>
<pre>${unpaidList}</pre>
  `, Markup.inlineKeyboard([
    [Markup.button.callback("Orqaga", 'back_to_menu')]
  ]));
});

bot.action('back_to_menu', showMainMenu);

// === O'QUVCHI KARTASI ===
bot.action(/student_(.+)/, async (ctx: any) => {
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  const today = moment().format('YYYY-MM-DD');
  const att = await Attendance.findOne({ userId: studentId, date: today });
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: studentId, month: currentMonth });

  const statusMap: any = { present: 'Kelgan', late: 'Kechikib', absent: 'Kelmagan' };
  const status = att ? statusMap[att.status] : 'Belgilanmagan';
  const paid = payment?.paid ? 'To\'landi' : 'To\'lanmagan';

  const buttons: any[] = [
    [
      Markup.button.callback('Kelgan', `att_present_${studentId}`),
      Markup.button.callback('Kechikib', `att_late_${studentId}`),
      Markup.button.callback('Kelmagan', `att_absent_${studentId}`)
    ]
  ];

  if (student.role === 'student') {
    buttons.push([Markup.button.callback("To'lov sanasini o'zgartirish", `set_payment_day_${studentId}`)]);
    buttons.push([Markup.button.callback("To'lov summasini o'zgartirish", `set_payment_amount_${studentId}`)]);
  }

  buttons.push([Markup.button.callback("O'quvchini o'chirish", `delete_student_${studentId}`)]);

  ctx.replyWithHTML(`
<b>${student.fullName}</b>
Manzil: ${student.address}
Bugun: ${status}
To'lov: ${paid}
To'lov sanasi: har oyning <b>${student.paymentDay}-kuni</b>
To'lov summasi: <b>${student.paymentAmount.toLocaleString()} so'm</b>
  `, Markup.inlineKeyboard(buttons));
});

// To'lov sanasini sozlash
bot.action(/set_payment_day_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  ctx.session.step = 'set_payment_day';
  ctx.session.studentId = studentId;
  ctx.reply("To'lov sanasini kiriting (1–31):");
});

// To'lov summasini sozlash
bot.action(/set_payment_amount_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  ctx.session.step = 'set_payment_amount';
  ctx.session.studentId = studentId;
  ctx.reply("To'lov summasini so'mda kiriting (masalan: 200000):");
});

// O'quvchini o'chirish
bot.action(/delete_student_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  await User.deleteOne({ _id: studentId });
  await Attendance.deleteMany({ userId: studentId });
  await Payment.deleteMany({ userId: studentId });
  await Homework.deleteMany({ studentId: studentId });

  try {
    await bot.telegram.sendMessage(student.telegramId, "Siz o'quv markazidan chiqarib tashlandingiz.");
  } catch (e) {}

  ctx.reply(`${student.fullName} muvaffaqiyatli o'chirildi.`);
  ctx.answerCbQuery();
});

// === TO'LOV TASDIQLASH ===
bot.action(/pay_confirm_(.+)/, async (ctx: any) => {
  const paymentId = ctx.match[1];
  const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');

  if (!payment || payment.paid) return ctx.reply("Bu to'lov allaqachon tasdiqlangan.");

  await Payment.updateOne({ _id: paymentId }, { paid: true, paidAt: new Date(), method: 'offline' });

  try {
    await bot.telegram.sendMessage(
      payment.userId.telegramId,
      `To'lov tasdiqlandi!\n${payment.amount.toLocaleString()} so'm — ${moment(payment.month, 'YYYY-MM').format('MMMM YYYY')}`
    );
  } catch (e) {}

  ctx.reply("To'lov tasdiqlandi!");
  ctx.answerCbQuery();
});

// === QOLGAN FUNKSIYALAR ===
bot.action('list_students', async (ctx: any) => {
  const students = await User.find({ role: 'student' });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");

  const buttons = students.map(s => [
    Markup.button.callback(`${s.fullName} — ${s.address}`, `student_${s._id}`)
  ]);
  ctx.reply("O'quvchilar:", Markup.inlineKeyboard(buttons));
});

bot.action(/att_(present|late|absent)_(.+)/, async (ctx: any) => {
  const [_, status, studentId] = ctx.match;
  const today = moment().format('YYYY-MM-DD');
  await Attendance.updateOne(
    { userId: studentId, date: today },
    { status },
    { upsert: true }
  );
  ctx.reply("Belgilandi!");
  ctx.answerCbQuery();
});

bot.action('new_day', async (ctx: any) => {
  const students = await User.find({ role: 'student' });
  const today = moment().format('YYYY-MM-DD');
  for (const s of students) {
    const exists = await Attendance.findOne({ userId: s._id, date: today });
    if (!exists) {
      await new Attendance({ userId: s._id, date: today, status: 'absent' }).save();
    }
  }
  ctx.reply("Yangi kun boshlandi!");
});

bot.action('lesson_started', async (ctx: any) => {
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    await bot.telegram.sendMessage(s.telegramId, "Dars boshlandi! Tez keling!");
  }
  ctx.reply("Xabar yuborildi!");
});

// === RENDER UCHUN HTTP SERVER ===
const port = parseInt(process.env.PORT || '10000');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'Telegram bot ishga tushdi!', uptime: process.uptime() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Render Web Service ${port}-portda ishga tushdi.`);
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 Telegram bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));