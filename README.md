# Sara_Mara_Bot
Discord Bot

This <b>README</b> file will guide you through installing the necessary packages and dependencies, so you can successfully run the index.js file and operate your Bot on your Discord Server.
<p></p>

1. If you don't have the Node.js installed on your computer, then download and install Node.js.
   => Download Node.js from the official website:
   
       https://nodejs.org/

   To check if Node is installed, run in terminal:

        node --version


   <p></p>
   <p></p>
   <p></p>
   <p></p>
   <p></p>
2. If you don't have Python installed on your computer, then install Python (Required for yt-dlp) - yt-dlp requires Python to work.
   => Download Python from the official website:
   
        https://www.python.org/downloads/

    To check if Python is installed, run in terminal:

        python --version


      
3. Download and Install FFmpeg (Required for Audio Processing):

   3.1) Download FFmpeg from:
   
       https://ffmpeg.org/download.html
   
   => Choose Windows > Windows Builds.
   => Click on the latest release, then download the "full" build.
   => Extract the ZIP file to C:\ffmpeg.
   
    To check if FFmpeg is installed, run in terminal:

        ffmpeg -version
   
   3.2) Add FFmpeg to your system’s PATH:

   => Open Start → Search for "Edit the system environment variables".
   => Click Environment Variables.
   => Under System Variables, find Path → Click Edit.
   => Click New, then add:

        C:\ffmpeg\bin

   => Click OK to save and close.



   4. Install Git (Required for yt-dlp).
      => Download Git from the official website:

              https://git-scm.com/downloads
      
      => Install Git
      => After Git installation to check if Git is properly installed, run in terminal:
      
          git --version



    5. Install Dependencies for the Bot:
  
       5.1) Open Command Prompt (cmd) and navigate to the bot folder:

           cd C:\path\to\your\bot\folder

       5.2) While in Bot directory, in terminal, run the following command to initialize a Node.js project:

           npm init -y

       5.3) While in Bot directory, in terminal, install the required libraries:

           npm install discord.js @discordjs/voice yt-dlp ffmpeg-static child_process @discordjs/builders


       Explanation:
           
            discord.js → Controls the Discord bot
            @discordjs/voice → Handles voice channels
            yt-dlp → Fetches YouTube video/audio links
            ffmpeg-static → Processes audio streams
            child_process → Runs commands in the background
            @discordjs/builders → Supports /play and other slash commands




     6. Make sure you have in the js code the correct Bot Token:

        => open your js file and find the following variable:

            const token = 'YOUR_BOT_TOKEN_HERE';

        => change the value with your actual Bot token value




        7. Run the Bot in Terminal:
       
           8.1 Navigate in terminal to your Bot directory:

               cd C:\path\to\your\bot\folder

           7.2 While in terminal run the node file:

               node index.js
           
            OR if you used another naming:
           
               node yourBotFileName.js
  


          8. Invite your Bot to your Discord Server and give it the right permissions:
       
             8.1 Go to Discord Developer Portal
             
             8.2 Select your Bot application
             
             8.3 Go to the OAuth2 tab → URL Generator
             
             8.4 Select bot and applications.commands
             
             8.5 Under Bot Permissions, check the following boxes:
       
                    View Channels
                    Read Messages
                    Send Messages
                    Connect
                    Speak

             OR ALTERNATIVELY ON THE BOT PERMISSIONS TAB CHECK THE FOLLOWING TAB:

                     Administrator
             
               8.6 Copy the generated URL and paste it into your browser.
             
               8.7 Select your server and invite the bot.




             9. Once your Bot is online, test it:

                Join a voice channel and type in your server chat:

                     /play songNameOrURL
                
                The bot should start playing music!

      
