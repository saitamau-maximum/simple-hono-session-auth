const { html } = require("hono/html");

const HTML = (title, body) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <title>${title}</title>
    </head>
    <body>
      ${body}
    </body>
  </html>
`;

const TOP_PAGE_TEMPLATE = html`
  <h1>認証実装サンプルサイト</h1>
  <a href="/signup">登録</a>
  <a href="/login">ログイン</a>
`;

const LOGIN_PAGE_TEMPLATE = html`
  <h1>ログイン</h1>
  <form action="/login" method="post">
    <input type="text" name="email" placeholder="メールアドレス" />
    <input type="password" name="password" placeholder="パスワード" />
    <button type="submit">ログイン</button>
  </form>
`;

const SIGNUP_PAGE_TEMPLATE = (message) => html`
  <h1>登録</h1>
  <p>${message}</p>
  <form action="/signup" method="post">
    <input type="text" name="email" placeholder="メールアドレス" />
    <input type="password" name="password" placeholder="パスワード" />
    <button type="submit">登録</button>
  </form>
`;

const PROFILE_PAGE_TEMPLATE = (email) => html`
  <h1>ようこそ、${email}さん</h1>
  <a href="/logout">ログアウト</a>
`;

const LOGIN_ERROR_PAGE_TEMPLATE = html`
  <h1>このページにアクセスするにはログインが必要です</h1>
  <a href="/login">ログイン</a>
`;

module.exports = {
  HTML,
  TOP_PAGE_TEMPLATE,
  LOGIN_PAGE_TEMPLATE,
  SIGNUP_PAGE_TEMPLATE,
  PROFILE_PAGE_TEMPLATE,
  LOGIN_ERROR_PAGE_TEMPLATE,
};
