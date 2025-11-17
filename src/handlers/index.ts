// import { Markup } from 'telegraf';
// import { User, Attendance, Payment, Schedule, Homework, IUser, IHomework } from '../config/database';
// import { isTeacher, isRegistered, getLanguage, t, setMomentLocale, TEACHER_ID, PAYMENT_CARD_NUMBER, PAYMENT_CARD_NAME, backButton } from '../utils/helpers';
// import moment from 'moment';

// // === ASOSIY MENYU ===
// export const showMainMenu = async (ctx: any) => {
//   setMomentLocale(ctx);
  
//   if (isTeacher(ctx)) {
//     return ctx.reply("👨‍🏫 O'qituvchi paneli:", Markup.inlineKeyboard([
//       [Markup.button.callback(t('students', ctx), 'list_students')],
//       [Markup.button.callback(t('payment', ctx), 'payment_list')],
//       [Markup.button.callback("🔄 Yangi kun", 'new_day')],
//       [Markup.button.callback("📅 Jadval qo'shish", 'add_schedule')],
//       [Markup.button.callback(t('homework', ctx), 'manual_homework')],
//       [Markup.button.callback("📝 Tekshirilmagan vazifalar", 'check_homework')],
//       [Markup.button.callback(t('attendance', ctx), 'take_attendance')],
//       [Markup.button.callback(t('rating', ctx), 'rating')],
//       [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
//     ]));
//   } else {
//     return ctx.reply("🎓 O'quvchi menyusi:", Markup.inlineKeyboard([
//       [Markup.button.callback(t('profile', ctx), 'profile')],
//       [Markup.button.callback(t('payment', ctx), 'payment_status')],
//       [Markup.button.callback("📊 To'lov tarixi", 'payment_history')],
//       [Markup.button.callback(t('schedule', ctx), 'view_schedule')],
//       [Markup.button.callback(t('homework', ctx), 'submit_homework')],
//       [Markup.button.callback("📈 O'quvchilar statistikasi", 'student_stats')],
//       [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
//     ]));
//   }
// };

// // === PROFIL ===
// export const showProfile = async (ctx: any) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply(t('not_registered', ctx));
  
//   const stats = await Attendance.aggregate([
//     { $match: { userId: user._id } },
//     { $group: { _id: '$status', count: { $sum: 1 } } }
//   ]);
  
//   const statsMap = { present: 0, late: 0, absent: 0 };
//   stats.forEach((s: any) => statsMap[s._id] = s.count);
  
//   const currentMonth = moment().format('YYYY-MM');
//   const payment = await Payment.findOne({ userId: user._id, month: currentMonth });
  
//   const msg = `
// *${t('profile', ctx)}*

// 👤 ${t('name', ctx)}: ${user.fullName}
// 📞 ${t('phone', ctx)}: ${user.phone}
// 📍 ${t('address', ctx)}: ${user.address}
// 💵 ${t('payment_day', ctx)}: ${user.paymentDay}-${t('day', ctx)}
// 💰 ${t('amount', ctx)}: ${user.paymentAmount.toLocaleString()} so'm

// 📊 ${t('attendance', ctx)}:
// ${t('present', ctx)}: ${statsMap.present}
// ${t('late', ctx)}: ${statsMap.late}  
// ${t('absent', ctx)}: ${statsMap.absent}

// 💳 ${t('payment', ctx)}: ${payment?.paid ? t('payment_paid', ctx) : t('payment_unpaid', ctx)}
// `.trim();

//   ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [Markup.button.callback(t('edit', ctx), 'edit_profile')],
//       [backButton('back_to_menu', ctx)]
//     ]).reply_markup
//   });
// };

// // === O'QUVCHILAR RO'YXATI ===
// export const listStudents = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const students = await User.find({ role: 'student' });
//   if (students.length === 0) return ctx.reply("O'quvchi yo'q.");
  
//   const buttons = students.map(s => [Markup.button.callback(`${s.fullName} — ${s.address}`, `student_${s._id}`)]);
//   ctx.reply("O'quvchilar:", { 
//     reply_markup: Markup.inlineKeyboard([...buttons, [backButton('back_to_menu', ctx)]]).reply_markup 
//   });
// };

// // === YANGI KUN ===
// export const newDay = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const students = await User.find({ role: 'student' });
//   const today = moment().format('YYYY-MM-DD');
//   for (const s of students) {
//     const exists = await Attendance.findOne({ userId: s._id, date: today });
//     if (!exists) {
//       await new Attendance({ userId: s._id, date: today, status: 'absent' }).save();
//     }
//   }
//   ctx.reply("✅ Yangi kun boshlandi!", { 
//     reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
//   });
// };

// // === JADVAL QO'SHISH ===
// export const addSchedule = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
  
//   const dayButtons = days.map(day => [Markup.button.callback(day, `sched_day_${day}`)]);
  
//   await ctx.reply("Hafta kunini tanlang:", {
//     reply_markup: Markup.inlineKeyboard([
//       ...dayButtons,
//       [backButton('back_to_menu', ctx)]
//     ]).reply_markup
//   });
// };

// // === VAZIFA YUBORISH ===
// export const manualHomework = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
//   ctx.session.step = 'send_homework_content';
//   ctx.reply("O'quvchilarga uyga vazifa yuboring (matn yoki rasm):");
// };

// // === DAVOMAT QILISH ===
// export const takeAttendance = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
//   if (students.length === 0) {
//     return ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
//   }

//   const today = moment().format('YYYY-MM-DD');
  
//   const todayAttendance = await Attendance.find({ date: today }).populate<{ userId: IUser }>('userId');
//   const attendanceMap = new Map();
//   todayAttendance.forEach((att: any) => {
//     if (att.userId && att.userId._id) {
//       attendanceMap.set(att.userId._id.toString(), att.status);
//     }
//   });

//   const studentChunks: IUser[][] = [];
//   for (let i = 0; i < students.length; i += 5) {
//     studentChunks.push(students.slice(i, i + 5));
//   }

//   for (let chunkIndex = 0; chunkIndex < studentChunks.length; chunkIndex++) {
//     const chunk = studentChunks[chunkIndex];
//     const buttons: any[] = [];
    
//     for (const student of chunk) {
//       const studentId = (student as any)._id?.toString();
//       const currentStatus = attendanceMap.get(studentId) || 'not_marked';
//       let statusText = '';
      
//       switch (currentStatus) {
//         case 'present':
//           statusText = t('present', ctx);
//           break;
//         case 'late':
//           statusText = t('late', ctx);
//           break;
//         case 'absent':
//           statusText = t('absent', ctx);
//           break;
//         default:
//           statusText = t('not_marked', ctx);
//       }
      
//       buttons.push([
//         Markup.button.callback(
//           `${student.fullName} - ${statusText}`,
//           `attendance_student_${studentId}`
//         )
//       ]);
//     }

//     const navigationButtons: any[] = [];
//     if (chunkIndex > 0) {
//       navigationButtons.push(Markup.button.callback('⬅️ ' + t('previous', ctx), `attendance_page_${chunkIndex - 1}`));
//     }
//     if (chunkIndex < studentChunks.length - 1) {
//       navigationButtons.push(Markup.button.callback(t('next', ctx) + ' ➡️', `attendance_page_${chunkIndex + 1}`));
//     }
    
//     if (navigationButtons.length > 0) {
//       buttons.push(navigationButtons);
//     }

//     buttons.push([backButton('back_to_menu', ctx)]);

//     const messageText = t('take_attendance', ctx, { date: today });

//     await ctx.replyWithMarkdown(
//       messageText,
//       { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
//     );
//   }

//   ctx.answerCbQuery();
// };

// // Davomat sahifalari uchun handler
// export const attendancePageHandler = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const page = parseInt(ctx.match[1]);
//   const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
//   const studentChunks: IUser[][] = [];
  
//   for (let i = 0; i < students.length; i += 5) {
//     studentChunks.push(students.slice(i, i + 5));
//   }

//   if (page < 0 || page >= studentChunks.length) {
//     return ctx.answerCbQuery("Noto'g'ri sahifa!");
//   }

//   const chunk = studentChunks[page];
//   const today = moment().format('YYYY-MM-DD');
//   const todayAttendance = await Attendance.find({ date: today }).populate<{ userId: IUser }>('userId');
//   const attendanceMap = new Map();
//   todayAttendance.forEach((att: any) => {
//     if (att.userId && att.userId._id) {
//       attendanceMap.set(att.userId._id.toString(), att.status);
//     }
//   });

//   const buttons: any[] = [];
  
//   for (const student of chunk) {
//     const studentId = (student as any)._id?.toString();
//     const currentStatus = attendanceMap.get(studentId) || 'not_marked';
//     let statusText = '';
    
//     switch (currentStatus) {
//       case 'present':
//         statusText = t('present', ctx);
//         break;
//       case 'late':
//         statusText = t('late', ctx);
//         break;
//       case 'absent':
//         statusText = t('absent', ctx);
//         break;
//       default:
//         statusText = t('not_marked', ctx);
//     }
    
//     buttons.push([
//       Markup.button.callback(
//         `${student.fullName} - ${statusText}`,
//         `attendance_student_${studentId}`
//       )
//     ]);
//   }

//   const navigationButtons: any[] = [];
//   if (page > 0) {
//     navigationButtons.push(Markup.button.callback('⬅️ ' + t('previous', ctx), `attendance_page_${page - 1}`));
//   }
//   if (page < studentChunks.length - 1) {
//     navigationButtons.push(Markup.button.callback(t('next', ctx) + ' ➡️', `attendance_page_${page + 1}`));
//   }
  
//   if (navigationButtons.length > 0) {
//     buttons.push(navigationButtons);
//   }

//   buttons.push([backButton('back_to_menu', ctx)]);

//   await ctx.editMessageText(
//     t('take_attendance', ctx, { date: today }) + ` (${page + 1}/${studentChunks.length})`,
//     {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard(buttons).reply_markup
//     }
//   );

