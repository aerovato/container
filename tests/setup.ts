import { vi } from "vitest";

// Global setup for tests: silence all clack.log.* (the source of "word salad")
// and any console.* output from CLI paths (usage(), etc.).
// This applies to every test file.
// Tests that need to spy on clack (tos.test, onboarding.test) use their own
// vi.mock("@clack/prompts", () => ({...})) factories which take precedence.

vi.mock("@clack/prompts", () => ({
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  select: vi.fn(),
  multiselect: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
