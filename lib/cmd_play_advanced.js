var advData = {};
var footerText = "Type 'cancel' to cancel";

module.exports = (Trivia) => {
  var getConfigVal = Trivia.getConfigVal;

  function triviaPlayAdvanced(onGameStart, id, channel, author) {
    if(getConfigVal("databaseURL").startsWith("file://")) {
      Trivia.send(channel, author, "WIP - File databases are currently not supported with this command.", void 0, true);

      return; // TEMPORARY
    }


    if(typeof advData[id] === "undefined") {
      Trivia.send(channel, author, {embed: {
        color: Trivia.embedCol,
        description: "Type the category you would like to play in. Type \"random\" to play in random categories. Type \"trivia categories\" to see a list of available categories.",
        footer: { text: footerText }
      }}, void 0, true);

      advData[id] = { user: author.id, pendingCategory: true, onGameStart };
    }
  }

  async function doAdvAction(id, msg, cmd) {
    if(msg.author.id !== advData[id].user) {
      return;
    }

    var category;

    if(cmd === "CANCEL") {
      delete advData[id];
      Trivia.send(msg.channel, msg.author, "Game cancelled.", void 0, true);
      return;
    }

    if(advData[id].pendingCategory) {
      if(cmd !== "RANDOM") {
        category = await Trivia.getCategoryFromStr(cmd);

        if(typeof category === "undefined") {
          return {
            error: true,
            text: "Unable to identify the category you specified. Please try again, or type 'trivia categories' to see a list of categories."
          };
        }
        else {
          advData[id].categoryId = category.id;
        }
      }
      advData[id].pendingCategory = false;
      advData[id].pendingType = true;

      return {
        text: `What type of questions would you like to play? Type a number:
        **1**. Normal
        **2**. Multiple Choice Only
        **3**. True/False Only`
      };
    }
    else if(advData[id].pendingType) {
      if(cmd !== "1") {
        if(cmd === "2") {
          advData[id].type = "multiple";
        }
        else if(cmd === "3") {
          advData[id].type = "boolean";
        }
        else {
          return {
            error: true,
            text: "Invalid input, please try again."
          };
        }
      }

      advData[id].pendingType = false;
      advData[id].pendingDifficulty = true;

      return {
        text: `What difficulty level would you like to play? Type a number:
        **1**. Normal
        **2**. Easy Only
        **3**. Medium Only
        **4**. Hard Only`
      };
    }
    else if(advData[id].pendingDifficulty) {
      if(cmd !== "1") {
        if(cmd === "2") {
          advData[id].difficulty = "easy";
        }
        else if(cmd === "3") {
          advData[id].difficulty = "medium";
        }
        else if(cmd === "4") {
          advData[id].difficulty = "hard";
        }
        else {
          return {
            error: true,
            text: "Invalid input, please try again."
          };
        }
      }
    }

    var onGameStart = advData[id].onGameStart;
    var categoryId = advData[id].categoryId;
    var type = advData[id].type;
    var difficulty = advData[id].difficulty;

    // Need to delete the data before starting so it doesn't auto-cancel.
    delete advData[id];

    var game = await Trivia.doGame(msg.channel.id, msg.channel, msg.author, 0, categoryId, type, difficulty);
    onGameStart(game);
  }

  async function parseAdv(id, msg) {
    // Do absolutely nothing if there's no advanced game.
    // Beware that this check occurs for every message sent in each channel.
    if(!advData[id]) {
      return -1;
    }

    var cmd = msg.toString().toUpperCase();
    var prefix = getConfigVal("prefix", id).toUpperCase();

    // Ignore if the input is a command of any kind
    if(cmd.startsWith(prefix)) {
      return;
    }

    doAdvAction(id, msg, cmd)
    .catch((err) => {
      // Make sure there's actual data and this isn't just a random message.
      if(typeof advData[id] !== "undefined") {
        delete advData[id];

        console.log("Error parsing advanced game data. Dumping...");
        console.log(err);

        Trivia.send(msg.channel, msg.author, {embed: {
          color: 14164000,
          description: `An error occurred while parsing advanced game data:\n${err}`
        }});
      }
    })
    .then((response) => {
      if(typeof response === "undefined") {
        return -1;
      }

      var responseCol = response.error?14164000:Trivia.embedCol;
      if(typeof response.text !== "undefined") {
        Trivia.send(msg.channel, msg.author, {embed: {
          color: responseCol,
          description: response.text,
          footer: { text: footerText }
        }}, void 0, true);
      }

      return response;
    });
  }

  function advGameExists(id) {
    return typeof advData[id] !== "undefined";
  }

  function cancelAdvGame(id) {
    delete advData[id];
  }

  return { triviaPlayAdvanced, parseAdv, cancelAdvGame, advGameExists };
};
