import { Telegraf, Context, Markup } from 'telegraf';
import mongoose, { Model, Schema, Document, Types } from 'mongoose';
import LocalSession from 'telegraf-session-local';
import moment from 'moment';
import 'moment/locale/uz';
import 'dotenv/config';

// .env
const BOT_TOKEN = process.env.BOT_TOKEN || '8362213927:AAE7b0sqJi9BhUR06DptseyQ6jxwGfmg8GY';
const TEACHER_ID = Number(process.env.TEACHER_ID || 6186454238);
const DB_URI = process.env.DB_URI || 'mongodb+srv://shakarovlaziz243_db_user:admin123@cluster0.shafimh.mongodb.net/botdb?retryWrites=true&w=majority';

// MongoDB
mongoose.connect(DB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB xatosi:'));
db.once('open', () => console.log('MongoDB ulandi'));

// === MODELLAR ===
interface IUser extends Document {
  telegramId: number;
  phone: string;
  address: string;
  role: 'student' | 'teacher';
  group?: string;
  registrationDate: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, default: 'student' },
  group: String,
  registrationDate: { type: Date, default: Date.now }
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
  paid: boolean;
  paidAt?: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date }
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

// === START ===
bot.start(async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) {
    return ctx.reply("Assalom alaykum! Ro'yxatdan o'ting:", Markup.keyboard([["Ro'yxatdan o'tish"]]).resize());
  }
  await showMainMenu(ctx);
});

// === MENU ===
const showMainMenu = async (ctx: any) => {
  if (isTeacher(ctx)) {
    return ctx.reply("O'qituvchi paneli:", Markup.inlineKeyboard([
      [Markup.button.callback("O'quvchilar", 'list_students')],
      [Markup.button.callback("Yangi kun", 'new_day')],
      [Markup.button.callback("Jadval qo'shish", 'add_schedule')],
      [Markup.button.callback("Vazifa yuborish", 'send_homework')],
      [Markup.button.callback("Dars boshlandi", 'lesson_started')],
      [Markup.button.callback("Reyting", 'rating')]
    ]));
  } else {
    return ctx.reply("Menu:", Markup.inlineKeyboard([
      [Markup.button.callback("Profil", 'profile')],
      [Markup.button.callback("Jadval", 'view_schedule')],
      [Markup.button.callback("Vazifa yuborish", 'submit_homework')],
      [Markup.button.callback("To'lov", 'payment_status')],
      [Markup.button.callback("Reyting", 'rating')]
    ]));
  }
};

// === RO'YXATDAN O'TISH ===
bot.hears("Ro'yxatdan o'tish", async (ctx: any) => {
  if (await isRegistered(ctx)) return ctx.reply("Siz ro'yxatdan o'tgansiz!");
  ctx.session.step = 'reg_phone';
  return ctx.reply("Telefon (+998901234567):");
});

bot.on('text', async (ctx: any) => {
  if (!ctx.session?.step) return;

  if (ctx.session.step === 'reg_phone') {
    if (!/^\+998\d{9}$/.test(ctx.message.text)) return ctx.reply("Noto'g'ri format!");
    ctx.session.phone = ctx.message.text;
    ctx.session.step = 'reg_address';
    return ctx.reply("Manzil:");
  }

  if (ctx.session.step === 'reg_address') {
    await new User({
      telegramId: ctx.from.id,
      phone: ctx.session.phone,
      address: ctx.message.text,
      role: isTeacher(ctx) ? 'teacher' : 'student'
    }).save();
    delete ctx.session.step;
    return ctx.reply("Ro'yxatdan o'tdingiz!", Markup.removeKeyboard()).then(() => showMainMenu(ctx));
  }

  // === VAZIFA JAVOBI ===
  if (ctx.session.answering_homework) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    await new Homework({
      studentId: user!._id,
      date: moment().format('YYYY-MM-DD'),
      task: ctx.session.current_task || "Matematika vazifa",
      answer: ctx.message.text
    }).save();
    ctx.reply("Javob qabul qilindi!");
    delete ctx.session.answering_homework;
  }
});

