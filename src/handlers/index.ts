import { Markup } from 'telegraf';
import { User, Attendance, Payment, Schedule, Homework, IUser, IHomework } from '../config/database';
import { isTeacher, isRegistered, getLanguage, t, setMomentLocale, TEACHER_ID, PAYMENT_CARD_NUMBER, PAYMENT_CARD_NAME, backButton } from '../utils/helpers';
import moment from 'moment';
import { escapeMarkdownV2 } from '../utils/helpers';

// === YORDAMCHI FUNKSIYALAR ===
const safeAnswerCbQuery = async (ctx: any, text?: string) => {
  try {
    if (text) await ctx.answerCbQuery(text);
    else await ctx.answerCbQuery();
  } catch (error) {
    console.log('Callback query already expired, skipping answer...');
  }
};

// === START COMMAND VA RO'YXATDAN O'TISH ===
export const startCommand = async (ctx: any) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (user) return showMainMenu(ctx);

    ctx.session.language = 'uz';
    ctx.session.registrationStep = 'full_name';
    ctx.session.registrationData = { language: 'uz' };

    await ctx.replyWithMarkdown(
      `*O'quv markaziga xush kelibsiz!*\n\n` +
      `Iltimos, o'quvchining ism va familiyasini kiriting:`
    );
  } catch (error) {
    console.error('Start command error:', error);
    await ctx.reply("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
  }
};

export const handleRegistration = async (ctx: any) => {
  try {
    const existingUser = await User.findOne({ telegramId: ctx.from.id });
    if (existingUser) return showMainMenu(ctx);

    if (!ctx.session.registrationStep) {
      ctx.session.language = 'uz';
      ctx.session.registrationStep = 'full_name';
      ctx.session.registrationData = { language: 'uz' };
      return ctx.replyWithMarkdown(`*O'quv markaziga xush kelibsiz!*\n\nIltimos, ism va familiyangizni kiriting:`);
    }

    const step = ctx.session.registrationStep;
    const text = ctx.message?.text?.trim();

    switch (step) {
      case 'full_name':
        if (text.length < 2) return ctx.reply("Ism juda qisqa. To'liq ism va familiya kiriting:");
        ctx.session.registrationData.fullName = text;
        ctx.session.registrationStep = 'parent_phone';
        await ctx.replyWithMarkdown(
          "*Ota yoki ona telefon raqamini kiriting:*\n\n" +
          "Masalan: +998901234567 yoki 901234567"
        );
        break;

      case 'parent_phone':
        const phoneRegex = /^(\+998|998|8)?\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
        const cleanPhone = text.replace(/\s/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return ctx.reply("Noto'g'ri format. Masalan: +998901234567");
        }
        let formatted = cleanPhone;
        if (cleanPhone.startsWith('8')) formatted = '+998' + cleanPhone.slice(1);
        else if (cleanPhone.startsWith('998')) formatted = '+' + cleanPhone;
        else if (cleanPhone.length === 9) formatted = '+998' + cleanPhone;

        ctx.session.registrationData.parentPhone = formatted;
        ctx.session.registrationStep = 'student_phone';

        // BU YERDA faqat o'quvchi telefoni uchun tugma chiqadi
        await ctx.replyWithMarkdown(
          "*O'quvchi telefon raqamingizni kiriting:*\n\n" +
          "Agar telefon raqami bo'lsa, kiriting.\n" +
          "Aks holda *yo'q* deb yozing.\n\n" +
          "_Yoki quyidagi tugma orqali ulashing:_",
          {
            reply_markup: Markup.keyboard([
              [Markup.button.contactRequest("Telefon raqamini ulashish")]
            ])
            .oneTime()
            .resize()
            .reply_markup
          }
        );
        break;

      case 'student_phone':
        if (text?.toLowerCase() === 'yo\'q' || text?.toLowerCase() === 'yoq' || text === '-') {
          ctx.session.registrationData.studentPhone = '';
        } else {
          const phoneRegex = /^(\+998|998|8)?\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
          const cleanPhone = text.replace(/\s/g, '');
          if (!phoneRegex.test(cleanPhone)) {
            return ctx.reply("Noto'g'ri format. Yoki 'yo'q' deb yozing.");
          }
          let formatted = cleanPhone;
          if (cleanPhone.startsWith('8')) formatted = '+998' + cleanPhone.slice(1);
          else if (cleanPhone.startsWith('998')) formatted = '+' + cleanPhone;
          else if (cleanPhone.length === 9) formatted = '+998' + cleanPhone;
          ctx.session.registrationData.studentPhone = formatted;
        }

        ctx.session.registrationStep = 'address';
        await ctx.replyWithMarkdown(
          "*Manzilni kiriting:*\n\n" +
          "Masalan: Toshkent shahar, Yunusobod tumani, 12-uy",
          { reply_markup: Markup.removeKeyboard().reply_markup }
        );
        break;

      case 'address':
        if (text.length < 5) return ctx.reply("Manzil juda qisqa. Batafsil yozing:");
        ctx.session.registrationData.address = text;
        await completeRegistration(ctx);
        break;
    }
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply("Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring.");
  }
};

