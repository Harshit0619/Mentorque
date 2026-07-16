import { prisma } from "../lib/prisma.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  timezone: true,
  description: true,
  tags: true,
};

export async function listMeetings(req, res, next) {
  try {
    const where = {};

    if (req.userRole === "USER") where.userId = req.userId;
    if (req.userRole === "MENTOR") where.mentorId = req.userId;
    if (req.userRole === "ADMIN" && req.query.adminId) where.adminId = req.query.adminId;
    if (req.query.from) where.startTime = { ...where.startTime, gte: new Date(req.query.from) };
    if (req.query.to) where.endTime = { ...where.endTime, lte: new Date(req.query.to) };

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        participants: true,
        user: { select: userSelect },
        mentor: { select: userSelect },
        admin: { select: userSelect },
      },
      orderBy: { startTime: "asc" },
    });

    res.json(meetings);
  } catch (error) {
    next(error);
  }
}

export async function deleteMeeting(req, res, next) {
  try {
    await prisma.meeting.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
