import express from "express";
import Redis from "ioredis";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.post("/set-cache", upload.single("file"), async (req, res) => {
  const { host, key, expiration, persist } = req.body;
  let cacheValue;

  if (req.file) {
    const filePath = path.join(__dirname, req.file.path);
    cacheValue = fs.readFileSync(filePath, "utf8");
  } else {
    cacheValue = req.body.value;
  }

  const redis = new Redis({
    host,
    port: 6379,
  });

  try {
    if (persist === "true") {
      await redis.set(key, cacheValue);
    } else if (expiration) {
      await redis.set(key, cacheValue, "EX", parseInt(expiration));
    } else {
      throw new Error("Required persist or expiration");
    }

    res.json({ message: `Key '${key}' set successfully on host '${host}'.` });
  } catch (error) {
    console.error("Error setting cache:", error);
    res.status(500).json({ message: "Error setting cache." });
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    redis.quit();
  }
});

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
