// ---------------- PO PARSER ----------------
export function parsePO(text) {
  const lines = text.split("\n");
  const dict = {};
  let msgid = null;
  let msgstr = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("msgid")) {
      const match = line.match(/msgid\s+"(.*)"/);
      msgid = match ? match[1] : "";
    } else if (line.startsWith("msgstr")) {
      const match = line.match(/msgstr\s+"(.*)"/);
      msgstr = match ? match[1] : "";
      if (msgid !== null) {
        dict[msgid] = msgstr;
        msgid = null;
        msgstr = null;
      }
    }
  }
  return dict;
}
