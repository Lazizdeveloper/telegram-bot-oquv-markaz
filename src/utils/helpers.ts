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
      'payment_rejected': '❌ *To\'lov rad etildi!*\n\nOy: *{month}*\nSumma: *{amount} so\'m*\n\nSabab: Noto\'g\'ri chek yoki ma\'lumotlar'
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
      'payment_rejected': '❌ *Оплата отклонена!*\n\nМесяц: *{month}*\nСумма: *{amount} сум*\n\nПричина: Неверный чек или информация'
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
      'payment_rejected': '❌ *Payment rejected!*\n\nMonth: *{month}*\nAmount: *{amount} UZS*\n\nReason: Incorrect receipt or information'
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