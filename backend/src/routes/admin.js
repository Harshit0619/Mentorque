import { Router } from "express";
import {
  listUsers,
  listMentors,
  createUser,
  updateMentorMetadata,
  getAvailabilityForUser,
  getOverlappingSlots,
  getRecommendations,
  scheduleMeeting,
} from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/users", listUsers);
adminRoutes.get("/mentors", listMentors);
adminRoutes.post("/create-user", createUser);
adminRoutes.patch("/mentors/:mentorId", updateMentorMetadata);
adminRoutes.get("/availability/:userId", getAvailabilityForUser);
adminRoutes.get("/availability/:userId/overlap", getOverlappingSlots);
adminRoutes.get("/recommendations/:userId", getRecommendations);
adminRoutes.post("/meetings", scheduleMeeting);
