const { timingSafeEqual } = require("crypto");
const { readFileSync } = require("fs");
const { inspect } = require("util");

const {
  utils: { parseKey },
  Server,
} = require("ssh2");

const players = {};

new Server(
  {
    hostKeys: [readFileSync("./host.key")],
  },
  (client) => {
    console.log("Client connected!");

    client
      .on("authentication", (ctx) => {
        ctx.accept();
      })
      .on("ready", () => {
        client.on("session", (accept) => {
          const session = accept();
          session.on("pty", (accept) => {
            accept(); // Accept terminal configuration
          });
          session
            .on("shell", (accept) => {
              const stream = accept();

              const id = Math.random().toString().slice(2);

              players[id] = {
                x: Math.floor(Math.random() * 10),
                y: Math.floor(Math.random() * 10),
              };

              const render = () => {
                stream.write(Buffer([0x1b, 0x5b, 0x32, 0x4a]).toString());
                Object.keys(players).forEach((player) => {
                  stream.write(
                    `${String.fromCharCode(27)}[${players[player].y};${
                      players[player].x
                    }H`
                  );
                  stream.write(
                    Buffer([
                      0xf0,
                      0x9f,
                      0x8c,
                      0x9b + (parseInt(player) % 30),
                    ]).toString()
                  );
                });
              };

              setInterval(render, 1000);

              stream.on("data", (data) => {
                const input = data.toString().trim();

                switch (input) {
                  case "w":
                    players[id].y--;
                    break;
                  case "a":
                    players[id].x--;
                    break;
                  case "s":
                    players[id].y++;
                    break;
                  case "d":
                    players[id].x++;
                    break;
                  case "q":
                    stream.write("Goodbye!\n");
                    client.end();
                    return;
                }

                render();
              });

              stream.on("close", () => {
                delete players[id];
                console.log(console.log("Client disconnected."));
              });
              console.log(console.log("Client connected!"));
            })
            .on("close", () => {
              console.log("Client disconnected");
            });
        });
      });
  }
).listen(8022, "192.168.1.41", function () {
  console.log("Listening on port " + this.address().port);
});
