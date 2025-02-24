const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  NoSubscriberBehavior 
} = require('@discordjs/voice');
const { exec } = require('child_process');
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes 
} = require('discord.js');
const fetch = require('node-fetch');

// Initialize the Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const token = 'MTM0MzY1MTA5NzQxOTQ0ODM3MA.Gpo6HS.JzhFVL2a-oEBlJy_8krwbI8y6s9XkHBwr-RkbA'; // Replace with your bot token
const clientId = '1343651097419448370'; // Replace with your application ID

// Map to store the queue of songs for each guild
const queue = new Map();

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option => 
      option.setName('song')
        .setDescription('The song URL or search term')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
  new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay feature')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable autoplay')
        .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Function to get the stream URL using yt-dlp
async function getStreamUrl(songUrl) {
  return new Promise((resolve, reject) => {
    exec(`yt-dlp -f bestaudio --get-url "${songUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject('Failed to fetch stream URL');
      }
      if (stderr && stderr.trim() !== '') {
        console.error(`stderr: ${stderr}`);
      }
      resolve(stdout.trim());
    });
  });
}

// Function to get song title and video ID using yt-dlp
async function getSongInfo(songUrl) {
  return new Promise((resolve, reject) => {
    // Get title and video ID
    exec(`yt-dlp --get-title --get-id "${songUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject('Failed to fetch song info');
      }
      
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const title = lines[0];
        const videoId = lines[1];
        resolve({ title, videoId });
      } else {
        reject('Invalid response format');
      }
    });
  });
}

// Function to get YouTube's next recommended video
async function getNextRecommendedVideo(videoId) {
  try {
    // Use yt-dlp to get the next recommended video
    return new Promise((resolve, reject) => {
      exec(`yt-dlp --flat-playlist --dump-single-json https://www.youtube.com/watch?v=${videoId}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject('Failed to fetch recommendations');
        }
        
        try {
          const data = JSON.parse(stdout);
          if (data.entries && data.entries.length > 0) {
            // Get first recommended video from the related videos section
            const nextVideo = data.entries[0];
            resolve({
              title: nextVideo.title,
              url: `https://www.youtube.com/watch?v=${nextVideo.id}`
            });
          } else {
            // Alternative approach using related videos section
            if (data.related_videos && data.related_videos.length > 0) {
              const nextVideo = data.related_videos[0];
              resolve({
                title: nextVideo.title,
                url: `https://www.youtube.com/watch?v=${nextVideo.id}`
              });
            } else {
              reject('No recommended videos found');
            }
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
          reject('Failed to parse recommendations');
        }
      });
    });
  } catch (error) {
    console.error('Error getting next recommended video:', error);
    throw new Error('Failed to get next video recommendation');
  }
}

// Function to handle joining the voice channel
function joinVoiceChannelAndPlay(guild, channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, async () => {
    const serverQueue = queue.get(guild.id);
    if (serverQueue) {
      // Store the current song's videoId before removing it
      const currentSong = serverQueue.songs.shift();
      
      if (serverQueue.songs.length > 0) {
        // Play the next song in queue if available
        playNextSong(guild);
      } else if (serverQueue.autoplay && currentSong && currentSong.videoId) {
        try {
          // Get and play the next recommended song from YouTube
          const nextSong = await getNextRecommendedVideo(currentSong.videoId);
          
          if (nextSong) {
            // Get full song info
            const songInfo = await getSongInfo(nextSong.url);
            
            // Add the recommended song to the queue
            serverQueue.songs.push({
              title: nextSong.title,
              url: nextSong.url,
              videoId: songInfo.videoId
            });
            
            // Notify channel
            serverQueue.textChannel.send(`▶️ Autoplay: Now playing next recommended song: **${nextSong.title}**`);
            
            // Play the song
            playNextSong(guild);
          }
        } catch (error) {
          console.error('Autoplay error:', error);
          serverQueue.textChannel.send('❌ Failed to find the next recommended song. Autoplay stopped.');
        }
      }
    }
  });

  return { connection, player };
}

