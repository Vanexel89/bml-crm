export const KEYS = { leads: "bml-v3-leads", rates: "bml-v3-rates", proposals: "bml-v3-proposals", activities: "bml-v3-activities", touches: "bml-v3-touches", patterns: "bml-v3-patterns", freight: "bml-v3-freight", boxes: "bml-v3-boxes", drops: "bml-v3-drops", railway: "bml-v3-railway", autoMsk: "bml-v3-automsk", settings: "bml-v3-settings", customAuto: "bml-v3-customauto" };

export const STATUS = { new: { l: "Новый", c: "#6B7280", bg: "#F3F4F6" }, contact: { l: "Контакт", c: "#0F6E56", bg: "#E1F5EE" }, qualified: { l: "Квалиф.", c: "#185FA5", bg: "#E6F1FB" }, proposal_sent: { l: "КП отпр.", c: "#534AB7", bg: "#EEEDFE" }, negotiation: { l: "Перегов.", c: "#D85A30", bg: "#FAECE7" }, won: { l: "Выигран", c: "#3B6D11", bg: "#EAF3DE" }, lost: { l: "Проигран", c: "#A32D2D", bg: "#FCEBEB" }, frozen: { l: "Заморожен", c: "#888780", bg: "#F1EFE8" } };

export const GRADE = { A: { l: "A", c: "#3B6D11", bg: "#EAF3DE" }, B: { l: "B", c: "#854F0B", bg: "#FAEEDA" }, C: { l: "C", c: "#A32D2D", bg: "#FCEBEB" } };

// ─── OUTCOMES — результаты касания ───
export const OUTCOMES = {
  interested:  { l: "Заинтересован", c: "#3B6D11", bg: "#EAF3DE", icon: "✓" },
  objection:   { l: "Возражение",    c: "#854F0B", bg: "#FAEEDA", icon: "⚡" },
  callback:    { l: "Перезвонить",   c: "#185FA5", bg: "#E6F1FB", icon: "↻" },
  sent:        { l: "Отправлено",    c: "#534AB7", bg: "#EEEDFE", icon: "📨" },
  dial_fail:   { l: "Недозвон",      c: "#6B7280", bg: "#F3F4F6", icon: "📵" },
  no_answer:   { l: "Нет ответа",    c: "#888780", bg: "#F1EFE8", icon: "—" },
  rejected:    { l: "Отказ",         c: "#A32D2D", bg: "#FCEBEB", icon: "✗" },
  redirect:    { l: "Переадресация", c: "#0F6E56", bg: "#E1F5EE", icon: "↪" },
};

// ─── REJECTION REASONS — причины отказа ───
export const REJECTION_REASONS = [
  { id: "no_volume",    l: "Нет объёмов / не везут" },
  { id: "competitor",   l: "Ушли к конкуренту" },
  { id: "price",        l: "Цена не устроила" },
  { id: "no_need",      l: "Нет потребности" },
  { id: "bad_timing",   l: "Не сейчас / сезон" },
  { id: "other",        l: "Другое" },
];

