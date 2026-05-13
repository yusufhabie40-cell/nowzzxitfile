const {
default: makeWASocket,
DisconnectReason,
useMultiFileAuthState
} = require("@whiskeysockets/baileys")

const P = require("pino")

const badword = ["anj", "kontol", "memek"]
const antispam = {}

async function startBot() {

const { state, saveCreds } =
await useMultiFileAuthState("./session")

const sock = makeWASocket({
logger: P({ level: "silent" }),
auth: state,
printQRInTerminal: true
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async(update) => {

const { connection, lastDisconnect } = update

if(connection === "close") {

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode
!== DisconnectReason.loggedOut

if(shouldReconnect) {
startBot()
}

}

if(connection === "open") {
console.log("BOT CONNECTED")
}

})

sock.ev.on("group-participants.update", async(data) => {

for(let user of data.participants) {

if(data.action === "add") {

await sock.sendMessage(data.id, {
text:
`Halo @${user.split("@")[0]} selamat datang di grup 👋`,
mentions: [user]
})

}

if(data.action === "remove") {

await sock.sendMessage(data.id, {
text:
`Selamat tinggal @${user.split("@")[0]} 👋`,
mentions: [user]
})

}

}

})

sock.ev.on("messages.upsert", async({ messages }) => {

const msg = messages[0]
if(!msg.message) return

const from = msg.key.remoteJid
const isGroup = from.endsWith("@g.us")

const sender =
msg.key.participant || from

const body =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

if(body.startsWith(".")) {

const command = body.slice(1).split(" ")[0]

switch(command) {

case "menu":

await sock.sendMessage(from,{
text:
`╭── BOT MENU ──⬣

• .menu
• .ping
• .owner
• .hidetag
• .close
• .open

FITUR:
✓ Anti Link
✓ Anti Spam
✓ Badword
✓ Welcome
✓ Auto Reconnect

╰────────────⬣`
})

break

case "ping":

await sock.sendMessage(from,{
text:"Bot aktif ✅"
})

break

case "owner":

await sock.sendMessage(from,{
text:"Owner Bot"
})

break

case "hidetag":

if(!isGroup) return

const metadata =
await sock.groupMetadata(from)

const members =
metadata.participants.map(v => v.id)

await sock.sendMessage(from,{
text:"Hidetag message",
mentions: members
})

break

case "close":

if(!isGroup) return

await sock.groupSettingUpdate(
from,
"announcement"
)

await sock.sendMessage(from,{
text:"Grup ditutup admin"
})

break

case "open":

if(!isGroup) return

await sock.groupSettingUpdate(
from,
"not_announcement"
)

await sock.sendMessage(from,{
text:"Grup dibuka"
})

break

}

}

if(isGroup) {

if(
body.includes("https://chat.whatsapp.com/")
||
body.includes("wa.me/")
) {

try {

await sock.sendMessage(from,{
delete: msg.key
})

await sock.sendMessage(from,{
text:
`@${sender.split("@")[0]} link terdeteksi ❌`,
mentions:[sender]
})

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
)

} catch(err) {
console.log(err)
}

}

for(let kata of badword) {

if(body.toLowerCase().includes(kata)) {

await sock.sendMessage(from,{
delete: msg.key
})

await sock.sendMessage(from,{
text:
`@${sender.split("@")[0]} badword terdeteksi`,
mentions:[sender]
})

}

}

if(!antispam[sender]) {
antispam[sender] = {
count: 1,
time: Date.now()
}
} else {

antispam[sender].count++

if(antispam[sender].count >= 5) {

await sock.sendMessage(from,{
text:
`@${sender.split("@")[0]} spam terdeteksi`,
mentions:[sender]
})

}

}

setTimeout(() => {
delete antispam[sender]
},10000)

}

})

}

startBot()
