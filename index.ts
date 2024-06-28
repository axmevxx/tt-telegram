import * as dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import express, { Request, Response } from "express";
import axios from "axios";
import { TTScraper } from "tiktok-scraper-ts";

process.env.NTBA_FIX_319 = "1";

const app = express();
const token = process.env.TOKEN || "token";

if (!token) {
  throw new Error("TOKEN is not defined in environment variables");
}

const bot = new TelegramBot(token, { polling: true });

async function getLongURL(src: string): Promise<string> {
  try {
    const { data } = await axios.post(
      `https://checkshorturl.com/expand.php?u=${src}`,
    );
    const startIndex = data.indexOf("p=site:") + "p=site:".length;
    const endIndex = data.indexOf("?");
    return data.slice(startIndex, endIndex);
  } catch (error) {
    console.error("Error expanding URL:", error);
    throw error;
  }
}

app.get("/", (req: Request, res: Response) => {
  res.send({ success: true });
});

const port = process.env.PORT || 779;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

bot.on("message", async (message) => {
  if (message.text) {
    try {
      let url: string;
      if (
        message.text.startsWith("https://vm.tiktok.com/") ||
        message.text.startsWith("https://www.tiktok.com/")
      ) {
        if (message.text.startsWith("https://vm.tiktok.com/")) {
          url = await getLongURL(message.text);
        } else {
          url = message.text;
        }
        const { collector } = await getVideoMeta(url);
        const videoUrl = collector[0].videoUrl;
        await bot.sendDocument(message.chat.id, videoUrl);
      } else {
        await bot.sendMessage(
          message.chat.id,
          "<b>Send link on <a href='https://www.tiktok.com/'>TikTok</a> video</b>",
          {
            parse_mode: "HTML",
          },
        );
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await bot.sendMessage(
        message.chat.id,
        "<b>Send link on <a href='https://www.tiktok.com/'>TikTok</a> video</b>",
        {
          parse_mode: "HTML",
        },
      );
    }
  } else {
    await bot.sendMessage(
      message.chat.id,
      "<b>Send link on <a href='https://www.tiktok.com/'>TikTok</a> video</b>",
      {
        parse_mode: "HTML",
      },
    );
  }
});

bot.on("inline_query", async (query) => {
  if (
    query.query &&
    (query.query.startsWith("https://vm.tiktok.com/") ||
      query.query.startsWith("https://www.tiktok.com/"))
  ) {
    try {
      let url: string;
      if (query.query.startsWith("https://vm.tiktok.com/")) {
        url = await getLongURL(query.query);
      } else {
        url = query.query;
      }
      const { collector } = await getVideoMeta(url);
      const videoUrl = collector[0].videoUrl;
      const imageUrl = collector[0].imageUrl;
      await bot.answerInlineQuery(query.id, [
        {
          id: "0",
          mime_type: "video/mp4",
          type: "video",
          title: "Video",
          description: url,
          hide_url: true,
          video_url: videoUrl,
          thumb_url: imageUrl,
        },
      ]);
    } catch (error) {
      console.error("Error handling inline query:", error);
      await bot.answerInlineQuery(query.id, [
        {
          id: "0",
          type: "article",
          title: "Video not found",
          description: "Send link on TikTok video",
          message_text: "Video not found :(\nSend link on TikTok video",
        },
      ]);
    }
  } else {
    await bot.answerInlineQuery(query.id, [
      {
        id: "0",
        type: "article",
        title: "Video not found",
        description: "Send link on TikTok video",
        message_text: "Video not found :(\nSend link on TikTok video",
      },
    ]);
  }
});

setInterval(
  () => {
    axios.get(`${process.env.HOSTING}`).catch((error) => {
      console.error("Error pinging hosting:", error);
    });
  },
  10 * 60 * 1000,
);
