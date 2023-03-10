import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";
dotenv.config();

const server = express();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
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

checkActivid()
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
  const participants = req.body

  const participantsSchema = joi.object({
    name: joi.string().required()
  })
  const validation = participantsSchema.validate(participants)
  if (validation.error) return res.sendStatus(422)
  
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
});

server.get("/messages", (req, res) => {
  const limit = parseInt(req.query.limit)
  
    const verifyLimit = req.query

    const limitSchema = joi.object({
      limit: joi.number().greater(0)
    })

    const validation = limitSchema.validate(verifyLimit)
    if (validation.error) return res.sendStatus(422) 


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
      if(limit){
        const limitMessages = dadosFilter.filter((m, index)=> index >= dadosFilter.length-limit)
        return res.send(limitMessages)
      }
      return res.send(dadosFilter);
    })
    .catch(() => res.sendStatus(500).send("Não funcionou"));
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const userExist = await db.collection("participants").findOne({ name: req.headers.user});
  if (!userExist) return res.sendStatus(422);
  if (!req.headers.user) return res.sendStatus(422)
  if (type !== "message" && type != "status" && type != "private_message") return res.sendStatus(422)

  const messages = req.body
  const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required()
  })
  const validation = messagesSchema.validate(messages)
  if (validation.error) return res.sendStatus(422)

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
  const name = req.headers.user
  const userExist = await db.collection("participants").findOne({name})
  if(!userExist) return res.sendStatus(404)
    await db.collection("participants").updateOne(
      { name },
      { $set: { lastStatus: Date.now() } }
    );
    res.sendStatus(200);
});

function checkActivid() {
  if (user) {
    let timeNow = Date.now();

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
        for (let i = 0; i < dados.length; i++) {
          if (dadosFilter.includes(dados[i].lastStatus)) {
            db.collection("messages").insertOne({
              from: dados[i].name,
              to: "Todos",
              text: "sai da sala...",
              type: "status",
              time: dayjs().format("HH:mm:ss"),
            });
            db.collection("participants").deleteOne({
              lastStatus: dadosFilter[i],
            });
          }
        }
      });
  }
}

server.delete("/messages/:id", (req, res) => {
  const id = req.params.id;
  db.collection("messages").deleteOne({ _id: ObjectId(id) });
});
