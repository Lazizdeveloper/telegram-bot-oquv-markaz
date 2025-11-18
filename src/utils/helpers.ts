import { Markup } from 'telegraf';
import { User } from '../config/database';
import moment from 'moment';

export const isTeacher = (ctx: any): boolean => {
  const teacherId = process.env.TEACHER_ID;
  return ctx.from.id.toString() === teacherId;
};

export const isRegistered = async (ctx: any): Promise<boolean> => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  return !!user;
};

// utils/helpers.ts (mavjud fayl ichiga qo'shing)

export const escapeMarkdownV2 = (text: string): string => {
  // Telegram MarkdownV2 da rezervlangan barcha belgilarni escape qiladi
  const chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  return text.replace(new RegExp(chars.map(c => `\\${c}`).join('|'), 'g'), '\\$&');
};

export const getLanguage = (ctx: any): string => {
  return ctx.session?.language || 'uz';
};

export const t = (key: string, ctx: any, params: any = {}): string => {
  const language = getLanguage(ctx);
  
  const translations: any = {
    uz: {
      'welcome': '🎓 *O\'quv markaziga xush kelibsiz!*\n\nIltimos, tilni tanlang:',
      'enter_phone': '📞 Telefon raqamingizni kiriting (+998901234567 formatida):',
      'enter_address': '📍 Manzilingizni kiriting:',
      'registration_success': '✅ *Ro\'yxatdan muvaffaqiyatli o\'tdingiz!*',
      'homework_assigned': '📚 *Yangi uyga vazifa:*\n\n{task}',
      'homework_submitted': '✅ Vazifa topshirildi! O\'qituvchi tekshiradi.',
      'students': '👥 O\'quvchilar',
      'payment': '💳 To\'lov',
      'homework': '📚 Vazifa',
      'attendance': '📊 Davomat',
      'rating': '🏆 Reyting',
      'profile': '👤 Profil',
      'schedule': '📅 Jadval',
      'name': 'Ism',
      'phone': 'Telefon',
      'address': 'Manzil',
      'payment_day': 'To\'lov kuni',
      'amount': 'Summa',
      'day': 'kun',
      'present': 'Kelgan',
      'late': 'Kechikkan',
      'absent': 'Kelmagan',
      'payment_paid': 'To\'langan',
      'payment_unpaid': 'To\'lanmagan',
      'edit': 'Tahrirlash',
      'not_registered': 'Siz ro\'yxatdan o\'tmagansiz. /start ni bosing.',
      'teacher_only': 'Bu faqat o\'qituvchi uchun.',
      'take_attendance': 'Davomat qilish',
      'mark_attendance': 'Davomatni belgilash: *{name}*',
      'attendance_marked': '*{name}* uchun davomat *{status}* sifatida belgilandi.',
      'previous': 'Oldingi',
      'next': 'Keyingi',
      'not_marked': 'Belgilanmagan',
      'send_receipt': '📤 Chek yuborish',
      'offline_payment': '💵 Naqd to\'lov',
      'history': '📜 Tarix',
      'payment_info': `💳 *To'lov ma'lumotlari*\n\n📅 Oy: {month}\n💵 Summa: {amount} so'm\n📆 To'lov kuni: {day}-kun\n📊 Holat: {status}\n\n💳 *Karta ma'lumotlari:*\n📞 Karta raqami: \`{cardNumber}\`\n👤 Karta egasi: {cardName}`,
      'payment_success': '✅ *To\'lov tasdiqlandi!*\n\nOy: *{month}*\nSumma: *{amount} so\'m*\nUsul: *{method}*',
      'payment_rejected': '❌ *To\'lov rad etildi!*\n\nOy: *{month}*\nSumma: *{amount} so\'m*\n\nSabab: Noto\'g\'ri chek yoki ma\'lumotlar',
      // YANGI QO'SHILGAN TARJIMALAR
      'remove_student': "❌ O'quvchini chiqarish",
      'confirm_remove': "O'quvchini chiqarishni tasdiqlang",
      'student_removed': "O'quvchi muvaffaqiyatli chiqarildi",
      'removal_cancelled': "O'quvchini chiqarish bekor qilindi",
      'select_student_remove': "❌ Chiqarish uchun o'quvchini tanlang:",
      'remove_confirmation_title': "⚠️ *O'QUVCHINI CHIQARISHNI TASDIQLASH*",
      'remove_warning': "❌ Bu amalni ortga qaytarib bo'lmaydi!\n📊 O'quvchining barcha ma'lumotlari (davomat, to'lovlar, vazifalar) o'chiriladi.",
      'confirm_remove_question': "Rostan ham chiqarib tashlamoqchimisiz?",
      'yes_remove': "✅ HA, chiqarish",
      'cancel_remove': "❌ BEKOR QILISH",
      'remove_success': "✅ *O'QUVCHI MUVAFFAQIYATLI CHIQARILDI*",
      'removed_date': "🗓️ Chiqarilgan sana",
      'all_data_removed': "Barcha ma'lumotlar o'chirildi.",
      'student_notified': "❌ *Siz o'quv markazining tizimidan chiqarildingiz*",
      'student_notification_message': "Hurmatli {name}, siz o'quv markazining bot tizimidan chiqarildingiz.\n\nAgar bu xato bo'lsa, administrator bilan bog'laning.",
      'remove_cancelled': "✅ O'quvchini chiqarish bekor qilindi."
    },
    ru: {
      'welcome': '🎓 *Добро пожаловать в учебный центр!*\n\nПожалуйста, выберите язык:',
      'enter_phone': '📞 Введите ваш номер телефона (в формате +998901234567):',
      'enter_address': '📍 Введите ваш адрес:',
      'registration_success': '✅ *Регистрация прошла успешно!*',
      'homework_assigned': '📚 *Новое домашнее задание:*\n\n{task}',
      'homework_submitted': '✅ Задание отправлено! Учитель проверит.',
      'students': '👥 Ученики',
      'payment': '💳 Оплата',
      'homework': '📚 Задание',
      'attendance': '📊 Посещаемость',
      'rating': '🏆 Рейтинг',
      'profile': '👤 Профиль',
      'schedule': '📅 Расписание',
      'name': 'Имя',
      'phone': 'Телефон',
      'address': 'Адрес',
      'payment_day': 'День оплаты',
      'amount': 'Сумма',
      'day': 'день',
      'present': 'Присутствовал',
      'late': 'Опоздал',
      'absent': 'Отсутствовал',
      'payment_paid': 'Оплачено',
      'payment_unpaid': 'Не оплачено',
      'edit': 'Редактировать',
      'not_registered': 'Вы не зарегистрированы. Нажмите /start.',
      'teacher_only': 'Это только для учителя.',
      'take_attendance': 'Отметить посещаемость',
      'mark_attendance': 'Отметить посещаемость: *{name}*',
      'attendance_marked': 'Посещаемость для *{name}* отмечена как *{status}*.',
      'previous': 'Предыдущий',
      'next': 'Следующий',
      'not_marked': 'Не отмечено',
      'send_receipt': '📤 Отправить чек',
      'offline_payment': '💵 Наличные',
      'history': '📜 История',
      'payment_info': `💳 *Информация об оплате*\n\n📅 Месяц: {month}\n💵 Сумма: {amount} сум\n📆 День оплаты: {day}-число\n📊 Статус: {status}\n\n💳 *Данные карты:*\n📞 Номер карты: \`{cardNumber}\`\n👤 Владелец карты: {cardName}`,
      'payment_success': '✅ *Оплата подтверждена!*\n\nМесяц: *{month}*\nСумма: *{amount} сум*\nСпособ: *{method}*',
      'payment_rejected': '❌ *Оплата отклонена!*\n\nМесяц: *{month}*\nСумма: *{amount} сум*\n\nПричина: Неверный чек или информация',
      // YANGI QO'SHILGAN TARJIMALAR
      'remove_student': "❌ Удалить ученика",
      'confirm_remove': "Подтвердите удаление ученика",
      'student_removed': "Ученик успешно удален",
      'removal_cancelled': "Удаление ученика отменено",
      'select_student_remove': "❌ Выберите ученика для удаления:",
      'remove_confirmation_title': "⚠️ *ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ УЧЕНИКА*",
      'remove_warning': "❌ Это действие нельзя отменить!\n📊 Все данные ученика (посещаемость, платежи, задания) будут удалены.",
      'confirm_remove_question': "Вы действительно хотите удалить?",
      'yes_remove': "✅ ДА, удалить",
      'cancel_remove': "❌ ОТМЕНИТЬ",
      'remove_success': "✅ *УЧЕНИК УСПЕШНО УДАЛЕН*",
      'removed_date': "🗓️ Дата удаления",
      'all_data_removed': "Все данные удалены.",
      'student_notified': "❌ *Вы были удалены из системы учебного центра*",
      'student_notification_message': "Уважаемый(ая) {name}, вы были удалены из системы бота учебного центра.\n\nЕсли это ошибка, свяжитесь с администратором.",
      'remove_cancelled': "✅ Удаление ученика отменено."
    },
    en: {
      'welcome': '🎓 *Welcome to the educational center!*\n\nPlease choose your language:',
      'enter_phone': '📞 Enter your phone number (in +998901234567 format):',
      'enter_address': '📍 Enter your address:',
      'registration_success': '✅ *Registration completed successfully!*',
      'homework_assigned': '📚 *New homework assignment:*\n\n{task}',
      'homework_submitted': '✅ Homework submitted! Teacher will check.',
      'students': '👥 Students',
      'payment': '💳 Payment',
      'homework': '📚 Homework',
      'attendance': '📊 Attendance',
      'rating': '🏆 Rating',
      'profile': '👤 Profile',
      'schedule': '📅 Schedule',
      'name': 'Name',
      'phone': 'Phone',
      'address': 'Address',
      'payment_day': 'Payment day',
      'amount': 'Amount',
      'day': 'day',
      'present': 'Present',
      'late': 'Late',
      'absent': 'Absent',
      'payment_paid': 'Paid',
      'payment_unpaid': 'Unpaid',
      'edit': 'Edit',
      'not_registered': 'You are not registered. Press /start.',
      'teacher_only': 'This is for teacher only.',
      'take_attendance': 'Take attendance',
      'mark_attendance': 'Mark attendance for *{name}*',
      'attendance_marked': 'Attendance for *{name}* marked as *{status}*.',
      'previous': 'Previous',
      'next': 'Next',
      'not_marked': 'Not marked',
      'send_receipt': '📤 Send receipt',
      'offline_payment': '💵 Cash payment',
      'history': '📜 History',
      'payment_info': `💳 *Payment Information*\n\n📅 Month: {month}\n💵 Amount: {amount} UZS\n📆 Payment day: {day}th\n📊 Status: {status}\n\n💳 *Card Details:*\n📞 Card number: \`{cardNumber}\`\n👤 Card holder: {cardName}`,
      'payment_success': '✅ *Payment confirmed!*\n\nMonth: *{month}*\nAmount: *{amount} UZS*\nMethod: *{method}*',
      'payment_rejected': '❌ *Payment rejected!*\n\nMonth: *{month}*\nAmount: *{amount} UZS*\n\nReason: Incorrect receipt or information',
      // YANGI QO'SHILGAN TARJIMALAR
      'remove_student': "❌ Remove Student",
      'confirm_remove': "Confirm student removal",
      'student_removed': "Student successfully removed",
      'removal_cancelled': "Student removal cancelled",
      'select_student_remove': "❌ Select student to remove:",
      'remove_confirmation_title': "⚠️ *CONFIRM STUDENT REMOVAL*",
      'remove_warning': "❌ This action cannot be undone!\n📊 All student data (attendance, payments, homework) will be deleted.",
      'confirm_remove_question': "Are you sure you want to remove?",
      'yes_remove': "✅ YES, remove",
      'cancel_remove': "❌ CANCEL",
      'remove_success': "✅ *STUDENT SUCCESSFULLY REMOVED*",
      'removed_date': "🗓️ Removed date",
      'all_data_removed': "All data has been removed.",
      'student_notified': "❌ *You have been removed from the educational center system*",
      'student_notification_message': "Dear {name}, you have been removed from the educational center bot system.\n\nIf this is a mistake, please contact the administrator.",
      'remove_cancelled': "✅ Student removal cancelled."
    }
  };

  let text = translations[language]?.[key] || key;
  
  // Parametrlarni almashtirish
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  
  return text;
};

