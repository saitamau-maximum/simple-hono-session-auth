const Users = {
  createTable: `
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          hashed_password TEXT NOT NULL
      );
  `, // セキュリティ上パスワードはハッシュ化して保存する。emailはユニーク制約をつけて
  create: `INSERT INTO users (email, hashed_password) VALUES (?, ?);`,
  findByID: `SELECT * FROM users WHERE id = ?;`,
};

module.exports = {
  Users,
};