//   ctx.answerCbQuery();
// };

// // Har bir o'quvchi uchun davomat belgilash
// export const attendanceStudentHandler = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.answerCbQuery("O'quvchi topilmadi!");

//   await ctx.reply(
//     t('mark_attendance', ctx, { name: student.fullName }),
//     {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [
//           Markup.button.callback(t('present', ctx), `mark_present_${studentId}`),
//           Markup.button.callback(t('late', ctx), `mark_late_${studentId}`)
//         ],
//         [
//           Markup.button.callback(t('absent', ctx), `mark_absent_${studentId}`)
//         ],
//         [
//           backButton('take_attendance', ctx)
//         ]
//       ]).reply_markup
//     }
//   );

//   ctx.answerCbQuery();
// };

// // Davomat belgilash handlerlari
// export const markAttendanceHandler = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const status = ctx.match[1];
//   const studentId = ctx.match[2];
//   const today = moment().format('YYYY-MM-DD');
  
//   const student = await User.findById(studentId);
//   if (!student) return ctx.answerCbQuery("O'quvchi topilmadi!");

//   await Attendance.findOneAndUpdate(
//     { userId: studentId, date: today },
//     { status, date: today },
//     { upsert: true, new: true }
//   );

//   const statusText = {
//     present: t('present', ctx),
//     late: t('late', ctx), 
//     absent: t('absent', ctx)
//   }[status];

//   await ctx.reply(
//     t('attendance_marked', ctx, { name: student.fullName, status: statusText }),
//     {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [backButton('take_attendance', ctx)]
//       ]).reply_markup
//     }
//   );

//   // O'quvchiga xabar yuborish
//   try {
//     const studentUser = await User.findById(studentId);
//     if (studentUser) {
//       const statusMessage = {
//         present: t('present', { session: { language: studentUser.language } }),
//         late: t('late', { session: { language: studentUser.language } }),
//         absent: t('absent', { session: { language: studentUser.language } })
//       }[status];

//       await ctx.telegram.sendMessage(
//         studentUser.telegramId,
//         `${statusMessage}\nSana: ${today}`
//       );
//     }
//   } catch (e) {
//     console.log(`O'quvchiga xabar yuborilmadi: ${student.fullName}`);
//   }

//   ctx.answerCbQuery("Davomat belgilandi!");
// };

// // === TO'LOV STATUS ===
// export const showPaymentStatus = async (ctx: any) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply(t('not_registered', ctx));

//   const currentMonth = moment().format('YYYY-MM');
//   let payment = await Payment.findOne({ userId: user._id, month: currentMonth });
//   if (!payment) {
//     payment = await new Payment({ userId: user._id, month: currentMonth, amount: user.paymentAmount }).save();
//   }

//   const status = payment.paid ? t('payment_paid', ctx) : t('payment_unpaid', ctx);

//   const msg = t('payment_info', ctx, {
//     month: moment().format('MMMM YYYY'),
//     amount: payment.amount.toLocaleString(),
//     day: user.paymentDay,
//     status: status,
//     cardNumber: PAYMENT_CARD_NUMBER,
//     cardName: PAYMENT_CARD_NAME
//   });

//   const buttons: any[][] = [];
//   if (!payment.paid) {
//     buttons.push([Markup.button.callback(t('send_receipt', ctx), 'send_receipt')]);
//     buttons.push([Markup.button.callback(t('offline_payment', ctx), 'offline_payment')]);
//   }
//   buttons.push([Markup.button.callback(t('history', ctx), 'payment_history')]);
//   buttons.push([backButton('back_to_menu', ctx)]);

//   ctx.replyWithMarkdownV2(
//     msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'),
//     { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
//   );
// };

// // === TO'LOVLAR RO'YXATI (O'QITUVCHI) ===
// export const showPaymentList = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const currentMonth = moment().format('YYYY-MM');
//   const payments = await Payment.find({ month: currentMonth }).populate<{ userId: IUser }>('userId');
  
//   if (payments.length === 0) {
//     return ctx.reply("Bu oy uchun to'lovlar topilmadi.", {
//       reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
//     });
//   }

//   const paid = payments.filter(p => p.paid);
//   const unpaid = payments.filter(p => !p.paid);

//   let message = `*${moment().format('MMMM YYYY')} TO'LOVLARI*\n\n`;
//   message += `✅ To'langan: ${paid.length} ta\n`;
//   message += `❌ To'lanmagan: ${unpaid.length} ta\n\n`;

//   if (unpaid.length > 0) {
//     message += `*To'lanmaganlar:*\n`;
//     unpaid.forEach((p, index) => {
//       const student = (p.userId as any);
//       if (student && student.fullName) {
//         message += `${index + 1}. ${student.fullName} - ${p.amount.toLocaleString()} so'm\n`;
//       } else {
//         message += `${index + 1}. [O'quvchi topilmadi] - ${p.amount.toLocaleString()} so'm\n`;
//       }
//     });
//   }

//   if (paid.length > 0) {
//     message += `\n*To'langanlar:*\n`;
//     paid.forEach((p, index) => {
//       const student = (p.userId as any);
//       const date = moment(p.paidAt).format('DD.MM');
//       const method = p.method === 'receipt' ? 'Chek' : 'Naqd';
//       if (student && student.fullName) {
//         message += `${index + 1}. ${student.fullName} - ${p.amount.toLocaleString()} so'm (${date}, ${method})\n`;
//       } else {
//         message += `${index + 1}. [O'quvchi topilmadi] - ${p.amount.toLocaleString()} so'm (${date}, ${method})\n`;
//       }
//     });
//   }

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [backButton('back_to_menu', ctx)]
//     ]).reply_markup
//   });
// };

// // === REYTING ===
// export const showRating = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const students = await User.find({ role: 'student' });
//   if (students.length === 0) {
//     return ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
//   }

//   const studentStats = await Promise.all(
//     students.map(async (student) => {
//       const attendances = await Attendance.find({ userId: student._id });
//       const homeworks = await Homework.find({ studentId: student._id, checked: true });
      
//       const presentCount = attendances.filter(a => a.status === 'present').length;
//       const lateCount = attendances.filter(a => a.status === 'late').length;
//       const totalClasses = attendances.length;
      
//       const avgScore = homeworks.length > 0 
//         ? homeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / homeworks.length 
//         : 0;
      
//       const attendanceRate = totalClasses > 0 ? (presentCount + lateCount * 0.7) / totalClasses : 0;
//       const rating = (attendanceRate * 70) + (avgScore * 6);

//       return {
//         student,
//         rating: Math.round(rating * 100) / 100,
//         presentCount,
//         lateCount,
//         absentCount: attendances.filter(a => a.status === 'absent').length,
//         totalClasses,
//         avgScore: Math.round(avgScore * 100) / 100,
//         completedHomeworks: homeworks.length
//       };
//     })
//   );

//   studentStats.sort((a, b) => b.rating - a.rating);

//   let message = `🏆 *O'quvchilar Reytingi* 🏆\n\n`;
  
//   studentStats.forEach((stat, index) => {
//     const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
//     message += `${medal} *${stat.student.fullName}*\n`;
//     message += `📊 Reyting: ${stat.rating} ball\n`;
//     message += `📈 Davomat: ${stat.presentCount}✅ ${stat.lateCount}⏰ ${stat.absentCount}❌\n`;
//     message += `📚 Vazifalar: ${stat.avgScore}/5 (${stat.completedHomeworks} ta)\n\n`;
//   });

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [backButton('back_to_menu', ctx)]
//     ]).reply_markup
//   });
// };

// // === TEKSHRILMAGAN VAZIFALAR ===
// const showHomeworkPage = async (ctx: any, chunks: any[][], page: number) => {
//   if (page < 0 || page >= chunks.length) return;

//   const chunk = chunks[page];
//   const buttons: any[] = [];

//   for (const hw of chunk) {
//     const studentName = (hw.studentId as any).fullName;
//     const date = moment(hw.date).format('DD.MM.YYYY');
//     const hasPhoto = !!(hw as any).answerPhoto;
//     const hasText = !!(hw as any).answerText;
    
//     let label = `${studentName} - ${date}`;
//     if (hasPhoto) label += " 📷";
//     if (hasText) label += " 📝";

//     buttons.push([
//       Markup.button.callback(label, `review_hw_${hw._id}`)
//     ]);
//   }

//   const navigationButtons: any[] = [];
//   if (page > 0) {
//     navigationButtons.push(Markup.button.callback('⬅️ Oldingi', `hw_page_${page - 1}`));
//   }
//   if (page < chunks.length - 1) {
//     navigationButtons.push(Markup.button.callback('Keyingi ➡️', `hw_page_${page + 1}`));
//   }

//   if (navigationButtons.length > 0) {
//     buttons.push(navigationButtons);
//   }

//   buttons.push([backButton('back_to_menu', ctx)]);

//   await ctx.editMessageText(
//     `📝 Tekshirilmagan vazifalar (${page + 1}/${chunks.length}):`,
//     {
//       reply_markup: Markup.inlineKeyboard(buttons).reply_markup
//     }
//   );
// };

// export const showUncheckedHomeworks = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const uncheckedHomeworks = await Homework.find({ 
//     checked: false,
//     $or: [
//       { answerText: { $exists: true, $ne: "" } },
//       { answerPhoto: { $exists: true, $ne: "" } }
//     ]
//   }).populate<{ studentId: IUser }>('studentId');

//   if (uncheckedHomeworks.length === 0) {
//     return ctx.reply("✅ Tekshirilmagan vazifalar yo'q!", {
//       reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
//     });
//   }

//   const homeworkChunks: any[][] = [];
//   for (let i = 0; i < uncheckedHomeworks.length; i += 5) {
//     homeworkChunks.push(uncheckedHomeworks.slice(i, i + 5));
//   }

//   await showHomeworkPage(ctx, homeworkChunks, 0);
// };

