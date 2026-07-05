import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { parseArgs } from "../src/args";

describe("parseArgs", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe("default (no args)", () => {
    it("returns run with undefined target", () => {
      const result = parseArgs([]);
      expect(result).toEqual({
        command: "run",
        target: undefined,
        cliFlags: [],
      });
    });
  });

  describe("help", () => {
    it("exits on help", () => {
      expect(() => parseArgs(["help"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("exits on --help", () => {
      expect(() => parseArgs(["--help"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("exits on -h", () => {
      expect(() => parseArgs(["-h"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("unknown command", () => {
    it("exits with error", () => {
      expect(() => parseArgs(["foo"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("build", () => {
    it("defaults to full target", () => {
      expect(parseArgs(["build"])).toEqual({
        command: "build",
        target: "full",
      });
    });

    it("parses explicit full target", () => {
      expect(parseArgs(["build", "full"])).toEqual({
        command: "build",
        target: "full",
      });
    });

    it("parses harness target", () => {
      expect(parseArgs(["build", "harness"])).toEqual({
        command: "build",
        target: "harness",
      });
    });

    it("parses user target", () => {
      expect(parseArgs(["build", "user"])).toEqual({
        command: "build",
        target: "user",
      });
    });

    it("rejects invalid target", () => {
      expect(() => parseArgs(["build", "invalid"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("run", () => {
    it("parses with path only", () => {
      expect(parseArgs(["run", "/path/to/project"])).toEqual({
        command: "run",
        target: "/path/to/project",
        cliFlags: [],
      });
    });

    it("parses with path and docker flags", () => {
      expect(
        parseArgs(["run", "/path/to/project", "--", "-p", "8080:80"]),
      ).toEqual({
        command: "run",
        target: "/path/to/project",
        cliFlags: ["-p", "8080:80"],
      });
    });

    it("parses with only docker flags (undefined target)", () => {
      expect(parseArgs(["run", "--", "-e", "FOO=bar"])).toEqual({
        command: "run",
        target: undefined,
        cliFlags: ["-e", "FOO=bar"],
      });
    });

    it("rejects extra positional args", () => {
      expect(() => parseArgs(["run", "/path", "extra"])).toThrow(
        "process.exit",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("create", () => {
    it("parses with path only", () => {
      expect(parseArgs(["create", "/path/to/project"])).toEqual({
        command: "create",
        target: "/path/to/project",
        cliFlags: [],
      });
    });

    it("parses with path and docker flags", () => {
      expect(
        parseArgs(["create", "/path/to/project", "--", "-p", "8080:80"]),
      ).toEqual({
        command: "create",
        target: "/path/to/project",
        cliFlags: ["-p", "8080:80"],
      });
    });

    it("parses with only docker flags (undefined target)", () => {
      expect(parseArgs(["create", "--", "-e", "FOO=bar"])).toEqual({
        command: "create",
        target: undefined,
        cliFlags: ["-e", "FOO=bar"],
      });
    });

    it("rejects extra positional args", () => {
      expect(() => parseArgs(["create", "/path", "extra"])).toThrow(
        "process.exit",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("attach", () => {
    it("parses with path only", () => {
      expect(parseArgs(["attach", "/path/to/project"])).toEqual({
        command: "attach",
        target: "/path/to/project",
        cliFlags: [],
      });
    });

    it("parses with path and docker flags", () => {
      expect(
        parseArgs(["attach", "/path/to/project", "--", "-e", "FOO=bar"]),
      ).toEqual({
        command: "attach",
        target: "/path/to/project",
        cliFlags: ["-e", "FOO=bar"],
      });
    });

    it("parses with only docker flags (undefined target)", () => {
      expect(parseArgs(["attach", "--", "-e", "FOO=bar"])).toEqual({
        command: "attach",
        target: undefined,
        cliFlags: ["-e", "FOO=bar"],
      });
    });

    it("rejects extra positional args", () => {
      expect(() => parseArgs(["attach", "/path", "extra"])).toThrow(
        "process.exit",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("stop", () => {
    it("parses with path", () => {
      expect(parseArgs(["stop", "/path/to/project"])).toEqual({
        command: "stop",
        target: "/path/to/project",
      });
    });

    it("parses with undefined target", () => {
      expect(parseArgs(["stop"])).toEqual({
        command: "stop",
        target: undefined,
      });
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["stop", "a", "b"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("remove", () => {
    it("parses with path", () => {
      expect(parseArgs(["remove", "/path"])).toEqual({
        command: "remove",
        target: "/path",
      });
    });
  });

  describe("init", () => {
    it("parses init", () => {
      expect(parseArgs(["init"])).toEqual({ command: "init" });
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["init", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("upgrade", () => {
    it("parses upgrade", () => {
      expect(parseArgs(["upgrade"])).toEqual({ command: "upgrade" });
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["upgrade", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("version", () => {
    it("parses version", () => {
      expect(parseArgs(["version"])).toEqual({ command: "version" });
    });

    it("parses --version", () => {
      expect(parseArgs(["--version"])).toEqual({ command: "version" });
    });

    it("rejects extra args after --version", () => {
      expect(() => parseArgs(["--version", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["version", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("settings", () => {
    it("parses settings", () => {
      expect(parseArgs(["settings"])).toEqual({ command: "settings" });
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["settings", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("list", () => {
    it("parses list", () => {
      expect(parseArgs(["list"])).toEqual({ command: "list" });
    });

    it("rejects extra args", () => {
      expect(() => parseArgs(["list", "extra"])).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
