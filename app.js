const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Initialize express
const app = express();

// Connect to database
connectDB();

// Log all requests
app.use((req, res, next) => {
	console.log(`${req.method} ${req.url}`);
	next();
});

// Middleware
app.use(
	cors({
		origin: [
			process.env.CLIENT_URL,
			"http://localhost:4200",
			"http://localhost:3000",
		],
		credentials: true,
	})
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use("/api", require("./routes/userRoutes"));

// Basic route
app.get("/", (req, res) => {
	res.json({ message: "Welcome to the API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