// ─── OBJECTION TREE — LAER Framework (Blount) ───
// Каждое возражение: 4 шага Listen→Acknowledge→Explore→Respond
// + реакции клиента на каждом шаге → авто-следующее действие
export const OBJECTION_TREE = {
  "Нас всё устраивает": {
    category: "resistance",
    frequency: "high",
    laer: {
      listen: "Внимательно выслушай. 80% случаев = «не хочу тратить время», а не реальное счастье.",
      acknowledge: "«Отлично, рад слышать что всё работает.»",
      explore: "«Скажите, а что для вас сейчас важнее всего — цена, сроки, или предсказуемость?»",
      respond: "«Понимаю. Предлагаю одно — пришлю расчёт на ваш маршрут. Просто чтобы было с чем сравнить. Ничего менять не нужно.»",
    },
    fallback: "«Хорошо. Если что-то одно можно было бы улучшить в текущей логистике — что бы это было?»",
    nextAction: { type: "proposal", label: "Отправить расчёт для сравнения", days: 1 },
  },
  "Дорого": {
    category: "price",
    frequency: "high",
    laer: {
      listen: "Не спорь. Дорого — относительно. Узнай с чем сравнивают.",
      acknowledge: "«Понимаю, бюджет — ключевой вопрос.»",
      explore: "«С чем сравниваете? Если скинете ставку — посмотрю, может мы считаем по-разному.»",
      respond: "«Часто разница в том, что входит. У нас ставка включает [X]. Давайте сравним total cost.»",
    },
    fallback: "«Давайте так — скиньте текущую ставку, я посмотрю можем ли мы оптимизировать маршрут.»",
    nextAction: { type: "call", label: "Запросить ставку конкурента", days: 2 },
  },
  "Нет ЛПР": {
    category: "access",
    frequency: "medium",
    laer: {
      listen: "Этот человек — привратник. Не дави, а используй.",
      acknowledge: "«Конечно, понимаю что решение не за вами.»",
      explore: "«Кто у вас отвечает за логистику / закупки? Удобно будет переговорить с ним?»",
      respond: "«Я подготовлю короткий расчёт — вы сможете показать руководству. На чьё имя лучше?»",
    },
    fallback: "«Может удобнее переслать мой контакт тому кто решает? Я объясню в двух словах.»",
    nextAction: { type: "call", label: "Выйти на ЛПР", days: 2 },
  },
  "Всё хорошо": {
    category: "resistance",
    frequency: "medium",
    laer: {
      listen: "То же что «нас всё устраивает», но мягче. Клиент закрыт.",
      acknowledge: "«Рад что логистика работает без сбоев.»",
      explore: "«Если бы можно было улучшить одно — цену, сроки или сервис — что бы выбрали?»",
      respond: "«Давайте я буду запасным вариантом. Пришлю расчёт — пригодится когда текущий не потянет.»",
    },
    fallback: "«Бывает что нужен срочно запасной экспедитор. Оставлю контакт — когда будет надо, напишите.»",
    nextAction: { type: "email", label: "Отправить расчёт как запасной вариант", days: 3 },
  },
  "Балтика": {
    category: "route",
    frequency: "medium",
    laer: {
      listen: "Клиент привык к маршруту через Балтику. Не атакуй — покажи числа.",
      acknowledge: "«Через Балтику — классический маршрут, понимаю.»",
      explore: "«Сравнивали итоговую стоимость с учётом транзита? Через ДВ часто total cost ниже на 10-15%.»",
      respond: "«Давайте так — я посчитаю оба варианта на ваш маршрут. Сами сравните. Без обязательств.»",
    },
    fallback: "«Через ДВ транзит на 7-12 дней короче. Для срочных грузов это бывает критично.»",
    nextAction: { type: "proposal", label: "Сравнительный расчёт ДВ vs Балтика", days: 1 },
  },
  "CIF/CFR/DAP": {
    category: "incoterms",
    frequency: "low",
    laer: {
      listen: "Клиент работает на условиях где логистику оплачивает поставщик. Не проблема.",
      acknowledge: "«Работаем с любыми инкотермс — CIF, CFR, DAP, без ограничений.»",
      explore: "«А поставщик в Китае сам выбирает экспедитора или вы влияете на выбор?»",
      respond: "«Если влияете — могу предложить ставку для вашего поставщика. Часто бывает дешевле чем через их экспедитора.»",
    },
    fallback: "«Многие клиенты переходят на FOB и экономят 5-10%. Могу посчитать разницу.»",
    nextAction: { type: "call", label: "Уточнить кто выбирает экспедитора", days: 3 },
  },
  "Опасный груз": {
    category: "special",
    frequency: "low",
    laer: {
      listen: "Опасные грузы — специализация. Узнай класс и покажи экспертизу.",
      acknowledge: "«Есть опыт с опасными грузами, работаем регулярно.»",
      explore: "«Какой класс опасности? Упаковка сертифицирована? Нужна декларация?»",
      respond: "«Подготовлю расчёт с учётом всех доплат за ДГ. Обычно разница 10-20% от стандартного.»",
    },
    fallback: "«Для класса [X] нужен допуск линии. У нас есть — посчитаю за пару часов.»",
    nextAction: { type: "proposal", label: "Расчёт с учётом ДГ", days: 1 },
  },
  "Пришлите на почту": {
    category: "brush_off",
    frequency: "high",
    laer: {
      listen: "90% «пришлите на почту» = вежливый отказ. Не отправляй просто так.",
      acknowledge: "«Конечно, отправлю.»",
      explore: "«Чтобы прислать конкретный расчёт, а не шаблон — скажите: сколько контейнеров и какой порт?»",
      respond: "«И сразу договоримся — когда напомнить чтобы точно не потерялось? Через день или три?»",
    },
    fallback: "«Отправляю сегодня. Перезвоню послезавтра — убедиться что дошло.»",
    nextAction: { type: "proposal", label: "Отправить КП + follow-up", days: 0 },
  },
  "Работаем с другими": {
    category: "competitor",
    frequency: "high",
    laer: {
      listen: "Не атакуй конкурента. Клиент защищает своё решение.",
      acknowledge: "«Понимаю. Давно с ними работаете?»",
      explore: "«А бывает что нужен запасной вариант — на случай если что-то пойдёт не так или появится объём?»",
      respond: "«Не переубеждаю. Просто пришлю расчёт — будет с чем сравнить. Ничего менять не нужно.»",
    },
    fallback: "«Хорошо, оставлю контакт. Если когда-то понадобится срочно подстраховка — обращайтесь.»",
    nextAction: { type: "proposal", label: "Расчёт для сравнения", days: 1 },
  },
  "Другое": {
    category: "other",
    frequency: "low",
    laer: {
      listen: "Запиши возражение дословно. Это ценная информация.",
      acknowledge: "«Понимаю, спасибо что объяснили.»",
      explore: "«А что бы помогло принять решение?»",
      respond: "«Давайте я подготовлю информацию именно по этому вопросу.»",
    },
    fallback: "«Оставлю контакт — когда будет удобно, обсудим.»",
    nextAction: { type: "call", label: "Подготовить ответ", days: 3 },
  },
};

