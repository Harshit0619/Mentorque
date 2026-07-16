import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { loadWeeklyAvailability, isAvailableBetween } from "../services/availabilityWeek.js";
import { rankMentors } from "../services/recommendations.js";

const basicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  timezone: true,
  description: true,
  tags: true,
  createdAt: true,
};

function normalizeTags(tags) {
  return Array.isArray(tags)
    ? tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

function ownerFromUser(userId, role) {
  return role === "MENTOR"
    ? { userId: null, mentorId: userId, role: "MENTOR" }
    : { userId, mentorId: null, role: "USER" };
}

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: basicSelect,
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function listMentors(req, res, next) {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      select: basicSelect,
      orderBy: { name: "asc" },
    });
    res.json(mentors);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, timezone = "UTC", description = "", tags = [] } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required" });
    }
    if (!["USER", "MENTOR", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: await bcrypt.hash(password, 12),
        role,
        timezone,
        description: description.trim(),
        tags: normalizeTags(tags),
      },
      select: basicSelect,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateMentorMetadata(req, res, next) {
  try {
    const { mentorId } = req.params;
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: "MENTOR" },
      select: { id: true },
    });
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const updated = await prisma.user.update({
      where: { id: mentorId },
      data: {
        name: req.body.name?.trim() || undefined,
        timezone: req.body.timezone?.trim() || undefined,
        description: typeof req.body.description === "string" ? req.body.description.trim() : undefined,
        tags: req.body.tags ? normalizeTags(req.body.tags) : undefined,
      },
      select: basicSelect,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function getAvailabilityForUser(req, res, next) {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, role: true },
    });
    if (!target) return res.status(404).json({ error: "User not found" });

    const availability = await loadWeeklyAvailability(ownerFromUser(target.id, target.role), req.query.weekStart);
    res.json(availability);
  } catch (error) {
    next(error);
  }
}

export async function getOverlappingSlots(req, res, next) {
  try {
    const { userId } = req.params;
    const { mentorId, startTime, endTime } = req.query;
    if (!mentorId || !startTime || !endTime) {
      return res.status(400).json({ error: "mentorId, startTime and endTime are required" });
    }

    const [user, mentor] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, role: "USER" }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: mentorId, role: "MENTOR" }, select: { id: true } }),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const [userAvailable, mentorAvailable] = await Promise.all([
      isAvailableBetween(ownerFromUser(user.id, "USER"), startTime, endTime),
      isAvailableBetween(ownerFromUser(mentor.id, "MENTOR"), startTime, endTime),
    ]);

    res.json({
      overlap: userAvailable && mentorAvailable,
      userAvailable,
      mentorAvailable,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const { userId } = req.params;
    const { callType = "MOCK_INTERVIEW" } = req.query;

    const user = await prisma.user.findFirst({
      where: { id: userId, role: "USER" },
      select: basicSelect,
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      select: basicSelect,
    });

    const ranked = rankMentors({ mentors, user, callType }).map(({ mentor, recommendation }) => ({
      ...mentor,
      recommendation,
    }));

    res.json({
      user,
      callType,
      recommendations: ranked,
    });
  } catch (error) {
    next(error);
  }
}

export async function scheduleMeeting(req, res, next) {
  try {
    const adminId = req.userId;
    const {
      userId,
      mentorId,
      callType,
      title,
      startTime,
      endTime,
      notes = "",
      recommendationReason = "",
      participantEmails = [],
    } = req.body;

    if (!userId || !mentorId || !callType || !title?.trim() || !startTime || !endTime) {
      return res.status(400).json({ error: "userId, mentorId, callType, title, startTime and endTime are required" });
    }

    const [user, mentor] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, role: "USER" }, select: basicSelect }),
      prisma.user.findFirst({ where: { id: mentorId, role: "MENTOR" }, select: basicSelect }),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    const [userAvailable, mentorAvailable] = await Promise.all([
      isAvailableBetween(ownerFromUser(user.id, "USER"), start, end),
      isAvailableBetween(ownerFromUser(mentor.id, "MENTOR"), start, end),
    ]);

    if (!userAvailable || !mentorAvailable) {
      return res.status(409).json({
        error: "Selected slot is not available for both participants",
        userAvailable,
        mentorAvailable,
      });
    }

    const meeting = await prisma.meeting.create({
      data: {
        adminId,
        userId: user.id,
        mentorId: mentor.id,
        callType,
        title: title.trim(),
        startTime: start,
        endTime: end,
        notes: notes.trim(),
        recommendationReason: recommendationReason.trim(),
        participants: {
          create: [
            { email: user.email },
            { email: mentor.email },
            ...participantEmails
              .map((email) => String(email).trim())
              .filter(Boolean)
              .filter((email) => email !== user.email && email !== mentor.email)
              .map((email) => ({ email })),
          ],
        },
      },
      include: {
        participants: true,
        user: { select: basicSelect },
        mentor: { select: basicSelect },
        admin: { select: basicSelect },
      },
    });

    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
}
