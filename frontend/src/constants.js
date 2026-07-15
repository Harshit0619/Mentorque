export const STORAGE_KEY = "mentorque-session";
export const HOURS = Array.from({ length: 12 }, (_, index) => index + 8);
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "GMT (GMT+0)", short: "GMT" },
  { value: "Asia/Kolkata", label: "IST (GMT+5:30)", short: "IST" },
];

export const CALL_TYPE_OPTIONS = [
  { value: "RESUME_REVAMP", label: "Resume Revamp" },
  { value: "JOB_MARKET_GUIDANCE", label: "Job Market Guidance" },
  { value: "MOCK_INTERVIEW", label: "Mock Interviews" },
];
