// 結構化 log：一行一個 JSON,寫 stdout。不寫 secret/token/payload 明文,只寫欄位名與長度/雜湊等安全摘要。
function emit(level, msg, fields) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields || {}),
  };
  // 錯誤走 stderr,其餘走 stdout — 方便 Railway/一般 log 收集器分流。
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  info: (msg, fields) => emit("info", msg, fields),
  warn: (msg, fields) => emit("warn", msg, fields),
  error: (msg, fields) => emit("error", msg, fields),
};