// Legacy flat format for backward compatibility
export const OBJECTION_SCRIPTS = Object.fromEntries(
  Object.entries(OBJECTION_TREE).map(([k, v]) => [k, {
    reply: v.laer.explore, tip: v.laer.respond,
  }])
);

// ─── SPIN QUESTIONS — Rackham ───
export const SPIN_QUESTIONS = {
  situation: {
    label: "S: Ситуация",
    color: "#185FA5",
    bg: "#E6F1FB",
    questions: [
      "Сколько контейнеров в месяц возите?",
      "Какой порт отгрузки в Китае?",
      "Куда доставляете — склад в Москве?",
      "Кто сейчас ваш экспедитор?",
      "Какой тип контейнеров используете (20/40)?",
      "Как давно работаете с текущим экспедитором?",
    ],
    hint: "Не более 3-4 вопросов. Больше — клиент устаёт.",
  },
  problem: {
    label: "P: Проблема",
    color: "#D85A30",
    bg: "#FAECE7",
    questions: [
      "Бывают задержки на таможне / в порту?",
      "Были случаи повреждения груза?",
      "Случалось что ставка менялась после отгрузки?",
      "Бывает что не можете дозвониться до экспедитора?",
      "Есть проблемы с документами / сертификатами?",
      "Были ситуации когда контейнер «терялся» на пути?",
    ],
    hint: "Задавай когда клиент уже ответил на ситуационные.",
  },
  implication: {
    label: "I: Последствия",
    color: "#A32D2D",
    bg: "#FCEBEB",
    questions: [
      "Во сколько обходятся простои из-за задержек?",
      "Как это влияет на ваши продажи / производство?",
      "Сколько времени тратите на контроль перевозки?",
      "Были случаи потери клиентов из-за сбоев в поставке?",
      "Какие штрафы от маркетплейсов за опоздание?",
    ],
    hint: "Усиливай боль. Клиент должен сам осознать масштаб проблемы.",
  },
  need_payoff: {
    label: "N: Выгода",
    color: "#3B6D11",
    bg: "#EAF3DE",
    questions: [
      "Если бы транзит был на 7 дней короче — как бы это помогло?",
      "Что бы значило для вас если бы ставка была зафиксирована?",
      "Если бы вы видели статус контейнера онлайн — сэкономило бы время?",
      "Если один пробный рейс без обязательств — интересно?",
    ],
    hint: "Клиент сам продаёт себе решение. Не говори «мы можем» — спрашивай «а если бы».",
  },
};

// ─── CHALLENGER INSIGHTS — инсайты для Challenger Sale ───
export const CHALLENGER_INSIGHTS = [
  { trigger: "route_baltika", insight: "Через ДВ total cost на 10-15% ниже чем через Балтику при транзите 28-32 дня. Ваш текущий маршрут проигрывает по стоимости.", when: "Клиент идёт через Балтику" },
  { trigger: "transit_speed", insight: "По ЖД через погранпереход транзит 18-22 дня vs 35-42 через Балтику. Для сезонных товаров — критичная разница.", when: "Клиент везёт сезонный товар" },
  { trigger: "rate_volatility", insight: "Ставки на Балтику подскочили на 20% за месяц. Через ДВ — стабильно. Зафиксируем ставку на неделю.", when: "Рынок нестабилен" },
  { trigger: "hidden_costs", insight: "Большинство экспедиторов не включают THC, документы и страховку. Наша ставка — всё включено. Сравните total cost.", when: "Клиент сравнивает «голые» ставки" },
  { trigger: "mp_seller", insight: "Для селлеров WB/Ozon каждый день простоя = штрафы и потеря рейтинга. Мы даём трекинг и предупреждаем о задержках за 3 дня.", when: "Клиент — селлер маркетплейса" },
  { trigger: "backup", insight: "70% компаний теряют деньги когда основной экспедитор подводит и нет запасного. Один пробный рейс — и вы защищены.", when: "Клиент доволен текущим экспедитором" },
];