// Kontakt ulashish — faqat o'quvchi telefoni uchun
export const handlePhoneShare = async (ctx: any) => {
  try {
    if (!ctx.message?.contact) return;

    if (ctx.session.registrationStep === 'student_phone') {
      const phone = ctx.message.contact.phone_number;
      ctx.session.registrationData.studentPhone = phone;
      ctx.session.registrationStep = 'address';

      await ctx.replyWithMarkdown(
        "*Telefon qabul qilindi!*\n\n" +
        "Endi manzilni kiriting:\n" +
        "Masalan: Toshkent, Chilanzar, 45-uy",
        { reply_markup: Markup.removeKeyboard().reply_markup }
      );
    }
  } catch (error) {
    console.error('Phone share error:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};

const completeRegistration = async (ctx: any) => {
  try {
    const data = ctx.session.registrationData;
    const user = new User({
      telegramId: ctx.from.id,
      fullName: data.fullName,
      phone: data.parentPhone,
      parentPhone: data.parentPhone,
      studentPhone: data.studentPhone || '',
      address: data.address,
      language: 'uz',
      role: 'student',
      paymentDay: 10,
      paymentAmount: 500000
    });
    await user.save();

    delete ctx.session.registrationStep;
    delete ctx.session.registrationData;

    await ctx.replyWithMarkdown(
      `*Tabriklaymiz, ${user.fullName}!*\n\n` +
      `Ro'yxatdan muvaffaqiyatli o'tdingiz.\n` +
      `Endi barcha imkoniyatlardan foydalanishingiz mumkin.`,
      { reply_markup: Markup.inlineKeyboard([[Markup.button.callback("Asosiy menyu", "back_to_menu")]]).reply_markup }
    );
  } catch (error) {
    console.error('Registration completion error:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};


export const sharePhoneButton = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
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
  } catch (error) {
    console.error('Share phone button error:', error);
  }
};

// === ASOSIY MENYU ===
export const showMainMenu = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    setMomentLocale(ctx);
    
    if (isTeacher(ctx)) {
      await ctx.reply("👨‍🏫 O'qituvchi paneli:", Markup.inlineKeyboard([
        [Markup.button.callback(t('students', ctx), 'list_students')],
        [Markup.button.callback(t('payment', ctx), 'payment_list')],
        [Markup.button.callback("Jadval", 'manage_schedule')], // YANGI TUGMA,
        [Markup.button.callback(t('homework', ctx), 'manual_homework')],
        [Markup.button.callback("📝 Tekshirilmagan vazifalar", 'check_homework')],
        [Markup.button.callback(t('attendance', ctx), 'take_attendance')],
        [Markup.button.callback(t('rating', ctx), 'rating')],
        [Markup.button.callback("❌ O'quvchini chiqarish", 'remove_student')], // YANGI TUГMA
        [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
      ]));
    } else {
      await ctx.reply("🎓 O'quvchi menyusi:", Markup.inlineKeyboard([
        [Markup.button.callback(t('profile', ctx), 'profile')],
        // O'quvchi menyusi ichida
        [Markup.button.callback("Karra jadvali o'rganish", 'multiplication_quiz')],
        [Markup.button.callback(t('payment', ctx), 'payment_status')],
        [Markup.button.callback("📊 To'lov tarixi", 'payment_history')],
        [Markup.button.callback(t('schedule', ctx), 'view_schedule')],
        [Markup.button.callback(t('homework', ctx), 'submit_homework')],
        [Markup.button.callback(t("📈 Sizning statistikangiz", ctx), 'student_stats')],
        [Markup.button.callback("🌐 Tilni o'zgartirish", 'change_language')]
      ]));
    }
  } catch (error) {
    console.error('Show main menu error:', error);
  }
};
// === PROFIL ===
export const showProfile = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(t('not_registered', ctx));
      return;
    }
    
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

    await ctx.replyWithMarkdownV2(msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback(t('edit', ctx), 'edit_profile')],
        [backButton('back_to_menu', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show profile error:', error);
    await ctx.reply("❌ Profilni ko'rsatishda xatolik yuz berdi.");
  }
};


// === PROFILNI TAHRIRLASH ===
export const editProfile = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply(t('not_registered', ctx));

    ctx.session.editStep = 'edit_fullname'; // birinchi qadam

    await ctx.reply(
      `*Profilni tahrirlash*\n\n` +
      `Hozirgi ism-familiya: *${user.fullName}*\n\n` +
      `Yangi ism-familiyani kiriting:`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Bekor qilish", "cancel_edit")]
        ]).reply_markup
      }
    );
  } catch (error) {
    console.error('Edit profile error:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};

// Keyingi bosqichlar uchun handler (text orqali ishlaydi)
export const handleProfileEdit = async (ctx: any) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;

    const text = ctx.message?.text?.trim();
    const step = ctx.session?.editStep;

    if (!step) return;

    switch (step) {
      case 'edit_fullname':
        if (text.length < 3) {
          return ctx.reply("Ism juda qisqa. To'liq ism-familiya kiriting:");
        }
        user.fullName = text;
        ctx.session.editStep = 'edit_parent_phone';
        await ctx.reply(
          `Yangi ism saqlandi: *${text}*\n\n` +
          `Hozirgi ota-ona raqami: \`${user.parentPhone}\`\n\n` +
          `Yangi raqamni kiriting (masalan: +998901234567):`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'edit_parent_phone':
        const clean = text.replace(/\s/g, '');
        const phoneRegex = /^\+?998[0-9]{9}$/;
        if (!phoneRegex.test(clean)) {
          return ctx.reply("Noto'g'ri format. Masalan: +998901234567");
        }
        user.parentPhone = clean.startsWith('+') ? clean : '+' + clean;
        ctx.session.editStep = 'edit_student_phone';
        await ctx.reply(
          `Ota-ona raqami saqlandi: \`${user.parentPhone}\`\n\n` +
          `O'quvchi raqami (agar bo'lsa): ${user.studentPhone || "yo'q"}\n\n` +
          `Yangi o'quvchi raqamini kiriting yoki "yo'q" deb yozing:`
        );
        break;

      case 'edit_student_phone':
        if (text.toLowerCase() === 'yo\'q' || text === '-' || text === 'yoq') {
          user.studentPhone = '';
        } else {
          const clean = text.replace(/\s/g, '');
          const phoneRegex = /^\+?998[0-9]{9}$/;
          if (!phoneRegex.test(clean)) {
            return ctx.reply("Noto'g'ri format yoki \"yo'q\" deb yozing:");
          }
          user.studentPhone = clean.startsWith('+') ? clean : '+' + clean;
        }
        ctx.session.editStep = 'edit_address';
        await ctx.reply(
          `O'quvchi raqami saqlandi\n\n` +
          `Hozirgi manzil: ${user.address || "kiritilmagan"}\n\n` +
          `Yangi manzilni kiriting:`
        );
        break;

case 'edit_address':
  if (text.length < 5) {
    return ctx.reply("Manzil juda qisqa. Batafsil yozing:");
  }
  user.address = text;
  await user.save();

  delete ctx.session.editStep;

  // TO'G'RI USUL: Hech qanday qo'lda escape qilmaymiz!
  const message = `*Profil muvaffaqiyatli yangilandi!*

Ism-familiya: *${user.fullName}*
Ota-ona: \`${user.parentPhone}\`
O'quvchi: ${user.studentPhone ? `\`${user.studentPhone}\`` : "yo'q"}
Manzil: ${user.address}`;

  // Faqat bitta joyda escape qilamiz — oxirida!
  await ctx.replyWithMarkdownV2(escapeMarkdownV2(message), {
    reply_markup: Markup.inlineKeyboard([
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
  break;
    }
  } catch (error) {
    console.error('Handle profile edit error:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};

// Bekor qilish
export const cancelEdit = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  delete ctx.session.editStep;
  await ctx.reply("Tahrirlash bekor qilindi.", {
    reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
  });
};


// === O'QUVCHILAR RO'YXATI ===
export const listStudents = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const students = await User.find({ role: 'student' });
    if (students.length === 0) {
      await ctx.reply("O'quvchi yo'q.");
      return;
    }
    
    const buttons = students.map(s => [Markup.button.callback(
      `${s.fullName} — ${s.parentPhone}`, 
      `student_${s._id}`
    )]);
    
    await ctx.reply("O'quvchilar:", { 
      reply_markup: Markup.inlineKeyboard([...buttons, [backButton('back_to_menu', ctx)]]).reply_markup 
    });
  } catch (error) {
    console.error('List students error:', error);
    await ctx.reply("❌ O'quvchilar ro'yxatini ko'rsatishda xatolik yuz berdi.");
  }
};

// === JADVAL QO'SHISH ===
export const addSchedule = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
    
    const dayButtons = days.map(day => [Markup.button.callback(day, `sched_day_${day}`)]);
    
    await ctx.reply("Hafta kunini tanlang:", {
      reply_markup: Markup.inlineKeyboard([
        ...dayButtons,
        [backButton('back_to_menu', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Add schedule error:', error);
    await ctx.reply("❌ Jadval qo'shishda xatolik yuz berdi.");
  }
};

// === VAZIFA YUBORISH ===
export const manualHomework = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    ctx.session.step = 'send_homework_content';
    await ctx.reply("O'quvchilarga uyga vazifa yuboring (matn yoki rasm):");
  } catch (error) {
    console.error('Manual homework error:', error);
  }
};

// === DAVOMAT QILISH ===
export const takeAttendance = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
    if (students.length === 0) {
      await ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
      return;
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
  } catch (error) {
    console.error('Take attendance error:', error);
    await ctx.reply("❌ Davomat qilishda xatolik yuz berdi.");
  }
};

// Davomat sahifalari uchun handler
export const attendancePageHandler = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const page = parseInt(ctx.match[1]);
    const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
    const studentChunks: IUser[][] = [];
    
    for (let i = 0; i < students.length; i += 5) {
      studentChunks.push(students.slice(i, i + 5));
    }

    if (page < 0 || page >= studentChunks.length) {
      await ctx.reply("Noto'g'ri sahifa!");
      return;
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
  } catch (error) {
    console.error('Attendance page handler error:', error);
  }
};

// Har bir o'quvchi uchun davomat belgilash
export const attendanceStudentHandler = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi!");
      return;
    }

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
  } catch (error) {
    console.error('Attendance student handler error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};

// Davomat belgilash handlerlari
export const markAttendanceHandler = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const status = ctx.match[1];
    const studentId = ctx.match[2];
    const today = moment().format('YYYY-MM-DD');
    
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi!");
      return;
    }

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
        console.log(`O'quvchiga SMS yuborish: ${student.studentPhone} - ${message}`);
      }
      
    } catch (e) {
      console.log(`Xabar yuborilmadi: ${student.fullName}`);
    }

  } catch (error) {
    console.error('Mark attendance error:', error);
    await ctx.reply("❌ Davomat belgilashda xatolik yuz berdi.");
  }
};

