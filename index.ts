import axios from "axios";
import { sleep } from "bun";
import * as fs from "fs"

// Discord Token
const TOKEN = ""

interface Guild {
  id: string
  name: string
}

function readFile(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync(filePath, { encoding: "utf-8" }).trim()
      const filterLines = data.split("\n").filter(line => line.length > 0)
      const lines = filterLines.map(line => line.trim())
      if (lines.length < 1) {
        reject("ERROR: The file is empty")
      } else {
        resolve(lines)
      }
    } catch (e) {
      const err = e as Error
      reject(err.message)
    }
  })
}

function getGuilds(TOKEN: string): Promise<Guild[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const wlGuilds = await readFile("wl_guilds.txt")
      const res = await axios<Guild[]>({
        method: "GET",
        url: "https://discord.com/api/v9/users/@me/guilds",
        headers: {
          "Content-Type": "application/json",
          "Authorization": TOKEN
        }
      })
      const { data, status } = res

      if (status !== 200) {
        return reject(`ERROR: get status ${status}`)
      }

      const filteredData = data.map(({ id, name }) => ({ id, name }))
      const guilds = filteredData.filter(guild => !wlGuilds.includes(guild.id))
      return resolve(guilds)
    } catch (e) {
      const err = e as Error
      return reject(err.message)
    }
  })
}

async function leaveGuild(guild_id: string, guild_name: string, TOKEN: string): Promise<void> {
  const maxRetries = 5
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const res = await axios({
        method: "DELETE",
        url: `https://discord.com/api/v9/users/@me/guilds/${guild_id}`,
        headers: {
          "Authorization": TOKEN
        }
      })

      if (res.status === 204) {
        return console.log(`Bye ${guild_name}`)
      } else {
        console.error(`ERROR: Get status ${res.status}`)
      }
    } catch (e) {
      const err = e as Error
      attempt++
      console.error(`Attempt ${attempt} failed: ${err.message}`)
      if (attempt >= maxRetries) {
        console.error(`Failed to leave guild after ${maxRetries} attempts.`)
      }
      await sleep(2500)
    }
  }
}

try {
  const guilds = await getGuilds(TOKEN)
  for (const guild of guilds) {
    await leaveGuild(guild.id, guild.name, TOKEN)
    await sleep(1000)
  }
} catch (e) {
  const err = e as Error
  console.error(err)
}