// ─── TOUCHES TEMPLATE — расширенный с Challenger-подсказками ───
export const TOUCHES_TPL = [
  { n: 1, type: "call", label: "Холодный звонок", day: 0, desc: "Знакомство, потребность",
    hint: "«Добрый день, [Имя]. Мы — перевозки из Китая, море и ЖД через ДВ. Вижу что везёте [товар]? Сколько ктк/мес? Порт? Куда?»",
    challenger: "Приходи с инсайтом: «Вижу по данным что вы везёте через [порт]. У нас ставка на этот маршрут сейчас $X — это ниже рынка на 10%.»",
    spin_focus: "situation",
  },
  { n: 2, type: "proposal", label: "Отправка КП", day: 1, desc: "Актуальная ставка",
    hint: "Отправляй как «расчёт под ваш маршрут», НЕ «КП».",
    challenger: "Включи сравнение: total cost вашего маршрута vs альтернативный. Покажи экономию.",
    spin_focus: null,
  },
  { n: 3, type: "call", label: "Фоллоу-ап", day: 3, desc: "Получили? Вопросы?",
    hint: "«Отправлял расчёт — дошло? Не в спам? Как цифры?»",
    challenger: "Не спрашивай «ну как?». Спроси: «Что в расчёте оказалось неожиданным?»",
    spin_focus: "problem",
  },
  { n: 4, type: "email", label: "Email ценность", day: 7, desc: "Кейс, аналитика",
    hint: "Инфоповод: транзиты, изменения на ДВ. Не просто «ну как?»",
    challenger: "Пришли конкретный кейс: «Клиент [похожий] сэкономил X% перейдя с Балтики на ДВ».",
    spin_focus: "implication",
  },
  { n: 5, type: "proposal", label: "Новое предложение", day: 14, desc: "Обновлённая ставка",
    hint: "«Ставки меняются с [дата], зафиксирую до конца недели»",
    challenger: "Создай urgency: «Ставки вырастут с [дата]. Зафиксирую текущую на 7 дней.»",
    spin_focus: "need_payoff",
  },
  { n: 6, type: "call", label: "Финальная попытка", day: 21, desc: "Прямой вопрос",
    hint: "«Попробуем 1-2 контейнера — посмотрим как работаем?»",
    challenger: "Прямой вопрос: «Мы общаемся 3 недели. Что мешает попробовать один контейнер?»",
    spin_focus: "need_payoff",
  },
  { n: 7, type: "call", label: "Пробный рейс", day: 30, desc: "Последний шанс",
    hint: "«Общаемся месяц — актуально? Если да — пробный, если нет — не отвлекаю.»",
    challenger: "Финал: «Предлагаю пробный рейс на особых условиях. Если не понравится — без обязательств.»",
    spin_focus: null,
  },
];

// ─── REACTIVATION — касания при разморозке (вместо стандартных 7) ───
export const REACTIVATION_TPL = [
  { n: 1, type: "call", label: "Реактивация", day: 0, desc: "Новый инфоповод",
    hint: "«[Имя], мы общались месяц назад. С тех пор ставки изменились — хочу обновить расчёт. Актуально?»",
    challenger: "Приходи с конкретным изменением: «Ставка на ваш маршрут упала на $X.»",
    spin_focus: "need_payoff",
  },
  { n: 2, type: "proposal", label: "Обновлённый расчёт", day: 1, desc: "Актуальная ставка",
    hint: "Отправь обновлённый расчёт с пометкой что ставки изменились.",
    challenger: "Покажи разницу: «Было $X, стало $Y — экономия Z% на контейнер.»",
    spin_focus: null,
  },
  { n: 3, type: "call", label: "Финальный звонок", day: 7, desc: "Последняя попытка",
    hint: "«Отправлял обновлённый расчёт. Если не актуально — не беспокою. Если да — один пробный.»",
    challenger: "«За месяц что не общались — что-то изменилось в логистике?»",
    spin_focus: "problem",
  },
];

