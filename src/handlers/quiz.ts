// src/handlers/quiz.ts

import { Markup } from 'telegraf';
import { safeAnswerCbQuery } from '../utils/helpers';
import { User } from '../config/database'; // <--- BU QATORNI QO'SHING!!!

export const startMultiplicationQuiz = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  try {
    const user = await User.findOne({ telegramId: ctx.from.id }); // <--- TO'G'RI
    if (!user || user.role !== 'student') {
      return ctx.reply("Bu funksiya faqat o'quvchilar uchun mavjud!");
    }

    ctx.session.quiz = {
      correct: 0,
      total: 0,
      range: 10,
    };

    await sendNextQuestion(ctx);
  } catch (error) {
    console.error('Quiz boshlashda xato:', error);
    await ctx.reply("Xatolik yuz berdi. Qayta urinib ko'ring.");
  }
};

const sendNextQuestion = async (ctx: any) => {
  const quiz = ctx.session.quiz;
  if (!quiz) return;

  // Agar 15 ta savol tugasa – yakunlash
  if (quiz.total >= 15) {
    return finishQuiz(ctx);
  }

  const a = Math.floor(Math.random() * quiz.range) + 1;
  const b = Math.floor(Math.random() * quiz.range) + 1;
  const correctAnswer = a * b;

  // Sessiyaga saqlaymiz – keyin javob tekshirish uchun
  quiz.currentA = a;
  quiz.currentB = b;
  quiz.correctAnswer = correctAnswer;

  // 4 ta javob varianti (1 to'g'ri + 3 noto'g'ri)
  const options = [correctAnswer];
  while (options.length < 4) {
    const wrong = correctAnswer + Math.floor(Math.random() * 30) - 15;
    if (wrong > 0 && !options.includes(wrong)) {
      options.push(wrong);
    }
  }
  // Aralashtirish
  options.sort(() => Math.random() - 0.5);

  const buttons = options.map(opt =>
    [Markup.button.callback(String(opt), `quiz_ans_${opt}`)]
  );

  // To'xtatish tugmasi
  buttons.push([Markup.button.callback("To'xtatish", "quiz_stop")]);

  await ctx.reply(
    `*Karra jadvali o'rganish*\n\n` +
    `Savol ${quiz.total + 1} / 15\n\n` +
    `*${a} × ${b} = ?*`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
    }
  );
};

export const handleQuizAnswer = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);

  const quiz = ctx.session.quiz;
  if (!quiz) return;

  const userAnswer = parseInt(ctx.match[1]);
  const isCorrect = userAnswer === quiz.correctAnswer;

  quiz.total++;
  if (isCorrect) quiz.correct++;

  // Darhol javob
  if (isCorrect) {
    await ctx.answerCbQuery("To'g'ri!");
  } else {
    await ctx.answerCbQuery(`Xato! To'g'ri javob: ${quiz.correctAnswer}`);
  }

  // Keyingi savol yoki yakunlash
  if (quiz.total >= 15) {
    await finishQuiz(ctx);
  } else {
    await sendNextQuestion(ctx);
  }
};

export const stopQuiz = async (ctx: any) => {
  await safeAnswerCbQuery(ctx);
  await finishQuiz(ctx, true);
};

const finishQuiz = async (ctx: any, manuallyStopped = false) => {
  const quiz = ctx.session.quiz;
  if (!quiz) return;

  const percent = quiz.total > 0 ? Math.round((quiz.correct / quiz.total) * 100) : 0;

  let comment = "";
  if (percent >= 95) comment = "A'lo darajada!";
  else if (percent >= 85) comment = "Juda zo'r!";
  else if (percent >= 70) comment = "Yaxshi!";
  else if (percent >= 50) comment = "Yana mashq qilamiz";
  else comment = "Ko'proq o'rganamiz!";

  const title = manuallyStopped ? "*Quiz to'xtatildi*" : "*Quiz tugadi!*";

  await ctx.reply(
    `${title}\n\n` +
    `*Natija: ${quiz.correct}/${quiz.total}*  (${percent}%)\n\n` +
    `${comment}`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("Yana o'ynash", "multiplication_quiz")],
        [Markup.button.callback("Asosiy menyu", "back_to_menu")],
      ]).reply_markup,
    }
  );

  // Sessiyani tozalash
  delete ctx.session.quiz;
};