// === TO'LOV STATUS ===
export const showPaymentStatus = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(t('not_registered', ctx));
      return;
    }

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

    await ctx.replyWithMarkdownV2(
      msg.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'),
      { reply_markup: Markup.inlineKeyboard(buttons).reply_markup }
    );
  } catch (error) {
    console.error('Show payment status error:', error);
    await ctx.reply("❌ To'lov ma'lumotlarini ko'rsatishda xatolik yuz berdi.");
  }
};

// === TO'LOVLAR RO'YXATI (O'QITUVCHI) — 100% ISHLAYDI ===
export const showPaymentList = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }

    const currentMonth = moment().format('YYYY-MM');
    const monthName = moment().format('MMMM YYYY').toUpperCase();

    // Barcha o'quvchilarni olish
    const students = await User.find({ role: 'student' }).lean();

    // Joriy oy to'lovlarini olish (populate bilan)
    const payments = await Payment.find({ month: currentMonth })
      .populate<{ userId: IUser | null }>('userId')
      .lean();

    // To'lovlar xaritasini yaratamiz (userId bo'yicha)
    const paymentMap = new Map<string, any>();
    payments.forEach(p => {
      if (p.userId?._id) {
        paymentMap.set(p.userId._id.toString(), p);
      }
    });

    let paidCount = 0;
    let unpaidCount = 0;
    let paidText = '';
    let unpaidText = '';

    students.forEach((student, index) => {
      const studentId = student._id.toString();
      const payment = paymentMap.get(studentId);
      const name = student.fullName;
      const amount = student.paymentAmount.toLocaleString();

      if (payment?.paid) {
        paidCount++;
        const date = moment(payment.paidAt).format('DD.MM');
        const method = payment.method === 'receipt' ? 'Chek' : 'Naqd';
        paidText += `${paidCount}. ${name} — ${amount} so'm (${date}, ${method})\n`;
      } else {
        unpaidCount++;
        unpaidText += `${unpaidCount}. ${name} — ${amount} so'm\n`;
      }
    });

    let message = `*${monthName} TO'LOVLARI*\n\n`;
    message += `To'langan: ${paidCount} ta\n`;
    message += `To'lanmagan: ${unpaidCount} ta\n\n`;

    if (paidCount > 0) {
      message += `*To'langanlar:*\n${paidText}\n`;
    }

    if (unpaidCount > 0) {
      message += `*To'lanmaganlar:*\n${unpaidText}`;
    }

    if (paidCount === 0 && unpaidCount === 0) {
      message += "O'quvchilar topilmadi yoki hech kim to'lov qilmagan.";
    }

    await ctx.replyWithMarkdownV2(
      message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'),
      {
        reply_markup: Markup.inlineKeyboard([
          [backButton('back_to_menu', ctx)]
        ]).reply_markup
      }
    );

  } catch (error) {
    console.error('Show payment list error:', error);
    await ctx.reply("To'lovlar ro'yxatini yuklashda xatolik yuz berdi.");
  }
};