// ─── RATE CHECK — интервал автопроверки ставок (дни) ───
export const RATE_CHECK_INTERVAL_DAYS = 14;

// ─── AUTO-TASK RULES — что создаёт система после каждого outcome ───
export const AUTO_TASK_RULES = {
  interested: {
    action: "advance",
    newStatus: "negotiation",
    cancelRemaining: true,
    createTask: null, // менеджер сам ведёт переговоры
  },
  objection: {
    action: "handle_objection",
    newStatus: null, // статус не меняем
    cancelRemaining: false,
    // createTask берётся из OBJECTION_TREE[objection].nextAction
  },
  callback: {
    action: "reschedule",
    newStatus: null,
    cancelRemaining: false,
    // createTask: { type, label, days } задаётся менеджером
  },
  no_answer: {
    action: "next_touch",
    newStatus: null,
    cancelRemaining: false,
    createTask: null, // следующее касание уже есть в шаблоне
  },
  rejected: {
    action: "close",
    // newStatus задаётся в зависимости от причины: lost / frozen
    cancelRemaining: true,
  },
};

export const EMAIL_TEMPLATES = {
  no_answer: { subject: "[Товар] из Китая — расчёт", body: "[Имя], добрый день.\n\nПытался дозвониться.\nМы — перевозки Китай→Москва. Если актуально сравнить условия — расчёт за пару часов.\nЕсли нет — скажите, не беспокою." },
  followup: { subject: "Re: Расчёт → Москва", body: "[Имя], добрый день.\nОтправлял расчёт [дата] — дошло?\nЕсли интересно — обсудим." },
  infooccasion: { subject: "Ставки Китай→РФ ([месяц])", body: "[Имя], добрый день.\nАктуальные изменения:\n• Ставки: [изменение]\n• Транзит: 28-32 дня\nПланируете отгрузку — зафиксирую на неделю." },
  logistics_intro: {
    subject: "Контейнерные перевозки Китай+ЮВА",
    body: "Добрый день.\n\nМы - BML DV, дальневосточный экспедитор. Оказываем сервис по отправке контейнеров из Китая и ЮВА через порты Дальнего Востока. Полный цикл: фрахт, ЖД, авто до склада.\n\nРаботаем с большим количеством линий - подберем оптимальный вариант под ваш маршрут.\n\nЕсли актуально, пришлите запрос (порт загрузки, город назначения, тип контейнера) - рассчитаю в течение часа.\n\nБуду рад обсудить детали.",
    subject_with_routes: "Контейнерные перевозки Китай+ЮВА - [город]",
    body_with_routes: "Добрый день.\n\nМы - BML DV, дальневосточный экспедитор. Оказываем сервис по отправке контейнеров из Китая и ЮВА через порты Дальнего Востока. Полный цикл: фрахт, ЖД, авто до склада.\n\nРаботаем с большим количеством линий - подберем оптимальный вариант под ваш маршрут.\n\nНаправляю расчет по вашим направлениям:",
  },
};

export const LOGO_URL = "https://raw.githubusercontent.com/Vanexel89/bml-crm/main/static/logo.png";

export const EMAIL_SIGNATURE = `Best regards,

Dorofeev Vitaliy
Deputy Director
BM Logistics Far East Co., LTD
office 4062, 17 Butlerova st., (NEO GEO)
117342, Moscow, Russia
Tel. +7 495 568 1989
Mob. +7 915 314 7855
http://www.bml-dv.com`;

// ─── Inline Styles ───
export const C = {
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 10 },
  btn: p => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 13px", borderRadius: 8, border: p ? "none" : "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: p ? 500 : 400, background: p ? "var(--color-text-primary)" : "var(--color-background-primary)", color: p ? "var(--color-background-primary)" : "var(--color-text-primary)", transition: "all 0.1s" }),
  inp: { width: "100%", padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" },
  sel: { padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" },
  lbl: { fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3, display: "block", fontWeight: 500, letterSpacing: "0.2px" },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--color-border-tertiary)", color: "var(--color-text-tertiary)", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" },
  td: { padding: "9px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" },
  metric: { background: "var(--color-background-primary)", borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 100, border: "0.5px solid var(--color-border-tertiary)" },
  empty: { textAlign: "center", padding: "30px 20px", color: "var(--color-text-tertiary)", fontSize: 13 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  section: { fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--color-text-primary)" },
};
