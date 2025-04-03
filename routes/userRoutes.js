const express = require("express");
const router = express.Router();
const {
	protect,
	generateToken,
	generateRefreshToken,
} = require("../middleware/auth");
const User = require("../models/User");

// Register user
router.post("/auth/register", async (req, res) => {
	try {
		const { name, email, password, userType } = req.body;

		// Check if user exists
		const userExists = await User.findOne({ email });
		if (userExists) {
			return res.status(400).json({ message: "User already exists" });
		}

		// Create user
		const user = await User.create({
			name,
			email,
			password,
			userType,
		});

		// Generate tokens
		const accessToken = generateToken(user._id);
		const refreshToken = generateRefreshToken(user._id);

		// Save refresh token
		user.refreshToken = refreshToken;
		await user.save();

		// Set refresh token in HTTP-only cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		res.status(201).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			userType: user.userType,
			accessToken,
		});
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Login user
router.post("/auth/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		// Check for user email
		const user = await User.findOne({ email }).select("+password");
		if (!user) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Check password
		const isMatch = await user.matchPassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Generate tokens
		const accessToken = generateToken(user._id);
		const refreshToken = generateRefreshToken(user._id);

		// Save refresh token
		user.refreshToken = refreshToken;
		await user.save();

		// Set refresh token in HTTP-only cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		res.json({
			_id: user._id,
			name: user.name,
			email: user.email,
			userType: user.userType,
			accessToken,
		});
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Refresh token
router.post("/auth/refresh-token", async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			return res.status(401).json({ message: "Refresh token required" });
		}

		const user = await User.findOne({ refreshToken });
		if (!user) {
			return res.status(401).json({ message: "Invalid refresh token" });
		}

		const accessToken = generateToken(user._id);
		const newRefreshToken = generateRefreshToken(user._id);

		user.refreshToken = newRefreshToken;
		await user.save();

		// Set new refresh token in HTTP-only cookie
		res.cookie("refreshToken", newRefreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		res.json({
			accessToken,
		});
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Logout
router.post("/auth/logout", async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;

		if (refreshToken) {
			// Clear refresh token from database
			await User.findOneAndUpdate(
				{ refreshToken },
				{ refreshToken: null }
			);
		}

		// Clear refresh token cookie
		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 0,
		});

		res.json({ message: "Logged out successfully" });
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Get user profile
router.get("/profile", protect, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		res.json(user);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

module.exports = router;
