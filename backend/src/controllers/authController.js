import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  timezone: true,
  description: true,
  tags: true,
  createdAt: true,
};

export async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        ...publicUserSelect,
        password: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ error: `This account belongs to the ${user.role.toLowerCase()} portal.` });
    }

    const token = createToken(user);
    const { password: _password, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: publicUserSelect,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    if (req.userRole !== "USER") {
      return res.status(403).json({ error: "Only users can edit requirement details." });
    }

    const tags = Array.isArray(req.body.tags)
      ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: req.body.name?.trim() || undefined,
        timezone: req.body.timezone?.trim() || undefined,
        description: typeof req.body.description === "string" ? req.body.description.trim() : undefined,
        tags,
      },
      select: publicUserSelect,
    });

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
}
