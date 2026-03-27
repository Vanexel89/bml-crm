module.exports = {
  apps: [{
    name: "bml-crm",
    script: "server.cjs",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      DATA_DIR: "/opt/bml-crm/data",
      FROM_NAME: "Dorofeev Vitaliy / BML DV",
      FROM_EMAIL: "dorofeev@bml-dv.com",
      LOGO_URL: "http://80.71.159.26/logo.png",
    },
  }],
};