// export const showHomeworkPageHandler = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const page = parseInt(ctx.match[1]);
//   const uncheckedHomeworks = await Homework.find({ 
//     checked: false,
//     $or: [
//       { answerText: { $exists: true, $ne: "" } },
//       { answerPhoto: { $exists: true, $ne: "" } }
//     ]
//   }).populate<{ studentId: IUser }>('studentId');

//   const homeworkChunks: any[][] = [];
//   for (let i = 0; i < uncheckedHomeworks.length; i += 5) {
//     homeworkChunks.push(uncheckedHomeworks.slice(i, i + 5));
//   }

//   await showHomeworkPage(ctx, homeworkChunks, page);
//   ctx.answerCbQuery();
// };

// // === TO'LOV TARIXI ===
// export const showPaymentHistory = async (ctx: any) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply(t('not_registered', ctx));

//   const payments = await Payment.find({ userId: user._id, paid: true }).sort({ paidAt: -1 });
//   if (payments.length === 0) {
//     return ctx.reply("Siz hali to'lov qilmagansiz.", { 
//       reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
//     });
//   }

//   const lines = payments.map(p => {
//     const date = moment(p.paidAt).format('DD.MM.YYYY');
//     const method = p.method === 'receipt' ? 'Chek' : 'Naqd';
//     return `${date} | ${p.amount.toLocaleString()} so'm | ${method}`;
//   }).join('\n');

//   ctx.replyWithHTML(`<b>To'lov tarixi</b>\n\n<pre>${lines}</pre>`, {
//     reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
//   });
// };

// // === JADVAL ===
// export const viewSchedule = async (ctx: any) => {
//   const schedules = await Schedule.find();
//   if (schedules.length === 0) return ctx.reply("Jadval yo'q.");
//   const lines = schedules.map((s: any) => `${s.day} | ${s.time} | ${s.group}`).join('\n');
//   ctx.reply(`Dars jadvali:\n${lines}`, { 
//     reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
//   });
// };

// // === O'QUVCHI STATISTIKASI ===
// export const showStudentStats = async (ctx: any) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply(t('not_registered', ctx));

//   const attendances = await Attendance.find({ userId: user._id });
//   const presentCount = attendances.filter(a => a.status === 'present').length;
//   const lateCount = attendances.filter(a => a.status === 'late').length;
//   const absentCount = attendances.filter(a => a.status === 'absent').length;
//   const totalClasses = attendances.length;

//   const homeworks = await Homework.find({ studentId: user._id });
//   const checkedHomeworks = homeworks.filter(hw => hw.checked);
//   const avgScore = checkedHomeworks.length > 0 
//     ? checkedHomeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / checkedHomeworks.length 
//     : 0;

//   const payments = await Payment.find({ userId: user._id });
//   const paidCount = payments.filter(p => p.paid).length;
//   const totalPayments = payments.length;

//   const message = `
// *📊 Sizning Statistikangiz*

// *📈 Davomat:*
// ✅ Kelgan: ${presentCount} marta
// ⏰ Kechikkan: ${lateCount} marta  
// ❌ Kelmagan: ${absentCount} marta
// 📅 Jami dars: ${totalClasses} ta

// *📚 Vazifalar:*
// 📝 Bajargan: ${homeworks.length} ta
// ✅ Tekshirilgan: ${checkedHomeworks.length} ta
// 🏅 O'rtacha baho: ${Math.round(avgScore * 100) / 100}/5

// *💳 To'lovlar:*
// ✅ To'langan: ${paidCount} ta
// 📊 Jami: ${totalPayments} ta
//   `.trim();

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [backButton('back_to_menu', ctx)]
//     ]).reply_markup
//   });
// };

// // === O'QUVCHI MA'LUMOTLARI ===
// export const showStudentDetails = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.reply("O'quvchi topilmadi.");

//   // O'quvchi statistikasi
//   const attendances = await Attendance.find({ userId: student._id });
//   const presentCount = attendances.filter(a => a.status === 'present').length;
//   const lateCount = attendances.filter(a => a.status === 'late').length;
//   const absentCount = attendances.filter(a => a.status === 'absent').length;
//   const totalClasses = attendances.length;

//   const homeworks = await Homework.find({ studentId: student._id });
//   const checkedHomeworks = homeworks.filter(hw => hw.checked);
//   const avgScore = checkedHomeworks.length > 0 
//     ? checkedHomeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / checkedHomeworks.length 
//     : 0;

//   const currentMonth = moment().format('YYYY-MM');
//   const payment = await Payment.findOne({ userId: student._id, month: currentMonth });

//   const message = `
// *👤 O'QUVCHI MA'LUMOTLARI*

// *Asosiy ma'lumotlar:*
// 👤 Ism: *${student.fullName}*
// 📞 Telefon: \`${student.phone}\`
// 📍 Manzil: *${student.address}*
// 🌐 Til: *${student.language === 'uz' ? "O'zbek" : student.language === 'ru' ? 'Rus' : 'Ingliz'}*

// *To'lov sozlamalari:*
// 💵 To'lov kuni: *${student.paymentDay}-kun*
// 💰 Oylik to'lov: *${student.paymentAmount.toLocaleString()} so'm*
// 📅 Joriy oy holati: *${payment?.paid ? "✅ To'langan" : "❌ To'lanmagan"}*

// *📊 Statistikalar:*
// 📈 Davomat: ${presentCount}✅ ${lateCount}⏰ ${absentCount}❌
// 📚 Vazifalar: ${homeworks.length} ta (${checkedHomeworks.length} ta tekshirilgan)
// 🏅 O'rtacha baho: ${Math.round(avgScore * 100) / 100}/5
// 📅 Jami darslar: ${totalClasses} ta
// `.trim();

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [
//         Markup.button.callback("💰 To'lov kunini o'zgartirish", `set_payment_day_${student._id}`),
//         Markup.button.callback("💵 Summani o'zgartirish", `set_payment_amount_${student._id}`)
//       ],
//       [
//         Markup.button.callback("📊 Davomat tarixi", `attendance_history_${student._id}`),
//         Markup.button.callback("📚 Vazifa tarixi", `homework_history_${student._id}`)
//       ],
//       [backButton('list_students', ctx)]
//     ]).reply_markup
//   });
// };

// // === TO'LOV KUNINI O'ZGARTIRISH ===
// export const setPaymentDay = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.reply("O'quvchi topilmadi.");

//   ctx.session.step = 'set_payment_day';
//   ctx.session.studentId = studentId;

//   ctx.reply(`O'quvchi: *${student.fullName}*\n\nYangi to'lov kunini kiriting (1-31 oralig'ida):`, {
//     parse_mode: 'Markdown',
//     reply_markup: Markup.inlineKeyboard([
//       [backButton(`student_${studentId}`, ctx)]
//     ]).reply_markup
//   });
// };

// // === TO'LOV SUMMASINI O'ZGARTIRISH ===
// export const setPaymentAmount = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.reply("O'quvchi topilmadi.");

//   ctx.session.step = 'set_payment_amount';
//   ctx.session.studentId = studentId;

//   ctx.reply(`O'quvchi: *${student.fullName}*\n\nJoriy summa: *${student.paymentAmount.toLocaleString()} so'm*\n\nYangi oylik to'lov summasini kiriting:`, {
//     parse_mode: 'Markdown',
//     reply_markup: Markup.inlineKeyboard([
//       [backButton(`student_${studentId}`, ctx)]
//     ]).reply_markup
//   });
// };

// // === DAVOMAT TARIXI ===
// export const showAttendanceHistory = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.reply("O'quvchi topilmadi.");

//   const attendances = await Attendance.find({ userId: student._id })
//     .sort({ date: -1 })
//     .limit(20);

//   if (attendances.length === 0) {
//     return ctx.reply(`*${student.fullName}* uchun davomat ma'lumotlari topilmadi.`, {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [backButton(`student_${studentId}`, ctx)]
//       ]).reply_markup
//     });
//   }

//   let message = `*${student.fullName} - Davomat tarixi*\n\n`;
  
//   attendances.forEach((att, index) => {
//     const date = moment(att.date).format('DD.MM.YYYY');
//     const status = {
//       present: '✅',
//       late: '⏰', 
//       absent: '❌'
//     }[att.status];
    
//     message += `${index + 1}. ${date} - ${status} ${att.status}\n`;
//   });

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [backButton(`student_${studentId}`, ctx)]
//     ]).reply_markup
//   });
// };

// // === VAZIFA TARIXI ===
// export const showHomeworkHistory = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const studentId = ctx.match[1];
//   const student = await User.findById(studentId);
//   if (!student) return ctx.reply("O'quvchi topilmadi.");

//   const homeworks = await Homework.find({ studentId: student._id })
//     .sort({ date: -1 })
//     .limit(20);

//   if (homeworks.length === 0) {
//     return ctx.reply(`*${student.fullName}* uchun vazifa ma'lumotlari topilmadi.`, {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [backButton(`student_${studentId}`, ctx)]
//       ]).reply_markup
//     });
//   }

//   let message = `*${student.fullName} - Vazifa tarixi*\n\n`;
  
//   homeworks.forEach((hw, index) => {
//     const date = moment(hw.date).format('DD.MM.YYYY');
//     const status = hw.checked ? `✅ ${hw.score}/5` : '⏳ Tekshirilmagan';
//     const hasAnswer = hw.answerText || hw.answerPhoto ? '📝' : '❌';
    
//     message += `${index + 1}. ${date} - ${hasAnswer} ${status}\n`;
//     if (hw.checked && hw.feedback) {
//       message += `   📌 ${hw.feedback}\n`;
//     }
//   });

//   ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
//     reply_markup: Markup.inlineKeyboard([
//       [backButton(`student_${studentId}`, ctx)]
//     ]).reply_markup
//   });
// };

// // === YANGI TO'LOV HANDLERLARI ===

// export const sendReceipt = async (ctx: any) => {
//   ctx.session.waitingForReceipt = true;
//   await ctx.reply(
//     "💳 To'lov chekini yuboring (rasm):\n\n" +
//     "• Bank ilovasidagi to'lov chekini skrinshot qiling\n" +
//     "• Rasmni shu yerga yuboring",
//     {
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "🔙 Orqaga", callback_data: "payment_status" }]
//         ]
//       }
//     }
//   );
// };

