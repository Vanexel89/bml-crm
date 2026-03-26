export const KEYS = { leads: "bml-v3-leads", rates: "bml-v3-rates", proposals: "bml-v3-proposals", activities: "bml-v3-activities", touches: "bml-v3-touches", patterns: "bml-v3-patterns", freight: "bml-v3-freight", boxes: "bml-v3-boxes", drops: "bml-v3-drops", railway: "bml-v3-railway", autoMsk: "bml-v3-automsk", settings: "bml-v3-settings", customAuto: "bml-v3-customauto" };

export const STATUS = { new: { l: "Новый", c: "#6B7280", bg: "#F3F4F6" }, contact: { l: "Контакт", c: "#0F6E56", bg: "#E1F5EE" }, qualified: { l: "Квалиф.", c: "#185FA5", bg: "#E6F1FB" }, proposal_sent: { l: "КП отпр.", c: "#534AB7", bg: "#EEEDFE" }, negotiation: { l: "Перегов.", c: "#D85A30", bg: "#FAECE7" }, won: { l: "Выигран", c: "#3B6D11", bg: "#EAF3DE" }, lost: { l: "Проигран", c: "#A32D2D", bg: "#FCEBEB" }, frozen: { l: "Заморожен", c: "#888780", bg: "#F1EFE8" } };

export const GRADE = { A: { l: "A", c: "#3B6D11", bg: "#EAF3DE" }, B: { l: "B", c: "#854F0B", bg: "#FAEEDA" }, C: { l: "C", c: "#A32D2D", bg: "#FCEBEB" } };

export const TOUCHES_TPL = [
  { n: 1, type: "call", label: "Холодный звонок", day: 0, desc: "Знакомство, потребность", hint: "«Добрый день, [Имя]. Мы — перевозки из Китая, море и ЖД через ДВ. Вижу что везёте [товар]? Сколько ктк/мес? Порт? Куда?»" },
  { n: 2, type: "proposal", label: "Отправка КП", day: 1, desc: "Актуальная ставка", hint: "Отправляй как «расчёт под ваш маршрут», НЕ «КП»." },
  { n: 3, type: "call", label: "Фоллоу-ап", day: 3, desc: "Получили? Вопросы?", hint: "«Отправлял расчёт — дошло? Не в спам? Как цифры?»" },
  { n: 4, type: "email", label: "Email ценность", day: 7, desc: "Кейс, аналитика", hint: "Инфоповод: транзиты, изменения на ДВ. Не просто «ну как?»" },
  { n: 5, type: "proposal", label: "Новое предложение", day: 14, desc: "Обновлённая ставка", hint: "«Ставки меняются с [дата], зафиксирую до конца недели»" },
  { n: 6, type: "call", label: "Финальная попытка", day: 21, desc: "Прямой вопрос", hint: "«Попробуем 1-2 контейнера — посмотрим как работаем?»" },
  { n: 7, type: "call", label: "Пробный рейс", day: 30, desc: "Последний шанс", hint: "«Общаемся месяц — актуально? Если да — пробный, если нет — не отвлекаю.»" },
];

export const OBJECTION_SCRIPTS = {
  "Нас всё устраивает": { reply: "«А что важнее — цена, сроки, или предсказуемость?»", tip: "80% = «не хочу тратить время». Предложи пробный рейс." },
  "Дорого": { reply: "«С чем сравниваете? Скиньте ставку — посмотрю.»", tip: "Часто дело не в цене, а в непонимании что входит." },
  "Нет ЛПР": { reply: "«Кто решает по логистике? Удобно напрямую?»", tip: "Узнай ФИО и контакт ЛПР." },
  "Всё хорошо": { reply: "«Если улучшить одно — цену, сроки или сервис — что?»", tip: "Зацепи за конкретику." },
  "Балтика": { reply: "«Сравнивали итоговую стоимость? Через ДВ часто дешевле.»", tip: "Total cost ДВ vs Балтика." },
  "CIF": { reply: "«Работаем с любыми инкотермс.»", tip: "Уточни условия." },
  "CFR": { reply: "«Работаем с любыми инкотермс.»", tip: "Уточни условия." },
  "DAP": { reply: "«Работаем с любыми инкотермс.»", tip: "Уточни условия." },
  "Опасный груз": { reply: "«Есть опыт. Какой класс?»", tip: "Уточни класс и упаковку." },
};

export const EMAIL_TEMPLATES = {
  no_answer: { subject: "[Товар] из Китая — расчёт", body: "[Имя], добрый день.\n\nПытался дозвониться.\nМы — перевозки Китай→Москва. Если актуально сравнить условия — расчёт за пару часов.\nЕсли нет — скажите, не беспокою." },
  followup: { subject: "Re: Расчёт → Москва", body: "[Имя], добрый день.\nОтправлял расчёт [дата] — дошло?\nЕсли интересно — обсудим." },
  infooccasion: { subject: "Ставки Китай→РФ ([месяц])", body: "[Имя], добрый день.\nАктуальные изменения:\n• Ставки: [изменение]\n• Транзит: 28-32 дня\nПланируете отгрузку — зафиксирую на неделю." },
};

export const LOGO_URL = "/logo.png";

export const EMAIL_SIGNATURE = `Best regards,

Dorofeev Vitaliy
Deputy Director
BML Transport & Consulting
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
