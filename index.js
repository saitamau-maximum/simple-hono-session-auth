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

app.get("/logout", (c) => {
  const sessionID = getCookie(c, "sessionID");
  sessionMap.delete(sessionID); // セッションIDを削除
  deleteCookie(c, "sessionID"); // クッキーを削除
  return c.redirect("/");
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.parseBody();
  if (!email || !password) {
    return c.redirect("/login");
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(queries.Users.findByEmail, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    if (!user) {
      return c.redirect("/login");
    }
    // パスワードの比較はbcrypt.compareを使う
    const isValidPassword = await bcrypt.compare(
      password,
      user.hashed_password
    );
    // パスワードが一致しない場合はログインページにリダイレクト
    if (!isValidPassword) {
      return c.redirect("/login");
    }
    const sessionID = Math.random().toString(36).slice(-8); // セッションIDを生成
    sessionMap.set(sessionID, user.id); // セッションIDとユーザIDを紐付ける
    setCookie(c, "sessionID", sessionID, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1週間後に削除
      httpOnly: true, // クライアント側からアクセスできないようにする
      SameSite: "Strict", // クロスサイトリクエストを防ぐ
    });
    return c.redirect("/my-profile");
  } catch (err) {
    return c.redirect("/login");
  }
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

app.get("/my-profile", async (c) => {
  const sessionID = getCookie(c, "sessionID");
  const userID = sessionMap.get(sessionID);
  if (!userID) {
    return c.html(templates.LOGIN_ERROR_PAGE_TEMPLATE); // ログインしていない場合はエラーページを表示
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(queries.Users.findByID, [userID], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    return c.html(templates.PROFILE_PAGE_TEMPLATE(user.email));
  } catch (err) {
    // ここは本来到達しないはずだが、万が一エラーが発生した場合はエラーページを表示
    return c.html(templates.LOGIN_ERROR_PAGE_TEMPLATE);
  }
});

serve(app);

process.stdin.on("data", (data) => {
  if (data.toString().trim() === "q") {
    db.close();
    process.exit();
  }
});