// export const offlinePayment = async (ctx: any) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

//   const currentMonth = moment().format('YYYY-MM');
//   const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
  
//   if (!payment) {
//     return ctx.reply("Bu oy uchun to'lov topilmadi yoki allaqachon to'langan.");
//   }

//   const message = `
// *NAQD TO'LOV*

// O'quvchi: *${user.fullName}*
// Telefon: \`${user.phone}\`
// Oy: *${moment().format('MMMM YYYY')}*
// Summa: *${payment.amount.toLocaleString()} so'm*

// *O'qituvchi tomonidan tasdiqlanishi kutilmoqda...*
//   `.trim();

//   try {
//     await ctx.telegram.sendMessage(TEACHER_ID, message, {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [
//           Markup.button.callback("✅ Tasdiqlash", `confirm_offline_${payment._id}`),
//           Markup.button.callback("❌ Rad etish", `reject_receipt_${payment._id}`)
//         ]
//       ]).reply_markup
//     });

//     await ctx.replyWithHTML(`
// <b>Naqd to'lov so'rovi yuborildi!</b>

// O'qituvchi tekshirib, tasdiqlaydi.
// Sabr qiling...
//     `.trim(), {
//       reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
//     });
//   } catch (e) {
//     await ctx.reply("Xatolik yuz berdi. Qayta urining.");
//   }
// };

// export const confirmPayment = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const method = ctx.match[1]; // 'receipt' yoki 'offline'
//   const paymentId = ctx.match[2];
  
//   const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
//   if (!payment) {
//     return ctx.answerCbQuery("To'lov topilmadi!");
//   }

//   if (payment.paid) {
//     return ctx.answerCbQuery("Bu to'lov allaqachon tasdiqlangan!");
//   }

//   // To'lovni tasdiqlash
//   payment.paid = true;
//   payment.paidAt = new Date();
//   payment.method = method === 'receipt' ? 'receipt' : 'offline';
//   await payment.save();

//   const student = payment.userId as any;
//   const monthName = moment(payment.month + '-01').format('MMMM YYYY');

//   // Yangi xabar matni
//   const newMessage = `✅ *To'lov tasdiqlandi!*\n\n` +
//     `O'quvchi: *${student.fullName}*\n` +
//     `Telefon: \`${student.phone}\`\n` +
//     `Oy: *${monthName}*\n` +
//     `Summa: *${payment.amount.toLocaleString()} so'm*\n` +
//     `Usul: *${method === 'receipt' ? 'Chek' : 'Naqd'}*\n` +
//     `Tasdiqlangan: *${moment().format('DD.MM.YYYY HH:mm')}*`;

//   try {
//     // Agar rasmli xabar bo'lsa, caption ni yangilash
//     if (ctx.callbackQuery.message.photo) {
//       await ctx.editMessageCaption(newMessage, { 
//         parse_mode: 'Markdown'
//       });
//       // Inline tugmalarni olib tashlash
//       await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
//     } else {
//       // Agar matnli xabar bo'lsa
//       await ctx.editMessageText(newMessage, { 
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: [] }
//       });
//     }
//   } catch (error) {
//     // Agar xabarni o'zgartirishda xatolik bo'lsa, yangi xabar yuboramiz
//     console.log("Xabarni o'zgartirishda xatolik, yangi xabar yuborilmoqda...");
//     await ctx.reply(newMessage, { 
//       parse_mode: 'Markdown'
//     });
    
//     // Eski xabarni o'chirishga urinib ko'ramiz
//     try {
//       await ctx.deleteMessage();
//     } catch (e) {
//       // O'chirish mumkin bo'lmasa, hech narsa qilmaymiz
//     }
//   }

//   // O'quvchiga xabar
//   try {
//     const studentLang = student.language || 'uz';
//     const methodText = method === 'receipt' ? 'chek' : 'naqd';
//     const successMessage = t('payment_success', { session: { language: studentLang } }, {
//       month: monthName,
//       amount: payment.amount.toLocaleString(),
//       method: methodText
//     });

//     await ctx.telegram.sendMessage(student.telegramId, successMessage, {
//       parse_mode: 'Markdown'
//     });
//   } catch (e) {
//     console.log(`O'quvchiga xabar yuborilmadi: ${student.fullName}`);
//   }

//   ctx.answerCbQuery("To'lov tasdiqlandi!");
// };

// export const rejectReceipt = async (ctx: any) => {
//   if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
//   const paymentId = ctx.match[1];
//   const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
  
//   if (!payment) {
//     return ctx.answerCbQuery("To'lov topilmadi!");
//   }

//   const student = payment.userId as any;
//   const monthName = moment(payment.month + '-01').format('MMMM YYYY');

//   // Yangi xabar matni
//   const newMessage = `❌ *To'lov rad etildi!*\n\n` +
//     `O'quvchi: *${student.fullName}*\n` +
//     `Telefon: \`${student.phone}\`\n` +
//     `Oy: *${monthName}*\n` +
//     `Summa: *${payment.amount.toLocaleString()} so'm*\n` +
//     `Sabab: Noto'g'ri chek yoki ma'lumotlar`;

//   try {
//     // Agar rasmli xabar bo'lsa, caption ni yangilash
//     if (ctx.callbackQuery.message.photo) {
//       await ctx.editMessageCaption(newMessage, { 
//         parse_mode: 'Markdown'
//       });
//       // Inline tugmalarni olib tashlash
//       await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
//     } else {
//       // Agar matnli xabar bo'lsa
//       await ctx.editMessageText(newMessage, { 
//         parse_mode: 'Markdown',
//         reply_markup: { inline_keyboard: [] }
//       });
//     }
//   } catch (error) {
//     // Agar xabarni o'zgartirishda xatolik bo'lsa, yangi xabar yuboramiz
//     console.log("Xabarni o'zgartirishda xatolik, yangi xabar yuborilmoqda...");
//     await ctx.reply(newMessage, { 
//       parse_mode: 'Markdown'
//     });
    
//     // Eski xabarni o'chirishga urinib ko'ramiz
//     try {
//       await ctx.deleteMessage();
//     } catch (e) {
//       // O'chirish mumkin bo'lmasa, hech narsa qilmaymiz
//     }
//   }

//   // O'quvchiga xabar
//   try {
//     const studentLang = student.language || 'uz';
//     const rejectMessage = t('payment_rejected', { session: { language: studentLang } }, {
//       month: monthName,
//       amount: payment.amount.toLocaleString()
//     });

//     await ctx.telegram.sendMessage(student.telegramId, rejectMessage, {
//       parse_mode: 'Markdown',
//       reply_markup: Markup.inlineKeyboard([
//         [Markup.button.callback("🔄 Qayta urinish", "payment_status")]
//       ]).reply_markup
//     });
//   } catch (e) {
//     console.log(`O'quvchiga xabar yuborilmadi: ${student.fullName}`);
//   }

//   ctx.answerCbQuery("To'lov rad etildi!");
// };

// // === TILNI O'ZGARTIRISH ===
// export const changeLanguage = async (ctx: any) => {
//   await ctx.reply("🌐 Tilni tanlang / Choose language / Выберите язык:", {
//     reply_markup: Markup.inlineKeyboard([
//       [
//         Markup.button.callback("🇺🇿 O'zbek", "set_language_uz"),
//         Markup.button.callback("🇷🇺 Русский", "set_language_ru")
//       ],
//       [
//         Markup.button.callback("🇺🇸 English", "set_language_en"),
//         Markup.button.callback("🔙 Orqaga", "back_to_menu")
//       ]
//     ]).reply_markup
//   });
// };

// // Tilni o'rnatish handleri
// export const setLanguage = async (ctx: any) => {
//   const language = ctx.match[1]; // uz, ru, en
  
//   // Sessionda tilni saqlash
//   ctx.session.language = language;
  
//   // User ma'lumotlarini yangilash
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (user) {
//     user.language = language;
//     await user.save();
//   }
  
//   const languageNames = {
//     uz: "O'zbek tili",
//     ru: "Русский язык", 
//     en: "English"
//   };
  
//   await ctx.reply(`✅ Til o'zgartirildi: ${languageNames[language]}`, {
//     reply_markup: Markup.inlineKeyboard([
//       [Markup.button.callback("🏠 Asosiy menyu", "back_to_menu")]
//     ]).reply_markup
//   });
// };


// handlers/index.ts
import { Markup } from 'telegraf';
import { User, Attendance, Payment, Schedule, Homework, IUser, IHomework } from '../config/database';
import { isTeacher, isRegistered, getLanguage, t, setMomentLocale, TEACHER_ID, PAYMENT_CARD_NUMBER, PAYMENT_CARD_NAME, backButton } from '../utils/helpers';
import moment from 'moment';

// === START COMMAND VA RO'YXATDAN O'TISH ===
export const startCommand = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  
  if (user) {
    return showMainMenu(ctx);
  } else {
    // Avtomatik ravishda o'zbek tilida ro'yxatdan o'tishni boshlaymiz
    ctx.session.language = 'uz';
    ctx.session.registrationStep = 'full_name';
    ctx.session.registrationData = { language: 'uz' };
    
    await ctx.replyWithMarkdown(
      `🎓 *O'quv markaziga xush kelibsiz!*\n\n` +
      `Iltimos, o'quvchining ism va familiyasini kiriting:`
    );
  }
};

