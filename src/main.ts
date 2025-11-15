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

// Schemalar
interface IUser extends Document {
  telegramId: number;
  phone: string;
  address: string;
  role: 'student' | 'teacher';
  registrationDate: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, default: 'student' },
  registrationDate: { type: Date, default: Date.now }
});

interface IAttendance extends Document {
  userId: Types.ObjectId;
  date: string;
  status: 'present' | 'late' | 'absent';
}

const AttendanceSchema = new Schema<IAttendance>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'late', 'absent'], required: true }
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

// Indexlar
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, month: 1 }, { unique: true });

// Modellar
const User = mongoose.model<IUser>('User', UserSchema);
const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// Bot
const bot = new Telegraf(BOT_TOKEN);

// Session — faqat LocalSession!
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// Helper
const isTeacher = (ctx: Context) => ctx.from?.id === TEACHER_ID;
const isRegistered = async (ctx: Context) => !!(await User.findOne({ telegramId: ctx.from?.id }));

moment.locale('uz');

// START
bot.start(async (ctx: any) => {
  const registered = await isRegistered(ctx);
  if (!registered) {
    return ctx.reply(
      "Assalom alaykum! Ro'yxatdan o'ting:",
      Markup.keyboard([["Ro'yxatdan o'tish"]]).resize()
    );
  }
  await showMainMenu(ctx);
});

// Asosiy menu
const showMainMenu = async (ctx: any) => {
  if (isTeacher(ctx)) {
    return ctx.reply("O'qituvchi paneli:", Markup.inlineKeyboard([
      [Markup.button.callback("O'quvchilar", 'list_students')],
      [Markup.button.callback("Yangi kun", 'new_day')]
    ]));
  } else {
    return ctx.reply("Menu:", Markup.inlineKeyboard([
      [Markup.button.callback("Profil", 'profile')],
      [Markup.button.callback("To'lov", 'payment_status')]
    ]));
  }
};

// Ro'yxatdan o'tish
bot.hears("Ro'yxatdan o'tish", async (ctx: any) => {
  if (await isRegistered(ctx)) return ctx.reply("Siz ro'yxatdan o'tgansiz!");
  ctx.session.step = 'phone';
  return ctx.reply("Telefon raqam (+998901234567):");
});

bot.on('text', async (ctx: any) => {
  if (!ctx.session?.step) return;

  if (ctx.session.step === 'phone') {
    if (!/^\+998\d{9}$/.test(ctx.message.text)) {
      return ctx.reply("Noto'g'ri format! +998901234567");
    }
    ctx.session.phone = ctx.message.text;
    ctx.session.step = 'address';
    return ctx.reply("Yashash manzilingiz:");
  }

  if (ctx.session.step === 'address') {
    const user = new User({
      telegramId: ctx.from.id,
      phone: ctx.session.phone,
      address: ctx.message.text,
      role: isTeacher(ctx) ? 'teacher' : 'student'
    });
    await user.save();
    delete ctx.session.step;
    return ctx.reply("Ro'yxatdan o'tdingiz!", Markup.removeKeyboard()).then(() => showMainMenu(ctx));
  }

  // Profil tahrirlash
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
      return ctx.reply("Ma'lumotlar yangilandi!").then(() => showMainMenu(ctx));
    }
  }
});

// Profil
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

// Tahrirlash
bot.action('edit_profile', (ctx: any) => {
  ctx.session = { edit: true, step: 'edit_phone' };
  ctx.reply("Yangi telefon raqam (+998901234567):");
});

// O'quvchilar
bot.action('list_students', async (ctx: any) => {
  if (!isTeacher(ctx)) return;
  const students = await User.find({ role: 'student' });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");

  const buttons = students.map(s => [
    Markup.button.callback(`${s.phone} — ${s.address}`, `student_${s._id}`)
  ]);
  ctx.reply("O'quvchilar:", Markup.inlineKeyboard(buttons));
});

// Bitta o'quvchi
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

// Kelish
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

// To'lov
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

// Yangi kun
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
  ctx.reply("Yangi kun boshlandi! Barcha o'quvchilar 'Kelmagan' deb belgilandi.");
});

// To'lov eslatma
setInterval(async () => {
  const nextMonth = moment().add(5, 'days').format('YYYY-MM');
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    const payment = await Payment.findOne({ userId: s._id, month: nextMonth });
    if (!payment || !payment.paid) {
      try {
        await bot.telegram.sendMessage(s.telegramId, "To'lov muddati yaqin! Tez to'lang.");
      } catch (e) { /* bloklangan */ }
    }
  }
}, 24 * 60 * 60 * 1000);

// Ishga tushirish
bot.launch();
console.log('Bot ishga tushdi!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));