export const setMomentLocale = (ctx: any): void => {
  const language = getLanguage(ctx);
  const momentLocales: any = {
    uz: 'uz',
    ru: 'ru',
    en: 'en'
  };
  moment.locale(momentLocales[language] || 'uz');
};

export const TEACHER_ID = (): string => {
  const teacherId = process.env.TEACHER_ID;
  if (!teacherId) {
    console.error('TEACHER_ID muhit o\'zgaruvchisi belgilanmagan!');
    return '0';
  }
  return teacherId;
};

export const PAYMENT_CARD_NUMBER = process.env.PAYMENT_CARD_NUMBER || '8600 1234 5678 9101';
export const PAYMENT_CARD_NAME = process.env.PAYMENT_CARD_NAME || 'John Doe';

export const backButton = (callback: string, ctx: any) => {
  const backTexts = {
    uz: '🔙 Orqaga',
    ru: '🔙 Назад', 
    en: '🔙 Back'
  };
  return Markup.button.callback(backTexts[getLanguage(ctx)], callback);
};

// YANGI QO'SHILGAN FUNKSIYALAR

// Xavfsiz callback query javobi
export const safeAnswerCbQuery = async (ctx: any, text?: string) => {
  try {
    if (text) {
      await ctx.answerCbQuery(text);
    } else {
      await ctx.answerCbQuery();
    }
  } catch (error) {
    console.log('Callback query already expired, skipping answer...');
  }
};