export const handleRegistration = async (ctx: any) => {
  // Agar foydalanuvchi allaqachon ro'yxatdan o'tgan bo'lsa
  const existingUser = await User.findOne({ telegramId: ctx.from.id });
  if (existingUser) {
    return showMainMenu(ctx);
  }

  // Agar ro'yxatdan o'tish bosqichi boshlanmagan bo'lsa
  if (!ctx.session.registrationStep) {
    ctx.session.language = 'uz';
    ctx.session.registrationStep = 'full_name';
    ctx.session.registrationData = { language: 'uz' };
    
    return ctx.replyWithMarkdown(
      `🎓 *O'quv markaziga xush kelibsiz!*\n\n` +
      `Iltimos, o'quvchining ism va familiyasini kiriting:`
    );
  }

  const step = ctx.session.registrationStep;
  const text = ctx.message.text.trim();

  switch (step) {
    case 'full_name':
      // Ismni tekshirish
      if (text.length < 2) {
        return ctx.reply("❌ Ism juda qisqa. Iltimos, to'liq ism va familiyani kiriting:");
      }
      
      ctx.session.registrationData.fullName = text;
      ctx.session.registrationStep = 'parent_phone';
      
      await ctx.replyWithMarkdown(
        "📞 *Ota yoki onangizni telefon raqamini kiriting:*\n\n" +
        "Masalan: +998901234567 yoki 901234567\n\n" +
        "*Eslatma:* Bu raqam ogohlantirish va aloqa uchun ishlatiladi."
      );
      break;

    case 'parent_phone':
      // Telefon raqamini tekshirish
      const phoneRegex = /^(\+998|998|8)?\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
      const cleanPhone = text.replace(/\s/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        return ctx.reply(
          "❌ Noto'g'ri telefon raqami formati.\n\n" +
          "Iltimos, quyidagi formatlardan birida kiriting:\n" +
          "+998901234567 yoki 901234567"
        );
      }
      
      // Telefon raqamini standart formatga keltirish
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith('8')) {
        formattedPhone = '+998' + cleanPhone.slice(1);
      } else if (cleanPhone.startsWith('998')) {
        formattedPhone = '+' + cleanPhone;
      } else if (cleanPhone.length === 9) {
        formattedPhone = '+998' + cleanPhone;
      }
      
      ctx.session.registrationData.parentPhone = formattedPhone;
      ctx.session.registrationStep = 'student_phone';
      
      await ctx.replyWithMarkdown(
        "📱 *O'zingizni telefon raqamingizni kiriting:*\n\n" +
        "Agar telefon raqami bo'lsa, kiriting. Aks holda 'yo'q' deb yozing."
      );
      break;

    case 'student_phone':
      if (text.toLowerCase() === 'yo\'q' || text.toLowerCase() === 'yoq' || text === '-') {
        ctx.session.registrationData.studentPhone = '';
      } else {
        const phoneRegex = /^(\+998|998|8)?\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
        const cleanPhone = text.replace(/\s/g, '');
        
        if (!phoneRegex.test(cleanPhone)) {
          return ctx.reply(
            "❌ Noto'g'ri telefon raqami formati.\n\n" +
            "Iltimos, quyidagi formatlardan birida kiriting:\n" +
            "+998901234567 yoki 901234567\n\n" +
            "Agar raqam bo'lmasa, 'yo'q' deb yozing."
          );
        }
        
        // Telefon raqamini standart formatga keltirish
        let formattedPhone = cleanPhone;
        if (cleanPhone.startsWith('8')) {
          formattedPhone = '+998' + cleanPhone.slice(1);
        } else if (cleanPhone.startsWith('998')) {
          formattedPhone = '+' + cleanPhone;
        } else if (cleanPhone.length === 9) {
          formattedPhone = '+998' + cleanPhone;
        }
        
        ctx.session.registrationData.studentPhone = formattedPhone;
      }
      
      ctx.session.registrationStep = 'address';
      
      await ctx.replyWithMarkdown(
        "📍 *Manzilni kiriting:*\n\n" +
        "Masalan: Toshkent shahar, Yunusobod tumani, 12-uy"
      );
      break;

    case 'address':
      // Manzilni tekshirish
      if (text.length < 5) {
        return ctx.reply("❌ Manzil juda qisqa. Iltimos, batafsil manzilni kiriting:");
      }
      
      ctx.session.registrationData.address = text;
      await completeRegistration(ctx);
      break;
  }
};

export const handlePhoneShare = async (ctx: any) => {
  if (ctx.message.contact && ctx.session.registrationStep === 'parent_phone') {
    const phone = ctx.message.contact.phone_number;
    ctx.session.registrationData.parentPhone = phone;
    ctx.session.registrationStep = 'student_phone';
    
    await ctx.replyWithMarkdown(
      "✅ *Telefon raqamingiz qabul qilindi!*\n\n" +
      "📱 Endi o'quvchi telefon raqamini kiriting:\n\n" +
      "Agar o'quvchining telefon raqami bo'lsa, kiriting. Aks holda 'yo'q' deb yozing."
    );
  }
};

const completeRegistration = async (ctx: any) => {
  try {
    const data = ctx.session.registrationData;
    
    // Yangi foydalanuvchi yaratish
    const user = new User({
      telegramId: ctx.from.id,
      fullName: data.fullName,
      phone: data.parentPhone, // Asosiy raqam ota-ona raqami
      parentPhone: data.parentPhone,
      studentPhone: data.studentPhone,
      address: data.address,
      language: 'uz', // Default o'zbek tili
      role: 'student',
      paymentDay: 10, // Default to'lov kuni
      paymentAmount: 500000 // Default to'lov summasi
    });
    
    await user.save();
    
    // Sessionni tozalash
    delete ctx.session.registrationStep;
    delete ctx.session.registrationData;
    
    const successMessage = 
      `🎉 *Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz!*\n\n` +
      `👤 *O'quvchi ismi:* ${user.fullName}\n` +
      `📞 *Ota-ona raqami:* ${user.parentPhone}\n` +
      `📱 *O'quvchi raqami:* ${user.studentPhone || "Ko'rsatilmagan"}\n` +
      `📍 *Manzil:* ${user.address}\n\n` +
      `🎓 Endi siz o'quv markazining barcha imkoniyatlaridan foydalanishingiz mumkin.`;
    
    await ctx.replyWithMarkdown(successMessage, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Asosiy menyuga o'tish", "back_to_menu")]
      ]).reply_markup
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply("❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
  }
};

export const sharePhoneButton = async (ctx: any) => {
  if (ctx.session.registrationStep === 'parent_phone') {
    await ctx.replyWithMarkdown(
      "📱 *Telefon raqamingizni ulashing:*\n\n" +
      "Quyidagi tugma orqali telefon raqamingizni ulashing:",
      {
        reply_markup: Markup.keyboard([
          [Markup.button.contactRequest("📱 Telefon raqamini ulashish")]
        ])
        .oneTime()
        .resize()
        .reply_markup
      }
    );
  }
};

// === ASOSIY MENYU ===
export const showMainMenu = async (ctx: any) => {
  setMomentLocale(ctx);
  
  if (isTeacher(ctx)) {
    return ctx.reply("👨‍🏫 O'qituvchi paneli:", Markup.inlineKeyboard([
      [Markup.button.callback(t('students', ctx), 'list_students')],
      [Markup.button.callback(t('payment', ctx), 'payment_list')],
      [Markup.button.callback("📅 Jadval qo'shish", 'add_schedule')],
      [Markup.button.callback(t('homework', ctx), 'manual_homework')],
      [Markup.button.callback("📝 Tekshirilmagan vazifalar", 'check_homework')],
      [Markup.button.callback(t('attendance', ctx), 'take_attendance')],
      [Markup.button.callback(t('rating', ctx), 'rating')],
      [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
    ]));
  } else {
    return ctx.reply("🎓 O'quvchi menyusi:", Markup.inlineKeyboard([
      [Markup.button.callback(t('profile', ctx), 'profile')],
      [Markup.button.callback(t('payment', ctx), 'payment_status')],
      [Markup.button.callback("📊 To'lov tarixi", 'payment_history')],
      [Markup.button.callback(t('schedule', ctx), 'view_schedule')],
      [Markup.button.callback(t('homework', ctx), 'submit_homework')],
      [Markup.button.callback("📈 O'quvchilar statistikasi", 'student_stats')],
      [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
    ]));
  }
};

// === PROFIL ===
export const showProfile = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply(t('not_registered', ctx));
  
  const stats = await Attendance.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const statsMap = { present: 0, late: 0, absent: 0 };
  stats.forEach((s: any) => statsMap[s._id] = s.count);
  
  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user._id, month: currentMonth });
  
  const msg = `
*${t('profile', ctx)}*

👤 ${t('name', ctx)}: ${user.fullName}
📞 Ota-ona raqami: ${user.parentPhone}
${user.studentPhone ? `📱 O'quvchi raqami: ${user.studentPhone}\n` : ''}📍 ${t('address', ctx)}: ${user.address}
💵 ${t('payment_day', ctx)}: ${user.paymentDay}-${t('day', ctx)}
💰 ${t('amount', ctx)}: ${user.paymentAmount.toLocaleString()} so'm

📊 ${t('attendance', ctx)}:
${t('present', ctx)}: ${statsMap.present}
${t('late', ctx)}: ${statsMap.late}  
${t('absent', ctx)}: ${statsMap.absent}

