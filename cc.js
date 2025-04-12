import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';
import { distance } from 'fastest-levenshtein';

const play = async (m, gss) => {
  const prefix = config.PREFIX;
  const body = m.body.toLowerCase();
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0] : "";
  const args = body.slice(prefix.length + cmd.length).trim().split(" ");

  if (cmd === "cc") {  // Changed from "play" to "cc"
    if (!args.length) return m.reply("🎵 *Please provide a song name* 🎵");

    const searchQuery = args.join(" ");
    await m.reply("🔍 *Correcting spelling and searching...* ✨");

    try {
      // Search with more results for better correction
      const searchResults = await yts({ query: searchQuery, pages: 2 });
      
      if (!searchResults.videos.length) {
        return m.reply(`❌ *No results found for* "${searchQuery}"`);
      }

      // Find best match using advanced correction
      const bestMatch = searchResults.videos.reduce((best, video) => {
        const titleWords = video.title.toLowerCase().split(/\s+/);
        const queryWords = searchQuery.toLowerCase().split(/\s+/);
        
        // Calculate match score
        let score = 0;
        queryWords.forEach(qWord => {
          titleWords.forEach(tWord => {
            score += Math.max(
              5 - distance(qWord, tWord),  // Closer words get higher score
              0
            );
          });
        });
        
        return score > best.score ? { video, score } : best;
      }, { video: searchResults.videos[0], score: 0 });

      const { video } = bestMatch;
      
      // Send song info with thumbnail
      await gss.sendMessage(
        m.from,
        { 
          image: { url: video.thumbnail },
          caption: `🎵 *Corrected to:* ${video.title}\n🎤 Artist: ${video.author.name}\n⏱ Duration: ${video.timestamp}`
        },
        { quoted: m }
      );

      // Get audio from best API
      const audioUrl = await getBestAudioUrl(video.url);
      
      if (!audioUrl) {
        return m.reply("❌ *Couldn't fetch audio.* Try another song");
      }

      // Send audio file
      await gss.sendMessage(
        m.from,
        {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
          ptt: false
        },
        { quoted: m }
      );

      return m.reply(`✅ *Playing:* ${video.title}`);

    } catch (error) {
      console.error("CC Error:", error);
      return m.reply("❌ *Error processing request.* Try again later");
    }
  }
};

async function getBestAudioUrl(videoUrl) {
  const apis = [
    {
      name: "API-1",
      url: `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
      parser: (data) => data?.success ? data.result.download_url : null
    },
    {
      name: "API-2",
      url: `https://api.akuari.my.id/downloader/youtube3?link=${encodeURIComponent(videoUrl)}`,
      parser: (data) => data?.respon?.audio || null
    }
  ];

  for (const api of apis) {
    try {
      const { data } = await axios.get(api.url, { timeout: 15000 });
      const url = api.parser(data);
      if (url) return url;
    } catch (e) {
      continue;
    }
  }
  return null;
}

export default play;
