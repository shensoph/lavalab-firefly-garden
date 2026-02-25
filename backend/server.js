import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// In-memory "database"
let firefly_count = 0;

app.get("/api/fireflies", (req, res) => {
  res.json({ firefly_count, updated_at: new Date().toISOString() });
});

app.post("/api/fireflies/release", (req, res) => {
  firefly_count += 1;
  res.json({ firefly_count, updated_at: new Date().toISOString() });
});

app.post("/api/fireflies/reset", (req, res) => {
  firefly_count = 0;
  res.json({ firefly_count, updated_at: new Date().toISOString() });
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});