💳 ${t('payment', ctx)}: ${payment?.paid ? t('payment_paid', ctx) : t('payment_unpaid', ctx)}
`.trim();

  ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(t('edit', ctx), 'edit_profile')],
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};

// === O'QUVCHILAR RO'YXATI ===
export const listStudents = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const students = await User.find({ role: 'student' });
  if (students.length === 0) return ctx.reply("O'quvchi yo'q.");
  
  const buttons = students.map(s => [Markup.button.callback(
    `${s.fullName} — ${s.parentPhone}`, 
    `student_${s._id}`
  )]);
  
  ctx.reply("O'quvchilar:", { 
    reply_markup: Markup.inlineKeyboard([...buttons, [backButton('back_to_menu', ctx)]]).reply_markup 
  });
};

// === JADVAL QO'SHISH ===
export const addSchedule = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
  
  const dayButtons = days.map(day => [Markup.button.callback(day, `sched_day_${day}`)]);
  
  await ctx.reply("Hafta kunini tanlang:", {
    reply_markup: Markup.inlineKeyboard([
      ...dayButtons,
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};

// === VAZIFA YUBORISH ===
export const manualHomework = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  ctx.session.step = 'send_homework_content';
  ctx.reply("O'quvchilarga uyga vazifa yuboring (matn yoki rasm):");
};

// === DAVOMAT QILISH ===
export const takeAttendance = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
  if (students.length === 0) {
    return ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
  }

  const today = moment().format('YYYY-MM-DD');
  
  const todayAttendance = await Attendance.find({ date: today }).populate<{ userId: IUser }>('userId');
  const attendanceMap = new Map();
  todayAttendance.forEach((att: any) => {
    if (att.userId && att.userId._id) {
      attendanceMap.set(att.userId._id.toString(), att.status);
    }
  });

  const studentChunks: IUser[][] = [];
  for (let i = 0; i < students.length; i += 5) {
    studentChunks.push(students.slice(i, i + 5));
  }

  for (let chunkIndex = 0; chunkIndex < studentChunks.length; chunkIndex++) {
    const chunk = studentChunks[chunkIndex];
    const buttons: any[] = [];
    
    for (const student of chunk) {
      const studentId = (student as any)._id?.toString();
      const currentStatus = attendanceMap.get(studentId) || 'not_marked';
      let statusText = '';
      
      switch (currentStatus) {
        case 'present':
          statusText = t('present', ctx);
          break;
        case 'late':
          statusText = t('late', ctx);
          break;
        case 'absent':
          statusText = t('absent', ctx);
          break;
        default:
          statusText = t('not_marked', ctx);
      }
      
      buttons.push([
        Markup.button.callback(
          `${student.fullName} - ${statusText}`,
          `attendance_student_${studentId}`
        )
      ]);
    }

    const navigationButtons: any[] = [];
    if (chunkIndex > 0) {
      navigationButtons.push(Markup.button.callback('⬅️ ' + t('previous', ctx), `attendance_page_${chunkIndex - 1}`));
    }
    if (chunkIndex < studentChunks.length - 1) {
      navigationButtons.push(Markup.button.callback(t('next', ctx) + ' ➡️', `attendance_page_${chunkIndex + 1}`));
    }
    
    if (navigationButtons.length > 0) {
      buttons.push(navigationButtons);
    }

    buttons.push([backButton('back_to_menu', ctx)]);

    const messageText = t('take_attendance', ctx, { date: today });

    await ctx.replyWithMarkdown(
      messageText,
      { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
    );
  }

  ctx.answerCbQuery();
};

// Davomat sahifalari uchun handler
export const attendancePageHandler = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const page = parseInt(ctx.match[1]);
  const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
  const studentChunks: IUser[][] = [];
  
  for (let i = 0; i < students.length; i += 5) {
    studentChunks.push(students.slice(i, i + 5));
  }

  if (page < 0 || page >= studentChunks.length) {
    return ctx.answerCbQuery("Noto'g'ri sahifa!");
  }

  const chunk = studentChunks[page];
  const today = moment().format('YYYY-MM-DD');
  const todayAttendance = await Attendance.find({ date: today }).populate<{ userId: IUser }>('userId');
  const attendanceMap = new Map();
  todayAttendance.forEach((att: any) => {
    if (att.userId && att.userId._id) {
      attendanceMap.set(att.userId._id.toString(), att.status);
    }
  });

  const buttons: any[] = [];
  
  for (const student of chunk) {
    const studentId = (student as any)._id?.toString();
    const currentStatus = attendanceMap.get(studentId) || 'not_marked';
    let statusText = '';
    
    switch (currentStatus) {
      case 'present':
        statusText = t('present', ctx);
        break;
      case 'late':
        statusText = t('late', ctx);
        break;
      case 'absent':
        statusText = t('absent', ctx);
        break;
      default:
        statusText = t('not_marked', ctx);
    }
    
    buttons.push([
      Markup.button.callback(
        `${student.fullName} - ${statusText}`,
        `attendance_student_${studentId}`
      )
    ]);
  }

  const navigationButtons: any[] = [];
  if (page > 0) {
    navigationButtons.push(Markup.button.callback('⬅️ ' + t('previous', ctx), `attendance_page_${page - 1}`));
  }
  if (page < studentChunks.length - 1) {
    navigationButtons.push(Markup.button.callback(t('next', ctx) + ' ➡️', `attendance_page_${page + 1}`));
  }
  
  if (navigationButtons.length > 0) {
    buttons.push(navigationButtons);
  }

  buttons.push([backButton('back_to_menu', ctx)]);

  await ctx.editMessageText(
    t('take_attendance', ctx, { date: today }) + ` (${page + 1}/${studentChunks.length})`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    }
  );

  ctx.answerCbQuery();
};

// Har bir o'quvchi uchun davomat belgilash
export const attendanceStudentHandler = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.answerCbQuery("O'quvchi topilmadi!");

  await ctx.reply(
    t('mark_attendance', ctx, { name: student.fullName }),
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback(t('present', ctx), `mark_present_${studentId}`),
          Markup.button.callback(t('late', ctx), `mark_late_${studentId}`)
        ],
        [
          Markup.button.callback(t('absent', ctx), `mark_absent_${studentId}`)
        ],
        [
          backButton('take_attendance', ctx)
        ]
      ]).reply_markup
    }
  );

  ctx.answerCbQuery();
};

// Davomat belgilash handlerlari
export const markAttendanceHandler = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const status = ctx.match[1];
  const studentId = ctx.match[2];
  const today = moment().format('YYYY-MM-DD');
  
  const student = await User.findById(studentId);
  if (!student) return ctx.answerCbQuery("O'quvchi topilmadi!");

  await Attendance.findOneAndUpdate(
    { userId: studentId, date: today },
    { status, date: today },
    { upsert: true, new: true }
  );

  const statusText = {
    present: t('present', ctx),
    late: t('late', ctx), 
    absent: t('absent', ctx)
  }[status];

  await ctx.reply(
    t('attendance_marked', ctx, { name: student.fullName, status: statusText }),
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [backButton('take_attendance', ctx)]
      ]).reply_markup
    }
  );

  // Ota-onaga xabar yuborish
  try {
    const statusMessage = {
      present: "✅ Bugun darsga qatnashdi",
      late: "⏰ Bugun darsga kechikdi", 
      absent: "❌ Bugun darsga kelmadi"
    }[status];

    const message = `${statusMessage}\nO'quvchi: ${student.fullName}\nSana: ${today}`;
    
    await ctx.telegram.sendMessage(
      student.telegramId,
      message
    );
    
    // Agar o'quvchining alohida raqami bo'lsa, unga ham yuborish
    if (student.studentPhone) {
      // Bu yerda SMS yuborish logikasi qo'shilishi mumkin
      console.log(`O'quvchiga SMS yuborish: ${student.studentPhone} - ${message}`);
    }
    
  } catch (e) {
    console.log(`Xabar yuborilmadi: ${student.fullName}`);
  }

  ctx.answerCbQuery("Davomat belgilandi!");
};

// === TO'LOV STATUS ===
export const showPaymentStatus = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply(t('not_registered', ctx));

  const currentMonth = moment().format('YYYY-MM');
  let payment = await Payment.findOne({ userId: user._id, month: currentMonth });
  if (!payment) {
    payment = await new Payment({ userId: user._id, month: currentMonth, amount: user.paymentAmount }).save();
  }

  const status = payment.paid ? t('payment_paid', ctx) : t('payment_unpaid', ctx);

  const msg = t('payment_info', ctx, {
    month: moment().format('MMMM YYYY'),
    amount: payment.amount.toLocaleString(),
    day: user.paymentDay,
    status: status,
    cardNumber: PAYMENT_CARD_NUMBER,
    cardName: PAYMENT_CARD_NAME
  });

  const buttons: any[][] = [];
  if (!payment.paid) {
    buttons.push([Markup.button.callback(t('send_receipt', ctx), 'send_receipt')]);
    buttons.push([Markup.button.callback(t('offline_payment', ctx), 'offline_payment')]);
  }
  buttons.push([Markup.button.callback(t('history', ctx), 'payment_history')]);
  buttons.push([backButton('back_to_menu', ctx)]);

  ctx.replyWithMarkdownV2(
    msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'),
    { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
  );
};

// === TO'LOVLAR RO'YXATI (O'QITUVCHI) ===
export const showPaymentList = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const currentMonth = moment().format('YYYY-MM');
  const payments = await Payment.find({ month: currentMonth }).populate<{ userId: IUser }>('userId');
  
  if (payments.length === 0) {
    return ctx.reply("Bu oy uchun to'lovlar topilmadi.", {
      reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
    });
  }

  const paid = payments.filter(p => p.paid);
  const unpaid = payments.filter(p => !p.paid);

  let message = `*${moment().format('MMMM YYYY')} TO'LOVLARI*\n\n`;
  message += `✅ To'langan: ${paid.length} ta\n`;
  message += `❌ To'lanmagan: ${unpaid.length} ta\n\n`;

  if (unpaid.length > 0) {
    message += `*To'lanmaganlar:*\n`;
    unpaid.forEach((p, index) => {
      const student = (p.userId as any);
      if (student && student.fullName) {
        message += `${index + 1}. ${student.fullName} - ${p.amount.toLocaleString()} so'm\n`;
      } else {
        message += `${index + 1}. [O'quvchi topilmadi] - ${p.amount.toLocaleString()} so'm\n`;
      }
    });
  }

  if (paid.length > 0) {
    message += `\n*To'langanlar:*\n`;
    paid.forEach((p, index) => {
      const student = (p.userId as any);
      const date = moment(p.paidAt).format('DD.MM');
      const method = p.method === 'receipt' ? 'Chek' : 'Naqd';
      if (student && student.fullName) {
        message += `${index + 1}. ${student.fullName} - ${p.amount.toLocaleString()} so'm (${date}, ${method})\n`;
      } else {
        message += `${index + 1}. [O'quvchi topilmadi] - ${p.amount.toLocaleString()} so'm (${date}, ${method})\n`;
      }
    });
  }

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};

