module.exports = {
  apps: [{
    name: "bml-crm",
    script: "server.cjs",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      API_KEY: process.env.API_KEY || "bml2026dev",
      DATA_DIR: "/opt/bml-crm/data",
      SMTP_HOST: "smtp.yandex.ru",
      SMTP_PORT: 465,
      SMTP_USER: process.env.SMTP_USER || "dorofeev@bml-dv.com",
      SMTP_PASS: process.env.SMTP_PASS || "",
      FROM_NAME: "Dorofeev Vitaliy / BML DV",
      FROM_EMAIL: "dorofeev@bml-dv.com",
      LOGO_URL: "http://80.71.159.26/logo.png",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    },
  }],
};
