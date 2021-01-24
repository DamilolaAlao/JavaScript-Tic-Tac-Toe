let ipaddressed = ipaddress;
const socket = io(`http://${ipaddressed}`);

const X_CLASS = "x";
const CIRCLE_CLASS = "circle";
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
let newBoard = boarded;
const cellElements = document.querySelectorAll("[data-cell]");
const board = document.getElementById("board");
const winningMessageElement = document.getElementById("winningMessage");
const restartButton = document.getElementById("restartButton");
const winningMessageTextElement = document.querySelector(
  "[data-winning-message-text]"
);
let circleTurn;
circleTurned == "false" ? (circleTurn = false) : (circleTurn = true);

startGame();

restartButton.addEventListener("click", resetGame);

function resetGame() {
  socket.emit("reset-game", roomName);
  window.location = location;
}

socket.on("reload-game", (data) => {
  winningMessageTextElement.innerText = `${circleTurn ? "X's" : "O's"} Wins!`;
  winningMessageElement.classList.add("show");
  console.log("reload-game", data);
  // socket.emit("reset-game", roomName);

  // window.location = location;
});

socket.on("start-game", (data) => {
  console.log("sg", data);
  startGame();
});

function startGame() {
  wonGame();
  socket.emit("new-user", roomName);

  if (typeof newBoard == "string") newBoard = newBoard.split(",");

  cellElements.forEach((cell, key) => {
    if (X_CLASS == newBoard[key]) {
      cell.classList.add(X_CLASS);
    }
    if (CIRCLE_CLASS == newBoard[key]) {
      cell.classList.add(CIRCLE_CLASS);
    }
    cell.addEventListener("click", handleClick, { once: true });
  });
  setBoardHoverClass();
  winningMessageElement.classList.remove("show");
}

function handleClick(e) {
  const cell = e.target;
  const currentClass = circleTurn ? CIRCLE_CLASS : X_CLASS;
  setPosition(cell, currentClass);
  placeMark(cell, currentClass);
  wonGame(currentClass);
}

function wonGame() {
  if (checkWin()) {
    endGame(false);
  } else if (isDraw()) {
    endGame(true);
  } else {
    swapTurns();
    setBoardHoverClass();
  }
}

function endGame(draw) {
  if (draw) {
    winningMessageTextElement.innerText = "Draw!";
  } else {
    winningMessageTextElement.innerText = `${circleTurn ? "O's" : "X's"} Wins!`;
  }
  winningMessageElement.classList.add("show");
}

function isDraw() {
  return [...cellElements].every((cell) => {
    return (
      cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS)
    );
  });
}

socket.on("game-won", (data) => {
  winningMessageTextElement.innerText = `${circleTurn ? "O's" : "X's"} Wins!`;
  winningMessageElement.classList.add("show");
  socket.emit("rg-game", roomName);
});

socket.on("place-mark", (data) => {
  const boarded = data.message;
  circleTurn = data.circleTurn;

  setBoardHoverClass();

  cellElements.forEach((cell, key) => {
    if (X_CLASS == boarded[key]) {
      cell.classList.add(X_CLASS);
    } else if (CIRCLE_CLASS == boarded[key]) {
      cell.classList.add(CIRCLE_CLASS);
    }
  });
});

function placeMark(cell, currentClass) {
  cell.classList.add(currentClass);
}

function setPosition(cell, currentClass) {
  newBoard[Number(cell.attributes.position.value)] = currentClass;
  let num = Number(cell.attributes.position.value);
  const msg = { index: num, value: currentClass };
  socket.emit("set-position", roomName, (message = msg));
  // placeMark(cell, currentClass);
}

function swapTurns() {
  circleTurn = !circleTurn;
}

function setBoardHoverClass() {
  board.classList.remove(X_CLASS);
  board.classList.remove(CIRCLE_CLASS);
  if (circleTurn) {
    board.classList.add(CIRCLE_CLASS);
  } else {
    board.classList.add(X_CLASS);
  }
}

function checkWin() {
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
