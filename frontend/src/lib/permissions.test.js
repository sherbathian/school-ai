import { describe, expect, it } from "vitest";
import {
  canAttachExistingAccount,
  canCreateSchool,
  canDeleteSchool,
  canManageSchool,
} from "./permissions";

const teacherAt1AdminAt2 = {
  is_super_admin: false,
  schools: [
    { id: 1, role: "teacher" },
    { id: 2, role: "admin" },
  ],
};

describe("canManageSchool", () => {
  it("lets a super admin manage any school", () => {
    expect(canManageSchool({ is_super_admin: true, schools: [] }, 99)).toBe(
      true,
    );
  });

  it("lets an admin manage the school where they are admin", () => {
    expect(canManageSchool(teacherAt1AdminAt2, 2)).toBe(true);
  });

  it("does not let a teacher manage their school", () => {
    expect(canManageSchool(teacherAt1AdminAt2, 1)).toBe(false);
  });

  it("does not let an admin manage someone else's school", () => {
    expect(canManageSchool(teacherAt1AdminAt2, 3)).toBe(false);
  });

  it("is false without a user or without schools", () => {
    expect(canManageSchool(null, 1)).toBe(false);
    expect(canManageSchool({ is_super_admin: false }, 1)).toBe(false);
  });
});

describe("canCreateSchool", () => {
  it("is true only for super admins", () => {
    expect(canCreateSchool({ is_super_admin: true })).toBe(true);
  });

  it("is false for everyone else", () => {
    expect(canCreateSchool(teacherAt1AdminAt2)).toBe(false);
    expect(canCreateSchool(null)).toBe(false);
  });
});

describe("canDeleteSchool", () => {
  it("is true only for super admins", () => {
    expect(canDeleteSchool({ is_super_admin: true })).toBe(true);
  });

  it("is false for school admins and others", () => {
    expect(canDeleteSchool(teacherAt1AdminAt2)).toBe(false);
    expect(canDeleteSchool(undefined)).toBe(false);
  });
});

describe("canAttachExistingAccount", () => {
  it("is true only for super admins", () => {
    expect(canAttachExistingAccount({ is_super_admin: true })).toBe(true);
  });

  it("is false for school admins and others", () => {
    expect(canAttachExistingAccount(teacherAt1AdminAt2)).toBe(false);
    expect(canAttachExistingAccount(null)).toBe(false);
  });
});