// === REYTING ===
export const showRating = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const students = await User.find({ role: 'student' });
    if (students.length === 0) {
      await ctx.reply("O'quvchilar topilmadi.", Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]));
      return;
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

    await ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [backButton('back_to_menu', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show rating error:', error);
    await ctx.reply("❌ Reytingni ko'rsatishda xatolik yuz berdi.");
  }
};

// === TEKSHRILMAGAN VAZIFALAR ===
const showHomeworkPage = async (ctx: any, chunks: any[][], page: number) => {
  try {
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
  } catch (error) {
    console.error('Show homework page error:', error);
  }
};

export const showUncheckedHomeworks = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const uncheckedHomeworks = await Homework.find({ 
      checked: false,
      $or: [
        { answerText: { $exists: true, $ne: "" } },
        { answerPhoto: { $exists: true, $ne: "" } }
      ]
    }).populate<{ studentId: IUser }>('studentId');

    if (uncheckedHomeworks.length === 0) {
      await ctx.reply("✅ Tekshirilmagan vazifalar yo'q!", {
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
      });
      return;
    }

    const homeworkChunks: any[][] = [];
    for (let i = 0; i < uncheckedHomeworks.length; i += 5) {
      homeworkChunks.push(uncheckedHomeworks.slice(i, i + 5));
    }

    await showHomeworkPage(ctx, homeworkChunks, 0);
  } catch (error) {
    console.error('Show unchecked homeworks error:', error);
    await ctx.reply("❌ Tekshirilmagan vazifalarni ko'rsatishda xatolik yuz berdi.");
  }
};

export const showHomeworkPageHandler = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
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
  } catch (error) {
    console.error('Show homework page handler error:', error);
  }
};

// === TO'LOV TARIXI ===
export const showPaymentHistory = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(t('not_registered', ctx));
      return;
    }

    const payments = await Payment.find({ userId: user._id, paid: true }).sort({ paidAt: -1 });
    if (payments.length === 0) {
      await ctx.reply("Siz hali to'lov qilmagansiz.", { 
        reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup 
      });
      return;
    }

    const lines = payments.map(p => {
      const date = moment(p.paidAt).format('DD.MM.YYYY');
      const method = p.method === 'receipt' ? 'Chek' : 'Naqd';
      return `${date} | ${p.amount.toLocaleString()} so'm | ${method}`;
    }).join('\n');

    await ctx.replyWithHTML(`<b>To'lov tarixi</b>\n\n<pre>${lines}</pre>`, {
      reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
    });
  } catch (error) {
    console.error('Show payment history error:', error);
    await ctx.reply("❌ To'lov tarixini ko'rsatishda xatolik yuz berdi.");
  }
};

