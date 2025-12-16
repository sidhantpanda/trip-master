import { Router } from "express";
import { settingsResponseSchema, updateSettingsSchema, userSettingsSchema } from "@trip-master/shared";
import { UserModel } from "../models/User";
import { encryptSecret } from "../utils/encryption";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await UserModel.findById(userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const settings = {
    llmProvider: user.settings?.llmProvider || "mock",
    llmModel: user.settings?.llmModel,
    encryptedApiKeys: user.settings?.encryptedApiKeys
  };

  return res.json(settingsResponseSchema.parse({ settings }));
});

router.put("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const user = await UserModel.findById(userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const provider = parsed.data.llmProvider ?? user.settings?.llmProvider ?? "mock";
  const model = parsed.data.llmModel ?? user.settings?.llmModel;

  user.settings = {
    llmProvider: provider,
    llmModel: model,
    encryptedApiKeys: user.settings?.encryptedApiKeys ?? {}
  };

  if (parsed.data.apiKey) {
    const encrypted = encryptSecret(parsed.data.apiKey);
    user.settings.encryptedApiKeys = {
      ...(user.settings.encryptedApiKeys ?? {}),
      [provider]: encrypted
    };
  }

  await user.save();

  const responseSettings = userSettingsSchema.parse({
    llmProvider: user.settings.llmProvider,
    llmModel: user.settings.llmModel,
    encryptedApiKeys: user.settings.encryptedApiKeys
  });

  return res.json(settingsResponseSchema.parse({ settings: responseSettings }));
});

export default router;
