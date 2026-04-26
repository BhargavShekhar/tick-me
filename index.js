import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { publisher, subscriber, redis } from "./redis-connection.js";

const CHECKBOX_SIZE = 10000;
const CHECKBOX_STATE_KEY = "checkbox-state";

const rateLimitingHashMap = new Map();

async function main() {
    const port = process.env.PORT || 8080;

    const app = express();
    const server = http.createServer(app);

    const io = new Server(server);

    await subscriber.subscribe("internal-server:checkbox:change");

    subscriber.on("message", async (channel, message) => {
        if (channel === "internal-server:checkbox:change") {
            const { index, checked } = JSON.parse(message);
            io.emit("server:checkbox:change", { index, checked });
        }
    })

    // Socket IO handler
    io.on("connection", (socket) => {
        console.log(`[socket ${socket.id}] connected`);

        socket.on("client:checkbox:change", async (data) => {
            const existingState = await redis.get(CHECKBOX_STATE_KEY);

            const lastOperationTime = await redis.get(`rate-limiting:${socket.id}`);

            if (lastOperationTime) {
                const timeElapsed = Date.now()-lastOperationTime;
                if (timeElapsed < 5*1000) {
                    socket.emit("server:error", { error: "please wait for sometime" });
                    return;
                }
            }

            await redis.set(`rate-limiting:${socket.id}`, Date.now());

            if (existingState) {
                const remoteData = JSON.parse(existingState);
                remoteData[data.index] = data.checked;
                await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(remoteData));
            }
            else {
                await redis.set(
                    CHECKBOX_STATE_KEY,
                    JSON.stringify(new Array(CHECKBOX_SIZE).fill(false))
                )
            }

            await publisher.publish("internal-server:checkbox:change", JSON.stringify(data));
        })
    })

    // Express Handler
    app.use(express.static(path.resolve("./public")));

    app.get("/health", (req, res) => res.status(200).json({ healty: true }))

    app.get("/checkboxes", async (req, res) => {
        const existingState = await redis.get(CHECKBOX_STATE_KEY);

        if (existingState) {
            const remoteData = JSON.parse(existingState);
            return res.json({ checkboxes: remoteData });
        }

        return res.json({ checkboxes: new Array(CHECKBOX_SIZE).fill(false)})
    })

    server.listen(port, () => {
        console.log(`server is running on http://localhost:${port} on ${process.env.NODE_ENV} environment`);
    })
}

main();