// === JADVAL ===
export const manageSchedule = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));

  const schedules = await Schedule.find().sort({ day: 1, time: 1 });

  let message = "*JADVAL BOSHQARUV*\n\n";
  if (schedules.length === 0) {
    message += "Hozircha jadval yo‘q.";
  } else {
    schedules.forEach((s: any, i: number) => {
      message += `${i + 1}. ${s.day} | ${s.time} | ${s.group}\n`;
    });
  }

  await ctx.replyWithMarkdownV2(escapeMarkdownV2(message), {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("Yangi dars qo‘shish", "add_schedule")],
      [Markup.button.callback("Darsni tahrirlash", "edit_schedule")],
      [Markup.button.callback("Darsni o‘chirish", "delete_schedule")],
      [backButton('back_to_menu', ctx)]
    ]).reply_markup
  });
};


export const editScheduleStart = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  if (!isTeacher(ctx)) return;

  const schedules = await Schedule.find().sort({ day: 1, time: 1 });
  if (schedules.length === 0) {
    return ctx.reply("Tahrirlaydigan jadval yo‘q.", {
      reply_markup: Markup.inlineKeyboard([[backButton('manage_schedule', ctx)]]).reply_markup
    });
  }

  const buttons = schedules.map((s: any) => [
    Markup.button.callback(`${s.day} | ${s.time} | ${s.group}`, `edit_sched_${s._id}`)
  ]);

  await ctx.reply("Tahrirlamoqchi bo‘lgan darsni tanlang:", {
    reply_markup: Markup.inlineKeyboard([...buttons, [backButton('manage_schedule', ctx)]]).reply_markup
  });
};

export const deleteScheduleStart = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  if (!isTeacher(ctx)) return;

  const schedules = await Schedule.find();
  if (schedules.length === 0) {
    return ctx.reply("O‘chiradigan dars yo‘q.");
  }

  const buttons = schedules.map((s: any) => [
    Markup.button.callback(`${s.day} | ${s.time} | ${s.group}`, `confirm_delete_${s._id}`)
  ]);

  await ctx.reply("O‘chirish uchun darsni tanlang:", {
    reply_markup: Markup.inlineKeyboard([...buttons, [backButton('manage_schedule', ctx)]]).reply_markup
  });
};

// ==================== TEXT ORQALI JADVAL KIRITISH ====================
export const handleScheduleText = async (ctx: any) => {
  if (!ctx.message?.text || !isTeacher(ctx)) return;
  if (!ctx.session?.scheduleStep) return;

  const text = ctx.message.text.trim();

  if (ctx.session.scheduleStep === 'input_time' || ctx.session.scheduleStep === 'edit_time') {
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
      return ctx.reply("Noto‘g‘ri vaqt. Masalan: 18:30");
    }

    if (ctx.session.editingSchedule) {
      ctx.session.tempSchedule = { time: text };
      ctx.session.scheduleStep = 'edit_group';
      await ctx.reply(`Yangi vaqt: ${text}\n\nYangi guruh nomini kiriting:`);
    } else {
      ctx.session.newSchedule.time = text;
      ctx.session.scheduleStep = 'input_group';
      await ctx.reply(`Vaqt saqlandi: ${text}\n\nGuruh nomini kiriting:`);
    }
  }

  else if (ctx.session.scheduleStep === 'input_group' || ctx.session.scheduleStep === 'edit_group') {
    if (text.length < 1) return ctx.reply("Guruh nomi bo‘sh bo‘lmasligi kerak!");

    if (ctx.session.editingSchedule) {
      await Schedule.findByIdAndUpdate(ctx.session.editingSchedule, {
        time: ctx.session.tempSchedule.time,
        group: text
      });
      delete ctx.session.editingSchedule;
      delete ctx.session.tempSchedule;
    } else {
      const { day, time } = ctx.session.newSchedule;
      await new Schedule({ day, time, group: text }).save();
      delete ctx.session.newSchedule;
    }

    delete ctx.session.scheduleStep;

    await ctx.replyWithMarkdownV2(
      escapeMarkdownV2("Jadval muvaffaqiyatli yangilandi!"),
      { reply_markup: Markup.inlineKeyboard([[Markup.button.callback("Jadval", "manage_schedule")]]).reply_markup }
    );
  }
};
// === O'QUVCHI STATISTIKASI ===
export const showStudentStats = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(t('not_registered', ctx));
      return;
    }

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

    await ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [backButton('back_to_menu', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show student stats error:', error);
    await ctx.reply("❌ Statistika ko'rsatishda xatolik yuz berdi.");
  }
};