// Format telefon raqami
export const formatPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, '');
  
  if (cleanPhone.startsWith('8')) {
    return '+998' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('998')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.length === 9) {
    return '+998' + cleanPhone;
  } else if (cleanPhone.startsWith('+998')) {
    return cleanPhone;
  }
  
  return cleanPhone;
};

// Telefon raqamini tekshirish
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+998|998|8)?\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  return phoneRegex.test(cleanPhone);
};

// Ismni tekshirish
export const isValidName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 100;
};

// Manzilni tekshirish
export const isValidAddress = (address: string): boolean => {
  return address.length >= 5 && address.length <= 200;
};

// O'quvchi ma'lumotlarini tekshirish
export const validateStudentData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!isValidName(data.fullName)) {
    errors.push('Ism 2-100 belgi oralig\'ida bo\'lishi kerak');
  }
  
  if (!isValidPhoneNumber(data.parentPhone)) {
    errors.push('Noto\'g\'ri telefon raqami formati');
  }
  
  if (data.studentPhone && !isValidPhoneNumber(data.studentPhone)) {
    errors.push('Noto\'g\'ri o\'quvchi telefon raqami formati');
  }
  
  if (!isValidAddress(data.address)) {
    errors.push('Manzil 5-200 belgi oralig\'ida bo\'lishi kerak');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Oylik nomini olish
export const getMonthName = (month: string, ctx: any): string => {
  const language = getLanguage(ctx);
  const months = {
    uz: [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ],
    ru: [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    en: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
  };
  
  const monthIndex = parseInt(month.split('-')[1]) - 1;
  return months[language]?.[monthIndex] || month;
};

// Format qilingan sana
export const formatDate = (date: string, ctx: any): string => {
  setMomentLocale(ctx);
  return moment(date).format('DD.MM.YYYY');
};

// Format qilingan vaqt
export const formatDateTime = (date: string, ctx: any): string => {
  setMomentLocale(ctx);
  return moment(date).format('DD.MM.YYYY HH:mm');
};

// Joriy oyni olish
export const getCurrentMonth = (): string => {
  return moment().format('YYYY-MM');
};

// O'quvchi reytingini hisoblash
export const calculateStudentRating = async (studentId: string): Promise<number> => {
  const attendances = await Attendance.find({ userId: studentId });
  const homeworks = await Homework.find({ studentId: studentId, checked: true });
  
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;
  const totalClasses = attendances.length;
  
  const avgScore = homeworks.length > 0 
    ? homeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / homeworks.length 
    : 0;
  
  const attendanceRate = totalClasses > 0 ? (presentCount + lateCount * 0.7) / totalClasses : 0;
  const rating = (attendanceRate * 70) + (avgScore * 6);
  
  return Math.round(rating * 100) / 100;
};

// To'lov holatini tekshirish
export const checkPaymentStatus = async (userId: string, month?: string): Promise<{ paid: boolean; payment: any }> => {
  const currentMonth = month || getCurrentMonth();
  let payment = await Payment.findOne({ userId: userId, month: currentMonth });
  
  if (!payment) {
    const user = await User.findById(userId);
    if (user) {
      payment = await new Payment({ 
        userId: userId, 
        month: currentMonth, 
        amount: user.paymentAmount 
      }).save();
    }
  }
  
  return {
    paid: payment?.paid || false,
    payment: payment
  };
};

// Davomat statistikasini olish
export const getAttendanceStats = async (userId: string): Promise<{ present: number; late: number; absent: number; total: number }> => {
  const attendances = await Attendance.find({ userId: userId });
  
  return {
    present: attendances.filter(a => a.status === 'present').length,
    late: attendances.filter(a => a.status === 'late').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    total: attendances.length
  };
};

// Vazifa statistikasini olish
export const getHomeworkStats = async (studentId: string): Promise<{ total: number; checked: number; avgScore: number }> => {
  const homeworks = await Homework.find({ studentId: studentId });
  const checkedHomeworks = homeworks.filter(hw => hw.checked);
  const avgScore = checkedHomeworks.length > 0 
    ? checkedHomeworks.reduce((sum, hw) => sum + (hw.score || 0), 0) / checkedHomeworks.length 
    : 0;
  
  return {
    total: homeworks.length,
    checked: checkedHomeworks.length,
    avgScore: Math.round(avgScore * 100) / 100
  };
};

// Import qilinadigan modullar (agar kerak bo'lsa)
import { Attendance, Payment, Homework } from '../config/database';