// === REYTING ===
export const showRating = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const students = await User.find({ role: 'student' });
  if (students.length === 0) {
    return ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
  }

  const studentStats = await Promise.all(
    students.map(async (student) => {
      const attendances = await Attendance.find({ userId: student._id });
      const homeworks = await Homework.find({ studentId: student._id, checked: true });
      
      const presentCount = attendances.filter(a => a.status === 'present').length;
      const lateCount = attendances.filter(a => a.status === 'late').length;
      const totalClasses = attendances.length;
      
      const avgScore = homeworks.length > 0 
        ? homeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / homeworks.length 
        : 0;
      
      const attendanceRate = totalClasses > 0 ? (presentCount + lateCount * 0.7) / totalClasses : 0;
      const rating = (attendanceRate * 70) + (avgScore * 6);

      return {
        student,
        rating: Math.round(rating * 100) / 100,
        presentCount,
        lateCount,
        absentCount: attendances.filter(a => a.status === 'absent').length,
        totalClasses,
        avgScore: Math.round(avgScore * 100) / 100,
        completedHomeworks: homeworks.length
      };
    })
  );

  studentStats.sort((a, b) => b.rating - a.rating);

  let message = `🏆 *O'quvchilar Reytingi* 🏆\n\n`;
  
  studentStats.forEach((stat, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    message += `${medal} *${stat.student.fullName}*\n`;
    message += `📊 Reyting: ${stat.rating} ball\n`;
    message += `📈 Davomat: ${stat.presentCount}✅ ${stat.lateCount}⏰ ${stat.absentCount}❌\n`;
    message += `📚 Vazifalar: ${stat.avgScore}/5 (${stat.completedHomeworks} ta)\n\n`;
  });

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};

// === TEKSHRILMAGAN VAZIFALAR ===
const showHomeworkPage = async (ctx: any, chunks: any[][], page: number) => {
  if (page < 0 || page >= chunks.length) return;

  const chunk = chunks[page];
  const buttons: any[] = [];

  for (const hw of chunk) {
    const studentName = (hw.studentId as any).fullName;
    const date = moment(hw.date).format('DD.MM.YYYY');
    const hasPhoto = !!(hw as any).answerPhoto;
    const hasText = !!(hw as any).answerText;
    
    let label = `${studentName} - ${date}`;
    if (hasPhoto) label += " 📷";
    if (hasText) label += " 📝";

    buttons.push([
      Markup.button.callback(label, `review_hw_${hw._id}`)
    ]);
  }

  const navigationButtons: any[] = [];
  if (page > 0) {
    navigationButtons.push(Markup.button.callback('⬅️ Oldingi', `hw_page_${page - 1}`));
  }
  if (page < chunks.length - 1) {
    navigationButtons.push(Markup.button.callback('Keyingi ➡️', `hw_page_${page + 1}`));
  }

  if (navigationButtons.length > 0) {
    buttons.push(navigationButtons);
  }

  buttons.push([backButton('back_to_menu', ctx)]);

  await ctx.editMessageText(
    `📝 Tekshirilmagan vazifalar (${page + 1}/${chunks.length}):`,
    {
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    }
  );
};

export const showUncheckedHomeworks = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const uncheckedHomeworks = await Homework.find({ 
    checked: false,
    $or: [
      { answerText: { $exists: true, $ne: "" } },
      { answerPhoto: { $exists: true, $ne: "" } }
    ]
  }).populate<{ studentId: IUser }>('studentId');

  if (uncheckedHomeworks.length === 0) {
    return ctx.reply("✅ Tekshirilmagan vazifalar yo'q!", {
      reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
    });
  }

  const homeworkChunks: any[][] = [];
  for (let i = 0; i < uncheckedHomeworks.length; i += 5) {
    homeworkChunks.push(uncheckedHomeworks.slice(i, i + 5));
  }

  await showHomeworkPage(ctx, homeworkChunks, 0);
};

export const showHomeworkPageHandler = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const page = parseInt(ctx.match[1]);
  const uncheckedHomeworks = await Homework.find({ 
    checked: false,
    $or: [
      { answerText: { $exists: true, $ne: "" } },
      { answerPhoto: { $exists: true, $ne: "" } }
    ]
  }).populate<{ studentId: IUser }>('studentId');

  const homeworkChunks: any[][] = [];
  for (let i = 0; i < uncheckedHomeworks.length; i += 5) {
    homeworkChunks.push(uncheckedHomeworks.slice(i, i + 5));
  }

  await showHomeworkPage(ctx, homeworkChunks, page);
  ctx.answerCbQuery();
};

// === TO'LOV TARIXI ===
export const showPaymentHistory = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply(t('not_registered', ctx));

  const payments = await Payment.find({ userId: user._id, paid: true }).sort({ paidAt: -1 });
  if (payments.length === 0) {
    return ctx.reply("Siz hali to'lov qilmagansiz.", { 
      reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
    });
  }

  const lines = payments.map(p => {
    const date = moment(p.paidAt).format('DD.MM.YYYY');
    const method = p.method === 'receipt' ? 'Chek' : 'Naqd';
    return `${date} | ${p.amount.toLocaleString()} so'm | ${method}`;
  }).join('\n');

  ctx.replyWithHTML(`<b>To'lov tarixi</b>\n\n<pre>${lines}</pre>`, {
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
  });
};

// === JADVAL ===
export const viewSchedule = async (ctx: any) => {
  const schedules = await Schedule.find();
  if (schedules.length === 0) return ctx.reply("Jadval yo'q.");
  const lines = schedules.map((s: any) => `${s.day} | ${s.time} | ${s.group}`).join('\n');
  ctx.reply(`Dars jadvali:\n${lines}`, { 
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
  });
};

// === O'QUVCHI STATISTIKASI ===
export const showStudentStats = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply(t('not_registered', ctx));

  const attendances = await Attendance.find({ userId: user._id });
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const totalClasses = attendances.length;

  const homeworks = await Homework.find({ studentId: user._id });
  const checkedHomeworks = homeworks.filter(hw => hw.checked);
  const avgScore = checkedHomeworks.length > 0 
    ? checkedHomeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / checkedHomeworks.length 
    : 0;

  const payments = await Payment.find({ userId: user._id });
  const paidCount = payments.filter(p => p.paid).length;
  const totalPayments = payments.length;

  const message = `
*📊 Sizning Statistikangiz*

*📈 Davomat:*
✅ Kelgan: ${presentCount} marta
⏰ Kechikkan: ${lateCount} marta  
❌ Kelmagan: ${absentCount} marta
📅 Jami dars: ${totalClasses} ta

*📚 Vazifalar:*
📝 Bajargan: ${homeworks.length} ta
✅ Tekshirilgan: ${checkedHomeworks.length} ta
🏅 O'rtacha baho: ${Math.round(avgScore * 100) / 100}/5

*💳 To'lovlar:*
✅ To'langan: ${paidCount} ta
📊 Jami: ${totalPayments} ta
  `.trim();

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};

// === O'QUVCHI MA'LUMOTLARI ===
export const showStudentDetails = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  // O'quvchi statistikasi
  const attendances = await Attendance.find({ userId: student._id });
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const totalClasses = attendances.length;

  const homeworks = await Homework.find({ studentId: student._id });
  const checkedHomeworks = homeworks.filter(hw => hw.checked);
  const avgScore = checkedHomeworks.length > 0 
    ? checkedHomeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / checkedHomeworks.length 
    : 0;

  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: student._id, month: currentMonth });

  const message = `
*👤 O'QUVCHI MA'LUMOTLARI*

*Asosiy ma'lumotlar:*
👤 Ism: *${student.fullName}*
📞 Ota-ona raqami: \`${student.parentPhone}\`
${student.studentPhone ? `📱 O'quvchi raqami: \`${student.studentPhone}\`\n` : ''}📍 Manzil: *${student.address}*
🌐 Til: *${student.language === 'uz' ? "O'zbek" : student.language === 'ru' ? 'Rus' : 'Ingliz'}*

*To'lov sozlamalari:*
💵 To'lov kuni: *${student.paymentDay}-kun*
💰 Oylik to'lov: *${student.paymentAmount.toLocaleString()} so'm*
📅 Joriy oy holati: *${payment?.paid ? "✅ To'langan" : "❌ To'lanmagan"}*

*📊 Statistikalar:*
📈 Davomat: ${presentCount}✅ ${lateCount}⏰ ${absentCount}❌
📚 Vazifalar: ${homeworks.length} ta (${checkedHomeworks.length} ta tekshirilgan)
🏅 O'rtacha baho: ${Math.round(avgScore * 100) / 100}/5
📅 Jami darslar: ${totalClasses} ta
`.trim();

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback("💰 To'lov kunini o'zgartirish", `set_payment_day_${student._id}`),
        Markup.button.callback("💵 Summani o'zgartirish", `set_payment_amount_${student._id}`)
      ],
      [
        Markup.button.callback("📊 Davomat tarixi", `attendance_history_${student._id}`),
        Markup.button.callback("📚 Vazifa tarixi", `homework_history_${student._id}`)
      ],
      [backButton('list_students', ctx)]
    ]).reply_markup
  });
};

// === TO'LOV KUNINI O'ZGARTIRISH ===
export const setPaymentDay = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  ctx.session.step = 'set_payment_day';
  ctx.session.studentId = studentId;

  ctx.reply(`O'quvchi: *${student.fullName}*\n\nYangi to'lov kunini kiriting (1-31 oralig'ida):`, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [backButton(`student_${studentId}`, ctx)]
    ]).reply_markup
  });
};

// === TO'LOV SUMMASINI O'ZGARTIRISH ===
export const setPaymentAmount = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  ctx.session.step = 'set_payment_amount';
  ctx.session.studentId = studentId;

  ctx.reply(`O'quvchi: *${student.fullName}*\n\nJoriy summa: *${student.paymentAmount.toLocaleString()} so'm*\n\nYangi oylik to'lov summasini kiriting:`, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [backButton(`student_${studentId}`, ctx)]
    ]).reply_markup
  });
};