// === O'QUVCHI MA'LUMOTLARI ===
export const showStudentDetails = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

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

    await ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 To'lov kunini o'zgartirish", `set_payment_day_${student._id}`),
          Markup.button.callback("💵 Summani o'zgartirish", `set_payment_amount_${student._id}`)
        ],
        [
          Markup.button.callback("📊 Davomat tarixi", `attendance_history_${student._id}`),
          Markup.button.callback("📚 Vazifa tarixi", `homework_history_${student._id}`)
        ],
        [Markup.button.callback("❌ O'quvchini chiqarish", `remove_student_${student._id}`)],
        [backButton('list_students', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show student details error:', error);
    await ctx.reply("❌ O'quvchi ma'lumotlarini ko'rsatishda xatolik yuz berdi.");
  }
};

// === TO'LOV KUNINI O'ZGARTIRISH ===
export const setPaymentDay = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

    ctx.session.step = 'set_payment_day';
    ctx.session.studentId = studentId;

    await ctx.reply(`O'quvchi: *${student.fullName}*\n\nYangi to'lov kunini kiriting (1-31 oralig'ida):`, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Set payment day error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};

// === TO'LOV SUMMASINI O'ZGARTIRISH ===
export const setPaymentAmount = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

    ctx.session.step = 'set_payment_amount';
    ctx.session.studentId = studentId;

    await ctx.reply(`O'quvchi: *${student.fullName}*\n\nJoriy summa: *${student.paymentAmount.toLocaleString()} so'm*\n\nYangi oylik to'lov summasini kiriting:`, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Set payment amount error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};

// === DAVOMAT TARIXI ===
export const showAttendanceHistory = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

    const attendances = await Attendance.find({ userId: student._id })
      .sort({ date: -1 })
      .limit(20);

    if (attendances.length === 0) {
      await ctx.reply(`*${student.fullName}* uchun davomat ma'lumotlari topilmadi.`, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [backButton(`student_${studentId}`, ctx)]
        ]).reply_markup
      });
      return;
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

    await ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show attendance history error:', error);
    await ctx.reply("❌ Davomat tarixini ko'rsatishda xatolik yuz berdi.");
  }
};

// === VAZIFA TARIXI ===
export const showHomeworkHistory = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

    const homeworks = await Homework.find({ studentId: student._id })
      .sort({ date: -1 })
      .limit(20);

    if (homeworks.length === 0) {
      await ctx.reply(`*${student.fullName}* uchun vazifa ma'lumotlari topilmadi.`, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [backButton(`student_${studentId}`, ctx)]
        ]).reply_markup
      });
      return;
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

    await ctx.replyWithMarkdownV2(message.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&'), {
      reply_markup: Markup.inlineKeyboard([
        [backButton(`student_${studentId}`, ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Show homework history error:', error);
    await ctx.reply("❌ Vazifa tarixini ko'rsatishda xatolik yuz berdi.");
  }
};

// === YANGI TO'LOV HANDLERLARI ===

export const sendReceipt = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
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
  } catch (error) {
    console.error('Send receipt error:', error);
  }
};

export const offlinePayment = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply("Foydalanuvchi topilmadi.");
      return;
    }

    const currentMonth = moment().format('YYYY-MM');
    const payment = await Payment.findOne({ userId: user._id, month: currentMonth, paid: false });
    
    if (!payment) {
      await ctx.reply("Bu oy uchun to'lov topilmadi yoki allaqachon to'langan.");
      return;
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
  } catch (error) {
    console.error('Offline payment error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};

export const confirmPayment = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const method = ctx.match[1];
    const paymentId = ctx.match[2];
    
    const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
    if (!payment) {
      await ctx.reply("To'lov topilmadi!");
      return;
    }

    if (payment.paid) {
      await ctx.reply("Bu to'lov allaqachon tasdiqlangan!");
      return;
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

  } catch (error) {
    console.error('Confirm payment error:', error);
    await ctx.reply("❌ To'lov tasdiqlashda xatolik yuz berdi.");
  }
};

export const rejectReceipt = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const paymentId = ctx.match[1];
    const payment = await Payment.findById(paymentId).populate<{ userId: IUser }>('userId');
    
    if (!payment) {
      await ctx.reply("To'lov topilmadi!");
      return;
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

  } catch (error) {
    console.error('Reject receipt error:', error);
    await ctx.reply("❌ To'lov rad etishda xatolik yuz berdi.");
  }
};

// === TILNI O'ZGARTIRISH ===
export const changeLanguage = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
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
  } catch (error) {
    console.error('Change language error:', error);
  }
};

// Tilni o'rnatish handleri
export const setLanguage = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
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
  } catch (error) {
    console.error('Set language error:', error);
    await ctx.reply("❌ Tilni o'zgartirishda xatolik yuz berdi.");
  }
};

// === O'QUVCHINI CHIQARISH TIZIMI ===

// O'quvchini chiqarish bosqichlari
export const removeStudentStart = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const students = await User.find({ role: 'student' }).sort({ fullName: 1 });
    if (students.length === 0) {
      await ctx.reply("O'quvchilar topilmadi.");
      return;
    }
    
    const buttons = students.map(s => [Markup.button.callback(
      `${s.fullName} - ${s.parentPhone}`, 
      `remove_student_${s._id}`
    )]);
    
    buttons.push([backButton('back_to_menu', ctx)]);
    
    await ctx.reply("❌ Chiqarish uchun o'quvchini tanlang:", {
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  } catch (error) {
    console.error('Remove student start error:', error);
    await ctx.reply("❌ O'quvchilarni ro'yxatini ko'rsatishda xatolik.");
  }
};

