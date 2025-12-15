import { Router } from "express";
import { authLoginSchema, authRegisterSchema, authResponseSchema } from "@trip-master/shared";
import { UserModel, toUserDTO, UserDocument } from "../models/User";
import { hashPassword, verifyPassword } from "../utils/password";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies";
import { requireAuth } from "../middleware/requireAuth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens";

const router = Router();

function issueTokens(user: UserDocument) {
  const payload = { userId: user._id.toString(), email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  };
}

router.post("/register", async (req, res) => {
  const parsed = authRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid input";
    return res.status(400).json({ error: firstError });
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await UserModel.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ email: normalizedEmail, name, passwordHash });
  const tokens = issueTokens(user);
  setAuthCookies(res, tokens);

  return res.status(201).json(authResponseSchema.parse({ user: toUserDTO(user) }));
});

router.post("/login", async (req, res) => {
  const parsed = authLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid input";
    return res.status(400).json({ error: firstError });
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const tokens = issueTokens(user);
  setAuthCookies(res, tokens);

  return res.json(authResponseSchema.parse({ user: toUserDTO(user) }));
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  try {
    const payload = verifyRefreshToken(token);
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const tokens = issueTokens(user);
    setAuthCookies(res, tokens);
    return res.json(authResponseSchema.parse({ user: toUserDTO(user) }));
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  return res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
  if (!req.user?.userId) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await UserModel.findById(req.user.userId);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json(authResponseSchema.parse({ user: toUserDTO(user) }));
});

export default router;