// === DAVOMAT TARIXI ===
export const showAttendanceHistory = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  const attendances = await Attendance.find({ userId: student._id })
    .sort({ date: -1 })
    .limit(20);

  if (attendances.length === 0) {
    return ctx.reply(`*${student.fullName}* uchun davomat ma'lumotlari topilmadi.`, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  }

  let message = `*${student.fullName} - Davomat tarixi*\n\n`;
  
  attendances.forEach((att, index) => {
    const date = moment(att.date).format('DD.MM.YYYY');
    const status = {
      present: '✅',
      late: '⏰', 
      absent: '❌'
    }[att.status];
    
    message += `${index + 1}. ${date} - ${status} ${att.status}\n`;
  });

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [backButton(`student_${studentId}`, ctx)]
    ]).reply_markup
  });
};

// === VAZIFA TARIXI ===
export const showHomeworkHistory = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const studentId = ctx.match[1];
  const student = await User.findById(studentId);
  if (!student) return ctx.reply("O'quvchi topilmadi.");

  const homeworks = await Homework.find({ studentId: student._id })
    .sort({ date: -1 })
    .limit(20);

  if (homeworks.length === 0) {
    return ctx.reply(`*${student.fullName}* uchun vazifa ma'lumotlari topilmadi.`, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  }

  let message = `*${student.fullName} - Vazifa tarixi*\n\n`;
  
  homeworks.forEach((hw, index) => {
    const date = moment(hw.date).format('DD.MM.YYYY');
    const status = hw.checked ? `✅ ${hw.score}/5` : '⏳ Tekshirilmagan';
    const hasAnswer = hw.answerText || hw.answerPhoto ? '📝' : '❌';
    
    message += `${index + 1}. ${date} - ${hasAnswer} ${status}\n`;
    if (hw.checked && hw.feedback) {
      message += `   📌 ${hw.feedback}\n`;
    }
  });

  ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
    reply_markup: Markup.inlineKeyboard([
      [backButton(`student_${studentId}`, ctx)]
    ]).reply_markup
  });
};

// === YANGI TO'LOV HANDLERLARI ===

export const sendReceipt = async (ctx: any) => {
  ctx.session.waitingForReceipt = true;
  await ctx.reply(
    "💳 To'lov chekini yuboring (rasm):\n\n" +
    "• Bank ilovasidagi to'lov chekini skrinshot qiling\n" +
    "• Rasmni shu yerga yuboring",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "payment_status" }]
        ]
      }
    }
  );
};

export const offlinePayment = async (ctx: any) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

  const currentMonth = moment().format('YYYY-MM');
  const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
  
  if (!payment) {
    return ctx.reply("Bu oy uchun to'lov topilmadi yoki allaqachon to'langan.");
  }

  const message = `
*NAQD TO'LOV*

O'quvchi: *${user.fullName}*
Ota-ona raqami: \`${user.parentPhone}\`
Oy: *${moment().format('MMMM YYYY')}*
Summa: *${payment.amount.toLocaleString()} so'm*

*O'qituvchi tomonidan tasdiqlanishi kutilmoqda...*
  `.trim();

  try {
    await ctx.telegram.sendMessage(TEACHER_ID(), message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Tasdiqlash", `confirm_offline_${payment._id}`),
          Markup.button.callback("❌ Rad etish", `reject_receipt_${payment._id}`)
        ]
      ]).reply_markup
    });

    await ctx.replyWithHTML(`
<b>Naqd to'lov so'rovi yuborildi!</b>

O'qituvchi tekshirib, tasdiqlaydi.
Sabr qiling...
    `.trim(), {
      reply_markup: Markup.inlineKeyboard([[backButton('payment_status', ctx)]]).reply_markup
    });
  } catch (e) {
    await ctx.reply("Xatolik yuz berdi. Qayta urining.");
  }
};

export const confirmPayment = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const method = ctx.match[1]; // 'receipt' yoki 'offline'
  const paymentId = ctx.match[2];
  
  const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
  if (!payment) {
    return ctx.answerCbQuery("To'lov topilmadi!");
  }

  if (payment.paid) {
    return ctx.answerCbQuery("Bu to'lov allaqachon tasdiqlangan!");
  }

  // To'lovni tasdiqlash
  payment.paid = true;
  payment.paidAt = new Date();
  payment.method = method === 'receipt' ? 'receipt' : 'offline';
  await payment.save();

  const student = payment.userId as any;
  const monthName = moment(payment.month + '-01').format('MMMM YYYY');

  // Yangi xabar matni
  const newMessage = `✅ *To'lov tasdiqlandi!*\n\n` +
    `O'quvchi: *${student.fullName}*\n` +
    `Ota-ona raqami: \`${student.parentPhone}\`\n` +
    `Oy: *${monthName}*\n` +
    `Summa: *${payment.amount.toLocaleString()} so'm*\n` +
    `Usul: *${method === 'receipt' ? 'Chek' : 'Naqd'}*\n` +
    `Tasdiqlangan: *${moment().format('DD.MM.YYYY HH:mm')}*`;

  try {
    // Agar rasmli xabar bo'lsa, caption ni yangilash
    if (ctx.callbackQuery.message.photo) {
      await ctx.editMessageCaption(newMessage, { 
        parse_mode: 'Markdown'
      });
      // Inline tugmalarni olib tashlash
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } else {
      // Agar matnli xabar bo'lsa
      await ctx.editMessageText(newMessage, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }
      });
    }
  } catch (error) {
    // Agar xabarni o'zgartirishda xatolik bo'lsa, yangi xabar yuboramiz
    console.log("Xabarni o'zgartirishda xatolik, yangi xabar yuborilmoqda...");
    await ctx.reply(newMessage, { 
      parse_mode: 'Markdown'
    });
    
    // Eski xabarni o'chirishga urinib ko'ramiz
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // O'chirish mumkin bo'lmasa, hech narsa qilmaymiz
    }
  }

  // O'quvchiga xabar
  try {
    const studentLang = student.language || 'uz';
    const methodText = method === 'receipt' ? 'chek' : 'naqd';
    const successMessage = t('payment_success', { session: { language: studentLang } }, {
      month: monthName,
      amount: payment.amount.toLocaleString(),
      method: methodText
    });

    await ctx.telegram.sendMessage(student.telegramId, successMessage, {
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.log(`O'quvchiga xabar yuborilmadi: ${student.fullName}`);
  }

  ctx.answerCbQuery("To'lov tasdiqlandi!");
};

export const rejectReceipt = async (ctx: any) => {
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));
  
  const paymentId = ctx.match[1];
  const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
  
  if (!payment) {
    return ctx.answerCbQuery("To'lov topilmadi!");
  }

  const student = payment.userId as any;
  const monthName = moment(payment.month + '-01').format('MMMM YYYY');

  // Yangi xabar matni
  const newMessage = `❌ *To'lov rad etildi!*\n\n` +
    `O'quvchi: *${student.fullName}*\n` +
    `Ota-ona raqami: \`${student.parentPhone}\`\n` +
    `Oy: *${monthName}*\n` +
    `Summa: *${payment.amount.toLocaleString()} so'm*\n` +
    `Sabab: Noto'g'ri chek yoki ma'lumotlar`;

  try {
    // Agar rasmli xabar bo'lsa, caption ni yangilash
    if (ctx.callbackQuery.message.photo) {
      await ctx.editMessageCaption(newMessage, { 
        parse_mode: 'Markdown'
      });
      // Inline tugmalarni olib tashlash
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } else {
      // Agar matnli xabar bo'lsa
      await ctx.editMessageText(newMessage, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }
      });
    }
  } catch (error) {
    // Agar xabarni o'zgartirishda xatolik bo'lsa, yangi xabar yuboramiz
    console.log("Xabarni o'zgartirishda xatolik, yangi xabar yuborilmoqda...");
    await ctx.reply(newMessage, { 
      parse_mode: 'Markdown'
    });
    
    // Eski xabarni o'chirishga urinib ko'ramiz
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // O'chirish mumkin bo'lmasa, hech narsa qilmaymiz
    }
  }

  // O'quvchiga xabar
  try {
    const studentLang = student.language || 'uz';
    const rejectMessage = t('payment_rejected', { session: { language: studentLang } }, {
      month: monthName,
      amount: payment.amount.toLocaleString()
    });

    await ctx.telegram.sendMessage(student.telegramId, rejectMessage, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Qayta urinish", "payment_status")]
      ]).reply_markup
    });
  } catch (e) {
    console.log(`O'quvchiga xabar yuborilmadi: ${student.fullName}`);
  }

  ctx.answerCbQuery("To'lov rad etildi!");
};

// === TILNI O'ZGARTIRISH ===
export const changeLanguage = async (ctx: any) => {
  await ctx.reply("🌐 Tilni tanlang / Choose language / Выберите язык:", {
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback("🇺🇿 O'zbek", "set_language_uz"),
        Markup.button.callback("🇷🇺 Русский", "set_language_ru")
      ],
      [
        Markup.button.callback("🇺🇸 English", "set_language_en"),
        Markup.button.callback("🔙 Orqaga", "back_to_menu")
      ]
    ]).reply_markup
  });
};

// Tilni o'rnatish handleri
export const setLanguage = async (ctx: any) => {
  const language = ctx.match[1]; // uz, ru, en
  
  // Sessionda tilni saqlash
  ctx.session.language = language;
  
  // User ma'lumotlarini yangilash
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    user.language = language;
    await user.save();
  }
  
  const languageNames = {
    uz: "O'zbek tili",
    ru: "Русский язык", 
    en: "English"
  };
  
  await ctx.reply(`✅ Til o'zgartirildi: ${languageNames[language]}`, {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Asosiy menyu", "back_to_menu")]
    ]).reply_markup
  });
};