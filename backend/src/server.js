require("dotenv").config();
const { app } = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: `Alera backend running on port ${PORT}`,
      timestamp: new Date().toISOString(),
    }),
  );
});