// === O'QUVCHINI CHIQARISHNI TASDIQLASH ===
export const confirmRemoveStudent = async (ctx: any) => {
  try {
    // Avval callback query ga javob beramiz
    try {
      await ctx.answerCbQuery();
    } catch (error) {
      console.log('Callback query already expired');
    }

    console.log('🔴 REMOVE STUDENT HANDLER ISHLAYAPTI');
    console.log('Match:', ctx.match);
    console.log('Student ID:', ctx.match[1]);

    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }

    // Eski xabarni o'chirish
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.log('Eski xabarni o\'chirishda xatolik');
    }
    
    ctx.session.studentToRemove = studentId;
    
    await ctx.reply(
      `⚠️ *O'QUVCHINI CHIQARISHNI TASDIQLASH*\n\n` +
      `👤 O'quvchi: *${student.fullName}*\n` +
      `📞 Telefon: \`${student.parentPhone}\`\n` +
      `📍 Manzil: ${student.address}\n\n` +
      `❌ Bu amalni ortga qaytarib bo'lmaydi!\n` +
      `📊 O'quvchining barcha ma'lumotlari (davomat, to'lovlar, vazifalar) o'chiriladi.\n\n` +
      `Rostan ham chiqarib tashlamoqchimisiz?`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ HA, chiqarish", `final_remove_${studentId}`),
            Markup.button.callback("❌ BEKOR QILISH", "remove_student_cancel")
          ]
        ]).reply_markup
      }
    );
    
    console.log('✅ Tasdiqlash sahifasi yuborildi');
    
  } catch (error) {
    console.error('❌ Confirm remove student error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};

// O'quvchini final chiqarish
export const finalRemoveStudent = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    if (!isTeacher(ctx)) {
      await ctx.reply(t('teacher_only', ctx));
      return;
    }
    
    const studentId = ctx.match[1];
    const student = await User.findById(studentId);
    if (!student) {
      await ctx.reply("O'quvchi topilmadi.");
      return;
    }
    
    // O'quvchi ma'lumotlarini saqlab qolish (backup uchun)
    const studentData = {
      fullName: student.fullName,
      parentPhone: student.parentPhone,
      studentPhone: student.studentPhone,
      address: student.address,
      removedAt: new Date(),
      removedBy: ctx.from.id
    };
    
    // O'quvchining barcha ma'lumotlarini o'chirish
    await Promise.all([
      Attendance.deleteMany({ userId: studentId }),
      Payment.deleteMany({ userId: studentId }),
      Homework.deleteMany({ studentId: studentId }),
      User.findByIdAndDelete(studentId)
    ]);
    
    // O'qituvchiga xabar
    await ctx.editMessageText(
      `✅ *O'QUVCHI MUVAFFAQIYATLI CHIQARILDI*\n\n` +
      `👤 O'quvchi: *${studentData.fullName}*\n` +
      `📞 Telefon: \`${studentData.parentPhone}\`\n` +
      `🗓️ Chiqarilgan sana: ${moment().format('DD.MM.YYYY HH:mm')}\n\n` +
      `Barcha ma'lumotlar o'chirildi.`,
      { parse_mode: 'Markdown' }
    );
    
    // O'quvchiga xabar (agar botda bo'lsa)
    try {
      await ctx.telegram.sendMessage(
        student.telegramId,
        `❌ *Siz o'quv markazining tizimidan chiqarildingiz*\n\n` +
        `Hurmatli ${studentData.fullName}, siz o'quv markazining bot tizimidan chiqarildingiz.\n\n` +
        `Agar bu xato bo'lsa, administrator bilan bog'laning.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.log(`O'quvchiga xabar yuborilmadi: ${studentData.fullName}`);
    }
    
    // Log yozish
    console.log(`O'quvchi chiqarildi: ${studentData.fullName}, Telefon: ${studentData.parentPhone}, O'chirgan: ${ctx.from.first_name}`);
    
  } catch (error) {
    console.error('Final remove student error:', error);
    await ctx.reply("❌ O'quvchini chiqarishda xatolik yuz berdi.");
  }
};

// O'quvchini chiqarishni bekor qilish
export const cancelRemoveStudent = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  
  try {
    delete ctx.session.studentToRemove;
    
    await ctx.editMessageText(
      "✅ O'quvchini chiqarish bekor qilindi.",
      {
        reply_markup: Markup.inlineKeyboard([
          [backButton('back_to_menu', ctx)]
        ]).reply_markup
      }
    );
  } catch (error) {
    console.error('Cancel remove student error:', error);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
};


export {
  startMultiplicationQuiz,
  handleQuizAnswer,
  stopQuiz,
} from './quiz';


// === O'QUVCHI UCHUN JADVAL KO'RISH ===
export const viewSchedule = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  try {
    const schedules = await Schedule.find().sort({ day: 1, time: 1 });

    let message = "*Dars jadvali*\n\n";
    if (schedules.length === 0) {
      message += "Hozircha jadval yo‘q.";
    } else {
      const daysOrder = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
      daysOrder.forEach(day => {
        const daySchedules = schedules.filter((s: any) => s.day === day);
        if (daySchedules.length > 0) {
          message += `*${day}*\n`;
          daySchedules.forEach((s: any) => {
            message += `└ ${s.time} – ${s.group}\n`;
          });
          message += '\n';
        }
      });
    }

    await ctx.replyWithMarkdownV2(escapeMarkdownV2(message.trim()), {
      reply_markup: Markup.inlineKeyboard([
        [backButton('back_to_menu', ctx)]
      ]).reply_markup
    });
  } catch (error) {
    console.error('Jadval ko‘rish xatosi:', error);
    await ctx.reply("Jadvalni yuklashda xatolik yuz berdi.");
  }
};

