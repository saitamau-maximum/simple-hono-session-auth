const { serve } = require("@hono/node-server");
const { Hono } = require("hono");
const templates = require("./templates");
const { csrf } = require("hono/csrf");
const app = new Hono();

app.use(csrf()); // セキュリティとしてCSRF対策が必要なので追加

app.get("/", (c) => {
  const response = templates.HTML("Top Page", templates.TOP_PAGE_TEMPLATE);
  return c.html(response);
});

app.get("/login", (c) => {
  const response = templates.HTML("Login", templates.LOGIN_PAGE_TEMPLATE);
  return c.html(response);
});

app.get("/signup", (c) => {
  const response = templates.HTML("Signup", templates.SIGNUP_PAGE_TEMPLATE);
  return c.html(response);
});

app.get("/my-profile", (c) => {
  // ログインしないとアクセスできないページにする
  const response = templates.HTML(
    "User Page",
    templates.PROFILE_PAGE_TEMPLATE("TODO ここにemailを入れる")
  );
  return c.html(response);
});

serve(app);

process.stdin.on("data", (data) => {
  if (data.toString().trim() === "q") {
    db.close();
    process.exit();
  }
});
