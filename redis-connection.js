import Redis from "ioredis";

const createConnection = () => {
    return new Redis({
        host: "localhost",
        port: process.env.REDIS_PORT || 6379
    })
}

export const publisher = createConnection();
export const subscriber = createConnection();
export const redis = createConnection();