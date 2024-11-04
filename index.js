const sqlite3 = require("sqlite3").verbose();
const queries = require("./queries");
const { serve } = require("@hono/node-server");
const { Hono } = require("hono");
const templates = require("./templates");
const { csrf } = require("hono/csrf");
const { setCookie, getCookie, deleteCookie } = require("hono/cookie");
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("database.db");

db.serialize(() => {
  db.run(queries.Users.createTable);
});

const app = new Hono();

app.use(csrf()); // セキュリティとしてCSRF対策が必要なので追加

const sessionMap = new Map(); // セッションIDとユーザIDを紐付けるためのMap (本来はKVストアなどを使うが、今回はMapで十分だと思う)

app.get("/", (c) => {
  const response = templates.HTML("Top Page", templates.TOP_PAGE_TEMPLATE);
  return c.html(response);
});

app.get("/login", (c) => {
  const response = templates.HTML("Login", templates.LOGIN_PAGE_TEMPLATE);
  return c.html(response);
});

app.get("/signup", (c) => {
  const message = getCookie(c, "message");
  const response = templates.HTML(
    "Signup",
    templates.SIGNUP_PAGE_TEMPLATE(message)
  );
  return c.html(response);
});

app.post("/signup", async (c) => {
  const { email, password } = await c.req.parseBody();
  if (!email || !password) {
    // エラーをクッキーに保存してリダイレクトさせることで、登録画面にエラーメッセージを表示する
    setCookie(c, "message", "メールアドレスとパスワードを入力してください", {
      expires: new Date(Date.now() + 1000 * 60), // 1分後に削除
    });
    return c.redirect("/signup");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化
    // INSERT時のlastIDを取得するために、プリペアドステートメントを使う
    const stmt = db.prepare(queries.Users.create);
    const createdUserId = await new Promise((resolve, reject) => {
      stmt.run([email, hashedPassword], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
    deleteCookie(c, "message"); // エラーメッセージがあれば削除
    const sessionID = Math.random().toString(36).slice(-8); // セッションIDを生成
    sessionMap.set(sessionID, createdUserId); // セッションIDとユーザIDを紐付ける
    setCookie(c, "sessionID", sessionID, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1週間後に削除
      httpOnly: true, // クライアント側からアクセスできないようにする
      SameSite: "Strict", // クロスサイトリクエストを防ぐ
    });
    return c.redirect("/my-profile");
  } catch (err) {
    setCookie(c, "message", "すでに登録されているメールアドレスです", {
      expires: new Date(Date.now() + 1000 * 60), // 1分後に削除
    });
    return c.redirect("/signup");
  }
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