// === PROFIL ===
bot.action('profile', async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Ro'yxatdan o'ting!");

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
Ism: ${ctx.from.first_name}
Telefon: ${user.phone}
Manzil: ${user.address}

Kelish:
Kelgan: ${statsMap.present}
Kechikib: ${statsMap.late}
Kelmagan: ${statsMap.absent}

To'lov: ${payment?.paid ? 'To\'landi' : 'To\'lanmagan'}
  `.trim();

  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), Markup.inlineKeyboard([
    [Markup.button.callback("Tahrirlash", 'edit_profile')]
  ]));
});

bot.action('edit_profile', (ctx: any) => {
  ctx.session = { edit: true, step: 'edit_phone' };
  ctx.reply("Yangi telefon:");
});

bot.on('text', async (ctx: any) => {
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
      return ctx.reply("Yangilandi!").then(() => showMainMenu(ctx));
    }
  }
});

// === JADVAL ===
bot.action('add_schedule', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
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

bot.on('text', async (ctx: any) => {
  if (ctx.session.step === 'sched_time') {
    ctx.session.time = ctx.message.text;
    ctx.session.step = 'sched_group';
    ctx.reply("Guruh (A-guruh):");
  }
  if (ctx.session.step === 'sched_group') {
    await new Schedule({ day: ctx.session.day, time: ctx.session.time, group: ctx.message.text }).save();
    delete ctx.session.step;
    ctx.reply("Jadval qo'shildi!");
  }
});

bot.action('view_schedule', async (ctx: any) => {
  const schedules = await Schedule.find();
  if (schedules.length === 0) return ctx.reply("Jadval yo'q.");
  const lines = schedules.map(s => `${s.day} | ${s.time} | ${s.group}`).join('\n');
  ctx.reply(`Dars jadvali:\n${lines}`);
});

// === VAZIFA ===
bot.action('send_homework', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  const task = "2x + 5 = 13 → x = ?";
  for (const s of students) {
    await bot.telegram.sendMessage(s.telegramId, `Uyga vazifa:\n${task}\nJavob yuboring:`);
  }
  ctx.reply("Vazifa yuborildi!");
});

bot.action('submit_homework', (ctx: any) => {
  ctx.session.answering_homework = true;
  ctx.session.current_task = "2x + 5 = 13";
  ctx.reply("Javobingizni yozing:");
});

// === REYTING ===
bot.action('rating', async (ctx: any) => {
  const top = await Attendance.aggregate([
    { $match: { status: 'present' } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
  ]);

  const lines = top.map((t: any, i: number) => `${i+1}. ${t.user[0].phone} — ${t.count} kun`).join('\n');
  ctx.reply(lines || "Reyting bo'sh");
});

// === DARS BOSHLANDI ===
bot.action('lesson_started', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    await bot.telegram.sendMessage(s.telegramId, "Dars boshlandi! Tez keling!");
  }
  ctx.reply("Xabar yuborildi!");
});

// === O'QUVCHILAR ===
bot.action('list_students', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");

  const buttons = students.map(s => [
    Markup.button.callback(`${s.phone} — ${s.address}`, `student_${s._id}`)
  ]);
  ctx.reply("O'quvchilar:", Markup.inlineKeyboard(buttons));
});

bot.action(/student_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
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

  if (!payment?.paid) {
    buttons.push([Markup.button.callback("To'lov qildi", `pay_${studentId}`)]);
  }

  ctx.replyWithHTML(`
<b>${student.phone}</b>
Manzil: ${student.address}
Bugun: ${status}
To'lov: ${paid}
  `, Markup.inlineKeyboard(buttons));
});

bot.action(/att_(present|late|absent)_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
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

bot.action(/pay_(.+)/, async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const studentId = ctx.match[1];
  const month = moment().format('YYYY-MM');
  await Payment.updateOne(
    { userId: studentId, month },
    { paid: true, paidAt: new Date() },
    { upsert: true }
  );
  ctx.reply("To'lov tasdiqlandi!");
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
  ctx.reply("Yangi kun boshlandi!");
});

bot.action('payment_status', async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user!._id, month: currentMonth });
  ctx.reply(payment?.paid ? "To'lov amalga oshirildi!" : "To'lov kutilmoqda!");
});

// === TO'LOV ESLATMA ===
setInterval(async () => {
  const nextMonth = moment().add(5, 'days').format('YYYY-MM');
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    const payment = await Payment.findOne({ userId: s._id, month: nextMonth });
    if (!payment || !payment.paid) {
      try {
        await bot.telegram.sendMessage(s.telegramId, "To'lov muddati yaqin! Tez to'lang.");
      } catch (e) { }
    }
  }
}, 24 * 60 * 60 * 1000);

// === BOT ISHGA TUSHIRISH ===
bot.launch();
console.log('Bot ishga tushdi!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));