const cors = require("cors");
const express = require("express");
const app = express();
const morgan = require("morgan");
const server = require("http").Server(app);
const io = require("socket.io")(server);

const port = process.env.PORT || 8080;

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const ipadd = Object.values(require("os").networkInterfaces()).reduce(
  (r, list) =>
    r.concat(
      list.reduce(
        (rr, i) =>
          rr.concat((i.family === "IPv4" && !i.internal && i.address) || []),
        []
      )
    ),
  []
);
const ipaddress = ipadd[0] || `localhost`;
console.log(ipaddress);

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

// require("dotenv").config();
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static("public"));

app.use(morgan("dev"));

// Set some defaults
db.defaults({ rooms: {} }).write();

// db.get("gameboard")
//   .push({ id: 1, board: ["", "", "", "", "", "", "", "", ""] })
//   .write();

// const rooms = db.get("rooms").value();

const rooms = {};

var corsOptions = {
  origin: "*",
  credentials: true,
};

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.get("/game", (req, res) => {
  res.render("game");
});

app.post("/room", (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect("/");
  }
  rooms[req.body.room] = {
    users: {},
    board: ["", "", "", "", "", "", "", "", ""],
    num: 0,
    passcode: "",
    circleTurn: false,
  };

  // db.set(`rooms.${req.body.room}`, {
  //   users: {},
  //   board: ["", "", "", "", "", "", "", "", ""],
  //   num: 0,
  //   passcode: "",
  //   circleTurn: false,
  //   roundWon: false,
  // }).write();
  res.redirect(req.body.room);
  // Send message that new room was created
  io.emit("room-created", req.body.room);
});

// const { networkInterfaces } = require("os");

// const nets = networkInterfaces();
// const results = Object.create(null); // or just '{}', an empty object

// for (const name of Object.keys(nets)) {
//   for (const net of nets[name]) {
//     // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
//     if (net.family === "IPv4" && !net.internal) {
//       if (!results[name]) {
//         results[name] = [];
//       }

//       results[name].push(net.address);
//     }
//   }
// }

app.get("/:room", (req, res) => {
  //   var room = io.sockets.adapter.rooms[roomId] || {};
  //   console.log(io.sockets.adapter.rooms);
  //Declaration of number of users variable
  //   var numUsers;
  //Get the number of users from room.user object
  //   numUsers = Object.keys(room.user).length;

  console.log(rooms);

  const board = rooms[req.params.room].board;
  const circleTurn = rooms[req.params.room].circleTurn;
  if (rooms[req.params.room] == null) {
    return res.redirect("/");
  }
  res.render("room", {
    roomName: req.params.room,
    board,
    ipaddress: ipaddress + ":" + port,
    circleTurn,
  });
});

app.get("/chat/:room", (req, res) => {
  //   var room = io.sockets.adapter.rooms[roomId] || {};
  //   console.log(io.sockets.adapter.rooms);
  //Declaration of number of users variable
  //   var numUsers;
  //Get the number of users from room.user object
  //   numUsers = Object.keys(room.user).length;

  console.log(rooms);
  if (rooms[req.params.room] == null) {
    return res.redirect("/");
  }
  res.render("chat", { roomName: req.params.room });
});

app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

server.listen(port);

console.log(`server running at http://${ipaddress}:${port}`);

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
  });

  // socket.on("send-chat-message", (room, message) => {
  //   socket.to(room).broadcast.emit("chat-message", {
  //     message: message,
  //     name: rooms[room].users[socket.id],
  //   });
  // });

  function checkWin(newBoard) {
    for (let i = 0; i <= 7; i++) {
      const winCondition = WINNING_COMBINATIONS[i];
      let a = newBoard[winCondition[0]];
      let b = newBoard[winCondition[1]];
      let c = newBoard[winCondition[2]];
      if (a === "" || b === "" || c === "") {
        continue;
      }
      if (a === b && b === c) {
        return true;
      }
    }
    return false;
  }

  socket.on("rg-game", (room) => {
    console.log("rg", room);
    socket.to(room).broadcast.emit("reload-game", {
      message: rooms[room].board,
      circleTurn: rooms[room].circleTurn,
      gamewon: true,
    });

    rooms[room].circleTurn = false;
    rooms[room].board = ["", "", "", "", "", "", "", "", ""];
  });

  socket.on("set-position", (room, message) => {
    console.log(room, message);
    console.log("sp", room);

    const { index, value } = message;
    rooms[room].board[index] = value;
    rooms[room].circleTurn = !rooms[room].circleTurn;

    // socket.to(room).broadcast.emit("place-mark", {
    //   message: rooms[room].board,
    //   name: rooms[room].users[socket.id],
    // });

    if (checkWin(rooms[room].board)) {
      socket.to(room).broadcast.emit("game-won", {
        message: rooms[room].board,
        circleTurn: rooms[room].circleTurn,
        gamewon: true,
      });
    }

    socket.emit("place-mark", {
      message: rooms[room].board,
      circleTurn: rooms[room].circleTurn,
    });

    socket.to(room).broadcast.emit("place-mark", {
      message: rooms[room].board,
      circleTurn: rooms[room].circleTurn,
    });
  });

  socket.on("reset-game", (room) => {
    console.log("rg", room);

    socket.emit("start-game", {
      message: room.board,
    });
  });

  socket.on("start-game", (room) => {
    console.log("sgs", room);

    socket.emit("new-user", room);
    // room.circleTurn = !room.circleTurn;

    socket.emit("start-game", {
      message: room.board,
    });
    socket.to(room).broadcast.emit("start-game", {
      message: room.board,
    });
  });

  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit("user-disconnected", rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}