// === O'QUVCHI UCHUN UYGA VAZIFA TOPSHIRISH ===
export const submitHomework = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  const today = moment().format('YYYY-MM-DD');
  const existing = await Homework.findOne({
    studentId: (await User.findOne({ telegramId: ctx.from.id }))?._id,
    date: today
  });

  if (existing?.answerText || existing?.answerPhoto) {
    return ctx.reply("Siz bugungi vazifani allaqachon topshirgansiz!", {
      reply_markup: Markup.inlineKeyboard([[backButton('back_to_menu', ctx)]]).reply_markup
    });
  }

  ctx.session.homeworkStep = 'waiting_answer';
  ctx.session.homeworkDate = today;

  await ctx.reply(
    "*Uyga vazifani topshiring*\n\n" +
    "Matn yoki rasm yuboring. O‘qituvchi tekshiradi va baho qo‘yadi.",
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("Bekor qilish", "back_to_menu")]
      ]).reply_markup
    }
  );
};

// === VAZIFANI TEKSHIRISH ===
export const reviewHomework = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  try {
    if (!isTeacher(ctx)) return ctx.reply(t('teacher_only', ctx));

    const homeworkId = ctx.match[1];
    const homework = await Homework.findById(homeworkId)
      .populate<{ studentId: IUser }>('studentId');

    if (!homework) return ctx.reply("Vazifa topilmadi.");

    const student = homework.studentId;
    const date = moment(homework.date).format('DD.MM.YYYY');

    let message = `*Vazifani tekshirish*\n\n`;
    message += `O'quvchi: *${student.fullName}*\n`;
    message += `Sana: ${date}\n\n`;

    if (homework.answerPhoto) {
      await ctx.replyWithPhoto(homework.answerPhoto, {
        caption: escapeMarkdownV2(message + (homework.answerText ? `${homework.answerText}` : "")),
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("5", `score_${homeworkId}_5`),
            Markup.button.callback("4", `score_${homeworkId}_4`),
            Markup.button.callback("3", `score_${homeworkId}_3`)
          ],
          [
            Markup.button.callback("2", `score_${homeworkId}_2`),
            Markup.button.callback("1", `score_${homeworkId}_1`),
            Markup.button.callback("0", `score_${homeworkId}_0`)
          ],
          [Markup.button.callback("Orqaga", "check_homework")]
        ]).reply_markup
      });
    } else {
      message += homework.answerText || "Matn yo‘q";
      await ctx.replyWithMarkdownV2(escapeMarkdownV2(message), {
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("5", `score_${homeworkId}_5`),
            Markup.button.callback("4", `score_${homeworkId}_4`),
            Markup.button.callback("3", `score_${homeworkId}_3`)
          ],
          [
            Markup.button.callback("2", `score_${homeworkId}_2`),
            Markup.button.callback("1", `score_${homeworkId}_1`),
            Markup.button.callback("0", `score_${homeworkId}_0`)
          ],
          [Markup.button.callback("Orqaga", "check_homework")]
        ]).reply_markup
      });
    }
  } catch (error) {
    console.error('Vazifa tekshirish xatosi:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};

// === BAHO QO‘YISH — TO‘LIQ TUZATILGAN VERSIYA ===
export const scoreHomework = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  try {
    if (!isTeacher(ctx)) return;

    const [_, homeworkId, scoreStr] = ctx.match;
    const score = parseInt(scoreStr);

    const homework = await Homework.findById(homeworkId)
      .populate<{ studentId: IUser }>('studentId');

    if (!homework) {
      await ctx.reply("Vazifa topilmadi.");
      return;
    }

    homework.score = score;
    homework.checked = true;
    homework.checkedAt = new Date();
    await homework.save();

    const student = homework.studentId;
    const date = moment(homework.date).format('DD.MM.YYYY');

    // O‘qituvchiga tasdiq xabari
    const confirmedText = `*Baholandi!*\n\nO'quvchi: *${student.fullName}*\nSana: ${date}\nBaho: *${score}/5*`;

    if (ctx.callbackQuery.message?.photo) {
      await ctx.editMessageCaption(escapeMarkdownV2(confirmedText), {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Orqaga", "check_homework")]
        ]).reply_markup
      });
    } else {
      await ctx.editMessageText(escapeMarkdownV2(confirmedText), {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Orqaga", "check_homework")]
        ]).reply_markup
      });
    }

    // O‘QUVCHIGA XABAR YUBORISH — BU YERDA bot YUQ → ctx.telegram ISHLATILDI
    try {
      await ctx.telegram.sendMessage(
        student.telegramId,
        `Sizning vazifangiz tekshirildi!\n\n` +
        `Sana: ${date}\n` +
        `Baho: *${score}/5*` +
        (score >= 4 ? " Ajoyib ish!" : "\nKeyingi safar yaxshiroq harakat qiling!"),
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.log("O‘quvchiga xabar yuborilmadi:", student.fullName);
    }

  } catch (error) {
    console.error('Baho qo‘yish xatosi:', error);
    await ctx.reply("Xatolik yuz berdi.");
  }
};
