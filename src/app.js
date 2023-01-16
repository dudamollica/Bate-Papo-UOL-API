import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
dotenv.config();

const server = express();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
let convertedStatus;
let user;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db();
    console.log("deu certo");
  })
  .catch(() => console.log("nao deu certo"));

server.use(cors());
server.use(express.json());
server.listen(5000, () => console.log("Servidor Funfou"));

setInterval(checkActivid, 15000);

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((dados) => {
      return res.send(dados);
    })
    .catch(() => res.sendStatus(500).send("Não funcionou"));
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  user = req.body.name;

  if (name) {
    const userExist = await db.collection("participants").findOne({ name });

    if (userExist) return res.sendStatus(409);

    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });

    db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });

    res.sendStatus(201);
  }
});

server.get("/messages", (req, res) => {
  db.collection("messages")
    .find()
    .toArray()
    .then((dados) => {
      const dadosFilter = dados.filter(function (obj) {
        return (
          obj.to == user ||
          obj.from == user ||
          obj.type == "message" ||
          obj.type == "status" ||
          obj.to == "Todos"
        );
      });
      return res.send(dadosFilter);
    })
    .catch(() => res.sendStatus(500).send("Não funcionou"));
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  try {
    await db.collection("messages").insertOne({
      from: req.headers.user,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

server.post("/status", async (req, res) => {
  user = req.headers.user;
  if (user) {
    db.collection("participants").updateOne(
      { name: user },
      { $set: { lastStatus: Date.now() } }
    );
    res.sendStatus(200);
    const statusUser = await db
      .collection("participants")
      .findOne({ name: user });
    convertedStatus = Number(statusUser.lastStatus) / 1000;
  }
});

function checkActivid() {
  if (user) {
    let timeNow = Date.now();
    const actividTime = timeNow / 1000 - convertedStatus;

    db.collection("participants")
      .find()
      .toArray()
      .then((dados) => {
        const dadosFilter = dados
          .map(function (obj) {
            return obj.lastStatus;
          })
          .filter(function (obj) {
            return (timeNow / 1000) - (obj / 1000) >= 10;
          });
        for (let i = 0; i < dadosFilter.length; i++) {
          db.collection("participants").deleteOne({
            lastStatus: dadosFilter[i],
          });
        }
      });

    if (actividTime >= 10) {
      db.collection("participants").deleteOne({ name: user });
      db.collection("messages").insertOne({
        from: user,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
    }
  }
}

server.delete("/messages/:id", (req, res) => {
  const id = req.params.id;
  db.collection("messages").deleteOne({ _id: ObjectId(id) });
});