// Function to play the next song in the queue
async function playNextSong(guild) {
  const serverQueue = queue.get(guild.id);
  if (!serverQueue || serverQueue.songs.length === 0) {
    return;
  }

  const song = serverQueue.songs[0];
  
  try {
    const streamUrl = await getStreamUrl(song.url);
    console.log(`Now playing: ${song.title}, Stream URL: ${streamUrl}`);
    
    const resource = createAudioResource(streamUrl);
    serverQueue.player.play(resource);
    
    // Log the player state
    console.log(`Player state: ${serverQueue.player.state.status}`);
    
    // Update current song title in the channel
    serverQueue.textChannel.send(`🎵 Now playing: **${song.title}**`);
    
  } catch (error) {
    console.error('Error while playing the song:', error);
    serverQueue.textChannel.send(`❌ Error playing: ${song.title}`);
    
    // Try the next song
    serverQueue.songs.shift();
    if (serverQueue.songs.length > 0) {
      playNextSong(guild);
    }
  }
}

// Slash Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'play') {
    const songQuery = interaction.options.getString('song');
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
      return interaction.reply({ 
        content: 'You need to join a voice channel first!', 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();
      
      const voiceChannel = interaction.member.voice.channel;
      
      // Initialize server queue if it doesn't exist
      if (!queue.has(interaction.guildId)) {
        const queueConstruct = {
          textChannel: interaction.channel,
          voiceChannel: voiceChannel,
          connection: null,
          player: null,
          songs: [],
          autoplay: true, // Enable autoplay by default
        };
        
        queue.set(interaction.guildId, queueConstruct);
        
        // Set up voice connection and player
        const { connection, player } = joinVoiceChannelAndPlay(
          interaction.guild, 
          voiceChannel
        );
        
        queueConstruct.connection = connection;
        queueConstruct.player = player;
      }
      
      const serverQueue = queue.get(interaction.guildId);
      
      // Prepare song URL (direct link or search)
      const isSongUrl = songQuery.includes('youtube.com') || songQuery.includes('youtu.be');
      const searchUrl = isSongUrl ? songQuery : `ytsearch:${songQuery}`;
      
      try {
        // Get song info
        const songInfo = await getSongInfo(searchUrl);
        
        // Add song to queue
        const song = {
          title: songInfo.title,
          url: isSongUrl ? songQuery : `https://www.youtube.com/watch?v=${songInfo.videoId}`,
          videoId: songInfo.videoId
        };
        
        serverQueue.songs.push(song);
        
        // If this is the first song, start playing
        if (serverQueue.songs.length === 1) {
          await playNextSong(interaction.guild);
          await interaction.editReply(`▶️ Now playing: **${song.title}**`);
        } else {
          await interaction.editReply(`🎵 Added to queue: **${song.title}**`);
        }
      } catch (error) {
        console.error('Error getting song info:', error);
        await interaction.editReply('❌ Error: Could not find or process that song.');
      }
      
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ There was an error processing your command!');
    }
  } else if (commandName === 'skip') {
    const serverQueue = queue.get(interaction.guildId);
    
    if (!serverQueue) {
      return interaction.reply('❌ There is no song playing!');
    }
    
    if (!interaction.member.voice.channel) {
      return interaction.reply('❌ You need to be in a voice channel to skip songs!');
    }
    
    if (serverQueue.songs.length <= 1 && !serverQueue.autoplay) {
      return interaction.reply('❌ There are no more songs in the queue and autoplay is disabled!');
    }
    
    // Skip the current song by making the player idle
    serverQueue.player.stop();
    return interaction.reply('⏭️ Skipped to the next song!');
    
  } else if (commandName === 'autoplay') {
    const enabled = interaction.options.getBoolean('enabled');
    const serverQueue = queue.get(interaction.guildId);
    
    if (!serverQueue) {
      return interaction.reply('❌ Music playback has not been started yet!');
    }
    
    serverQueue.autoplay = enabled;
    
    if (enabled) {
      return interaction.reply('🔄 Autoplay has been enabled! The bot will play recommended songs when the queue ends.');
    } else {
      return interaction.reply('⏹️ Autoplay has been disabled! The bot will stop when the queue ends.');
    }
  }
});

client.on('ready', () => {
  console.log(`Bot is online as ${client.user.tag}!`);
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(token);