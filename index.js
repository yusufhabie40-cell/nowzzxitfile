const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const P = require('pino')

const owner = ['6280000000000']
const prefix = '.'

let antiLink = true
let welcome = true
let selfMode = false

async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState('./session')
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: 'silent' }),
auth: state,
printQRInTerminal: true
})

sock.ev.on('creds.update', saveCreds)

sock.ev.on('group-participants.update', async (anu) => {
try {
const metadata = await sock.groupMetadata(anu.id)

for (let num of anu.participants) {
if (anu.action === 'add' && welcome) {
await sock.sendMessage(anu.id, {
text: `👋 Welcome @${num.split('@')[0]}`,
mentions: [num]
})
}

if (anu.action === 'remove' && welcome) {
await sock.sendMessage(anu.id, {
text: `👋 Goodbye @${num.split('@')[0]}`,
mentions: [num]
})
}
}
} catch (err) {
console.log(err)
}
})

sock.ev.on('messages.upsert', async ({ messages }) => {
try {
const msg = messages[0]
if (!msg.message) return

const from = msg.key.remoteJid
const isGroup = from.endsWith('@g.us')
const sender = msg.key.participant || from

const body =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
''

const isOwner = owner.includes(sender.split('@')[0])

if (selfMode && !isOwner) return

const reply = (text) => {
sock.sendMessage(from, { text }, { quoted: msg })
}

// ANTILINK
if (isGroup && antiLink) {
if (body.includes('https://chat.whatsapp.com/')) {
await sock.sendMessage(from, {
delete: msg.key
})

reply('🚫 Link grup terdeteksi!')
}
}

if (!body.startsWith(prefix)) return

const command = body.slice(1).split(' ')[0].toLowerCase()
const args = body.trim().split(/ +/).slice(1)

switch(command) {

case 'menu':
reply(`
╔═══ NOWZZ BOT ═══
║ .menu
║ .ping
║ .tagall
║ .owner
║ .antilink on/off
║ .welcome on/off
║ .self
║ .public
╚═══════════════
`)
break

case 'ping':
reply('Pong 🏓')
break

case 'owner':
reply('Owner: NOWZZ')
break

case 'tagall':
if (!isGroup) return reply('Khusus grup!')

const metadata = await sock.groupMetadata(from)
let teks = '📢 TAG ALL\n\n'

let mem = metadata.participants.map(v => v.id)

for (let v of mem) {
teks += `⭔ @${v.split('@')[0]}\n`
}

sock.sendMessage(from, {
text: teks,
mentions: mem
}, { quoted: msg })
break

case 'antilink':
if (!isOwner) return reply('Owner only!')

if (args[0] === 'on') {
antiLink = true
reply('Antilink aktif')
}

if (args[0] === 'off') {
antiLink = false
reply('Antilink dimatikan')
}
break

case 'welcome':
if (!isOwner) return reply('Owner only!')

if (args[0] === 'on') {
welcome = true
reply('Welcome aktif')
}

if (args[0] === 'off') {
welcome = false
reply('Welcome dimatikan')
}
break

case 'self':
if (!isOwner) return reply('Owner only!')
selfMode = true
reply('Self mode aktif')
break

case 'public':
if (!isOwner) return reply('Owner only!')
selfMode = false
reply('Public mode aktif')
break

}
} catch (err) {
console.log(err)
}
})
}

startBot()
